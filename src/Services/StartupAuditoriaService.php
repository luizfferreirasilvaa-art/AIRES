<?php
declare(strict_types=1);

namespace Aires\Services;

use Aires\Core\Database;
use PDO;

final class StartupAuditoriaService
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getInstance()->getConnection();
    }

    public function registrar(int $usuarioId, string $acao, string $entidade, int $entidadeId, array $detalhes = []): void
    {
        try {
            $stmt = $this->pdo->prepare("
                INSERT INTO startup_auditoria (usuario_id, acao, entidade, entidade_id, detalhes, ip_address)
                VALUES (:uid, :acao, :entidade, :eid, :detalhes, :ip)
            ");
            $stmt->execute([
                'uid'      => $usuarioId,
                'acao'     => $acao,
                'entidade' => $entidade,
                'eid'      => $entidadeId,
                'detalhes' => json_encode($detalhes, JSON_UNESCAPED_UNICODE),
                'ip'       => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
            ]);
        } catch (\Throwable $e) {
            error_log("[StartupAuditoriaService] Falha ao registrar log: " . $e->getMessage());
        }
    }
}
