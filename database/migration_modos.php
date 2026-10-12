<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/config/config.php';

use Aires\Core\Database;

$pdo = Database::getInstance()->getConnection();

// 1. Criar tabela `modos` se não existir
$pdo->exec("
CREATE TABLE IF NOT EXISTS `modos` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `usuario_id` INT NOT NULL,
    `slug` VARCHAR(50) NOT NULL,
    `nome` VARCHAR(100) NOT NULL,
    `icone` VARCHAR(20) NOT NULL DEFAULT '💼',
    `cor` VARCHAR(30) NOT NULL DEFAULT 'purple',
    `ordem` INT NOT NULL DEFAULT 0,
    `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_modos_usuario` (`usuario_id`),
    CONSTRAINT `fk_modos_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
");

// 2. Adicionar coluna `modo` na tabela `tarefas` se não existir
$cols = $pdo->query("SHOW COLUMNS FROM `tarefas` LIKE 'modo'")->fetchAll();
if (empty($cols)) {
    $pdo->exec("ALTER TABLE `tarefas` ADD COLUMN `modo` VARCHAR(50) NOT NULL DEFAULT 'trabalho' AFTER `missao_id`");
    $pdo->exec("ALTER TABLE `tarefas` ADD INDEX `idx_tarefas_modo` (`usuario_id`, `modo`)");
    echo "Coluna 'modo' adicionada em tarefas.\n";
} else {
    echo "Coluna 'modo' já existe em tarefas.\n";
}

// 3. Inserir modos padrões para usuários existentes
$users = $pdo->query("SELECT id FROM usuarios")->fetchAll(PDO::FETCH_COLUMN);
foreach ($users as $userId) {
    $existing = $pdo->prepare("SELECT COUNT(*) FROM modos WHERE usuario_id = :id");
    $existing->execute(['id' => $userId]);
    if ((int)$existing->fetchColumn() === 0) {
        $insert = $pdo->prepare("INSERT INTO modos (usuario_id, slug, nome, icone, cor, ordem) VALUES (:uid, :slug, :nome, :icone, :cor, :ordem)");
        $insert->execute(['uid' => $userId, 'slug' => 'trabalho', 'nome' => 'Trabalho', 'icone' => '💼', 'cor' => 'purple', 'ordem' => 1]);
        $insert->execute(['uid' => $userId, 'slug' => 'pessoal', 'nome' => 'Pessoal', 'icone' => '👤', 'cor' => 'orange', 'ordem' => 2]);
        $insert->execute(['uid' => $userId, 'slug' => 'empresarial', 'nome' => 'Empresarial', 'icone' => '🏢', 'cor' => 'cyan', 'ordem' => 3]);
        echo "Modos padrões criados para o usuário $userId.\n";
    }
}

echo "Migração de modos concluída com sucesso!\n";
