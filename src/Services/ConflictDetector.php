<?php
declare(strict_types=1);

namespace Aires\Services;

use Aires\Core\Database;
use PDO;

/**
 * Inteligência Ativa: Auditoria de Agenda (Anti-Colisão)
 */
final class ConflictDetector
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getInstance()->getConnection();
    }

    public function detectConflict(int $userId, ?string $inicio, ?string $entrega, ?int $excludeTaskId = null): ?array
    {
        if (empty($inicio) || empty($entrega)) {
            return null;
        }

        $sql = "SELECT id, titulo, data_inicio, data_entrega, prioridade, status
                FROM tarefas
                WHERE usuario_id = :usuario_id
                  AND deletado_em IS NULL
                  AND status != 'feito'
                  AND data_inicio IS NOT NULL
                  AND data_entrega IS NOT NULL
                  AND (:inicio < data_entrega AND :entrega > data_inicio)";

        $params = [
            'usuario_id' => $userId,
            'inicio'     => $inicio,
            'entrega'    => $entrega
        ];

        if ($excludeTaskId !== null && $excludeTaskId > 0) {
            $sql .= " AND id != :exclude_id";
            $params['exclude_id'] = $excludeTaskId;
        }

        $sql .= " ORDER BY data_inicio ASC LIMIT 1";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        $conflict = $stmt->fetch();

        return $conflict ?: null;
    }
}
