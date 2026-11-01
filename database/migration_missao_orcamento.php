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

echo "Iniciando migração do Módulo Orçamento & Previsões Futuras de Missões...\n";

$pdo->exec("
CREATE TABLE IF NOT EXISTS `missao_orcamento_itens` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `usuario_id` INT NOT NULL,
    `missao_id` INT NOT NULL,
    `item` VARCHAR(255) NOT NULL,
    `categoria` VARCHAR(50) NOT NULL DEFAULT 'equipamento',
    `valor_total` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `qtd_parcelas` INT NOT NULL DEFAULT 1,
    `valor_parcela` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `forma_pagamento` VARCHAR(50) NOT NULL DEFAULT 'parcelado',
    `data_primeiro_vencimento` DATE NOT NULL,
    `periodicidade` VARCHAR(20) NOT NULL DEFAULT 'mensal',
    `status` ENUM('planejado', 'em_negociacao', 'aprovado', 'em_pagamento', 'quitado', 'cancelado') NOT NULL DEFAULT 'planejado',
    `fornecedor` VARCHAR(200) NULL,
    `observacoes` TEXT NULL,
    `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deletado_em` TIMESTAMP NULL DEFAULT NULL,
    INDEX `idx_m_orc_usuario` (`usuario_id`, `status`),
    INDEX `idx_m_orc_missao` (`missao_id`),
    INDEX `idx_m_orc_vencimento` (`data_primeiro_vencimento`),
    INDEX `idx_m_orc_deletado` (`deletado_em`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
");
echo "✓ Tabela missao_orcamento_itens verificada/criada.\n";

// Seed de demonstração se não houver itens cadastrados
$totalItens = (int)$pdo->query("SELECT COUNT(*) FROM missao_orcamento_itens WHERE deletado_em IS NULL")->fetchColumn();
if ($totalItens === 0) {
    $missao = $pdo->query("SELECT id, usuario_id, titulo FROM missoes WHERE deletado_em IS NULL ORDER BY id ASC LIMIT 1")->fetch(PDO::FETCH_ASSOC);
    if ($missao) {
        $mid = (int)$missao['id'];
        $uid = (int)$missao['usuario_id'];
        $hoje = date('Y-m-d');
        $mesQueVem = date('Y-m-15', strtotime('+1 month'));

        $stmtInsert = $pdo->prepare("
            INSERT INTO missao_orcamento_itens (
                usuario_id, missao_id, item, categoria, valor_total, qtd_parcelas,
                valor_parcela, forma_pagamento, data_primeiro_vencimento, status, fornecedor, observacoes
            ) VALUES (
                :uid, :mid, :item, :cat, :tot, :parc, :vparc, :forma, :venc, :st, :fornec, :obs
            )
        ");

        $itensDemo = [
            [
                'uid' => $uid, 'mid' => $mid,
                'item' => 'Inversor Solar Trifásico 75kW',
                'cat' => 'equipamento', 'tot' => 18000.00, 'parc' => 12, 'vparc' => 1500.00,
                'forma' => 'financiamento', 'venc' => $hoje, 'st' => 'em_pagamento',
                'fornec' => 'Growatt Brasil', 'obs' => 'Garantia estendida de 10 anos.'
            ],
            [
                'uid' => $uid, 'mid' => $mid,
                'item' => 'Estrutura de Solo & Fixação Alumínio',
                'cat' => 'infraestrutura', 'tot' => 9600.00, 'parc' => 6, 'vparc' => 1600.00,
                'forma' => 'parcelado', 'venc' => $mesQueVem, 'st' => 'aprovado',
                'fornec' => 'Solar Trackers Ind.', 'obs' => 'Entrega prevista para início do próximo mês.'
            ],
            [
                'uid' => $uid, 'mid' => $mid,
                'item' => 'Parecer de Acesso & RT Engenharia',
                'cat' => 'servico', 'tot' => 3500.00, 'parc' => 1, 'vparc' => 3500.00,
                'forma' => 'pix', 'venc' => $hoje, 'st' => 'quitado',
                'fornec' => 'Eng. Eletricista S.A.', 'obs' => 'Protocolado na concessionária Energisa.'
            ]
        ];

        foreach ($itensDemo as $d) {
            $stmtInsert->execute($d);
        }
        echo "✓ 3 itens demonstrativos de orçamento inseridos para a missão #{$mid}.\n";
    }
}

echo "Migração concluída com sucesso!\n";
