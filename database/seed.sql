-- AIRES - Seeds Iniciais
INSERT INTO `usuarios` (`id`, `nome`, `email`, `senha_hash`, `xp`, `streak_dias`, `ultimo_dia_produtivo`)
VALUES (1, 'Comandante AIRES', 'demo@aires.io', '$2y$12$e6mZfgmJ6cM1oGkQ32B74OzV0P8l5aBfV.Qy9V1W16y2aK0X/WjGy', 450, 7, CURDATE())
ON DUPLICATE KEY UPDATE `nome` = VALUES(`nome`);

INSERT INTO `missoes` (`id`, `usuario_id`, `titulo`, `descricao`, `status`, `progresso`, `data_limite`, `orcamento_estimado`, `cor`)
VALUES 
(1, 1, 'Lançamento Oficial AIRES v1.0', 'Construir o Segundo Cérebro definitivo focado em execução, com Mobile-First e inteligência de agenda.', 'em_andamento', 40, DATE_ADD(CURDATE(), INTERVAL 30 DAY), 5000.00, 'indigo'),
(2, 1, 'Imersão em Arquitetura Limpa & PHP 8.4', 'Aprofundamento em design patterns, tipagem estrita e banco relacional de alto desempenho.', 'em_andamento', 75, DATE_ADD(CURDATE(), INTERVAL 14 DAY), 800.00, 'emerald')
ON DUPLICATE KEY UPDATE `titulo` = VALUES(`titulo`);

INSERT INTO `tarefas` (
    `id`, `usuario_id`, `missao_id`, `titulo`, `descricao`, 
    `prioridade`, `status`, `ordem`, `inbox`, 
    `data_inicio`, `data_entrega`, 
    `endereco_local`, `exige_veiculo`, `tempo_viagem_minutos`, `antecedencia_aviso_minutos`
)
VALUES 
(1, 1, 1, 'Reunião de Alinhamento com Stakeholders', 'Apresentação do roadmap de engenharia e regras de negócio do módulo de tarefas.', 'critica', 'fazendo', 1, 0, 
    CONCAT(CURDATE(), ' 14:00:00'), CONCAT(CURDATE(), ' 15:30:00'), 
    'Av. Paulista, 1000 - Bela Vista, SP', 1, 45, 60),

(2, 1, 1, 'Construir Módulo Kanban com Drag & Drop', 'Implementar as colunas dinâmicas (A Fazer, Fazendo, Feito) com persistência via REST API assíncrona.', 'alta', 'fazendo', 2, 0,
    CONCAT(CURDATE(), ' 09:00:00'), CONCAT(CURDATE(), ' 12:00:00'),
    'Home Office - Estação Central', 0, 0, 15),

(3, 1, 1, 'Refatorar Detector de Conflitos de Horário', 'Garantir que sobreposições de agenda no mesmo bloco disparem confirmação preventiva imediata.', 'critica', 'a_fazer', 1, 0,
    CONCAT(DATE_ADD(CURDATE(), INTERVAL 1 DAY), ' 10:00:00'), CONCAT(DATE_ADD(CURDATE(), INTERVAL 1 DAY), ' 12:00:00'),
    'Home Office', 0, 0, 30),

(4, 1, 2, 'Estudar especificações PSR e Clean Architecture', 'Leitura da documentação de boas práticas e tipagem estrita.', 'media', 'feito', 1, 0,
    CONCAT(DATE_SUB(CURDATE(), INTERVAL 1 DAY), ' 16:00:00'), CONCAT(DATE_SUB(CURDATE(), INTERVAL 1 DAY), ' 18:00:00'),
    'Biblioteca Central', 1, 20, 15),

(5, 1, NULL, 'Comprar novos cabos USB-C e adaptador HDMI', 'Item de captura rápida para compras de escritório.', 'baixa', 'a_fazer', 3, 1,
    NULL, NULL,
    'Shopping Center', 1, 30, 0)
ON DUPLICATE KEY UPDATE `titulo` = VALUES(`titulo`);

INSERT INTO `subtarefas` (`tarefa_id`, `titulo`, `concluida`, `ordem`)
VALUES 
(2, 'Estruturar colunas HTML5 com classes Tailwind dark mode', 1, 1),
(2, 'Adicionar eventos de dragstart, dragover e drop no JavaScript', 1, 2),
(2, 'Criar endpoint REST PHP para atualização de status/ordem', 0, 3),
(2, 'Adaptar visual mobile com abas de coluna deslizantes', 0, 4)
ON DUPLICATE KEY UPDATE `titulo` = VALUES(`titulo`);

INSERT INTO `alertas_notificacoes` (`usuario_id`, `tarefa_id`, `horario_disparo`, `canal`, `disparado`, `lido`, `mensagem`)
VALUES 
(1, 1, CONCAT(CURDATE(), ' 12:15:00'), 'sistema', 0, 0, 'Saída em breve: Reunião de Alinhamento (45 min de viagem + 60 min antecedência)')
ON DUPLICATE KEY UPDATE `mensagem` = VALUES(`mensagem`);

INSERT INTO `notas` (`usuario_id`, `missao_id`, `tarefa_id`, `titulo`, `conteudo`, `fixado`, `tags`)
VALUES 
(1, 1, 2, 'Princípios do AIRES Segundo Cérebro', 'O sistema opera sob o preceito de Execution Engine: menos atrito para registrar, clareza máxima do que fazer a seguir, e inteligência ativa que protege a capacidade produtiva.', 1, '#manifesto,#arquitetura,#aires')
ON DUPLICATE KEY UPDATE `titulo` = VALUES(`titulo`);
