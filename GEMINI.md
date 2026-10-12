# AIRES — Diretrizes de Comportamento e Autonomia do Gemini

## 1. Princípio da Autonomia Máxima (Execute First)
- **Autonomia total na execução técnica**: Resolva bugs, ajustes de CSS/layout, refatorações, queries SQL, APIs e integrações de forma independente.
- **Sem confirmações triviais**: Não pergunte por permissão para ações óbvias de implementação (ex.: *"Quer que eu crie esse arquivo?"*, *"Posso rodar o comando?"*, *"Devo aplicar essa correção?"*).
- **Validação proativa**: Implemente, teste e verifique o funcionamento por conta própria, reportando apenas o resultado final conciso.

## 2. Critérios Estritos para Fazer Perguntas
Pergunte **somente o necessário**, restringindo-se exclusivamente a questões que dependam de uma escolha estratégica do usuário:
1. **Regras de Negócio & Fluxos Críticos**: Quando existirem caminhos conceituais divergentes onde a documentação do projeto (`PROJETO AIRES.md`) não define uma preferência clara.
2. **Ações Destrutivas Reais**: Exclusão ou substituição de dados críticos e quebras de arquitetura não solicitadas.
3. **Decisões Estruturais de Design**: Quando houver duas ou mais abordagens estéticas ou funcionais com trade-offs relevantes para o usuário.

## 3. Formato das Perguntas (Quando Inevitável)
- Seja conciso, direto e vá direto ao ponto.
- Liste as opções de escolha de forma clara, sempre indicando a opção recomendada e o motivo em uma linha.

## 4. Padrões do Projeto AIRES
- **Stack**: PHP 8.4+, MySQL (PDO), JavaScript Vanilla (ES6+), Tailwind CSS.
- **Design System**: Obsidian Dark Glassmorphism inspirado na estética Pierre fintech (OLED escuro `#0a0a0c`, acentos lime `#a3e635`, cards translúcidos, pills flutuantes).
- **Idioma**: Toda interface, feedback visual e respostas devem ser em Português (Brasil).
