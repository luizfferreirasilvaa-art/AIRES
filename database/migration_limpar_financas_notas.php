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

// 1. Tabela para controlar migrações únicas
$pdo->exec("
CREATE TABLE IF NOT EXISTS `sistema_migracoes_executadas` (
    `versao` VARCHAR(100) NOT NULL PRIMARY KEY,
    `executado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
");

$versao = 'limpar_dados_financas_notas_v1';
$stmtCheck = $pdo->prepare("SELECT COUNT(*) FROM `sistema_migracoes_executadas` WHERE `versao` = :versao");
$stmtCheck->execute(['versao' => $versao]);

if ((int)$stmtCheck->fetchColumn() > 0) {
    echo "• Limpeza de dados de finanças e notas já foi executada anteriormente. Nenhuma ação necessária.\n";
    exit(0);
}

echo "Iniciando limpeza dos dados de Finanças Pessoais, Investimentos, Orçamentos e Notas...\n";

try {
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");

    // Finanças Pessoais: Movimentações, Investimentos e Itens
    $pdo->exec("DELETE FROM `financas_investimentos_movimentacoes`");
    $pdo->exec("DELETE FROM `financas_investimentos`");
    $pdo->exec("DELETE FROM `financas_pessoais_itens`");
    $pdo->exec("UPDATE `financas_pessoais_config` SET `teto_gastos_mensal` = 0.00, `renda_mensal_estimada` = 0.00 WHERE 1");

    // Missões: Orçamento
    $pdo->exec("DELETE FROM `missao_orcamento_itens`");

    // Notas
    $pdo->exec("DELETE FROM `notas`");

    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");

    // Registra como executada
    $stmtReg = $pdo->prepare("INSERT INTO `sistema_migracoes_executadas` (`versao`) VALUES (:versao)");
    $stmtReg->execute(['versao' => $versao]);

    echo "✓ Todos os dados prévios de finanças, investimentos, orçamentos e notas foram completamente removidos!\n";
} catch (\Throwable $e) {
    echo "Aviso durante limpeza: " . $e->getMessage() . "\n";
}
