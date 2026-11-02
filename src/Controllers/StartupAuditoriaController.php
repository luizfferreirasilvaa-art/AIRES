<?php
declare(strict_types=1);

namespace Aires\Controllers;

use Aires\Core\Database;
use Aires\Core\Request;
use Aires\Core\Response;
use PDO;

final class StartupAuditoriaController
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getInstance()->getConnection();
    }

    private function getUserId(): int
    {
        return isset($_SESSION['usuario_id']) ? (int)$_SESSION['usuario_id'] : 1;
    }

    public function index(Request $request): void
    {
        $userId = $this->getUserId();
        $entidade = trim((string)$request->get('entidade', ''));
        $acao = trim((string)$request->get('acao', ''));

        $sql = "
            SELECT a.*, u.nome AS usuario_nome, u.email AS usuario_email
            FROM startup_auditoria a
            LEFT JOIN usuarios u ON u.id = a.usuario_id
            WHERE a.usuario_id = :uid
        ";
        $params = ['uid' => $userId];

        if ($entidade !== '') {
            $sql .= " AND a.entidade = :entidade";
            $params['entidade'] = $entidade;
        }

        if ($acao !== '') {
            $sql .= " AND a.acao = :acao";
            $params['acao'] = $acao;
        }

        $sql .= " ORDER BY a.criado_em DESC, a.id DESC LIMIT 100";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $formatted = array_map(function ($log) {
            $detalhes = null;
            if (!empty($log['detalhes'])) {
                $detalhes = json_decode($log['detalhes'], true);
            }
            return array_merge($log, [
                'detalhes_json' => $detalhes
            ]);
        }, $logs);

        Response::json([
            'sucesso' => true,
            'logs'    => $formatted,
            'total'   => count($formatted)
        ]);
    }

    /**
     * Lista todos os itens apagados pelo usuário nos últimos 7 dias (Lixeira & Restauração Rápida)
     */
    public function lixeira(Request $request): void
    {
        $userId = $this->getUserId();
        $itensLixeira = [];

        // 1. Missões Estratégicas
        try {
            $stmt = $this->pdo->prepare("
                SELECT id, 'missao' AS tipo, 'Missão Estratégica' AS tipo_label, '🎯' AS icone,
                       titulo, status AS subinfo, orcamento_estimado AS valor, deletado_em,
                       GREATEST(0, 7 - DATEDIFF(NOW(), deletado_em)) AS dias_restantes
                FROM missoes
                WHERE usuario_id = :uid
                  AND deletado_em IS NOT NULL
                  AND deletado_em >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            ");
            $stmt->execute(['uid' => $userId]);
            $itensLixeira = array_merge($itensLixeira, $stmt->fetchAll(PDO::FETCH_ASSOC));
        } catch (\Throwable $e) {}

        // 2. Tarefas / Ações
        try {
            $stmt = $this->pdo->prepare("
                SELECT id, 'tarefa' AS tipo, 'Ação / Tarefa' AS tipo_label, '⚡' AS icone,
                       titulo, status AS subinfo, NULL AS valor, deletado_em,
                       GREATEST(0, 7 - DATEDIFF(NOW(), deletado_em)) AS dias_restantes
                FROM tarefas
                WHERE usuario_id = :uid
                  AND deletado_em IS NOT NULL
                  AND deletado_em >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            ");
            $stmt->execute(['uid' => $userId]);
            $itensLixeira = array_merge($itensLixeira, $stmt->fetchAll(PDO::FETCH_ASSOC));
        } catch (\Throwable $e) {}

        // 3. Notas / Conhecimento
        try {
            $stmt = $this->pdo->prepare("
                SELECT id, 'nota' AS tipo, 'Nota / Conhecimento' AS tipo_label, '📝' AS icone,
                       titulo, categoria AS subinfo, NULL AS valor, deletado_em,
                       GREATEST(0, 7 - DATEDIFF(NOW(), deletado_em)) AS dias_restantes
                FROM notas
                WHERE usuario_id = :uid
                  AND deletado_em IS NOT NULL
                  AND deletado_em >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            ");
            $stmt->execute(['uid' => $userId]);
            $itensLixeira = array_merge($itensLixeira, $stmt->fetchAll(PDO::FETCH_ASSOC));
        } catch (\Throwable $e) {}

        // 4. Finanças Pessoais & Metas
        try {
            $stmt = $this->pdo->prepare("
                SELECT id, 'financa' AS tipo, 'Finança / Meta Pessoal' AS tipo_label, '💳' AS icone,
                       titulo, categoria AS subinfo, valor_total AS valor, deletado_em,
                       GREATEST(0, 7 - DATEDIFF(NOW(), deletado_em)) AS dias_restantes
                FROM financas_pessoais_itens
                WHERE usuario_id = :uid
                  AND deletado_em IS NOT NULL
                  AND deletado_em >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            ");
            $stmt->execute(['uid' => $userId]);
            $itensLixeira = array_merge($itensLixeira, $stmt->fetchAll(PDO::FETCH_ASSOC));
        } catch (\Throwable $e) {}

        // 5. Investimentos & Economias
        try {
            $stmt = $this->pdo->prepare("
                SELECT id, 'investimento' AS tipo, 'Investimento / Economia' AS tipo_label, '📈' AS icone,
                       nome AS titulo, tipo_ativo AS subinfo, valor_atual AS valor, deletado_em,
                       GREATEST(0, 7 - DATEDIFF(NOW(), deletado_em)) AS dias_restantes
                FROM financas_investimentos
                WHERE usuario_id = :uid
                  AND deletado_em IS NOT NULL
                  AND deletado_em >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            ");
            $stmt->execute(['uid' => $userId]);
            $itensLixeira = array_merge($itensLixeira, $stmt->fetchAll(PDO::FETCH_ASSOC));
        } catch (\Throwable $e) {}

        // 6. Itens de Orçamento de Missão
        try {
            $stmt = $this->pdo->prepare("
                SELECT id, 'orcamento' AS tipo, 'Orçamento de Missão' AS tipo_label, '💰' AS icone,
                       descricao AS titulo, categoria AS subinfo, valor_total AS valor, deletado_em,
                       GREATEST(0, 7 - DATEDIFF(NOW(), deletado_em)) AS dias_restantes
                FROM missao_orcamento_itens
                WHERE usuario_id = :uid
                  AND deletado_em IS NOT NULL
                  AND deletado_em >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            ");
            $stmt->execute(['uid' => $userId]);
            $itensLixeira = array_merge($itensLixeira, $stmt->fetchAll(PDO::FETCH_ASSOC));
        } catch (\Throwable $e) {}

        // 7. Clientes da Startup
        try {
            $stmt = $this->pdo->prepare("
                SELECT id, 'cliente' AS tipo, 'Cliente Startup' AS tipo_label, '👥' AS icone,
                       nome AS titulo, numero_uc AS subinfo, NULL AS valor, deletado_em,
                       GREATEST(0, 7 - DATEDIFF(NOW(), deletado_em)) AS dias_restantes
                FROM startup_clientes
                WHERE usuario_id = :uid
                  AND deletado_em IS NOT NULL
                  AND deletado_em >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            ");
            $stmt->execute(['uid' => $userId]);
            $itensLixeira = array_merge($itensLixeira, $stmt->fetchAll(PDO::FETCH_ASSOC));
        } catch (\Throwable $e) {}

        // 8. Protocolos da Startup
        try {
            $stmt = $this->pdo->prepare("
                SELECT id, 'protocolo' AS tipo, 'Protocolo de Suporte' AS tipo_label, '📋' AS icone,
                       numero_protocolo AS titulo, titulo AS subinfo, NULL AS valor, deletado_em,
                       GREATEST(0, 7 - DATEDIFF(NOW(), deletado_em)) AS dias_restantes
                FROM startup_protocolos
                WHERE usuario_id = :uid
                  AND deletado_em IS NOT NULL
                  AND deletado_em >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            ");
            $stmt->execute(['uid' => $userId]);
            $itensLixeira = array_merge($itensLixeira, $stmt->fetchAll(PDO::FETCH_ASSOC));
        } catch (\Throwable $e) {}

        // Ordena por deletado_em decrescente (mais recentes primeiro)
        usort($itensLixeira, function ($a, $b) {
            return strcmp((string)$b['deletado_em'], (string)$a['deletado_em']);
        });

        // Formatação final
        $formatados = array_map(function ($it) {
            $dias = (int)$it['dias_restantes'];
            $expiraTexto = $dias === 0 ? 'Expira hoje' : ($dias === 1 ? 'Expira em 1 dia' : "Expira em {$dias} dias");
            return array_merge($it, [
                'id'             => (int)$it['id'],
                'dias_restantes' => $dias,
                'expira_texto'   => $expiraTexto,
                'valor'          => $it['valor'] !== null ? (float)$it['valor'] : null
            ]);
        }, $itensLixeira);

        Response::json([
            'sucesso' => true,
            'total'   => count($formatados),
            'itens'   => $formatados
        ]);
    }

    /**
     * Restaura um item apagado da lixeira (dentro do prazo de 7 dias)
     */
    public function restaurar(Request $request): void
    {
        $userId = $this->getUserId();
        $tipo = trim((string)$request->input('tipo', ''));
        $id = (int)$request->input('id', 0);

        if ($tipo === '' || $id <= 0) {
            Response::error('Parâmetros inválidos para restauração.', 400);
            return;
        }

        $tabelas = [
            'missao'       => ['tabela' => 'missoes', 'campo_titulo' => 'titulo', 'nome' => 'Missão Estratégica'],
            'tarefa'       => ['tabela' => 'tarefas', 'campo_titulo' => 'titulo', 'nome' => 'Ação / Tarefa'],
            'nota'         => ['tabela' => 'notas', 'campo_titulo' => 'titulo', 'nome' => 'Nota'],
            'financa'      => ['tabela' => 'financas_pessoais_itens', 'campo_titulo' => 'titulo', 'nome' => 'Finança / Meta Pessoal'],
            'investimento' => ['tabela' => 'financas_investimentos', 'campo_titulo' => 'nome', 'nome' => 'Investimento / Economia'],
            'orcamento'    => ['tabela' => 'missao_orcamento_itens', 'campo_titulo' => 'descricao', 'nome' => 'Item de Orçamento'],
            'cliente'      => ['tabela' => 'startup_clientes', 'campo_titulo' => 'nome', 'nome' => 'Cliente Startup'],
            'protocolo'    => ['tabela' => 'startup_protocolos', 'campo_titulo' => 'numero_protocolo', 'nome' => 'Protocolo']
        ];

        if (!isset($tabelas[$tipo])) {
            Response::error("Tipo de item não suportado para restauração: {$tipo}", 400);
            return;
        }

        $config = $tabelas[$tipo];
        $tabela = $config['tabela'];
        $campoTitulo = $config['campo_titulo'];

        // Verifica existência do item excluído
        $stmtCheck = $this->pdo->prepare("
            SELECT id, {$campoTitulo} AS titulo, deletado_em
            FROM {$tabela}
            WHERE id = :id AND usuario_id = :uid AND deletado_em IS NOT NULL
            LIMIT 1
        ");
        $stmtCheck->execute(['id' => $id, 'uid' => $userId]);
        $item = $stmtCheck->fetch(PDO::FETCH_ASSOC);

        if (!$item) {
            Response::error("Item não encontrado na lixeira ou já restaurado.", 404);
            return;
        }

        // Restaura o item (remove soft delete)
        $stmtRestore = $this->pdo->prepare("
            UPDATE {$tabela}
            SET deletado_em = NULL
            WHERE id = :id AND usuario_id = :uid
        ");
        $stmtRestore->execute(['id' => $id, 'uid' => $userId]);

        // Se for tarefa, também reativa notificações vinculadas
        if ($tipo === 'tarefa') {
            try {
                $this->pdo->prepare("UPDATE alertas_notificacoes SET deletado_em = NULL WHERE tarefa_id = :id")
                    ->execute(['id' => $id]);
            } catch (\Throwable $e) {}
        }

        // Registra log na Auditoria
        $tituloItem = $item['titulo'] ?? "#{$id}";
        try {
            (new \Aires\Services\StartupAuditoriaService())->registrar(
                $userId,
                'restaurar',
                $tabela,
                $id,
                [
                    'tipo'         => $tipo,
                    'titulo'       => $tituloItem,
                    'mensagem'     => "Item '{$tituloItem}' ({$config['nome']}) restaurado com sucesso pela Lixeira de 7 dias."
                ]
            );
        } catch (\Throwable $e) {}

        Response::json([
            'sucesso'  => true,
            'mensagem' => "{$config['nome']} '{$tituloItem}' restaurada com sucesso!"
        ]);
    }
}
