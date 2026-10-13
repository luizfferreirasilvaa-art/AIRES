<?php
declare(strict_types=1);

namespace Aires\Controllers;

use Aires\Core\Database;
use Aires\Core\Request;
use Aires\Core\Response;
use Aires\Services\StartupAuditoriaService;
use PDO;

final class StartupFinanceiroController
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
        $tipo = $request->get('tipo');
        $mes = $request->get('mes');
        $categoria = $request->get('categoria');

        $sql = "
            SELECT p.*, c.nome AS cliente_nome, f.mes_referencia AS fatura_mes
            FROM startup_pagamentos p
            LEFT JOIN startup_clientes c ON c.id = p.cliente_id
            LEFT JOIN startup_faturas f ON f.id = p.fatura_id
            WHERE p.usuario_id = :uid AND p.deletado_em IS NULL
        ";
        $params = ['uid' => $userId];

        if (!empty($tipo) && in_array($tipo, ['entrada', 'saida'], true)) {
            $sql .= " AND p.tipo = :tipo";
            $params['tipo'] = $tipo;
        }

        if (!empty($categoria)) {
            $sql .= " AND p.categoria = :categoria";
            $params['categoria'] = $categoria;
        }

        if (!empty($mes)) {
            $sql .= " AND p.data_pagamento LIKE :mes";
            $params['mes'] = "{$mes}%";
        }

        $sql .= " ORDER BY p.data_pagamento DESC, p.id DESC";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        $pagamentos = $stmt->fetchAll(PDO::FETCH_ASSOC);

        Response::json([
            'sucesso'    => true,
            'pagamentos' => $pagamentos,
            'total'      => count($pagamentos)
        ]);
    }

    public function resumo(Request $request): void
    {
        $userId = $this->getUserId();
        $mes = $request->get('mes') ?: date('Y-m');

        // Entradas e Saídas do mês
        $stmtMes = $this->pdo->prepare("
            SELECT 
                COALESCE(SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE 0 END), 0) AS entradas,
                COALESCE(SUM(CASE WHEN tipo = 'saida' THEN valor ELSE 0 END), 0) AS saidas
            FROM startup_pagamentos 
            WHERE usuario_id = :uid AND data_pagamento LIKE :mes AND deletado_em IS NULL
        ");
        $stmtMes->execute(['uid' => $userId, 'mes' => "{$mes}%"]);
        $totaisMes = $stmtMes->fetch(PDO::FETCH_ASSOC);

        $entradas = (float)($totaisMes['entradas'] ?? 0);
        $saidas = (float)($totaisMes['saidas'] ?? 0);
        $saldo = $entradas - $saidas;

        // Inadimplência: faturas emitidas/enviadas cujo vencimento passou e não estão pagas
        $stmtInadimplentes = $this->pdo->prepare("
            SELECT f.*, c.nome AS cliente_nome, c.whatsapp, c.telefone,
                   DATEDIFF(CURDATE(), f.data_vencimento) AS dias_atraso
            FROM startup_faturas f
            JOIN startup_clientes c ON c.id = f.cliente_id
            WHERE f.usuario_id = :uid 
              AND f.status IN ('emitida', 'enviada', 'atrasada')
              AND f.data_vencimento < CURDATE()
              AND f.deletado_em IS NULL
            ORDER BY dias_atraso DESC
        ");
        $stmtInadimplentes->execute(['uid' => $userId]);
        $inadimplentes = $stmtInadimplentes->fetchAll(PDO::FETCH_ASSOC);

        $totalInadimplente = array_sum(array_map(fn($f) => (float)$f['valor_cobrado'], $inadimplentes));

        Response::json([
            'sucesso' => true,
            'resumo'  => [
                'mes'                => $mes,
                'entradas'           => $entradas,
                'saidas'             => $saidas,
                'saldo'              => $saldo,
                'total_inadimplente' => $totalInadimplente,
                'qtd_inadimplentes'  => count($inadimplentes)
            ],
            'inadimplentes' => $inadimplentes
        ]);
    }

    public function store(Request $request): void
    {
        $userId = $this->getUserId();
        $tipo = in_array($request->input('tipo'), ['entrada', 'saida'], true) ? $request->input('tipo') : 'entrada';
        $categoria = trim((string)$request->input('categoria', 'fatura_cliente')) ?: 'outros';
        $descricao = trim((string)$request->input('descricao', ''));
        $valor = (float)$request->input('valor', 0);
        $metodo = trim((string)$request->input('metodo_pagamento', 'pix')) ?: 'pix';
        $data = !empty($request->input('data_pagamento')) ? (string)$request->input('data_pagamento') : date('Y-m-d');
        $clienteId = $request->input('cliente_id') ? (int)$request->input('cliente_id') : null;
        $faturaId = $request->input('fatura_id') ? (int)$request->input('fatura_id') : null;

        if ($valor <= 0) {
            Response::error('O valor deve ser maior que zero.', 422);
            return;
        }

        if ($descricao === '') {
            Response::error('A descrição do pagamento é obrigatória.', 422);
            return;
        }

        $stmt = $this->pdo->prepare("
            INSERT INTO startup_pagamentos (
                usuario_id, fatura_id, cliente_id, tipo, categoria, descricao, valor, metodo_pagamento, data_pagamento
            ) VALUES (
                :uid, :fid, :cid, :tipo, :cat, :desc, :val, :metodo, :dt
            )
        ");

        $stmt->execute([
            'uid'    => $userId,
            'fid'    => $faturaId,
            'cid'    => $clienteId,
            'tipo'   => $tipo,
            'cat'    => $categoria,
            'desc'   => $descricao,
            'val'    => $valor,
            'metodo' => $metodo,
            'dt'     => $data
        ]);

        $pagamentoId = (int)$this->pdo->lastInsertId();

        $this->auditoria->registrar($userId, 'registrar_pagamento', 'pagamento', $pagamentoId, [
            'tipo'      => $tipo,
            'categoria' => $categoria,
            'valor'     => $valor,
            'descricao' => $descricao
        ]);

        Response::success(['id' => $pagamentoId], 'Movimentação financeira registrada!', 201);
    }

    public function update(Request $request, string $id): void
    {
        $userId = $this->getUserId();
        $pagamentoId = (int)$id;

        $stmtCheck = $this->pdo->prepare("SELECT * FROM startup_pagamentos WHERE id = :id AND usuario_id = :uid AND deletado_em IS NULL");
        $stmtCheck->execute(['id' => $pagamentoId, 'uid' => $userId]);
        $existing = $stmtCheck->fetch(PDO::FETCH_ASSOC);

        if (!$existing) {
            Response::error('Registro não encontrado.', 404);
            return;
        }

        $tipo = in_array($request->input('tipo'), ['entrada', 'saida'], true) ? $request->input('tipo') : $existing['tipo'];
        $categoria = $request->input('categoria') ? trim((string)$request->input('categoria')) : $existing['categoria'];
        $descricao = $request->input('descricao') ? trim((string)$request->input('descricao')) : $existing['descricao'];
        $valor = $request->input('valor') !== null ? (float)$request->input('valor') : (float)$existing['valor'];
        $metodo = $request->input('metodo_pagamento') ? trim((string)$request->input('metodo_pagamento')) : $existing['metodo_pagamento'];
        $data = $request->input('data_pagamento') ?: $existing['data_pagamento'];

        $stmt = $this->pdo->prepare("
            UPDATE startup_pagamentos SET
                tipo = :tipo,
                categoria = :cat,
                descricao = :desc,
                valor = :val,
                metodo_pagamento = :metodo,
                data_pagamento = :dt,
                atualizado_em = NOW()
            WHERE id = :id AND usuario_id = :uid
        ");
        $stmt->execute([
            'tipo'   => $tipo,
            'cat'    => $categoria,
            'desc'   => $descricao,
            'val'    => $valor,
            'metodo' => $metodo,
            'dt'     => $data,
            'id'     => $pagamentoId,
            'uid'    => $userId
        ]);

        $this->auditoria->registrar($userId, 'editar', 'pagamento', $pagamentoId, [
            'valor' => $valor,
            'tipo'  => $tipo
        ]);

        Response::success(null, 'Movimentação atualizada com sucesso!');
    }

    public function destroy(Request $request, string $id): void
    {
        $userId = $this->getUserId();
        $pagamentoId = (int)$id;

        $stmt = $this->pdo->prepare("
            UPDATE startup_pagamentos 
            SET deletado_em = NOW() 
            WHERE id = :id AND usuario_id = :uid AND deletado_em IS NULL
        ");
        $stmt->execute(['id' => $pagamentoId, 'uid' => $userId]);

        if ($stmt->rowCount() === 0) {
            Response::error('Registro não encontrado.', 404);
            return;
        }

        $this->auditoria->registrar($userId, 'excluir', 'pagamento', $pagamentoId, [
            'motivo' => 'Exclusão de movimentação financeira'
        ]);

        Response::success(null, 'Registro excluído com sucesso!');
    }
}
