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

        $compromissosMes = $this->getMonthCommitments($userId);

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
            ],
            'compromissos_mes' => $compromissosMes
        ];
    }

    public function getMonthCommitments(int $userId): array
    {
        $year = (int)date('Y');
        $month = (int)date('n');
        $daysInMonth = (int)date('t');
        $todayDay = (int)date('j');

        $mesesPt = [
            1 => 'Janeiro', 2 => 'Fevereiro', 3 => 'Março', 4 => 'Abril',
            5 => 'Maio', 6 => 'Junho', 7 => 'Julho', 8 => 'Agosto',
            9 => 'Setembro', 10 => 'Outubro', 11 => 'Novembro', 12 => 'Dezembro'
        ];
        $mesNome = $mesesPt[$month] ?? date('F');

        $startDate = sprintf('%04d-%02d-01 00:00:00', $year, $month);
        $endDate = sprintf('%04d-%02d-%02d 23:59:59', $year, $month, $daysInMonth);

        $stmt = $this->pdo->prepare("SELECT id, titulo, prioridade, status, data_inicio, data_entrega, concluida_em
            FROM tarefas
            WHERE usuario_id = :id
              AND deletado_em IS NULL
              AND (
                  (data_inicio IS NOT NULL AND data_inicio BETWEEN :start1 AND :end1)
                  OR (data_entrega IS NOT NULL AND data_entrega BETWEEN :start2 AND :end2)
                  OR (concluida_em IS NOT NULL AND concluida_em BETWEEN :start3 AND :end3)
              )
            ORDER BY COALESCE(data_inicio, data_entrega) ASC");
        $stmt->execute([
            'id' => $userId,
            'start1' => $startDate,
            'end1' => $endDate,
            'start2' => $startDate,
            'end2' => $endDate,
            'start3' => $startDate,
            'end3' => $endDate
        ]);
        $tasks = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $days = [];
        $totalCompromissos = 0;
        $diasComAgenda = 0;

        for ($d = 1; $d <= $daysInMonth; $d++) {
            $dateStr = sprintf('%04d-%02d-%02d', $year, $month, $d);
            $dayTasks = [];

            foreach ($tasks as $t) {
                $matches = false;
                if (!empty($t['data_inicio']) && str_starts_with($t['data_inicio'], $dateStr)) {
                    $matches = true;
                } elseif (!empty($t['data_entrega']) && str_starts_with($t['data_entrega'], $dateStr)) {
                    $matches = true;
                } elseif (!empty($t['concluida_em']) && str_starts_with($t['concluida_em'], $dateStr)) {
                    $matches = true;
                } elseif (!empty($t['data_inicio']) && !empty($t['data_entrega'])) {
                    $startDay = substr($t['data_inicio'], 0, 10);
                    $endDay = substr($t['data_entrega'], 0, 10);
                    if ($dateStr >= $startDay && $dateStr <= $endDay) {
                        $matches = true;
                    }
                }

                if ($matches) {
                    $dayTasks[] = $t['titulo'];
                }
            }

            $count = count($dayTasks);
            if ($count > 0) {
                $diasComAgenda++;
                $totalCompromissos += $count;
            }

            $days[] = [
                'dia' => $d,
                'data' => $dateStr,
                'count' => $count,
                'is_today' => ($d === $todayDay),
                'tarefas' => $dayTasks
            ];
        }

        return [
            'mes_nome' => $mesNome,
            'ano' => $year,
            'total_compromissos' => $totalCompromissos,
            'dias_com_agenda' => $diasComAgenda,
            'dias_total' => $daysInMonth,
            'dias' => $days
        ];
    }

    public function stats(Request $request): void
    {
        $data = $this->getStatsData();
        Response::json(array_merge(['sucesso' => true], $data));
    }
}
