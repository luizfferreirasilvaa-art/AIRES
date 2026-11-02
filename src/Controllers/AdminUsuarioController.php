<?php
declare(strict_types=1);

namespace Aires\Controllers;

use Aires\Core\Database;
use Aires\Core\Request;
use Aires\Core\Response;
use PDO;

final class AdminUsuarioController
{
    private PDO $pdo;

    public const MODULOS_SISTEMA = [
        'inicio' => [
            'modulo' => 'Produtividade & Pessoal',
            'titulo' => 'Início & Visão Geral',
            'descricao' => 'Dashboard principal com métricas gerais, atalhos rápidos e calendário de entregas.',
            'icone' => '🏠'
        ],
        'tarefas' => [
            'modulo' => 'Produtividade & Pessoal',
            'titulo' => 'Execução & Tarefas',
            'descricao' => 'Quadro Kanban, lista inteligente e calendário de execução com sub-tarefas.',
            'icone' => '📋'
        ],
        'missoes' => [
            'modulo' => 'Produtividade & Pessoal',
            'titulo' => 'Missões Estratégicas',
            'descricao' => 'Planos trimestrais/anuais, metas OKR e orçamento financeiro de missões.',
            'icone' => '⚡'
        ],
        'financas-pessoais' => [
            'modulo' => 'Produtividade & Pessoal',
            'titulo' => 'Finanças Pessoais & Metas',
            'descricao' => 'Dashboard financeiro, teto mensal, parcelamentos de compras e investimentos.',
            'icone' => '💳'
        ],
        'dashboard' => [
            'modulo' => 'Produtividade & Pessoal',
            'titulo' => 'Produtividade & Foco',
            'descricao' => 'Indicadores de velocidade, streaks de foco e gamificação do usuário.',
            'icone' => '📈'
        ],
        'notas' => [
            'modulo' => 'Produtividade & Pessoal',
            'titulo' => 'Base de Conhecimento (Notas)',
            'descricao' => 'Zettelkasten com ideias, notas, atas e referências interconectadas.',
            'icone' => '📦'
        ],
        'startup-clientes' => [
            'modulo' => 'Startup Solar',
            'titulo' => 'Clientes & Contratos',
            'descricao' => 'Cadastro de clientes de energia solar, unidades consumidoras (UC) e contratos.',
            'icone' => '👥'
        ],
        'startup-faturamento' => [
            'modulo' => 'Startup Solar',
            'titulo' => 'Faturamento Solar & Emissor',
            'descricao' => 'Robô emissor de faturas com desconto garantido e painel de cobrança.',
            'icone' => '🧾'
        ],
        'startup-creditos' => [
            'modulo' => 'Startup Solar',
            'titulo' => 'Estoque de Créditos & Usina',
            'descricao' => 'Geração mensal da usina fotovoltaica, saldo de créditos e rateio por cliente.',
            'icone' => '📊'
        ],
        'startup-financeiro' => [
            'modulo' => 'Startup Solar',
            'titulo' => 'Financeiro & Fluxo de Caixa',
            'descricao' => 'Movimentações operacionais, receitas de faturas, custos de usina e inadimplência.',
            'icone' => '💰'
        ],
        'startup-protocolos' => [
            'modulo' => 'Startup Solar',
            'titulo' => 'Protocolos & Chamados',
            'descricao' => 'Acompanhamento de prazos da concessionária Energisa e trocas de titularidade.',
            'icone' => '📑'
        ],
        'startup-dashboard' => [
            'modulo' => 'Startup Solar',
            'titulo' => 'Dashboard Solar Analítico',
            'descricao' => 'Visão executiva com indicadores de rentabilidade, kWh faturados e aproveitamento.',
            'icone' => '📈'
        ],
        'startup-auditoria' => [
            'modulo' => 'Startup Solar',
            'titulo' => 'Log de Auditoria',
            'descricao' => 'Histórico e rastreabilidade de todas as alterações feitas no sistema solar.',
            'icone' => '📋'
        ]
    ];

    public function __construct()
    {
        $this->pdo = Database::getInstance()->getConnection();
        $this->ensureColumns();
    }

    private function ensureColumns(): void
    {
        try {
            $cols = $this->pdo->query("SHOW COLUMNS FROM `usuarios`")->fetchAll(PDO::FETCH_COLUMN);
            if (!in_array('perfil', $cols, true)) {
                $this->pdo->exec("ALTER TABLE `usuarios` ADD COLUMN `perfil` VARCHAR(50) NOT NULL DEFAULT 'usuario'");
            }
            if (!in_array('status', $cols, true)) {
                $this->pdo->exec("ALTER TABLE `usuarios` ADD COLUMN `status` VARCHAR(30) NOT NULL DEFAULT 'ativo'");
            }
            if (!in_array('paginas_permitidas', $cols, true)) {
                $this->pdo->exec("ALTER TABLE `usuarios` ADD COLUMN `paginas_permitidas` TEXT NULL DEFAULT NULL");
            }
            $this->pdo->exec("UPDATE `usuarios` SET `perfil` = 'admin', `status` = 'ativo' WHERE `id` = 1 OR `email` = 'admin@aires.io'");
        } catch (\Throwable $e) {
            // Silencioso se colunas já existem
        }
    }

    private function getUserId(): int
    {
        return isset($_SESSION['usuario_id']) ? (int)$_SESSION['usuario_id'] : 1;
    }

    private function checkAdmin(): void
    {
        $userId = $this->getUserId();
        if ($userId <= 0) {
            Response::error('Não autenticado. Faça login para continuar.', 401);
            exit;
        }

        if ($userId === 1) {
            return; // Master admin sempre tem acesso
        }

        $stmt = $this->pdo->prepare("SELECT perfil FROM usuarios WHERE id = :id AND deletado_em IS NULL");
        $stmt->execute(['id' => $userId]);
        $perfil = (string)$stmt->fetchColumn();

        if ($perfil !== 'admin') {
            Response::error('Acesso negado. Apenas administradores podem gerenciar usuários.', 403);
            exit;
        }
    }

    public function modulosDisponiveis(Request $request): void
    {
        $this->checkAdmin();
        Response::json([
            'sucesso' => true,
            'modulos' => self::MODULOS_SISTEMA
        ]);
    }

    public function index(Request $request): void
    {
        $this->checkAdmin();

        $busca = trim((string)$request->query('busca', ''));
        $filtroPerfil = trim((string)$request->query('perfil', ''));
        $filtroStatus = trim((string)$request->query('status', ''));

        $sql = "SELECT id, nome, email, perfil, status, paginas_permitidas, xp, streak_dias, criado_em, atualizado_em, ultimo_dia_produtivo
                FROM usuarios
                WHERE deletado_em IS NULL";
        $params = [];

        if ($busca !== '') {
            $sql .= " AND (nome LIKE :busca OR email LIKE :busca)";
            $params['busca'] = "%{$busca}%";
        }

        if ($filtroPerfil !== '') {
            $sql .= " AND perfil = :perfil";
            $params['perfil'] = $filtroPerfil;
        }

        if ($filtroStatus !== '') {
            $sql .= " AND status = :status";
            $params['status'] = $filtroStatus;
        }

        $sql .= " ORDER BY (id = 1) DESC, perfil ASC, nome ASC";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        $rawUsers = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $usuarios = [];
        $totalAtivos = 0;
        $totalInativos = 0;
        $totalAdmins = 0;
        $totalMembros = 0;
        $totalPersonalizados = 0;

        foreach ($rawUsers as $u) {
            $paginasDecoded = null;
            if (!empty($u['paginas_permitidas'])) {
                $decoded = json_decode((string)$u['paginas_permitidas'], true);
                if (is_array($decoded)) {
                    $paginasDecoded = $decoded;
                }
            }

            $isAdmin = ($u['perfil'] === 'admin') || ((int)$u['id'] === 1);
            $isAtivo = ($u['status'] === 'ativo');

            if ($isAtivo) $totalAtivos++; else $totalInativos++;
            if ($isAdmin) $totalAdmins++; else $totalMembros++;
            if (!$isAdmin && $paginasDecoded !== null) $totalPersonalizados++;

            $usuarios[] = [
                'id'                  => (int)$u['id'],
                'nome'                => $u['nome'],
                'email'               => $u['email'],
                'perfil'              => $u['perfil'],
                'status'              => $u['status'],
                'is_admin'            => $isAdmin,
                'is_master'           => ((int)$u['id'] === 1),
                'paginas_permitidas'  => $paginasDecoded,
                'qtd_paginas'         => $isAdmin ? count(self::MODULOS_SISTEMA) : ($paginasDecoded ? count($paginasDecoded) : count(self::MODULOS_SISTEMA)),
                'xp'                  => (int)$u['xp'],
                'streak_dias'         => (int)$u['streak_dias'],
                'criado_em'           => $u['criado_em'],
                'atualizado_em'       => $u['atualizado_em'],
                'ultimo_dia'          => $u['ultimo_dia_produtivo']
            ];
        }

        Response::json([
            'sucesso'  => true,
            'usuarios' => $usuarios,
            'kpis'     => [
                'total'          => count($rawUsers),
                'ativos'         => $totalAtivos,
                'inativos'       => $totalInativos,
                'admins'         => $totalAdmins,
                'usuarios'       => $totalMembros,
                'personalizados' => $totalPersonalizados
            ],
            'modulos_disponiveis' => self::MODULOS_SISTEMA
        ]);
    }

    public function show(Request $request, array $params = []): void
    {
        $this->checkAdmin();
        $id = (int)($params['id'] ?? $request->param('id') ?? 0);

        if ($id <= 0) {
            Response::error('ID de usuário inválido.', 422);
            return;
        }

        $stmt = $this->pdo->prepare("SELECT id, nome, email, perfil, status, paginas_permitidas, criado_em, atualizado_em
            FROM usuarios WHERE id = :id AND deletado_em IS NULL LIMIT 1");
        $stmt->execute(['id' => $id]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            Response::error('Usuário não encontrado.', 404);
            return;
        }

        $paginas = null;
        if (!empty($user['paginas_permitidas'])) {
            $decoded = json_decode((string)$user['paginas_permitidas'], true);
            if (is_array($decoded)) {
                $paginas = $decoded;
            }
        }

        Response::json([
            'sucesso' => true,
            'usuario' => [
                'id'                 => (int)$user['id'],
                'nome'               => $user['nome'],
                'email'              => $user['email'],
                'perfil'             => $user['perfil'],
                'status'             => $user['status'],
                'is_admin'           => ($user['perfil'] === 'admin') || ((int)$user['id'] === 1),
                'is_master'          => ((int)$user['id'] === 1),
                'paginas_permitidas' => $paginas,
                'criado_em'          => $user['criado_em']
            ],
            'modulos_disponiveis' => self::MODULOS_SISTEMA
        ]);
    }

    public function store(Request $request): void
    {
        $this->checkAdmin();

        $nome = trim((string)$request->input('nome', ''));
        $email = strtolower(trim((string)$request->input('email', '')));
        $senha = (string)$request->input('senha', '');
        $perfil = (string)$request->input('perfil', 'usuario');
        $status = (string)$request->input('status', 'ativo');
        $paginasInput = $request->input('paginas_permitidas');

        if ($nome === '' || mb_strlen($nome) < 3) {
            Response::error('O nome do usuário deve conter ao menos 3 caracteres.', 422);
            return;
        }

        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Response::error('Informe um endereço de e-mail válido.', 422);
            return;
        }

        if ($senha === '' || mb_strlen($senha) < 6) {
            Response::error('A senha inicial deve conter no mínimo 6 caracteres.', 422);
            return;
        }

        if (!in_array($perfil, ['admin', 'usuario'], true)) {
            $perfil = 'usuario';
        }

        if (!in_array($status, ['ativo', 'inativo'], true)) {
            $status = 'ativo';
        }

        // Validação de unicidade de e-mail
        $stmtCheck = $this->pdo->prepare("SELECT id FROM usuarios WHERE email = :email AND deletado_em IS NULL LIMIT 1");
        $stmtCheck->execute(['email' => $email]);
        if ($stmtCheck->fetch()) {
            Response::error('Já existe um usuário cadastrado com este e-mail.', 422);
            return;
        }

        // Processamento de permissões
        $paginasSalvar = null;
        if ($perfil === 'usuario') {
            if (is_array($paginasInput)) {
                // Filtra apenas slugs válidos
                $validSlugs = array_keys(self::MODULOS_SISTEMA);
                $filtradas = array_values(array_intersect($paginasInput, $validSlugs));
                $paginasSalvar = json_encode($filtradas, JSON_UNESCAPED_UNICODE);
            }
        }

        $senhaHash = password_hash($senha, PASSWORD_BCRYPT);

        $stmtInsert = $this->pdo->prepare("
            INSERT INTO usuarios (nome, email, senha_hash, perfil, status, paginas_permitidas, xp, streak_dias)
            VALUES (:nome, :email, :senha_hash, :perfil, :status, :paginas, 0, 1)
        ");
        $stmtInsert->execute([
            'nome'       => $nome,
            'email'      => $email,
            'senha_hash' => $senhaHash,
            'perfil'     => $perfil,
            'status'     => $status,
            'paginas'    => $paginasSalvar
        ]);

        $newId = (int)$this->pdo->lastInsertId();

        Response::json([
            'sucesso'  => true,
            'mensagem' => "Usuário '{$nome}' cadastrado com sucesso!",
            'id'       => $newId
        ], 201);
    }

    public function update(Request $request, array $params = []): void
    {
        $this->checkAdmin();
        $id = (int)($params['id'] ?? $request->param('id') ?? 0);

        if ($id <= 0) {
            Response::error('ID de usuário inválido.', 422);
            return;
        }

        // Buscar usuário atual
        $stmt = $this->pdo->prepare("SELECT id, nome, email, perfil, status FROM usuarios WHERE id = :id AND deletado_em IS NULL LIMIT 1");
        $stmt->execute(['id' => $id]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            Response::error('Usuário não encontrado.', 404);
            return;
        }

        $nome = trim((string)$request->input('nome', $user['nome']));
        $email = strtolower(trim((string)$request->input('email', $user['email'])));
        $senha = (string)$request->input('senha', '');
        $perfil = (string)$request->input('perfil', $user['perfil']);
        $status = (string)$request->input('status', $user['status']);
        $paginasInput = $request->input('paginas_permitidas');

        if ($nome === '' || mb_strlen($nome) < 3) {
            Response::error('O nome do usuário deve conter ao menos 3 caracteres.', 422);
            return;
        }

        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Response::error('Informe um endereço de e-mail válido.', 422);
            return;
        }

        // Validação de e-mail duplicado
        $stmtCheck = $this->pdo->prepare("SELECT id FROM usuarios WHERE email = :email AND id != :id AND deletado_em IS NULL LIMIT 1");
        $stmtCheck->execute(['email' => $email, 'id' => $id]);
        if ($stmtCheck->fetch()) {
            Response::error('Já existe outro usuário cadastrado com este e-mail.', 422);
            return;
        }

        // Blindagem do usuário master (id=1)
        if ($id === 1) {
            $perfil = 'admin';
            $status = 'ativo';
        }

        if (!in_array($perfil, ['admin', 'usuario'], true)) {
            $perfil = 'usuario';
        }

        if (!in_array($status, ['ativo', 'inativo'], true)) {
            $status = 'ativo';
        }

        // Processamento de permissões
        $paginasSalvar = null;
        if ($perfil === 'usuario') {
            if (is_array($paginasInput)) {
                $validSlugs = array_keys(self::MODULOS_SISTEMA);
                $filtradas = array_values(array_intersect($paginasInput, $validSlugs));
                $paginasSalvar = json_encode($filtradas, JSON_UNESCAPED_UNICODE);
            }
        }

        $paramsUpdate = [
            'id'      => $id,
            'nome'    => $nome,
            'email'   => $email,
            'perfil'  => $perfil,
            'status'  => $status,
            'paginas' => $paginasSalvar
        ];

        $sql = "UPDATE usuarios SET nome = :nome, email = :email, perfil = :perfil, status = :status, paginas_permitidas = :paginas";

        if ($senha !== '') {
            if (mb_strlen($senha) < 6) {
                Response::error('A nova senha deve ter no mínimo 6 caracteres.', 422);
                return;
            }
            $sql .= ", senha_hash = :senha_hash";
            $paramsUpdate['senha_hash'] = password_hash($senha, PASSWORD_BCRYPT);
        }

        $sql .= " WHERE id = :id";

        $stmtUp = $this->pdo->prepare($sql);
        $stmtUp->execute($paramsUpdate);

        Response::json([
            'sucesso'  => true,
            'mensagem' => "Dados do usuário '{$nome}' atualizados com sucesso!"
        ]);
    }

    public function toggleStatus(Request $request, array $params = []): void
    {
        $this->checkAdmin();
        $id = (int)($params['id'] ?? $request->param('id') ?? 0);

        if ($id <= 0) {
            Response::error('ID de usuário inválido.', 422);
            return;
        }

        if ($id === 1 || $id === $this->getUserId()) {
            Response::error('Não é permitido desativar sua própria conta ou o administrador master.', 403);
            return;
        }

        $stmt = $this->pdo->prepare("SELECT id, status FROM usuarios WHERE id = :id AND deletado_em IS NULL LIMIT 1");
        $stmt->execute(['id' => $id]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            Response::error('Usuário não encontrado.', 404);
            return;
        }

        $novoStatus = ($user['status'] === 'ativo') ? 'inativo' : 'ativo';

        $stmtUp = $this->pdo->prepare("UPDATE usuarios SET status = :status WHERE id = :id");
        $stmtUp->execute(['status' => $novoStatus, 'id' => $id]);

        Response::json([
            'sucesso'     => true,
            'novo_status' => $novoStatus,
            'mensagem'    => "Status do usuário alterado para " . ($novoStatus === 'ativo' ? 'Ativo' : 'Inativo') . "."
        ]);
    }

    public function destroy(Request $request, array $params = []): void
    {
        $this->checkAdmin();
        $id = (int)($params['id'] ?? $request->param('id') ?? 0);

        if ($id <= 0) {
            Response::error('ID de usuário inválido.', 422);
            return;
        }

        if ($id === 1) {
            Response::error('O administrador master (ID 1) não pode ser excluído.', 403);
            return;
        }

        if ($id === $this->getUserId()) {
            Response::error('Você não pode excluir sua própria conta enquanto estiver conectado.', 403);
            return;
        }

        $stmt = $this->pdo->prepare("SELECT id, nome FROM usuarios WHERE id = :id AND deletado_em IS NULL LIMIT 1");
        $stmt->execute(['id' => $id]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            Response::error('Usuário não encontrado.', 404);
            return;
        }

        $stmtDel = $this->pdo->prepare("UPDATE usuarios SET deletado_em = NOW(), status = 'inativo' WHERE id = :id");
        $stmtDel->execute(['id' => $id]);

        Response::json([
            'sucesso'  => true,
            'mensagem' => "Usuário '{$user['nome']}' removido com sucesso."
        ]);
    }
}
