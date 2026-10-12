# Documento de referência arquitetural, regras de negócio e especificações funcionais.
**Versão Oficial do Sistema:** v1.0.0

---

## 1. Identidade do Produto & Manifesto
O AIRES não é apenas um gerenciador de tarefas; é um "Segundo Cérebro" focado em execução (Execution Engine). Ele conecta o planejamento de longo prazo (Missões) com a execução diária (Tarefas) e o aprendizado contínuo (Base de Conhecimento), suportado por uma camada futura de alocação de recursos (Financeiro).

### Os 5 Pilares do Ecossistema:
1. **Missões Estratégicas:** Projetos de vida ou profissionais de longo prazo. Possuem escopo, data limite, orçamento e marcos (milestones).
2. **Gestão de Tarefas (Actionable Items):** Ações atômicas e diárias. Seguem o princípio da matriz de prioridade, com controle de tempo e recorrência.
3. **Base de Conhecimento (Zettelkasten/Notas):** Captura rápida de ideias, atas de reunião e referências. Notas podem ser linkadas a tarefas ou missões.
4. **Dashboard de Produtividade & Gamificação:** Indicadores reais de eficiência. Sequência de dias produtivos (streak), pontuação (XP) por missões concluídas e velocímetros de foco.
5. **Módulo Financeiro (Alocação de Energia e Capital):** Controle de orçamento pessoal e atrelamento de custos a Missões.

---

## 2. Stack Tecnológica, Padrões Arquiteturais & UX
A premissa do AIRES é ser ultrarrápido, de fácil manutenção e portável, evitando o excesso de complexidade e frameworks pesados.

- **Mobile-First (Foco Principal em Celulares):** Todo o design e a experiência de usuário (UX) serão projetados primeiramente para telas de smartphones (otimizado para dimensões e proporções como as do iPhone 16). O objetivo é garantir navegação fluida com apenas uma mão e toques rápidos.
- **Responsividade Adaptativa:** O visual será programado de forma fluida para se adaptar automaticamente a notebooks e computadores desktop. Em telas maiores, o sistema aproveitará o espaço extra para expandir menus, mostrar colunas do Kanban lado a lado e entregar um painel mais amplo.
- **Back-end:** PHP Vanilla (orientado a objetos, tipagem estrita) sem frameworks MVC pesados.
- **Banco de Dados:** MySQL Relacional com conexão Singleton segura. Transações estritas e integridade referencial nativa.
- **Sessões:** Armazenadas no banco de dados para garantir resiliência em servidores em nuvem.
- **Front-end:** Tailwind CSS para estilização utilitária e JavaScript Vanilla puro (comunicação assíncrona com o backend via JSON REST).
- **Interface:** Suporte nativo ao Modo Escuro (Dark Mode) em todos os componentes visuais.

---

## 3. Regras Operacionais e Fluxos de Negócio
- **Hierarquia de Execução:** Toda energia gasta deve ser rastreável. Missões geram Tarefas. Concluir tarefas alimenta o progresso global da missão.
- **Priorização e Atrasos:** Tarefas possuem 4 níveis de prioridade (Crítica, Alta, Média, Baixa). Tarefas atrasadas ganham a marcação visual de "Vencida" e impactam negativamente a pontuação de produtividade da semana.
- **Prevenção de Conflito de Agenda:** Se o usuário tentar alocar duas tarefas ou missões concorrentes para o mesmo dia e bloco de horário exato, o sistema emitirá um alerta preventivo (ex: *"Atenção: Você já possui a tarefa X agendada para este horário. Deseja manter a sobreposição?"*), evitando estrangulamentos na capacidade produtiva real.
- **Captura Rápida (Inbox):** Notas ou tarefas criadas rapidamente (sem data ou missão atrelada) caem na Caixa de Entrada para serem triadas no planejamento semanal.
- **Integrações do Ecossistema:** Previsão de integração com robôs do Telegram (para capturar ideias via mensagem/áudio e transformar em tarefas) e exportação de agenda (CalDAV).

---

## 4. Estrutura de Dados Geral (Visão Lógica)
O banco de dados utiliza nomenclatura em português para tabelas operacionais, com exclusão lógica (soft delete) obrigatória.

- **Infraestrutura e Acesso:** Gestão de usuários, senhas criptografadas e sessões de navegação.
- **Produtividade (Missões e Tarefas):** Armazenamento de objetivos, prazos, prioridades, status, datas de conclusão e detalhamento textual em Markdown.
- **Base de Conhecimento:** Armazenamento de notas, relacionamento com tarefas/missões e fixação de conteúdo importante.
- **Financeiro (Expansão):** Contas correntes/carteiras, lançamentos financeiros de receita/despesa e vínculo opcional aos custos de uma Missão.

---

## 5. Regras de Ouro de Engenharia (Código de Conduta)
1. **Consulta Obrigatória ao Documento (AIRES):** Sempre que for iniciar a programação de um novo módulo, escrever código, criar banco de dados ou tomar decisões arquiteturais, este documento oficial deve ser consultado primeiramente para garantir o alinhamento estrito com as regras e padrões aqui definidos.
2. **Sem Bibliotecas Desnecessárias:** Preferência absoluta por soluções nativas.
3. **Consultas Otimizadas:** Proibido o carregamento de dados desnecessários; uso obrigatório de paginação e filtros diretos no banco de dados.
4. **Segurança Padrão:** Prevenção total contra injeções no banco de dados e higienização de qualquer texto exibido na tela.
5. **Completude (Zero-Rush):** Entregas devem ser completas e funcionais, englobando todas as notificações de sucesso/erro na interface do usuário.

---

# ESPECIFICAÇÃO DE ENGENHARIA — MÓDULO "TAREFAS"

## 1. Visão Funcional & Experiência de Usuário (UX/UI)
### Modos de Visualização (Alternador de Visão no Topo da Tela)
- **Kanban (Fluxo de Execução):** Colunas dinâmicas (A Fazer, Fazendo, Feito) com ordenação manual e recurso de arrastar e soltar (Drag & Drop). No celular, exibe uma coluna por vez com navegação lateral; no PC, exibe todas lado a lado.
- **Lista Compacta (Velocidade):** Visão linear simplificada para dias com alto volume de microtarefas e checagem rápida.
- **Calendário Mensal (Capacidade & Planejamento):**
  - Grade mensal com mapa de calor indicando a densidade (volume) de tarefas por dia.
  - Representação visual de tarefas como etiquetas (chips) coloridas por prioridade.
  - Barras contínuas para tarefas que se estendem por vários dias.
  - Barra lateral de tarefas sem data (Backlog) para agendamento rápido arrastando para o dia no calendário.

### Painel Lateral de Detalhes (Modal Interno da Tarefa)
- **Bloco Cronograma:** Definição clara de Data/Hora de Início e Data/Hora de Entrega (Prazo Final).
- **Bloco Logística:**
  - Campo de texto para endereço ou link de localização.
  - Indicador se a tarefa exige veículo (deslocamento).
  - Campo de Tempo de Viagem Estimado (obrigatório se o indicador de veículo estiver ativo).
- **Bloco Alertas & Notificações:**
  - Configuração de aviso prévio (ex: 1 hora, 3 horas, 1 dia, 1 semana antes).
- **Bloco Contexto & Subtarefas:**
  - Editor de texto expansível para o escopo, anotações e links da tarefa.
  - Lista de verificação (Checklist) interna com cálculo automático de progresso conforme os itens são concluídos.

---

## 2. Estrutura de Dados do Módulo de Tarefas (Visão Lógica)
O armazenamento das tarefas foi desenhado para suportar toda a logística sem poluir a aplicação.

- **Tabela Principal de Tarefas (`tarefas`):** Guarda o título, a prioridade, o status (fazer, fazendo, feito), o relacionamento com a missão mãe, os dados de logística (local, exige carro, tempo de viagem) e o texto de desenvolvimento da tarefa.
- **Tabela de Subtarefas (`subtarefas`):** Guarda individualmente os itens de checklist atrelados a uma tarefa principal, permitindo marcar cada um como concluído independentemente.
- **Tabela de Alertas/Fila de Notificações (`alertas_notificacoes`):** Guarda os gatilhos agendados para avisar o usuário, registrando se o aviso já foi disparado, quando, e por qual canal (sistema, e-mail, telegram).

---

## 3. Inteligência Ativa: Alertas de Conflito e Logística de Deslocamento
Para garantir precisão no dia a dia, o sistema atua de forma preventiva em duas frentes:

### 3.1. Auditoria de Agenda (Anti-Colisão)
Ao salvar ou reagendar uma tarefa, o sistema verifica a janela de Hora de Início até Hora de Entrega. Se houver outra tarefa ou evento agendado neste exato bloco para o mesmo usuário, a tela exibirá um aviso imediato, obrigando a confirmação consciente da sobreposição de afazeres.

### 3.2. Gatilhos de Notificação com Cálculo de Viagem
O horário em que o aviso será disparado não é baseado apenas na hora de início da tarefa, mas sim no horário necessário de saída.

**Fórmula Operacional:**
$$\text{Horário do Alerta} = \text{Início da Tarefa} - \text{Tempo de Viagem Estimado} - \text{Antecedência do Aviso}$$

*Exemplo Prático:* Se uma reunião começa às 14:00, leva 1h30m de viagem, e você pediu para ser avisado 1 hora antes... O alerta soará exatamente às 11:30 da manhã, garantindo que você tenha tempo hábil para se preparar e fazer o deslocamento necessário.
