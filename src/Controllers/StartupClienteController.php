<?php
declare(strict_types=1);

namespace Aires\Controllers;

use Aires\Core\Database;
use Aires\Core\Request;
use Aires\Core\Response;
use Aires\Services\StartupAuditoriaService;
use PDO;

final class StartupClienteController
{
    private PDO $pdo;
    private StartupAuditoriaService $auditoria;

    public function __construct()
    {
        $this->pdo = Database::getInstance()->getConnection();
        $this->auditoria = new StartupAuditoriaService();
    }

    private function getUserId(): int
    {
        return isset($_SESSION['usuario_id']) ? (int)$_SESSION['usuario_id'] : 1;
    }

    public function index(Request $request): void
    {
        $userId = $this->getUserId();
        $busca = trim((string)$request->get('busca', ''));
        $status = trim((string)$request->get('status', ''));

        $sql = "
            SELECT c.*,
                   (SELECT COUNT(*) FROM startup_faturas f WHERE f.cliente_id = c.id AND f.deletado_em IS NULL) AS total_faturas,
                   (SELECT COALESCE(SUM(f.valor_cobrado), 0) FROM startup_faturas f WHERE f.cliente_id = c.id AND f.status = 'paga' AND f.deletado_em IS NULL) AS total_pago,
                   (SELECT COALESCE(SUM(cc.saldo_acumulado_kwh), 0) FROM startup_creditos_cliente cc WHERE cc.cliente_id = c.id) AS saldo_creditos_kwh
            FROM startup_clientes c
            WHERE c.usuario_id = :uid AND c.deletado_em IS NULL
        ";
        $params = ['uid' => $userId];

        if ($status !== '' && in_array($status, ['ativo', 'suspenso', 'cancelado'], true)) {
            $sql .= " AND c.status = :status";
            $params['status'] = $status;
        }

        if ($busca !== '') {
            $sql .= " AND (c.nome LIKE :busca OR c.cpf_cnpj LIKE :busca OR c.numero_uc LIKE :busca OR c.email LIKE :busca)";
            $params['busca'] = "%{$busca}%";
        }

        $sql .= " ORDER BY c.nome ASC";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        $clientes = $stmt->fetchAll(PDO::FETCH_ASSOC);

        Response::json([
            'sucesso'  => true,
            'clientes' => $clientes,
            'total'    => count($clientes)
        ]);
    }

    public function show(Request $request, string $id): void
    {
        $userId = $this->getUserId();
        $stmt = $this->pdo->prepare("
            SELECT * FROM startup_clientes 
            WHERE id = :id AND usuario_id = :uid AND deletado_em IS NULL
            LIMIT 1
        ");
        $stmt->execute(['id' => (int)$id, 'uid' => $userId]);
        $cliente = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$cliente) {
            Response::error('Cliente não encontrado.', 404);
            return;
        }

        // Histórico de Faturas
        $stmtFat = $this->pdo->prepare("
            SELECT * FROM startup_faturas 
            WHERE cliente_id = :cid AND deletado_em IS NULL 
            ORDER BY mes_referencia DESC 
            LIMIT 12
        ");
        $stmtFat->execute(['cid' => (int)$id]);
        $cliente['faturas'] = $stmtFat->fetchAll(PDO::FETCH_ASSOC);

        // Histórico de Créditos
        $stmtCred = $this->pdo->prepare("
            SELECT cc.*, sc.mes_referencia 
            FROM startup_creditos_cliente cc
            JOIN startup_creditos sc ON sc.id = cc.credito_id
            WHERE cc.cliente_id = :cid
            ORDER BY sc.mes_referencia DESC
            LIMIT 12
        ");
        $stmtCred->execute(['cid' => (int)$id]);
        $cliente['creditos'] = $stmtCred->fetchAll(PDO::FETCH_ASSOC);

        Response::json([
            'sucesso' => true,
            'cliente' => $cliente
        ]);
    }

    public function store(Request $request): void
    {
        $userId = $this->getUserId();
        $nome = trim((string)$request->input('nome', ''));

        if ($nome === '') {
            Response::error('O nome do cliente é obrigatório.', 422);
            return;
        }

        $tipo = in_array($request->input('tipo_pessoa'), ['pf', 'pj'], true) ? $request->input('tipo_pessoa') : 'pf';
        $cpfCnpj = trim((string)$request->input('cpf_cnpj', '')) ?: null;
        $endereco = trim((string)$request->input('endereco', '')) ?: null;
        $numeroUc = trim((string)$request->input('numero_uc', '')) ?: null;
        $telefone = trim((string)$request->input('telefone', '')) ?: null;
        $email = trim((string)$request->input('email', '')) ?: null;
        $whatsapp = trim((string)$request->input('whatsapp', '')) ?: null;
        $qtdProps = max(1, (int)$request->input('qtd_propriedades', 1));
        $descPct = (float)$request->input('desconto_padrao_pct', 15.00);
        $dataAdesao = !empty($request->input('data_adesao')) ? (string)$request->input('data_adesao') : date('Y-m-d');
        $status = in_array($request->input('status'), ['ativo', 'suspenso', 'cancelado'], true) ? $request->input('status') : 'ativo';
        $observacoes = trim((string)$request->input('observacoes', '')) ?: null;
        $contratoFim = !empty($request->input('contrato_vigencia_fim')) ? (string)$request->input('contrato_vigencia_fim') : null;
        $contratoTermos = trim((string)$request->input('contrato_termos', '')) ?: null;

        $stmt = $this->pdo->prepare("
            INSERT INTO startup_clientes (
                usuario_id, tipo_pessoa, nome, cpf_cnpj, endereco, numero_uc,
                telefone, email, whatsapp, qtd_propriedades, desconto_padrao_pct,
                data_adesao, status, observacoes, contrato_vigencia_fim, contrato_termos
            ) VALUES (
                :uid, :tipo, :nome, :cpf_cnpj, :endereco, :numero_uc,
                :telefone, :email, :whatsapp, :qtd_props, :desc_pct,
                :data_adesao, :status, :obs, :contrato_fim, :contrato_termos
            )
        ");

        $stmt->execute([
            'uid'             => $userId,
            'tipo'            => $tipo,
            'nome'            => $nome,
            'cpf_cnpj'        => $cpfCnpj,
            'endereco'        => $endereco,
            'numero_uc'       => $numeroUc,
            'telefone'        => $telefone,
            'email'           => $email,
            'whatsapp'        => $whatsapp,
            'qtd_props'       => $qtdProps,
            'desc_pct'        => $descPct,
            'data_adesao'     => $dataAdesao,
            'status'          => $status,
            'obs'             => $observacoes,
            'contrato_fim'    => $contratoFim,
            'contrato_termos' => $contratoTermos
        ]);

        $clienteId = (int)$this->pdo->lastInsertId();

        $this->auditoria->registrar($userId, 'criar', 'cliente', $clienteId, [
            'nome'             => $nome,
            'tipo'             => $tipo,
            'numero_uc'        => $numeroUc,
            'qtd_propriedades' => $qtdProps
        ]);

        Response::success(['id' => $clienteId], 'Cliente cadastrado com sucesso!', 201);
    }

    public function update(Request $request, string $id): void
    {
        $userId = $this->getUserId();
        $clienteId = (int)$id;

        $stmtCheck = $this->pdo->prepare("SELECT * FROM startup_clientes WHERE id = :id AND usuario_id = :uid AND deletado_em IS NULL");
        $stmtCheck->execute(['id' => $clienteId, 'uid' => $userId]);
        $existing = $stmtCheck->fetch(PDO::FETCH_ASSOC);

        if (!$existing) {
            Response::error('Cliente não encontrado.', 404);
            return;
        }

        $nome = trim((string)$request->input('nome', $existing['nome']));
        if ($nome === '') {
            Response::error('O nome do cliente é obrigatório.', 422);
            return;
        }

        $tipo = in_array($request->input('tipo_pessoa'), ['pf', 'pj'], true) ? $request->input('tipo_pessoa') : $existing['tipo_pessoa'];
        $cpfCnpj = $request->input('cpf_cnpj') !== null ? (trim((string)$request->input('cpf_cnpj')) ?: null) : $existing['cpf_cnpj'];
        $endereco = $request->input('endereco') !== null ? (trim((string)$request->input('endereco')) ?: null) : $existing['endereco'];
        $numeroUc = $request->input('numero_uc') !== null ? (trim((string)$request->input('numero_uc')) ?: null) : $existing['numero_uc'];
        $telefone = $request->input('telefone') !== null ? (trim((string)$request->input('telefone')) ?: null) : $existing['telefone'];
        $email = $request->input('email') !== null ? (trim((string)$request->input('email')) ?: null) : $existing['email'];
        $whatsapp = $request->input('whatsapp') !== null ? (trim((string)$request->input('whatsapp')) ?: null) : $existing['whatsapp'];
        $qtdProps = $request->input('qtd_propriedades') !== null ? max(1, (int)$request->input('qtd_propriedades')) : (int)$existing['qtd_propriedades'];
        $descPct = $request->input('desconto_padrao_pct') !== null ? (float)$request->input('desconto_padrao_pct') : (float)$existing['desconto_padrao_pct'];
        $dataAdesao = $request->input('data_adesao') !== null ? ($request->input('data_adesao') ?: null) : $existing['data_adesao'];
        $status = in_array($request->input('status'), ['ativo', 'suspenso', 'cancelado'], true) ? $request->input('status') : $existing['status'];
        $observacoes = $request->input('observacoes') !== null ? (trim((string)$request->input('observacoes')) ?: null) : $existing['observacoes'];
        $contratoFim = $request->input('contrato_vigencia_fim') !== null ? ($request->input('contrato_vigencia_fim') ?: null) : $existing['contrato_vigencia_fim'];
        $contratoTermos = $request->input('contrato_termos') !== null ? (trim((string)$request->input('contrato_termos')) ?: null) : $existing['contrato_termos'];

        $stmt = $this->pdo->prepare("
            UPDATE startup_clientes SET
                tipo_pessoa = :tipo,
                nome = :nome,
                cpf_cnpj = :cpf_cnpj,
                endereco = :endereco,
                numero_uc = :numero_uc,
                telefone = :telefone,
                email = :email,
                whatsapp = :whatsapp,
                qtd_propriedades = :qtd_props,
                desconto_padrao_pct = :desc_pct,
                data_adesao = :data_adesao,
                status = :status,
                observacoes = :obs,
                contrato_vigencia_fim = :contrato_fim,
                contrato_termos = :contrato_termos,
                atualizado_em = NOW()
            WHERE id = :id AND usuario_id = :uid
        ");

        $stmt->execute([
            'tipo'            => $tipo,
            'nome'            => $nome,
            'cpf_cnpj'        => $cpfCnpj,
            'endereco'        => $endereco,
            'numero_uc'       => $numeroUc,
            'telefone'        => $telefone,
            'email'           => $email,
            'whatsapp'        => $whatsapp,
            'qtd_props'       => $qtdProps,
            'desc_pct'        => $descPct,
            'data_adesao'     => $dataAdesao,
            'status'          => $status,
            'obs'             => $observacoes,
            'contrato_fim'    => $contratoFim,
            'contrato_termos' => $contratoTermos,
            'id'              => $clienteId,
            'uid'             => $userId
        ]);

        $this->auditoria->registrar($userId, 'editar', 'cliente', $clienteId, [
            'nome_novo'   => $nome,
            'status_novo' => $status,
            'qtd_props'   => $qtdProps
        ]);

        Response::success(null, 'Cliente atualizado com sucesso!');
    }

    public function destroy(Request $request, string $id): void
    {
        $userId = $this->getUserId();
        $clienteId = (int)$id;

        $stmt = $this->pdo->prepare("
            UPDATE startup_clientes 
            SET deletado_em = NOW() 
            WHERE id = :id AND usuario_id = :uid AND deletado_em IS NULL
        ");
        $stmt->execute(['id' => $clienteId, 'uid' => $userId]);

        if ($stmt->rowCount() === 0) {
            Response::error('Cliente não encontrado.', 404);
            return;
        }

        $this->auditoria->registrar($userId, 'excluir', 'cliente', $clienteId, [
            'motivo' => 'Exclusão de cliente'
        ]);

        Response::success(null, 'Cliente removido com sucesso!');
    }
}
