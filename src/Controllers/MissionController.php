<?php
declare(strict_types=1);

namespace Aires\Controllers;

use Aires\Core\Database;
use Aires\Core\Request;
use Aires\Core\Response;
use PDO;

final class MissionController
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

    public function index(Request $request): void
    {
        $userId = $this->getUserId();
        $sql = "SELECT m.*,
                       COUNT(t.id) AS total_tarefas,
                       SUM(CASE WHEN t.status = 'feito' THEN 1 ELSE 0 END) AS tarefas_concluidas
                FROM missoes m
                LEFT JOIN tarefas t ON t.missao_id = m.id AND t.deletado_em IS NULL
                WHERE m.usuario_id = :usuario_id AND m.deletado_em IS NULL
                GROUP BY m.id
                ORDER BY m.status = 'em_andamento' DESC, m.data_limite ASC, m.id DESC";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute(['usuario_id' => $userId]);
        $missions = $stmt->fetchAll();

        Response::json([
            'sucesso' => true,
            'missoes' => $missions
        ]);
    }

    public function store(Request $request): void
    {
        $userId = $this->getUserId();
        $titulo = trim((string)$request->input('titulo', ''));

        if ($titulo === '') {
            Response::error('O título da missão é obrigatório', 422);
            return;
        }

        $descricao = (string)$request->input('descricao', '');
        $dataLimite = !empty($request->input('data_limite')) ? (string)$request->input('data_limite') : null;
        $orcamento = (float)$request->input('orcamento_estimado', 0.0);
        $cor = (string)$request->input('cor', 'indigo');

        $stmt = $this->pdo->prepare("INSERT INTO missoes (usuario_id, titulo, descricao, data_limite, orcamento_estimado, cor) 
            VALUES (:usuario_id, :titulo, :descricao, :data_limite, :orcamento, :cor)");
        $stmt->execute([
            'usuario_id' => $userId,
            'titulo'     => $titulo,
            'descricao'  => $descricao,
            'data_limite'=> $dataLimite,
            'orcamento'  => $orcamento,
            'cor'        => $cor
        ]);

        Response::success(['id' => (int)$this->pdo->lastInsertId()], 'Missão estratégica criada!', 201);
    }

    public function update(Request $request, string $id): void
    {
        $userId = $this->getUserId();
        $missionId = (int)$id;

        $stmt = $this->pdo->prepare("SELECT id FROM missoes WHERE id = :id AND usuario_id = :usuario_id AND deletado_em IS NULL LIMIT 1");
        $stmt->execute(['id' => $missionId, 'usuario_id' => $userId]);
        if (!$stmt->fetch()) {
            Response::error('Missão não encontrada', 404);
            return;
        }

        $titulo = trim((string)$request->input('titulo', ''));
        if ($titulo === '') {
            Response::error('O título não pode ser vazio', 422);
            return;
        }

        $descricao = (string)$request->input('descricao', '');
        $dataLimite = !empty($request->input('data_limite')) ? (string)$request->input('data_limite') : null;
        $orcamento = (float)$request->input('orcamento_estimado', 0.0);
        $cor = (string)$request->input('cor', 'indigo');
        $status = in_array($request->input('status'), ['planejada', 'em_andamento', 'concluida', 'cancelada']) ? $request->input('status') : 'em_andamento';

        $stmtUp = $this->pdo->prepare("UPDATE missoes 
            SET titulo = :titulo, descricao = :descricao, data_limite = :data_limite, 
                orcamento_estimado = :orcamento, cor = :cor, status = :status, atualizado_em = NOW()
            WHERE id = :id AND usuario_id = :usuario_id");
        $stmtUp->execute([
            'titulo'      => $titulo,
            'descricao'   => $descricao,
            'data_limite' => $dataLimite,
            'orcamento'   => $orcamento,
            'cor'         => $cor,
            'status'      => $status,
            'id'          => $missionId,
            'usuario_id'  => $userId
        ]);

        Response::success(null, 'Missão atualizada com sucesso!');
    }

    public function destroy(Request $request, string $id): void
    {
        $userId = $this->getUserId();
        $missionId = (int)$id;

        $stmt = $this->pdo->prepare("UPDATE missoes SET deletado_em = NOW() WHERE id = :id AND usuario_id = :usuario_id");
        $stmt->execute(['id' => $missionId, 'usuario_id' => $userId]);

        Response::success(null, 'Missão excluída com sucesso!');
    }
}
