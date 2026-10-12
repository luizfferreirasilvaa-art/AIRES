<?php
declare(strict_types=1);

namespace Aires\Core;

use PDO;
use SessionHandlerInterface;

/**
 * Gerenciador de Sessões persistido no Banco de Dados MySQL
 */
final class SessionHandler implements SessionHandlerInterface
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getInstance()->getConnection();
    }

    public static function start(): void
    {
        if (session_status() === PHP_SESSION_NONE) {
            $handler = new self();
            session_set_save_handler($handler, true);
            
            $isHttps = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ||
                       (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');

            session_set_cookie_params([
                'lifetime' => SESSION_LIFETIME,
                'path'     => '/',
                'domain'   => '',
                'secure'   => $isHttps,
                'httponly' => true,
                'samesite' => 'Lax'
            ]);

            session_start();
        }
    }

    public function open(string $path, string $name): bool
    {
        return true;
    }

    public function close(): bool
    {
        return true;
    }

    public function read(string $id): string|false
    {
        try {
            $stmt = $this->pdo->prepare("SELECT dados FROM sessoes WHERE id = :id LIMIT 1");
            $stmt->execute(['id' => $id]);
            $row = $stmt->fetch();

            if ($row) {
                return (string)$row['dados'];
            }
        } catch (\Throwable $e) {
            error_log("Erro ao ler sessão: " . $e->getMessage());
        }

        return '';
    }

    public function write(string $id, string $data): bool
    {
        try {
            $userId = isset($_SESSION['usuario_id']) ? (int)$_SESSION['usuario_id'] : null;
            $time = time();

            $sql = "INSERT INTO sessoes (id, usuario_id, dados, ultimo_acesso) 
                    VALUES (:id, :usuario_id, :dados, :ultimo_acesso)
                    ON DUPLICATE KEY UPDATE 
                        usuario_id = VALUES(usuario_id),
                        dados = VALUES(dados),
                        ultimo_acesso = VALUES(ultimo_acesso)";

            $stmt = $this->pdo->prepare($sql);
            return $stmt->execute([
                'id'            => $id,
                'usuario_id'    => $userId,
                'dados'         => $data,
                'ultimo_acesso' => $time
            ]);
        } catch (\Throwable $e) {
            error_log("Erro ao escrever sessão: " . $e->getMessage());
            return false;
        }
    }

    public function destroy(string $id): bool
    {
        try {
            $stmt = $this->pdo->prepare("DELETE FROM sessoes WHERE id = :id");
            return $stmt->execute(['id' => $id]);
        } catch (\Throwable $e) {
            error_log("Erro ao destruir sessão: " . $e->getMessage());
            return false;
        }
    }

    public function gc(int $max_lifetime): int|false
    {
        try {
            $cutoff = time() - $max_lifetime;
            $stmt = $this->pdo->prepare("DELETE FROM sessoes WHERE ultimo_acesso < :cutoff");
            $stmt->execute(['cutoff' => $cutoff]);
            return $stmt->rowCount();
        } catch (\Throwable $e) {
            error_log("Erro no garbage collector de sessões: " . $e->getMessage());
            return false;
        }
    }
}
