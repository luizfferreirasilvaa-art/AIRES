/**
 * AIRES - Módulo Missões Estratégicas: Orçamento, Previsões Futuras & Parcelamento
 * Obsidian Dark Glassmorphism / Pierre Fintech
 */

const MissionBudget = (() => {
    let missoesList = [];
    let itensList = [];
    let resumoData = {
        teto_estimado: 0,
        total_orcado: 0,
        saldo_disponivel: 0,
        total_pago: 0,
        total_empenhado: 0,
        total_planejado: 0,
        total_itens: 0,
        percentual_empenhado: 0
    };
    let planosResumo = [];
    let projecaoData = [];
    let currentFilter = {
        missao_id: 0,
        status: '',
        categoria: '',
        busca: ''
    };
    let currentSubView = 'itens'; // 'itens' | 'projecao' | 'planos'

    function init() {
        // Eventos vinculados dinamicamente
    }

    async function load() {
        const container = document.getElementById('missoes-financeiro-container');
        if (!container) return;

        container.innerHTML = `
            <div class="py-12 flex flex-col items-center justify-center text-zinc-500">
                <div class="w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full animate-spin mb-3"></div>
                <p class="text-xs font-semibold">Calculando orçamentos de planos e projeções futuras...</p>
            </div>
        `;

        try {
            const [respMissoes, respItens, respResumo, respProjecao] = await Promise.all([
                API.getMissoes(),
                API.getMissoesOrcamento(currentFilter),
                API.getMissoesOrcamentoResumo({ missao_id: currentFilter.missao_id }),
                API.getMissoesOrcamentoProjecao({ missao_id: currentFilter.missao_id, meses: 12 })
            ]);

            missoesList = (respMissoes && respMissoes.missoes) || [];
            itensList = (respItens && respItens.itens) || [];
            resumoData = (respResumo && respResumo.kpis) || resumoData;
            planosResumo = (respResumo && respResumo.planos) || [];
            projecaoData = (respProjecao && respProjecao.meses) || [];

            render();
        } catch (err) {
            container.innerHTML = `
                <div class="glass-card rounded-3xl p-6 text-center text-red-400">
                    <p class="text-xs font-bold">Erro ao carregar planejamento orçamentário: ${escapeHtml(err.message)}</p>
                </div>
            `;
        }
    }

    function render() {
        const container = document.getElementById('missoes-financeiro-container');
        if (!container) return;

        const teto = parseFloat(resumoData.teto_estimado || 0);
        const orcado = parseFloat(resumoData.total_orcado || 0);
        const saldo = parseFloat(resumoData.saldo_disponivel || (teto - orcado));
        const empenhado = parseFloat(resumoData.total_empenhado || 0);
        const pago = parseFloat(resumoData.total_pago || 0);
        const pctEmpenhado = parseFloat(resumoData.percentual_empenhado || (teto > 0 ? (orcado / teto) * 100 : 0)).toFixed(1);

        // Desembolso no mês corrente
        const mesAtualChave = new Date().toISOString().substring(0, 7);
        const mesAtualObj = projecaoData.find(m => m.mes === mesAtualChave);
        const desembolsoMesAtual = mesAtualObj ? parseFloat(mesAtualObj.total_previsto || 0) : 0;

        let html = `
            <!-- ========================================================
                 KPI CARDS: VISÃO EXECUTIVA DE ORÇAMENTO & METAS
                 ======================================================== -->
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <!-- Teto Orçado dos Planos -->
                <div class="glass-card rounded-2xl p-4 space-y-1 border border-white/5 bg-white/[0.02]">
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Teto Orçado Total</span>
                        <span class="text-cyan-400 text-sm">🎯</span>
                    </div>
                    <p class="text-xl sm:text-2xl font-black text-white font-mono">
                        R$ ${teto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p class="text-[10px] text-zinc-500 truncate">${missoesList.length} missões / planos ativos</p>
                </div>

                <!-- Total de Itens Cotados/Empenhados -->
                <div class="glass-card rounded-2xl p-4 space-y-1 border border-white/5 bg-white/[0.02]">
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Itens Empenhados</span>
                        <span class="text-lime-400 text-sm">📦</span>
                    </div>
                    <p class="text-xl sm:text-2xl font-black text-lime-400 font-mono">
                        R$ ${orcado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <div class="flex items-center gap-1.5 text-[10px] text-zinc-400">
                        <span class="w-1.5 h-1.5 rounded-full ${orcado > teto && teto > 0 ? 'bg-red-400' : 'bg-lime-400'}"></span>
                        <span>${pctEmpenhado}% do teto ${orcado > teto && teto > 0 ? '(⚠️ Acima do teto)' : ''}</span>
                    </div>
                </div>

                <!-- Saldo Disponível no Orçamento -->
                <div class="glass-card rounded-2xl p-4 space-y-1 border ${saldo < 0 ? 'border-red-500/30 bg-red-500/[0.04]' : 'border-emerald-500/20 bg-emerald-500/[0.02]'}">
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] ${saldo < 0 ? 'text-red-400' : 'text-emerald-400'} uppercase font-bold tracking-wider">Margem Disponível</span>
                        <span class="text-sm">${saldo < 0 ? '⚠️' : '💎'}</span>
                    </div>
                    <p class="text-xl sm:text-2xl font-black ${saldo < 0 ? 'text-red-400' : 'text-emerald-400'} font-mono">
                        R$ ${saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p class="text-[10px] text-zinc-400 truncate">${saldo >= 0 ? 'Fôlego orçamentário livre' : 'Déficit orçamentário previsto'}</p>
                </div>

                <!-- Desembolso Previsto no Mês Corrente -->
                <div class="glass-card rounded-2xl p-4 space-y-1 border border-purple-500/20 bg-purple-500/[0.03]">
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] text-purple-300 uppercase font-bold tracking-wider">Desembolso Mês Atual</span>
                        <span class="text-purple-400 text-sm">📅</span>
                    </div>
                    <p class="text-xl sm:text-2xl font-black text-purple-300 font-mono">
                        R$ ${desembolsoMesAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p class="text-[10px] text-zinc-400 truncate">${mesAtualObj ? `${mesAtualObj.qtd_parcelas} parcelas neste mês` : 'Nenhuma parcela'}</p>
                </div>
            </div>

            <!-- ========================================================
                 BARRA DE CONTROLE: SUB-ABAS, FILTROS & AÇÃO
                 ======================================================== -->
            <div class="glass-card rounded-3xl p-4 space-y-3 border border-white/5">
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <!-- Alternador de Sub-visão: Itens Orçados | Previsão Futura | Balanço por Plano -->
                    <div class="inline-flex p-1 bg-zinc-900/90 rounded-full border border-white/10 gap-1 shadow-lg backdrop-blur-md self-start">
                        <button type="button" onclick="MissionBudget.setSubView('itens')" class="px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${currentSubView === 'itens' ? 'bg-white text-zinc-950 shadow-md' : 'text-zinc-400 hover:text-white'}">
                            <span>📋 Itens Orçados</span>
                            <span class="text-[10px] px-1.5 py-0.2 rounded-full ${currentSubView === 'itens' ? 'bg-zinc-800 text-zinc-200' : 'bg-white/10 text-zinc-400'}">${itensList.length}</span>
                        </button>
                        <button type="button" onclick="MissionBudget.setSubView('projecao')" class="px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${currentSubView === 'projecao' ? 'bg-white text-zinc-950 shadow-md' : 'text-zinc-400 hover:text-white'}">
                            <span>📈 Previsão Futura & Parcelamento</span>
                        </button>
                        <button type="button" onclick="MissionBudget.setSubView('planos')" class="px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${currentSubView === 'planos' ? 'bg-white text-zinc-950 shadow-md' : 'text-zinc-400 hover:text-white'}">
                            <span>🎯 Balanço por Plano</span>
                        </button>
                    </div>

                    <!-- Botão: Novo Item de Orçamento -->
                    <div class="flex items-center gap-2">
                        <button type="button" onclick="MissionBudget.openModalSimulador()" class="px-3.5 py-2 rounded-full bg-white/5 hover:bg-white/10 text-cyan-400 border border-cyan-400/20 text-xs font-bold transition-all flex items-center gap-1.5">
                            <span>🧮 Simular Parcelamento</span>
                        </button>
                        <button type="button" onclick="MissionBudget.openModalItem()" class="px-4 py-2 rounded-full bg-lime-400 hover:bg-lime-300 text-zinc-950 font-extrabold text-xs shadow-lg shadow-lime-400/20 transition-all flex items-center gap-1.5">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>
                            <span>+ Orçar Novo Item</span>
                        </button>
                    </div>
                </div>

                <!-- Linha de Filtros (Busca, Missão, Categoria, Status) -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1 text-xs">
                    <div>
                        <input type="text" id="input-busca-orcamento" placeholder="Buscar item, fornecedor, nota..." value="${escapeHtml(currentFilter.busca)}" class="w-full px-3.5 py-2 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-lime-400">
                    </div>
                    <div>
                        <select id="select-filtro-missao" class="w-full px-3.5 py-2 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-zinc-300 focus:outline-none focus:border-lime-400">
                            <option value="0">Todos os Planos / Missões</option>
                            ${missoesList.map(m => `
                                <option value="${m.id}" ${currentFilter.missao_id == m.id ? 'selected' : ''}>
                                    🎯 ${escapeHtml(m.titulo)} (Teto: R$ ${parseFloat(m.orcamento_estimado || 0).toLocaleString('pt-BR')})
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    <div>
                        <select id="select-filtro-categoria" class="w-full px-3.5 py-2 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-zinc-300 focus:outline-none focus:border-lime-400">
                            <option value="">Todas as Categorias</option>
                            <option value="equipamento" ${currentFilter.categoria === 'equipamento' ? 'selected' : ''}>Equipamentos / Ativos</option>
                            <option value="infraestrutura" ${currentFilter.categoria === 'infraestrutura' ? 'selected' : ''}>Infraestrutura / Obra</option>
                            <option value="servico" ${currentFilter.categoria === 'servico' ? 'selected' : ''}>Serviços / Projetos</option>
                            <option value="mao_de_obra" ${currentFilter.categoria === 'mao_de_obra' ? 'selected' : ''}>Mão de Obra / Equipe</option>
                            <option value="licenca_taxa" ${currentFilter.categoria === 'licenca_taxa' ? 'selected' : ''}>Licenças, Taxas & Concessionária</option>
                            <option value="marketing" ${currentFilter.categoria === 'marketing' ? 'selected' : ''}>Marketing & Comercial</option>
                            <option value="outros" ${currentFilter.categoria === 'outros' ? 'selected' : ''}>Outros Custos</option>
                        </select>
                    </div>
                    <div>
                        <select id="select-filtro-status" class="w-full px-3.5 py-2 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-zinc-300 focus:outline-none focus:border-lime-400">
                            <option value="">Todos os Status</option>
                            <option value="planejado" ${currentFilter.status === 'planejado' ? 'selected' : ''}>Planejado (Em Estudo)</option>
                            <option value="em_negociacao" ${currentFilter.status === 'em_negociacao' ? 'selected' : ''}>Em Negociação / Cotação</option>
                            <option value="aprovado" ${currentFilter.status === 'aprovado' ? 'selected' : ''}>Aprovado / Contratado</option>
                            <option value="em_pagamento" ${currentFilter.status === 'em_pagamento' ? 'selected' : ''}>Em Pagamento (Parcelado)</option>
                            <option value="quitado" ${currentFilter.status === 'quitado' ? 'selected' : ''}>✓ Quitado</option>
                        </select>
                    </div>
                </div>
            </div>
        `;

        // Renderiza a sub-visão selecionada
        if (currentSubView === 'itens') {
            html += renderSubViewItens();
        } else if (currentSubView === 'projecao') {
            html += renderSubViewProjecao();
        } else if (currentSubView === 'planos') {
            html += renderSubViewPlanos();
        }

        container.innerHTML = html;
        bindEvents();
    }

    function renderSubViewItens() {
        if (itensList.length === 0) {
            return `
                <div class="glass-card rounded-3xl p-12 text-center text-zinc-500 space-y-3">
                    <div class="w-12 h-12 mx-auto rounded-2xl bg-lime-400/10 text-lime-400 border border-lime-400/20 flex items-center justify-center text-xl">📋</div>
                    <p class="text-sm font-bold text-white">Nenhum item de orçamento encontrado</p>
                    <p class="text-xs max-w-sm mx-auto">Cadastre os custos, equipamentos, serviços e materiais previstos para cada missão ou plano estratégico.</p>
                    <button type="button" onclick="MissionBudget.openModalItem()" class="px-5 py-2.5 bg-lime-400 hover:bg-lime-300 text-zinc-950 font-extrabold text-xs rounded-full shadow-lg transition-all">
                        + Orçar Primeiro Item
                    </button>
                </div>
            `;
        }

        let rowsHtml = '';
        itensList.forEach(item => {
            const vTotal = parseFloat(item.valor_total || 0);
            const qtdParc = parseInt(item.qtd_parcelas || 1);
            const vParc = parseFloat(item.valor_parcela || (vTotal / qtdParc));
            const statusBadge = getStatusBadge(item.status);
            const categoriaBadge = getCategoriaBadge(item.categoria);
            const dtVenc = formatarData(item.data_primeiro_vencimento);

            rowsHtml += `
                <tr class="hover:bg-white/[0.02] transition-colors">
                    <td class="py-3 px-3 font-bold text-white whitespace-nowrap">
                        <div class="flex items-center gap-2">
                            <span>${escapeHtml(item.item)}</span>
                        </div>
                        ${item.fornecedor ? `<span class="text-[10px] text-zinc-500 block font-normal">Fornecedor: ${escapeHtml(item.fornecedor)}</span>` : ''}
                    </td>
                    <td class="py-3 px-3 whitespace-nowrap">
                        <span class="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-zinc-300 flex items-center gap-1.5 w-fit">
                            <span class="w-2 h-2 rounded-full" style="background-color: ${escapeHtml(item.missao_cor || '#84cc16')}"></span>
                            <span>${escapeHtml(item.missao_titulo)}</span>
                        </span>
                    </td>
                    <td class="py-3 px-3 whitespace-nowrap">
                        ${categoriaBadge}
                    </td>
                    <td class="py-3 px-3 font-mono font-bold text-white whitespace-nowrap">
                        R$ ${vTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td class="py-3 px-3 font-mono whitespace-nowrap">
                        ${qtdParc > 1 ? `
                            <span class="text-lime-400 font-bold">${qtdParc}x</span>
                            <span class="text-zinc-400 text-[11px]">de R$ ${vParc.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        ` : `
                            <span class="text-zinc-400 text-[11px]">À vista</span>
                        `}
                    </td>
                    <td class="py-3 px-3 font-mono text-xs text-zinc-300 whitespace-nowrap">
                        ${dtVenc}
                    </td>
                    <td class="py-3 px-3 whitespace-nowrap">
                        ${statusBadge}
                    </td>
                    <td class="py-3 px-3 text-right whitespace-nowrap">
                        <div class="flex items-center justify-end gap-1">
                            <button type="button" onclick="MissionBudget.openModalItem(${item.id})" class="p-1.5 text-zinc-400 hover:text-amber-400 rounded-xl hover:bg-amber-400/10 transition-all" title="Editar Item">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                            </button>
                            <button type="button" onclick="MissionBudget.deleteItem(${item.id}, '${escapeHtml(item.item)}')" class="p-1.5 text-zinc-500 hover:text-red-400 rounded-xl hover:bg-red-500/10 transition-all" title="Excluir Item">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });

        // Cards mobile
        let cardsMobileHtml = '';
        itensList.forEach(item => {
            const vTotal = parseFloat(item.valor_total || 0);
            const qtdParc = parseInt(item.qtd_parcelas || 1);
            const vParc = parseFloat(item.valor_parcela || (vTotal / qtdParc));
            const statusBadge = getStatusBadge(item.status);
            const dtVenc = formatarData(item.data_primeiro_vencimento);

            cardsMobileHtml += `
                <div class="glass-card rounded-2xl p-4 space-y-2.5 border border-white/5">
                    <div class="flex items-start justify-between gap-2">
                        <div class="min-w-0">
                            <h5 class="font-bold text-xs text-white truncate">${escapeHtml(item.item)}</h5>
                            <span class="text-[10px] text-zinc-400 block truncate">🎯 ${escapeHtml(item.missao_titulo)}</span>
                        </div>
                        <div>${statusBadge}</div>
                    </div>

                    <div class="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-black/40 border border-white/5 text-xs font-mono">
                        <div>
                            <span class="text-[9px] text-zinc-500 uppercase block font-sans">Valor Total</span>
                            <span class="text-white font-bold">R$ ${vTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div>
                            <span class="text-[9px] text-zinc-500 uppercase block font-sans">Parcelamento</span>
                            <span class="text-lime-400 font-bold">${qtdParc}x R$ ${vParc.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>

                    <div class="flex items-center justify-between pt-1 border-t border-white/5 text-[11px] text-zinc-400">
                        <span>1º Venc: <strong class="text-zinc-200">${dtVenc}</strong></span>
                        <div class="flex items-center gap-1">
                            <button type="button" onclick="MissionBudget.openModalItem(${item.id})" class="px-2.5 py-1 rounded-lg bg-white/5 text-amber-400 font-bold hover:bg-white/10">Editar</button>
                            <button type="button" onclick="MissionBudget.deleteItem(${item.id}, '${escapeHtml(item.item)}')" class="px-2.5 py-1 rounded-lg bg-white/5 text-red-400 font-bold hover:bg-white/10">Excluir</button>
                        </div>
                    </div>
                </div>
            `;
        });

        return `
            <div class="glass-card rounded-3xl p-5 space-y-4">
                <div class="flex items-center justify-between">
                    <div>
                        <h4 class="font-extrabold text-sm text-white">Itens Orçados para as Missões</h4>
                        <p class="text-xs text-zinc-400">Lista discriminada de investimentos, custos, contratos e parcelamentos.</p>
                    </div>
                </div>

                <!-- Tabela Desktop -->
                <div class="hidden lg:block overflow-x-auto pb-1">
                    <table class="w-full text-left text-xs min-w-[780px]">
                        <thead>
                            <tr class="text-zinc-500 text-[10px] uppercase border-b border-white/5 pb-2">
                                <th class="pb-2.5 px-3 font-bold">Item / Recurso</th>
                                <th class="pb-2.5 px-3 font-bold">Plano / Missão</th>
                                <th class="pb-2.5 px-3 font-bold">Categoria</th>
                                <th class="pb-2.5 px-3 font-bold">Valor Total</th>
                                <th class="pb-2.5 px-3 font-bold">Parcelamento</th>
                                <th class="pb-2.5 px-3 font-bold">1º Vencimento</th>
                                <th class="pb-2.5 px-3 font-bold">Status</th>
                                <th class="pb-2.5 px-3 font-bold text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-white/5">
                            ${rowsHtml}
                        </tbody>
                    </table>
                </div>

                <!-- Cards Mobile -->
                <div class="block lg:hidden space-y-3">
                    ${cardsMobileHtml}
                </div>
            </div>
        `;
    }

    function renderSubViewProjecao() {
        if (projecaoData.length === 0) {
            return `
                <div class="glass-card rounded-3xl p-12 text-center text-zinc-500">
                    <p class="text-xs">Nenhuma projeção de parcelamento encontrada.</p>
                </div>
            `;
        }

        // Maior valor previsto para escala visual de barra
        let maxValor = 0;
        projecaoData.forEach(m => {
            if (m.total_previsto > maxValor) maxValor = m.total_previsto;
        });
        if (maxValor <= 0) maxValor = 1;

        let mesesCardsHtml = '';
        projecaoData.forEach((m, idx) => {
            const pct = Math.min(100, Math.round((m.total_previsto / maxValor) * 100));
            const isMesAtual = idx === 0;

            let itensDoMesHtml = '';
            if (m.itens && m.itens.length > 0) {
                itensDoMesHtml = m.itens.map(it => `
                    <div class="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0 text-xs">
                        <div class="min-w-0 pr-2">
                            <span class="text-zinc-200 font-bold block truncate">${escapeHtml(it.item_nome)}</span>
                            <span class="text-[10px] text-zinc-400">
                                🎯 ${escapeHtml(it.missao_titulo)} • <strong class="text-lime-300">Parcela ${it.numero_parcela}/${it.total_parcelas}</strong>
                            </span>
                        </div>
                        <span class="font-mono font-bold text-white whitespace-nowrap">
                            R$ ${parseFloat(it.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>
                `).join('');
            } else {
                itensDoMesHtml = `
                    <p class="text-[11px] text-zinc-500 py-2 text-center">Nenhum desembolso previsto neste mês.</p>
                `;
            }

            mesesCardsHtml += `
                <div class="rounded-2xl border ${isMesAtual ? 'border-lime-400/30 bg-lime-400/[0.02]' : 'border-white/5 bg-white/[0.02]'} p-4 space-y-3">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <span class="w-8 h-8 rounded-xl ${isMesAtual ? 'bg-lime-400/10 text-lime-400 border border-lime-400/30' : 'bg-white/5 text-zinc-300'} flex items-center justify-center font-bold text-xs font-mono">
                                ${m.mes.substring(5, 7)}
                            </span>
                            <div>
                                <h5 class="font-extrabold text-sm text-white flex items-center gap-2">
                                    <span>${escapeHtml(m.mes_nome)}</span>
                                    ${isMesAtual ? '<span class="text-[9px] px-2 py-0.5 rounded-full bg-lime-400/20 text-lime-400 font-bold uppercase">Mês Atual</span>' : ''}
                                </h5>
                                <span class="text-[10px] text-zinc-400">${m.qtd_parcelas} ${m.qtd_parcelas === 1 ? 'parcela' : 'parcelas'}</span>
                            </div>
                        </div>

                        <div class="text-right">
                            <span class="text-[9px] text-zinc-500 uppercase block font-sans font-bold">Total Desembolso</span>
                            <span class="text-sm sm:text-base font-black font-mono ${m.total_previsto > 0 ? 'text-lime-400' : 'text-zinc-500'}">
                                R$ ${parseFloat(m.total_previsto).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>

                    <!-- Barra de Intensidade Financeira -->
                    <div class="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                        <div class="bg-gradient-to-r from-cyan-400 via-lime-400 to-emerald-400 h-1.5 rounded-full transition-all duration-300" style="width: ${pct}%"></div>
                    </div>

                    <!-- Itens que vencem neste mês -->
                    <div class="pt-2 border-t border-white/5 space-y-1">
                        ${itensDoMesHtml}
                    </div>
                </div>
            `;
        });

        return `
            <div class="glass-card rounded-3xl p-5 space-y-4">
                <div class="flex items-center justify-between flex-wrap gap-2">
                    <div>
                        <h4 class="font-extrabold text-sm text-white flex items-center gap-2">
                            <span>Fluxo de Parcelamento & Previsões Futuras (Próximos 12 Meses)</span>
                        </h4>
                        <p class="text-xs text-zinc-400">Cronograma de desembolso parcelado mês a mês para planejar o fluxo de caixa das missões estratégicas.</p>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    ${mesesCardsHtml}
                </div>
            </div>
        `;
    }

    function renderSubViewPlanos() {
        if (planosResumo.length === 0) {
            return `
                <div class="glass-card rounded-3xl p-12 text-center text-zinc-500">
                    <p class="text-xs">Nenhum plano estratégico cadastrado ainda.</p>
                </div>
            `;
        }

        let cardsHtml = '';
        planosResumo.forEach(plano => {
            const teto = parseFloat(plano.orcamento_estimado || 0);
            const orcado = parseFloat(plano.total_itens_orcados || 0);
            const saldo = teto - orcado;
            const pct = teto > 0 ? Math.min(100, Math.round((orcado / teto) * 100)) : 0;
            const estourou = orcado > teto && teto > 0;

            cardsHtml += `
                <div class="glass-card rounded-3xl p-5 space-y-4 border ${estourou ? 'border-red-500/30 bg-red-500/[0.02]' : 'border-white/5'}">
                    <div class="flex items-start justify-between gap-2">
                        <div class="flex items-center gap-2.5">
                            <span class="w-3.5 h-3.5 rounded-full shrink-0" style="background-color: ${escapeHtml(plano.cor || '#84cc16')}"></span>
                            <div>
                                <h5 class="font-extrabold text-sm text-white leading-tight">${escapeHtml(plano.titulo)}</h5>
                                <span class="text-[10px] text-zinc-400">${plano.qtd_itens || 0} itens cadastrados</span>
                            </div>
                        </div>
                        <button type="button" onclick="MissionBudget.filtrarPorMissao(${plano.id})" class="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 text-lime-400 text-[10px] font-bold border border-white/5">
                            Filtrar Itens →
                        </button>
                    </div>

                    <!-- Métricas Financeiras do Plano -->
                    <div class="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-black/40 border border-white/5 text-xs font-mono">
                        <div>
                            <span class="text-[9px] text-zinc-500 uppercase block font-sans">Teto do Plano</span>
                            <span class="text-white font-bold">R$ ${teto.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</span>
                        </div>
                        <div>
                            <span class="text-[9px] text-zinc-500 uppercase block font-sans">Empenhado</span>
                            <span class="${estourou ? 'text-red-400' : 'text-lime-400'} font-bold">R$ ${orcado.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</span>
                        </div>
                        <div class="text-right">
                            <span class="text-[9px] text-zinc-500 uppercase block font-sans">Saldo Livre</span>
                            <span class="${saldo < 0 ? 'text-red-400' : 'text-emerald-400'} font-bold">R$ ${saldo.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</span>
                        </div>
                    </div>

                    <!-- Barra de Consumo do Teto -->
                    <div class="space-y-1">
                        <div class="flex items-center justify-between text-[10px] text-zinc-400">
                            <span>Consumo do Orçamento</span>
                            <span class="font-mono font-bold ${estourou ? 'text-red-400' : 'text-lime-300'}">${pct}%</span>
                        </div>
                        <div class="w-full bg-zinc-900 rounded-full h-2 overflow-hidden flex">
                            <div class="${estourou ? 'bg-red-500' : 'bg-gradient-to-r from-cyan-400 to-lime-400'} h-2 rounded-full transition-all duration-500" style="width: ${Math.min(100, pct)}%"></div>
                        </div>
                    </div>

                    <div class="pt-2 border-t border-white/5 flex items-center justify-end">
                        <button type="button" onclick="MissionBudget.openModalItem(null, ${plano.id})" class="text-xs text-lime-400 hover:underline font-bold flex items-center gap-1">
                            <span>+ Adicionar Item neste Plano</span>
                        </button>
                    </div>
                </div>
            `;
        });

        return `
            <div class="glass-card rounded-3xl p-5 space-y-4">
                <div class="flex items-center justify-between">
                    <div>
                        <h4 class="font-extrabold text-sm text-white">Balanço Financeiro por Plano Estratégico</h4>
                        <p class="text-xs text-zinc-400">Compare o teto orçado estimado de cada plano contra os custos reais empenhados.</p>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    ${cardsHtml}
                </div>
            </div>
        `;
    }

    function bindEvents() {
        const inputBusca = document.getElementById('input-busca-orcamento');
        let buscaTimer = null;
        inputBusca?.addEventListener('input', (e) => {
            clearTimeout(buscaTimer);
            buscaTimer = setTimeout(() => {
                currentFilter.busca = e.target.value.trim();
                load();
            }, 300);
        });

        const selectMissao = document.getElementById('select-filtro-missao');
        selectMissao?.addEventListener('change', (e) => {
            currentFilter.missao_id = parseInt(e.target.value) || 0;
            load();
        });

        const selectCategoria = document.getElementById('select-filtro-categoria');
        selectCategoria?.addEventListener('change', (e) => {
            currentFilter.categoria = e.target.value;
            load();
        });

        const selectStatus = document.getElementById('select-filtro-status');
        selectStatus?.addEventListener('change', (e) => {
            currentFilter.status = e.target.value;
            load();
        });
    }

    function setSubView(subView) {
        currentSubView = subView;
        render();
    }

    function filtrarPorMissao(missaoId) {
        currentFilter.missao_id = missaoId;
        currentSubView = 'itens';
        load();
    }

    async function openModalItem(itemId = null, missaoIdPadrao = null) {
        let itemData = {
            missao_id: missaoIdPadrao || (missoesList[0] ? missoesList[0].id : 0),
            item: '',
            categoria: 'equipamento',
            valor_total: '',
            qtd_parcelas: 1,
            valor_parcela: '',
            forma_pagamento: 'parcelado',
            data_primeiro_vencimento: new Date().toISOString().substring(0, 10),
            periodicidade: 'mensal',
            status: 'planejado',
            fornecedor: '',
            observacoes: ''
        };

        if (itemId) {
            const found = itensList.find(i => i.id == itemId);
            if (found) {
                itemData = { ...found };
            }
        }

        const existing = document.getElementById('modal-orcamento-item');
        if (existing) existing.remove();

        const modalHtml = `
            <div id="modal-orcamento-item" class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
                <div class="max-w-2xl w-full bg-[#121217] border border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
                    <div class="flex items-center justify-between pb-3 border-b border-white/5">
                        <div class="flex items-center gap-2.5">
                            <div class="w-9 h-9 rounded-2xl bg-lime-400/10 text-lime-400 border border-lime-400/20 flex items-center justify-center text-base">
                                💰
                            </div>
                            <div>
                                <h4 class="font-extrabold text-sm sm:text-base text-white">${itemId ? 'Editar Item de Orçamento' : 'Orçar Novo Item / Custo'}</h4>
                                <p class="text-[11px] text-zinc-400">Planejamento financeiro de planos estratégicos e parcelamento futuro.</p>
                            </div>
                        </div>
                        <button type="button" onclick="document.getElementById('modal-orcamento-item').remove()" class="text-zinc-400 hover:text-white p-2 rounded-xl hover:bg-white/5 transition-all">
                            ✕
                        </button>
                    </div>

                    <form id="form-orcamento-item" class="space-y-4">
                        <!-- Missão Vinculada -->
                        <div>
                            <label class="block text-xs font-semibold text-zinc-300 mb-1">Missão / Plano Estratégico Vinculado *</label>
                            <select id="item-missao-id" required class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-lime-400">
                                <option value="">Selecione o plano...</option>
                                ${missoesList.map(m => `
                                    <option value="${m.id}" ${itemData.missao_id == m.id ? 'selected' : ''}>
                                        🎯 ${escapeHtml(m.titulo)} (Teto Estimado: R$ ${parseFloat(m.orcamento_estimado || 0).toLocaleString('pt-BR')})
                                    </option>
                                `).join('')}
                            </select>
                        </div>

                        <!-- Nome do Item / Recurso -->
                        <div>
                            <label class="block text-xs font-semibold text-zinc-300 mb-1">Descrição do Item / Recurso / Equipamento *</label>
                            <input type="text" id="item-nome" required value="${escapeHtml(itemData.item)}" placeholder="Ex: Inversor Trifásico 75kW Growatt, Estrutura Solo, Projeto de Engenharia..." class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-lime-400">
                        </div>

                        <!-- Categoria & Fornecedor -->
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label class="block text-xs font-semibold text-zinc-300 mb-1">Categoria de Custo</label>
                                <select id="item-categoria" class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-lime-400">
                                    <option value="equipamento" ${itemData.categoria === 'equipamento' ? 'selected' : ''}>Equipamento / Ativo Principal</option>
                                    <option value="infraestrutura" ${itemData.categoria === 'infraestrutura' ? 'selected' : ''}>Infraestrutura / Obra Civil</option>
                                    <option value="servico" ${itemData.categoria === 'servico' ? 'selected' : ''}>Serviço / Projeto Técnico</option>
                                    <option value="mao_de_obra" ${itemData.categoria === 'mao_de_obra' ? 'selected' : ''}>Mão de Obra / Equipe</option>
                                    <option value="licenca_taxa" ${itemData.categoria === 'licenca_taxa' ? 'selected' : ''}>Licença, Taxas & Concessionária</option>
                                    <option value="marketing" ${itemData.categoria === 'marketing' ? 'selected' : ''}>Marketing & Comercial</option>
                                    <option value="outros" ${itemData.categoria === 'outros' ? 'selected' : ''}>Outros</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-zinc-300 mb-1">Fornecedor / Parceiro Cotado</label>
                                <input type="text" id="item-fornecedor" value="${escapeHtml(itemData.fornecedor || '')}" placeholder="Ex: Aldo Solar, Solfácil, Eng. Fulano..." class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-lime-400">
                            </div>
                        </div>

                        <!-- BLOCO DE PARCELAMENTO & VALORES (SIMULAÇÃO AO VIVO) -->
                        <div class="p-4 rounded-3xl bg-white/[0.03] border border-white/10 space-y-3">
                            <span class="text-[11px] font-bold text-lime-400 uppercase tracking-wider flex items-center gap-1.5">
                                <span>⚡</span> Condição de Pagamento & Parcelamento
                            </span>

                            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label class="block text-xs font-semibold text-zinc-300 mb-1">Valor Total (R$) *</label>
                                    <input type="number" step="0.01" min="0.01" id="item-valor-total" required value="${itemData.valor_total}" placeholder="0,00" class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white font-mono font-bold focus:outline-none focus:border-lime-400">
                                </div>
                                <div>
                                    <label class="block text-xs font-semibold text-zinc-300 mb-1">Número de Parcelas</label>
                                    <select id="item-qtd-parcelas" class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white font-mono focus:outline-none focus:border-lime-400">
                                        <option value="1" ${itemData.qtd_parcelas == 1 ? 'selected' : ''}>1x (À vista)</option>
                                        <option value="2" ${itemData.qtd_parcelas == 2 ? 'selected' : ''}>2x</option>
                                        <option value="3" ${itemData.qtd_parcelas == 3 ? 'selected' : ''}>3x</option>
                                        <option value="4" ${itemData.qtd_parcelas == 4 ? 'selected' : ''}>4x</option>
                                        <option value="5" ${itemData.qtd_parcelas == 5 ? 'selected' : ''}>5x</option>
                                        <option value="6" ${itemData.qtd_parcelas == 6 ? 'selected' : ''}>6x</option>
                                        <option value="10" ${itemData.qtd_parcelas == 10 ? 'selected' : ''}>10x</option>
                                        <option value="12" ${itemData.qtd_parcelas == 12 ? 'selected' : ''}>12x (1 ano)</option>
                                        <option value="18" ${itemData.qtd_parcelas == 18 ? 'selected' : ''}>18x</option>
                                        <option value="24" ${itemData.qtd_parcelas == 24 ? 'selected' : ''}>24x (2 anos)</option>
                                        <option value="36" ${itemData.qtd_parcelas == 36 ? 'selected' : ''}>36x (3 anos)</option>
                                        <option value="48" ${itemData.qtd_parcelas == 48 ? 'selected' : ''}>48x (4 anos)</option>
                                        <option value="60" ${itemData.qtd_parcelas == 60 ? 'selected' : ''}>60x (5 anos)</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-xs font-semibold text-zinc-300 mb-1">1º Vencimento *</label>
                                    <input type="date" id="item-data-vencimento" required value="${itemData.data_primeiro_vencimento}" class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-lime-400">
                                </div>
                            </div>

                            <!-- Preview do Desembolso Mensal -->
                            <div class="p-3 rounded-2xl bg-black/50 border border-white/5 flex items-center justify-between text-xs font-mono">
                                <span class="text-zinc-400">Desembolso Mensal Projetado:</span>
                                <span id="item-preview-parcela" class="text-lime-400 font-extrabold text-sm sm:text-base">
                                    R$ 0,00 / mês
                                </span>
                            </div>
                        </div>

                        <!-- Status & Observações -->
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label class="block text-xs font-semibold text-zinc-300 mb-1">Status do Orçamento</label>
                                <select id="item-status" class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-lime-400">
                                    <option value="planejado" ${itemData.status === 'planejado' ? 'selected' : ''}>Planejado (Em estudo)</option>
                                    <option value="em_negociacao" ${itemData.status === 'em_negociacao' ? 'selected' : ''}>Em Negociação / Cotação</option>
                                    <option value="aprovado" ${itemData.status === 'aprovado' ? 'selected' : ''}>Aprovado / Fechado</option>
                                    <option value="em_pagamento" ${itemData.status === 'em_pagamento' ? 'selected' : ''}>Em Pagamento</option>
                                    <option value="quitado" ${itemData.status === 'quitado' ? 'selected' : ''}>✓ Quitado</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-zinc-300 mb-1">Forma de Pagamento</label>
                                <select id="item-forma-pagamento" class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-lime-400">
                                    <option value="parcelado" ${itemData.forma_pagamento === 'parcelado' ? 'selected' : ''}>Boleto Parcelado</option>
                                    <option value="financiamento" ${itemData.forma_pagamento === 'financiamento' ? 'selected' : ''}>Financiamento Bancário / Solar</option>
                                    <option value="cartao_credito" ${itemData.forma_pagamento === 'cartao_credito' ? 'selected' : ''}>Cartão de Crédito</option>
                                    <option value="pix" ${itemData.forma_pagamento === 'pix' ? 'selected' : ''}>Pix / Transferência</option>
                                    <option value="outro" ${itemData.forma_pagamento === 'outro' ? 'selected' : ''}>Outro</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label class="block text-xs font-semibold text-zinc-300 mb-1">Observações / Especificação Técnica</label>
                            <textarea id="item-observacoes" rows="2" placeholder="Garantia, potência, condições comerciais ou prazos de entrega..." class="w-full px-3.5 py-2 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-lime-400">${escapeHtml(itemData.observacoes || '')}</textarea>
                        </div>

                        <!-- Footer -->
                        <div class="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
                            <button type="button" onclick="document.getElementById('modal-orcamento-item').remove()" class="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-full transition-all">
                                Cancelar
                            </button>
                            <button type="submit" class="px-6 py-2.5 bg-lime-400 hover:bg-lime-300 text-zinc-950 font-extrabold text-xs rounded-full shadow-lg shadow-lime-400/20 transition-all">
                                ${itemId ? 'Salvar Alterações' : 'Salvar no Orçamento'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Recálculo ao vivo do valor da parcela no modal
        const inpTotal = document.getElementById('item-valor-total');
        const selParc = document.getElementById('item-qtd-parcelas');
        const prevParc = document.getElementById('item-preview-parcela');

        function recalcularPreview() {
            const tot = parseFloat(inpTotal?.value || '0');
            const parc = parseInt(selParc?.value || '1');
            if (tot > 0 && parc > 0) {
                const v = tot / parc;
                if (prevParc) {
                    prevParc.innerText = `${parc}x de R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / mês`;
                }
            } else {
                if (prevParc) prevParc.innerText = 'R$ 0,00 / mês';
            }
        }

        inpTotal?.addEventListener('input', recalcularPreview);
        selParc?.addEventListener('change', recalcularPreview);
        recalcularPreview();

        document.getElementById('form-orcamento-item')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const missaoId = parseInt(document.getElementById('item-missao-id')?.value || '0');
            const item = document.getElementById('item-nome')?.value.trim();
            const categoria = document.getElementById('item-categoria')?.value;
            const fornecedor = document.getElementById('item-fornecedor')?.value.trim();
            const valorTotal = parseFloat(document.getElementById('item-valor-total')?.value || '0');
            const qtdParcelas = parseInt(document.getElementById('item-qtd-parcelas')?.value || '1');
            const dataVenc = document.getElementById('item-data-vencimento')?.value;
            const status = document.getElementById('item-status')?.value;
            const formaPagamento = document.getElementById('item-forma-pagamento')?.value;
            const observacoes = document.getElementById('item-observacoes')?.value.trim();

            const payload = {
                missao_id: missaoId,
                item: item,
                categoria: categoria,
                fornecedor: fornecedor,
                valor_total: valorTotal,
                qtd_parcelas: qtdParcelas,
                data_primeiro_vencimento: dataVenc,
                status: status,
                forma_pagamento: formaPagamento,
                observacoes: observacoes
            };

            try {
                if (itemId) {
                    await API.updateMissaoOrcamentoItem(itemId, payload);
                    App.showToast('Item de orçamento atualizado!', 'success');
                } else {
                    await API.createMissaoOrcamentoItem(payload);
                    App.showToast('Item orçado registrado no plano!', 'success');
                }
                document.getElementById('modal-orcamento-item')?.remove();
                await load();
            } catch (err) {
                App.showToast(err.message, 'error');
            }
        });
    }

    async function deleteItem(itemId, itemNome) {
        if (!confirm(`Deseja remover "${itemNome}" do orçamento?`)) {
            return;
        }

        try {
            await API.deleteMissaoOrcamentoItem(itemId);
            App.showToast('Item removido do orçamento.', 'info');
            await load();
        } catch (err) {
            App.showToast(err.message, 'error');
        }
    }

    function openModalSimulador() {
        const existing = document.getElementById('modal-simulador-parcelamento');
        if (existing) existing.remove();

        const modalHtml = `
            <div id="modal-simulador-parcelamento" class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
                <div class="max-w-lg w-full bg-[#121217] border border-cyan-400/20 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
                    <div class="flex items-center justify-between pb-3 border-b border-white/5">
                        <div class="flex items-center gap-2.5">
                            <div class="w-9 h-9 rounded-2xl bg-cyan-400/10 text-cyan-400 border border-cyan-400/20 flex items-center justify-center text-base">
                                🧮
                            </div>
                            <div>
                                <h4 class="font-extrabold text-sm sm:text-base text-white">Simulador de Parcelamento</h4>
                                <p class="text-[11px] text-zinc-400">Estude o impacto do parcelamento no fluxo de caixa.</p>
                            </div>
                        </div>
                        <button type="button" onclick="document.getElementById('modal-simulador-parcelamento').remove()" class="text-zinc-400 hover:text-white p-2 rounded-xl hover:bg-white/5 transition-all">
                            ✕
                        </button>
                    </div>

                    <div class="space-y-4 text-xs">
                        <div>
                            <label class="block font-semibold text-zinc-300 mb-1">Valor do Investimento / Item (R$)</label>
                            <input type="number" step="100" id="sim-valor" value="50000" class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white font-mono font-bold focus:outline-none focus:border-cyan-400">
                        </div>

                        <div>
                            <label class="block font-semibold text-zinc-300 mb-1">Prazo / Parcelas</label>
                            <div class="grid grid-cols-4 gap-2">
                                <button type="button" class="sim-parc-btn px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 font-mono font-bold" data-p="6">6x</button>
                                <button type="button" class="sim-parc-btn px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 font-mono font-bold" data-p="12">12x</button>
                                <button type="button" class="sim-parc-btn px-3 py-2 rounded-xl bg-cyan-400/20 text-cyan-300 border border-cyan-400/30 font-mono font-bold" data-p="24">24x</button>
                                <button type="button" class="sim-parc-btn px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 font-mono font-bold" data-p="36">36x</button>
                            </div>
                        </div>

                        <!-- Resultado da Simulação -->
                        <div class="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-2">
                            <div class="flex items-center justify-between font-mono">
                                <span class="text-zinc-400">Parcela Mensal sem juros:</span>
                                <span id="sim-res-parcela" class="text-cyan-300 font-extrabold text-base">R$ 2.083,33 / mês</span>
                            </div>
                            <div class="flex items-center justify-between font-mono text-[11px] text-zinc-500">
                                <span>Impacto diário aproximado:</span>
                                <span id="sim-res-dia">~R$ 69,44 / dia</span>
                            </div>
                        </div>

                        <div class="flex items-center justify-end gap-2 pt-2">
                            <button type="button" onclick="document.getElementById('modal-simulador-parcelamento').remove()" class="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-full transition-all">
                                Fechar
                            </button>
                            <button type="button" onclick="MissionBudget.adicionarItemDaSimulacao()" class="px-5 py-2.5 bg-cyan-400 hover:bg-cyan-300 text-zinc-950 font-extrabold text-xs rounded-full shadow-lg transition-all">
                                + Usar esta Simulação
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const inpVal = document.getElementById('sim-valor');
        const resParc = document.getElementById('sim-res-parcela');
        const resDia = document.getElementById('sim-res-dia');
        let selectedP = 24;

        function updateSim() {
            const v = parseFloat(inpVal?.value || '0');
            const parc = v / selectedP;
            const dia = parc / 30;
            if (resParc) resParc.innerText = `R$ ${parc.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / mês`;
            if (resDia) resDia.innerText = `~R$ ${dia.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / dia`;
        }

        inpVal?.addEventListener('input', updateSim);

        document.querySelectorAll('.sim-parc-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.sim-parc-btn').forEach(b => {
                    b.className = 'sim-parc-btn px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 font-mono font-bold';
                });
                btn.className = 'sim-parc-btn px-3 py-2 rounded-xl bg-cyan-400/20 text-cyan-300 border border-cyan-400/30 font-mono font-bold';
                selectedP = parseInt(btn.dataset.p);
                updateSim();
            });
        });

        updateSim();
    }

    function adicionarItemDaSimulacao() {
        const inpVal = document.getElementById('sim-valor');
        const val = parseFloat(inpVal?.value || '0');
        document.getElementById('modal-simulador-parcelamento')?.remove();

        openModalItem();
        setTimeout(() => {
            const targetVal = document.getElementById('item-valor-total');
            if (targetVal) {
                targetVal.value = val;
                targetVal.dispatchEvent(new Event('input'));
            }
        }, 100);
    }

    function getStatusBadge(st) {
        const map = {
            'planejado': '<span class="px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-white/5 text-[9px] font-bold">Planejado</span>',
            'em_negociacao': '<span class="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[9px] font-bold">Em Cotação</span>',
            'aprovado': '<span class="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[9px] font-bold">Aprovado</span>',
            'em_pagamento': '<span class="px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/25 text-[9px] font-bold">Em Pagamento</span>',
            'quitado': '<span class="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold">✓ Quitado</span>',
            'cancelado': '<span class="px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-[9px] font-bold">Cancelado</span>'
        };
        return map[st] || `<span class="text-zinc-500 text-[10px]">${escapeHtml(st)}</span>`;
    }

    function getCategoriaBadge(cat) {
        const map = {
            'equipamento': '<span class="text-cyan-300 text-[10px] font-semibold">⚡ Equipamento</span>',
            'infraestrutura': '<span class="text-amber-300 text-[10px] font-semibold">🏗️ Infraestrutura</span>',
            'servico': '<span class="text-purple-300 text-[10px] font-semibold">💼 Serviço</span>',
            'mao_de_obra': '<span class="text-blue-300 text-[10px] font-semibold">👷 Mão de Obra</span>',
            'licenca_taxa': '<span class="text-orange-300 text-[10px] font-semibold">📜 Licenças & Taxas</span>',
            'marketing': '<span class="text-pink-300 text-[10px] font-semibold">📢 Marketing</span>',
            'outros': '<span class="text-zinc-400 text-[10px] font-semibold">📦 Outros</span>'
        };
        return map[cat] || `<span class="text-zinc-400 text-[10px]">${escapeHtml(cat)}</span>`;
    }

    function formatarData(dataIso) {
        if (!dataIso) return '-';
        const [ano, mes, dia] = dataIso.split('-');
        return `${dia}/${mes}/${ano}`;
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.innerText = String(text);
        return div.innerHTML;
    }

    return {
        init,
        load,
        render,
        setSubView,
        filtrarPorMissao,
        openModalItem,
        deleteItem,
        openModalSimulador,
        adicionarItemDaSimulacao
    };
})();
