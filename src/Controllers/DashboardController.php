<?php
declare(strict_types=1);

namespace Aires\Controllers;

use Aires\Core\Database;
use Aires\Core\Request;
use Aires\Core\Response;
use PDO;

final class DashboardController
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

    public function getStatsData(?int $userId = null): array
    {
        $userId = $userId ?? $this->getUserId();

        $stmtUser = $this->pdo->prepare("SELECT nome, xp, streak_dias, ultimo_dia_produtivo FROM usuarios WHERE id = :id");
        $stmtUser->execute(['id' => $userId]);
        $user = $stmtUser->fetch() ?: ['nome' => 'Comandante', 'xp' => 0, 'streak_dias' => 0];

        $stmtTasks = $this->pdo->prepare("SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN status = 'feito' THEN 1 ELSE 0 END) AS concluidas,
            SUM(CASE WHEN status = 'fazendo' THEN 1 ELSE 0 END) AS em_andamento,
            SUM(CASE WHEN status = 'a_fazer' THEN 1 ELSE 0 END) AS a_fazer,
            SUM(CASE WHEN status = 'planejamento' THEN 1 ELSE 0 END) AS planejamento,
            SUM(CASE WHEN status != 'feito' AND data_entrega IS NOT NULL AND data_entrega < NOW() THEN 1 ELSE 0 END) AS vencidas,
            SUM(CASE WHEN inbox = 1 AND status != 'feito' THEN 1 ELSE 0 END) AS inbox_pendentes
        FROM tarefas
        WHERE usuario_id = :id AND deletado_em IS NULL");
        $stmtTasks->execute(['id' => $userId]);
        $taskStats = $stmtTasks->fetch();

        $stmtWeek = $this->pdo->prepare("SELECT COUNT(*) AS semana_concluidas
            FROM tarefas 
            WHERE usuario_id = :id AND status = 'feito' AND concluida_em >= DATE_SUB(NOW(), INTERVAL 7 DAY) AND deletado_em IS NULL");
        $stmtWeek->execute(['id' => $userId]);
        $semanaConcluidas = (int)$stmtWeek->fetchColumn();

        $stmtToday = $this->pdo->prepare("SELECT COUNT(*) AS hoje_concluidas
            FROM tarefas 
            WHERE usuario_id = :id AND status = 'feito' AND DATE(concluida_em) = CURDATE() AND deletado_em IS NULL");
        $stmtToday->execute(['id' => $userId]);
        $hojeConcluidas = (int)$stmtToday->fetchColumn();

        $total = (int)($taskStats['total'] ?? 0);
        $concluidas = (int)($taskStats['concluidas'] ?? 0);
        $taxaFoco = $total > 0 ? (int)round(($concluidas / $total) * 100) : 0;

        return [
            'usuario' => [
                'nome'        => $user['nome'],
                'xp'          => (int)$user['xp'],
                'streak_dias' => (int)$user['streak_dias']
            ],
            'metricas' => [
                'total'             => $total,
                'concluidas'        => $concluidas,
                'em_andamento'      => (int)($taskStats['em_andamento'] ?? 0),
                'a_fazer'           => (int)($taskStats['a_fazer'] ?? 0),
                'planejamento'      => (int)($taskStats['planejamento'] ?? 0),
                'vencidas'          => (int)($taskStats['vencidas'] ?? 0),
                'inbox_pendentes'   => (int)($taskStats['inbox_pendentes'] ?? 0),
                'semana_concluidas' => $semanaConcluidas,
                'hoje_concluidas'   => $hojeConcluidas,
                'taxa_foco'         => $taxaFoco
            ]
        ];
    }

    public function stats(Request $request): void
    {
        $data = $this->getStatsData();
        Response::json(array_merge(['sucesso' => true], $data));
    }
}
