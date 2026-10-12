<?php
declare(strict_types=1);

namespace Aires\Controllers;

use Aires\Core\Database;
use Aires\Core\Request;
use Aires\Core\Response;
use Aires\Services\ConflictDetector;
use Aires\Services\TravelAlertCalculator;
use PDO;

final class TaskController
{
    private PDO $pdo;
    private ConflictDetector $conflictDetector;
    private TravelAlertCalculator $alertCalculator;

    public function __construct()
    {
        $this->pdo = Database::getInstance()->getConnection();
        $this->conflictDetector = new ConflictDetector();
        $this->alertCalculator = new TravelAlertCalculator();
    }

    private function getUserId(): int
    {
        return isset($_SESSION['usuario_id']) ? (int)$_SESSION['usuario_id'] : 1;
    }

    public function index(Request $request): void
    {
        $userId = $this->getUserId();
        $status = $request->get('status');
        $missaoId = $request->get('missao_id');
        $inbox = $request->get('inbox');
        $prioridade = $request->get('prioridade');
        $busca = $request->get('busca');
        $mes = $request->get('mes');

        $sql = "SELECT t.*, m.titulo AS missao_titulo, m.cor AS missao_cor,
                       (SELECT COUNT(*) FROM subtarefas st WHERE st.tarefa_id = t.id AND st.deletado_em IS NULL) AS checklist_total,
                       (SELECT COUNT(*) FROM subtarefas st WHERE st.tarefa_id = t.id AND st.concluida = 1 AND st.deletado_em IS NULL) AS checklist_concluido
                FROM tarefas t
                LEFT JOIN missoes m ON t.missao_id = m.id AND m.deletado_em IS NULL
                WHERE t.usuario_id = :usuario_id
                  AND t.deletado_em IS NULL";

        $params = ['usuario_id' => $userId];

        if (!empty($status)) {
            $sql .= " AND t.status = :status";
            $params['status'] = $status;
        }

        if ($inbox !== null && $inbox !== '') {
            $sql .= " AND t.inbox = :inbox";
            $params['inbox'] = (int)$inbox;
        }

        if (!empty($missaoId)) {
            $sql .= " AND t.missao_id = :missao_id";
            $params['missao_id'] = (int)$missaoId;
        }

        if (!empty($prioridade)) {
            $sql .= " AND t.prioridade = :prioridade";
            $params['prioridade'] = $prioridade;
        }

        if (!empty($busca)) {
            $sql .= " AND (t.titulo LIKE :busca OR t.descricao LIKE :busca)";
            $params['busca'] = "%{$busca}%";
        }

        if (!empty($mes)) {
            $sql .= " AND ((t.data_inicio LIKE :mes_inicio) OR (t.data_entrega LIKE :mes_entrega))";
            $params['mes_inicio'] = "{$mes}%";
            $params['mes_entrega'] = "{$mes}%";
        }

        $sql .= " ORDER BY t.ordem ASC, t.data_inicio ASC, t.id DESC";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        $tasks = $stmt->fetchAll();

        $now = date('Y-m-d H:i:s');

        $formatted = array_map(function ($task) use ($now) {
            $total = (int)$task['checklist_total'];
            $done = (int)$task['checklist_concluido'];
            $pct = $total > 0 ? (int)round(($done / $total) * 100) : 0;
            
            $isVencida = false;
            if ($task['status'] !== 'feito' && !empty($task['data_entrega']) && $task['data_entrega'] < $now) {
                $isVencida = true;
            }

            return array_merge($task, [
                'exige_veiculo'        => (bool)$task['exige_veiculo'],
                'inbox'                => (bool)$task['inbox'],
                'vencida'              => $isVencida,
                'checklist_percentual' => $pct
            ]);
        }, $tasks);

        Response::json([
            'sucesso' => true,
            'tarefas' => $formatted,
            'total'   => count($formatted)
        ]);
    }

    public function show(Request $request, string $id): void
    {
        $userId = $this->getUserId();
        $stmt = $this->pdo->prepare("SELECT t.*, m.titulo AS missao_titulo, m.cor AS missao_cor
            FROM tarefas t
            LEFT JOIN missoes m ON t.missao_id = m.id AND m.deletado_em IS NULL
            WHERE t.id = :id AND t.usuario_id = :usuario_id AND t.deletado_em IS NULL LIMIT 1");
        $stmt->execute(['id' => (int)$id, 'usuario_id' => $userId]);
        $task = $stmt->fetch();

        if (!$task) {
            Response::error('Tarefa não encontrada', 404);
            return;
        }

        $stmtSub = $this->pdo->prepare("SELECT * FROM subtarefas WHERE tarefa_id = :tarefa_id AND deletado_em IS NULL ORDER BY ordem ASC, id ASC");
        $stmtSub->execute(['tarefa_id' => (int)$id]);
        $subtasks = $stmtSub->fetchAll();

        $stmtAlert = $this->pdo->prepare("SELECT * FROM alertas_notificacoes WHERE tarefa_id = :tarefa_id AND deletado_em IS NULL LIMIT 1");
        $stmtAlert->execute(['tarefa_id' => (int)$id]);
        $alert = $stmtAlert->fetch();

        $task['subtarefas'] = $subtasks;
        $task['alerta'] = $alert ?: null;
        $task['exige_veiculo'] = (bool)$task['exige_veiculo'];
        $task['inbox'] = (bool)$task['inbox'];

        Response::json([
            'sucesso' => true,
            'tarefa'  => $task
        ]);
    }

    public function checkConflict(Request $request): void
    {
        $userId = $this->getUserId();
        $inicio = $request->get('data_inicio') ?: $request->input('data_inicio');
        $entrega = $request->get('data_entrega') ?: $request->input('data_entrega');
        $excludeId = (int)($request->get('exclude_id') ?: $request->input('exclude_id', 0));

        $conflict = $this->conflictDetector->detectConflict($userId, $inicio, $entrega, $excludeId ?: null);

        Response::json([
            'tem_conflito' => $conflict !== null,
            'conflito'     => $conflict
        ]);
    }

    public function store(Request $request): void
    {
        $userId = $this->getUserId();
        $titulo = trim((string)$request->input('titulo', ''));

        if ($titulo === '') {
            Response::error('O título da tarefa é obrigatório', 422);
            return;
        }

        $missaoId = $request->input('missao_id') ? (int)$request->input('missao_id') : null;
        $descricao = (string)$request->input('descricao', '');
        $prioridade = in_array($request->input('prioridade'), ['critica', 'alta', 'media', 'baixa']) ? $request->input('prioridade') : 'media';
        $status = in_array($request->input('status'), ['planejamento', 'a_fazer', 'fazendo', 'feito']) ? $request->input('status') : 'planejamento';
        $inbox = (bool)$request->input('inbox', false) || ($missaoId === null && empty($request->input('data_inicio')));
        
        $dataInicio = !empty($request->input('data_inicio')) ? (string)$request->input('data_inicio') : null;
        $dataEntrega = !empty($request->input('data_entrega')) ? (string)$request->input('data_entrega') : null;

        if ($dataInicio && $dataEntrega && $dataEntrega < $dataInicio) {
            Response::error('A data/hora de entrega não pode ser anterior ao início', 422);
            return;
        }

        // Auditoria de Agenda (Anti-Colisão)
        $confirmarConflito = (bool)$request->input('confirmar_conflito', false);
        if (!$confirmarConflito && $dataInicio && $dataEntrega) {
            $conflict = $this->conflictDetector->detectConflict($userId, $dataInicio, $dataEntrega);
            if ($conflict) {
                Response::json([
                    'sucesso'       => false,
                    'requer_aviso'  => true,
                    'codigo'        => 'CONFLITO_AGENDA',
                    'conflito'      => $conflict,
                    'mensagem'      => "Atenção: Você já possui a tarefa \"{$conflict['titulo']}\" agendada para este horário. Deseja manter a sobreposição?"
                ], 409);
                return;
            }
        }

        // Logística
        $enderecoLocal = trim((string)$request->input('endereco_local', ''));
        $exigeVeiculo = (bool)$request->input('exige_veiculo', false);
        $tempoViagemMinutos = $exigeVeiculo ? (int)$request->input('tempo_viagem_minutos', 0) : 0;
        
        if ($exigeVeiculo && $tempoViagemMinutos <= 0) {
            Response::error('O tempo de viagem estimado é obrigatório quando a tarefa exige veículo.', 422);
            return;
        }

        $antecedenciaAvisoMinutos = (int)$request->input('antecedencia_aviso_minutos', 0);

        $stmtOrdem = $this->pdo->prepare("SELECT COALESCE(MAX(ordem), 0) + 1 AS proxima FROM tarefas WHERE usuario_id = :usuario_id AND status = :status AND deletado_em IS NULL");
        $stmtOrdem->execute(['usuario_id' => $userId, 'status' => $status]);
        $ordem = (int)$stmtOrdem->fetch()['proxima'];

        $sql = "INSERT INTO tarefas (
                    usuario_id, missao_id, titulo, descricao, prioridade, status, ordem, inbox,
                    data_inicio, data_entrega, endereco_local, exige_veiculo, tempo_viagem_minutos, antecedencia_aviso_minutos
                ) VALUES (
                    :usuario_id, :missao_id, :titulo, :descricao, :prioridade, :status, :ordem, :inbox,
                    :data_inicio, :data_entrega, :endereco_local, :exige_veiculo, :tempo_viagem_minutos, :antecedencia_aviso_minutos
                )";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            'usuario_id'                 => $userId,
            'missao_id'                  => $missaoId,
            'titulo'                     => $titulo,
            'descricao'                  => $descricao,
            'prioridade'                 => $prioridade,
            'status'                     => $status,
            'ordem'                      => $ordem,
            'inbox'                      => $inbox ? 1 : 0,
            'data_inicio'                => $dataInicio,
            'data_entrega'               => $dataEntrega,
            'endereco_local'             => $enderecoLocal ?: null,
            'exige_veiculo'              => $exigeVeiculo ? 1 : 0,
            'tempo_viagem_minutos'       => $tempoViagemMinutos,
            'antecedencia_aviso_minutos' => $antecedenciaAvisoMinutos
        ]);

        $taskId = (int)$this->pdo->lastInsertId();

        $subtarefas = $request->input('subtarefas');
        if (is_array($subtarefas)) {
            $stmtSub = $this->pdo->prepare("INSERT INTO subtarefas (tarefa_id, titulo, concluida, ordem) VALUES (:tarefa_id, :titulo, 0, :ordem)");
            $sOrdem = 1;
            foreach ($subtarefas as $sub) {
                $subTitulo = is_array($sub) ? ($sub['titulo'] ?? '') : (string)$sub;
                $subTitulo = trim($subTitulo);
                if ($subTitulo !== '') {
                    $stmtSub->execute([
                        'tarefa_id' => $taskId,
                        'titulo'    => $subTitulo,
                        'ordem'     => $sOrdem++
                    ]);
                }
            }
        }

        // Gatilho de Notificação com Viagem
        $this->alertCalculator->syncAlert(
            $userId,
            $taskId,
            $titulo,
            $dataInicio,
            $tempoViagemMinutos,
            $antecedenciaAvisoMinutos
        );

        if ($missaoId) {
            $this->recalcularProgressoMissao($missaoId);
        }

        Response::success(['id' => $taskId], 'Tarefa criada com sucesso!', 201);
    }

    public function update(Request $request, string $id): void
    {
        $userId = $this->getUserId();
        $taskId = (int)$id;

        $stmt = $this->pdo->prepare("SELECT * FROM tarefas WHERE id = :id AND usuario_id = :usuario_id AND deletado_em IS NULL LIMIT 1");
        $stmt->execute(['id' => $taskId, 'usuario_id' => $userId]);
        $existing = $stmt->fetch();

        if (!$existing) {
            Response::error('Tarefa não encontrada', 404);
            return;
        }

        $titulo = trim((string)$request->input('titulo', $existing['titulo']));
        if ($titulo === '') {
            Response::error('O título não pode ser vazio', 422);
            return;
        }

        $missaoId = $request->input('missao_id') !== null ? ($request->input('missao_id') ? (int)$request->input('missao_id') : null) : $existing['missao_id'];
        $descricao = $request->input('descricao', $existing['descricao']);
        $prioridade = in_array($request->input('prioridade'), ['critica', 'alta', 'media', 'baixa']) ? $request->input('prioridade') : $existing['prioridade'];
        $status = in_array($request->input('status'), ['planejamento', 'a_fazer', 'fazendo', 'feito']) ? $request->input('status') : $existing['status'];
        $inbox = $request->input('inbox') !== null ? (bool)$request->input('inbox') : (bool)$existing['inbox'];

        $dataInicio = $request->input('data_inicio') !== null ? (!empty($request->input('data_inicio')) ? (string)$request->input('data_inicio') : null) : $existing['data_inicio'];
        $dataEntrega = $request->input('data_entrega') !== null ? (!empty($request->input('data_entrega')) ? (string)$request->input('data_entrega') : null) : $existing['data_entrega'];

        $confirmarConflito = (bool)$request->input('confirmar_conflito', false);
        if (!$confirmarConflito && $dataInicio && $dataEntrega) {
            if ($dataInicio !== $existing['data_inicio'] || $dataEntrega !== $existing['data_entrega']) {
                $conflict = $this->conflictDetector->detectConflict($userId, $dataInicio, $dataEntrega, $taskId);
                if ($conflict) {
                    Response::json([
                        'sucesso'       => false,
                        'requer_aviso'  => true,
                        'codigo'        => 'CONFLITO_AGENDA',
                        'conflito'      => $conflict,
                        'mensagem'      => "Atenção: Você já possui a tarefa \"{$conflict['titulo']}\" agendada para este horário. Deseja manter a sobreposição?"
                    ], 409);
                    return;
                }
            }
        }

        $enderecoLocal = $request->input('endereco_local', $existing['endereco_local']);
        $exigeVeiculo = $request->input('exige_veiculo') !== null ? (bool)$request->input('exige_veiculo') : (bool)$existing['exige_veiculo'];
        $tempoViagemMinutos = $exigeVeiculo ? (int)$request->input('tempo_viagem_minutos', $existing['tempo_viagem_minutos']) : 0;

        if ($exigeVeiculo && $tempoViagemMinutos <= 0) {
            Response::error('O tempo de viagem estimado é obrigatório quando a tarefa exige veículo.', 422);
            return;
        }

        $antecedenciaAvisoMinutos = $request->input('antecedencia_aviso_minutos') !== null ? (int)$request->input('antecedencia_aviso_minutos') : (int)$existing['antecedencia_aviso_minutos'];

        $concluidaEm = $existing['concluida_em'];
        if ($status === 'feito' && $existing['status'] !== 'feito') {
            $concluidaEm = date('Y-m-d H:i:s');
        } elseif ($status !== 'feito') {
            $concluidaEm = null;
        }

        $sql = "UPDATE tarefas SET
                    missao_id = :missao_id,
                    titulo = :titulo,
                    descricao = :descricao,
                    prioridade = :prioridade,
                    status = :status,
                    inbox = :inbox,
                    data_inicio = :data_inicio,
                    data_entrega = :data_entrega,
                    concluida_em = :concluida_em,
                    endereco_local = :endereco_local,
                    exige_veiculo = :exige_veiculo,
                    tempo_viagem_minutos = :tempo_viagem_minutos,
                    antecedencia_aviso_minutos = :antecedencia_aviso_minutos,
                    atualizado_em = NOW()
                WHERE id = :id AND usuario_id = :usuario_id";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            'missao_id'                  => $missaoId,
            'titulo'                     => $titulo,
            'descricao'                  => $descricao,
            'prioridade'                 => $prioridade,
            'status'                     => $status,
            'inbox'                      => $inbox ? 1 : 0,
            'data_inicio'                => $dataInicio,
            'data_entrega'               => $dataEntrega,
            'concluida_em'               => $concluidaEm,
            'endereco_local'             => $enderecoLocal ?: null,
            'exige_veiculo'              => $exigeVeiculo ? 1 : 0,
            'tempo_viagem_minutos'       => $tempoViagemMinutos,
            'antecedencia_aviso_minutos' => $antecedenciaAvisoMinutos,
            'id'                         => $taskId,
            'usuario_id'                 => $userId
        ]);

        $this->alertCalculator->syncAlert(
            $userId,
            $taskId,
            $titulo,
            $dataInicio,
            $tempoViagemMinutos,
            $antecedenciaAvisoMinutos
        );

        if ($missaoId) {
            $this->recalcularProgressoMissao($missaoId);
        }
        if ($existing['missao_id'] && $existing['missao_id'] !== $missaoId) {
            $this->recalcularProgressoMissao((int)$existing['missao_id']);
        }

        Response::success(null, 'Tarefa atualizada com sucesso!');
    }

    public function updateStatus(Request $request, string $id): void
    {
        $userId = $this->getUserId();
        $taskId = (int)$id;
        $status = $request->input('status');
        $ordem = (int)$request->input('ordem', 0);

        if (!in_array($status, ['planejamento', 'a_fazer', 'fazendo', 'feito'])) {
            Response::error('Status inválido', 422);
            return;
        }

        $concluidaEm = ($status === 'feito') ? date('Y-m-d H:i:s') : null;

        $stmt = $this->pdo->prepare("UPDATE tarefas 
            SET status = :status, ordem = :ordem, concluida_em = :concluida_em, atualizado_em = NOW()
            WHERE id = :id AND usuario_id = :usuario_id AND deletado_em IS NULL");
        $stmt->execute([
            'status'       => $status,
            'ordem'        => $ordem,
            'concluida_em' => $concluidaEm,
            'id'           => $taskId,
            'usuario_id'   => $userId
        ]);

        if ($status === 'feito') {
            $this->computarXP($userId, 15);
        }

        $stmtM = $this->pdo->prepare("SELECT missao_id FROM tarefas WHERE id = :id");
        $stmtM->execute(['id' => $taskId]);
        $missaoId = $stmtM->fetchColumn();
        if ($missaoId) {
            $this->recalcularProgressoMissao((int)$missaoId);
        }

        Response::success(null, 'Status atualizado com sucesso!');
    }

    public function destroy(Request $request, string $id): void
    {
        $userId = $this->getUserId();
        $taskId = (int)$id;

        $stmt = $this->pdo->prepare("SELECT missao_id FROM tarefas WHERE id = :id AND usuario_id = :usuario_id LIMIT 1");
        $stmt->execute(['id' => $taskId, 'usuario_id' => $userId]);
        $task = $stmt->fetch();

        if (!$task) {
            Response::error('Tarefa não encontrada', 404);
            return;
        }

        $stmtDel = $this->pdo->prepare("UPDATE tarefas SET deletado_em = NOW() WHERE id = :id AND usuario_id = :usuario_id");
        $stmtDel->execute(['id' => $taskId, 'usuario_id' => $userId]);

        $stmtAlert = $this->pdo->prepare("UPDATE alertas_notificacoes SET deletado_em = NOW() WHERE tarefa_id = :tarefa_id");
        $stmtAlert->execute(['tarefa_id' => $taskId]);

        if ($task['missao_id']) {
            $this->recalcularProgressoMissao((int)$task['missao_id']);
        }

        Response::success(null, 'Tarefa excluída com sucesso!');
    }

    private function recalcularProgressoMissao(int $missaoId): void
    {
        $stmt = $this->pdo->prepare("SELECT 
            COUNT(*) AS total,
            SUM(CASE WHEN status = 'feito' THEN 1 ELSE 0 END) AS concluidas
            FROM tarefas 
            WHERE missao_id = :missao_id AND deletado_em IS NULL");
        $stmt->execute(['missao_id' => $missaoId]);
        $stats = $stmt->fetch();

        $total = (int)($stats['total'] ?? 0);
        $concluidas = (int)($stats['concluidas'] ?? 0);
        $progresso = $total > 0 ? (int)round(($concluidas / $total) * 100) : 0;

        $status = ($total > 0 && $concluidas === $total) ? 'concluida' : 'em_andamento';

        $stmtUp = $this->pdo->prepare("UPDATE missoes SET progresso = :progresso, status = :status, atualizado_em = NOW() WHERE id = :id");
        $stmtUp->execute([
            'progresso' => $progresso,
            'status'    => $status,
            'id'        => $missaoId
        ]);
    }

    private function computarXP(int $userId, int $xpGanho): void
    {
        $hoje = date('Y-m-d');
        $stmt = $this->pdo->prepare("SELECT ultimo_dia_produtivo, streak_dias FROM usuarios WHERE id = :id");
        $stmt->execute(['id' => $userId]);
        $user = $stmt->fetch();

        $streak = (int)($user['streak_dias'] ?? 1);
        $ultimoDia = $user['ultimo_dia_produtivo'] ?? null;

        if ($ultimoDia !== $hoje) {
            $ontem = date('Y-m-d', strtotime('-1 day'));
            if ($ultimoDia === $ontem) {
                $streak++;
            } else {
                $streak = 1;
            }
        }

        $stmtUp = $this->pdo->prepare("UPDATE usuarios 
            SET xp = xp + :xp, streak_dias = :streak, ultimo_dia_produtivo = :hoje 
            WHERE id = :id");
        $stmtUp->execute([
            'xp'     => $xpGanho,
            'streak' => $streak,
            'hoje'   => $hoje,
            'id'     => $userId
        ]);
    }
}
