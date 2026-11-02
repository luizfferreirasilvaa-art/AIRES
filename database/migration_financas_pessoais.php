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

// Seed da configuração
$configExist = (int)$pdo->query("SELECT COUNT(*) FROM financas_pessoais_config WHERE usuario_id = {$uid}")->fetchColumn();
if ($configExist === 0) {
    $pdo->exec("
        INSERT INTO financas_pessoais_config (usuario_id, teto_gastos_mensal, renda_mensal_estimada, alerta_percentual)
        VALUES ({$uid}, 4500.00, 6500.00, 90)
    ");
    echo "✓ Configuração orçamentária pessoal padrão inicializada (Teto: R$ 4.500,00).\n";
}

// Seed de itens demonstrativos de despesas se vazia
$totalItens = (int)$pdo->query("SELECT COUNT(*) FROM financas_pessoais_itens WHERE deletado_em IS NULL")->fetchColumn();
if ($totalItens === 0) {
    $hoje = date('Y-m-d');

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

// Seed de investimentos demonstrativos se vazia
$totalInvest = (int)$pdo->query("SELECT COUNT(*) FROM financas_investimentos WHERE deletado_em IS NULL")->fetchColumn();
if ($totalInvest === 0) {
    $dataHoje = date('Y-m-d');
    $seisMesesAtras = date('Y-m-d', strtotime('-6 months'));

    $stmtInv = $pdo->prepare("
        INSERT INTO financas_investimentos (
            usuario_id, nome, tipo, instituicao, valor_atual, valor_aplicado,
            aporte_mensal, meta_valor, rentabilidade_anual, liquidez, data_inicio, status, observacoes
        ) VALUES (
            :uid, :nome, :tipo, :inst, :vat, :vap,
            :aporte, :meta, :rent, :liq, :dt_ini, 'ativo', :obs
        )
    ");

    $investDemo = [
        [
            'uid' => $uid, 'nome' => 'Reserva de Emergência (Caixinha)',
            'tipo' => 'reserva_emergencia', 'inst' => 'Nubank',
            'vat' => 16250.00, 'vap' => 15000.00, 'aporte' => 600.00, 'meta' => 25000.00,
            'rent' => 10.75, 'liq' => 'Imediata (D+0)', 'dt_ini' => $seisMesesAtras,
            'obs' => 'Garante 6 meses de custos fixos essenciais.'
        ],
        [
            'uid' => $uid, 'nome' => 'Tesouro Selic 2029',
            'tipo' => 'renda_fixa', 'inst' => 'XP Investimentos',
            'vat' => 8950.00, 'vap' => 8400.00, 'aporte' => 400.00, 'meta' => 20000.00,
            'rent' => 10.65, 'liq' => 'D+1 útil', 'dt_ini' => $seisMesesAtras,
            'obs' => 'Título público pós-fixado seguro.'
        ],
        [
            'uid' => $uid, 'nome' => 'Fundo Imobiliário Logístico (HGLG11)',
            'tipo' => 'fundos_imobiliarios', 'inst' => 'Banco Inter',
            'vat' => 4600.00, 'vap' => 4200.00, 'aporte' => 300.00, 'meta' => 15000.00,
            'rent' => 8.90, 'liq' => 'D+2 útil', 'dt_ini' => $seisMesesAtras,
            'obs' => 'Rendimento de dividendos isentos de IR caindo todo mês.'
        ]
    ];

    foreach ($investDemo as $inv) {
        $stmtInv->execute($inv);
        $idCriado = (int)$pdo->lastInsertId();

        $pdo->prepare("
            INSERT INTO financas_investimentos_movimentacoes (investimento_id, usuario_id, tipo, valor, data_movimentacao, observacoes)
            VALUES (?, ?, 'aporte', ?, ?, 'Aporte inicial')
        ")->execute([$idCriado, $uid, $inv['vap'], $inv['dt_ini']]);

        $lucro = $inv['vat'] - $inv['vap'];
        if ($lucro > 0) {
            $pdo->prepare("
                INSERT INTO financas_investimentos_movimentacoes (investimento_id, usuario_id, tipo, valor, data_movimentacao, observacoes)
                VALUES (?, ?, 'rendimento', ?, ?, 'Rendimento acumulado')
            ")->execute([$idCriado, $uid, $lucro, $dataHoje]);
        }
    }

    echo "✓ 3 investimentos e reservas demonstrativas inseridas (Reserva Nubank, Tesouro Selic, FII HGLG11).\n";
}

echo "Migração de Finanças Pessoais & Investimentos concluída com sucesso!\n";
