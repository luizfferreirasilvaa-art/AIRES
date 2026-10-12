<?php
declare(strict_types=1);

namespace Aires\Controllers;

use Aires\Core\Database;
use Aires\Core\Request;
use Aires\Core\Response;
use PDO;

final class NoteController
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
        $missaoId = $request->get('missao_id');
        $busca = $request->get('busca');

        $sql = "SELECT n.*, m.titulo AS missao_titulo
                FROM notas n
                LEFT JOIN missoes m ON n.missao_id = m.id AND m.deletado_em IS NULL
                WHERE n.usuario_id = :usuario_id AND n.deletado_em IS NULL";

        $params = ['usuario_id' => $userId];

        if (!empty($missaoId)) {
            $sql .= " AND n.missao_id = :missao_id";
            $params['missao_id'] = (int)$missaoId;
        }

        if (!empty($busca)) {
            $sql .= " AND (n.titulo LIKE :busca OR n.conteudo LIKE :busca OR n.tags LIKE :busca)";
            $params['busca'] = "%{$busca}%";
        }

        $sql .= " ORDER BY n.fixado DESC, n.atualizado_em DESC";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        $notes = $stmt->fetchAll();

        Response::json([
            'sucesso' => true,
            'notas'   => $notes
        ]);
    }

    public function store(Request $request): void
    {
        $userId = $this->getUserId();
        $titulo = trim((string)$request->input('titulo', ''));

        if ($titulo === '') {
            Response::error('O título da nota é obrigatório', 422);
            return;
        }

        $conteudo = (string)$request->input('conteudo', '');
        $missaoId = $request->input('missao_id') ? (int)$request->input('missao_id') : null;
        $tarefaId = $request->input('tarefa_id') ? (int)$request->input('tarefa_id') : null;
        $fixado = (bool)$request->input('fixado', false);
        $tags = (string)$request->input('tags', '');

        $stmt = $this->pdo->prepare("INSERT INTO notas (usuario_id, missao_id, tarefa_id, titulo, conteudo, fixado, tags)
            VALUES (:usuario_id, :missao_id, :tarefa_id, :titulo, :conteudo, :fixado, :tags)");
        $stmt->execute([
            'usuario_id' => $userId,
            'missao_id'  => $missaoId,
            'tarefa_id'  => $tarefaId,
            'titulo'     => $titulo,
            'conteudo'   => $conteudo,
            'fixado'     => $fixado ? 1 : 0,
            'tags'       => $tags ?: null
        ]);

        Response::success(['id' => (int)$this->pdo->lastInsertId()], 'Nota criada com sucesso!', 201);
    }

    public function update(Request $request, string $id): void
    {
        $userId = $this->getUserId();
        $noteId = (int)$id;

        $titulo = trim((string)$request->input('titulo', ''));
        if ($titulo === '') {
            Response::error('O título não pode ser vazio', 422);
            return;
        }

        $conteudo = (string)$request->input('conteudo', '');
        $missaoId = $request->input('missao_id') ? (int)$request->input('missao_id') : null;
        $tarefaId = $request->input('tarefa_id') ? (int)$request->input('tarefa_id') : null;
        $fixado = (bool)$request->input('fixado', false);
        $tags = (string)$request->input('tags', '');

        $stmt = $this->pdo->prepare("UPDATE notas 
            SET titulo = :titulo, conteudo = :conteudo, missao_id = :missao_id, tarefa_id = :tarefa_id, 
                fixado = :fixado, tags = :tags, atualizado_em = NOW()
            WHERE id = :id AND usuario_id = :usuario_id");
        $stmt->execute([
            'titulo'     => $titulo,
            'conteudo'   => $conteudo,
            'missao_id'  => $missaoId,
            'tarefa_id'  => $tarefaId,
            'fixado'     => $fixado ? 1 : 0,
            'tags'       => $tags ?: null,
            'id'         => $noteId,
            'usuario_id' => $userId
        ]);

        Response::success(null, 'Nota atualizada com sucesso!');
    }

    public function destroy(Request $request, string $id): void
    {
        $userId = $this->getUserId();
        $noteId = (int)$id;

        $stmt = $this->pdo->prepare("UPDATE notas SET deletado_em = NOW() WHERE id = :id AND usuario_id = :usuario_id");
        $stmt->execute(['id' => $noteId, 'usuario_id' => $userId]);

        Response::success(null, 'Nota removida com sucesso!');
    }
}
