<?php
declare(strict_types=1);

namespace Aires\Core;

/**
 * Roteador HTTP Leve e Seguro
 */
final class Router
{
    private array $routes = [];

    public function get(string $path, array|callable $handler, array $middleware = []): void
    {
        $this->addRoute('GET', $path, $handler, $middleware);
    }

    public function post(string $path, array|callable $handler, array $middleware = []): void
    {
        $this->addRoute('POST', $path, $handler, $middleware);
    }

    public function put(string $path, array|callable $handler, array $middleware = []): void
    {
        $this->addRoute('PUT', $path, $handler, $middleware);
    }

    public function patch(string $path, array|callable $handler, array $middleware = []): void
    {
        $this->addRoute('PATCH', $path, $handler, $middleware);
    }

    public function delete(string $path, array|callable $handler, array $middleware = []): void
    {
        $this->addRoute('DELETE', $path, $handler, $middleware);
    }

    private function addRoute(string $method, string $path, array|callable $handler, array $middleware): void
    {
        $this->routes[] = [
            'method'     => $method,
            'path'       => '/' . trim($path, '/'),
            'handler'    => $handler,
            'middleware' => $middleware
        ];
    }

    public function dispatch(Request $request): void
    {
        $reqMethod = $request->getMethod();
        $reqPath = $request->getPath();

        foreach ($this->routes as $route) {
            if ($route['method'] !== $reqMethod) {
                continue;
            }

            $pattern = preg_replace('/\{([a-zA-Z0-9_]+)\}/', '(?P<$1>[^/]+)', $route['path']);
            $pattern = "#^" . $pattern . "$#";

            if (preg_match($pattern, $reqPath, $matches)) {
                $params = array_filter($matches, fn($k) => !is_numeric($k), ARRAY_FILTER_USE_KEY);

                foreach ($route['middleware'] as $mw) {
                    if (is_callable($mw)) {
                        $mw($request);
                    } elseif (class_exists($mw)) {
                        $instance = new $mw();
                        $instance->handle($request);
                    }
                }

                $handler = $route['handler'];
                if (is_callable($handler)) {
                    $handler($request, ...$params);
                    return;
                }

                if (is_array($handler) && count($handler) === 2) {
                    [$class, $method] = $handler;
                    $controller = new $class();
                    $controller->$method($request, ...$params);
                    return;
                }
            }
        }

        // Rota não encontrada
        if ($request->isJson() || str_starts_with($reqPath, '/api/')) {
            Response::error('Rota não encontrada: ' . $reqPath, 404);
        } else {
            http_response_code(404);
            echo "<h1>404 - Página não encontrada</h1>";
            exit;
        }
    }
}
