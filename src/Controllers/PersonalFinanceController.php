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

            // Investimentos, Reservas e Economias Acumuladas
            $this->pdo->exec("
                CREATE TABLE IF NOT EXISTS `financas_investimentos` (
                    `id` INT AUTO_INCREMENT PRIMARY KEY,
                    `usuario_id` INT NOT NULL,
                    `nome` VARCHAR(255) NOT NULL,
                    `tipo` ENUM('reserva_emergencia', 'renda_fixa', 'fundos_imobiliarios', 'acoes', 'cripto', 'previdencia', 'outro') NOT NULL DEFAULT 'renda_fixa',
                    `instituicao` VARCHAR(100) NULL,
                    `valor_atual` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
                    `valor_aplicado` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
                    `aporte_mensal` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
                    `meta_valor` DECIMAL(12,2) NULL,
                    `rentabilidade_anual` DECIMAL(6,2) NOT NULL DEFAULT 10.00,
                    `liquidez` VARCHAR(50) NOT NULL DEFAULT 'diaria',
                    `data_inicio` DATE NOT NULL,
                    `status` ENUM('ativo', 'resgatado', 'pausado') NOT NULL DEFAULT 'ativo',
                    `observacoes` TEXT NULL,
                    `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    `deletado_em` TIMESTAMP NULL DEFAULT NULL,
                    INDEX `idx_finv_usuario_status` (`usuario_id`, `status`),
                    INDEX `idx_finv_tipo` (`tipo`),
                    INDEX `idx_finv_deletado` (`deletado_em`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            ");

            // Histórico de Aportes, Rendimentos e Resgates
            $this->pdo->exec("
                CREATE TABLE IF NOT EXISTS `financas_investimentos_movimentacoes` (
                    `id` INT AUTO_INCREMENT PRIMARY KEY,
                    `investimento_id` INT NOT NULL,
                    `usuario_id` INT NOT NULL,
                    `tipo` ENUM('aporte', 'rendimento', 'resgate') NOT NULL DEFAULT 'aporte',
                    `valor` DECIMAL(12,2) NOT NULL,
                    `data_movimentacao` DATE NOT NULL,
                    `observacoes` VARCHAR(255) NULL,
                    `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX `idx_fim_inv` (`investimento_id`),
                    INDEX `idx_fim_user` (`usuario_id`, `data_movimentacao`)
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

        // Total de patrimônio acumulado em investimentos para o card de resumo
        $stmtPatrimonio = $this->pdo->prepare("
            SELECT COALESCE(SUM(valor_atual), 0) AS patrimonio_total
            FROM financas_investimentos
            WHERE usuario_id = :uid AND deletado_em IS NULL AND status = 'ativo'
        ");
        $stmtPatrimonio->execute(['uid' => $userId]);
        $patrimonioTotal = (float)$stmtPatrimonio->fetchColumn();

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
                'meses_alerta_futuros'            => count($mesesExtrapolados),
                'patrimonio_investido_total'      => round($patrimonioTotal, 2)
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


    public function dashboard(Request $request): void
    {
        $userId = $this->getUserId();
        $config = $this->obterConfig($userId);
        $teto = (float)$config['teto_gastos_mensal'];
        $renda = (float)$config['renda_mensal_estimada'];

        // 1. Despesas e compromissos
        $stmtItens = $this->pdo->prepare("
            SELECT *
            FROM financas_pessoais_itens
            WHERE usuario_id = :uid AND deletado_em IS NULL AND status IN ('ativo', 'planejado')
        ");
        $stmtItens->execute(['uid' => $userId]);
        $itens = $stmtItens->fetchAll(PDO::FETCH_ASSOC);

        $totalFixos = 0.0;
        $totalParcelasMes = 0.0;
        $totalDividaParceladaRestante = 0.0;
        $mesAtual = date('Y-m');

        foreach ($itens as $it) {
            $tipo = $it['tipo'];
            $vTot = (float)$it['valor_total'];
            $qtd = max(1, (int)$it['qtd_parcelas']);
            $vP = (float)$it['valor_parcela'] > 0 ? (float)$it['valor_parcela'] : round($vTot / $qtd, 2);
            $pagas = (int)$it['parcelas_pagas'];
            $restantes = max(0, $qtd - $pagas);

            if ($tipo === 'fixo_mensal') {
                $totalFixos += $vTot;
            } elseif ($tipo === 'parcelado') {
                $totalDividaParceladaRestante += ($vP * $restantes);
                try {
                    $dtVenc = new \DateTime($it['data_primeiro_vencimento']);
                } catch (\Throwable $e) {
                    $dtVenc = new \DateTime();
                }
                for ($p = 1; $p <= $qtd; $p++) {
                    if ($dtVenc->format('Y-m') === $mesAtual) {
                        $totalParcelasMes += $vP;
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
                    $totalParcelasMes += $vTot;
                }
            }
        }

        $totalComprometido = $totalFixos + $totalParcelasMes;
        $saldoLivre = $teto - $totalComprometido;

        // 2. Investimentos e Economias
        $stmtInv = $this->pdo->prepare("
            SELECT *
            FROM financas_investimentos
            WHERE usuario_id = :uid AND deletado_em IS NULL AND status = 'ativo'
        ");
        $stmtInv->execute(['uid' => $userId]);
        $investimentos = $stmtInv->fetchAll(PDO::FETCH_ASSOC);

        $patrimonioBruto = 0.0;
        $totalAplicado = 0.0;
        $aporteMensalTotal = 0.0;
        $reservaTotal = 0.0;
        $reservaMeta = 0.0;
        $rentabilidadePonderadaSoma = 0.0;

        foreach ($investimentos as $inv) {
            $vAt = (float)$inv['valor_atual'];
            $vAp = (float)$inv['valor_aplicado'];
            $patrimonioBruto += $vAt;
            $totalAplicado += $vAp;
            $aporteMensalTotal += (float)$inv['aporte_mensal'];
            $rentabilidadePonderadaSoma += ($vAt * (float)$inv['rentabilidade_anual']);

            if ($inv['tipo'] === 'reserva_emergencia') {
                $reservaTotal += $vAt;
                $reservaMeta += (float)$inv['meta_valor'];
            }
        }

        $rentabilidadeMediaAnual = $patrimonioBruto > 0 ? round($rentabilidadePonderadaSoma / $patrimonioBruto, 2) : 10.50;
        $patrimonioLiquidoReal = round($patrimonioBruto - $totalDividaParceladaRestante, 2);
        $lucroTotal = round($patrimonioBruto - $totalAplicado, 2);

        // Cobertura de Reserva (meses de custos fixos cobertos)
        $mesesCoberturaReserva = $totalFixos > 0 ? round($reservaTotal / $totalFixos, 1) : 12.0;

        // Taxa de Poupança (% da renda alocada para investimentos/economias)
        $taxaPoupanca = $renda > 0 ? round(($aporteMensalTotal / $renda) * 100, 1) : 0.0;

        // Cálculo do Score de Saúde Financeira (0 a 100)
        $score = 100;
        if ($totalComprometido > $teto) {
            $score -= 30; // Perde 30 se extrapolou
        } elseif ($totalComprometido > ($teto * 0.9)) {
            $score -= 10;
        }

        if ($mesesCoberturaReserva < 3) {
            $score -= 25;
        } elseif ($mesesCoberturaReserva < 6) {
            $score -= 10;
        }

        if ($taxaPoupanca < 10) {
            $score -= 20;
        } elseif ($taxaPoupanca < 20) {
            $score -= 5;
        }
        $score = max(10, min(100, $score));

        $scoreLabel = 'Excelente';
        $scoreCor = 'lime';
        if ($score < 50) {
            $scoreLabel = 'Crítico / Atenção';
            $scoreCor = 'red';
        } elseif ($score < 75) {
            $scoreLabel = 'Moderado / Em Ajuste';
            $scoreCor = 'amber';
        }

        // Destinação da Renda Mensal
        $destinacao = [
            'custos_fixos' => [
                'label'      => 'Custos Fixos (Moradia, Contas)',
                'valor'      => round($totalFixos, 2),
                'percentual' => $renda > 0 ? round(($totalFixos / $renda) * 100, 1) : 0,
                'cor'        => 'cyan'
            ],
            'parcelas_metas' => [
                'label'      => 'Metas & Parcelamentos (Geladeira, etc.)',
                'valor'      => round($totalParcelasMes, 2),
                'percentual' => $renda > 0 ? round(($totalParcelasMes / $renda) * 100, 1) : 0,
                'cor'        => 'purple'
            ],
            'investimentos_economias' => [
                'label'      => 'Investimentos & Economias (Aportes)',
                'valor'      => round($aporteMensalTotal, 2),
                'percentual' => $renda > 0 ? round(($aporteMensalTotal / $renda) * 100, 1) : 0,
                'cor'        => 'lime'
            ],
            'margem_livre' => [
                'label'      => 'Margem Livre Desimpedida',
                'valor'      => max(0.0, round($renda - ($totalComprometido + $aporteMensalTotal), 2)),
                'percentual' => $renda > 0 ? max(0.0, round((($renda - ($totalComprometido + $aporteMensalTotal)) / $renda) * 100, 1)) : 0,
                'cor'        => 'emerald'
            ]
        ];

        // Projeção Patrimonial dos Próximos 12 Meses
        $taxaMensal = pow(1 + ($rentabilidadeMediaAnual / 100), 1/12) - 1;
        $projecaoPatrimonial = [];
        $dataCursor = new \DateTime('first day of this month');
        $patrimonioSimulado = $patrimonioBruto;
        $dividaSimulada = $totalDividaParceladaRestante;
        $amortizacaoMensalMedia = $totalParcelasMes;

        for ($m = 0; $m < 12; $m++) {
            $chave = $dataCursor->format('Y-m');
            $rendimentoMes = $patrimonioSimulado * $taxaMensal;
            $patrimonioSimulado += ($rendimentoMes + $aporteMensalTotal);
            $dividaSimulada = max(0.0, $dividaSimulada - $amortizacaoMensalMedia);
            $liquidoMes = $patrimonioSimulado - $dividaSimulada;

            $projecaoPatrimonial[] = [
                'mes'                => $chave,
                'mes_nome'           => $this->nomeMesAno($chave),
                'patrimonio_bruto'   => round($patrimonioSimulado, 2),
                'divida_restante'    => round($dividaSimulada, 2),
                'patrimonio_liquido' => round($liquidoMes, 2),
                'rendimento_mes'     => round($rendimentoMes, 2)
            ];
            $dataCursor->modify('+1 month');
        }

        // Insights Inteligentes
        $insights = [];
        if ($mesesCoberturaReserva >= 6) {
            $insights[] = [
                'tipo'     => 'sucesso',
                'icone'    => '🛡️',
                'titulo'   => 'Reserva de Emergência Sólida',
                'mensagem' => "Sua reserva cobre {$mesesCoberturaReserva} meses dos seus custos fixos. Você tem excelente proteção contra imprevistos!"
            ];
        } else {
            $insights[] = [
                'tipo'     => 'atencao',
                'icone'    => '⚠️',
                'titulo'   => 'Construção da Reserva de Emergência',
                'mensagem' => "Sua reserva atual cobre {$mesesCoberturaReserva} meses. O recomendado é atingir ao menos 6 meses (R$ " . number_format($totalFixos * 6, 2, ',', '.') . ") antes de aumentar aportes em ativos de maior risco."
            ];
        }

        if ($taxaPoupanca >= 20) {
            $insights[] = [
                'tipo'     => 'sucesso',
                'icone'    => '🚀',
                'titulo'   => 'Excelente Taxa de Poupança',
                'mensagem' => "Você poupa {$taxaPoupanca}% da sua renda líquida mensal (R$ " . number_format($aporteMensalTotal, 2, ',', '.') . "/mês), acelerando sua liberdade financeira."
            ];
        }

        if ($totalDividaParceladaRestante > 0) {
            $insights[] = [
                'tipo'     => 'info',
                'icone'    => '💳',
                'titulo'   => 'Quitação Gradual de Parcelamentos',
                'mensagem' => "Você possui R$ " . number_format($totalDividaParceladaRestante, 2, ',', '.') . " em parcelas futuras de metas planejadas. Conforme forem quitadas, esse valor retornará integralmente para sua margem livre."
            ];
        }

        Response::json([
            'sucesso' => true,
            'kpis' => [
                'patrimonio_liquido_real'         => $patrimonioLiquidoReal,
                'patrimonio_bruto_investido'      => round($patrimonioBruto, 2),
                'total_divida_parcelada_restante' => round($totalDividaParceladaRestante, 2),
                'lucro_acumulado_investimentos'   => $lucroTotal,
                'renda_mensal'                    => $renda,
                'teto_gastos_mensal'              => $teto,
                'total_fixos_mensais'             => round($totalFixos, 2),
                'total_parcelas_mes'              => round($totalParcelasMes, 2),
                'total_comprometido_mes'          => round($totalComprometido, 2),
                'saldo_livre_mes'                 => round($saldoLivre, 2),
                'aporte_mensal_total'             => round($aporteMensalTotal, 2),
                'reserva_total'                   => round($reservaTotal, 2),
                'meses_cobertura_reserva'         => $mesesCoberturaReserva,
                'taxa_poupanca_pct'               => $taxaPoupanca,
                'rentabilidade_media_anual'       => $rentabilidadeMediaAnual,
                'saude_score'                     => $score,
                'saude_label'                     => $scoreLabel,
                'saude_cor'                       => $scoreCor
            ],
            'destinacao_renda'     => array_values($destinacao),
            'projecao_patrimonial' => $projecaoPatrimonial,
            'insights'             => $insights
        ]);
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
        $valorTotal = $this->parseMoney($request->input('valor_total', 0.0));
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
        $valorTotal = $this->parseMoney($request->input('valor_total', 0.0));
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

    public function update(Request $request, string|int|array $id = 0): void
    {
        $userId = $this->getUserId();
        $id = is_array($id) ? (int)($id['id'] ?? 0) : (int)$id;

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
        $valorTotal = $this->parseMoney($request->input('valor_total', 0.0));
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

    public function pagarParcela(Request $request, string|int|array $id = 0): void
    {
        $userId = $this->getUserId();
        $id = is_array($id) ? (int)($id['id'] ?? 0) : (int)$id;

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

    public function destroy(Request $request, string|int|array $id = 0): void
    {
        $userId = $this->getUserId();
        $id = is_array($id) ? (int)($id['id'] ?? 0) : (int)$id;

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

    // ========================================================
    // INVESTIMENTOS, RESERVAS E ECONOMIAS PATRIMONIAIS
    // ========================================================

    public function investimentosIndex(Request $request): void
    {
        $userId = $this->getUserId();
        $tipo = trim((string)$request->get('tipo', ''));
        $status = trim((string)$request->get('status', 'ativo'));
        $busca = trim((string)$request->get('busca', ''));

        $sql = "
            SELECT *
            FROM financas_investimentos
            WHERE usuario_id = :uid AND deletado_em IS NULL
        ";
        $params = ['uid' => $userId];

        if ($tipo !== '') {
            $sql .= " AND tipo = :tipo";
            $params['tipo'] = $tipo;
        }

        if ($status !== '' && in_array($status, ['ativo', 'resgatado', 'pausado'], true)) {
            $sql .= " AND status = :status";
            $params['status'] = $status;
        }

        if ($busca !== '') {
            $sql .= " AND (nome LIKE :busca OR instituicao LIKE :busca OR observacoes LIKE :busca)";
            $params['busca'] = "%{$busca}%";
        }

        $sql .= " ORDER BY valor_atual DESC, id DESC";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        $investimentos = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $totalGeral = array_sum(array_column($investimentos, 'valor_atual'));

        $formatados = array_map(function ($inv) use ($totalGeral) {
            $vAtual = (float)$inv['valor_atual'];
            $vAplicado = (float)$inv['valor_aplicado'];
            $metaVal = (float)$inv['meta_valor'];
            $lucro = $vAtual - $vAplicado;
            $rentabilidadeGeral = $vAplicado > 0 ? round(($lucro / $vAplicado) * 100, 2) : 0.0;
            $progressoMeta = $metaVal > 0 ? min(100.0, round(($vAtual / $metaVal) * 100, 1)) : 100.0;
            $sharePct = $totalGeral > 0 ? round(($vAtual / $totalGeral) * 100, 1) : 0.0;

            return [
                'id'                  => (int)$inv['id'],
                'nome'                => $inv['nome'],
                'tipo'                => $inv['tipo'],
                'instituicao'         => $inv['instituicao'],
                'valor_atual'         => $vAtual,
                'valor_aplicado'      => $vAplicado,
                'lucro_reais'         => round($lucro, 2),
                'rentabilidade_pct'   => $rentabilidadeGeral,
                'aporte_mensal'       => (float)$inv['aporte_mensal'],
                'meta_valor'          => $metaVal,
                'progresso_meta_pct'  => $progressoMeta,
                'rentabilidade_anual' => (float)$inv['rentabilidade_anual'],
                'liquidez'            => $inv['liquidez'],
                'data_inicio'         => $inv['data_inicio'],
                'status'              => $inv['status'],
                'share_pct'           => $sharePct,
                'observacoes'         => $inv['observacoes'],
                'criado_em'           => $inv['criado_em']
            ];
        }, $investimentos);

        Response::json([
            'sucesso' => true,
            'total'   => count($formatados),
            'itens'   => $formatados
        ]);
    }

    public function investimentosResumo(Request $request): void
    {
        $userId = $this->getUserId();

        $stmt = $this->pdo->prepare("
            SELECT *
            FROM financas_investimentos
            WHERE usuario_id = :uid AND deletado_em IS NULL AND status = 'ativo'
        ");
        $stmt->execute(['uid' => $userId]);
        $investimentos = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $patrimonioTotal = 0.0;
        $totalAplicado = 0.0;
        $aporteMensalTotal = 0.0;
        $reservaTotal = 0.0;
        $reservaMeta = 0.0;

        $distribuicaoTipos = [
            'reserva_emergencia'  => ['label' => 'Reserva de Emergência', 'icone' => '🛡️', 'total' => 0.0, 'cor' => 'emerald'],
            'renda_fixa'          => ['label' => 'Renda Fixa / CDI / Tesouro', 'icone' => '📈', 'total' => 0.0, 'cor' => 'cyan'],
            'fundos_imobiliarios' => ['label' => 'Fundos Imobiliários (FIIs)', 'icone' => '🏢', 'total' => 0.0, 'cor' => 'purple'],
            'acoes'               => ['label' => 'Ações & Dividendos', 'icone' => '📊', 'total' => 0.0, 'cor' => 'lime'],
            'cripto'              => ['label' => 'Criptoativos / BTC', 'icone' => '🪙', 'total' => 0.0, 'cor' => 'amber'],
            'previdencia'         => ['label' => 'Previdência Privada', 'icone' => '🏦', 'total' => 0.0, 'cor' => 'indigo'],
            'outro'               => ['label' => 'Outros Investimentos', 'icone' => '💎', 'total' => 0.0, 'cor' => 'zinc']
        ];

        foreach ($investimentos as $inv) {
            $vAt = (float)$inv['valor_atual'];
            $vAp = (float)$inv['valor_aplicado'];
            $tipo = $inv['tipo'];

            $patrimonioTotal += $vAt;
            $totalAplicado += $vAp;
            $aporteMensalTotal += (float)$inv['aporte_mensal'];

            if (isset($distribuicaoTipos[$tipo])) {
                $distribuicaoTipos[$tipo]['total'] += $vAt;
            }

            if ($tipo === 'reserva_emergencia') {
                $reservaTotal += $vAt;
                $reservaMeta += (float)$inv['meta_valor'];
            }
        }

        $lucroTotal = round($patrimonioTotal - $totalAplicado, 2);
        $rentabilidadeMediaPct = $totalAplicado > 0 ? round(($lucroTotal / $totalAplicado) * 100, 2) : 0.0;
        $reservaProgressoPct = $reservaMeta > 0 ? min(100.0, round(($reservaTotal / $reservaMeta) * 100, 1)) : 100.0;

        // Distribuição percentual
        foreach ($distribuicaoTipos as $k => &$dt) {
            $dt['percentual'] = $patrimonioTotal > 0 ? round(($dt['total'] / $patrimonioTotal) * 100, 1) : 0;
        }
        unset($dt);

        // Últimas movimentações
        $stmtMov = $this->pdo->prepare("
            SELECT m.*, i.nome AS investimento_nome, i.tipo AS investimento_tipo
            FROM financas_investimentos_movimentacoes m
            JOIN financas_investimentos i ON i.id = m.investimento_id
            WHERE m.usuario_id = :uid
            ORDER BY m.data_movimentacao DESC, m.id DESC
            LIMIT 5
        ");
        $stmtMov->execute(['uid' => $userId]);
        $ultimasMov = $stmtMov->fetchAll(PDO::FETCH_ASSOC);

        Response::json([
            'sucesso' => true,
            'kpis'    => [
                'patrimonio_total'       => round($patrimonioTotal, 2),
                'total_aplicado'         => round($totalAplicado, 2),
                'lucro_acumulado'        => $lucroTotal,
                'rentabilidade_media'    => $rentabilidadeMediaPct,
                'aporte_mensal_total'    => round($aporteMensalTotal, 2),
                'reserva_total'          => round($reservaTotal, 2),
                'reserva_meta'           => round($reservaMeta, 2),
                'reserva_progresso_pct'  => $reservaProgressoPct,
                'qtd_ativos'             => count($investimentos)
            ],
            'distribuicao'           => array_values($distribuicaoTipos),
            'ultimas_movimentacoes'  => $ultimasMov
        ]);
    }

    public function investimentosStore(Request $request): void
    {
        $userId = $this->getUserId();
        $nome = trim((string)$request->input('nome', ''));
        $tipo = trim((string)$request->input('tipo', 'renda_fixa'));
        $instituicao = trim((string)$request->input('instituicao', 'Nubank')) ?: null;
        $valorAtual = $this->parseMoney($request->input('valor_atual', 0.0));
        $valorAplicado = $this->parseMoney($request->input('valor_aplicado', $valorAtual));
        $aporteMensal = $this->parseMoney($request->input('aporte_mensal', 0.0));
        $metaValor = $this->parseMoney($request->input('meta_valor', 0.0)) ?: null;
        $rentabilidade = $this->parseMoney($request->input('rentabilidade_anual', 10.50));
        $liquidez = trim((string)$request->input('liquidez', 'Diária (D+0)'));
        $dataInicio = trim((string)$request->input('data_inicio', date('Y-m-d')));
        $status = trim((string)$request->input('status', 'ativo'));
        $obs = trim((string)$request->input('observacoes', '')) ?: null;

        if ($nome === '') {
            Response::error('O nome do investimento/reserva é obrigatório.', 422);
            return;
        }

        if ($valorAtual < 0) {
            Response::error('O valor atual não pode ser negativo.', 422);
            return;
        }

        $stmt = $this->pdo->prepare("
            INSERT INTO financas_investimentos (
                usuario_id, nome, tipo, instituicao, valor_atual, valor_aplicado,
                aporte_mensal, meta_valor, rentabilidade_anual, liquidez,
                data_inicio, status, observacoes
            ) VALUES (
                :uid, :nome, :tipo, :inst, :vat, :vap,
                :aporte, :meta, :rent, :liq,
                :dt_ini, :status, :obs
            )
        ");

        $stmt->execute([
            'uid'     => $userId,
            'nome'    => $nome,
            'tipo'    => $tipo,
            'inst'    => $instituicao,
            'vat'     => $valorAtual,
            'vap'     => $valorAplicado,
            'aporte'  => $aporteMensal,
            'meta'    => $metaValor,
            'rent'    => $rentabilidade,
            'liq'     => $liquidez,
            'dt_ini'  => $dataInicio,
            'status'  => $status,
            'obs'     => $obs
        ]);

        $invId = (int)$this->pdo->lastInsertId();

        // Se inicializou com saldo, registra movimento de aporte inicial
        if ($valorAtual > 0) {
            $stmtMov = $this->pdo->prepare("
                INSERT INTO financas_investimentos_movimentacoes (
                    investimento_id, usuario_id, tipo, valor, data_movimentacao, observacoes
                ) VALUES (
                    :iid, :uid, 'aporte', :val, :dt, 'Saldo inicial cadastrado'
                )
            ");
            $stmtMov->execute([
                'iid' => $invId,
                'uid' => $userId,
                'val' => $valorAtual,
                'dt'  => $dataInicio
            ]);
        }

        Response::json([
            'sucesso'  => true,
            'mensagem' => 'Investimento cadastrado com sucesso!',
            'id'       => $invId
        ], 201);
    }

    public function investimentosUpdate(Request $request, string|int|array $id = 0): void
    {
        $userId = $this->getUserId();
        $id = is_array($id) ? (int)($id['id'] ?? 0) : (int)$id;

        if ($id <= 0) {
            Response::error('Investimento inválido.', 400);
            return;
        }

        $nome = trim((string)$request->input('nome', ''));
        $tipo = trim((string)$request->input('tipo', 'renda_fixa'));
        $instituicao = trim((string)$request->input('instituicao', '')) ?: null;
        $valorAtual = $this->parseMoney($request->input('valor_atual', 0.0));
        $valorAplicado = $this->parseMoney($request->input('valor_aplicado', 0.0));
        $aporteMensal = $this->parseMoney($request->input('aporte_mensal', 0.0));
        $metaValor = $this->parseMoney($request->input('meta_valor', 0.0)) ?: null;
        $rentabilidade = $this->parseMoney($request->input('rentabilidade_anual', 10.00));
        $liquidez = trim((string)$request->input('liquidez', 'diaria'));
        $dataInicio = trim((string)$request->input('data_inicio', date('Y-m-d')));
        $status = trim((string)$request->input('status', 'ativo'));
        $obs = trim((string)$request->input('observacoes', '')) ?: null;

        if ($nome === '') {
            Response::error('O nome do investimento é obrigatório.', 422);
            return;
        }

        $stmt = $this->pdo->prepare("
            UPDATE financas_investimentos SET
                nome = :nome,
                tipo = :tipo,
                instituicao = :inst,
                valor_atual = :vat,
                valor_aplicado = :vap,
                aporte_mensal = :aporte,
                meta_valor = :meta,
                rentabilidade_anual = :rent,
                liquidez = :liq,
                data_inicio = :dt_ini,
                status = :status,
                observacoes = :obs
            WHERE id = :id AND usuario_id = :uid
        ");

        $stmt->execute([
            'id'     => $id,
            'uid'    => $userId,
            'nome'   => $nome,
            'tipo'   => $tipo,
            'inst'   => $instituicao,
            'vat'    => $valorAtual,
            'vap'    => $valorAplicado,
            'aporte' => $aporteMensal,
            'meta'   => $metaValor,
            'rent'   => $rentabilidade,
            'liq'    => $liquidez,
            'dt_ini' => $dataInicio,
            'status' => $status,
            'obs'    => $obs
        ]);

        Response::json([
            'sucesso'  => true,
            'mensagem' => 'Investimento atualizado com sucesso!'
        ]);
    }

    public function investimentosMovimentar(Request $request, string|int|array $id = 0): void
    {
        $userId = $this->getUserId();
        $id = is_array($id) ? (int)($id['id'] ?? 0) : (int)$id;

        $tipo = trim((string)$request->input('tipo', 'aporte'));
        $valor = $this->parseMoney($request->input('valor', 0.0));
        $dataMov = trim((string)$request->input('data_movimentacao', date('Y-m-d')));
        $obs = trim((string)$request->input('observacoes', '')) ?: null;

        if ($id <= 0 || $valor <= 0) {
            Response::error('Informe um valor válido maior que zero.', 422);
            return;
        }

        if (!in_array($tipo, ['aporte', 'rendimento', 'resgate'], true)) {
            Response::error('Tipo de movimentação inválido.', 422);
            return;
        }

        $stmt = $this->pdo->prepare("SELECT id, valor_atual, valor_aplicado FROM financas_investimentos WHERE id = :id AND usuario_id = :uid AND deletado_em IS NULL");
        $stmt->execute(['id' => $id, 'uid' => $userId]);
        $inv = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$inv) {
            Response::error('Investimento não encontrado.', 404);
            return;
        }

        $vAtual = (float)$inv['valor_atual'];
        $vAplicado = (float)$inv['valor_aplicado'];

        if ($tipo === 'aporte') {
            $vAtual += $valor;
            $vAplicado += $valor;
        } elseif ($tipo === 'rendimento') {
            $vAtual += $valor;
        } elseif ($tipo === 'resgate') {
            $vAtual = max(0.0, $vAtual - $valor);
            $vAplicado = max(0.0, $vAplicado - $valor);
        }

        $stmtUp = $this->pdo->prepare("
            UPDATE financas_investimentos
            SET valor_atual = :vat, valor_aplicado = :vap
            WHERE id = :id AND usuario_id = :uid
        ");
        $stmtUp->execute([
            'vat' => $vAtual,
            'vap' => $vAplicado,
            'id'  => $id,
            'uid' => $userId
        ]);

        $stmtMov = $this->pdo->prepare("
            INSERT INTO financas_investimentos_movimentacoes (
                investimento_id, usuario_id, tipo, valor, data_movimentacao, observacoes
            ) VALUES (
                :iid, :uid, :tipo, :val, :dt, :obs
            )
        ");
        $stmtMov->execute([
            'iid'  => $id,
            'uid'  => $userId,
            'tipo' => $tipo,
            'val'  => $valor,
            'dt'   => $dataMov,
            'obs'  => $obs
        ]);

        Response::json([
            'sucesso'        => true,
            'mensagem'       => ucfirst($tipo) . ' de R$ ' . number_format($valor, 2, ',', '.') . ' registrado com sucesso!',
            'novo_saldo'     => $vAtual,
            'total_aplicado' => $vAplicado
        ]);
    }

    public function investimentosDestroy(Request $request, string|int|array $id = 0): void
    {
        $userId = $this->getUserId();
        $id = is_array($id) ? (int)($id['id'] ?? 0) : (int)$id;

        if ($id <= 0) {
            Response::error('Investimento inválido.', 400);
            return;
        }

        $stmt = $this->pdo->prepare("
            UPDATE financas_investimentos
            SET deletado_em = CURRENT_TIMESTAMP
            WHERE id = :id AND usuario_id = :uid AND deletado_em IS NULL
        ");
        $stmt->execute(['id' => $id, 'uid' => $userId]);

        Response::json([
            'sucesso'  => true,
            'mensagem' => 'Investimento removido com sucesso.'
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
    private function parseMoney(mixed $val): float
    {
        if (is_numeric($val)) {
            return (float)$val;
        }
        if (is_string($val)) {
            $val = trim(str_replace(['R$', ' '], '', $val));
            if (str_contains($val, ',') && str_contains($val, '.')) {
                $val = str_replace('.', '', $val);
                $val = str_replace(',', '.', $val);
            } elseif (str_contains($val, ',')) {
                $val = str_replace(',', '.', $val);
            }
            return (float)$val;
        }
        return 0.0;
    }
}
