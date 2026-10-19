<?php
declare(strict_types=1);

namespace Aires\Core;

use PDO;
use PDOException;
use RuntimeException;

/**
 * Singleton de Conexão Segura com Banco de Dados MySQL
 */
final class Database
{
    private static ?Database $instance = null;
    private PDO $connection;

    private function __construct()
    {
        $dsn = sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=%s',
            DB_HOST,
            DB_PORT,
            DB_NAME,
            DB_CHARSET
        );

        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
        ];

        // Suporte automático a conexões TLS/SSL (exigido por TiDB Cloud, Aiven, etc.)
        $caPaths = [
            '/etc/ssl/certs/ca-certificates.crt', // Linux / Docker (Alpine, Ubuntu, Render)
            'C:\\laragon\\etc\\ssl\\cacert.pem',  // Windows / Laragon
        ];
        $caBundle = null;
        foreach ($caPaths as $path) {
            if (file_exists($path)) {
                $caBundle = $path;
                break;
            }
        }

        if (getenv('DB_SSL') === 'true' || DB_PORT === 4000 || ($caBundle !== null && DB_HOST !== '127.0.0.1' && DB_HOST !== 'localhost')) {
            if ($caBundle !== null) {
                $options[PDO::MYSQL_ATTR_SSL_CA] = $caBundle;
            }
            $options[PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT] = false;
        }

        try {
            $this->connection = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            throw new RuntimeException("Falha na conexão com o banco de dados: " . $e->getMessage(), (int)$e->getCode());
        }
    }

    public static function getInstance(): self
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function getConnection(): PDO
    {
        return $this->connection;
    }

    public function beginTransaction(): bool
    {
        return $this->connection->beginTransaction();
    }

    public function commit(): bool
    {
        return $this->connection->commit();
    }

    public function rollBack(): bool
    {
        if ($this->connection->inTransaction()) {
            return $this->connection->rollBack();
        }
        return false;
    }

    public function transaction(callable $callback): mixed
    {
        $this->beginTransaction();
        try {
            $result = $callback();
            $this->commit();
            return $result;
        } catch (\Throwable $e) {
            $this->rollBack();
            throw $e;
        }
    }

    private function __clone() {}
    public function __wakeup()
    {
        throw new RuntimeException("Não é permitido desserializar Singleton.");
    }
}

