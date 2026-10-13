<?php
declare(strict_types=1);

namespace Aires\Controllers;

use Aires\Core\Database;
use Aires\Core\Request;
use Aires\Core\Response;
use Aires\Services\StartupAuditoriaService;
use PDO;

final class StartupCreditoController
{
    private PDO $pdo;
    private StartupAuditoriaService $auditoria;

    public function __construct()
    {
        $this->pdo = Database::getInstance()->getConnection();
        $this->auditoria = new StartupAuditoriaService();
    }

    private function getUserId(): int
    {
        return isset($_SESSION['usuario_id']) ? (int)$_SESSION['usuario_id'] : 1;
    }

    public function index(Request $request): void
    {
        $userId = $this->getUserId();

        $sql = "
            SELECT sc.*,
                   (SELECT COUNT(*) FROM startup_creditos_cliente scc WHERE scc.credito_id = sc.id) AS total_clientes_alocados,
                   (SELECT COALESCE(SUM(scc.saldo_acumulado_kwh), 0) FROM startup_creditos_cliente scc WHERE scc.credito_id = sc.id) AS total_saldo_acumulado
            FROM startup_creditos sc
            WHERE sc.usuario_id = :uid AND sc.deletado_em IS NULL
            ORDER BY sc.mes_referencia DESC
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute(['uid' => $userId]);
        $creditos = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Resumo geral
        $stmtResumo = $this->pdo->prepare("
            SELECT 
                COALESCE(SUM(creditos_gerados_kwh), 0) AS total_gerado,
                COALESCE(SUM(creditos_distribuidos_kwh), 0) AS total_distribuido,
                COALESCE(SUM(saldo_kwh), 0) AS total_saldo
            FROM startup_creditos 
            WHERE usuario_id = :uid AND deletado_em IS NULL
        ");
        $stmtResumo->execute(['uid' => $userId]);
        $resumo = $stmtResumo->fetch(PDO::FETCH_ASSOC);

        Response::json([
            'sucesso'  => true,
            'creditos' => $creditos,
            'resumo'   => $resumo,
            'total'    => count($creditos)
        ]);
    }

    public function show(Request $request, string $id): void
    {
        $userId = $this->getUserId();
        $creditoId = (int)$id;

        $stmt = $this->pdo->prepare("
            SELECT * FROM startup_creditos 
            WHERE id = :id AND usuario_id = :uid AND deletado_em IS NULL 
            LIMIT 1
        ");
        $stmt->execute(['id' => $creditoId, 'uid' => $userId]);
        $credito = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$credito) {
            Response::error('Registro de crédito não encontrado.', 404);
            return;
        }

        $credito['alocacoes'] = $this->buscarAlocacoesComPrevisao($creditoId, $userId);

        Response::json([
            'sucesso' => true,
            'credito' => $credito
        ]);
    }

    public function store(Request $request): void
    {
        $userId = $this->getUserId();
        $mesReferencia = trim((string)$request->input('mes_referencia', date('Y-m')));
        $gerados = (float)$request->input('creditos_gerados_kwh', 0);
        $distribuidos = (float)$request->input('creditos_distribuidos_kwh', 0);
        $saldo = max(0, $gerados - $distribuidos);
        $observacoes = trim((string)$request->input('observacoes', '')) ?: null;

        if ($gerados <= 0) {
            Response::error('Informe a quantidade de créditos gerados no mês.', 422);
            return;
        }

        // Verificar duplicidade de mês
        $stmtCheck = $this->pdo->prepare("SELECT id FROM startup_creditos WHERE usuario_id = :uid AND mes_referencia = :mes AND deletado_em IS NULL");
        $stmtCheck->execute(['uid' => $userId, 'mes' => $mesReferencia]);
        if ($stmtCheck->fetch()) {
            Response::error("Já existe um registro de produção para o mês {$mesReferencia}.", 409);
            return;
        }

        $stmt = $this->pdo->prepare("
            INSERT INTO startup_creditos (usuario_id, mes_referencia, creditos_gerados_kwh, creditos_distribuidos_kwh, saldo_kwh, observacoes)
            VALUES (:uid, :mes, :gerados, :dist, :saldo, :obs)
        ");
        $stmt->execute([
            'uid'     => $userId,
            'mes'     => $mesReferencia,
            'gerados' => $gerados,
            'dist'    => $distribuidos,
            'saldo'   => $saldo,
            'obs'     => $observacoes
        ]);

        $creditoId = (int)$this->pdo->lastInsertId();

        // Se foram passadas alocações por cliente
        $alocacoes = $request->input('alocacoes');
        if (is_array($alocacoes)) {
            $this->salvarAlocacoes($creditoId, $alocacoes);
        }

        $this->auditoria->registrar($userId, 'criar', 'credito', $creditoId, [
            'mes_referencia'       => $mesReferencia,
            'creditos_gerados_kwh' => $gerados,
            'saldo_kwh'            => $saldo
        ]);

        Response::success(['id' => $creditoId], 'Registro de créditos cadastrado com sucesso!', 201);
    }

    public function update(Request $request, string $id): void
    {
        $userId = $this->getUserId();
        $creditoId = (int)$id;

        $stmtCheck = $this->pdo->prepare("SELECT * FROM startup_creditos WHERE id = :id AND usuario_id = :uid AND deletado_em IS NULL");
        $stmtCheck->execute(['id' => $creditoId, 'uid' => $userId]);
        $existing = $stmtCheck->fetch(PDO::FETCH_ASSOC);

        if (!$existing) {
            Response::error('Registro não encontrado.', 404);
            return;
        }

        $gerados = $request->input('creditos_gerados_kwh') !== null ? (float)$request->input('creditos_gerados_kwh') : (float)$existing['creditos_gerados_kwh'];
        $distribuidos = $request->input('creditos_distribuidos_kwh') !== null ? (float)$request->input('creditos_distribuidos_kwh') : (float)$existing['creditos_distribuidos_kwh'];
        $saldo = max(0, $gerados - $distribuidos);
        $observacoes = $request->input('observacoes') !== null ? (trim((string)$request->input('observacoes')) ?: null) : $existing['observacoes'];

        $stmt = $this->pdo->prepare("
            UPDATE startup_creditos SET
                creditos_gerados_kwh = :gerados,
                creditos_distribuidos_kwh = :dist,
                saldo_kwh = :saldo,
                observacoes = :obs,
                atualizado_em = NOW()
            WHERE id = :id AND usuario_id = :uid
        ");
        $stmt->execute([
            'gerados' => $gerados,
            'dist'    => $distribuidos,
            'saldo'   => $saldo,
            'obs'     => $observacoes,
            'id'      => $creditoId,
            'uid'     => $userId
        ]);

        $this->auditoria->registrar($userId, 'editar', 'credito', $creditoId, [
            'creditos_gerados_kwh' => $gerados,
            'saldo_kwh'            => $saldo
        ]);

        Response::success(null, 'Registro de créditos atualizado com sucesso!');
    }

    public function alocacoes(Request $request, string $id): void
    {
        $userId = $this->getUserId();
        $creditoId = (int)$id;

        $alocacoes = $this->buscarAlocacoesComPrevisao($creditoId, $userId);

        Response::json([
            'sucesso'   => true,
            'alocacoes' => $alocacoes
        ]);
    }

    public function alocar(Request $request, string $id): void
    {
        $userId = $this->getUserId();
        $creditoId = (int)$id;

        $stmtCheck = $this->pdo->prepare("SELECT * FROM startup_creditos WHERE id = :id AND usuario_id = :uid AND deletado_em IS NULL");
        $stmtCheck->execute(['id' => $creditoId, 'uid' => $userId]);
        $credito = $stmtCheck->fetch(PDO::FETCH_ASSOC);

        if (!$credito) {
            Response::error('Registro de crédito não encontrado.', 404);
            return;
        }

        $alocacoes = $request->input('alocacoes');
        if (!is_array($alocacoes)) {
            Response::error('Formato de alocações inválido.', 422);
            return;
        }

        $totalDistribuido = $this->salvarAlocacoes($creditoId, $alocacoes);

        // Atualizar total distribuído no cabeçalho
        $saldo = max(0, (float)$credito['creditos_gerados_kwh'] - $totalDistribuido);
        $this->pdo->prepare("
            UPDATE startup_creditos 
            SET creditos_distribuidos_kwh = :dist, saldo_kwh = :saldo, atualizado_em = NOW()
            WHERE id = :id
        ")->execute([
            'dist'  => $totalDistribuido,
            'saldo' => $saldo,
            'id'    => $creditoId
        ]);

        $this->auditoria->registrar($userId, 'alocar_creditos', 'credito', $creditoId, [
            'total_distribuido' => $totalDistribuido,
            'qtd_clientes'      => count($alocacoes)
        ]);

        Response::success(null, 'Alocações de créditos salvas com sucesso!');
    }

    private function salvarAlocacoes(int $creditoId, array $alocacoes): float
    {
        $this->pdo->prepare("DELETE FROM startup_creditos_cliente WHERE credito_id = :cid")->execute(['cid' => $creditoId]);

        $stmt = $this->pdo->prepare("
            INSERT INTO startup_creditos_cliente (credito_id, cliente_id, creditos_alocados_kwh, creditos_consumidos_kwh, saldo_acumulado_kwh)
            VALUES (:cid, :clid, :aloc, :cons, :saldo)
        ");

        $totalDist = 0.0;
        foreach ($alocacoes as $item) {
            $clienteId = (int)($item['cliente_id'] ?? 0);
            if ($clienteId <= 0) continue;

            $aloc = (float)($item['creditos_alocados_kwh'] ?? 0);
            $cons = (float)($item['creditos_consumidos_kwh'] ?? 0);
            $saldo = (float)($item['saldo_acumulado_kwh'] ?? max(0, $aloc - $cons));

            $stmt->execute([
                'cid'   => $creditoId,
                'clid'  => $clienteId,
                'aloc'  => $aloc,
                'cons'  => $cons,
                'saldo' => $saldo
            ]);

            $totalDist += $aloc;
        }

        return $totalDist;
    }

    private function buscarAlocacoesComPrevisao(int $creditoId, int $userId): array
    {
        // Buscar clientes ativos e suas alocações
        $sql = "
            SELECT c.id AS cliente_id, c.nome AS cliente_nome, c.numero_uc, c.qtd_propriedades,
                   COALESCE(scc.creditos_alocados_kwh, 0) AS creditos_alocados_kwh,
                   COALESCE(scc.creditos_consumidos_kwh, 0) AS creditos_consumidos_kwh,
                   COALESCE(scc.saldo_acumulado_kwh, 0) AS saldo_acumulado_kwh
            FROM startup_clientes c
            LEFT JOIN startup_creditos_cliente scc ON scc.cliente_id = c.id AND scc.credito_id = :cid
            WHERE c.usuario_id = :uid AND c.deletado_em IS NULL
            ORDER BY c.nome ASC
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute(['cid' => $creditoId, 'uid' => $userId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Calcular previsão em meses baseada na média de consumo dos últimos 3 meses
        return array_map(function ($row) {
            $consumo = (float)$row['creditos_consumidos_kwh'];
            $saldo = (float)$row['saldo_acumulado_kwh'];

            $mesesPrevisao = ($consumo > 0) ? round($saldo / $consumo, 1) : ($saldo > 0 ? 99 : 0);
            $alertaEstoqueBaixo = ($mesesPrevisao < 1.0);

            return array_merge($row, [
                'previsao_meses'       => $mesesPrevisao,
                'alerta_estoque_baixo' => $alertaEstoqueBaixo
            ]);
        }, $rows);
    }
}
