<?php
declare(strict_types=1);

namespace Aires\Controllers;

use Aires\Core\Database;
use Aires\Core\Request;
use Aires\Core\Response;
use PDO;

final class PersonalFinanceController
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getInstance()->getConnection();
        $this->garantirTabelas();
    }

    private function getUserId(): int
    {
        return isset($_SESSION['usuario_id']) ? (int)$_SESSION['usuario_id'] : 1;
    }

    private function garantirTabelas(): void
    {
        try {
            // Configurações do Orçamento Pessoal
            $this->pdo->exec("
                CREATE TABLE IF NOT EXISTS `financas_pessoais_config` (
                    `id` INT AUTO_INCREMENT PRIMARY KEY,
                    `usuario_id` INT NOT NULL UNIQUE,
                    `teto_gastos_mensal` DECIMAL(12,2) NOT NULL DEFAULT 5000.00,
                    `renda_mensal_estimada` DECIMAL(12,2) NOT NULL DEFAULT 6000.00,
                    `alerta_percentual` INT NOT NULL DEFAULT 90,
                    `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX `idx_fpc_usuario` (`usuario_id`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            ");

            // Itens de Finanças Pessoais (Fixos, Parcelas de Metas, etc.)
            $this->pdo->exec("
                CREATE TABLE IF NOT EXISTS `financas_pessoais_itens` (
                    `id` INT AUTO_INCREMENT PRIMARY KEY,
                    `usuario_id` INT NOT NULL,
                    `nome` VARCHAR(255) NOT NULL,
                    `categoria` VARCHAR(50) NOT NULL DEFAULT 'outros',
                    `tipo` ENUM('fixo_mensal', 'parcelado', 'avulso') NOT NULL DEFAULT 'fixo_mensal',
                    `valor_total` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
                    `qtd_parcelas` INT NOT NULL DEFAULT 1,
                    `valor_parcela` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
                    `parcelas_pagas` INT NOT NULL DEFAULT 0,
                    `data_primeiro_vencimento` DATE NOT NULL,
                    `dia_vencimento_fixo` INT NOT NULL DEFAULT 10,
                    `forma_pagamento` VARCHAR(50) NOT NULL DEFAULT 'boleto',
                    `status` ENUM('ativo', 'planejado', 'pausado', 'quitado', 'cancelado') NOT NULL DEFAULT 'ativo',
                    `meta_relacionada` VARCHAR(255) NULL,
                    `observacoes` TEXT NULL,
                    `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    `deletado_em` TIMESTAMP NULL DEFAULT NULL,
                    INDEX `idx_fpi_usuario_status` (`usuario_id`, `status`),
                    INDEX `idx_fpi_tipo` (`tipo`),
                    INDEX `idx_fpi_vencimento` (`data_primeiro_vencimento`),
                    INDEX `idx_fpi_deletado` (`deletado_em`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            ");
        } catch (\Throwable $e) {
            // Silencia caso a tabela já exista
        }
    }

    private function obterConfig(int $userId): array
    {
        $stmt = $this->pdo->prepare("SELECT * FROM financas_pessoais_config WHERE usuario_id = :uid LIMIT 1");
        $stmt->execute(['uid' => $userId]);
        $config = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$config) {
            $stmtInsert = $this->pdo->prepare("
                INSERT INTO financas_pessoais_config (usuario_id, teto_gastos_mensal, renda_mensal_estimada, alerta_percentual)
                VALUES (:uid, 5000.00, 6000.00, 90)
            ");
            $stmtInsert->execute(['uid' => $userId]);

            return [
                'usuario_id'            => $userId,
                'teto_gastos_mensal'    => 5000.00,
                'renda_mensal_estimada' => 6000.00,
                'alerta_percentual'     => 90
            ];
        }

        return [
            'usuario_id'            => $userId,
            'teto_gastos_mensal'    => (float)$config['teto_gastos_mensal'],
            'renda_mensal_estimada' => (float)$config['renda_mensal_estimada'],
            'alerta_percentual'     => (int)$config['alerta_percentual']
        ];
    }

    public function getConfig(Request $request): void
    {
        $userId = $this->getUserId();
        $config = $this->obterConfig($userId);
        Response::json(['sucesso' => true, 'config' => $config]);
    }

    public function saveConfig(Request $request): void
    {
        $userId = $this->getUserId();
        $teto = (float)$request->input('teto_gastos_mensal', 5000.00);
        $renda = (float)$request->input('renda_mensal_estimada', 6000.00);
        $alerta = max(50, min(100, (int)$request->input('alerta_percentual', 90)));

        if ($teto <= 0) {
            Response::error('O teto mensal de gastos deve ser maior que zero.', 422);
            return;
        }

        $stmt = $this->pdo->prepare("
            INSERT INTO financas_pessoais_config (usuario_id, teto_gastos_mensal, renda_mensal_estimada, alerta_percentual)
            VALUES (:uid, :teto, :renda, :alerta)
            ON DUPLICATE KEY UPDATE
                teto_gastos_mensal = VALUES(teto_gastos_mensal),
                renda_mensal_estimada = VALUES(renda_mensal_estimada),
                alerta_percentual = VALUES(alerta_percentual)
        ");
        $stmt->execute([
            'uid'    => $userId,
            'teto'   => $teto,
            'renda'  => $renda,
            'alerta' => $alerta
        ]);

        Response::json([
            'sucesso'  => true,
            'mensagem' => 'Configuração de orçamento pessoal salva com sucesso!',
            'config'   => [
                'usuario_id'            => $userId,
                'teto_gastos_mensal'    => $teto,
                'renda_mensal_estimada' => $renda,
                'alerta_percentual'     => $alerta
            ]
        ]);
    }

    public function index(Request $request): void
    {
        $userId = $this->getUserId();
        $tipo = trim((string)$request->get('tipo', ''));
        $status = trim((string)$request->get('status', ''));
        $categoria = trim((string)$request->get('categoria', ''));
        $busca = trim((string)$request->get('busca', ''));

        $sql = "
            SELECT *
            FROM financas_pessoais_itens
            WHERE usuario_id = :uid AND deletado_em IS NULL
        ";
        $params = ['uid' => $userId];

        if ($tipo !== '' && in_array($tipo, ['fixo_mensal', 'parcelado', 'avulso'], true)) {
            $sql .= " AND tipo = :tipo";
            $params['tipo'] = $tipo;
        }

        if ($status !== '' && in_array($status, ['ativo', 'planejado', 'pausado', 'quitado', 'cancelado'], true)) {
            $sql .= " AND status = :status";
            $params['status'] = $status;
        }

        if ($categoria !== '') {
            $sql .= " AND categoria = :categoria";
            $params['categoria'] = $categoria;
        }

        if ($busca !== '') {
            $sql .= " AND (nome LIKE :busca OR meta_relacionada LIKE :busca OR observacoes LIKE :busca)";
            $params['busca'] = "%{$busca}%";
        }

        $sql .= " ORDER BY CASE tipo WHEN 'fixo_mensal' THEN 1 WHEN 'parcelado' THEN 2 ELSE 3 END, data_primeiro_vencimento ASC, id DESC";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        $itens = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Formatação dos itens
        $formatados = array_map(function ($it) {
            $qtdParc = max(1, (int)$it['qtd_parcelas']);
            $pagas = (int)$it['parcelas_pagas'];
            $restantes = max(0, $qtdParc - $pagas);
            $valorParc = (float)$it['valor_parcela'];
            $valorTotal = (float)$it['valor_total'];

            if ($it['tipo'] === 'fixo_mensal') {
                $saldoDevedor = $valorTotal;
            } else {
                $saldoDevedor = round($valorParc * $restantes, 2);
            }

            return [
                'id'                       => (int)$it['id'],
                'nome'                     => $it['nome'],
                'categoria'                => $it['categoria'],
                'tipo'                     => $it['tipo'],
                'valor_total'              => $valorTotal,
                'qtd_parcelas'             => $qtdParc,
                'valor_parcela'            => $valorParc,
                'parcelas_pagas'           => $pagas,
                'parcelas_restantes'       => $restantes,
                'saldo_devedor_restante'   => $saldoDevedor,
                'data_primeiro_vencimento' => $it['data_primeiro_vencimento'],
                'dia_vencimento_fixo'      => (int)$it['dia_vencimento_fixo'],
                'forma_pagamento'          => $it['forma_pagamento'],
                'status'                   => $it['status'],
                'meta_relacionada'         => $it['meta_relacionada'],
                'observacoes'              => $it['observacoes'],
                'criado_em'                => $it['criado_em']
            ];
        }, $itens);

        Response::json([
            'sucesso' => true,
            'total'   => count($formatados),
            'itens'   => $formatados
        ]);
    }

    public function resumo(Request $request): void
    {
        $userId = $this->getUserId();
        $config = $this->obterConfig($userId);
        $teto = $config['teto_gastos_mensal'];
        $renda = $config['renda_mensal_estimada'];

        $mesAtual = date('Y-m');

        // Itens ativos
        $stmt = $this->pdo->prepare("
            SELECT *
            FROM financas_pessoais_itens
            WHERE usuario_id = :uid AND deletado_em IS NULL
              AND status IN ('ativo', 'planejado')
        ");
        $stmt->execute(['uid' => $userId]);
        $itens = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $totalFixos = 0.0;
        $totalParcelasMes = 0.0;
        $totalDividaParceladaRestante = 0.0;
        $qtdMetasAtivas = 0;
        $itensMesAtual = [];

        foreach ($itens as $it) {
            $tipo = $it['tipo'];
            $vTotal = (float)$it['valor_total'];
            $qtdParc = max(1, (int)$it['qtd_parcelas']);
            $vParc = (float)$it['valor_parcela'];
            if ($vParc <= 0 && $qtdParc > 0) {
                $vParc = round($vTotal / $qtdParc, 2);
            }
            $pagas = (int)$it['parcelas_pagas'];
            $restantes = max(0, $qtdParc - $pagas);

            if ($tipo === 'fixo_mensal') {
                $totalFixos += $vTotal;
                $itensMesAtual[] = [
                    'id'            => (int)$it['id'],
                    'nome'          => $it['nome'],
                    'tipo'          => 'fixo_mensal',
                    'categoria'     => $it['categoria'],
                    'valor'         => $vTotal,
                    'info_parcela'  => 'Recorrente mensal'
                ];
            } elseif ($tipo === 'parcelado') {
                $qtdMetasAtivas++;
                $totalDividaParceladaRestante += ($vParc * $restantes);

                // Verifica se cai no mês atual
                try {
                    $dtVenc = new \DateTime($it['data_primeiro_vencimento']);
                } catch (\Throwable $e) {
                    $dtVenc = new \DateTime();
                }

                for ($p = 1; $p <= $qtdParc; $p++) {
                    if ($dtVenc->format('Y-m') === $mesAtual) {
                        $totalParcelasMes += $vParc;
                        $itensMesAtual[] = [
                            'id'           => (int)$it['id'],
                            'nome'         => $it['nome'],
                            'tipo'         => 'parcelado',
                            'categoria'    => $it['categoria'],
                            'valor'        => $vParc,
                            'info_parcela' => "Parcela {$p} de {$qtdParc}"
                        ];
                        break;
                    }
                    $dtVenc->modify('+1 month');
                }
            } elseif ($tipo === 'avulso') {
                try {
                    $dtVenc = new \DateTime($it['data_primeiro_vencimento']);
                } catch (\Throwable $e) {
                    $dtVenc = new \DateTime();
                }
                if ($dtVenc->format('Y-m') === $mesAtual) {
                    $totalParcelasMes += $vTotal;
                    $itensMesAtual[] = [
                        'id'           => (int)$it['id'],
                        'nome'         => $it['nome'],
                        'tipo'         => 'avulso',
                        'categoria'    => $it['categoria'],
                        'valor'        => $vTotal,
                        'info_parcela' => 'Gasto único deste mês'
                    ];
                }
            }
        }

        $totalComprometido = $totalFixos + $totalParcelasMes;
        $saldoLivre = $teto - $totalComprometido;
        $extrapolou = $totalComprometido > $teto;
        $valorExtrapolado = $extrapolou ? round($totalComprometido - $teto, 2) : 0.0;
        $percentualComprometido = $teto > 0 ? round(($totalComprometido / $teto) * 100, 1) : 0.0;

        // Projeção rápida de 12 meses para encontrar meses futuros que extrapolam
        $mesesExtrapolados = $this->calcularMesesExtrapolados($userId, $teto, $itens);

        Response::json([
            'sucesso' => true,
            'config'  => $config,
            'kpis'    => [
                'teto_mensal'                     => $teto,
                'renda_mensal'                    => $renda,
                'total_fixos_mensais'             => round($totalFixos, 2),
                'total_parcelas_mes_atual'        => round($totalParcelasMes, 2),
                'total_comprometido_mes_atual'    => round($totalComprometido, 2),
                'saldo_livre_mes_atual'           => round($saldoLivre, 2),
                'percentual_comprometido'         => $percentualComprometido,
                'extrapolou'                      => $extrapolou,
                'valor_extrapolado'               => $valorExtrapolado,
                'total_divida_parcelada_restante' => round($totalDividaParceladaRestante, 2),
                'qtd_metas_ativas'                => $qtdMetasAtivas,
                'total_itens'                     => count($itens),
                'meses_alerta_futuros'            => count($mesesExtrapolados)
            ],
            'alertas' => [
                'extrapolou_mes_atual' => $extrapolou,
                'valor_extrapolado'    => $valorExtrapolado,
                'meses_extrapolados'   => $mesesExtrapolados
            ],
            'itens_mes_atual' => $itensMesAtual
        ]);
    }

    private function calcularMesesExtrapolados(int $userId, float $teto, array $itens): array
    {
        $mesesExtrapolados = [];
        $dataCursor = new \DateTime('first day of this month');

        for ($i = 0; $i < 12; $i++) {
            $chaveMes = $dataCursor->format('Y-m');
            $totalMes = 0.0;

            foreach ($itens as $it) {
                $tipo = $it['tipo'];
                $vTotal = (float)$it['valor_total'];
                $qtdParc = max(1, (int)$it['qtd_parcelas']);
                $vParc = (float)$it['valor_parcela'] > 0 ? (float)$it['valor_parcela'] : round($vTotal / $qtdParc, 2);

                if ($tipo === 'fixo_mensal') {
                    $totalMes += $vTotal;
                } elseif ($tipo === 'parcelado') {
                    try {
                        $dtVenc = new \DateTime($it['data_primeiro_vencimento']);
                    } catch (\Throwable $e) {
                        $dtVenc = new \DateTime();
                    }
                    for ($p = 1; $p <= $qtdParc; $p++) {
                        if ($dtVenc->format('Y-m') === $chaveMes) {
                            $totalMes += $vParc;
                            break;
                        }
                        $dtVenc->modify('+1 month');
                    }
                } elseif ($tipo === 'avulso') {
                    try {
                        $dtVenc = new \DateTime($it['data_primeiro_vencimento']);
                    } catch (\Throwable $e) {
                        $dtVenc = new \DateTime();
                    }
                    if ($dtVenc->format('Y-m') === $chaveMes) {
                        $totalMes += $vTotal;
                    }
                }
            }

            if ($totalMes > $teto) {
                $mesesExtrapolados[] = [
                    'mes'              => $chaveMes,
                    'mes_nome'         => $this->nomeMesAno($chaveMes),
                    'total_previsto'   => round($totalMes, 2),
                    'teto'             => $teto,
                    'excedente'        => round($totalMes - $teto, 2),
                    'percentual'       => $teto > 0 ? round(($totalMes / $teto) * 100, 1) : 0
                ];
            }

            $dataCursor->modify('+1 month');
        }

        return $mesesExtrapolados;
    }

    public function projecao(Request $request): void
    {
        $userId = $this->getUserId();
        $config = $this->obterConfig($userId);
        $teto = $config['teto_gastos_mensal'];
        $mesesFrente = max(6, min(24, (int)$request->get('meses', 12)));

        $stmt = $this->pdo->prepare("
            SELECT *
            FROM financas_pessoais_itens
            WHERE usuario_id = :uid AND deletado_em IS NULL
              AND status IN ('ativo', 'planejado')
        ");
        $stmt->execute(['uid' => $userId]);
        $itens = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $projecaoPorMes = [];
        $dataCursor = new \DateTime('first day of this month');

        for ($i = 0; $i < $mesesFrente; $i++) {
            $chaveMes = $dataCursor->format('Y-m');
            $projecaoPorMes[$chaveMes] = [
                'mes'               => $chaveMes,
                'mes_nome'          => $this->nomeMesAno($chaveMes),
                'teto'              => $teto,
                'total_fixos'       => 0.0,
                'total_parcelas'    => 0.0,
                'total_previsto'    => 0.0,
                'saldo_livre'       => $teto,
                'extrapolou'        => false,
                'valor_extrapolado' => 0.0,
                'percentual_teto'   => 0.0,
                'qtd_itens'         => 0,
                'itens'             => []
            ];
            $dataCursor->modify('+1 month');
        }

        foreach ($itens as $it) {
            $tipo = $it['tipo'];
            $vTotal = (float)$it['valor_total'];
            $qtdParc = max(1, (int)$it['qtd_parcelas']);
            $vParc = (float)$it['valor_parcela'] > 0 ? (float)$it['valor_parcela'] : round($vTotal / $qtdParc, 2);

            if ($tipo === 'fixo_mensal') {
                foreach ($projecaoPorMes as $k => &$mRef) {
                    $mRef['total_fixos'] += $vTotal;
                    $mRef['total_previsto'] += $vTotal;
                    $mRef['qtd_itens']++;
                    $mRef['itens'][] = [
                        'item_id'        => (int)$it['id'],
                        'nome'           => $it['nome'],
                        'tipo'           => 'fixo_mensal',
                        'categoria'      => $it['categoria'],
                        'valor'          => $vTotal,
                        'numero_parcela' => null,
                        'total_parcelas' => null,
                        'meta'           => $it['meta_relacionada']
                    ];
                }
                unset($mRef);
            } elseif ($tipo === 'parcelado') {
                try {
                    $dtVenc = new \DateTime($it['data_primeiro_vencimento']);
                } catch (\Throwable $e) {
                    $dtVenc = new \DateTime();
                }

                for ($p = 1; $p <= $qtdParc; $p++) {
                    $chave = $dtVenc->format('Y-m');
                    if (isset($projecaoPorMes[$chave])) {
                        $projecaoPorMes[$chave]['total_parcelas'] += $vParc;
                        $projecaoPorMes[$chave]['total_previsto'] += $vParc;
                        $projecaoPorMes[$chave]['qtd_itens']++;
                        $projecaoPorMes[$chave]['itens'][] = [
                            'item_id'        => (int)$it['id'],
                            'nome'           => $it['nome'],
                            'tipo'           => 'parcelado',
                            'categoria'      => $it['categoria'],
                            'valor'          => $vParc,
                            'numero_parcela' => $p,
                            'total_parcelas' => $qtdParc,
                            'meta'           => $it['meta_relacionada']
                        ];
                    }
                    $dtVenc->modify('+1 month');
                }
            } elseif ($tipo === 'avulso') {
                try {
                    $dtVenc = new \DateTime($it['data_primeiro_vencimento']);
                } catch (\Throwable $e) {
                    $dtVenc = new \DateTime();
                }
                $chave = $dtVenc->format('Y-m');
                if (isset($projecaoPorMes[$chave])) {
                    $projecaoPorMes[$chave]['total_parcelas'] += $vTotal;
                    $projecaoPorMes[$chave]['total_previsto'] += $vTotal;
                    $projecaoPorMes[$chave]['qtd_itens']++;
                    $projecaoPorMes[$chave]['itens'][] = [
                        'item_id'        => (int)$it['id'],
                        'nome'           => $it['nome'],
                        'tipo'           => 'avulso',
                        'categoria'      => $it['categoria'],
                        'valor'          => $vTotal,
                        'numero_parcela' => 1,
                        'total_parcelas' => 1,
                        'meta'           => $it['meta_relacionada']
                    ];
                }
            }
        }

        // Consolida saldos e alertas
        $mesesAlerta = [];
        foreach ($projecaoPorMes as &$mes) {
            $previsto = round($mes['total_previsto'], 2);
            $mes['total_previsto'] = $previsto;
            $mes['total_fixos'] = round($mes['total_fixos'], 2);
            $mes['total_parcelas'] = round($mes['total_parcelas'], 2);
            $mes['saldo_livre'] = round($teto - $previsto, 2);
            $mes['extrapolou'] = $previsto > $teto;
            $mes['valor_extrapolado'] = $mes['extrapolou'] ? round($previsto - $teto, 2) : 0.0;
            $mes['percentual_teto'] = $teto > 0 ? round(($previsto / $teto) * 100, 1) : 0;

            if ($mes['extrapolou']) {
                $mesesAlerta[] = [
                    'mes'       => $mes['mes'],
                    'mes_nome'  => $mes['mes_nome'],
                    'excesso'   => $mes['valor_extrapolado'],
                    'total'     => $mes['total_previsto']
                ];
            }
        }
        unset($mes);

        Response::json([
            'sucesso'       => true,
            'teto'          => $teto,
            'total_meses'   => count($projecaoPorMes),
            'meses_alerta'  => $mesesAlerta,
            'meses'         => array_values($projecaoPorMes)
        ]);
    }

    public function simular(Request $request): void
    {
        $userId = $this->getUserId();
        $config = $this->obterConfig($userId);
        $teto = $config['teto_gastos_mensal'];

        $nomeItem = trim((string)$request->input('nome', 'Item Simulado'));
        $valorTotal = (float)$request->input('valor_total', 0.0);
        $qtdParcelas = max(1, (int)$request->input('qtd_parcelas', 1));
        $dataPrimeiroVenc = trim((string)$request->input('data_primeiro_vencimento', date('Y-m-d')));

        if ($valorTotal <= 0) {
            Response::error('Informe um valor válido para a simulação.', 422);
            return;
        }

        $valorParcela = round($valorTotal / $qtdParcelas, 2);

        // Obter itens atuais
        $stmt = $this->pdo->prepare("
            SELECT *
            FROM financas_pessoais_itens
            WHERE usuario_id = :uid AND deletado_em IS NULL
              AND status IN ('ativo', 'planejado')
        ");
        $stmt->execute(['uid' => $userId]);
        $itensAtuais = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $projecaoSimulada = [];
        $dataCursor = new \DateTime('first day of this month');

        for ($i = 0; $i < 12; $i++) {
            $chaveMes = $dataCursor->format('Y-m');
            $projecaoSimulada[$chaveMes] = [
                'mes'               => $chaveMes,
                'mes_nome'          => $this->nomeMesAno($chaveMes),
                'total_atual'       => 0.0,
                'adicional_item'    => 0.0,
                'total_novo'        => 0.0,
                'teto'              => $teto,
                'saldo_livre_novo'  => $teto,
                'extrapolou_antes'  => false,
                'extrapolou_depois' => false,
                'diferenca_excesso' => 0.0
            ];
            $dataCursor->modify('+1 month');
        }

        // Calcula carga atual
        foreach ($itensAtuais as $it) {
            $tipo = $it['tipo'];
            $vTot = (float)$it['valor_total'];
            $qtd = max(1, (int)$it['qtd_parcelas']);
            $vP = (float)$it['valor_parcela'] > 0 ? (float)$it['valor_parcela'] : round($vTot / $qtd, 2);

            if ($tipo === 'fixo_mensal') {
                foreach ($projecaoSimulada as &$m) {
                    $m['total_atual'] += $vTot;
                }
                unset($m);
            } elseif ($tipo === 'parcelado') {
                try {
                    $dt = new \DateTime($it['data_primeiro_vencimento']);
                } catch (\Throwable $e) {
                    $dt = new \DateTime();
                }
                for ($p = 1; $p <= $qtd; $p++) {
                    $k = $dt->format('Y-m');
                    if (isset($projecaoSimulada[$k])) {
                        $projecaoSimulada[$k]['total_atual'] += $vP;
                    }
                    $dt->modify('+1 month');
                }
            } elseif ($tipo === 'avulso') {
                try {
                    $dt = new \DateTime($it['data_primeiro_vencimento']);
                } catch (\Throwable $e) {
                    $dt = new \DateTime();
                }
                $k = $dt->format('Y-m');
                if (isset($projecaoSimulada[$k])) {
                    $projecaoSimulada[$k]['total_atual'] += $vTot;
                }
            }
        }

        // Aplica o item simulado
        try {
            $dtSim = new \DateTime($dataPrimeiroVenc);
        } catch (\Throwable $e) {
            $dtSim = new \DateTime();
        }

        for ($p = 1; $p <= $qtdParcelas; $p++) {
            $k = $dtSim->format('Y-m');
            if (isset($projecaoSimulada[$k])) {
                $projecaoSimulada[$k]['adicional_item'] += $valorParcela;
            }
            $dtSim->modify('+1 month');
        }

        $mesesExtrapoladosNovo = [];
        $maiorTotalNovo = 0.0;

        foreach ($projecaoSimulada as &$m) {
            $totalNovo = round($m['total_atual'] + $m['adicional_item'], 2);
            $m['total_atual'] = round($m['total_atual'], 2);
            $m['total_novo'] = $totalNovo;
            $m['saldo_livre_novo'] = round($teto - $totalNovo, 2);
            $m['extrapolou_antes'] = $m['total_atual'] > $teto;
            $m['extrapolou_depois'] = $totalNovo > $teto;

            if ($m['extrapolou_depois']) {
                $excesso = round($totalNovo - $teto, 2);
                $m['diferenca_excesso'] = $excesso;
                $mesesExtrapoladosNovo[] = [
                    'mes'            => $m['mes'],
                    'mes_nome'       => $m['mes_nome'],
                    'total_com_item' => $totalNovo,
                    'teto'           => $teto,
                    'excesso'        => $excesso,
                    'novo_estouro'   => !$m['extrapolou_antes']
                ];
            }

            if ($totalNovo > $maiorTotalNovo) {
                $maiorTotalNovo = $totalNovo;
            }
        }
        unset($m);

        $aprovado = count($mesesExtrapoladosNovo) === 0;

        if ($aprovado) {
            $veredito = "✅ Compra Aprovada! Seu orçamento comporta tranquilamente as {$qtdParcelas}x de R$ " . number_format($valorParcela, 2, ',', '.') . " sem estourar o teto em nenhum mês.";
        } else {
            $qtdMeses = count($mesesExtrapoladosNovo);
            $primeiroMes = $mesesExtrapoladosNovo[0]['mes_nome'];
            $maiorExcesso = max(array_column($mesesExtrapoladosNovo, 'excesso'));
            $veredito = "⚠️ Alerta de Extrapolação: Comprar '{$nomeItem}' em {$qtdParcelas}x de R$ " . number_format($valorParcela, 2, ',', '.') . " fará você ultrapassar o teto mensal em {$qtdMeses} mês(es), iniciando em {$primeiroMes} com excesso de até R$ " . number_format($maiorExcesso, 2, ',', '.') . "!";
        }

        Response::json([
            'sucesso'                => true,
            'aprovado'               => $aprovado,
            'veredito'               => $veredito,
            'valor_total'            => $valorTotal,
            'qtd_parcelas'           => $qtdParcelas,
            'valor_parcela'          => $valorParcela,
            'teto_mensal'            => $teto,
            'maior_total_projetado'  => $maiorTotalNovo,
            'meses_com_extrapolacao' => $mesesExtrapoladosNovo,
            'cronograma_12m'         => array_values($projecaoSimulada)
        ]);
    }

    public function store(Request $request): void
    {
        $userId = $this->getUserId();
        $nome = trim((string)$request->input('nome', ''));
        $categoria = trim((string)$request->input('categoria', 'outros'));
        $tipo = trim((string)$request->input('tipo', 'fixo_mensal'));
        $valorTotal = (float)$request->input('valor_total', 0.0);
        $qtdParcelas = max(1, (int)$request->input('qtd_parcelas', 1));
        $formaPagamento = trim((string)$request->input('forma_pagamento', 'boleto'));
        $dataVenc = trim((string)$request->input('data_primeiro_vencimento', date('Y-m-d')));
        $diaFixo = max(1, min(31, (int)$request->input('dia_vencimento_fixo', 10)));
        $status = trim((string)$request->input('status', 'ativo'));
        $meta = trim((string)$request->input('meta_relacionada', '')) ?: null;
        $obs = trim((string)$request->input('observacoes', '')) ?: null;

        if ($nome === '') {
            Response::error('O nome do item/despesa é obrigatório (ex: Geladeira Frost Free, Aluguel).', 422);
            return;
        }

        if ($valorTotal <= 0) {
            Response::error('Informe um valor válido.', 422);
            return;
        }

        if (!in_array($tipo, ['fixo_mensal', 'parcelado', 'avulso'], true)) {
            $tipo = 'fixo_mensal';
        }

        if ($tipo === 'fixo_mensal') {
            $qtdParcelas = 1;
            $valorParcela = $valorTotal;
        } else {
            $valorParcela = round($valorTotal / $qtdParcelas, 2);
        }

        $stmt = $this->pdo->prepare("
            INSERT INTO financas_pessoais_itens (
                usuario_id, nome, categoria, tipo, valor_total, qtd_parcelas,
                valor_parcela, parcelas_pagas, data_primeiro_vencimento,
                dia_vencimento_fixo, forma_pagamento, status, meta_relacionada, observacoes
            ) VALUES (
                :uid, :nome, :cat, :tipo, :tot, :qtd_p,
                :v_p, 0, :dt_venc,
                :dia_fixo, :forma, :status, :meta, :obs
            )
        ");

        $stmt->execute([
            'uid'      => $userId,
            'nome'     => $nome,
            'cat'      => $categoria,
            'tipo'     => $tipo,
            'tot'      => $valorTotal,
            'qtd_p'    => $qtdParcelas,
            'v_p'      => $valorParcela,
            'dt_venc'  => $dataVenc,
            'dia_fixo' => $diaFixo,
            'forma'    => $formaPagamento,
            'status'   => $status,
            'meta'     => $meta,
            'obs'      => $obs
        ]);

        $itemId = (int)$this->pdo->lastInsertId();

        Response::json([
            'sucesso'  => true,
            'mensagem' => 'Item adicionado ao planejamento pessoal com sucesso!',
            'item_id'  => $itemId
        ], 201);
    }

    public function update(Request $request, array $params): void
    {
        $userId = $this->getUserId();
        $id = (int)($params['id'] ?? 0);

        if ($id <= 0) {
            Response::error('Item inválido.', 400);
            return;
        }

        $stmtCheck = $this->pdo->prepare("SELECT id FROM financas_pessoais_itens WHERE id = :id AND usuario_id = :uid AND deletado_em IS NULL");
        $stmtCheck->execute(['id' => $id, 'uid' => $userId]);
        if (!$stmtCheck->fetch()) {
            Response::error('Item não encontrado ou já excluído.', 404);
            return;
        }

        $nome = trim((string)$request->input('nome', ''));
        $categoria = trim((string)$request->input('categoria', 'outros'));
        $tipo = trim((string)$request->input('tipo', 'fixo_mensal'));
        $valorTotal = (float)$request->input('valor_total', 0.0);
        $qtdParcelas = max(1, (int)$request->input('qtd_parcelas', 1));
        $parcelasPagas = max(0, (int)$request->input('parcelas_pagas', 0));
        $formaPagamento = trim((string)$request->input('forma_pagamento', 'boleto'));
        $dataVenc = trim((string)$request->input('data_primeiro_vencimento', date('Y-m-d')));
        $diaFixo = max(1, min(31, (int)$request->input('dia_vencimento_fixo', 10)));
        $status = trim((string)$request->input('status', 'ativo'));
        $meta = trim((string)$request->input('meta_relacionada', '')) ?: null;
        $obs = trim((string)$request->input('observacoes', '')) ?: null;

        if ($nome === '') {
            Response::error('O nome do item é obrigatório.', 422);
            return;
        }

        if ($valorTotal <= 0) {
            Response::error('Informe um valor válido.', 422);
            return;
        }

        if ($tipo === 'fixo_mensal') {
            $qtdParcelas = 1;
            $valorParcela = $valorTotal;
        } else {
            $valorParcela = round($valorTotal / $qtdParcelas, 2);
        }

        if ($parcelasPagas >= $qtdParcelas && $tipo === 'parcelado') {
            $status = 'quitado';
        }

        $stmt = $this->pdo->prepare("
            UPDATE financas_pessoais_itens SET
                nome = :nome,
                categoria = :cat,
                tipo = :tipo,
                valor_total = :tot,
                qtd_parcelas = :qtd_p,
                valor_parcela = :v_p,
                parcelas_pagas = :pagas,
                data_primeiro_vencimento = :dt_venc,
                dia_vencimento_fixo = :dia_fixo,
                forma_pagamento = :forma,
                status = :status,
                meta_relacionada = :meta,
                observacoes = :obs
            WHERE id = :id AND usuario_id = :uid
        ");

        $stmt->execute([
            'id'       => $id,
            'uid'      => $userId,
            'nome'     => $nome,
            'cat'      => $categoria,
            'tipo'     => $tipo,
            'tot'      => $valorTotal,
            'qtd_p'    => $qtdParcelas,
            'v_p'      => $valorParcela,
            'pagas'    => $parcelasPagas,
            'dt_venc'  => $dataVenc,
            'dia_fixo' => $diaFixo,
            'forma'    => $formaPagamento,
            'status'   => $status,
            'meta'     => $meta,
            'obs'      => $obs
        ]);

        Response::json([
            'sucesso'  => true,
            'mensagem' => 'Item atualizado com sucesso!'
        ]);
    }

    public function pagarParcela(Request $request, array $params): void
    {
        $userId = $this->getUserId();
        $id = (int)($params['id'] ?? 0);

        $stmt = $this->pdo->prepare("
            SELECT id, tipo, qtd_parcelas, parcelas_pagas
            FROM financas_pessoais_itens
            WHERE id = :id AND usuario_id = :uid AND deletado_em IS NULL
        ");
        $stmt->execute(['id' => $id, 'uid' => $userId]);
        $item = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$item) {
            Response::error('Item não encontrado.', 404);
            return;
        }

        $qtd = (int)$item['qtd_parcelas'];
        $pagas = (int)$item['parcelas_pagas'] + 1;
        $status = $pagas >= $qtd ? 'quitado' : 'ativo';

        $stmtUp = $this->pdo->prepare("
            UPDATE financas_pessoais_itens
            SET parcelas_pagas = :pagas, status = :status
            WHERE id = :id AND usuario_id = :uid
        ");
        $stmtUp->execute([
            'pagas'  => $pagas,
            'status' => $status,
            'id'     => $id,
            'uid'    => $userId
        ]);

        Response::json([
            'sucesso'            => true,
            'mensagem'           => $status === 'quitado' ? 'Item 100% quitado com sucesso!' : "Parcela {$pagas}/{$qtd} registrada com sucesso!",
            'parcelas_pagas'     => $pagas,
            'parcelas_restantes' => max(0, $qtd - $pagas),
            'status'             => $status
        ]);
    }

    public function destroy(Request $request, array $params): void
    {
        $userId = $this->getUserId();
        $id = (int)($params['id'] ?? 0);

        if ($id <= 0) {
            Response::error('Item inválido.', 400);
            return;
        }

        $stmt = $this->pdo->prepare("
            UPDATE financas_pessoais_itens
            SET deletado_em = CURRENT_TIMESTAMP
            WHERE id = :id AND usuario_id = :uid AND deletado_em IS NULL
        ");
        $stmt->execute(['id' => $id, 'uid' => $userId]);

        if ($stmt->rowCount() === 0) {
            Response::error('Item não encontrado ou já removido.', 404);
            return;
        }

        Response::json([
            'sucesso'  => true,
            'mensagem' => 'Item removido do planejamento pessoal.'
        ]);
    }

    private function nomeMesAno(string $chaveYm): string
    {
        $partes = explode('-', $chaveYm);
        if (count($partes) !== 2) {
            return $chaveYm;
        }
        $meses = [
            '01' => 'Jan', '02' => 'Fev', '03' => 'Mar', '04' => 'Abr',
            '05' => 'Mai', '06' => 'Jun', '07' => 'Jul', '08' => 'Ago',
            '09' => 'Set', '10' => 'Out', '11' => 'Nov', '12' => 'Dez'
        ];
        $idx = $partes[1];
        return ($meses[$idx] ?? $idx) . '/' . $partes[0];
    }
}
