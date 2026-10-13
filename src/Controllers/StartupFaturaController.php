<?php
declare(strict_types=1);

namespace Aires\Controllers;

use Aires\Core\Database;
use Aires\Core\Request;
use Aires\Core\Response;
use Aires\Services\StartupAuditoriaService;
use PDO;

final class StartupFaturaController
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
        $clienteId = $request->get('cliente_id');
        $mes = $request->get('mes_referencia');
        $status = $request->get('status');

        $sql = "
            SELECT f.*, c.nome AS cliente_nome, c.numero_uc, c.tipo_pessoa, c.email AS cliente_email, c.whatsapp AS cliente_whatsapp
            FROM startup_faturas f
            JOIN startup_clientes c ON c.id = f.cliente_id
            WHERE f.usuario_id = :uid AND f.deletado_em IS NULL
        ";
        $params = ['uid' => $userId];

        if (!empty($clienteId)) {
            $sql .= " AND f.cliente_id = :cliente_id";
            $params['cliente_id'] = (int)$clienteId;
        }

        if (!empty($mes)) {
            $sql .= " AND f.mes_referencia = :mes";
            $params['mes'] = $mes;
        }

        if (!empty($status)) {
            $sql .= " AND f.status = :status";
            $params['status'] = $status;
        }

        $sql .= " ORDER BY f.mes_referencia DESC, f.id DESC";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        $faturas = $stmt->fetchAll(PDO::FETCH_ASSOC);

        Response::json([
            'sucesso' => true,
            'faturas' => $faturas,
            'total'   => count($faturas)
        ]);
    }

    public function show(Request $request, string $id): void
    {
        $userId = $this->getUserId();
        $stmt = $this->pdo->prepare("
            SELECT f.*, c.nome AS cliente_nome, c.numero_uc, c.tipo_pessoa, c.cpf_cnpj, c.endereco, c.telefone, c.email, c.whatsapp
            FROM startup_faturas f
            JOIN startup_clientes c ON c.id = f.cliente_id
            WHERE f.id = :id AND f.usuario_id = :uid AND f.deletado_em IS NULL
            LIMIT 1
        ");
        $stmt->execute(['id' => (int)$id, 'uid' => $userId]);
        $fatura = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$fatura) {
            Response::error('Fatura não encontrada.', 404);
            return;
        }

        Response::json([
            'sucesso' => true,
            'fatura'  => $fatura
        ]);
    }

    public function store(Request $request): void
    {
        $userId = $this->getUserId();
        $clienteId = (int)$request->input('cliente_id', 0);
        $mesReferencia = trim((string)$request->input('mes_referencia', date('Y-m')));

        if ($clienteId <= 0) {
            Response::error('Selecione um cliente para emitir a fatura.', 422);
            return;
        }

        // Buscar dados do cliente
        $stmtCli = $this->pdo->prepare("SELECT * FROM startup_clientes WHERE id = :id AND usuario_id = :uid AND deletado_em IS NULL");
        $stmtCli->execute(['id' => $clienteId, 'uid' => $userId]);
        $cliente = $stmtCli->fetch(PDO::FETCH_ASSOC);

        if (!$cliente) {
            Response::error('Cliente não localizado.', 404);
            return;
        }

        // Variáveis de faturamento (Energisa)
        $consumoKwh = (float)$request->input('consumo_kwh', 0);
        $creditosInjetados = (float)$request->input('creditos_injetados_kwh', 0);
        $iluminacaoPublica = (float)$request->input('iluminacao_publica', 0);
        $tarifaKwh = (float)$request->input('tarifa_kwh', 0.95);
        if ($tarifaKwh <= 0) $tarifaKwh = 0.95;

        $descontoPct = (float)$request->input('desconto_pct', (float)$cliente['desconto_padrao_pct']);

        // Regra de Cálculo AIRES:
        // 1. Valor que viria na Energisa = (consumo_kwh * tarifa) + iluminação pública
        $valorEnergisa = (float)$request->input('valor_energisa', 0);
        if ($valorEnergisa <= 0) {
            $valorEnergisa = round(($consumoKwh * $tarifaKwh) + $iluminacaoPublica, 2);
        }

        // 2. Base da soma = créditos injetados consumidos + iluminação pública
        // Conforme instrução: "irá somar a quantidade consumida de créditos + iluminação publica e dará o desconto em cima do valor da soma"
        $baseSoma = round(($creditosInjetados * $tarifaKwh) + $iluminacaoPublica, 2);
        $valorDesconto = round($baseSoma * ($descontoPct / 100), 2);

        // 3. Valor cobrado pela empresa = Valor Energisa - Desconto
        $valorCobrado = (float)$request->input('valor_cobrado', 0);
        if ($valorCobrado <= 0) {
            $valorCobrado = max(0, round($valorEnergisa - $valorDesconto, 2));
        }

        $status = in_array($request->input('status'), ['rascunho', 'emitida', 'enviada', 'paga', 'atrasada', 'cancelada'], true)
            ? $request->input('status')
            : 'emitida';

        $dataEmissao = !empty($request->input('data_emissao')) ? (string)$request->input('data_emissao') : date('Y-m-d');
        $dataVencimento = !empty($request->input('data_vencimento')) ? (string)$request->input('data_vencimento') : date('Y-m-d', strtotime('+15 days'));
        $dataPagamento = ($status === 'paga') ? (!empty($request->input('data_pagamento')) ? (string)$request->input('data_pagamento') : date('Y-m-d')) : null;
        $observacoes = trim((string)$request->input('observacoes', '')) ?: null;

        $arquivoAnexo = null;
        $nomeArquivoAnexo = null;
        $anexoBase64 = $request->input('anexo_base64');
        $anexoNome = (string)$request->input('anexo_nome', '');

        if (!empty($anexoBase64)) {
            $salvo = $this->salvarArquivoBase64($userId, $anexoBase64, $anexoNome ?: 'fatura.pdf');
            if ($salvo) {
                $arquivoAnexo = $salvo['path'];
                $nomeArquivoAnexo = $salvo['name'];
            }
        }

        $stmt = $this->pdo->prepare("
            INSERT INTO startup_faturas (
                usuario_id, cliente_id, mes_referencia, consumo_kwh, creditos_injetados_kwh,
                iluminacao_publica, tarifa_kwh, valor_energisa, desconto_pct, valor_desconto,
                valor_cobrado, status, data_emissao, data_vencimento, data_pagamento, observacoes,
                arquivo_anexo, nome_arquivo_anexo
            ) VALUES (
                :uid, :cid, :mes, :consumo, :creditos,
                :ilum, :tarifa, :v_energisa, :desc_pct, :v_desconto,
                :v_cobrado, :status, :emissao, :vencimento, :pagamento, :obs,
                :anexo, :nome_anexo
            )
        ");

        $stmt->execute([
            'uid'        => $userId,
            'cid'        => $clienteId,
            'mes'        => $mesReferencia,
            'consumo'    => $consumoKwh,
            'creditos'   => $creditosInjetados,
            'ilum'       => $iluminacaoPublica,
            'tarifa'     => $tarifaKwh,
            'v_energisa' => $valorEnergisa,
            'desc_pct'   => $descontoPct,
            'v_desconto' => $valorDesconto,
            'v_cobrado'  => $valorCobrado,
            'status'     => $status,
            'emissao'    => $dataEmissao,
            'vencimento' => $dataVencimento,
            'pagamento'  => $dataPagamento,
            'obs'        => $observacoes,
            'anexo'      => $arquivoAnexo,
            'nome_anexo' => $nomeArquivoAnexo
        ]);

        $faturaId = (int)$this->pdo->lastInsertId();

        // Se criada como paga, registrar entrada financeira
        if ($status === 'paga') {
            $this->pdo->prepare("
                INSERT INTO startup_pagamentos (usuario_id, fatura_id, cliente_id, tipo, categoria, descricao, valor, metodo_pagamento, data_pagamento)
                VALUES (:uid, :fid, :cid, 'entrada', 'fatura_cliente', :desc, :val, 'pix', :dt)
            ")->execute([
                'uid'  => $userId,
                'fid'  => $faturaId,
                'cid'  => $clienteId,
                'desc' => "Recebimento Fatura Solar {$mesReferencia} - " . $cliente['nome'],
                'val'  => $valorCobrado,
                'dt'   => $dataPagamento ?: date('Y-m-d')
            ]);
        }

        $this->auditoria->registrar($userId, 'emitir_fatura', 'fatura', $faturaId, [
            'cliente'        => $cliente['nome'],
            'mes_referencia' => $mesReferencia,
            'valor_energisa' => $valorEnergisa,
            'desconto'       => $valorDesconto,
            'valor_cobrado'  => $valorCobrado,
            'status'         => $status
        ]);

        Response::success(['id' => $faturaId], 'Fatura solar gerada com sucesso!', 201);
    }

    public function update(Request $request, string $id): void
    {
        $userId = $this->getUserId();
        $faturaId = (int)$id;

        $stmtCheck = $this->pdo->prepare("SELECT * FROM startup_faturas WHERE id = :id AND usuario_id = :uid AND deletado_em IS NULL");
        $stmtCheck->execute(['id' => $faturaId, 'uid' => $userId]);
        $existing = $stmtCheck->fetch(PDO::FETCH_ASSOC);

        if (!$existing) {
            Response::error('Fatura não encontrada.', 404);
            return;
        }

        $consumoKwh = $request->input('consumo_kwh') !== null ? (float)$request->input('consumo_kwh') : (float)$existing['consumo_kwh'];
        $creditosInjetados = $request->input('creditos_injetados_kwh') !== null ? (float)$request->input('creditos_injetados_kwh') : (float)$existing['creditos_injetados_kwh'];
        $iluminacaoPublica = $request->input('iluminacao_publica') !== null ? (float)$request->input('iluminacao_publica') : (float)$existing['iluminacao_publica'];
        $tarifaKwh = $request->input('tarifa_kwh') !== null ? (float)$request->input('tarifa_kwh') : (float)$existing['tarifa_kwh'];
        $descontoPct = $request->input('desconto_pct') !== null ? (float)$request->input('desconto_pct') : (float)$existing['desconto_pct'];

        $valorEnergisa = $request->input('valor_energisa') !== null ? (float)$request->input('valor_energisa') : round(($consumoKwh * $tarifaKwh) + $iluminacaoPublica, 2);
        $baseSoma = round(($creditosInjetados * $tarifaKwh) + $iluminacaoPublica, 2);
        $valorDesconto = round($baseSoma * ($descontoPct / 100), 2);
        $valorCobrado = $request->input('valor_cobrado') !== null ? (float)$request->input('valor_cobrado') : max(0, round($valorEnergisa - $valorDesconto, 2));

        $status = in_array($request->input('status'), ['rascunho', 'emitida', 'enviada', 'paga', 'atrasada', 'cancelada'], true)
            ? $request->input('status')
            : $existing['status'];

        $dataVencimento = $request->input('data_vencimento') !== null ? ($request->input('data_vencimento') ?: null) : $existing['data_vencimento'];
        $dataPagamento = ($status === 'paga')
            ? ($request->input('data_pagamento') ?: ($existing['data_pagamento'] ?: date('Y-m-d')))
            : null;

        $observacoes = $request->input('observacoes') !== null ? (trim((string)$request->input('observacoes')) ?: null) : $existing['observacoes'];

        $arquivoAnexo = $existing['arquivo_anexo'] ?? null;
        $nomeArquivoAnexo = $existing['nome_arquivo_anexo'] ?? null;

        if ($request->input('remover_anexo') === true) {
            $this->excluirArquivoAnexo($arquivoAnexo);
            $arquivoAnexo = null;
            $nomeArquivoAnexo = null;
        } elseif (!empty($request->input('anexo_base64'))) {
            $this->excluirArquivoAnexo($arquivoAnexo);
            $salvo = $this->salvarArquivoBase64($userId, (string)$request->input('anexo_base64'), (string)$request->input('anexo_nome', 'fatura.pdf'));
            if ($salvo) {
                $arquivoAnexo = $salvo['path'];
                $nomeArquivoAnexo = $salvo['name'];
            }
        }

        $stmt = $this->pdo->prepare("
            UPDATE startup_faturas SET
                consumo_kwh = :consumo,
                creditos_injetados_kwh = :creditos,
                iluminacao_publica = :ilum,
                tarifa_kwh = :tarifa,
                valor_energisa = :v_energisa,
                desconto_pct = :desc_pct,
                valor_desconto = :v_desconto,
                valor_cobrado = :v_cobrado,
                status = :status,
                data_vencimento = :vencimento,
                data_pagamento = :pagamento,
                observacoes = :obs,
                arquivo_anexo = :anexo,
                nome_arquivo_anexo = :nome_anexo,
                atualizado_em = NOW()
            WHERE id = :id AND usuario_id = :uid
        ");

        $stmt->execute([
            'consumo'    => $consumoKwh,
            'creditos'   => $creditosInjetados,
            'ilum'       => $iluminacaoPublica,
            'tarifa'     => $tarifaKwh,
            'v_energisa' => $valorEnergisa,
            'desc_pct'   => $descontoPct,
            'v_desconto' => $valorDesconto,
            'v_cobrado'  => $valorCobrado,
            'status'     => $status,
            'vencimento' => $dataVencimento,
            'pagamento'  => $dataPagamento,
            'obs'        => $observacoes,
            'anexo'      => $arquivoAnexo,
            'nome_anexo' => $nomeArquivoAnexo,
            'id'         => $faturaId,
            'uid'        => $userId
        ]);

        $this->auditoria->registrar($userId, 'editar', 'fatura', $faturaId, [
            'status'        => $status,
            'valor_cobrado' => $valorCobrado
        ]);

        Response::success(null, 'Fatura atualizada com sucesso!');
    }

    public function updateStatus(Request $request, string $id): void
    {
        $userId = $this->getUserId();
        $faturaId = (int)$id;
        $status = (string)$request->input('status', '');

        if (!in_array($status, ['rascunho', 'emitida', 'enviada', 'paga', 'atrasada', 'cancelada'], true)) {
            Response::error('Status inválido.', 422);
            return;
        }

        $stmtCheck = $this->pdo->prepare("
            SELECT f.*, c.nome AS cliente_nome 
            FROM startup_faturas f
            JOIN startup_clientes c ON c.id = f.cliente_id
            WHERE f.id = :id AND f.usuario_id = :uid AND f.deletado_em IS NULL
        ");
        $stmtCheck->execute(['id' => $faturaId, 'uid' => $userId]);
        $existing = $stmtCheck->fetch(PDO::FETCH_ASSOC);

        if (!$existing) {
            Response::error('Fatura não encontrada.', 404);
            return;
        }

        $dataPagamento = ($status === 'paga') ? date('Y-m-d') : null;

        $stmt = $this->pdo->prepare("
            UPDATE startup_faturas 
            SET status = :status, data_pagamento = :pagamento, atualizado_em = NOW() 
            WHERE id = :id AND usuario_id = :uid
        ");
        $stmt->execute([
            'status'    => $status,
            'pagamento' => $dataPagamento,
            'id'        => $faturaId,
            'uid'       => $userId
        ]);

        // Se marcou como paga, registra no financeiro caso ainda não tenha entrada
        if ($status === 'paga') {
            $stmtP = $this->pdo->prepare("SELECT COUNT(*) FROM startup_pagamentos WHERE fatura_id = :fid AND deletado_em IS NULL");
            $stmtP->execute(['fid' => $faturaId]);
            if ((int)$stmtP->fetchColumn() === 0) {
                $this->pdo->prepare("
                    INSERT INTO startup_pagamentos (usuario_id, fatura_id, cliente_id, tipo, categoria, descricao, valor, metodo_pagamento, data_pagamento)
                    VALUES (:uid, :fid, :cid, 'entrada', 'fatura_cliente', :desc, :val, 'pix', :dt)
                ")->execute([
                    'uid'  => $userId,
                    'fid'  => $faturaId,
                    'cid'  => $existing['cliente_id'],
                    'desc' => "Recebimento Fatura Solar {$existing['mes_referencia']} - " . $existing['cliente_nome'],
                    'val'  => $existing['valor_cobrado'],
                    'dt'   => date('Y-m-d')
                ]);
            }
        }

        $this->auditoria->registrar($userId, 'alterar_status', 'fatura', $faturaId, [
            'status_anterior' => $existing['status'],
            'status_novo'     => $status,
            'cliente'         => $existing['cliente_nome']
        ]);

        Response::success(null, 'Status da fatura atualizado com sucesso!');
    }

    public function destroy(Request $request, string $id): void
    {
        $userId = $this->getUserId();
        $faturaId = (int)$id;

        $stmt = $this->pdo->prepare("
            UPDATE startup_faturas 
            SET deletado_em = NOW() 
            WHERE id = :id AND usuario_id = :uid AND deletado_em IS NULL
        ");
        $stmt->execute(['id' => $faturaId, 'uid' => $userId]);

        if ($stmt->rowCount() === 0) {
            Response::error('Fatura não encontrada.', 404);
            return;
        }

        $this->auditoria->registrar($userId, 'excluir', 'fatura', $faturaId, [
            'motivo' => 'Exclusão de fatura'
        ]);

        Response::success(null, 'Fatura removida com sucesso!');
    }

    public function anexarArquivo(Request $request, string $id): void
    {
        $userId = $this->getUserId();
        $faturaId = (int)$id;

        $stmtCheck = $this->pdo->prepare("SELECT * FROM startup_faturas WHERE id = :id AND usuario_id = :uid AND deletado_em IS NULL");
        $stmtCheck->execute(['id' => $faturaId, 'uid' => $userId]);
        $existing = $stmtCheck->fetch(PDO::FETCH_ASSOC);

        if (!$existing) {
            Response::error('Fatura não encontrada.', 404);
            return;
        }

        $anexoBase64 = $request->input('anexo_base64');
        $anexoNome = (string)$request->input('anexo_nome', 'fatura.pdf');

        if (empty($anexoBase64)) {
            Response::error('Nenhum arquivo enviado para anexo.', 422);
            return;
        }

        $this->excluirArquivoAnexo($existing['arquivo_anexo'] ?? null);
        $salvo = $this->salvarArquivoBase64($userId, (string)$anexoBase64, $anexoNome);

        if (!$salvo) {
            Response::error('Falha ao salvar o arquivo anexo.', 500);
            return;
        }

        $this->pdo->prepare("UPDATE startup_faturas SET arquivo_anexo = :anexo, nome_arquivo_anexo = :nome, atualizado_em = NOW() WHERE id = :id AND usuario_id = :uid")
            ->execute([
                'anexo' => $salvo['path'],
                'nome'  => $salvo['name'],
                'id'    => $faturaId,
                'uid'   => $userId
            ]);

        $this->auditoria->registrar($userId, 'anexar_fatura', 'fatura', $faturaId, [
            'arquivo' => $salvo['path'],
            'nome'    => $salvo['name']
        ]);

        Response::success([
            'arquivo_anexo'      => $salvo['path'],
            'nome_arquivo_anexo' => $salvo['name']
        ], 'Fatura anexada com sucesso!');
    }

    public function removerAnexo(Request $request, string $id): void
    {
        $userId = $this->getUserId();
        $faturaId = (int)$id;

        $stmtCheck = $this->pdo->prepare("SELECT * FROM startup_faturas WHERE id = :id AND usuario_id = :uid AND deletado_em IS NULL");
        $stmtCheck->execute(['id' => $faturaId, 'uid' => $userId]);
        $existing = $stmtCheck->fetch(PDO::FETCH_ASSOC);

        if (!$existing) {
            Response::error('Fatura não encontrada.', 404);
            return;
        }

        $this->excluirArquivoAnexo($existing['arquivo_anexo'] ?? null);

        $this->pdo->prepare("UPDATE startup_faturas SET arquivo_anexo = NULL, nome_arquivo_anexo = NULL, atualizado_em = NOW() WHERE id = :id AND usuario_id = :uid")
            ->execute(['id' => $faturaId, 'uid' => $userId]);

        Response::success(null, 'Anexo removido com sucesso!');
    }

    private function salvarArquivoBase64(int $userId, string $base64Data, string $origName): ?array
    {
        if (str_contains($base64Data, ',')) {
            $parts = explode(',', $base64Data, 2);
            $base64Data = $parts[1];
        }

        $binary = base64_decode($base64Data, true);
        if ($binary === false || strlen($binary) === 0) {
            return null;
        }

        $uploadDir = dirname(__DIR__, 2) . '/public/uploads/faturas';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        $ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION)) ?: 'pdf';
        if (!in_array($ext, ['pdf', 'png', 'jpg', 'jpeg', 'webp'], true)) {
            $ext = 'pdf';
        }

        $filename = 'fatura_' . $userId . '_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
        $destPath = $uploadDir . '/' . $filename;

        if (file_put_contents($destPath, $binary) === false) {
            return null;
        }

        return [
            'path' => 'uploads/faturas/' . $filename,
            'name' => basename($origName)
        ];
    }

    private function excluirArquivoAnexo(?string $relPath): void
    {
        if (empty($relPath)) return;
        $fullPath = dirname(__DIR__, 2) . '/public/' . ltrim($relPath, '/');
        if (file_exists($fullPath) && is_file($fullPath)) {
            @unlink($fullPath);
        }
    }
}
