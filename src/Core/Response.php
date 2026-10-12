<?php
declare(strict_types=1);

namespace Aires\Core;

/**
 * Encapsulamento da Resposta HTTP
 */
final class Response
{
    public static function json(mixed $data, int $statusCode = 200, array $headers = []): void
    {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');
        
        foreach ($headers as $key => $value) {
            header("$key: $value");
        }

        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    public static function error(string $message, int $statusCode = 400, array $extra = []): void
    {
        self::json(array_merge([
            'sucesso' => false,
            'erro'    => $message
        ], $extra), $statusCode);
    }

    public static function success(mixed $data = null, string $message = 'Operação realizada com sucesso', int $statusCode = 200): void
    {
        $payload = [
            'sucesso'  => true,
            'mensagem' => $message
        ];

        if ($data !== null) {
            $payload['dados'] = $data;
        }

        self::json($payload, $statusCode);
    }

    public static function render(string $viewPath, array $data = []): void
    {
        extract($data);
        $fullPath = BASE_DIR . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR . 'views' . DIRECTORY_SEPARATOR . $viewPath . '.php';

        if (!file_exists($fullPath)) {
            http_response_code(404);
            echo "View não encontrada: " . htmlspecialchars($viewPath);
            exit;
        }

        require $fullPath;
        exit;
    }

    public static function redirect(string $url): void
    {
        header("Location: $url");
        exit;
    }
}
