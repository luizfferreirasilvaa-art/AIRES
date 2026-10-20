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
                   (SELECT COALESCE(SUM(scc.saldo_acumulado_kwh), 0) FROM startup_creditos_cliente scc WHERE scc.credito_id = sc.id) AS total_saldo_acumulado,
                   (SELECT COALESCE(SUM(scc.creditos_consumidos_kwh), 0) FROM startup_creditos_cliente scc WHERE scc.credito_id = sc.id) AS total_consumido_clientes
            FROM startup_creditos sc
            WHERE sc.usuario_id = :uid AND sc.deletado_em IS NULL
            ORDER BY sc.mes_referencia DESC
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute(['uid' => $userId]);
        $creditos = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Resumo geral com métricas executivas da usina
        $stmtResumo = $this->pdo->prepare("
            SELECT 
                COALESCE(SUM(creditos_gerados_kwh), 0) AS total_gerado,
                COALESCE(SUM(creditos_distribuidos_kwh), 0) AS total_distribuido,
                COALESCE(SUM(saldo_kwh), 0) AS total_saldo,
                COUNT(*) AS total_meses,
                COALESCE(AVG(creditos_gerados_kwh), 0) AS media_geracao,
                (SELECT COUNT(*) FROM startup_clientes WHERE usuario_id = :uid1 AND status = 'ativo' AND deletado_em IS NULL) AS total_clientes_ativos,
                (SELECT COALESCE(SUM(qtd_propriedades), 0) FROM startup_clientes WHERE usuario_id = :uid2 AND status = 'ativo' AND deletado_em IS NULL) AS total_propriedades,
                (SELECT COALESCE(AVG(tarifa_kwh), 0.95) FROM startup_faturas WHERE usuario_id = :uid3 AND deletado_em IS NULL) AS tarifa_media
            FROM startup_creditos 
            WHERE usuario_id = :uid AND deletado_em IS NULL
        ");
        $stmtResumo->execute([
            'uid'  => $userId,
            'uid1' => $userId,
            'uid2' => $userId,
            'uid3' => $userId
        ]);
        $resumo = $stmtResumo->fetch(PDO::FETCH_ASSOC) ?: [];

        $totalGerado = (float)($resumo['total_gerado'] ?? 0);
        $totalDist = (float)($resumo['total_distribuido'] ?? 0);
        $totalSaldo = (float)($resumo['total_saldo'] ?? 0);
        $tarifaMedia = (float)($resumo['tarifa_media'] ?? 0.95);
        if ($tarifaMedia <= 0) $tarifaMedia = 0.95;

        $resumo['tarifa_media'] = $tarifaMedia;
        $resumo['valor_estimado_sobra'] = round($totalSaldo * $tarifaMedia, 2);
        $resumo['taxa_retencao_usina'] = $totalGerado > 0 ? round(($totalSaldo / $totalGerado) * 100, 1) : 0;
        $resumo['taxa_distribuicao'] = $totalGerado > 0 ? round(($totalDist / $totalGerado) * 100, 1) : 0;

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

        // Calcular previsão em meses e status contextual de estoque
        return array_map(function ($row) {
            $consumo = (float)$row['creditos_consumidos_kwh'];
            $alocado = (float)$row['creditos_alocados_kwh'];
            $saldo = (float)$row['saldo_acumulado_kwh'];

            if ($consumo > 0) {
                $mesesPrevisao = round($saldo / $consumo, 1);
            } elseif ($saldo > 0) {
                $mesesPrevisao = 99; // Reserva disponível sem consumo registrado ainda
            } else {
                $mesesPrevisao = 0;
            }

            // Status contextual inteligente
            if ($alocado == 0 && $consumo == 0 && $saldo == 0) {
                $statusEstoque = 'aguardando'; // Novo cliente ou rateio não preenchido
                $alertaEstoqueBaixo = false;
            } elseif ($consumo > 0 && $saldo == 0) {
                $statusEstoque = 'zerado'; // Esgotou todos os créditos
                $alertaEstoqueBaixo = true;
            } elseif ($consumo > 0 && $mesesPrevisao < 1.0) {
                $statusEstoque = 'baixo'; // Menos de 1 mês de autonomia
                $alertaEstoqueBaixo = true;
            } elseif ($saldo > 0 && $consumo == 0) {
                $statusEstoque = 'reservado'; // Crédito pronto sem consumo
                $alertaEstoqueBaixo = false;
            } else {
                $statusEstoque = 'saudavel'; // Autonomia adequada
                $alertaEstoqueBaixo = false;
            }

            return array_merge($row, [
                'previsao_meses'       => $mesesPrevisao,
                'alerta_estoque_baixo' => $alertaEstoqueBaixo,
                'status_estoque'       => $statusEstoque
            ]);
        }, $rows);
    }

    public function destroy(Request $request, string $id): void
    {
        $userId = $this->getUserId();
        $creditoId = (int)$id;

        $stmtCheck = $this->pdo->prepare("SELECT * FROM startup_creditos WHERE id = :id AND usuario_id = :uid AND deletado_em IS NULL");
        $stmtCheck->execute(['id' => $creditoId, 'uid' => $userId]);
        $existing = $stmtCheck->fetch(PDO::FETCH_ASSOC);

        if (!$existing) {
            Response::error('Registro de crédito não encontrado.', 404);
            return;
        }

        // Soft delete do registro de crédito
        $this->pdo->prepare("UPDATE startup_creditos SET deletado_em = NOW() WHERE id = :id AND usuario_id = :uid")
            ->execute(['id' => $creditoId, 'uid' => $userId]);

        $this->auditoria->registrar($userId, 'excluir', 'credito', $creditoId, [
            'mes_referencia' => $existing['mes_referencia']
        ]);

        Response::success(null, 'Mês de crédito excluído com sucesso!');
    }
}
