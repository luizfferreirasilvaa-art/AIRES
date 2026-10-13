<?php
declare(strict_types=1);

namespace Aires\Controllers;

use Aires\Core\Database;
use Aires\Core\Request;
use Aires\Core\Response;
use PDO;

final class StartupDashboardController
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getInstance()->getConnection();
    }

    private function getUserId(): int
    {
        return isset($_SESSION['usuario_id']) ? (int)$_SESSION['usuario_id'] : 1;
    }

    public function stats(Request $request): void
    {
        $userId = $this->getUserId();
        $mesAtual = date('Y-m');
        $hoje = date('Y-m-d');

        // 1. Clientes Ativos e Propriedades
        $stmtCli = $this->pdo->prepare("
            SELECT 
                COUNT(*) AS total_clientes,
                SUM(CASE WHEN status = 'ativo' THEN 1 ELSE 0 END) AS clientes_ativos,
                SUM(CASE WHEN status = 'ativo' THEN qtd_propriedades ELSE 0 END) AS total_propriedades
            FROM startup_clientes 
            WHERE usuario_id = :uid AND deletado_em IS NULL
        ");
        $stmtCli->execute(['uid' => $userId]);
        $cliData = $stmtCli->fetch(PDO::FETCH_ASSOC);

        // 2. Receita do Mês (Faturas Pagas)
        $stmtRec = $this->pdo->prepare("
            SELECT COALESCE(SUM(valor_cobrado), 0) AS receita_mes
            FROM startup_faturas 
            WHERE usuario_id = :uid AND mes_referencia = :mes AND status = 'paga' AND deletado_em IS NULL
        ");
        $stmtRec->execute(['uid' => $userId, 'mes' => $mesAtual]);
        $receitaMes = (float)($stmtRec->fetchColumn() ?: 0);

        // 3. Custos Operacionais do Mês (Saídas no financeiro)
        $stmtCustos = $this->pdo->prepare("
            SELECT COALESCE(SUM(valor), 0) AS custos_mes
            FROM startup_pagamentos 
            WHERE usuario_id = :uid AND tipo = 'saida' AND data_pagamento LIKE :mes AND deletado_em IS NULL
        ");
        $stmtCustos->execute(['uid' => $userId, 'mes' => "{$mesAtual}%"]);
        $custosMes = (float)($stmtCustos->fetchColumn() ?: 0);

        $lucroEstimado = $receitaMes - $custosMes;

        // 4. Inadimplência
        $stmtInad = $this->pdo->prepare("
            SELECT 
                COUNT(*) AS total_faturas,
                SUM(CASE WHEN status IN ('emitida', 'enviada', 'atrasada') AND data_vencimento < :hoje THEN 1 ELSE 0 END) AS vencidas,
                SUM(CASE WHEN status IN ('emitida', 'enviada', 'atrasada') AND data_vencimento < :hoje THEN valor_cobrado ELSE 0 END) AS valor_vencido
            FROM startup_faturas 
            WHERE usuario_id = :uid AND deletado_em IS NULL
        ");
        $stmtInad->execute(['uid' => $userId, 'hoje' => $hoje]);
        $inadData = $stmtInad->fetch(PDO::FETCH_ASSOC);

        $totalFaturas = (int)($inadData['total_faturas'] ?? 0);
        $totalVencidas = (int)($inadData['vencidas'] ?? 0);
        $inadimplenciaPct = $totalFaturas > 0 ? round(($totalVencidas / $totalFaturas) * 100, 1) : 0.0;
        $valorInadimplente = (float)($inadData['valor_vencido'] ?? 0);

        // 5. Créditos da Usina no Mês
        $stmtCred = $this->pdo->prepare("
            SELECT * FROM startup_creditos 
            WHERE usuario_id = :uid AND mes_referencia = :mes AND deletado_em IS NULL 
            LIMIT 1
        ");
        $stmtCred->execute(['uid' => $userId, 'mes' => $mesAtual]);
        $credMes = $stmtCred->fetch(PDO::FETCH_ASSOC);

        $geradosKwh = (float)($credMes['creditos_gerados_kwh'] ?? 0);
        $distribuidosKwh = (float)($credMes['creditos_distribuidos_kwh'] ?? 0);
        $saldoKwh = (float)($credMes['saldo_kwh'] ?? 0);
        $taxaAproveitamento = $geradosKwh > 0 ? round(($distribuidosKwh / $geradosKwh) * 100, 1) : 0.0;

        // 6. Histórico dos últimos 6 meses (para gráfico de barras)
        $historico = [];
        for ($i = 5; $i >= 0; $i--) {
            $m = date('Y-m', strtotime("-{$i} month"));
            
            // Receita faturas pagas
            $stmtHRec = $this->pdo->prepare("
                SELECT COALESCE(SUM(valor_cobrado), 0) FROM startup_faturas 
                WHERE usuario_id = :uid AND mes_referencia = :m AND status = 'paga' AND deletado_em IS NULL
            ");
            $stmtHRec->execute(['uid' => $userId, 'm' => $m]);
            $rec = (float)$stmtHRec->fetchColumn();

            // Despesas
            $stmtHDesp = $this->pdo->prepare("
                SELECT COALESCE(SUM(valor), 0) FROM startup_pagamentos 
                WHERE usuario_id = :uid AND tipo = 'saida' AND data_pagamento LIKE :m AND deletado_em IS NULL
            ");
            $stmtHDesp->execute(['uid' => $userId, 'm' => "{$m}%"]);
            $desp = (float)$stmtHDesp->fetchColumn();

            // Créditos gerados
            $stmtHCred = $this->pdo->prepare("
                SELECT COALESCE(creditos_gerados_kwh, 0) FROM startup_creditos 
                WHERE usuario_id = :uid AND mes_referencia = :m AND deletado_em IS NULL
            ");
            $stmtHCred->execute(['uid' => $userId, 'm' => $m]);
            $cred = (float)$stmtHCred->fetchColumn();

            $historico[] = [
                'mes'      => $m,
                'mes_nome' => date('M/y', strtotime("{$m}-01")),
                'receita'  => $rec,
                'despesas' => $desp,
                'creditos' => $cred
            ];
        }

        Response::json([
            'sucesso' => true,
            'kpis'    => [
                'clientes_ativos'     => (int)($cliData['clientes_ativos'] ?? 0),
                'total_clientes'      => (int)($cliData['total_clientes'] ?? 0),
                'total_propriedades'  => (int)($cliData['total_propriedades'] ?? 0),
                'receita_mes'         => $receitaMes,
                'custos_operacionais' => $custosMes,
                'lucro_estimado'      => $lucroEstimado,
                'inadimplencia_pct'   => $inadimplenciaPct,
                'valor_inadimplente'  => $valorInadimplente,
                'creditos_gerados'    => $geradosKwh,
                'creditos_saldo'      => $saldoKwh,
                'taxa_aproveitamento' => $taxaAproveitamento
            ],
            'historico' => $historico
        ]);
    }
}
