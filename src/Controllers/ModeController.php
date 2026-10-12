<?php
declare(strict_types=1);

namespace Aires\Controllers;

use Aires\Core\Database;
use Aires\Core\Request;
use Aires\Core\Response;
use PDO;

final class ModeController
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

        // Garantir que os modos padrões existam
        $this->ensureDefaultModes($userId);

        $stmt = $this->pdo->prepare("
            SELECT m.*,
                   (SELECT COUNT(*) 
                    FROM tarefas t 
                    WHERE t.usuario_id = m.usuario_id 
                      AND t.modo = m.slug 
                      AND t.deletado_em IS NULL 
                      AND t.status != 'feito') AS tarefas_ativas
            FROM modos m
            WHERE m.usuario_id = :usuario_id
            ORDER BY m.ordem ASC, m.id ASC
        ");
        $stmt->execute(['usuario_id' => $userId]);
        $modos = $stmt->fetchAll(PDO::FETCH_ASSOC);

        Response::json([
            'sucesso' => true,
            'modos'   => $modos
        ]);
    }

    public function store(Request $request): void
    {
        $userId = $this->getUserId();
        $nome = trim((string)$request->input('nome', ''));

        if ($nome === '') {
            Response::error('O nome do modo é obrigatório', 422);
            return;
        }

        $icone = trim((string)$request->input('icone', '🎯')) ?: '🎯';
        $cor = trim((string)$request->input('cor', 'lime')) ?: 'lime';

        // Gerar slug amigável
        $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $nome), '-'));
        if ($slug === '') {
            $slug = 'modo-' . time();
        }

        // Verificar se já existe slug para este usuário
        $stmtCheck = $this->pdo->prepare("SELECT COUNT(*) FROM modos WHERE usuario_id = :uid AND slug = :slug");
        $stmtCheck->execute(['uid' => $userId, 'slug' => $slug]);
        if ((int)$stmtCheck->fetchColumn() > 0) {
            $slug .= '-' . rand(10, 99);
        }

        $stmtOrdem = $this->pdo->prepare("SELECT COALESCE(MAX(ordem), 0) + 1 FROM modos WHERE usuario_id = :uid");
        $stmtOrdem->execute(['uid' => $userId]);
        $ordem = (int)$stmtOrdem->fetchColumn();

        $stmtInsert = $this->pdo->prepare("
            INSERT INTO modos (usuario_id, slug, nome, icone, cor, ordem)
            VALUES (:uid, :slug, :nome, :icone, :cor, :ordem)
        ");
        $stmtInsert->execute([
            'uid'   => $userId,
            'slug'  => $slug,
            'nome'  => $nome,
            'icone' => $icone,
            'cor'   => $cor,
            'ordem' => $ordem
        ]);

        $id = (int)$this->pdo->lastInsertId();

        Response::json([
            'sucesso'  => true,
            'mensagem' => 'Modo criado com sucesso!',
            'modo'     => [
                'id'             => $id,
                'slug'           => $slug,
                'nome'           => $nome,
                'icone'          => $icone,
                'cor'            => $cor,
                'tarefas_ativas' => 0
            ]
        ], 201);
    }

    public function destroy(Request $request, array $params = []): void
    {
        $userId = $this->getUserId();
        $id = (int)($params['id'] ?? $request->input('id', 0));

        // Impedir deletar se só restar 1 modo
        $stmtTotal = $this->pdo->prepare("SELECT COUNT(*) FROM modos WHERE usuario_id = :uid");
        $stmtTotal->execute(['uid' => $userId]);
        if ((int)$stmtTotal->fetchColumn() <= 1) {
            Response::error('Você deve manter pelo menos um modo ativo.', 400);
            return;
        }

        $stmtDelete = $this->pdo->prepare("DELETE FROM modos WHERE id = :id AND usuario_id = :uid");
        $stmtDelete->execute(['id' => $id, 'uid' => $userId]);

        Response::json([
            'sucesso'  => true,
            'mensagem' => 'Modo removido com sucesso!'
        ]);
    }

    private function ensureDefaultModes(int $userId): void
    {
        $stmt = $this->pdo->prepare("SELECT COUNT(*) FROM modos WHERE usuario_id = :uid");
        $stmt->execute(['uid' => $userId]);
        if ((int)$stmt->fetchColumn() === 0) {
            $insert = $this->pdo->prepare("INSERT INTO modos (usuario_id, slug, nome, icone, cor, ordem) VALUES (:uid, :slug, :nome, :icone, :cor, :ordem)");
            $insert->execute(['uid' => $userId, 'slug' => 'trabalho', 'nome' => 'Trabalho', 'icone' => '💼', 'cor' => 'purple', 'ordem' => 1]);
            $insert->execute(['uid' => $userId, 'slug' => 'pessoal', 'nome' => 'Pessoal', 'icone' => '👤', 'cor' => 'orange', 'ordem' => 2]);
            $insert->execute(['uid' => $userId, 'slug' => 'empresarial', 'nome' => 'Empresarial', 'icone' => '🏢', 'cor' => 'cyan', 'ordem' => 3]);
        }
    }
}
