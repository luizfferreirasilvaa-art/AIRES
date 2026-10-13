<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/config/config.php';

use Aires\Core\Database;

$pdo = Database::getInstance()->getConnection();

echo "Iniciando migração do módulo Startup: Energia Solar...\n";

// 1. Tabela startup_clientes
$pdo->exec("
CREATE TABLE IF NOT EXISTS `startup_clientes` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `usuario_id` INT NOT NULL,
    `tipo_pessoa` ENUM('pf', 'pj') NOT NULL DEFAULT 'pf',
    `nome` VARCHAR(200) NOT NULL,
    `cpf_cnpj` VARCHAR(20) NULL,
    `endereco` TEXT NULL,
    `numero_uc` VARCHAR(50) NULL,
    `telefone` VARCHAR(20) NULL,
    `email` VARCHAR(150) NULL,
    `whatsapp` VARCHAR(20) NULL,
    `qtd_propriedades` INT NOT NULL DEFAULT 1,
    `desconto_padrao_pct` DECIMAL(5,2) NOT NULL DEFAULT 15.00,
    `data_adesao` DATE NULL,
    `status` ENUM('ativo', 'suspenso', 'cancelado') NOT NULL DEFAULT 'ativo',
    `observacoes` TEXT NULL,
    `contrato_vigencia_fim` DATE NULL,
    `contrato_termos` TEXT NULL,
    `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deletado_em` TIMESTAMP NULL DEFAULT NULL,
    INDEX `idx_st_clientes_usuario` (`usuario_id`),
    INDEX `idx_st_clientes_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
");
echo "✓ Tabela startup_clientes verificada/criada.\n";

// 2. Tabela startup_creditos
$pdo->exec("
CREATE TABLE IF NOT EXISTS `startup_creditos` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `usuario_id` INT NOT NULL,
    `mes_referencia` VARCHAR(7) NOT NULL,
    `creditos_gerados_kwh` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `creditos_distribuidos_kwh` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `saldo_kwh` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `observacoes` TEXT NULL,
    `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deletado_em` TIMESTAMP NULL DEFAULT NULL,
    INDEX `idx_st_creditos_usuario` (`usuario_id`),
    INDEX `idx_st_creditos_mes` (`mes_referencia`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
");
echo "✓ Tabela startup_creditos verificada/criada.\n";

// 3. Tabela startup_creditos_cliente
$pdo->exec("
CREATE TABLE IF NOT EXISTS `startup_creditos_cliente` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `credito_id` INT NOT NULL,
    `cliente_id` INT NOT NULL,
    `creditos_alocados_kwh` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `creditos_consumidos_kwh` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `saldo_acumulado_kwh` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_st_cred_cli_credito` (`credito_id`),
    INDEX `idx_st_cred_cli_cliente` (`cliente_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
");
echo "✓ Tabela startup_creditos_cliente verificada/criada.\n";

// 4. Tabela startup_faturas
$pdo->exec("
CREATE TABLE IF NOT EXISTS `startup_faturas` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `usuario_id` INT NOT NULL,
    `cliente_id` INT NOT NULL,
    `mes_referencia` VARCHAR(7) NOT NULL,
    `consumo_kwh` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `creditos_injetados_kwh` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `iluminacao_publica` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `tarifa_kwh` DECIMAL(10,4) NOT NULL DEFAULT 0.9500,
    `valor_energisa` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `desconto_pct` DECIMAL(5,2) NOT NULL DEFAULT 15.00,
    `valor_desconto` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `valor_cobrado` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `status` ENUM('rascunho', 'emitida', 'enviada', 'paga', 'atrasada', 'cancelada') NOT NULL DEFAULT 'emitida',
    `data_emissao` DATE NULL,
    `data_vencimento` DATE NULL,
    `data_pagamento` DATE NULL,
    `observacoes` TEXT NULL,
    `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deletado_em` TIMESTAMP NULL DEFAULT NULL,
    INDEX `idx_st_faturas_usuario_mes` (`usuario_id`, `mes_referencia`),
    INDEX `idx_st_faturas_cliente` (`cliente_id`),
    INDEX `idx_st_faturas_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
");
echo "✓ Tabela startup_faturas verificada/criada.\n";

// 5. Tabela startup_pagamentos
$pdo->exec("
CREATE TABLE IF NOT EXISTS `startup_pagamentos` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `usuario_id` INT NOT NULL,
    `fatura_id` INT NULL,
    `cliente_id` INT NULL,
    `tipo` ENUM('entrada', 'saida') NOT NULL DEFAULT 'entrada',
    `categoria` VARCHAR(100) NOT NULL DEFAULT 'fatura_cliente',
    `descricao` VARCHAR(300) NOT NULL,
    `valor` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `metodo_pagamento` VARCHAR(50) NOT NULL DEFAULT 'pix',
    `data_pagamento` DATE NOT NULL,
    `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deletado_em` TIMESTAMP NULL DEFAULT NULL,
    INDEX `idx_st_pagamentos_usuario_tipo` (`usuario_id`, `tipo`),
    INDEX `idx_st_pagamentos_fatura` (`fatura_id`),
    INDEX `idx_st_pagamentos_cliente` (`cliente_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
");
echo "✓ Tabela startup_pagamentos verificada/criada.\n";

// 6. Tabela startup_auditoria
$pdo->exec("
CREATE TABLE IF NOT EXISTS `startup_auditoria` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `usuario_id` INT NOT NULL,
    `acao` VARCHAR(50) NOT NULL,
    `entidade` VARCHAR(50) NOT NULL,
    `entidade_id` INT NOT NULL,
    `detalhes` JSON NULL,
    `ip_address` VARCHAR(45) NULL,
    `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_st_audit_user_data` (`usuario_id`, `criado_em`),
    INDEX `idx_st_audit_entidade` (`entidade`, `entidade_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
");
echo "✓ Tabela startup_auditoria verificada/criada.\n";

// 7. Seed de dados iniciais de demonstração (se a tabela de clientes estiver vazia)
$totalClientes = (int)$pdo->query("SELECT COUNT(*) FROM startup_clientes WHERE deletado_em IS NULL")->fetchColumn();
if ($totalClientes === 0) {
    $userId = (int)$pdo->query("SELECT id FROM usuarios LIMIT 1")->fetchColumn() ?: 1;

    // Inserir clientes de demonstração
    $stmtCli = $pdo->prepare("
        INSERT INTO startup_clientes (usuario_id, tipo_pessoa, nome, cpf_cnpj, endereco, numero_uc, telefone, email, whatsapp, qtd_propriedades, desconto_padrao_pct, data_adesao, status, contrato_vigencia_fim)
        VALUES (:uid, :tipo, :nome, :doc, :end, :uc, :tel, :email, :zap, :props, :desc, :adesao, :status, :fim)
    ");

    $clientesExemplo = [
        [
            'uid' => $userId, 'tipo' => 'pj', 'nome' => 'Supermercado Nova Estrela Ltda', 'doc' => '12.345.678/0001-90',
            'end' => 'Av. Central, 1200 - Centro', 'uc' => 'UC-8842109', 'tel' => '(67) 3211-9000',
            'email' => 'financeiro@novaestrela.com.br', 'zap' => '(67) 99876-5432', 'props' => 3, 'desc' => 18.00,
            'adesao' => '2026-01-15', 'status' => 'ativo', 'fim' => '2027-01-15'
        ],
        [
            'uid' => $userId, 'tipo' => 'pf', 'nome' => 'Dr. Fernando Albuquerque', 'doc' => '456.789.012-34',
            'end' => 'Rua dos Jacarandás, 345 - Jd. dos Estados', 'uc' => 'UC-5519283', 'tel' => '(67) 99123-4567',
            'email' => 'fernando.albuquerque@email.com', 'zap' => '(67) 99123-4567', 'props' => 2, 'desc' => 15.00,
            'adesao' => '2026-02-10', 'status' => 'ativo', 'fim' => '2027-02-10'
        ],
        [
            'uid' => $userId, 'tipo' => 'pj', 'nome' => 'Padaria & Confeitaria Pão de Ouro', 'doc' => '98.765.432/0001-11',
            'end' => 'Rua Bahia, 780 - Monte Castelo', 'uc' => 'UC-2309184', 'tel' => '(67) 3344-5566',
            'email' => 'contato@paodeouro.com', 'zap' => '(67) 98111-2233', 'props' => 1, 'desc' => 15.00,
            'adesao' => '2026-03-01', 'status' => 'ativo', 'fim' => '2027-03-01'
        ],
        [
            'uid' => $userId, 'tipo' => 'pf', 'nome' => 'Mariana Silveira Castro', 'doc' => '876.543.210-98',
            'end' => 'Rua Euclides da Cunha, 990 - Santa Fé', 'uc' => 'UC-7761029', 'tel' => '(67) 98456-7890',
            'email' => 'mariana.castro@gmail.com', 'zap' => '(67) 98456-7890', 'props' => 1, 'desc' => 12.00,
            'adesao' => '2026-04-12', 'status' => 'suspenso', 'fim' => '2027-04-12'
        ]
    ];

    foreach ($clientesExemplo as $cli) {
        $stmtCli->execute($cli);
    }
    echo "✓ 4 clientes de exemplo inseridos.\n";

    // Inserir créditos do mês atual
    $mesAtual = date('Y-m');
    $stmtCred = $pdo->prepare("
        INSERT INTO startup_creditos (usuario_id, mes_referencia, creditos_gerados_kwh, creditos_distribuidos_kwh, saldo_kwh, observacoes)
        VALUES (:uid, :mes, 25000.00, 21800.00, 3200.00, 'Produção nominal da Usina Solar Sol do Pantanal I')
    ");
    $stmtCred->execute(['uid' => $userId, 'mes' => $mesAtual]);
    $creditoId = (int)$pdo->lastInsertId();

    // Inserir alocações por cliente
    $clientes = $pdo->query("SELECT id, nome, qtd_propriedades FROM startup_clientes WHERE usuario_id = $userId")->fetchAll(PDO::FETCH_ASSOC);
    $stmtAloc = $pdo->prepare("
        INSERT INTO startup_creditos_cliente (credito_id, cliente_id, creditos_alocados_kwh, creditos_consumidos_kwh, saldo_acumulado_kwh)
        VALUES (:cid, :clid, :aloc, :cons, :saldo)
    ");
    
    $alocVals = [
        ['aloc' => 9500.00, 'cons' => 8400.00, 'saldo' => 2400.00],
        ['aloc' => 5200.00, 'cons' => 4900.00, 'saldo' => 1100.00],
        ['aloc' => 4100.00, 'cons' => 3800.00, 'saldo' => 950.00],
        ['aloc' => 3000.00, 'cons' => 2200.00, 'saldo' => 800.00],
    ];

    foreach ($clientes as $idx => $cli) {
        $v = $alocVals[$idx] ?? ['aloc' => 2000.00, 'cons' => 1800.00, 'saldo' => 400.00];
        $stmtAloc->execute([
            'cid' => $creditoId,
            'clid' => $cli['id'],
            'aloc' => $v['aloc'],
            'cons' => $v['cons'],
            'saldo' => $v['saldo']
        ]);

        // Gerar Faturas correspondentes
        $consumo = $v['cons'];
        $creditos = $consumo;
        $ilum = 65.50;
        $tarifa = 0.95;
        $valorEnergisa = round(($consumo * $tarifa) + $ilum, 2);
        // Desconto = base somada dos creditos + iluminação pública * desconto %
        $descontoPct = 15.00;
        $baseSoma = round(($creditos * $tarifa) + $ilum, 2);
        $valorDesconto = round($baseSoma * ($descontoPct / 100), 2);
        $valorCobrado = round($valorEnergisa - $valorDesconto, 2);

        $statusFat = ($idx === 0) ? 'paga' : (($idx === 1) ? 'enviada' : 'emitida');
        $dataPgto = ($statusFat === 'paga') ? date('Y-m-d') : null;

        $stmtFat = $pdo->prepare("
            INSERT INTO startup_faturas (
                usuario_id, cliente_id, mes_referencia, consumo_kwh, creditos_injetados_kwh,
                iluminacao_publica, tarifa_kwh, valor_energisa, desconto_pct, valor_desconto,
                valor_cobrado, status, data_emissao, data_vencimento, data_pagamento
            ) VALUES (
                :uid, :clid, :mes, :cons, :cred,
                :ilum, :tarifa, :vEnergisa, :descPct, :vDesc,
                :vCobrado, :status, :emissao, :venc, :pgto
            )
        ");
        $stmtFat->execute([
            'uid' => $userId,
            'clid' => $cli['id'],
            'mes' => $mesAtual,
            'cons' => $consumo,
            'cred' => $creditos,
            'ilum' => $ilum,
            'tarifa' => $tarifa,
            'vEnergisa' => $valorEnergisa,
            'descPct' => $descontoPct,
            'vDesc' => $valorDesconto,
            'vCobrado' => $valorCobrado,
            'status' => $statusFat,
            'emissao' => date('Y-m-05'),
            'venc' => date('Y-m-20'),
            'pgto' => $dataPgto
        ]);
        $faturaId = (int)$pdo->lastInsertId();

        // Se paga, registrar recebimento no financeiro
        if ($statusFat === 'paga') {
            $pdo->prepare("
                INSERT INTO startup_pagamentos (usuario_id, fatura_id, cliente_id, tipo, categoria, descricao, valor, metodo_pagamento, data_pagamento)
                VALUES (:uid, :fid, :clid, 'entrada', 'fatura_cliente', :desc, :val, 'pix', :dt)
            ")->execute([
                'uid' => $userId,
                'fid' => $faturaId,
                'clid' => $cli['id'],
                'desc' => "Recebimento Fatura Solar {$mesAtual} - " . $cli['nome'],
                'val' => $valorCobrado,
                'dt' => date('Y-m-d')
            ]);
        }
    }

    // Inserir algumas saídas operacionais no Financeiro
    $despesas = [
        ['desc' => 'Manutenção Preventiva Inversores e Módulos', 'cat' => 'manutencao_usina', 'val' => 1850.00, 'dt' => date('Y-m-02')],
        ['desc' => 'Arrendamento / Aluguel do Terreno da Usina', 'cat' => 'aluguel_terreno', 'val' => 2500.00, 'dt' => date('Y-m-05')],
        ['desc' => 'Seguro Operacional Usina Fotovoltaica', 'cat' => 'seguros', 'val' => 740.00, 'dt' => date('Y-m-10')]
    ];
    foreach ($despesas as $d) {
        $pdo->prepare("
            INSERT INTO startup_pagamentos (usuario_id, fatura_id, cliente_id, tipo, categoria, descricao, valor, metodo_pagamento, data_pagamento)
            VALUES (:uid, NULL, NULL, 'saida', :cat, :desc, :val, 'pix', :dt)
        ")->execute([
            'uid' => $userId,
            'cat' => $d['cat'],
            'desc' => $d['desc'],
            'val' => $d['val'],
            'dt' => $d['dt']
        ]);
    }

    // Inserir log inicial de auditoria
    $pdo->prepare("
        INSERT INTO startup_auditoria (usuario_id, acao, entidade, entidade_id, detalhes, ip_address)
        VALUES (:uid, 'inicializacao', 'sistema', 1, :det, '127.0.0.1')
    ")->execute([
        'uid' => $userId,
        'det' => json_encode(['mensagem' => 'Módulo Startup de Energia Solar inicializado com dados demonstrativos.'], JSON_UNESCAPED_UNICODE)
    ]);

    echo "✓ Créditos, faturas, financeiro e auditoria de exemplo gerados com sucesso!\n";
}

echo "Migração do módulo Startup concluída com sucesso!\n";
