<?php
declare(strict_types=1);

namespace Aires\Controllers;

use Aires\Core\Database;
use Aires\Core\Request;
use Aires\Core\Response;
use PDO;

final class StartupAuditoriaController
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
        $entidade = trim((string)$request->get('entidade', ''));
        $acao = trim((string)$request->get('acao', ''));

        $sql = "
            SELECT a.*, u.nome AS usuario_nome, u.email AS usuario_email
            FROM startup_auditoria a
            LEFT JOIN usuarios u ON u.id = a.usuario_id
            WHERE a.usuario_id = :uid
        ";
        $params = ['uid' => $userId];

        if ($entidade !== '') {
            $sql .= " AND a.entidade = :entidade";
            $params['entidade'] = $entidade;
        }

        if ($acao !== '') {
            $sql .= " AND a.acao = :acao";
            $params['acao'] = $acao;
        }

        $sql .= " ORDER BY a.criado_em DESC, a.id DESC LIMIT 100";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $formatted = array_map(function ($log) {
            $detalhes = null;
            if (!empty($log['detalhes'])) {
                $detalhes = json_decode($log['detalhes'], true);
            }
            return array_merge($log, [
                'detalhes_json' => $detalhes
            ]);
        }, $logs);

        Response::json([
            'sucesso' => true,
            'logs'    => $formatted,
            'total'   => count($formatted)
        ]);
    }
}
