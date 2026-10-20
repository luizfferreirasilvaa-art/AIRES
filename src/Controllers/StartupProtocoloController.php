<?php
declare(strict_types=1);

namespace Aires\Controllers;

use Aires\Core\Database;
use Aires\Core\Request;
use Aires\Core\Response;
use Aires\Services\StartupAuditoriaService;
use PDO;

final class StartupProtocoloController
{
    private PDO $pdo;
    private StartupAuditoriaService $auditoria;

    public function __construct()
    {
        $this->pdo = Database::getInstance()->getConnection();
        $this->auditoria = new StartupAuditoriaService();
        $this->garantirTabela();
    }

    private function getUserId(): int
    {
        return isset($_SESSION['usuario_id']) ? (int)$_SESSION['usuario_id'] : 1;
    }

    private function garantirTabela(): void
    {
        try {
            $this->pdo->exec("
                CREATE TABLE IF NOT EXISTS `startup_protocolos` (
                    `id` INT AUTO_INCREMENT PRIMARY KEY,
                    `usuario_id` INT NOT NULL,
                    `cliente_id` INT NOT NULL,
                    `numero_protocolo` VARCHAR(100) NOT NULL,
                    `titulo` VARCHAR(255) NOT NULL,
                    `canal` VARCHAR(100) NOT NULL DEFAULT 'Energisa',
                    `categoria` VARCHAR(50) NOT NULL DEFAULT 'geral',
                    `prioridade` ENUM('baixa', 'media', 'alta', 'urgente') NOT NULL DEFAULT 'media',
                    `status` ENUM('aberto', 'em_andamento', 'aguardando_cliente', 'concluido', 'cancelado') NOT NULL DEFAULT 'aberto',
                    `data_abertura` DATE NOT NULL,
                    `data_vencimento` DATE NULL,
                    `data_conclusao` DATE NULL,
                    `alerta_atencao` TINYINT(1) NOT NULL DEFAULT 0,
                    `observacoes` TEXT NULL,
                    `historico_andamentos` JSON NULL,
                    `arquivo_anexo` VARCHAR(500) NULL DEFAULT NULL,
                    `nome_arquivo_anexo` VARCHAR(255) NULL DEFAULT NULL,
                    `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    `deletado_em` TIMESTAMP NULL DEFAULT NULL,
                    INDEX `idx_st_prot_usuario_status` (`usuario_id`, `status`),
                    INDEX `idx_st_prot_cliente` (`cliente_id`),
                    INDEX `idx_st_prot_vencimento` (`data_vencimento`),
                    INDEX `idx_st_prot_numero` (`numero_protocolo`),
                    INDEX `idx_st_prot_atencao` (`usuario_id`, `alerta_atencao`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            ");
        } catch (\Throwable $e) {
            // Ignora se a tabela já existir
        }
    }

    public function index(Request $request): void
    {
        $userId = $this->getUserId();
        $busca = trim((string)$request->get('busca', ''));
        $status = trim((string)$request->get('status', ''));
        $prioridade = trim((string)$request->get('prioridade', ''));
        $clienteId = (int)$request->get('cliente_id', 0);
        $atencao = trim((string)$request->get('atencao', ''));
        $filtroVencimento = trim((string)$request->get('vencimento', ''));

        $sql = "
            SELECT p.*,
                   c.nome AS cliente_nome,
                   c.numero_uc AS cliente_uc,
                   c.telefone AS cliente_telefone,
                   c.whatsapp AS cliente_whatsapp,
                   c.email AS cliente_email,
                   c.qtd_propriedades AS cliente_qtd_propriedades,
                   c.status AS cliente_status,
                   DATEDIFF(p.data_vencimento, CURDATE()) AS dias_para_vencer
            FROM startup_protocolos p
            JOIN startup_clientes c ON c.id = p.cliente_id
            WHERE p.usuario_id = :uid AND p.deletado_em IS NULL
        ";
        $params = ['uid' => $userId];

        if ($clienteId > 0) {
            $sql .= " AND p.cliente_id = :cid";
            $params['cid'] = $clienteId;
        }

        if ($status !== '') {
            if ($status === 'pendentes') {
                $sql .= " AND p.status IN ('aberto', 'em_andamento', 'aguardando_cliente')";
            } elseif (in_array($status, ['aberto', 'em_andamento', 'aguardando_cliente', 'concluido', 'cancelado'], true)) {
                $sql .= " AND p.status = :status";
                $params['status'] = $status;
            }
        }

        if ($prioridade !== '' && in_array($prioridade, ['baixa', 'media', 'alta', 'urgente'], true)) {
            $sql .= " AND p.prioridade = :prio";
            $params['prio'] = $prioridade;
        }

        if ($atencao === '1') {
            $sql .= " AND p.alerta_atencao = 1";
        }

        if ($filtroVencimento === 'vencidos') {
            $sql .= " AND p.data_vencimento IS NOT NULL AND p.data_vencimento < CURDATE() AND p.status NOT IN ('concluido', 'cancelado')";
        } elseif ($filtroVencimento === 'hoje') {
            $sql .= " AND p.data_vencimento = CURDATE() AND p.status NOT IN ('concluido', 'cancelado')";
        } elseif ($filtroVencimento === 'proximos') {
            $sql .= " AND p.data_vencimento >= CURDATE() AND p.data_vencimento <= DATE_ADD(CURDATE(), INTERVAL 7 DAY) AND p.status NOT IN ('concluido', 'cancelado')";
        }

        if ($busca !== '') {
            $sql .= " AND (
                p.numero_protocolo LIKE :busca 
                OR p.titulo LIKE :busca 
                OR p.observacoes LIKE :busca 
                OR c.nome LIKE :busca 
                OR c.numero_uc LIKE :busca
            )";
            $params['busca'] = "%{$busca}%";
        }

        // Ordenação inteligente: pontos de atenção e vencidos primeiro, depois por data de vencimento
        $sql .= "
            ORDER BY 
                CASE 
                    WHEN p.status IN ('concluido', 'cancelado') THEN 2
                    ELSE 1
                END ASC,
                p.alerta_atencao DESC,
                CASE 
                    WHEN p.data_vencimento IS NOT NULL AND p.data_vencimento < CURDATE() THEN 0
                    WHEN p.data_vencimento IS NOT NULL THEN 1
                    ELSE 2
                END ASC,
                p.data_vencimento ASC,
                p.id DESC
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        $protocolos = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Decodificar histórico JSON para cada protocolo
        foreach ($protocolos as &$p) {
            $p['historico_andamentos'] = !empty($p['historico_andamentos']) ? json_decode($p['historico_andamentos'], true) : [];
        }
        unset($p);

        // Resumo de KPIs para o painel de protocolos
        $stmtKpis = $this->pdo->prepare("
            SELECT 
                COUNT(*) AS total_geral,
                SUM(CASE WHEN status IN ('aberto', 'em_andamento', 'aguardando_cliente') THEN 1 ELSE 0 END) AS total_abertos,
                SUM(CASE WHEN data_vencimento = CURDATE() AND status NOT IN ('concluido', 'cancelado') THEN 1 ELSE 0 END) AS total_vencendo_hoje,
                SUM(CASE WHEN data_vencimento < CURDATE() AND status NOT IN ('concluido', 'cancelado') THEN 1 ELSE 0 END) AS total_vencidos,
                SUM(CASE WHEN alerta_atencao = 1 AND status NOT IN ('concluido', 'cancelado') THEN 1 ELSE 0 END) AS total_atencao,
                SUM(CASE WHEN status = 'concluido' THEN 1 ELSE 0 END) AS total_concluidos
            FROM startup_protocolos
            WHERE usuario_id = :uid AND deletado_em IS NULL
        ");
        $stmtKpis->execute(['uid' => $userId]);
        $kpis = $stmtKpis->fetch(PDO::FETCH_ASSOC) ?: [
            'total_geral' => 0,
            'total_abertos' => 0,
            'total_vencendo_hoje' => 0,
            'total_vencidos' => 0,
            'total_atencao' => 0,
            'total_concluidos' => 0
        ];

        Response::json([
            'sucesso'     => true,
            'protocolos'  => $protocolos,
            'kpis'        => $kpis,
            'total'       => count($protocolos)
        ]);
    }

    public function show(Request $request, string $id): void
    {
        $userId = $this->getUserId();
        $protocoloId = (int)$id;

        $stmt = $this->pdo->prepare("
            SELECT p.*,
                   c.nome AS cliente_nome,
                   c.numero_uc AS cliente_uc,
                   c.telefone AS cliente_telefone,
                   c.whatsapp AS cliente_whatsapp,
                   c.email AS cliente_email,
                   c.qtd_propriedades AS cliente_qtd_propriedades,
                   c.status AS cliente_status,
                   DATEDIFF(p.data_vencimento, CURDATE()) AS dias_para_vencer
            FROM startup_protocolos p
            JOIN startup_clientes c ON c.id = p.cliente_id
            WHERE p.id = :id AND p.usuario_id = :uid AND p.deletado_em IS NULL
            LIMIT 1
        ");
        $stmt->execute(['id' => $protocoloId, 'uid' => $userId]);
        $protocolo = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$protocolo) {
            Response::error('Protocolo não encontrado.', 404);
            return;
        }

        $protocolo['historico_andamentos'] = !empty($protocolo['historico_andamentos'])
            ? json_decode($protocolo['historico_andamentos'], true)
            : [];

        Response::json([
            'sucesso'   => true,
            'protocolo' => $protocolo
        ]);
    }

    public function store(Request $request): void
    {
        $userId = $this->getUserId();
        $clienteId = (int)$request->input('cliente_id', 0);
        $titulo = trim((string)$request->input('titulo', ''));
        $numeroProtocolo = trim((string)$request->input('numero_protocolo', ''));
        $canal = trim((string)$request->input('canal', 'Energisa')) ?: 'Energisa';
        $categoria = trim((string)$request->input('categoria', 'geral')) ?: 'geral';
        $prioridade = trim((string)$request->input('prioridade', 'media'));
        $status = trim((string)$request->input('status', 'aberto'));
        $dataAbertura = trim((string)$request->input('data_abertura', date('Y-m-d'))) ?: date('Y-m-d');
        $dataVencimento = trim((string)$request->input('data_vencimento', '')) ?: null;
        $dataConclusao = trim((string)$request->input('data_conclusao', '')) ?: null;
        $alertaAtencao = (int)($request->input('alerta_atencao', 0) ? 1 : 0);
        $observacoes = trim((string)$request->input('observacoes', '')) ?: null;
        $arquivoAnexo = trim((string)$request->input('arquivo_anexo', '')) ?: null;
        $nomeArquivoAnexo = trim((string)$request->input('nome_arquivo_anexo', '')) ?: null;

        if ($clienteId <= 0) {
            Response::error('Selecione o cliente vinculado a este protocolo.', 422);
            return;
        }

        if ($titulo === '') {
            Response::error('O título/assunto do protocolo é obrigatório.', 422);
            return;
        }

        // Se número do protocolo não for informado, gera identificador sequencial amigável
        if ($numeroProtocolo === '') {
            $numeroProtocolo = 'PROT-' . date('ymd') . '-' . strtoupper(substr(uniqid(), -4));
        }

        if (!in_array($prioridade, ['baixa', 'media', 'alta', 'urgente'], true)) {
            $prioridade = 'media';
        }

        if (!in_array($status, ['aberto', 'em_andamento', 'aguardando_cliente', 'concluido', 'cancelado'], true)) {
            $status = 'aberto';
        }

        if ($status === 'concluido' && !$dataConclusao) {
            $dataConclusao = date('Y-m-d');
        }

        // Histórico inicial
        $historico = [
            [
                'data'      => date('Y-m-d H:i:s'),
                'tipo'      => 'criacao',
                'descricao' => 'Protocolo registrado no sistema.',
                'autor'     => 'Comandante'
            ]
        ];

        $stmt = $this->pdo->prepare("
            INSERT INTO startup_protocolos (
                usuario_id, cliente_id, numero_protocolo, titulo, canal, categoria,
                prioridade, status, data_abertura, data_vencimento, data_conclusao,
                alerta_atencao, observacoes, historico_andamentos, arquivo_anexo, nome_arquivo_anexo
            ) VALUES (
                :uid, :cid, :num, :tit, :canal, :cat,
                :prio, :status, :abertura, :venc, :concl,
                :atencao, :obs, :hist, :anexo, :nome_anexo
            )
        ");

        $stmt->execute([
            'uid'        => $userId,
            'cid'        => $clienteId,
            'num'        => $numeroProtocolo,
            'tit'        => $titulo,
            'canal'      => $canal,
            'cat'        => $categoria,
            'prio'       => $prioridade,
            'status'     => $status,
            'abertura'   => $dataAbertura,
            'venc'       => $dataVencimento,
            'concl'      => $dataConclusao,
            'atencao'    => $alertaAtencao,
            'obs'        => $observacoes,
            'hist'       => json_encode($historico, JSON_UNESCAPED_UNICODE),
            'anexo'      => $arquivoAnexo,
            'nome_anexo' => $nomeArquivoAnexo
        ]);

        $protocoloId = (int)$this->pdo->lastInsertId();

        $this->auditoria->registrar($userId, 'criar', 'protocolo', $protocoloId, [
            'numero_protocolo' => $numeroProtocolo,
            'cliente_id'       => $clienteId,
            'titulo'           => $titulo,
            'alerta_atencao'   => $alertaAtencao
        ]);

        Response::success([
            'id'               => $protocoloId,
            'numero_protocolo' => $numeroProtocolo
        ], 'Protocolo registrado com sucesso!', 201);
    }

    public function update(Request $request, string $id): void
    {
        $userId = $this->getUserId();
        $protocoloId = (int)$id;

        $stmtCheck = $this->pdo->prepare("SELECT * FROM startup_protocolos WHERE id = :id AND usuario_id = :uid AND deletado_em IS NULL");
        $stmtCheck->execute(['id' => $protocoloId, 'uid' => $userId]);
        $existing = $stmtCheck->fetch(PDO::FETCH_ASSOC);

        if (!$existing) {
            Response::error('Protocolo não encontrado.', 404);
            return;
        }

        $clienteId = $request->input('cliente_id') !== null ? (int)$request->input('cliente_id') : (int)$existing['cliente_id'];
        $titulo = $request->input('titulo') !== null ? trim((string)$request->input('titulo')) : $existing['titulo'];
        $numeroProtocolo = $request->input('numero_protocolo') !== null ? trim((string)$request->input('numero_protocolo')) : $existing['numero_protocolo'];
        $canal = $request->input('canal') !== null ? trim((string)$request->input('canal')) : $existing['canal'];
        $categoria = $request->input('categoria') !== null ? trim((string)$request->input('categoria')) : $existing['categoria'];
        $prioridade = $request->input('prioridade') !== null ? trim((string)$request->input('prioridade')) : $existing['prioridade'];
        $status = $request->input('status') !== null ? trim((string)$request->input('status')) : $existing['status'];
        $dataAbertura = $request->input('data_abertura') !== null ? (trim((string)$request->input('data_abertura')) ?: $existing['data_abertura']) : $existing['data_abertura'];
        $dataVencimento = $request->input('data_vencimento') !== null ? (trim((string)$request->input('data_vencimento')) ?: null) : $existing['data_vencimento'];
        $dataConclusao = $request->input('data_conclusao') !== null ? (trim((string)$request->input('data_conclusao')) ?: null) : $existing['data_conclusao'];
        $alertaAtencao = $request->input('alerta_atencao') !== null ? (int)($request->input('alerta_atencao') ? 1 : 0) : (int)$existing['alerta_atencao'];
        $observacoes = $request->input('observacoes') !== null ? (trim((string)$request->input('observacoes')) ?: null) : $existing['observacoes'];
        $arquivoAnexo = $request->input('arquivo_anexo') !== null ? (trim((string)$request->input('arquivo_anexo')) ?: null) : $existing['arquivo_anexo'];
        $nomeArquivoAnexo = $request->input('nome_arquivo_anexo') !== null ? (trim((string)$request->input('nome_arquivo_anexo')) ?: null) : $existing['nome_arquivo_anexo'];

        if ($clienteId <= 0) {
            Response::error('Selecione um cliente válido.', 422);
            return;
        }

        if ($titulo === '') {
            Response::error('O título do protocolo não pode ser vazio.', 422);
            return;
        }

        if ($status === 'concluido' && !$dataConclusao) {
            $dataConclusao = date('Y-m-d');
        } elseif ($status !== 'concluido' && $existing['status'] === 'concluido') {
            $dataConclusao = null;
        }

        $stmt = $this->pdo->prepare("
            UPDATE startup_protocolos SET
                cliente_id = :cid,
                numero_protocolo = :num,
                titulo = :tit,
                canal = :canal,
                categoria = :cat,
                prioridade = :prio,
                status = :status,
                data_abertura = :abertura,
                data_vencimento = :venc,
                data_conclusao = :concl,
                alerta_atencao = :atencao,
                observacoes = :obs,
                arquivo_anexo = :anexo,
                nome_arquivo_anexo = :nome_anexo,
                atualizado_em = NOW()
            WHERE id = :id AND usuario_id = :uid
        ");

        $stmt->execute([
            'cid'        => $clienteId,
            'num'        => $numeroProtocolo,
            'tit'        => $titulo,
            'canal'      => $canal,
            'cat'        => $categoria,
            'prio'       => $prioridade,
            'status'     => $status,
            'abertura'   => $dataAbertura,
            'venc'       => $dataVencimento,
            'concl'      => $dataConclusao,
            'atencao'    => $alertaAtencao,
            'obs'        => $observacoes,
            'anexo'      => $arquivoAnexo,
            'nome_anexo' => $nomeArquivoAnexo,
            'id'         => $protocoloId,
            'uid'        => $userId
        ]);

        $this->auditoria->registrar($userId, 'editar', 'protocolo', $protocoloId, [
            'status'         => $status,
            'alerta_atencao' => $alertaAtencao
        ]);

        Response::success(null, 'Protocolo atualizado com sucesso!');
    }

    public function updateStatus(Request $request, string $id): void
    {
        $userId = $this->getUserId();
        $protocoloId = (int)$id;
        $novoStatus = trim((string)$request->input('status', ''));

        if (!in_array($novoStatus, ['aberto', 'em_andamento', 'aguardando_cliente', 'concluido', 'cancelado'], true)) {
            Response::error('Status inválido.', 422);
            return;
        }

        $stmtCheck = $this->pdo->prepare("SELECT * FROM startup_protocolos WHERE id = :id AND usuario_id = :uid AND deletado_em IS NULL");
        $stmtCheck->execute(['id' => $protocoloId, 'uid' => $userId]);
        $existing = $stmtCheck->fetch(PDO::FETCH_ASSOC);

        if (!$existing) {
            Response::error('Protocolo não encontrado.', 404);
            return;
        }

        $dataConclusao = $novoStatus === 'concluido' ? date('Y-m-d') : null;

        // Adiciona registro na timeline
        $historico = !empty($existing['historico_andamentos']) ? json_decode($existing['historico_andamentos'], true) : [];
        $historico[] = [
            'data'      => date('Y-m-d H:i:s'),
            'tipo'      => 'mudanca_status',
            'descricao' => "Status alterado de '{$existing['status']}' para '{$novoStatus}'.",
            'autor'     => 'Comandante'
        ];

        $stmt = $this->pdo->prepare("
            UPDATE startup_protocolos 
            SET status = :status, 
                data_conclusao = :concl, 
                historico_andamentos = :hist,
                atualizado_em = NOW() 
            WHERE id = :id AND usuario_id = :uid
        ");
        $stmt->execute([
            'status' => $novoStatus,
            'concl'  => $dataConclusao,
            'hist'   => json_encode($historico, JSON_UNESCAPED_UNICODE),
            'id'     => $protocoloId,
            'uid'    => $userId
        ]);

        $this->auditoria->registrar($userId, 'alterar_status', 'protocolo', $protocoloId, [
            'status_anterior' => $existing['status'],
            'status_novo'     => $novoStatus
        ]);

        Response::success(['status' => $novoStatus], 'Status do protocolo atualizado!');
    }

    public function adicionarAndamento(Request $request, string $id): void
    {
        $userId = $this->getUserId();
        $protocoloId = (int)$id;
        $descricao = trim((string)$request->input('descricao', ''));

        if ($descricao === '') {
            Response::error('A descrição do andamento não pode ser vazia.', 422);
            return;
        }

        $stmtCheck = $this->pdo->prepare("SELECT * FROM startup_protocolos WHERE id = :id AND usuario_id = :uid AND deletado_em IS NULL");
        $stmtCheck->execute(['id' => $protocoloId, 'uid' => $userId]);
        $existing = $stmtCheck->fetch(PDO::FETCH_ASSOC);

        if (!$existing) {
            Response::error('Protocolo não encontrado.', 404);
            return;
        }

        $historico = !empty($existing['historico_andamentos']) ? json_decode($existing['historico_andamentos'], true) : [];
        $novoItem = [
            'data'      => date('Y-m-d H:i:s'),
            'tipo'      => 'nota',
            'descricao' => $descricao,
            'autor'     => 'Comandante'
        ];
        $historico[] = $novoItem;

        $stmt = $this->pdo->prepare("
            UPDATE startup_protocolos 
            SET historico_andamentos = :hist, atualizado_em = NOW() 
            WHERE id = :id AND usuario_id = :uid
        ");
        $stmt->execute([
            'hist' => json_encode($historico, JSON_UNESCAPED_UNICODE),
            'id'   => $protocoloId,
            'uid'  => $userId
        ]);

        $this->auditoria->registrar($userId, 'adicionar_andamento', 'protocolo', $protocoloId, [
            'andamento' => substr($descricao, 0, 100)
        ]);

        Response::success(['andamento' => $novoItem], 'Andamento registrado com sucesso!');
    }

    public function destroy(Request $request, string $id): void
    {
        $userId = $this->getUserId();
        $protocoloId = (int)$id;

        $stmtCheck = $this->pdo->prepare("SELECT numero_protocolo FROM startup_protocolos WHERE id = :id AND usuario_id = :uid AND deletado_em IS NULL");
        $stmtCheck->execute(['id' => $protocoloId, 'uid' => $userId]);
        $existing = $stmtCheck->fetch(PDO::FETCH_ASSOC);

        if (!$existing) {
            Response::error('Protocolo não encontrado.', 404);
            return;
        }

        $this->pdo->prepare("UPDATE startup_protocolos SET deletado_em = NOW() WHERE id = :id AND usuario_id = :uid")
            ->execute(['id' => $protocoloId, 'uid' => $userId]);

        $this->auditoria->registrar($userId, 'excluir', 'protocolo', $protocoloId, [
            'numero_protocolo' => $existing['numero_protocolo']
        ]);

        Response::success(null, 'Protocolo excluído com sucesso!');
    }
}
