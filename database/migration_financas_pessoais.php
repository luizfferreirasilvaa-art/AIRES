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

echo "Iniciando migração do Módulo de Finanças Pessoais & Metas...\n";

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

// 2. Tabela de Itens Financeiros Pessoais
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

// Obter usuário padrão
$usuario = $pdo->query("SELECT id FROM usuarios ORDER BY id ASC LIMIT 1")->fetch(PDO::FETCH_ASSOC);
$uid = $usuario ? (int)$usuario['id'] : 1;

// Seed da configuração
$configExist = (int)$pdo->query("SELECT COUNT(*) FROM financas_pessoais_config WHERE usuario_id = {$uid}")->fetchColumn();
if ($configExist === 0) {
    $pdo->exec("
        INSERT INTO financas_pessoais_config (usuario_id, teto_gastos_mensal, renda_mensal_estimada, alerta_percentual)
        VALUES ({$uid}, 4500.00, 6500.00, 90)
    ");
    echo "✓ Configuração orçamentária pessoal padrão inicializada (Teto: R$ 4.500,00).\n";
}

// Seed de itens demonstrativos se vazia
$totalItens = (int)$pdo->query("SELECT COUNT(*) FROM financas_pessoais_itens WHERE deletado_em IS NULL")->fetchColumn();
if ($totalItens === 0) {
    $hoje = date('Y-m-d');
    $mesQueVem = date('Y-m-10', strtotime('+1 month'));

    $stmtInsert = $pdo->prepare("
        INSERT INTO financas_pessoais_itens (
            usuario_id, nome, categoria, tipo, valor_total, qtd_parcelas,
            valor_parcela, parcelas_pagas, data_primeiro_vencimento, dia_vencimento_fixo,
            forma_pagamento, status, meta_relacionada, observacoes
        ) VALUES (
            :uid, :nome, :cat, :tipo, :tot, :qtd_p,
            :v_p, :pagas, :dt_venc, :dia_f,
            :forma, :st, :meta, :obs
        )
    ");

    $itensDemo = [
        [
            'uid' => $uid, 'nome' => 'Aluguel & Condomínio Apartamento',
            'cat' => 'moradia', 'tipo' => 'fixo_mensal', 'tot' => 1850.00, 'qtd_p' => 1,
            'v_p' => 1850.00, 'pagas' => 0, 'dt_venc' => $hoje, 'dia_f' => 10,
            'forma' => 'boleto', 'st' => 'ativo', 'meta' => 'Moradia & Estabilidade',
            'obs' => 'Vencimento todo dia 10.'
        ],
        [
            'uid' => $uid, 'nome' => 'Geladeira Frost Free Inox 400L',
            'cat' => 'eletrodomestico', 'tipo' => 'parcelado', 'tot' => 3200.00, 'qtd_p' => 10,
            'v_p' => 320.00, 'pagas' => 2, 'dt_venc' => $hoje, 'dia_f' => 15,
            'forma' => 'cartao', 'st' => 'ativo', 'meta' => 'Equipar Cozinha Nova',
            'obs' => 'Parcelado em 10x sem juros no cartão.'
        ],
        [
            'uid' => $uid, 'nome' => 'Internet Fibra Óptica 600MB',
            'cat' => 'servicos', 'tipo' => 'fixo_mensal', 'tot' => 149.90, 'qtd_p' => 1,
            'v_p' => 149.90, 'pagas' => 0, 'dt_venc' => $hoje, 'dia_f' => 15,
            'forma' => 'debito_automatico', 'st' => 'ativo', 'meta' => 'Home Office & Conexão',
            'obs' => 'Débito automático no banco.'
        ],
        [
            'uid' => $uid, 'nome' => 'Curso de Especialização & MBA',
            'cat' => 'educacao', 'tipo' => 'parcelado', 'tot' => 4800.00, 'qtd_p' => 12,
            'v_p' => 400.00, 'pagas' => 3, 'dt_venc' => $hoje, 'dia_f' => 5,
            'forma' => 'boleto', 'st' => 'ativo', 'meta' => 'Evolução na Carreira',
            'obs' => 'Plataforma de ensino executivo.'
        ]
    ];

    foreach ($itensDemo as $d) {
        $stmtInsert->execute($d);
    }
    echo "✓ 4 itens demonstrativos pessoais inseridos (Aluguel, Geladeira 10x, Internet, MBA 12x).\n";
}

echo "Migração de Finanças Pessoais concluída com sucesso!\n";
