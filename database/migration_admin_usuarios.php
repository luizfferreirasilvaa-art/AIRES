<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/config/config.php';

use Aires\Core\Database;

try {
    $pdo = Database::getInstance()->getConnection();
} catch (\Throwable $e) {
    echo "Aviso de conexão com banco de dados: " . $e->getMessage() . "\n";
    exit(0);
}

echo "Iniciando migração de Controle de Acesso e Gestão de Usuários...\n";

// 1. Verificar e adicionar colunas na tabela usuarios
$colunasExistentes = [];
try {
    $stmt = $pdo->query("SHOW COLUMNS FROM `usuarios`");
    $colunasExistentes = $stmt->fetchAll(PDO::FETCH_COLUMN);
} catch (\Throwable $e) {
    echo "Aviso ao verificar colunas de usuarios: " . $e->getMessage() . "\n";
}

if (!in_array('perfil', $colunasExistentes, true)) {
    $pdo->exec("ALTER TABLE `usuarios` ADD COLUMN `perfil` VARCHAR(50) NOT NULL DEFAULT 'usuario' AFTER `senha_hash`");
    echo "✓ Coluna 'perfil' adicionada na tabela usuarios.\n";
} else {
    echo "• Coluna 'perfil' já existe.\n";
}

if (!in_array('status', $colunasExistentes, true)) {
    $pdo->exec("ALTER TABLE `usuarios` ADD COLUMN `status` VARCHAR(30) NOT NULL DEFAULT 'ativo' AFTER `perfil`");
    echo "✓ Coluna 'status' adicionada na tabela usuarios.\n";
} else {
    echo "• Coluna 'status' já existe.\n";
}

if (!in_array('paginas_permitidas', $colunasExistentes, true)) {
    $pdo->exec("ALTER TABLE `usuarios` ADD COLUMN `paginas_permitidas` TEXT NULL DEFAULT NULL AFTER `status`");
    echo "✓ Coluna 'paginas_permitidas' adicionada na tabela usuarios.\n";
} else {
    echo "• Coluna 'paginas_permitidas' já existe.\n";
}

// 2. Garantir que o usuário master (id=1 ou admin@aires.io) seja administrador ativo com acesso irrestrito
$stmtAdmin = $pdo->prepare("UPDATE `usuarios` SET `perfil` = 'admin', `status` = 'ativo' WHERE `id` = 1 OR `email` = 'admin@aires.io'");
$stmtAdmin->execute();
echo "✓ Usuário master verificado como Administrador ativo.\n";

echo "Migração de Controle de Acessos concluída com sucesso!\n";

