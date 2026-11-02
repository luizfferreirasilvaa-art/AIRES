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

echo "Iniciando migração do Módulo de Finanças Pessoais, Metas & Investimentos...\n";

// 1. Tabela de Configuração Pessoal
$pdo->exec("
CREATE TABLE IF NOT EXISTS `financas_pessoais_config` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `usuario_id` INT NOT NULL UNIQUE,
    `teto_gastos_mensal` DECIMAL(12,2) NOT NULL DEFAULT 5000.00,
    `renda_mensal_estimada` DECIMAL(12,2) NOT NULL DEFAULT 6000.00,
    `alerta_percentual` INT NOT NULL DEFAULT 90,
    `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_fpc_usuario` (`usuario_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
");
echo "✓ Tabela financas_pessoais_config verificada/criada.\n";

// 2. Tabela de Itens Financeiros Pessoais (Fixos & Metas Parceladas)
$pdo->exec("
CREATE TABLE IF NOT EXISTS `financas_pessoais_itens` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `usuario_id` INT NOT NULL,
    `nome` VARCHAR(255) NOT NULL,
    `categoria` VARCHAR(50) NOT NULL DEFAULT 'outros',
    `tipo` ENUM('fixo_mensal', 'parcelado', 'avulso') NOT NULL DEFAULT 'fixo_mensal',
    `valor_total` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `qtd_parcelas` INT NOT NULL DEFAULT 1,
    `valor_parcela` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `parcelas_pagas` INT NOT NULL DEFAULT 0,
    `data_primeiro_vencimento` DATE NOT NULL,
    `dia_vencimento_fixo` INT NOT NULL DEFAULT 10,
    `forma_pagamento` VARCHAR(50) NOT NULL DEFAULT 'boleto',
    `status` ENUM('ativo', 'planejado', 'pausado', 'quitado', 'cancelado') NOT NULL DEFAULT 'ativo',
    `meta_relacionada` VARCHAR(255) NULL,
    `observacoes` TEXT NULL,
    `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deletado_em` TIMESTAMP NULL DEFAULT NULL,
    INDEX `idx_fpi_usuario_status` (`usuario_id`, `status`),
    INDEX `idx_fpi_tipo` (`tipo`),
    INDEX `idx_fpi_vencimento` (`data_primeiro_vencimento`),
    INDEX `idx_fpi_deletado` (`deletado_em`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
");
echo "✓ Tabela financas_pessoais_itens verificada/criada.\n";

// 3. Tabela de Investimentos, Reservas e Economias Acumuladas
$pdo->exec("
CREATE TABLE IF NOT EXISTS `financas_investimentos` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `usuario_id` INT NOT NULL,
    `nome` VARCHAR(255) NOT NULL,
    `tipo` ENUM('reserva_emergencia', 'renda_fixa', 'fundos_imobiliarios', 'acoes', 'cripto', 'previdencia', 'outro') NOT NULL DEFAULT 'renda_fixa',
    `instituicao` VARCHAR(100) NULL,
    `valor_atual` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `valor_aplicado` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `aporte_mensal` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `meta_valor` DECIMAL(12,2) NULL,
    `rentabilidade_anual` DECIMAL(6,2) NOT NULL DEFAULT 10.00,
    `liquidez` VARCHAR(50) NOT NULL DEFAULT 'diaria',
    `data_inicio` DATE NOT NULL,
    `status` ENUM('ativo', 'resgatado', 'pausado') NOT NULL DEFAULT 'ativo',
    `observacoes` TEXT NULL,
    `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deletado_em` TIMESTAMP NULL DEFAULT NULL,
    INDEX `idx_finv_usuario_status` (`usuario_id`, `status`),
    INDEX `idx_finv_tipo` (`tipo`),
    INDEX `idx_finv_deletado` (`deletado_em`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
");
echo "✓ Tabela financas_investimentos verificada/criada.\n";

// 4. Tabela de Movimentações (Aportes, Rendimentos e Resgates)
$pdo->exec("
CREATE TABLE IF NOT EXISTS `financas_investimentos_movimentacoes` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `investimento_id` INT NOT NULL,
    `usuario_id` INT NOT NULL,
    `tipo` ENUM('aporte', 'rendimento', 'resgate') NOT NULL DEFAULT 'aporte',
    `valor` DECIMAL(12,2) NOT NULL,
    `data_movimentacao` DATE NOT NULL,
    `observacoes` VARCHAR(255) NULL,
    `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_fim_inv` (`investimento_id`),
    INDEX `idx_fim_user` (`usuario_id`, `data_movimentacao`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
");
echo "✓ Tabela financas_investimentos_movimentacoes verificada/criada.\n";

// Obter usuário padrão
$usuario = $pdo->query("SELECT id FROM usuarios ORDER BY id ASC LIMIT 1")->fetch(PDO::FETCH_ASSOC);
$uid = $usuario ? (int)$usuario['id'] : 1;

// Seed da configuração padrão se não existir
$configExist = (int)$pdo->query("SELECT COUNT(*) FROM financas_pessoais_config WHERE usuario_id = {$uid}")->fetchColumn();
if ($configExist === 0) {
    $pdo->exec("
        INSERT INTO financas_pessoais_config (usuario_id, teto_gastos_mensal, renda_mensal_estimada, alerta_percentual)
        VALUES ({$uid}, 0.00, 0.00, 90)
    ");
    echo "✓ Configuração orçamentária pessoal padrão inicializada zerada.\n";
}

echo "Migração de Finanças Pessoais & Investimentos concluída com sucesso!\n";
