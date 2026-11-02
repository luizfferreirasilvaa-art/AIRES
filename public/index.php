<?php
declare(strict_types=1);

/**
 * AIRES - Front Controller
 * Inicialização de sessões resilientes no MySQL e despacho de rotas
 */

// Se estiver rodando via servidor embutido do PHP (CLI server), serve arquivos estáticos diretamente
if (php_sapi_name() === 'cli-server') {
    $uriPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    $staticFile = __DIR__ . str_replace('/', DIRECTORY_SEPARATOR, $uriPath);
    if ($uriPath !== '/' && is_file($staticFile)) {
        return false; // Retorna false para o PHP embutido entregar o arquivo estático com MIME type nativo
    }
}

require_once dirname(__DIR__) . '/config/config.php';

use Aires\Core\Request;
use Aires\Core\Response;
use Aires\Core\Router;
use Aires\Core\SessionHandler;
use Aires\Controllers\AuthController;
use Aires\Controllers\TaskController;
use Aires\Controllers\SubtaskController;
use Aires\Controllers\MissionController;
use Aires\Controllers\MissionBudgetController;
use Aires\Controllers\PersonalFinanceController;
use Aires\Controllers\AlertController;
use Aires\Controllers\DashboardController;
use Aires\Controllers\NoteController;
use Aires\Controllers\ModeController;
use Aires\Controllers\StartupClienteController;
use Aires\Controllers\StartupFaturaController;
use Aires\Controllers\StartupCreditoController;
use Aires\Controllers\StartupFinanceiroController;
use Aires\Controllers\StartupDashboardController;
use Aires\Controllers\StartupAuditoriaController;
use Aires\Controllers\StartupProtocoloController;
use Aires\Controllers\AdminUsuarioController;

// Iniciar sessões armazenadas no banco de dados MySQL
SessionHandler::start();

// Garante colunas de controle de acessos e perfil na tabela usuarios
try {
    $pdoBoot = \Aires\Core\Database::getInstance()->getConnection();
    $cols = $pdoBoot->query("SHOW COLUMNS FROM `usuarios`")->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('perfil', $cols, true)) {
        $pdoBoot->exec("ALTER TABLE `usuarios` ADD COLUMN `perfil` VARCHAR(50) NOT NULL DEFAULT 'usuario'");
    }
    if (!in_array('status', $cols, true)) {
        $pdoBoot->exec("ALTER TABLE `usuarios` ADD COLUMN `status` VARCHAR(30) NOT NULL DEFAULT 'ativo'");
    }
    if (!in_array('paginas_permitidas', $cols, true)) {
        $pdoBoot->exec("ALTER TABLE `usuarios` ADD COLUMN `paginas_permitidas` TEXT NULL DEFAULT NULL");
    }

    // Executa migrações pontuais sob demanda (como limpeza de dados demo solicitada pelo usuário)
    $pdoBoot->exec("CREATE TABLE IF NOT EXISTS `sistema_migracoes_executadas` (`versao` VARCHAR(100) NOT NULL PRIMARY KEY, `executado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
    $chkLimpeza = $pdoBoot->query("SELECT COUNT(*) FROM `sistema_migracoes_executadas` WHERE `versao` = 'limpar_dados_financas_notas_v1'")->fetchColumn();
    if ((int)$chkLimpeza === 0) {
        $pdoBoot->exec("SET FOREIGN_KEY_CHECKS = 0;");
        $pdoBoot->exec("DELETE FROM `financas_investimentos_movimentacoes`");
        $pdoBoot->exec("DELETE FROM `financas_investimentos`");
        $pdoBoot->exec("DELETE FROM `financas_pessoais_itens`");
        $pdoBoot->exec("UPDATE `financas_pessoais_config` SET `teto_gastos_mensal` = 0.00, `renda_mensal_estimada` = 0.00 WHERE 1");
        $pdoBoot->exec("DELETE FROM `missao_orcamento_itens`");
        $pdoBoot->exec("DELETE FROM `notas`");
        $pdoBoot->exec("SET FOREIGN_KEY_CHECKS = 1;");
        $pdoBoot->exec("INSERT INTO `sistema_migracoes_executadas` (`versao`) VALUES ('limpar_dados_financas_notas_v1')");
    }
} catch (\Throwable $e) {
    // Silencioso
}

$request = new Request();
$router = new Router();

$path = $request->getPath();

// Verificação de Autenticação Obrigatória (Item obrigatório antes de todas as páginas)
$isLoggedIn = isset($_SESSION['usuario_id']) && (int)$_SESSION['usuario_id'] > 0;
$isAuthRoute = in_array($path, ['/login', '/logout', '/api/auth/login', '/api/auth/logout'], true);

if (!$isLoggedIn && !$isAuthRoute) {
    if (str_starts_with($path, '/api/')) {
        Response::error('Sessão expirada ou não autenticado. Faça login para continuar.', 401);
    } else {
        Response::redirect(Request::getBasePath() . '/login');
    }
}

// ==========================================
// ROTAS DE AUTENTICAÇÃO
// ==========================================
$router->get('/login', [AuthController::class, 'showLogin']);
$router->post('/login', [AuthController::class, 'login']);
$router->post('/api/auth/login', [AuthController::class, 'login']);
$router->get('/logout', [AuthController::class, 'logout']);
$router->post('/logout', [AuthController::class, 'logout']);
$router->post('/api/auth/logout', [AuthController::class, 'logout']);
$router->get('/api/auth/me', [AuthController::class, 'me']);

// ==========================================
// ROTAS DE INTERFACE WEB (VIEWS)
// ==========================================
$router->get('/', function (Request $req) {
    $dashboardCtrl = new DashboardController();
    $userId = isset($_SESSION['usuario_id']) ? (int)$_SESSION['usuario_id'] : 1;
    $statsData = $dashboardCtrl->getStatsData($userId);
    $stmtModos = \Aires\Core\Database::getInstance()->getConnection()->prepare("SELECT * FROM modos WHERE usuario_id = :uid ORDER BY ordem ASC, id ASC");
    $stmtModos->execute(['uid' => $userId]);
    $statsData['modos'] = $stmtModos->fetchAll(PDO::FETCH_ASSOC);

    Response::render('app', $statsData);
});

// ==========================================
// ROTAS DE API REST JSON
// ==========================================

// Modos de Foco & Contexto (Trabalho, Pessoal, Empresarial...)
$router->get('/api/modos', [ModeController::class, 'index']);
$router->post('/api/modos', [ModeController::class, 'store']);
$router->put('/api/modos/{id}', [ModeController::class, 'update']);
$router->delete('/api/modos/{id}', [ModeController::class, 'destroy']);

// Dashboard & Gamificação (Pilar 4)
$router->get('/api/dashboard/stats', [DashboardController::class, 'stats']);

// Módulo de Tarefas (Pilar 2 & Especificação de Engenharia)
$router->get('/api/tarefas', [TaskController::class, 'index']);
$router->post('/api/tarefas', [TaskController::class, 'store']);
$router->get('/api/tarefas/conflito', [TaskController::class, 'checkConflict']);
$router->get('/api/tarefas/{id}', [TaskController::class, 'show']);
$router->put('/api/tarefas/{id}', [TaskController::class, 'update']);
$router->patch('/api/tarefas/{id}/status', [TaskController::class, 'updateStatus']);
$router->delete('/api/tarefas/{id}', [TaskController::class, 'destroy']);

// Subtarefas (Checklist interno com cálculo de progresso)
$router->post('/api/tarefas/{id}/subtarefas', [SubtaskController::class, 'store']);
$router->patch('/api/subtarefas/{id}/toggle', [SubtaskController::class, 'toggle']);
$router->put('/api/subtarefas/{id}', [SubtaskController::class, 'update']);
$router->delete('/api/subtarefas/{id}', [SubtaskController::class, 'destroy']);

// Missões Estratégicas (Pilar 1)
$router->get('/api/missoes', [MissionController::class, 'index']);
$router->post('/api/missoes', [MissionController::class, 'store']);
$router->put('/api/missoes/{id}', [MissionController::class, 'update']);
$router->delete('/api/missoes/{id}', [MissionController::class, 'destroy']);

// Orçamento & Planejamento Financeiro de Missões (Previsões Futuras & Parcelamento)
$router->get('/api/missoes/orcamento', [MissionBudgetController::class, 'index']);
$router->get('/api/missoes/orcamento/resumo', [MissionBudgetController::class, 'resumo']);
$router->get('/api/missoes/orcamento/projecao', [MissionBudgetController::class, 'projecao']);
$router->post('/api/missoes/orcamento', [MissionBudgetController::class, 'store']);
$router->put('/api/missoes/orcamento/{id}', [MissionBudgetController::class, 'update']);
$router->delete('/api/missoes/orcamento/{id}', [MissionBudgetController::class, 'destroy']);

// Finanças Pessoais & Orçamento de Metas (Controle de Teto, Parcelamentos e Alertas de Extrapolação)
$router->get('/api/pessoal/financeiro', [PersonalFinanceController::class, 'index']);
$router->get('/api/pessoal/financeiro/resumo', [PersonalFinanceController::class, 'resumo']);
$router->get('/api/pessoal/financeiro/dashboard', [PersonalFinanceController::class, 'dashboard']);
$router->get('/api/pessoal/financeiro/projecao', [PersonalFinanceController::class, 'projecao']);
$router->get('/api/pessoal/financeiro/config', [PersonalFinanceController::class, 'getConfig']);
$router->post('/api/pessoal/financeiro/config', [PersonalFinanceController::class, 'saveConfig']);
$router->post('/api/pessoal/financeiro/simular', [PersonalFinanceController::class, 'simular']);
$router->post('/api/pessoal/financeiro', [PersonalFinanceController::class, 'store']);
$router->put('/api/pessoal/financeiro/{id}', [PersonalFinanceController::class, 'update']);
$router->patch('/api/pessoal/financeiro/{id}/pagar-parcela', [PersonalFinanceController::class, 'pagarParcela']);
$router->delete('/api/pessoal/financeiro/{id}', [PersonalFinanceController::class, 'destroy']);

// Investimentos & Patrimônio Pessoal (Economias, Reservas e Aportes)
$router->get('/api/pessoal/investimentos', [PersonalFinanceController::class, 'investimentosIndex']);
$router->get('/api/pessoal/investimentos/resumo', [PersonalFinanceController::class, 'investimentosResumo']);
$router->post('/api/pessoal/investimentos', [PersonalFinanceController::class, 'investimentosStore']);
$router->put('/api/pessoal/investimentos/{id}', [PersonalFinanceController::class, 'investimentosUpdate']);
$router->post('/api/pessoal/investimentos/{id}/movimentar', [PersonalFinanceController::class, 'investimentosMovimentar']);
$router->delete('/api/pessoal/investimentos/{id}', [PersonalFinanceController::class, 'investimentosDestroy']);

// Inteligência Ativa: Alertas e Notificações com Cálculo de Viagem (Pilar 3)
$router->get('/api/alertas/pendentes', [AlertController::class, 'pending']);
$router->patch('/api/alertas/{id}/lido', [AlertController::class, 'markRead']);

// Base de Conhecimento / Zettelkasten (Pilar 3)
$router->get('/api/notas', [NoteController::class, 'index']);
$router->post('/api/notas', [NoteController::class, 'store']);
$router->put('/api/notas/{id}', [NoteController::class, 'update']);
$router->delete('/api/notas/{id}', [NoteController::class, 'destroy']);

// ==========================================
// MÓDULO STARTUP: ENERGIA SOLAR & CRÉDITOS
// ==========================================

// Clientes
$router->get('/api/startup/clientes', [StartupClienteController::class, 'index']);
$router->post('/api/startup/clientes', [StartupClienteController::class, 'store']);
$router->get('/api/startup/clientes/{id}', [StartupClienteController::class, 'show']);
$router->put('/api/startup/clientes/{id}', [StartupClienteController::class, 'update']);
$router->delete('/api/startup/clientes/{id}', [StartupClienteController::class, 'destroy']);

// Faturas
$router->get('/api/startup/faturas', [StartupFaturaController::class, 'index']);
$router->post('/api/startup/faturas', [StartupFaturaController::class, 'store']);
$router->get('/api/startup/faturas/{id}', [StartupFaturaController::class, 'show']);
$router->put('/api/startup/faturas/{id}', [StartupFaturaController::class, 'update']);
$router->patch('/api/startup/faturas/{id}/status', [StartupFaturaController::class, 'updateStatus']);
$router->post('/api/startup/faturas/{id}/anexar', [StartupFaturaController::class, 'anexarArquivo']);
$router->delete('/api/startup/faturas/{id}/anexo', [StartupFaturaController::class, 'removerAnexo']);
$router->delete('/api/startup/faturas/{id}', [StartupFaturaController::class, 'destroy']);

// Estoque de Créditos
$router->get('/api/startup/creditos', [StartupCreditoController::class, 'index']);
$router->post('/api/startup/creditos', [StartupCreditoController::class, 'store']);
$router->get('/api/startup/creditos/{id}', [StartupCreditoController::class, 'show']);
$router->put('/api/startup/creditos/{id}', [StartupCreditoController::class, 'update']);
$router->get('/api/startup/creditos/{id}/alocacoes', [StartupCreditoController::class, 'alocacoes']);
$router->post('/api/startup/creditos/{id}/alocar', [StartupCreditoController::class, 'alocar']);
$router->delete('/api/startup/creditos/{id}', [StartupCreditoController::class, 'destroy']);

// Financeiro
$router->get('/api/startup/financeiro', [StartupFinanceiroController::class, 'index']);
$router->get('/api/startup/financeiro/resumo', [StartupFinanceiroController::class, 'resumo']);
$router->post('/api/startup/financeiro', [StartupFinanceiroController::class, 'store']);
$router->put('/api/startup/financeiro/{id}', [StartupFinanceiroController::class, 'update']);
$router->delete('/api/startup/financeiro/{id}', [StartupFinanceiroController::class, 'destroy']);

// Protocolos & Chamados
$router->get('/api/startup/protocolos', [StartupProtocoloController::class, 'index']);
$router->post('/api/startup/protocolos', [StartupProtocoloController::class, 'store']);
$router->get('/api/startup/protocolos/{id}', [StartupProtocoloController::class, 'show']);
$router->put('/api/startup/protocolos/{id}', [StartupProtocoloController::class, 'update']);
$router->patch('/api/startup/protocolos/{id}/status', [StartupProtocoloController::class, 'updateStatus']);
$router->post('/api/startup/protocolos/{id}/andamento', [StartupProtocoloController::class, 'adicionarAndamento']);
$router->delete('/api/startup/protocolos/{id}', [StartupProtocoloController::class, 'destroy']);

// Dashboard Solar
$router->get('/api/startup/dashboard', [StartupDashboardController::class, 'stats']);

// Log de Auditoria & Lixeira de Restauração Rápida (7 dias)
$router->get('/api/startup/auditoria', [StartupAuditoriaController::class, 'index']);
$router->get('/api/startup/auditoria/lixeira', [StartupAuditoriaController::class, 'lixeira']);
$router->post('/api/startup/auditoria/restaurar', [StartupAuditoriaController::class, 'restaurar']);

// ==========================================
// ADMINISTRAÇÃO: GESTÃO DE USUÁRIOS & PERMISSÕES
// ==========================================
$router->get('/api/admin/usuarios', [AdminUsuarioController::class, 'index']);
$router->get('/api/admin/usuarios/modulos', [AdminUsuarioController::class, 'modulosDisponiveis']);
$router->get('/api/admin/usuarios/{id}', [AdminUsuarioController::class, 'show']);
$router->post('/api/admin/usuarios', [AdminUsuarioController::class, 'store']);
$router->put('/api/admin/usuarios/{id}', [AdminUsuarioController::class, 'update']);
$router->delete('/api/admin/usuarios/{id}', [AdminUsuarioController::class, 'destroy']);
$router->post('/api/admin/usuarios/{id}/toggle-status', [AdminUsuarioController::class, 'toggleStatus']);

// Despacho da requisição
$router->dispatch($request);
