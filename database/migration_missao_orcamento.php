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

echo "Iniciando migração de Orçamento de Missões Estratégicas...\n";

// Criação da tabela missao_orcamento_itens
$pdo->exec("
CREATE TABLE IF NOT EXISTS `missao_orcamento_itens` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `usuario_id` INT NOT NULL,
    `missao_id` INT NOT NULL,
    `item` VARCHAR(255) NOT NULL,
    `categoria` VARCHAR(50) NOT NULL DEFAULT 'outros',
    `valor_total` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `qtd_parcelas` INT NOT NULL DEFAULT 1,
    `valor_parcela` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `parcelas_pagas` INT NOT NULL DEFAULT 0,
    `forma_pagamento` VARCHAR(50) NOT NULL DEFAULT 'pix',
    `data_primeiro_vencimento` DATE NOT NULL,
    `status` ENUM('planejado', 'aprovado', 'em_pagamento', 'quitado', 'cancelado') NOT NULL DEFAULT 'planejado',
    `fornecedor` VARCHAR(150) NULL,
    `link_comprovante` VARCHAR(255) NULL,
    `observacoes` TEXT NULL,
    `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deletado_em` TIMESTAMP NULL DEFAULT NULL,
    INDEX `idx_moi_missao_status` (`missao_id`, `status`),
    INDEX `idx_moi_usuario` (`usuario_id`),
    INDEX `idx_moi_vencimento` (`data_primeiro_vencimento`),
    INDEX `idx_moi_deletado` (`deletado_em`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
");
echo "✓ Tabela missao_orcamento_itens verificada/criada.\n";
echo "Migração concluída com sucesso!\n";
