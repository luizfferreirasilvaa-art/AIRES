<?php
declare(strict_types=1);

namespace Aires\Core;

/**
 * Encapsulamento da Requisição HTTP
 */
final class Request
{
    private string $method;
    private string $path;
    private array $queryParams;
    private array $body;
    private array $headers;

    public function __construct()
    {
        $this->method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
        
        if ($this->method === 'POST' && isset($_POST['_method'])) {
            $this->method = strtoupper((string)$_POST['_method']);
        }

        if (function_exists('getallheaders')) {
            $this->headers = getallheaders() ?: [];
        } else {
            $this->headers = [];
            foreach ($_SERVER as $name => $value) {
                if (str_starts_with($name, 'HTTP_')) {
                    $header = str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))));
                    $this->headers[$header] = $value;
                }
            }
        }
        $this->queryParams = $_GET;

        // Decodificar corpo (JSON ou form-data) com conversão de encoding robusta
        $rawInput = file_get_contents('php://input');
        $decoded = null;
        if (!empty($rawInput)) {
            $decoded = json_decode($rawInput, true);
            if ($decoded === null && function_exists('mb_convert_encoding')) {
                $utf8Input = mb_convert_encoding($rawInput, 'UTF-8', 'ISO-8859-1, Windows-1252, UTF-8');
                $decoded = json_decode($utf8Input, true);
            }
        }
        $this->body = is_array($decoded) ? $decoded : $_POST;

        // Normalização do caminho (Path) removendo subpastas do Laragon (/AIRES/public, /AIRES, etc.)
        $uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

        foreach (['/AIRES/public', '/AIRES', '/public'] as $prefix) {
            if (str_starts_with($uri, $prefix)) {
                $uri = substr($uri, strlen($prefix));
                break;
            }
        }

        $scriptName = $_SERVER['SCRIPT_NAME'] ?? '';
        $baseDir = str_replace('\\', '/', dirname($scriptName));
        if ($baseDir !== '/' && $baseDir !== '.' && str_starts_with($uri, $baseDir)) {
            $uri = substr($uri, strlen($baseDir));
        }
        
        $this->path = '/' . trim($uri, '/');
        if ($this->path === '') {
            $this->path = '/';
        }
    }

    public function getMethod(): string
    {
        return $this->method;
    }

    public function getPath(): string
    {
        return $this->path;
    }

    public function get(string $key, mixed $default = null): mixed
    {
        return $this->queryParams[$key] ?? $default;
    }

    public function allGet(): array
    {
        return $this->queryParams;
    }

    public function input(string $key, mixed $default = null): mixed
    {
        return $this->body[$key] ?? $default;
    }

    public function all(): array
    {
        return $this->body;
    }

    public function isJson(): bool
    {
        $accept = $_SERVER['HTTP_ACCEPT'] ?? '';
        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
        return str_contains($accept, 'application/json') || str_contains($contentType, 'application/json');
    }
}
