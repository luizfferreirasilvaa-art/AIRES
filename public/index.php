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
use Aires\Controllers\AlertController;
use Aires\Controllers\DashboardController;
use Aires\Controllers\NoteController;

// Iniciar sessões armazenadas no banco de dados MySQL
SessionHandler::start();

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
    Response::render('app');
});

// ==========================================
// ROTAS DE API REST JSON
// ==========================================

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

// Inteligência Ativa: Alertas e Notificações com Cálculo de Viagem (Pilar 3)
$router->get('/api/alertas/pendentes', [AlertController::class, 'pending']);
$router->patch('/api/alertas/{id}/lido', [AlertController::class, 'markRead']);

// Base de Conhecimento / Zettelkasten (Pilar 3)
$router->get('/api/notas', [NoteController::class, 'index']);
$router->post('/api/notas', [NoteController::class, 'store']);
$router->put('/api/notas/{id}', [NoteController::class, 'update']);
$router->delete('/api/notas/{id}', [NoteController::class, 'destroy']);

// Despacho da requisição
$router->dispatch($request);
