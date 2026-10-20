/**
 * AIRES - Módulo Startup: Gestão de Protocolos & Chamados
 * Vinculação a Clientes, Controle de Prazos/Vencimentos e Pontos de Atenção
 * Obsidian Dark Glassmorphism
 */

const StartupProtocolos = (() => {
    let protocolosList = [];
    let kpisData = {
        total_geral: 0,
        total_abertos: 0,
        total_vencendo_hoje: 0,
        total_vencidos: 0,
        total_atencao: 0,
        total_concluidos: 0
    };
    let clientesList = [];
    let currentFilter = {
        status: '',
        prioridade: '',
        busca: '',
        vencimento: '',
        atencao: '',
        cliente_id: 0
    };

    function init() {
        // Eventos e filtros vinculados dinamicamente
    }

    async function load() {
        const container = document.getElementById('startup-protocolos-container');
        if (!container) return;

        container.innerHTML = `
            <div class="py-12 flex flex-col items-center justify-center text-zinc-500">
                <div class="w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full animate-spin mb-3"></div>
                <p class="text-xs font-semibold">Carregando protocolos e alertas de clientes...</p>
            </div>
        `;

        try {
            const [respProt, respCli] = await Promise.all([
                API.getStartupProtocolos(currentFilter),
                API.getStartupClientes()
            ]);

            protocolosList = (respProt && respProt.protocolos) || [];
            kpisData = (respProt && respProt.kpis) || {
                total_geral: 0,
                total_abertos: 0,
                total_vencendo_hoje: 0,
                total_vencidos: 0,
                total_atencao: 0,
                total_concluidos: 0
            };
            clientesList = (respCli && respCli.clientes) || [];

            render();
        } catch (err) {
            container.innerHTML = `
                <div class="glass-card rounded-3xl p-6 text-center text-red-400">
                    <p class="text-xs font-bold">Erro ao carregar protocolos: ${escapeHtml(err.message)}</p>
                </div>
            `;
        }
    }

    function render() {
        const container = document.getElementById('startup-protocolos-container');
        if (!container) return;

        const totalAtencao = parseInt(kpisData.total_atencao || 0);
        const totalVencidos = parseInt(kpisData.total_vencidos || 0);
        const totalVencendoHoje = parseInt(kpisData.total_vencendo_hoje || 0);
        const totalAbertos = parseInt(kpisData.total_abertos || 0);
        const totalConcluidos = parseInt(kpisData.total_concluidos || 0);

        let html = `
            <!-- ========================================================
                 KPI CARDS: RESUMO DE PROTOCOLOS & ATENÇÃO
                 ======================================================== -->
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <!-- Card 1: Pontos de Atenção / Críticos -->
                <div onclick="StartupProtocolos.setFiltroAtencao()" class="glass-card rounded-2xl p-4 space-y-1 border ${totalAtencao > 0 ? 'border-amber-500/40 bg-amber-500/[0.04]' : 'border-white/5 bg-white/[0.02]'} cursor-pointer hover:bg-white/[0.04] transition-all">
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] text-amber-400 uppercase font-bold tracking-wider">Pontos de Atenção</span>
                        <span class="text-amber-400 text-sm ${totalAtencao > 0 ? 'animate-bounce' : ''}">⚠️</span>
                    </div>
                    <p class="text-2xl font-black text-amber-400 font-mono">${totalAtencao} <span class="text-xs font-normal text-zinc-400">clientes</span></p>
                    <p class="text-[10px] text-zinc-400 truncate">Demandam atenção especial</p>
                </div>

                <!-- Card 2: Vencidos / Vencendo Hoje -->
                <div onclick="StartupProtocolos.setFiltroVencimento('vencidos')" class="glass-card rounded-2xl p-4 space-y-1 border ${totalVencidos > 0 ? 'border-red-500/40 bg-red-500/[0.04]' : 'border-white/5 bg-white/[0.02]'} cursor-pointer hover:bg-white/[0.04] transition-all">
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] text-red-400 uppercase font-bold tracking-wider">Prazos Vencidos</span>
                        <span class="text-red-400 text-sm">⏳</span>
                    </div>
                    <p class="text-2xl font-black text-red-400 font-mono">${totalVencidos} <span class="text-xs font-normal text-zinc-400">${totalVencendoHoje > 0 ? `(${totalVencendoHoje} vencem hoje)` : ''}</span></p>
                    <p class="text-[10px] text-zinc-400 truncate">Prazos de concessionária expirados</p>
                </div>

                <!-- Card 3: Em Andamento / Abertos -->
                <div onclick="StartupProtocolos.setFiltroStatus('pendentes')" class="glass-card rounded-2xl p-4 space-y-1 border border-white/5 bg-white/[0.02] cursor-pointer hover:bg-white/[0.04] transition-all">
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] text-cyan-400 uppercase font-bold tracking-wider">Em Andamento</span>
                        <span class="text-cyan-400 text-sm">📂</span>
                    </div>
                    <p class="text-2xl font-black text-cyan-400 font-mono">${totalAbertos} <span class="text-xs font-normal text-zinc-400">ativos</span></p>
                    <p class="text-[10px] text-zinc-400 truncate">Aguardando Energisa ou cliente</p>
                </div>

                <!-- Card 4: Concluídos -->
                <div onclick="StartupProtocolos.setFiltroStatus('concluido')" class="glass-card rounded-2xl p-4 space-y-1 border border-white/5 bg-white/[0.02] cursor-pointer hover:bg-white/[0.04] transition-all">
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] text-emerald-400 uppercase font-bold tracking-wider">Resolvidos</span>
                        <span class="text-emerald-400 text-sm">✓</span>
                    </div>
                    <p class="text-2xl font-black text-emerald-400 font-mono">${totalConcluidos} <span class="text-xs font-normal text-zinc-400">concluídos</span></p>
                    <p class="text-[10px] text-zinc-400 truncate">Protocolos finalizados com sucesso</p>
                </div>
            </div>

            <!-- ========================================================
                 BARRA DE BUSCA, FILTROS RÁPIDOS & NOVO PROTOCOLO
                 ======================================================== -->
            <div class="glass-card rounded-3xl p-4 space-y-3 border border-white/5">
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <!-- Campo de Busca -->
                    <div class="relative flex-1">
                        <input type="text" id="input-busca-protocolo" placeholder="Buscar por protocolo, cliente, UC, assunto ou nota..." value="${escapeHtml(currentFilter.busca)}" class="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-lime-400 transition-all">
                        <svg class="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    </div>

                    <!-- Filtro por Cliente -->
                    <div class="w-full md:w-56">
                        <select id="select-filtro-cliente" class="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-zinc-300 focus:outline-none focus:border-lime-400">
                            <option value="0">Todos os Clientes</option>
                            ${clientesList.map(c => `
                                <option value="${c.id}" ${currentFilter.cliente_id == c.id ? 'selected' : ''}>
                                    ${escapeHtml(c.nome)}
                                </option>
                            `).join('')}
                        </select>
                    </div>

                    <!-- Botão Novo Protocolo -->
                    <button type="button" onclick="StartupProtocolos.openModalNovo()" class="px-5 py-2.5 bg-lime-400 hover:bg-lime-300 text-zinc-950 font-extrabold text-xs rounded-full shadow-lg shadow-lime-400/20 transition-all flex items-center justify-center gap-2 shrink-0">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                        <span>+ Novo Protocolo</span>
                    </button>
                </div>

                <!-- Pílulas de Filtro Rápido -->
                <div class="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                    <button type="button" onclick="StartupProtocolos.limparFiltros()" class="px-3 py-1 rounded-full text-[11px] font-bold transition-all ${!currentFilter.status && !currentFilter.atencao && !currentFilter.vencimento ? 'bg-white/10 text-white border border-white/20' : 'text-zinc-400 hover:text-white bg-transparent'}">
                        Todos (${kpisData.total_geral || 0})
                    </button>
                    <button type="button" onclick="StartupProtocolos.setFiltroAtencao()" class="px-3 py-1 rounded-full text-[11px] font-bold transition-all ${currentFilter.atencao === '1' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-zinc-400 hover:text-amber-400'}">
                        ⚠️ Atenção Especial (${totalAtencao})
                    </button>
                    <button type="button" onclick="StartupProtocolos.setFiltroVencimento('vencidos')" class="px-3 py-1 rounded-full text-[11px] font-bold transition-all ${currentFilter.vencimento === 'vencidos' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'text-zinc-400 hover:text-red-400'}">
                        ⏳ Vencidos (${totalVencidos})
                    </button>
                    <button type="button" onclick="StartupProtocolos.setFiltroVencimento('hoje')" class="px-3 py-1 rounded-full text-[11px] font-bold transition-all ${currentFilter.vencimento === 'hoje' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'text-zinc-400 hover:text-orange-400'}">
                        ⏰ Vencem Hoje (${totalVencendoHoje})
                    </button>
                    <button type="button" onclick="StartupProtocolos.setFiltroStatus('pendentes')" class="px-3 py-1 rounded-full text-[11px] font-bold transition-all ${currentFilter.status === 'pendentes' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-zinc-400 hover:text-cyan-400'}">
                        📂 Em Andamento (${totalAbertos})
                    </button>
                    <button type="button" onclick="StartupProtocolos.setFiltroStatus('concluido')" class="px-3 py-1 rounded-full text-[11px] font-bold transition-all ${currentFilter.status === 'concluido' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-zinc-400 hover:text-emerald-400'}">
                        ✓ Concluídos (${totalConcluidos})
                    </button>
                </div>
            </div>
        `;

        // Se não houver protocolos
        if (protocolosList.length === 0) {
            html += `
                <div class="glass-card rounded-3xl p-12 text-center text-zinc-500 space-y-3">
                    <div class="w-12 h-12 mx-auto rounded-2xl bg-lime-400/10 text-lime-400 border border-lime-400/20 flex items-center justify-center text-xl">📋</div>
                    <p class="text-sm font-bold text-white">Nenhum protocolo encontrado</p>
                    <p class="text-xs max-w-sm mx-auto">Cadastre solicitações da concessionária Energisa, trocas de titularidade, vistorias ou anote pontos de atenção importantes de cada cliente.</p>
                    <button type="button" onclick="StartupProtocolos.openModalNovo()" class="px-5 py-2.5 bg-lime-400 hover:bg-lime-300 text-zinc-950 font-extrabold text-xs rounded-full shadow-lg transition-all">
                        + Registrar Primeiro Protocolo
                    </button>
                </div>
            `;
            container.innerHTML = html;
            bindFilterEvents();
            return;
        }

        // Listagem de Cards de Protocolo
        html += `
            <div class="space-y-3">
        `;

        protocolosList.forEach(p => {
            const isAtencao = parseInt(p.alerta_atencao) === 1;
            const isConcluido = p.status === 'concluido';
            const isCancelado = p.status === 'cancelado';
            const diasParaVencer = p.dias_para_vencer !== null ? parseInt(p.dias_para_vencer) : null;
            const isVencido = diasParaVencer !== null && diasParaVencer < 0 && !isConcluido && !isCancelado;
            const isVenceHoje = diasParaVencer === 0 && !isConcluido && !isCancelado;

            // Badge de Status
            let statusBadge = '';
            if (p.status === 'aberto') {
                statusBadge = `<span class="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-bold">Aberto</span>`;
            } else if (p.status === 'em_andamento') {
                statusBadge = `<span class="px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-bold">Em Andamento</span>`;
            } else if (p.status === 'aguardando_cliente') {
                statusBadge = `<span class="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold">Aguardando Cliente</span>`;
            } else if (p.status === 'concluido') {
                statusBadge = `<span class="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">✓ Concluído</span>`;
            } else {
                statusBadge = `<span class="px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-[10px] font-medium">Cancelado</span>`;
            }

            // Badge de Vencimento
            let vencimentoBadge = '';
            if (isConcluido) {
                vencimentoBadge = `<span class="text-[10px] font-mono text-emerald-400">Resolvido em ${formatarData(p.data_conclusao || p.atualizado_em)}</span>`;
            } else if (isVencido) {
                vencimentoBadge = `
                    <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-[10px] font-extrabold uppercase animate-pulse">
                        ⚠️ Vencido há ${Math.abs(diasParaVencer)} ${Math.abs(diasParaVencer) === 1 ? 'dia' : 'dias'}
                    </span>
                `;
            } else if (isVenceHoje) {
                vencimentoBadge = `
                    <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-400 text-[10px] font-extrabold uppercase">
                        ⏰ Vence Hoje!
                    </span>
                `;
            } else if (diasParaVencer !== null) {
                vencimentoBadge = `
                    <span class="text-[11px] font-mono text-zinc-400">
                        Vence em <strong class="text-lime-300 font-bold">${diasParaVencer}d</strong> (${formatarData(p.data_vencimento)})
                    </span>
                `;
            } else {
                vencimentoBadge = `<span class="text-[10px] text-zinc-500">Sem prazo definido</span>`;
            }

            // Categoria amigável
            const categoriaNome = formatarCategoria(p.categoria);

            // Card principal
            html += `
                <div class="glass-card rounded-3xl p-4 sm:p-5 space-y-3.5 transition-all border ${isAtencao && !isConcluido ? 'border-amber-500/30 bg-gradient-to-br from-amber-500/[0.03] to-transparent' : isVencido ? 'border-red-500/30' : 'border-white/5'}">
                    <!-- Top Line: Protocolo, Canal, Status, Ações -->
                    <div class="flex items-start justify-between gap-3 flex-wrap">
                        <div class="flex items-center gap-2 flex-wrap">
                            <!-- Número do Protocolo -->
                            <span class="px-2.5 py-1 rounded-xl bg-white/[0.05] border border-white/10 text-xs font-mono font-black text-lime-400 tracking-wider">
                                #${escapeHtml(p.numero_protocolo)}
                            </span>

                            <!-- Canal / Órgão -->
                            <span class="px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[10px] font-semibold">
                                ${escapeHtml(p.canal || 'Energisa')}
                            </span>

                            <!-- Categoria -->
                            <span class="px-2.5 py-0.5 rounded-full bg-white/5 text-zinc-300 text-[10px] font-medium">
                                ${escapeHtml(categoriaNome)}
                            </span>

                            <!-- Status -->
                            ${statusBadge}

                            <!-- Badge de Ponto de Atenção -->
                            ${isAtencao && !isConcluido ? `
                                <span class="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-extrabold uppercase flex items-center gap-1">
                                    <span>⚠️</span> Atenção Especial
                                </span>
                            ` : ''}
                        </div>

                        <!-- Vencimento & Ações Rápidas -->
                        <div class="flex items-center gap-2">
                            ${vencimentoBadge}

                            <div class="flex items-center gap-1 pl-2 border-l border-white/10">
                                <button type="button" onclick="StartupProtocolos.openModalAndamentos(${p.id})" class="p-1.5 text-zinc-400 hover:text-cyan-400 rounded-xl hover:bg-cyan-400/10 transition-all" title="Ver Histórico / Adicionar Andamento">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                                </button>
                                <button type="button" onclick="StartupProtocolos.openModalEditar(${p.id})" class="p-1.5 text-zinc-400 hover:text-amber-400 rounded-xl hover:bg-amber-400/10 transition-all" title="Editar Protocolo">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                                </button>
                                <button type="button" onclick="StartupProtocolos.excluirProtocolo(${p.id}, '${escapeHtml(p.numero_protocolo)}')" class="p-1.5 text-zinc-500 hover:text-red-400 rounded-xl hover:bg-red-500/10 transition-all" title="Excluir">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Assunto e Cliente Vinculado -->
                    <div class="space-y-1.5">
                        <h5 class="text-sm sm:text-base font-bold text-white leading-snug">
                            ${escapeHtml(p.titulo)}
                        </h5>

                        <div class="flex items-center gap-3 text-xs text-zinc-400 flex-wrap">
                            <span class="flex items-center gap-1.5 text-zinc-300 font-semibold">
                                <svg class="w-3.5 h-3.5 text-lime-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                                ${escapeHtml(p.cliente_nome)}
                            </span>
                            <span class="font-mono text-[11px] text-zinc-500">
                                UC: ${escapeHtml(p.cliente_uc || 'Sem UC')}
                            </span>
                            ${p.cliente_telefone ? `
                                <a href="https://wa.me/55${p.cliente_telefone.replace(/\D/g, '')}" target="_blank" rel="noopener" class="text-emerald-400 hover:underline flex items-center gap-1 text-[11px]" title="Conversar no WhatsApp">
                                    <span>💬 ${escapeHtml(p.cliente_telefone)}</span>
                                </a>
                            ` : ''}
                            <span class="text-zinc-500 text-[11px]">
                                Aberto em: ${formatarData(p.data_abertura)}
                            </span>
                        </div>
                    </div>

                    <!-- BOX DE PONTO DE ATENÇÃO DESTACADO DO CLIENTE -->
                    ${isAtencao && p.observacoes ? `
                        <div class="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs leading-relaxed space-y-1">
                            <div class="flex items-center gap-1.5 font-bold text-amber-300 text-[11px] uppercase tracking-wider">
                                <span>⚠️ PONTO DE ATENÇÃO COM ESTE CLIENTE:</span>
                            </div>
                            <p class="whitespace-pre-line text-zinc-200">${escapeHtml(p.observacoes)}</p>
                        </div>
                    ` : p.observacoes ? `
                        <div class="p-3 rounded-2xl bg-white/[0.02] border border-white/5 text-zinc-300 text-xs leading-relaxed">
                            <span class="text-[10px] text-zinc-500 uppercase font-bold block mb-0.5">Observações:</span>
                            <p class="whitespace-pre-line text-zinc-400">${escapeHtml(p.observacoes)}</p>
                        </div>
                    ` : ''}

                    <!-- Rodapé do Card: Último Andamento & Ações -->
                    <div class="pt-2 border-t border-white/5 flex items-center justify-between gap-2 flex-wrap text-xs">
                        <!-- Último Andamento -->
                        <div class="text-[11px] text-zinc-400 flex items-center gap-1.5 flex-1 min-w-[200px]">
                            ${Array.isArray(p.historico_andamentos) && p.historico_andamentos.length > 0 ? `
                                <span class="text-zinc-500">Último andamento:</span>
                                <span class="text-zinc-300 truncate max-w-sm font-medium">"${escapeHtml(p.historico_andamentos[p.historico_andamentos.length - 1].descricao)}"</span>
                                <span class="text-[10px] text-zinc-500">(${p.historico_andamentos.length})</span>
                            ` : `
                                <span class="text-zinc-500">Sem andamentos registrados ainda.</span>
                            `}
                        </div>

                        <!-- Botões de Ação -->
                        <div class="flex items-center gap-2">
                            <button type="button" onclick="StartupProtocolos.openModalAndamentos(${p.id})" class="px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 text-cyan-300 border border-white/10 text-[11px] font-semibold transition-all">
                                + Andamento
                            </button>

                            ${!isConcluido ? `
                                <button type="button" onclick="StartupProtocolos.mudarStatusRapido(${p.id}, 'concluido')" class="px-3 py-1 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold transition-all">
                                    ✓ Concluir
                                </button>
                            ` : `
                                <button type="button" onclick="StartupProtocolos.mudarStatusRapido(${p.id}, 'em_andamento')" class="px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 text-[11px] font-medium transition-all">
                                    Reabrir
                                </button>
                            `}
                        </div>
                    </div>
                </div>
            `;
        });

        html += `
            </div>
        `;

        container.innerHTML = html;
        bindFilterEvents();
    }

    function bindFilterEvents() {
        const inputBusca = document.getElementById('input-busca-protocolo');
        let buscaTimeout = null;
        inputBusca?.addEventListener('input', (e) => {
            clearTimeout(buscaTimeout);
            buscaTimeout = setTimeout(() => {
                currentFilter.busca = e.target.value.trim();
                load();
            }, 300);
        });

        const selectCliente = document.getElementById('select-filtro-cliente');
        selectCliente?.addEventListener('change', (e) => {
            currentFilter.cliente_id = parseInt(e.target.value) || 0;
            load();
        });
    }

    function setFiltroStatus(status) {
        currentFilter.status = currentFilter.status === status ? '' : status;
        currentFilter.atencao = '';
        currentFilter.vencimento = '';
        load();
    }

    function setFiltroAtencao() {
        currentFilter.atencao = currentFilter.atencao === '1' ? '' : '1';
        currentFilter.status = '';
        currentFilter.vencimento = '';
        load();
    }

    function setFiltroVencimento(tipo) {
        currentFilter.vencimento = currentFilter.vencimento === tipo ? '' : tipo;
        currentFilter.status = '';
        currentFilter.atencao = '';
        load();
    }

    function limparFiltros() {
        currentFilter = {
            status: '',
            prioridade: '',
            busca: '',
            vencimento: '',
            atencao: '',
            cliente_id: 0
        };
        load();
    }

    function openModalNovo(clienteIdPreselecionado = null) {
        const existing = document.getElementById('modal-novo-protocolo');
        if (existing) existing.remove();

        const dataHoje = new Date().toISOString().substring(0, 10);
        const numeroSugerido = 'PROT-' + new Date().toISOString().substring(2, 10).replace(/-/g, '') + '-' + Math.floor(1000 + Math.random() * 9000);

        const modalHtml = `
            <div id="modal-novo-protocolo" class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
                <div class="max-w-2xl w-full bg-[#121217] border border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
                    <div class="flex items-center justify-between pb-3 border-b border-white/5">
                        <div class="flex items-center gap-2.5">
                            <div class="w-9 h-9 rounded-2xl bg-lime-400/10 text-lime-400 border border-lime-400/20 flex items-center justify-center text-base">
                                📋
                            </div>
                            <div>
                                <h4 class="font-extrabold text-sm sm:text-base text-white">Registrar Novo Protocolo</h4>
                                <p class="text-[11px] text-zinc-400">Vincule ao cliente, defina prazos da concessionária e anote pontos de atenção.</p>
                            </div>
                        </div>
                        <button type="button" onclick="document.getElementById('modal-novo-protocolo').remove()" class="text-zinc-400 hover:text-white p-2 rounded-xl hover:bg-white/5 transition-all">
                            ✕
                        </button>
                    </div>

                    <form id="form-novo-protocolo" class="space-y-4">
                        <!-- Cliente Vinculado -->
                        <div>
                            <label class="block text-xs font-semibold text-zinc-300 mb-1">Cliente Vinculado *</label>
                            <select id="novo-prot-cliente" required class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-lime-400">
                                <option value="">Selecione o cliente...</option>
                                ${clientesList.map(c => `
                                    <option value="${c.id}" ${clienteIdPreselecionado == c.id ? 'selected' : ''}>
                                        ${escapeHtml(c.nome)} (UC: ${escapeHtml(c.numero_uc || 'Sem UC')})
                                    </option>
                                `).join('')}
                            </select>
                        </div>

                        <!-- Número do Protocolo & Canal -->
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label class="block text-xs font-semibold text-zinc-300 mb-1">Número do Protocolo (Energisa / Órgão)</label>
                                <div class="relative">
                                    <input type="text" id="novo-prot-numero" value="${numeroSugerido}" placeholder="Ex: 2026101912345" class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-lime-400 font-mono font-bold focus:outline-none focus:border-lime-400">
                                </div>
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-zinc-300 mb-1">Canal / Órgão Responsável</label>
                                <select id="novo-prot-canal" class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-lime-400">
                                    <option value="Energisa">Energisa (Distribuidora)</option>
                                    <option value="ANEEL">ANEEL</option>
                                    <option value="Interno">Interno (Atendimento AIRES)</option>
                                    <option value="Cartório / Jurídico">Cartório / Jurídico</option>
                                    <option value="Outro">Outro</option>
                                </select>
                            </div>
                        </div>

                        <!-- Categoria & Prioridade -->
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label class="block text-xs font-semibold text-zinc-300 mb-1">Categoria do Protocolo</label>
                                <select id="novo-prot-categoria" class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-lime-400">
                                    <option value="troca_titularidade">Troca de Titularidade</option>
                                    <option value="compensacao_creditos">Compensação de Créditos GD</option>
                                    <option value="contestacao_fatura">Contestação de Fatura / Taxas</option>
                                    <option value="vistoria_medicao">Vistoria / Medidor Bidirecional</option>
                                    <option value="solicitacao_acesso">Parecer / Solicitação de Acesso GD</option>
                                    <option value="ligacao_nova">Ligação Nova / Aumento de Carga</option>
                                    <option value="revisao_tarifa">Revisão Tarifária / Iluminação Pública</option>
                                    <option value="geral">Atendimento Geral / Chamado</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-zinc-300 mb-1">Prioridade</label>
                                <select id="novo-prot-prioridade" class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-lime-400">
                                    <option value="media" selected>Média</option>
                                    <option value="alta">Alta</option>
                                    <option value="urgente">🚨 Urgente</option>
                                    <option value="baixa">Baixa</option>
                                </select>
                            </div>
                        </div>

                        <!-- Título / Assunto -->
                        <div>
                            <label class="block text-xs font-semibold text-zinc-300 mb-1">Assunto / Descrição Curta *</label>
                            <input type="text" id="novo-prot-titulo" required placeholder="Ex: Solicitação de inclusão de UC no consórcio solar..." class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-lime-400">
                        </div>

                        <!-- Prazos: Abertura e Vencimento -->
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label class="block text-xs font-semibold text-zinc-300 mb-1">Data de Abertura *</label>
                                <input type="date" id="novo-prot-abertura" required value="${dataHoje}" class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-lime-400">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-zinc-300 mb-1">Prazo / Data de Vencimento</label>
                                <input type="date" id="novo-prot-vencimento" class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-lime-400">
                                <div class="flex items-center gap-1.5 mt-1.5">
                                    <span class="text-[10px] text-zinc-500">Atalhos:</span>
                                    <button type="button" onclick="StartupProtocolos.addDiasVencimento(5)" class="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] text-zinc-300">+5 dias</button>
                                    <button type="button" onclick="StartupProtocolos.addDiasVencimento(10)" class="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] text-zinc-300">+10 dias</button>
                                    <button type="button" onclick="StartupProtocolos.addDiasVencimento(15)" class="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] text-zinc-300">+15 dias</button>
                                    <button type="button" onclick="StartupProtocolos.addDiasVencimento(30)" class="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] text-zinc-300">+30 dias</button>
                                </div>
                            </div>
                        </div>

                        <!-- SWITCH: Ponto de Atenção com o Cliente -->
                        <div class="p-4 rounded-2xl bg-amber-500/[0.06] border border-amber-500/20 space-y-2">
                            <label class="flex items-center gap-2.5 cursor-pointer">
                                <input type="checkbox" id="novo-prot-atencao" class="w-4 h-4 rounded text-amber-400 focus:ring-0 focus:ring-offset-0 bg-zinc-900 border-white/20">
                                <span class="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                                    <span>⚠️</span> Marcar como Ponto de Atenção para este cliente
                                </span>
                            </label>
                            <p class="text-[11px] text-zinc-400 pl-6">
                                Ative caso precise ficar de olho em pendências deste cliente, faturas retidas, exigências da concessionária ou prazos críticos.
                            </p>
                        </div>

                        <!-- Observações / Detalhes -->
                        <div>
                            <label class="block text-xs font-semibold text-zinc-300 mb-1">Observações / O que prestar atenção</label>
                            <textarea id="novo-prot-obs" rows="3" placeholder="Detalhes, orientações, exigências de documentos pelo fiscal da Energisa, etc." class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-lime-400"></textarea>
                        </div>

                        <!-- Footer -->
                        <div class="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
                            <button type="button" onclick="document.getElementById('modal-novo-protocolo').remove()" class="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-full transition-all">
                                Cancelar
                            </button>
                            <button type="submit" class="px-6 py-2.5 bg-lime-400 hover:bg-lime-300 text-zinc-950 font-extrabold text-xs rounded-full shadow-lg shadow-lime-400/20 transition-all">
                                Registrar Protocolo
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        document.getElementById('form-novo-protocolo')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const clienteId = parseInt(document.getElementById('novo-prot-cliente')?.value || '0');
            const titulo = document.getElementById('novo-prot-titulo')?.value.trim();
            const numero = document.getElementById('novo-prot-numero')?.value.trim();
            const canal = document.getElementById('novo-prot-canal')?.value;
            const categoria = document.getElementById('novo-prot-categoria')?.value;
            const prioridade = document.getElementById('novo-prot-prioridade')?.value;
            const dataAbertura = document.getElementById('novo-prot-abertura')?.value;
            const dataVencimento = document.getElementById('novo-prot-vencimento')?.value || null;
            const alertaAtencao = document.getElementById('novo-prot-atencao')?.checked ? 1 : 0;
            const observacoes = document.getElementById('novo-prot-obs')?.value.trim();

            try {
                await API.createStartupProtocolo({
                    cliente_id: clienteId,
                    titulo: titulo,
                    numero_protocolo: numero,
                    canal: canal,
                    categoria: categoria,
                    prioridade: prioridade,
                    data_abertura: dataAbertura,
                    data_vencimento: dataVencimento,
                    alerta_atencao: alertaAtencao,
                    observacoes: observacoes
                });

                App.showToast('Protocolo registrado com sucesso!', 'success');
                document.getElementById('modal-novo-protocolo')?.remove();
                await load();
            } catch (err) {
                App.showToast(err.message, 'error');
            }
        });
    }

    function addDiasVencimento(dias) {
        const inputVenc = document.getElementById('novo-prot-vencimento') || document.getElementById('edit-prot-vencimento');
        if (!inputVenc) return;
        const hoje = new Date();
        hoje.setDate(hoje.getDate() + dias);
        inputVenc.value = hoje.toISOString().substring(0, 10);
    }

    async function openModalEditar(protocoloId) {
        try {
            const resp = await API.getStartupProtocolo(protocoloId);
            const p = resp.protocolo;
            if (!p) return;

            const existing = document.getElementById('modal-editar-protocolo');
            if (existing) existing.remove();

            const modalHtml = `
                <div id="modal-editar-protocolo" class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
                    <div class="max-w-2xl w-full bg-[#121217] border border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
                        <div class="flex items-center justify-between pb-3 border-b border-white/5">
                            <div class="flex items-center gap-2.5">
                                <div class="w-9 h-9 rounded-2xl bg-amber-400/10 text-amber-400 border border-amber-400/20 flex items-center justify-center text-base">
                                    ✏️
                                </div>
                                <div>
                                    <h4 class="font-extrabold text-sm sm:text-base text-white">Editar Protocolo #${escapeHtml(p.numero_protocolo)}</h4>
                                    <p class="text-[11px] text-zinc-400">Cliente: <strong class="text-white">${escapeHtml(p.cliente_nome)}</strong></p>
                                </div>
                            </div>
                            <button type="button" onclick="document.getElementById('modal-editar-protocolo').remove()" class="text-zinc-400 hover:text-white p-2 rounded-xl hover:bg-white/5 transition-all">
                                ✕
                            </button>
                        </div>

                        <form id="form-editar-protocolo" class="space-y-4">
                            <!-- Cliente -->
                            <div>
                                <label class="block text-xs font-semibold text-zinc-300 mb-1">Cliente Vinculado</label>
                                <select id="edit-prot-cliente" required class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-lime-400">
                                    ${clientesList.map(c => `
                                        <option value="${c.id}" ${p.cliente_id == c.id ? 'selected' : ''}>
                                            ${escapeHtml(c.nome)} (UC: ${escapeHtml(c.numero_uc || 'Sem UC')})
                                        </option>
                                    `).join('')}
                                </select>
                            </div>

                            <!-- Número e Status -->
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label class="block text-xs font-semibold text-zinc-300 mb-1">Número do Protocolo</label>
                                    <input type="text" id="edit-prot-numero" value="${escapeHtml(p.numero_protocolo)}" required class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-lime-400 font-mono font-bold focus:outline-none focus:border-lime-400">
                                </div>
                                <div>
                                    <label class="block text-xs font-semibold text-zinc-300 mb-1">Status do Protocolo</label>
                                    <select id="edit-prot-status" class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-lime-400">
                                        <option value="aberto" ${p.status === 'aberto' ? 'selected' : ''}>Aberto</option>
                                        <option value="em_andamento" ${p.status === 'em_andamento' ? 'selected' : ''}>Em Andamento</option>
                                        <option value="aguardando_cliente" ${p.status === 'aguardando_cliente' ? 'selected' : ''}>Aguardando Cliente</option>
                                        <option value="concluido" ${p.status === 'concluido' ? 'selected' : ''}>✓ Concluído / Resolvido</option>
                                        <option value="cancelado" ${p.status === 'cancelado' ? 'selected' : ''}>Cancelado</option>
                                    </select>
                                </div>
                            </div>

                            <!-- Canal e Prioridade -->
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label class="block text-xs font-semibold text-zinc-300 mb-1">Canal / Órgão</label>
                                    <input type="text" id="edit-prot-canal" value="${escapeHtml(p.canal || 'Energisa')}" class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-lime-400">
                                </div>
                                <div>
                                    <label class="block text-xs font-semibold text-zinc-300 mb-1">Prioridade</label>
                                    <select id="edit-prot-prioridade" class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-lime-400">
                                        <option value="baixa" ${p.prioridade === 'baixa' ? 'selected' : ''}>Baixa</option>
                                        <option value="media" ${p.prioridade === 'media' ? 'selected' : ''}>Média</option>
                                        <option value="alta" ${p.prioridade === 'alta' ? 'selected' : ''}>Alta</option>
                                        <option value="urgente" ${p.prioridade === 'urgente' ? 'selected' : ''}>🚨 Urgente</option>
                                    </select>
                                </div>
                            </div>

                            <!-- Assunto -->
                            <div>
                                <label class="block text-xs font-semibold text-zinc-300 mb-1">Assunto / Descrição Curta *</label>
                                <input type="text" id="edit-prot-titulo" required value="${escapeHtml(p.titulo)}" class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-lime-400">
                            </div>

                            <!-- Prazos -->
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label class="block text-xs font-semibold text-zinc-300 mb-1">Data de Abertura</label>
                                    <input type="date" id="edit-prot-abertura" value="${p.data_abertura || ''}" class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-lime-400">
                                </div>
                                <div>
                                    <label class="block text-xs font-semibold text-zinc-300 mb-1">Data de Vencimento / Prazo</label>
                                    <input type="date" id="edit-prot-vencimento" value="${p.data_vencimento || ''}" class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-lime-400">
                                </div>
                            </div>

                            <!-- Switch Ponto de Atenção -->
                            <div class="p-3.5 rounded-2xl bg-amber-500/[0.06] border border-amber-500/20">
                                <label class="flex items-center gap-2.5 cursor-pointer">
                                    <input type="checkbox" id="edit-prot-atencao" ${parseInt(p.alerta_atencao) === 1 ? 'checked' : ''} class="w-4 h-4 rounded text-amber-400 focus:ring-0 focus:ring-offset-0 bg-zinc-900 border-white/20">
                                    <span class="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                                        <span>⚠️</span> Ponto de Atenção com este Cliente
                                    </span>
                                </label>
                            </div>

                            <!-- Observações -->
                            <div>
                                <label class="block text-xs font-semibold text-zinc-300 mb-1">Observações / Ponto de Atenção</label>
                                <textarea id="edit-prot-obs" rows="3" class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-lime-400">${escapeHtml(p.observacoes || '')}</textarea>
                            </div>

                            <!-- Footer -->
                            <div class="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
                                <button type="button" onclick="document.getElementById('modal-editar-protocolo').remove()" class="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-full transition-all">
                                    Cancelar
                                </button>
                                <button type="submit" class="px-6 py-2.5 bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs rounded-full shadow-lg shadow-amber-400/20 transition-all">
                                    Atualizar Protocolo
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHtml);

            document.getElementById('form-editar-protocolo')?.addEventListener('submit', async (e) => {
                e.preventDefault();
                const clienteId = parseInt(document.getElementById('edit-prot-cliente')?.value || '0');
                const titulo = document.getElementById('edit-prot-titulo')?.value.trim();
                const numero = document.getElementById('edit-prot-numero')?.value.trim();
                const canal = document.getElementById('edit-prot-canal')?.value.trim();
                const status = document.getElementById('edit-prot-status')?.value;
                const prioridade = document.getElementById('edit-prot-prioridade')?.value;
                const dataAbertura = document.getElementById('edit-prot-abertura')?.value;
                const dataVencimento = document.getElementById('edit-prot-vencimento')?.value || null;
                const alertaAtencao = document.getElementById('edit-prot-atencao')?.checked ? 1 : 0;
                const observacoes = document.getElementById('edit-prot-obs')?.value.trim();

                try {
                    await API.updateStartupProtocolo(protocoloId, {
                        cliente_id: clienteId,
                        titulo: titulo,
                        numero_protocolo: numero,
                        canal: canal,
                        status: status,
                        prioridade: prioridade,
                        data_abertura: dataAbertura,
                        data_vencimento: dataVencimento,
                        alerta_atencao: alertaAtencao,
                        observacoes: observacoes
                    });

                    App.showToast('Protocolo atualizado!', 'success');
                    document.getElementById('modal-editar-protocolo')?.remove();
                    await load();
                } catch (err) {
                    App.showToast(err.message, 'error');
                }
            });
        } catch (err) {
            App.showToast(err.message, 'error');
        }
    }

    async function openModalAndamentos(protocoloId) {
        try {
            const resp = await API.getStartupProtocolo(protocoloId);
            const p = resp.protocolo;
            if (!p) return;

            const existing = document.getElementById('modal-andamentos-protocolo');
            if (existing) existing.remove();

            const historico = Array.isArray(p.historico_andamentos) ? p.historico_andamentos : [];

            let timelineHtml = '';
            if (historico.length === 0) {
                timelineHtml = `
                    <div class="py-6 text-center text-xs text-zinc-500">
                        Nenhum andamento ou nota registrada ainda.
                    </div>
                `;
            } else {
                timelineHtml = `
                    <div class="space-y-3 relative pl-4 border-l border-white/10 my-2">
                        ${historico.map(h => `
                            <div class="relative group">
                                <div class="w-2.5 h-2.5 rounded-full bg-lime-400 absolute -left-[21px] top-1.5 ring-4 ring-[#121217]"></div>
                                <div class="p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                                    <div class="flex items-center justify-between text-[10px] text-zinc-500">
                                        <span class="font-bold text-zinc-400">${escapeHtml(h.autor || 'Comandante')}</span>
                                        <span class="font-mono">${formatarDataHora(h.data)}</span>
                                    </div>
                                    <p class="text-xs text-zinc-200 leading-relaxed whitespace-pre-line">${escapeHtml(h.descricao)}</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            }

            const modalHtml = `
                <div id="modal-andamentos-protocolo" class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
                    <div class="max-w-xl w-full bg-[#121217] border border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] flex flex-col">
                        <div class="flex items-center justify-between pb-3 border-b border-white/5 shrink-0">
                            <div>
                                <h4 class="font-extrabold text-sm sm:text-base text-white flex items-center gap-2">
                                    <span>Histórico de Andamentos</span>
                                    <span class="text-xs text-lime-400 font-mono">#${escapeHtml(p.numero_protocolo)}</span>
                                </h4>
                                <p class="text-[11px] text-zinc-400">${escapeHtml(p.cliente_nome)} • ${escapeHtml(p.titulo)}</p>
                            </div>
                            <button type="button" onclick="document.getElementById('modal-andamentos-protocolo').remove()" class="text-zinc-400 hover:text-white p-2 rounded-xl hover:bg-white/5 transition-all">
                                ✕
                            </button>
                        </div>

                        <!-- Timeline com Scroll -->
                        <div class="overflow-y-auto flex-1 pr-1">
                            ${timelineHtml}
                        </div>

                        <!-- Formulário para Novo Andamento -->
                        <form id="form-novo-andamento" class="pt-3 border-t border-white/5 space-y-2 shrink-0">
                            <label class="block text-xs font-semibold text-zinc-300">Registrar Novo Andamento / Acompanhamento</label>
                            <textarea id="novo-andamento-texto" rows="2" required placeholder="Ex: Protocolo aceito pela Energisa. Prazo informado de 10 dias úteis para vistoria técnica..." class="w-full px-3.5 py-2 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-lime-400"></textarea>
                            <div class="flex items-center justify-end gap-2">
                                <button type="button" onclick="document.getElementById('modal-andamentos-protocolo').remove()" class="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs rounded-full transition-all">
                                    Fechar
                                </button>
                                <button type="submit" class="px-5 py-2 bg-lime-400 hover:bg-lime-300 text-zinc-950 font-bold text-xs rounded-full shadow-lg transition-all">
                                    + Adicionar Andamento
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHtml);

            document.getElementById('form-novo-andamento')?.addEventListener('submit', async (e) => {
                e.preventDefault();
                const texto = document.getElementById('novo-andamento-texto')?.value.trim();
                if (!texto) return;

                try {
                    await API.addStartupProtocoloAndamento(protocoloId, { descricao: texto });
                    App.showToast('Andamento adicionado!', 'success');
                    document.getElementById('modal-andamentos-protocolo')?.remove();
                    await load();
                    openModalAndamentos(protocoloId);
                } catch (err) {
                    App.showToast(err.message, 'error');
                }
            });
        } catch (err) {
            App.showToast(err.message, 'error');
        }
    }

    async function mudarStatusRapido(protocoloId, novoStatus) {
        try {
            await API.updateStartupProtocoloStatus(protocoloId, novoStatus);
            App.showToast(`Status atualizado para '${novoStatus}'`, 'success');
            await load();
        } catch (err) {
            App.showToast(err.message, 'error');
        }
    }

    async function excluirProtocolo(protocoloId, numero) {
        if (!confirm(`Tem certeza que deseja excluir o protocolo #${numero}?`)) {
            return;
        }

        try {
            await API.deleteStartupProtocolo(protocoloId);
            App.showToast('Protocolo excluído com sucesso.', 'info');
            await load();
        } catch (err) {
            App.showToast(err.message, 'error');
        }
    }

    function formatarCategoria(cat) {
        const map = {
            'troca_titularidade': 'Troca de Titularidade',
            'compensacao_creditos': 'Compensação GD',
            'contestacao_fatura': 'Contestação de Fatura',
            'vistoria_medicao': 'Vistoria / Medição',
            'solicitacao_acesso': 'Acesso GD',
            'ligacao_nova': 'Ligação Nova',
            'revisao_tarifa': 'Revisão Tarifária',
            'geral': 'Atendimento Geral'
        };
        return map[cat] || cat;
    }

    function formatarData(dataIso) {
        if (!dataIso) return '-';
        const [ano, mes, dia] = dataIso.split('-');
        return `${dia}/${mes}/${ano}`;
    }

    function formatarDataHora(dataHoraIso) {
        if (!dataHoraIso) return '-';
        const [data, hora] = dataHoraIso.split(' ');
        const [ano, mes, dia] = data.split('-');
        return `${dia}/${mes}/${ano} ${hora ? hora.substring(0, 5) : ''}`;
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
        openModalNovo,
        openModalEditar,
        openModalAndamentos,
        mudarStatusRapido,
        excluirProtocolo,
        addDiasVencimento,
        setFiltroStatus,
        setFiltroAtencao,
        setFiltroVencimento,
        limparFiltros
    };
})();
