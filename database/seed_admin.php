<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/config.php';

use Aires\Core\Database;

$pdo = Database::getInstance()->getConnection();

$hash = password_hash('admin123', PASSWORD_BCRYPT);

// Atualizar ou inserir admin
$stmt = $pdo->prepare("SELECT id FROM usuarios WHERE id = 1 LIMIT 1");
$stmt->execute();
$exists = $stmt->fetch();

if ($exists) {
    $stmtUp = $pdo->prepare("UPDATE usuarios SET nome = 'Administrador', email = 'admin@aires.io', senha_hash = :hash WHERE id = 1");
    $stmtUp->execute(['hash' => $hash]);
    echo "Admin atualizado com sucesso no ID 1.\n";
} else {
    $stmtIn = $pdo->prepare("INSERT INTO usuarios (id, nome, email, senha_hash, xp, streak_dias) VALUES (1, 'Administrador', 'admin@aires.io', :hash, 0, 1)");
    $stmtIn->execute(['hash' => $hash]);
    echo "Admin criado com sucesso no ID 1.\n";
}

$stmtCheck = $pdo->query("SELECT id, nome, email FROM usuarios WHERE id = 1");
print_r($stmtCheck->fetch(PDO::FETCH_ASSOC));
