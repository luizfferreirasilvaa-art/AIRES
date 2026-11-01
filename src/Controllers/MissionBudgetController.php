<?php
declare(strict_types=1);

namespace Aires\Controllers;

use Aires\Core\Database;
use Aires\Core\Request;
use Aires\Core\Response;
use PDO;

final class MissionBudgetController
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getInstance()->getConnection();
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
                CREATE TABLE IF NOT EXISTS `missao_orcamento_itens` (
                    `id` INT AUTO_INCREMENT PRIMARY KEY,
                    `usuario_id` INT NOT NULL,
                    `missao_id` INT NOT NULL,
                    `item` VARCHAR(255) NOT NULL,
                    `categoria` VARCHAR(50) NOT NULL DEFAULT 'equipamento',
                    `valor_total` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
                    `qtd_parcelas` INT NOT NULL DEFAULT 1,
                    `valor_parcela` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
                    `forma_pagamento` VARCHAR(50) NOT NULL DEFAULT 'parcelado',
                    `data_primeiro_vencimento` DATE NOT NULL,
                    `periodicidade` VARCHAR(20) NOT NULL DEFAULT 'mensal',
                    `status` ENUM('planejado', 'em_negociacao', 'aprovado', 'em_pagamento', 'quitado', 'cancelado') NOT NULL DEFAULT 'planejado',
                    `fornecedor` VARCHAR(200) NULL,
                    `observacoes` TEXT NULL,
                    `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    `deletado_em` TIMESTAMP NULL DEFAULT NULL,
                    INDEX `idx_m_orc_usuario` (`usuario_id`, `status`),
                    INDEX `idx_m_orc_missao` (`missao_id`),
                    INDEX `idx_m_orc_vencimento` (`data_primeiro_vencimento`),
                    INDEX `idx_m_orc_deletado` (`deletado_em`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            ");
        } catch (\Throwable $e) {
            // Silencia caso a tabela já exista
        }
    }

    public function index(Request $request): void
    {
        $userId = $this->getUserId();
        $missaoId = (int)$request->get('missao_id', 0);
        $status = trim((string)$request->get('status', ''));
        $categoria = trim((string)$request->get('categoria', ''));
        $busca = trim((string)$request->get('busca', ''));

        $sql = "
            SELECT oi.*,
                   m.titulo AS missao_titulo,
                   m.cor AS missao_cor,
                   m.orcamento_estimado AS missao_orcamento_teto
            FROM missao_orcamento_itens oi
            JOIN missoes m ON m.id = oi.missao_id AND m.deletado_em IS NULL
            WHERE oi.usuario_id = :uid AND oi.deletado_em IS NULL
        ";
        $params = ['uid' => $userId];

        if ($missaoId > 0) {
            $sql .= " AND oi.missao_id = :mid";
            $params['mid'] = $missaoId;
        }

        if ($status !== '' && in_array($status, ['planejado', 'em_negociacao', 'aprovado', 'em_pagamento', 'quitado', 'cancelado'], true)) {
            $sql .= " AND oi.status = :status";
            $params['status'] = $status;
        }

        if ($categoria !== '') {
            $sql .= " AND oi.categoria = :categoria";
            $params['categoria'] = $categoria;
        }

        if ($busca !== '') {
            $sql .= " AND (oi.item LIKE :busca OR oi.fornecedor LIKE :busca OR oi.observacoes LIKE :busca OR m.titulo LIKE :busca)";
            $params['busca'] = "%{$busca}%";
        }

        $sql .= " ORDER BY oi.data_primeiro_vencimento ASC, oi.id DESC";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        $itens = $stmt->fetchAll(PDO::FETCH_ASSOC);

        Response::json([
            'sucesso' => true,
            'itens'   => $itens,
            'total'   => count($itens)
        ]);
    }

    public function resumo(Request $request): void
    {
        $userId = $this->getUserId();
        $missaoId = (int)$request->get('missao_id', 0);

        // Orçamento total estimado das missões do usuário
        $sqlMissoes = "SELECT id, titulo, cor, orcamento_estimado, status FROM missoes WHERE usuario_id = :uid AND deletado_em IS NULL";
        if ($missaoId > 0) {
            $sqlMissoes .= " AND id = :mid";
        }
        $stmtM = $this->pdo->prepare($sqlMissoes);
        $paramsM = ['uid' => $userId];
        if ($missaoId > 0) $paramsM['mid'] = $missaoId;
        $stmtM->execute($paramsM);
        $missoes = $stmtM->fetchAll(PDO::FETCH_ASSOC);

        $totalTetoEstimado = 0.0;
        foreach ($missoes as $m) {
            $totalTetoEstimado += (float)$m['orcamento_estimado'];
        }

        // Totais de itens orçados
        $sqlItens = "
            SELECT 
                COUNT(*) AS total_itens,
                COALESCE(SUM(valor_total), 0) AS total_orcado,
                COALESCE(SUM(CASE WHEN status = 'quitado' THEN valor_total ELSE 0 END), 0) AS total_pago,
                COALESCE(SUM(CASE WHEN status IN ('aprovado', 'em_pagamento') THEN valor_total ELSE 0 END), 0) AS total_empenhado,
                COALESCE(SUM(CASE WHEN status IN ('planejado', 'em_negociacao') THEN valor_total ELSE 0 END), 0) AS total_planejado
            FROM missao_orcamento_itens
            WHERE usuario_id = :uid AND deletado_em IS NULL
        ";
        if ($missaoId > 0) {
            $sqlItens .= " AND missao_id = :mid";
        }
        $stmtI = $this->pdo->prepare($sqlItens);
        $stmtI->execute($paramsM);
        $totaisItens = $stmtI->fetch(PDO::FETCH_ASSOC) ?: [];

        $totalOrcado = (float)($totaisItens['total_orcado'] ?? 0);
        $totalPago = (float)($totaisItens['total_pago'] ?? 0);
        $totalEmpenhado = (float)($totaisItens['total_empenhado'] ?? 0);
        $totalPlanejado = (float)($totaisItens['total_planejado'] ?? 0);
        $saldoDisponivel = $totalTetoEstimado - $totalOrcado;

        // Resumo por missão individual
        $stmtPlanos = $this->pdo->prepare("
            SELECT m.id, m.titulo, m.cor, m.orcamento_estimado,
                   COUNT(oi.id) AS qtd_itens,
                   COALESCE(SUM(oi.valor_total), 0) AS total_itens_orcados,
                   COALESCE(SUM(CASE WHEN oi.status = 'quitado' THEN oi.valor_total ELSE 0 END), 0) AS total_pago
            FROM missoes m
            LEFT JOIN missao_orcamento_itens oi ON oi.missao_id = m.id AND oi.deletado_em IS NULL
            WHERE m.usuario_id = :uid AND m.deletado_em IS NULL
            GROUP BY m.id
            ORDER BY m.id ASC
        ");
        $stmtPlanos->execute(['uid' => $userId]);
        $planosResumo = $stmtPlanos->fetchAll(PDO::FETCH_ASSOC);

        Response::json([
            'sucesso' => true,
            'kpis' => [
                'teto_estimado'    => $totalTetoEstimado,
                'total_orcado'     => $totalOrcado,
                'saldo_disponivel' => $saldoDisponivel,
                'total_pago'       => $totalPago,
                'total_empenhado'  => $totalEmpenhado,
                'total_planejado'  => $totalPlanejado,
                'total_itens'      => (int)($totaisItens['total_itens'] ?? 0),
                'percentual_empenhado' => $totalTetoEstimado > 0 ? round(($totalOrcado / $totalTetoEstimado) * 100, 1) : 0
            ],
            'planos' => $planosResumo
        ]);
    }

    public function projecao(Request $request): void
    {
        $userId = $this->getUserId();
        $missaoId = (int)$request->get('missao_id', 0);
        $mesesFrente = max(6, min(24, (int)$request->get('meses', 12)));

        $sql = "
            SELECT oi.*, m.titulo AS missao_titulo, m.cor AS missao_cor
            FROM missao_orcamento_itens oi
            JOIN missoes m ON m.id = oi.missao_id AND m.deletado_em IS NULL
            WHERE oi.usuario_id = :uid AND oi.deletado_em IS NULL
              AND oi.status NOT IN ('cancelado', 'quitado')
        ";
        $params = ['uid' => $userId];
        if ($missaoId > 0) {
            $sql .= " AND oi.missao_id = :mid";
            $params['mid'] = $missaoId;
        }

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        $itens = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Inicializar os próximos N meses
        $projecaoPorMes = [];
        $dataCursor = new \DateTime('first day of this month');

        for ($i = 0; $i < $mesesFrente; $i++) {
            $chaveMes = $dataCursor->format('Y-m');
            $projecaoPorMes[$chaveMes] = [
                'mes'            => $chaveMes,
                'mes_nome'       => $this->nomeMesAno($chaveMes),
                'total_previsto' => 0.0,
                'qtd_parcelas'   => 0,
                'itens'          => []
            ];
            $dataCursor->modify('+1 month');
        }

        // Distribuir cada item conforme seu parcelamento
        foreach ($itens as $item) {
            $qtdParcelas = max(1, (int)$item['qtd_parcelas']);
            $valorParcela = (float)$item['valor_parcela'];
            if ($valorParcela <= 0 && $qtdParcelas > 0) {
                $valorParcela = round((float)$item['valor_total'] / $qtdParcelas, 2);
            }

            try {
                $dtVenc = new \DateTime($item['data_primeiro_vencimento']);
            } catch (\Throwable $e) {
                $dtVenc = new \DateTime();
            }

            for ($p = 1; $p <= $qtdParcelas; $p++) {
                $chave = $dtVenc->format('Y-m');
                if (isset($projecaoPorMes[$chave])) {
                    $projecaoPorMes[$chave]['total_previsto'] += $valorParcela;
                    $projecaoPorMes[$chave]['qtd_parcelas']++;
                    $projecaoPorMes[$chave]['itens'][] = [
                        'item_id'       => $item['id'],
                        'item_nome'     => $item['item'],
                        'missao_titulo' => $item['missao_titulo'],
                        'missao_cor'    => $item['missao_cor'],
                        'categoria'     => $item['categoria'],
                        'numero_parcela'=> $p,
                        'total_parcelas'=> $qtdParcelas,
                        'valor'         => $valorParcela,
                        'data_prevista' => $dtVenc->format('Y-m-d')
                    ];
                }
                $dtVenc->modify('+1 month');
            }
        }

        Response::json([
            'sucesso'  => true,
            'meses'    => array_values($projecaoPorMes),
            'total_meses' => count($projecaoPorMes)
        ]);
    }

    public function store(Request $request): void
    {
        $userId = $this->getUserId();
        $missaoId = (int)$request->input('missao_id', 0);
        $item = trim((string)$request->input('item', ''));
        $categoria = trim((string)$request->input('categoria', 'equipamento'));
        $valorTotal = (float)$request->input('valor_total', 0.0);
        $qtdParcelas = max(1, (int)$request->input('qtd_parcelas', 1));
        $formaPagamento = trim((string)$request->input('forma_pagamento', 'parcelado'));
        $dataVenc = trim((string)$request->input('data_primeiro_vencimento', date('Y-m-d')));
        $periodicidade = trim((string)$request->input('periodicidade', 'mensal'));
        $status = trim((string)$request->input('status', 'planejado'));
        $fornecedor = trim((string)$request->input('fornecedor', '')) ?: null;
        $observacoes = trim((string)$request->input('observacoes', '')) ?: null;

        if ($missaoId <= 0) {
            Response::error('Selecione a missão/plano estratégico vinculado.', 422);
            return;
        }

        if ($item === '') {
            Response::error('O nome ou descrição do item/recurso é obrigatório.', 422);
            return;
        }

        if ($valorTotal <= 0) {
            Response::error('Informe o valor total do item.', 422);
            return;
        }

        // Calcula valor da parcela
        $valorParcela = round($valorTotal / $qtdParcelas, 2);

        $stmt = $this->pdo->prepare("
            INSERT INTO missao_orcamento_itens (
                usuario_id, missao_id, item, categoria, valor_total, qtd_parcelas,
                valor_parcela, forma_pagamento, data_primeiro_vencimento, periodicidade,
                status, fornecedor, observacoes
            ) VALUES (
                :uid, :mid, :item, :cat, :v_total, :qtd_parc,
                :v_parc, :forma, :dt_venc, :period,
                :status, :fornec, :obs
            )
        ");

        $stmt->execute([
            'uid'      => $userId,
            'mid'      => $missaoId,
            'item'     => $item,
            'cat'      => $categoria,
            'v_total'  => $valorTotal,
            'qtd_parc' => $qtdParcelas,
            'v_parc'   => $valorParcela,
            'forma'    => $formaPagamento,
            'dt_venc'  => $dataVenc ?: date('Y-m-d'),
            'period'   => $periodicidade,
            'status'   => $status,
            'fornec'   => $fornecedor,
            'obs'      => $observacoes
        ]);

        Response::success(['id' => (int)$this->pdo->lastInsertId()], 'Item orçado adicionado com sucesso!', 201);
    }

    public function update(Request $request, string $id): void
    {
        $userId = $this->getUserId();
        $itemId = (int)$id;

        $stmtCheck = $this->pdo->prepare("SELECT * FROM missao_orcamento_itens WHERE id = :id AND usuario_id = :uid AND deletado_em IS NULL");
        $stmtCheck->execute(['id' => $itemId, 'uid' => $userId]);
        $existing = $stmtCheck->fetch(PDO::FETCH_ASSOC);

        if (!$existing) {
            Response::error('Item de orçamento não encontrado.', 404);
            return;
        }

        $missaoId = $request->input('missao_id') !== null ? (int)$request->input('missao_id') : (int)$existing['missao_id'];
        $item = $request->input('item') !== null ? trim((string)$request->input('item')) : $existing['item'];
        $categoria = $request->input('categoria') !== null ? trim((string)$request->input('categoria')) : $existing['categoria'];
        $valorTotal = $request->input('valor_total') !== null ? (float)$request->input('valor_total') : (float)$existing['valor_total'];
        $qtdParcelas = $request->input('qtd_parcelas') !== null ? max(1, (int)$request->input('qtd_parcelas')) : (int)$existing['qtd_parcelas'];
        $formaPagamento = $request->input('forma_pagamento') !== null ? trim((string)$request->input('forma_pagamento')) : $existing['forma_pagamento'];
        $dataVenc = $request->input('data_primeiro_vencimento') !== null ? trim((string)$request->input('data_primeiro_vencimento')) : $existing['data_primeiro_vencimento'];
        $periodicidade = $request->input('periodicidade') !== null ? trim((string)$request->input('periodicidade')) : $existing['periodicidade'];
        $status = $request->input('status') !== null ? trim((string)$request->input('status')) : $existing['status'];
        $fornecedor = $request->input('fornecedor') !== null ? (trim((string)$request->input('fornecedor')) ?: null) : $existing['fornecedor'];
        $observacoes = $request->input('observacoes') !== null ? (trim((string)$request->input('observacoes')) ?: null) : $existing['observacoes'];

        $valorParcela = round($valorTotal / $qtdParcelas, 2);

        $stmt = $this->pdo->prepare("
            UPDATE missao_orcamento_itens SET
                missao_id = :mid,
                item = :item,
                categoria = :cat,
                valor_total = :v_total,
                qtd_parcelas = :qtd_parc,
                valor_parcela = :v_parc,
                forma_pagamento = :forma,
                data_primeiro_vencimento = :dt_venc,
                periodicidade = :period,
                status = :status,
                fornecedor = :fornec,
                observacoes = :obs,
                atualizado_em = NOW()
            WHERE id = :id AND usuario_id = :uid
        ");

        $stmt->execute([
            'mid'      => $missaoId,
            'item'     => $item,
            'cat'      => $categoria,
            'v_total'  => $valorTotal,
            'qtd_parc' => $qtdParcelas,
            'v_parc'   => $valorParcela,
            'forma'    => $formaPagamento,
            'dt_venc'  => $dataVenc,
            'period'   => $periodicidade,
            'status'   => $status,
            'fornec'   => $fornecedor,
            'obs'      => $observacoes,
            'id'       => $itemId,
            'uid'      => $userId
        ]);

        Response::success(null, 'Item de orçamento atualizado com sucesso!');
    }

    public function destroy(Request $request, string $id): void
    {
        $userId = $this->getUserId();
        $itemId = (int)$id;

        $stmt = $this->pdo->prepare("UPDATE missao_orcamento_itens SET deletado_em = NOW() WHERE id = :id AND usuario_id = :uid");
        $stmt->execute(['id' => $itemId, 'uid' => $userId]);

        Response::success(null, 'Item de orçamento removido!');
    }

    private function nomeMesAno(string $anoMes): string
    {
        $partes = explode('-', $anoMes);
        if (count($partes) !== 2) return $anoMes;
        $meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        $idx = max(0, min(11, (int)$partes[1] - 1));
        return $meses[$idx] . '/' . $partes[0];
    }
}
