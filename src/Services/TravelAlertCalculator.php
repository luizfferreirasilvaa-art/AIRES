<?php
declare(strict_types=1);

namespace Aires\Services;

use Aires\Core\Database;
use DateTime;
use PDO;

/**
 * Inteligência Ativa: Gatilhos de Notificação com Cálculo de Viagem
 */
final class TravelAlertCalculator
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getInstance()->getConnection();
    }

    public function calculateAlertTime(?string $dataInicio, int $tempoViagemMinutos, int $antecedenciaMinutos): ?string
    {
        if (empty($dataInicio)) {
            return null;
        }

        $totalMinutosDesconto = $tempoViagemMinutos + $antecedenciaMinutos;
        if ($totalMinutosDesconto <= 0) {
            return null;
        }

        try {
            $dt = new DateTime($dataInicio);
            $dt->modify("-{$totalMinutosDesconto} minutes");
            return $dt->format('Y-m-d H:i:s');
        } catch (\Throwable $e) {
            return null;
        }
    }

    public function syncAlert(
        int $userId,
        int $taskId,
        string $titulo,
        ?string $dataInicio,
        int $tempoViagemMinutos,
        int $antecedenciaMinutos
    ): ?array {
        $horarioDisparo = $this->calculateAlertTime($dataInicio, $tempoViagemMinutos, $antecedenciaMinutos);

        if (!$horarioDisparo) {
            $stmt = $this->pdo->prepare("UPDATE alertas_notificacoes SET deletado_em = NOW() WHERE tarefa_id = :tarefa_id");
            $stmt->execute(['tarefa_id' => $taskId]);
            return null;
        }

        $mensagem = "Alerta de Tarefa: \"{$titulo}\"";
        if ($tempoViagemMinutos > 0) {
            $mensagem .= " (Saída calculada com {$tempoViagemMinutos} min de viagem";
            if ($antecedenciaMinutos > 0) {
                $mensagem .= " + {$antecedenciaMinutos} min de antecedência";
            }
            $mensagem .= ")";
        } elseif ($antecedenciaMinutos > 0) {
            $mensagem .= " ({$antecedenciaMinutos} min de antecedência)";
        }

        $stmt = $this->pdo->prepare("SELECT id FROM alertas_notificacoes WHERE tarefa_id = :tarefa_id AND deletado_em IS NULL LIMIT 1");
        $stmt->execute(['tarefa_id' => $taskId]);
        $existing = $stmt->fetch();

        if ($existing) {
            $stmtUpdate = $this->pdo->prepare("UPDATE alertas_notificacoes 
                SET horario_disparo = :horario, mensagem = :mensagem, disparado = 0, lido = 0, atualizado_em = NOW()
                WHERE id = :id");
            $stmtUpdate->execute([
                'horario'  => $horarioDisparo,
                'mensagem' => $mensagem,
                'id'       => $existing['id']
            ]);
            $alertId = (int)$existing['id'];
        } else {
            $stmtInsert = $this->pdo->prepare("INSERT INTO alertas_notificacoes 
                (usuario_id, tarefa_id, horario_disparo, canal, disparado, lido, mensagem)
                VALUES (:usuario_id, :tarefa_id, :horario, 'sistema', 0, 0, :mensagem)");
            $stmtInsert->execute([
                'usuario_id' => $userId,
                'tarefa_id'  => $taskId,
                'horario'    => $horarioDisparo,
                'mensagem'   => $mensagem
            ]);
            $alertId = (int)$this->pdo->lastInsertId();
        }

        return [
            'id'              => $alertId,
            'horario_disparo' => $horarioDisparo,
            'mensagem'        => $mensagem
        ];
    }
}
