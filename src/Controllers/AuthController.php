<?php
declare(strict_types=1);

namespace Aires\Controllers;

use Aires\Core\Database;
use Aires\Core\Request;
use Aires\Core\Response;
use PDO;

final class AuthController
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getInstance()->getConnection();
    }

    public function showLogin(Request $request): void
    {
        // Se já autenticado, redireciona para a tela inicial
        if (isset($_SESSION['usuario_id'])) {
            Response::redirect(Request::getBasePath() . '/');
            return;
        }

        Response::render('login');
    }

    public function login(Request $request): void
    {
        $login = trim((string)($request->input('login') ?? $request->input('email') ?? ''));
        $senha = (string)$request->input('senha', '');

        if ($login === '' || $senha === '') {
            Response::error('Informe o usuário/e-mail e a senha de acesso.', 422);
            return;
        }

        // Permitir login tanto com email completo (ex: admin@aires.io) quanto com alias ("admin")
        $stmt = $this->pdo->prepare("SELECT id, nome, email, senha_hash FROM usuarios 
            WHERE (email = :login OR (email = 'admin@aires.io' AND :login_alias = 'admin')) 
              AND deletado_em IS NULL 
            LIMIT 1");
            
        $stmt->execute([
            'login'       => $login,
            'login_alias' => strtolower($login)
        ]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($senha, $user['senha_hash'])) {
            Response::error('Credenciais inválidas. Verifique seu usuário e senha.', 401);
            return;
        }

        // Iniciar dados de autenticação na sessão
        $_SESSION['usuario_id'] = (int)$user['id'];
        $_SESSION['usuario_nome'] = $user['nome'];
        $_SESSION['usuario_email'] = $user['email'];

        $redirectUrl = Request::getBasePath() . '/';

        Response::json([
            'sucesso'      => true,
            'mensagem'     => 'Acesso autorizado. Bem-vindo ao AIRES!',
            'redirecionar' => $redirectUrl,
            'usuario'      => [
                'id'    => (int)$user['id'],
                'nome'  => $user['nome'],
                'email' => $user['email']
            ]
        ]);
    }

    public function logout(Request $request): void
    {
        // Limpar variáveis de sessão
        $_SESSION = [];

        if (session_id()) {
            session_destroy();
        }

        $redirectUrl = Request::getBasePath() . '/login';

        if ($request->isJson()) {
            Response::json([
                'sucesso'      => true,
                'redirecionar' => $redirectUrl
            ]);
            return;
        }

        Response::redirect($redirectUrl);
    }

    public function me(Request $request): void
    {
        if (!isset($_SESSION['usuario_id'])) {
            Response::error('Não autenticado', 401);
            return;
        }

        Response::json([
            'sucesso' => true,
            'usuario' => [
                'id'    => (int)$_SESSION['usuario_id'],
                'nome'  => $_SESSION['usuario_nome'] ?? 'Administrador',
                'email' => $_SESSION['usuario_email'] ?? ''
            ]
        ]);
    }
}
