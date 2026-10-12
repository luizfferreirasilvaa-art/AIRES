<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/config/config.php';

use Aires\Core\Database;

try {
    $db = Database::getInstance();
    $pdo = $db->getConnection();

    $schemaSql = file_get_contents(__DIR__ . '/schema.sql');
    $pdo->exec($schemaSql);

    $seedSql = file_get_contents(__DIR__ . '/seed.sql');
    $pdo->exec($seedSql);

    echo "Migração executada com sucesso!" . PHP_EOL;
} catch (Throwable $e) {
    echo "ERRO: " . $e->getMessage() . PHP_EOL;
    exit(1);
}
