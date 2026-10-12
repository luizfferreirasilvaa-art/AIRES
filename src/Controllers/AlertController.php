<?php
declare(strict_types=1);

namespace Aires\Controllers;

use Aires\Core\Database;
use Aires\Core\Request;
use Aires\Core\Response;
use PDO;

final class AlertController
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

    public function pending(Request $request): void
    {
        $userId = $this->getUserId();
        
        $sql = "SELECT a.*, t.titulo AS tarefa_titulo, t.data_inicio, t.tempo_viagem_minutos, t.endereco_local
                FROM alertas_notificacoes a
                INNER JOIN tarefas t ON a.tarefa_id = t.id AND t.deletado_em IS NULL
                WHERE a.usuario_id = :usuario_id
                  AND a.deletado_em IS NULL
                  AND a.lido = 0
                  AND a.horario_disparo <= NOW()
                ORDER BY a.horario_disparo DESC";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute(['usuario_id' => $userId]);
        $alerts = $stmt->fetchAll();

        if (!empty($alerts)) {
            $ids = array_column($alerts, 'id');
            $placeholders = implode(',', array_fill(0, count($ids), '?'));
            $stmtUp = $this->pdo->prepare("UPDATE alertas_notificacoes SET disparado = 1 WHERE id IN ($placeholders)");
            $stmtUp->execute($ids);
        }

        Response::json([
            'sucesso' => true,
            'alertas' => $alerts,
            'total'   => count($alerts)
        ]);
    }

    public function markRead(Request $request, string $id): void
    {
        $userId = $this->getUserId();
        $alertId = (int)$id;

        $stmt = $this->pdo->prepare("UPDATE alertas_notificacoes SET lido = 1, atualizado_em = NOW() 
            WHERE id = :id AND usuario_id = :usuario_id");
        $stmt->execute(['id' => $alertId, 'usuario_id' => $userId]);

        Response::success(null, 'Alerta marcado como lido');
    }
}
