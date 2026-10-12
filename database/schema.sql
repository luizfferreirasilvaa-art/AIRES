-- AIRES - Schema Relacional do Banco de Dados
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS `usuarios` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `nome` VARCHAR(150) NOT NULL,
    `email` VARCHAR(191) NOT NULL UNIQUE,
    `senha_hash` VARCHAR(255) NOT NULL,
    `xp` INT NOT NULL DEFAULT 0,
    `streak_dias` INT NOT NULL DEFAULT 1,
    `ultimo_dia_produtivo` DATE NULL,
    `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deletado_em` TIMESTAMP NULL DEFAULT NULL,
    INDEX `idx_usuario_email` (`email`),
    INDEX `idx_usuario_deletado` (`deletado_em`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sessoes` (
    `id` VARCHAR(128) NOT NULL PRIMARY KEY,
    `usuario_id` INT NULL,
    `dados` MEDIUMTEXT NOT NULL,
    `ultimo_acesso` INT UNSIGNED NOT NULL,
    `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_sessoes_ultimo_acesso` (`ultimo_acesso`),
    CONSTRAINT `fk_sessoes_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `missoes` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `usuario_id` INT NOT NULL,
    `titulo` VARCHAR(255) NOT NULL,
    `descricao` TEXT NULL,
    `status` ENUM('planejada', 'em_andamento', 'concluida', 'cancelada') NOT NULL DEFAULT 'em_andamento',
    `progresso` TINYINT UNSIGNED NOT NULL DEFAULT 0,
    `data_limite` DATE NULL,
    `orcamento_estimado` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `cor` VARCHAR(30) NOT NULL DEFAULT 'indigo',
    `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deletado_em` TIMESTAMP NULL DEFAULT NULL,
    INDEX `idx_missoes_usuario` (`usuario_id`, `status`),
    INDEX `idx_missoes_deletado` (`deletado_em`),
    CONSTRAINT `fk_missoes_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

CREATE TABLE IF NOT EXISTS `tarefas` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `usuario_id` INT NOT NULL,
    `missao_id` INT NULL,
    `modo` VARCHAR(50) NOT NULL DEFAULT 'trabalho',
    `titulo` VARCHAR(255) NOT NULL,
    `descricao` MEDIUMTEXT NULL,
    `prioridade` ENUM('critica', 'alta', 'media', 'baixa') NOT NULL DEFAULT 'media',
    `status` ENUM('planejamento', 'a_fazer', 'fazendo', 'feito') NOT NULL DEFAULT 'planejamento',
    `ordem` INT NOT NULL DEFAULT 0,
    `inbox` TINYINT(1) NOT NULL DEFAULT 0,
    `data_inicio` DATETIME NULL,
    `data_entrega` DATETIME NULL,
    `concluida_em` DATETIME NULL,
    `endereco_local` VARCHAR(255) NULL,
    `exige_veiculo` TINYINT(1) NOT NULL DEFAULT 0,
    `tempo_viagem_minutos` INT UNSIGNED NOT NULL DEFAULT 0,
    `antecedencia_aviso_minutos` INT UNSIGNED NOT NULL DEFAULT 0,
    `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deletado_em` TIMESTAMP NULL DEFAULT NULL,
    INDEX `idx_tarefas_usuario_status` (`usuario_id`, `status`, `deletado_em`),
    INDEX `idx_tarefas_modo` (`usuario_id`, `modo`),
    INDEX `idx_tarefas_datas` (`usuario_id`, `data_inicio`, `data_entrega`),
    INDEX `idx_tarefas_inbox` (`usuario_id`, `inbox`),
    INDEX `idx_tarefas_missao` (`missao_id`),
    CONSTRAINT `fk_tarefas_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_tarefas_missao` FOREIGN KEY (`missao_id`) REFERENCES `missoes`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `subtarefas` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `tarefa_id` INT NOT NULL,
    `titulo` VARCHAR(255) NOT NULL,
    `concluida` TINYINT(1) NOT NULL DEFAULT 0,
    `ordem` INT NOT NULL DEFAULT 0,
    `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deletado_em` TIMESTAMP NULL DEFAULT NULL,
    INDEX `idx_subtarefas_tarefa` (`tarefa_id`, `deletado_em`),
    CONSTRAINT `fk_subtarefas_tarefa` FOREIGN KEY (`tarefa_id`) REFERENCES `tarefas`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `alertas_notificacoes` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `usuario_id` INT NOT NULL,
    `tarefa_id` INT NOT NULL,
    `horario_disparo` DATETIME NOT NULL,
    `canal` ENUM('sistema', 'email', 'telegram') NOT NULL DEFAULT 'sistema',
    `disparado` TINYINT(1) NOT NULL DEFAULT 0,
    `lido` TINYINT(1) NOT NULL DEFAULT 0,
    `mensagem` VARCHAR(255) NOT NULL,
    `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `deletado_em` TIMESTAMP NULL DEFAULT NULL,
    INDEX `idx_alertas_pendentes` (`usuario_id`, `disparado`, `lido`, `horario_disparo`),
    CONSTRAINT `fk_alertas_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_alertas_tarefa` FOREIGN KEY (`tarefa_id`) REFERENCES `tarefas`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `notas` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `usuario_id` INT NOT NULL,
    `missao_id` INT NULL,
    `tarefa_id` INT NULL,
    `titulo` VARCHAR(255) NOT NULL,
    `conteudo` MEDIUMTEXT NULL,
    `fixado` TINYINT(1) NOT NULL DEFAULT 0,
    `tags` VARCHAR(255) NULL,
    `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deletado_em` TIMESTAMP NULL DEFAULT NULL,
    INDEX `idx_notas_usuario` (`usuario_id`, `fixado`, `deletado_em`),
    CONSTRAINT `fk_notas_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_notas_missao` FOREIGN KEY (`missao_id`) REFERENCES `missoes`(`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_notas_tarefa` FOREIGN KEY (`tarefa_id`) REFERENCES `tarefas`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
