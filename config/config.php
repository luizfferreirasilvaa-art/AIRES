<?php
declare(strict_types=1);

/**
 * AIRES - Arquitetura e Configurações Centrais
 * Sistema "Segundo Cérebro" focado em execução
 */

// Timezone padrão Brasil
date_default_timezone_set('America/Sao_Paulo');

// Definições de Ambiente e Caminhos
define('APP_NAME', 'AIRES');
define('APP_VERSION', '1.0.0');
define('APP_ENV', 'development');

define('BASE_DIR', dirname(__DIR__));
define('CONFIG_DIR', __DIR__);
define('SRC_DIR', BASE_DIR . DIRECTORY_SEPARATOR . 'src');
define('PUBLIC_DIR', BASE_DIR . DIRECTORY_SEPARATOR . 'public');

// Configuração do Banco de Dados MySQL (Laragon Padrão)
define('DB_HOST', getenv('DB_HOST') ?: '127.0.0.1');
define('DB_PORT', (int)(getenv('DB_PORT') ?: 3306));
define('DB_NAME', getenv('DB_NAME') ?: 'aires_db');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') ?: '');
define('DB_CHARSET', 'utf8mb4');

// Configurações de Sessão
define('SESSION_LIFETIME', 86400 * 30); // 30 dias

// Autoloader nativo para namespace Aires\
spl_autoload_register(function (string $class): void {
    $prefix = 'Aires\\';
    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) {
        return;
    }

    $relativeClass = substr($class, $len);
    $file = SRC_DIR . DIRECTORY_SEPARATOR . str_replace('\\', DIRECTORY_SEPARATOR, $relativeClass) . '.php';

    if (file_exists($file)) {
        require_once $file;
    }
});

// Carregamento explícito das classes do Core como fail-safe
require_once SRC_DIR . DIRECTORY_SEPARATOR . 'Core' . DIRECTORY_SEPARATOR . 'Database.php';
require_once SRC_DIR . DIRECTORY_SEPARATOR . 'Core' . DIRECTORY_SEPARATOR . 'Response.php';
require_once SRC_DIR . DIRECTORY_SEPARATOR . 'Core' . DIRECTORY_SEPARATOR . 'Request.php';
require_once SRC_DIR . DIRECTORY_SEPARATOR . 'Core' . DIRECTORY_SEPARATOR . 'Router.php';
require_once SRC_DIR . DIRECTORY_SEPARATOR . 'Core' . DIRECTORY_SEPARATOR . 'SessionHandler.php';

// Services
require_once SRC_DIR . DIRECTORY_SEPARATOR . 'Services' . DIRECTORY_SEPARATOR . 'ConflictDetector.php';
require_once SRC_DIR . DIRECTORY_SEPARATOR . 'Services' . DIRECTORY_SEPARATOR . 'TravelAlertCalculator.php';

require_once SRC_DIR . DIRECTORY_SEPARATOR . 'Controllers' . DIRECTORY_SEPARATOR . 'AuthController.php';
require_once SRC_DIR . DIRECTORY_SEPARATOR . 'Controllers' . DIRECTORY_SEPARATOR . 'TaskController.php';
require_once SRC_DIR . DIRECTORY_SEPARATOR . 'Controllers' . DIRECTORY_SEPARATOR . 'SubtaskController.php';
require_once SRC_DIR . DIRECTORY_SEPARATOR . 'Controllers' . DIRECTORY_SEPARATOR . 'MissionController.php';
require_once SRC_DIR . DIRECTORY_SEPARATOR . 'Controllers' . DIRECTORY_SEPARATOR . 'AlertController.php';
require_once SRC_DIR . DIRECTORY_SEPARATOR . 'Controllers' . DIRECTORY_SEPARATOR . 'DashboardController.php';
require_once SRC_DIR . DIRECTORY_SEPARATOR . 'Controllers' . DIRECTORY_SEPARATOR . 'NoteController.php';
