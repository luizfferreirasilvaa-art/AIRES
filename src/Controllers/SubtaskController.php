<?php
declare(strict_types=1);

namespace Aires\Controllers;

use Aires\Core\Database;
use Aires\Core\Request;
use Aires\Core\Response;
use PDO;

final class SubtaskController
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getInstance()->getConnection();
    }

    public function store(Request $request, string $tarefaId): void
    {
        $titulo = trim((string)$request->input('titulo', ''));
        if ($titulo === '') {
            Response::error('O título da subtarefa é obrigatório', 422);
            return;
        }

        $stmtOrdem = $this->pdo->prepare("SELECT COALESCE(MAX(ordem), 0) + 1 AS proxima FROM subtarefas WHERE tarefa_id = :tarefa_id AND deletado_em IS NULL");
        $stmtOrdem->execute(['tarefa_id' => (int)$tarefaId]);
        $ordem = (int)$stmtOrdem->fetch()['proxima'];

        $stmt = $this->pdo->prepare("INSERT INTO subtarefas (tarefa_id, titulo, concluida, ordem) VALUES (:tarefa_id, :titulo, 0, :ordem)");
        $stmt->execute([
            'tarefa_id' => (int)$tarefaId,
            'titulo'    => $titulo,
            'ordem'     => $ordem
        ]);

        $newId = (int)$this->pdo->lastInsertId();

        Response::success([
            'id'        => $newId,
            'tarefa_id' => (int)$tarefaId,
            'titulo'    => $titulo,
            'concluida' => 0,
            'ordem'     => $ordem
        ], 'Subtarefa adicionada', 201);
    }

    public function toggle(Request $request, string $id): void
    {
        $subtaskId = (int)$id;
        $stmt = $this->pdo->prepare("SELECT id, tarefa_id, concluida FROM subtarefas WHERE id = :id AND deletado_em IS NULL LIMIT 1");
        $stmt->execute(['id' => $subtaskId]);
        $sub = $stmt->fetch();

        if (!$sub) {
            Response::error('Subtarefa não encontrada', 404);
            return;
        }

        $novoStatus = $sub['concluida'] ? 0 : 1;

        $stmtUp = $this->pdo->prepare("UPDATE subtarefas SET concluida = :concluida, atualizado_em = NOW() WHERE id = :id");
        $stmtUp->execute(['concluida' => $novoStatus, 'id' => $subtaskId]);

        $stmtStats = $this->pdo->prepare("SELECT 
            COUNT(*) AS total,
            SUM(CASE WHEN concluida = 1 THEN 1 ELSE 0 END) AS concluidas
            FROM subtarefas WHERE tarefa_id = :tarefa_id AND deletado_em IS NULL");
        $stmtStats->execute(['tarefa_id' => $sub['tarefa_id']]);
        $stats = $stmtStats->fetch();

        $total = (int)($stats['total'] ?? 0);
        $done = (int)($stats['concluidas'] ?? 0);
        $pct = $total > 0 ? (int)round(($done / $total) * 100) : 0;

        Response::success([
            'concluida'            => (bool)$novoStatus,
            'checklist_total'      => $total,
            'checklist_concluido'  => $done,
            'checklist_percentual' => $pct
        ], 'Subtarefa atualizada');
    }

    public function update(Request $request, string $id): void
    {
        $subtaskId = (int)$id;
        $titulo = trim((string)$request->input('titulo', ''));
        if ($titulo === '') {
            Response::error('O título da subtarefa é obrigatório', 422);
            return;
        }

        $stmt = $this->pdo->prepare("UPDATE subtarefas SET titulo = :titulo, atualizado_em = NOW() WHERE id = :id AND deletado_em IS NULL");
        $stmt->execute(['titulo' => $titulo, 'id' => $subtaskId]);

        Response::success(null, 'Subtarefa atualizada');
    }

    public function destroy(Request $request, string $id): void
    {
        $subtaskId = (int)$id;
        $stmt = $this->pdo->prepare("UPDATE subtarefas SET deletado_em = NOW() WHERE id = :id");
        $stmt->execute(['id' => $subtaskId]);

        Response::success(null, 'Subtarefa removida');
    }
}
