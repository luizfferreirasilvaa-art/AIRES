/**
 * AIRES - Módulo Startup: Estoque de Créditos & Supervisão da Usina Central
 * Obsidian Dark Glassmorphism
 */

const StartupCreditos = (() => {
    let creditosList = [];
    let resumoData = {
        total_gerado: 0,
        total_distribuido: 0,
        total_saldo: 0,
        total_meses: 0,
        media_geracao: 0,
        total_clientes_ativos: 0,
        total_propriedades: 0,
        tarifa_media: 0.95,
        valor_estimado_sobra: 0,
        taxa_retencao_usina: 0,
        taxa_distribuicao: 0
    };
    let clientesList = [];

    function init() {
        // Eventos vinculados dinamicamente
    }

    async function load() {
        const container = document.getElementById('startup-creditos-container');
        if (!container) return;

        container.innerHTML = `
            <div class="py-12 flex flex-col items-center justify-center text-zinc-500">
                <div class="w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full animate-spin mb-3"></div>
                <p class="text-xs font-semibold">Carregando balanço energético e sobra da usina central...</p>
            </div>
        `;

        try {
            const [respCred, respCli] = await Promise.all([
                API.getStartupCreditos(),
                API.getStartupClientes({ status: 'ativo' })
            ]);

            creditosList = (respCred && respCred.creditos) || [];
            resumoData = (respCred && respCred.resumo) || {
                total_gerado: 0,
                total_distribuido: 0,
                total_saldo: 0,
                total_meses: 0,
                media_geracao: 0,
                total_clientes_ativos: 0,
                total_propriedades: 0,
                tarifa_media: 0.95,
                valor_estimado_sobra: 0,
                taxa_retencao_usina: 0,
                taxa_distribuicao: 0
            };
            clientesList = (respCli && respCli.clientes) || [];

            render();
        } catch (err) {
            container.innerHTML = `
                <div class="glass-card rounded-3xl p-6 text-center text-red-400">
                    <p class="text-xs font-bold">Erro ao carregar estoque de créditos: ${escapeHtml(err.message)}</p>
                </div>
            `;
        }
    }

    function render() {
        const container = document.getElementById('startup-creditos-container');
        if (!container) return;

        const totalGerado = parseFloat(resumoData.total_gerado || 0);
        const totalDist = parseFloat(resumoData.total_distribuido || 0);
        const totalSaldo = parseFloat(resumoData.total_saldo || Math.max(0, totalGerado - totalDist));
        const tarifaMedia = parseFloat(resumoData.tarifa_media || 0.95) || 0.95;
        const valorEstimadoSobra = parseFloat(resumoData.valor_estimado_sobra || (totalSaldo * tarifaMedia));
        const taxaRetencao = parseFloat(resumoData.taxa_retencao_usina || (totalGerado > 0 ? (totalSaldo / totalGerado) * 100 : 0)).toFixed(1);
        const taxaDist = parseFloat(resumoData.taxa_distribuicao || (totalGerado > 0 ? (totalDist / totalGerado) * 100 : 0)).toFixed(1);
        const totalClientesAtivos = parseInt(resumoData.total_clientes_ativos || clientesList.length || 0);
        const totalPropriedades = parseInt(resumoData.total_propriedades || clientesList.reduce((acc, c) => acc + (parseInt(c.qtd_propriedades) || 1), 0));
        const totalMeses = parseInt(resumoData.total_meses || creditosList.length || 0);
        const mediaGeracao = parseFloat(resumoData.media_geracao || (totalMeses > 0 ? totalGerado / totalMeses : 0));

        let html = `
            <!-- ========================================================
                 HERO CARD: SOBRA NA USINA CENTRAL (UC GERADORA)
                 ======================================================== -->
            <div class="glass-card rounded-3xl p-5 md:p-7 relative overflow-hidden border border-lime-400/20 bg-gradient-to-br from-[#0c130e] via-[#0d1117] to-[#0a0a0c] shadow-2xl">
                <!-- Ambient glow decorativo -->
                <div class="absolute -right-16 -top-16 w-56 h-56 bg-lime-400/10 rounded-full blur-3xl pointer-events-none"></div>
                <div class="absolute -left-16 -bottom-16 w-56 h-56 bg-cyan-400/5 rounded-full blur-3xl pointer-events-none"></div>

                <div class="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div class="space-y-3">
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase bg-lime-400/10 text-lime-400 border border-lime-400/30">
                                <span class="w-2 h-2 rounded-full bg-lime-400 animate-pulse"></span>
                                Usina Central • UC Geradora
                            </span>
                            ${totalSaldo > 0 ? `
                                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                                    Superávit Ativo (${taxaRetencao}% retido)
                                </span>
                            ` : `
                                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                                    100% Rateado na Rede
                                </span>
                            `}
                        </div>

                        <div>
                            <span class="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Sobra Atual na Usina Central</span>
                            <div class="flex items-baseline gap-2 flex-wrap mt-0.5">
                                <h2 class="text-3xl sm:text-4xl lg:text-5xl font-black text-lime-400 tracking-tight font-mono">
                                    ${totalSaldo.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
                                </h2>
                                <span class="text-lg font-bold text-zinc-300">kWh</span>
                                <span class="text-xs text-zinc-400 font-normal">disponíveis na concessionária</span>
                            </div>
                        </div>

                        <p class="text-xs text-zinc-400 max-w-xl leading-relaxed">
                            Créditos de energia solar injetados pela UC geradora que não foram alocados para clientes. Estão acumulados na rede como reserva técnica, prontos para novas UCs ou compensação futura.
                        </p>

                        <div class="flex items-center gap-2 flex-wrap pt-1">
                            <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs">
                                <span class="text-zinc-400">Valor Estimado da Reserva:</span>
                                <span class="font-extrabold text-white font-mono">R$ ${valorEstimadoSobra.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                <span class="text-[10px] text-zinc-500">(tarifa: R$ ${tarifaMedia.toFixed(2)}/kWh)</span>
                            </div>
                            <div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-zinc-400">
                                <span>Retenção Usina:</span>
                                <strong class="text-lime-300 font-mono">${taxaRetencao}%</strong>
                            </div>
                        </div>
                    </div>

                    <!-- Botões de Ação Rápida -->
                    <div class="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0 justify-end">
                        <button type="button" onclick="StartupCreditos.openModalNovoMes()" class="px-5 py-3 rounded-2xl bg-lime-400 hover:bg-lime-300 text-zinc-950 font-extrabold text-xs shadow-lg shadow-lime-400/20 transition-all flex items-center justify-center gap-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                            <span>+ Registrar Produção Mensal</span>
                        </button>
                        ${creditosList.length > 0 ? `
                            <button type="button" onclick="StartupCreditos.openModalAlocacao(${creditosList[0].id})" class="px-5 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs border border-white/10 transition-all flex items-center justify-center gap-2">
                                <svg class="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path></svg>
                                <span>Ajustar Rateio do Mês</span>
                            </button>
                        ` : ''}
                    </div>
                </div>

                <!-- Barra Visual Proporcional de Balanço Energético da Usina -->
                <div class="mt-6 pt-5 border-t border-white/5 space-y-2">
                    <div class="flex items-center justify-between text-xs font-semibold flex-wrap gap-2">
                        <span class="text-zinc-400 flex items-center gap-1.5">
                            <span class="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block"></span>
                            Distribuído aos Clientes: <strong class="text-cyan-300 font-mono">${totalDist.toLocaleString('pt-BR')} kWh (${taxaDist}%)</strong>
                        </span>
                        <span class="text-zinc-400 flex items-center gap-1.5">
                            <span class="w-2.5 h-2.5 rounded-full bg-lime-400 inline-block"></span>
                            Sobra na Usina Central: <strong class="text-lime-300 font-mono">${totalSaldo.toLocaleString('pt-BR')} kWh (${taxaRetencao}%)</strong>
                        </span>
                    </div>
                    <div class="w-full h-3 rounded-full bg-zinc-900 border border-white/5 overflow-hidden flex">
                        <div class="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-500" style="width: ${Math.min(100, Math.max(0, taxaDist))}%" title="Distribuído: ${totalDist.toLocaleString('pt-BR')} kWh (${taxaDist}%)"></div>
                        <div class="h-full bg-gradient-to-r from-lime-400 to-emerald-300 transition-all duration-500" style="width: ${Math.min(100, Math.max(0, taxaRetencao))}%" title="Sobra Usina: ${totalSaldo.toLocaleString('pt-BR')} kWh (${taxaRetencao}%)"></div>
                    </div>
                </div>
            </div>

            <!-- ========================================================
                 GRID DE 4 INDICADORES TÉCNICOS & GERENCIAIS
                 ======================================================== -->
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <!-- Card 1: Total Produção Usina -->
                <div class="glass-card rounded-2xl p-4 space-y-1 border border-white/5 bg-white/[0.02]">
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Produção Solar Usina</span>
                        <span class="text-cyan-400 text-sm">⚡</span>
                    </div>
                    <p class="text-xl sm:text-2xl font-black text-white font-mono">${totalGerado.toLocaleString('pt-BR')} <span class="text-xs font-semibold text-zinc-400">kWh</span></p>
                    <p class="text-[10px] text-zinc-500 truncate">Média: ${mediaGeracao.toLocaleString('pt-BR', {maximumFractionDigits: 1})} kWh/mês</p>
                </div>

                <!-- Card 2: Créditos Rateados -->
                <div class="glass-card rounded-2xl p-4 space-y-1 border border-white/5 bg-white/[0.02]">
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Total Distribuído</span>
                        <span class="text-emerald-400 text-sm">🔄</span>
                    </div>
                    <p class="text-xl sm:text-2xl font-black text-emerald-400 font-mono">${totalDist.toLocaleString('pt-BR')} <span class="text-xs font-semibold text-zinc-400">kWh</span></p>
                    <p class="text-[10px] text-zinc-500 truncate">${taxaDist}% da capacidade entregue</p>
                </div>

                <!-- Card 3: Sobra Usina Central -->
                <div class="glass-card rounded-2xl p-4 space-y-1 border border-lime-400/20 bg-lime-400/[0.03]">
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] text-lime-400 uppercase font-bold tracking-wider">Sobra na Usina</span>
                        <span class="text-lime-400 text-sm">🏭</span>
                    </div>
                    <p class="text-xl sm:text-2xl font-black text-lime-400 font-mono">${totalSaldo.toLocaleString('pt-BR')} <span class="text-xs font-semibold text-lime-400/70">kWh</span></p>
                    <p class="text-[10px] text-lime-400/80 truncate">${taxaRetencao}% retido na geradora</p>
                </div>

                <!-- Card 4: Carteira & Capacidade -->
                <div class="glass-card rounded-2xl p-4 space-y-1 border border-white/5 bg-white/[0.02]">
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Carteira Ativa</span>
                        <span class="text-amber-400 text-sm">👥</span>
                    </div>
                    <p class="text-xl sm:text-2xl font-black text-amber-400 font-mono">${totalClientesAtivos} <span class="text-xs font-semibold text-zinc-400">clientes</span></p>
                    <p class="text-[10px] text-zinc-500 truncate">${totalPropriedades} propriedades atendidas</p>
                </div>
            </div>
        `;

        if (creditosList.length === 0) {
            html += `
                <div class="glass-card rounded-3xl p-12 text-center text-zinc-500 space-y-3">
                    <div class="w-12 h-12 mx-auto rounded-2xl bg-lime-400/10 text-lime-400 border border-lime-400/20 flex items-center justify-center text-xl">📊</div>
                    <p class="text-sm font-bold text-white">Nenhum mês de produção registrado</p>
                    <p class="text-xs max-w-sm mx-auto">Lance a geração mensal da usina fotovoltaica para distribuir e acompanhar a duração do estoque dos clientes e a sobra da usina.</p>
                    <button type="button" onclick="StartupCreditos.openModalNovoMes()" class="px-5 py-2.5 bg-lime-400 hover:bg-lime-300 text-zinc-950 font-extrabold text-xs rounded-full shadow-lg transition-all">
                        + Registrar Primeiro Mês
                    </button>
                </div>
            `;
            container.innerHTML = html;
            return;
        }

        // Tabela/Lista de Meses com Expansão de Alocações
        html += `
            <div class="glass-card rounded-3xl p-4 md:p-6 space-y-4">
                <div class="flex items-center justify-between flex-wrap gap-2">
                    <div>
                        <h4 class="font-extrabold text-sm text-white flex items-center gap-2">
                            <span>Histórico Mensal & Rateio da Usina</span>
                        </h4>
                        <p class="text-xs text-zinc-400">Clique no mês para expandir o estoque individual por cliente e conferir a sobra retida na usina central.</p>
                    </div>
                </div>

                <div class="space-y-3" id="lista-meses-creditos">
        `;

        creditosList.forEach((cred, idx) => {
            const isFirst = idx === 0;
            const gerados = parseFloat(cred.creditos_gerados_kwh || 0);
            const dist = parseFloat(cred.creditos_distribuidos_kwh || 0);
            const saldo = parseFloat(cred.saldo_kwh || Math.max(0, gerados - dist));
            const pctDist = gerados > 0 ? ((dist / gerados) * 100).toFixed(0) : 0;
            const pctSobra = gerados > 0 ? ((saldo / gerados) * 100).toFixed(0) : 0;

            html += `
                <div class="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden transition-all">
                    <!-- Linha do Mês (Header Acordeom Responsivo) -->
                    <div class="p-3.5 md:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer hover:bg-white/[0.04] transition-colors" onclick="StartupCreditos.toggleMes(${cred.id})">
                        <!-- Identificação do Mês -->
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-2xl bg-lime-400/10 text-lime-400 border border-lime-400/20 flex items-center justify-center font-bold font-mono text-sm shrink-0">
                                ${cred.mes_referencia.substring(5, 7)}
                            </div>
                            <div>
                                <h5 class="font-extrabold text-sm text-white flex items-center gap-2 flex-wrap">
                                    <span>${formatarMesNome(cred.mes_referencia)}</span>
                                    <span class="text-[10px] text-zinc-500 font-mono">(${cred.mes_referencia})</span>
                                    ${saldo > 0 ? `
                                        <span class="px-2 py-0.5 rounded-full bg-lime-400/10 text-lime-400 border border-lime-400/20 text-[9px] font-bold">
                                            Sobra: ${pctSobra}%
                                        </span>
                                    ` : `
                                        <span class="px-2 py-0.5 rounded-full bg-cyan-400/10 text-cyan-400 border border-cyan-400/20 text-[9px] font-bold">
                                            100% Rateado
                                        </span>
                                    `}
                                </h5>
                                <p class="text-[11px] text-zinc-400">${cred.total_clientes_alocados || 0} clientes atendidos</p>
                            </div>
                        </div>

                        <!-- Métricas do Mês & Botões -->
                        <div class="flex items-center justify-between md:justify-end gap-3 sm:gap-4 text-xs font-mono border-t md:border-t-0 border-white/5 pt-2 md:pt-0">
                            <div class="text-left md:text-right">
                                <span class="text-[9px] text-zinc-500 uppercase block font-sans">⚡ Gerado Usina</span>
                                <span class="text-cyan-300 font-bold">${gerados.toLocaleString('pt-BR')} kWh</span>
                            </div>
                            <div class="text-left md:text-right">
                                <span class="text-[9px] text-zinc-500 uppercase block font-sans">🔄 Distribuído</span>
                                <span class="text-emerald-400 font-bold">${dist.toLocaleString('pt-BR')} kWh</span>
                            </div>
                            <div class="text-left md:text-right">
                                <span class="text-[9px] text-lime-400 uppercase block font-sans font-extrabold">🏭 Sobra Usina</span>
                                <span class="text-lime-400 font-black">${saldo.toLocaleString('pt-BR')} kWh</span>
                            </div>

                            <div class="flex items-center gap-1 pl-2 border-l border-white/10" onclick="event.stopPropagation()">
                                <button type="button" onclick="StartupCreditos.openModalEditarMes(${cred.id})" class="p-2 text-zinc-400 hover:text-amber-400 rounded-xl hover:bg-amber-400/10 transition-all" title="Editar Produção do Mês">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                                </button>
                                <button type="button" onclick="StartupCreditos.deleteMes(${cred.id}, '${escapeHtml(cred.mes_referencia)}')" class="p-2 text-zinc-500 hover:text-red-400 rounded-xl hover:bg-red-500/10 transition-all" title="Excluir Mês">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                </button>
                            </div>
                            <button type="button" class="p-2 text-zinc-400 hover:text-white transition-transform ${isFirst ? 'rotate-180' : ''}" id="chevron-mes-${cred.id}">
                                ▼
                            </button>
                        </div>
                    </div>

                    <!-- Container de Alocações por Cliente -->
                    <div id="alocacoes-container-${cred.id}" class="${isFirst ? '' : 'hidden'} border-t border-white/5 p-3.5 md:p-4 bg-black/40">
                        <div class="py-4 text-center text-xs text-zinc-500" id="alocacoes-loading-${cred.id}">
                            Carregando clientes...
                        </div>
                    </div>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;

        container.innerHTML = html;

        // Se houver meses, carrega automaticamente o primeiro
        if (creditosList.length > 0) {
            carregarAlocacoesDoMes(creditosList[0].id);
        }
    }

    async function toggleMes(creditoId) {
        const container = document.getElementById(`alocacoes-container-${creditoId}`);
        const chevron = document.getElementById(`chevron-mes-${creditoId}`);
        if (!container) return;

        const isHidden = container.classList.contains('hidden');
        if (isHidden) {
            container.classList.remove('hidden');
            chevron?.classList.add('rotate-180');
            carregarAlocacoesDoMes(creditoId);
        } else {
            container.classList.add('hidden');
            chevron?.classList.remove('rotate-180');
        }
    }

    async function carregarAlocacoesDoMes(creditoId) {
        const container = document.getElementById(`alocacoes-container-${creditoId}`);
        if (!container) return;

        try {
            const resp = await API.getStartupCreditoAlocacoes(creditoId);
            const alocacoes = (resp && resp.alocacoes) || [];

            if (alocacoes.length === 0) {
                container.innerHTML = `
                    <div class="py-5 text-center text-xs text-zinc-400 space-y-2">
                        <p>Nenhum rateio registrado para este mês.</p>
                        <button type="button" onclick="StartupCreditos.openModalAlocacao(${creditoId})" class="px-4 py-1.5 rounded-full bg-lime-400 hover:bg-lime-300 text-zinc-950 font-extrabold text-xs shadow-md transition-all">
                            ⚙️ Realizar Rateio dos Clientes
                        </button>
                    </div>
                `;
                return;
            }

            let cardsHtml = '';
            let tableRowsHtml = '';

            alocacoes.forEach(a => {
                const aloc = parseFloat(a.creditos_alocados_kwh || 0);
                const cons = parseFloat(a.creditos_consumidos_kwh || 0);
                const saldo = parseFloat(a.saldo_acumulado_kwh || 0);
                const previsaoMeses = parseFloat(a.previsao_meses || 0);
                const statusEstoque = a.status_estoque || (a.alerta_estoque_baixo ? 'baixo' : 'saudavel');

                // Badge inteligente
                let badgeHtml = '';
                let previsaoLabel = '';

                if (statusEstoque === 'aguardando') {
                    badgeHtml = `<span class="px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-white/5 text-[9px] font-bold">⚪ Aguardando Rateio</span>`;
                    previsaoLabel = `<span class="text-zinc-500 font-sans text-[10px]">Sem histórico</span>`;
                } else if (statusEstoque === 'reservado') {
                    badgeHtml = `<span class="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[9px] font-bold">📦 Crédito Reservado</span>`;
                    previsaoLabel = `<span class="text-cyan-400 font-sans text-[10px]">Intacto</span>`;
                } else if (statusEstoque === 'zerado') {
                    badgeHtml = `<span class="px-2.5 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-[9px] font-extrabold uppercase animate-pulse">🔴 Sem Estoque</span>`;
                    previsaoLabel = `<span class="text-red-400 font-bold font-sans text-[10px]">Esgotado</span>`;
                } else if (statusEstoque === 'baixo') {
                    badgeHtml = `<span class="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[9px] font-extrabold uppercase">⚠️ Estoque Baixo (< 1m)</span>`;
                    previsaoLabel = `<span class="text-amber-400 font-bold font-sans text-[10px]">~${previsaoMeses} m</span>`;
                } else {
                    badgeHtml = `<span class="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-bold">✓ Saudável</span>`;
                    previsaoLabel = `<span class="text-emerald-400 font-sans text-[10px]">${previsaoMeses >= 90 ? '>3 anos' : `~${previsaoMeses} m`}</span>`;
                }

                // Card para mobile
                cardsHtml += `
                    <div class="rounded-xl border border-white/5 bg-white/[0.02] p-3 space-y-2">
                        <div class="flex items-start justify-between gap-2">
                            <div class="min-w-0">
                                <h6 class="font-bold text-xs text-white truncate">${escapeHtml(a.cliente_nome)}</h6>
                                <span class="text-[10px] font-mono text-zinc-500">UC: ${escapeHtml(a.numero_uc || 'Sem UC')} • ${a.qtd_propriedades || 1} un</span>
                            </div>
                            <div>
                                ${badgeHtml}
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-2 p-2 rounded-lg bg-black/40 border border-white/5 text-xs font-mono">
                            <div>
                                <span class="text-[9px] text-zinc-500 uppercase block font-sans">Alocado / Consumido</span>
                                <span class="text-cyan-300 font-semibold">${aloc.toLocaleString('pt-BR')} kWh</span>
                                <span class="text-zinc-500 block text-[10px]">Cons: ${cons.toLocaleString('pt-BR')} kWh</span>
                            </div>
                            <div>
                                <span class="text-[9px] text-zinc-500 uppercase block font-sans">Estoque / Previsão</span>
                                <span class="text-lime-400 font-bold">${saldo.toLocaleString('pt-BR')} kWh</span>
                                <span class="block text-[10px]">${previsaoLabel}</span>
                            </div>
                        </div>
                    </div>
                `;

                // Linha da tabela para desktop
                tableRowsHtml += `
                    <tr class="hover:bg-white/[0.02] transition-colors">
                        <td class="py-2.5 px-3 font-bold text-white whitespace-nowrap">
                            <div>${escapeHtml(a.cliente_nome)}</div>
                            <span class="text-[9px] font-mono text-zinc-500">${escapeHtml(a.numero_uc || '')}</span>
                        </td>
                        <td class="py-2.5 px-3 text-amber-400 font-bold whitespace-nowrap">${a.qtd_propriedades || 1} un</td>
                        <td class="py-2.5 px-3 font-mono text-cyan-300 whitespace-nowrap">${aloc.toLocaleString('pt-BR')} kWh</td>
                        <td class="py-2.5 px-3 font-mono text-zinc-400 whitespace-nowrap">${cons.toLocaleString('pt-BR')} kWh</td>
                        <td class="py-2.5 px-3 font-mono font-bold text-lime-400 whitespace-nowrap">${saldo.toLocaleString('pt-BR')} kWh</td>
                        <td class="py-2.5 px-3 whitespace-nowrap font-mono">
                            ${previsaoLabel}
                        </td>
                        <td class="py-2.5 px-3 text-right whitespace-nowrap">
                            ${badgeHtml}
                        </td>
                    </tr>
                `;
            });

            let html = `
                <div class="flex items-center justify-between pb-3 mb-2 flex-wrap gap-2">
                    <span class="text-[11px] font-bold text-zinc-300 flex items-center gap-1.5">
                        <span>Rateio por Cliente</span>
                        <span class="text-zinc-500 font-normal">(${alocacoes.length} clientes na carteira)</span>
                    </span>
                    <button type="button" onclick="StartupCreditos.openModalAlocacao(${creditoId})" class="px-3.5 py-1.5 rounded-full bg-lime-400/10 hover:bg-lime-400/20 text-lime-400 border border-lime-400/30 text-xs font-bold transition-all flex items-center gap-1">
                        <span>⚙️ Ajustar Rateio do Mês</span>
                    </button>
                </div>

                <!-- Visão Mobile: Cards -->
                <div class="block lg:hidden space-y-2.5">
                    ${cardsHtml}
                </div>

                <!-- Visão Desktop: Tabela -->
                <div class="hidden lg:block overflow-x-auto pb-1">
                    <table class="w-full text-left text-xs min-w-[780px]">
                        <thead>
                            <tr class="text-zinc-500 text-[10px] uppercase border-b border-white/5 pb-2">
                                <th class="pb-2 px-3 font-bold whitespace-nowrap">Cliente</th>
                                <th class="pb-2 px-3 font-bold whitespace-nowrap">Propriedades</th>
                                <th class="pb-2 px-3 font-bold whitespace-nowrap">Alocado (kWh)</th>
                                <th class="pb-2 px-3 font-bold whitespace-nowrap">Consumido (kWh)</th>
                                <th class="pb-2 px-3 font-bold whitespace-nowrap">Estoque (kWh)</th>
                                <th class="pb-2 px-3 font-bold whitespace-nowrap">Autonomia</th>
                                <th class="pb-2 px-3 text-right font-bold whitespace-nowrap">Status</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-white/5">
                            ${tableRowsHtml}
                        </tbody>
                    </table>
                </div>
            `;

            container.innerHTML = html;
        } catch (err) {
            container.innerHTML = `
                <div class="py-4 text-center text-xs text-red-400">
                    Erro ao carregar rateio do mês: ${escapeHtml(err.message)}
                </div>
            `;
        }
    }

    function openModalNovoMes() {
        const existing = document.getElementById('modal-novo-mes-credito');
        if (existing) existing.remove();

        const mesAtual = new Date().toISOString().substring(0, 7);

        const modalHtml = `
            <div id="modal-novo-mes-credito" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                <div class="max-w-md w-full bg-[#121217] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-5">
                    <div class="flex items-center justify-between pb-3 border-b border-white/5">
                        <div class="flex items-center gap-2.5">
                            <div class="w-9 h-9 rounded-2xl bg-lime-400/10 text-lime-400 border border-lime-400/20 flex items-center justify-center text-base">
                                ⚡
                            </div>
                            <div>
                                <h4 class="font-extrabold text-sm text-white">Registrar Produção da Usina</h4>
                                <p class="text-[11px] text-zinc-400">Novo mês de geração solar fotovoltaica</p>
                            </div>
                        </div>
                        <button type="button" onclick="document.getElementById('modal-novo-mes-credito').remove()" class="text-zinc-400 hover:text-white p-2 rounded-xl hover:bg-white/5 transition-all">
                            ✕
                        </button>
                    </div>

                    <form id="form-novo-mes-credito" class="space-y-4">
                        <div>
                            <label class="block text-xs font-semibold text-zinc-300 mb-1">Mês de Referência *</label>
                            <input type="month" id="novo-cred-mes" required value="${mesAtual}" class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-lime-400">
                        </div>

                        <div>
                            <label class="block text-xs font-semibold text-zinc-300 mb-1">Créditos Gerados na Usina Central (kWh) *</label>
                            <input type="number" step="0.01" min="1" id="novo-cred-gerados" placeholder="Ex: 3500.00" required class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-lime-400 font-mono font-bold focus:outline-none focus:border-lime-400">
                            <p class="text-[10px] text-zinc-500 mt-1">Total de energia gerada e injetada na concessionária no mês.</p>
                        </div>

                        <div>
                            <label class="block text-xs font-semibold text-zinc-300 mb-1">Observações da Operação</label>
                            <textarea id="novo-cred-obs" rows="2" placeholder="Notas sobre insolação, manutenção da usina, etc." class="w-full px-3.5 py-2 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-lime-400"></textarea>
                        </div>

                        <div class="flex items-center justify-end gap-3 pt-2">
                            <button type="button" onclick="document.getElementById('modal-novo-mes-credito').remove()" class="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-full transition-all">
                                Cancelar
                            </button>
                            <button type="submit" class="px-6 py-2.5 bg-lime-400 hover:bg-lime-300 text-zinc-950 font-extrabold text-xs rounded-full shadow-lg shadow-lime-400/20 transition-all">
                                Salvar Produção
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        document.getElementById('form-novo-mes-credito')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const mes = document.getElementById('novo-cred-mes')?.value;
            const gerados = parseFloat(document.getElementById('novo-cred-gerados')?.value || '0');
            const obs = document.getElementById('novo-cred-obs')?.value.trim();

            try {
                const resp = await API.createStartupCredito({
                    mes_referencia: mes,
                    creditos_gerados_kwh: gerados,
                    observacoes: obs
                });
                App.showToast('Produção mensal registrada!', 'success');
                document.getElementById('modal-novo-mes-credito')?.remove();
                await load();
                if (resp && resp.dados && resp.dados.id) {
                    openModalAlocacao(resp.dados.id);
                }
            } catch (err) {
                App.showToast(err.message, 'error');
            }
        });
    }

    async function openModalEditarMes(creditoId) {
        try {
            const resp = await API.getStartupCredito(creditoId);
            const cred = resp.credito;
            if (!cred) return;

            const existing = document.getElementById('modal-editar-mes-credito');
            if (existing) existing.remove();

            const geradosInit = parseFloat(cred.creditos_gerados_kwh || 0);
            const distInit = parseFloat(cred.creditos_distribuidos_kwh || 0);
            const sobraInit = Math.max(0, geradosInit - distInit);

            const modalHtml = `
                <div id="modal-editar-mes-credito" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div class="max-w-md w-full bg-[#121217] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-5">
                        <div class="flex items-center justify-between pb-3 border-b border-white/5">
                            <div class="flex items-center gap-2.5">
                                <div class="w-9 h-9 rounded-2xl bg-amber-400/10 text-amber-400 border border-amber-400/20 flex items-center justify-center text-base">
                                    ✏️
                                </div>
                                <div>
                                    <h4 class="font-extrabold text-sm text-white">Editar Produção do Mês</h4>
                                    <p class="text-[11px] text-zinc-400">${formatarMesNome(cred.mes_referencia)} (${cred.mes_referencia})</p>
                                </div>
                            </div>
                            <button type="button" onclick="document.getElementById('modal-editar-mes-credito').remove()" class="text-zinc-400 hover:text-white p-2 rounded-xl hover:bg-white/5 transition-all">
                                ✕
                            </button>
                        </div>

                        <!-- Balanço da Usina Central em tempo real -->
                        <div class="p-3 rounded-2xl bg-white/[0.03] border border-white/5 text-xs flex items-center justify-between font-mono">
                            <div>
                                <span class="text-[9px] text-zinc-500 uppercase block font-sans">Geração</span>
                                <span id="edit-preview-gerado" class="text-cyan-300 font-bold">${geradosInit.toLocaleString('pt-BR')} kWh</span>
                            </div>
                            <div class="text-right">
                                <span class="text-[9px] text-lime-400 uppercase block font-sans font-extrabold">Sobra Usina Central</span>
                                <span id="edit-preview-sobra" class="text-lime-400 font-black">${sobraInit.toLocaleString('pt-BR')} kWh</span>
                            </div>
                        </div>

                        <form id="form-editar-mes-credito" class="space-y-4">
                            <div>
                                <label class="block text-xs font-semibold text-zinc-300 mb-1">Créditos Gerados na Usina Central (kWh) *</label>
                                <input type="number" step="0.01" min="1" id="edit-cred-gerados" required value="${geradosInit}" class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-lime-400 font-mono font-bold focus:outline-none focus:border-lime-400">
                            </div>

                            <div>
                                <label class="block text-xs font-semibold text-zinc-300 mb-1">Créditos Distribuídos aos Clientes (kWh)</label>
                                <input type="number" step="0.01" min="0" id="edit-cred-dist" value="${distInit}" class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-emerald-400 font-mono font-bold focus:outline-none focus:border-lime-400">
                            </div>

                            <div>
                                <label class="block text-xs font-semibold text-zinc-300 mb-1">Observações da Operação</label>
                                <textarea id="edit-cred-obs" rows="2" placeholder="Notas sobre a produção..." class="w-full px-3.5 py-2 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-lime-400">${escapeHtml(cred.observacoes || '')}</textarea>
                            </div>

                            <div class="flex items-center justify-end gap-3 pt-2">
                                <button type="button" onclick="document.getElementById('modal-editar-mes-credito').remove()" class="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-full transition-all">
                                    Cancelar
                                </button>
                                <button type="submit" class="px-6 py-2.5 bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs rounded-full shadow-lg shadow-amber-400/20 transition-all">
                                    Atualizar Produção
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHtml);

            // Recálculo em tempo real da sobra
            const inputGerados = document.getElementById('edit-cred-gerados');
            const inputDist = document.getElementById('edit-cred-dist');
            const prevGerado = document.getElementById('edit-preview-gerado');
            const prevSobra = document.getElementById('edit-preview-sobra');

            function atualizarPreviewSobra() {
                const g = parseFloat(inputGerados?.value || '0');
                const d = parseFloat(inputDist?.value || '0');
                const s = Math.max(0, g - d);
                if (prevGerado) prevGerado.innerText = `${g.toLocaleString('pt-BR')} kWh`;
                if (prevSobra) prevSobra.innerText = `${s.toLocaleString('pt-BR')} kWh`;
            }

            inputGerados?.addEventListener('input', atualizarPreviewSobra);
            inputDist?.addEventListener('input', atualizarPreviewSobra);

            document.getElementById('form-editar-mes-credito')?.addEventListener('submit', async (e) => {
                e.preventDefault();
                const gerados = parseFloat(document.getElementById('edit-cred-gerados')?.value || '0');
                const dist = parseFloat(document.getElementById('edit-cred-dist')?.value || '0');
                const obs = document.getElementById('edit-cred-obs')?.value.trim();

                try {
                    await API.updateStartupCredito(creditoId, {
                        creditos_gerados_kwh: gerados,
                        creditos_distribuidos_kwh: dist,
                        observacoes: obs
                    });
                    App.showToast('Produção mensal atualizada com sucesso!', 'success');
                    document.getElementById('modal-editar-mes-credito')?.remove();
                    await load();
                } catch (err) {
                    App.showToast(err.message, 'error');
                }
            });
        } catch (err) {
            App.showToast(err.message, 'error');
        }
    }

    async function deleteMes(creditoId, mesNome) {
        if (!confirm(`Tem certeza que deseja excluir o registro de produção do mês ${mesNome}? Isso removerá também o histórico de rateio associado a este mês.`)) {
            return;
        }

        try {
            await API.deleteStartupCredito(creditoId);
            App.showToast('Mês excluído com sucesso.', 'info');
            await load();
        } catch (err) {
            App.showToast(err.message, 'error');
        }
    }

    async function openModalAlocacao(creditoId) {
        try {
            const resp = await API.getStartupCredito(creditoId);
            const cred = resp.credito;
            if (!cred) return;

            const alocacoes = cred.alocacoes || [];
            const geradosMes = parseFloat(cred.creditos_gerados_kwh || 0);

            const existing = document.getElementById('modal-alocacao-credito');
            if (existing) existing.remove();

            let rowsHtml = '';
            clientesList.forEach(cli => {
                const alocAtual = alocacoes.find(a => a.cliente_id == cli.id);
                const valAloc = alocAtual ? parseFloat(alocAtual.creditos_alocados_kwh || 0) : 0;
                const valCons = alocAtual ? parseFloat(alocAtual.creditos_consumidos_kwh || 0) : 0;
                const valSaldo = alocAtual ? parseFloat(alocAtual.saldo_acumulado_kwh || 0) : Math.max(0, valAloc - valCons);

                rowsHtml += `
                    <tr class="border-b border-white/5 transition-colors hover:bg-white/[0.02]" data-cli-id="${cli.id}" data-prop="${cli.qtd_propriedades || 1}">
                        <td class="py-2.5 pr-2 text-xs text-white font-bold">
                            ${escapeHtml(cli.nome)}
                            <span class="block text-[9px] text-zinc-500 font-mono">${escapeHtml(cli.numero_uc || 'Sem UC')} • ${cli.qtd_propriedades || 1} un</span>
                        </td>
                        <td class="py-2.5 px-1.5">
                            <input type="number" step="0.01" min="0" class="inp-aloc w-24 px-2.5 py-1.5 bg-zinc-900 border border-white/10 rounded-xl text-xs text-cyan-300 font-mono font-semibold focus:outline-none focus:border-lime-400" value="${valAloc}">
                        </td>
                        <td class="py-2.5 px-1.5">
                            <input type="number" step="0.01" min="0" class="inp-cons w-24 px-2.5 py-1.5 bg-zinc-900 border border-white/10 rounded-xl text-xs text-zinc-300 font-mono focus:outline-none focus:border-lime-400" value="${valCons}">
                        </td>
                        <td class="py-2.5 pl-1.5">
                            <input type="number" step="0.01" min="0" class="inp-saldo w-24 px-2.5 py-1.5 bg-zinc-900/60 border border-white/10 rounded-xl text-xs text-lime-400 font-mono font-bold focus:outline-none focus:border-lime-400" value="${valSaldo}">
                        </td>
                    </tr>
                `;
            });

            const modalHtml = `
                <div id="modal-alocacao-credito" class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
                    <div class="max-w-3xl w-full bg-[#121217] border border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] flex flex-col">
                        <!-- Top Header -->
                        <div class="flex items-center justify-between pb-3 border-b border-white/5 shrink-0">
                            <div>
                                <h4 class="font-extrabold text-sm sm:text-base text-white flex items-center gap-2">
                                    <span>Rateio de Créditos Solar</span>
                                    <span class="text-xs text-zinc-400 font-mono">(${cred.mes_referencia})</span>
                                </h4>
                                <p class="text-[11px] text-zinc-400">Distribua a produção da usina entre os clientes e confira a sobra técnica.</p>
                            </div>
                            <button type="button" onclick="document.getElementById('modal-alocacao-credito').remove()" class="text-zinc-400 hover:text-white p-2 rounded-xl hover:bg-white/5 transition-all">
                                ✕
                            </button>
                        </div>

                        <!-- Balanço da Usina Central em Tempo Real -->
                        <div class="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 grid grid-cols-3 gap-2 text-xs font-mono shrink-0">
                            <div>
                                <span class="text-[9px] text-zinc-500 uppercase block font-sans">⚡ Gerado Usina</span>
                                <span id="modal-gerado-val" class="text-cyan-300 font-bold sm:text-sm">${geradosMes.toLocaleString('pt-BR')} kWh</span>
                            </div>
                            <div>
                                <span class="text-[9px] text-zinc-500 uppercase block font-sans">🔄 Total Rateado</span>
                                <span id="modal-rateado-val" class="text-emerald-400 font-bold sm:text-sm">0 kWh</span>
                            </div>
                            <div class="text-right">
                                <span class="text-[9px] text-lime-400 uppercase block font-sans font-extrabold">🏭 Sobra Usina Central</span>
                                <span id="modal-sobra-val" class="text-lime-400 font-black sm:text-sm">${geradosMes.toLocaleString('pt-BR')} kWh</span>
                            </div>
                        </div>

                        <div id="modal-alerta-excesso" class="hidden px-3.5 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold">
                            ⚠️ Atenção: A soma dos créditos alocados ultrapassa a geração da usina neste mês!
                        </div>

                        <!-- Ações Rápidas -->
                        <div class="flex items-center justify-between gap-2 shrink-0 flex-wrap">
                            <span class="text-[11px] text-zinc-400">Preencha os valores para cada cliente:</span>
                            <div class="flex items-center gap-2">
                                <button type="button" id="btn-ratear-proporcional" class="px-3 py-1 rounded-full bg-cyan-400/10 hover:bg-cyan-400/20 text-cyan-400 border border-cyan-400/20 text-[10px] font-bold transition-all">
                                    ⚡ Ratear por Propriedades
                                </button>
                                <button type="button" id="btn-zerar-alocacoes" class="px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 text-[10px] font-semibold transition-all">
                                    Limpar
                                </button>
                            </div>
                        </div>

                        <!-- Tabela de Alocações com Scroll -->
                        <div class="overflow-y-auto flex-1 border border-white/5 rounded-2xl p-2 bg-black/30">
                            <table class="w-full text-left text-xs">
                                <thead class="sticky top-0 bg-[#121217] z-10">
                                    <tr class="text-zinc-500 text-[10px] uppercase border-b border-white/5 pb-2">
                                        <th class="pb-2 font-bold">Cliente</th>
                                        <th class="pb-2 px-1.5 font-bold">Alocado (kWh)</th>
                                        <th class="pb-2 px-1.5 font-bold">Consumido (kWh)</th>
                                        <th class="pb-2 pl-1.5 font-bold">Estoque (kWh)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${rowsHtml}
                                </tbody>
                            </table>
                        </div>

                        <!-- Footer -->
                        <div class="flex items-center justify-between gap-3 pt-3 border-t border-white/5 shrink-0 flex-wrap">
                            <div class="text-[11px] text-zinc-400">
                                Sobra na usina: <strong id="modal-footer-sobra" class="text-lime-400 font-mono font-bold">${geradosMes.toLocaleString('pt-BR')} kWh</strong>
                            </div>
                            <div class="flex items-center gap-2">
                                <button type="button" onclick="document.getElementById('modal-alocacao-credito').remove()" class="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-full transition-all">
                                    Cancelar
                                </button>
                                <button type="button" onclick="StartupCreditos.salvarAlocacoesModal(${creditoId})" class="px-6 py-2.5 bg-lime-400 hover:bg-lime-300 text-zinc-950 font-extrabold text-xs rounded-full shadow-lg shadow-lime-400/20 transition-all">
                                    Salvar Rateio
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHtml);

            // Vinculação de recálculo dinâmico
            const rows = document.querySelectorAll('#modal-alocacao-credito tbody tr');
            const rateadoEl = document.getElementById('modal-rateado-val');
            const sobraEl = document.getElementById('modal-sobra-val');
            const footerSobraEl = document.getElementById('modal-footer-sobra');
            const alertaExcesso = document.getElementById('modal-alerta-excesso');

            function recalcularModal() {
                let totalAloc = 0;
                rows.forEach(r => {
                    const inpAloc = r.querySelector('.inp-aloc');
                    const inpCons = r.querySelector('.inp-cons');
                    const inpSaldo = r.querySelector('.inp-saldo');

                    const aloc = parseFloat(inpAloc?.value || '0');
                    const cons = parseFloat(inpCons?.value || '0');
                    totalAloc += aloc;

                    // Atualiza saldo do cliente se o saldo não foi customizado manualmente
                    if (inpSaldo && !inpSaldo.dataset.custom) {
                        inpSaldo.value = Math.max(0, aloc - cons);
                    }
                });

                const sobra = geradosMes - totalAloc;
                if (rateadoEl) rateadoEl.innerText = `${totalAloc.toLocaleString('pt-BR', {minimumFractionDigits: 1, maximumFractionDigits: 2})} kWh`;
                if (sobraEl) {
                    sobraEl.innerText = `${Math.max(0, sobra).toLocaleString('pt-BR', {minimumFractionDigits: 1, maximumFractionDigits: 2})} kWh`;
                    sobraEl.className = sobra < 0 ? 'text-red-400 font-black sm:text-sm' : 'text-lime-400 font-black sm:text-sm';
                }
                if (footerSobraEl) {
                    footerSobraEl.innerText = `${Math.max(0, sobra).toLocaleString('pt-BR', {minimumFractionDigits: 1, maximumFractionDigits: 2})} kWh`;
                }

                if (alertaExcesso) {
                    if (totalAloc > geradosMes) {
                        alertaExcesso.classList.remove('hidden');
                    } else {
                        alertaExcesso.classList.add('hidden');
                    }
                }
            }

            rows.forEach(r => {
                const inpAloc = r.querySelector('.inp-aloc');
                const inpCons = r.querySelector('.inp-cons');
                const inpSaldo = r.querySelector('.inp-saldo');

                inpAloc?.addEventListener('input', recalcularModal);
                inpCons?.addEventListener('input', recalcularModal);
                inpSaldo?.addEventListener('input', () => {
                    inpSaldo.dataset.custom = 'true';
                });
            });

            // Botão: Ratear por Propriedades
            document.getElementById('btn-ratear-proporcional')?.addEventListener('click', () => {
                let totalProps = 0;
                rows.forEach(r => {
                    totalProps += parseInt(r.dataset.prop || '1');
                });
                if (totalProps <= 0) return;

                const kwhPorProp = geradosMes / totalProps;
                rows.forEach(r => {
                    const props = parseInt(r.dataset.prop || '1');
                    const inpAloc = r.querySelector('.inp-aloc');
                    const inpCons = r.querySelector('.inp-cons');
                    const inpSaldo = r.querySelector('.inp-saldo');

                    const valorCalculado = parseFloat((kwhPorProp * props).toFixed(2));
                    if (inpAloc) inpAloc.value = valorCalculado;
                    const cons = parseFloat(inpCons?.value || '0');
                    if (inpSaldo) {
                        delete inpSaldo.dataset.custom;
                        inpSaldo.value = Math.max(0, valorCalculado - cons);
                    }
                });
                recalcularModal();
            });

            // Botão: Limpar
            document.getElementById('btn-zerar-alocacoes')?.addEventListener('click', () => {
                rows.forEach(r => {
                    const inpAloc = r.querySelector('.inp-aloc');
                    const inpSaldo = r.querySelector('.inp-saldo');
                    if (inpAloc) inpAloc.value = 0;
                    if (inpSaldo) {
                        delete inpSaldo.dataset.custom;
                        inpSaldo.value = 0;
                    }
                });
                recalcularModal();
            });

            // Executa cálculo inicial
            recalcularModal();
        } catch (err) {
            App.showToast(err.message, 'error');
        }
    }

    async function salvarAlocacoesModal(creditoId) {
        const rows = document.querySelectorAll('#modal-alocacao-credito tbody tr');
        const alocacoes = [];

        rows.forEach(r => {
            const cliId = parseInt(r.dataset.cliId);
            const aloc = parseFloat(r.querySelector('.inp-aloc')?.value || '0');
            const cons = parseFloat(r.querySelector('.inp-cons')?.value || '0');
            const saldo = parseFloat(r.querySelector('.inp-saldo')?.value || '0');

            alocacoes.push({
                cliente_id: cliId,
                creditos_alocados_kwh: aloc,
                creditos_consumidos_kwh: cons,
                saldo_acumulado_kwh: saldo
            });
        });

        try {
            await API.alocarStartupCreditos(creditoId, { alocacoes });
            App.showToast('Rateio de créditos salvo com sucesso!', 'success');
            document.getElementById('modal-alocacao-credito')?.remove();
            await load();
            carregarAlocacoesDoMes(creditoId);
        } catch (err) {
            App.showToast(err.message, 'error');
        }
    }

    function formatarMesNome(mesAno) {
        if (!mesAno) return '';
        const [ano, mes] = mesAno.split('-');
        const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        const idx = parseInt(mes) - 1;
        return `${meses[idx] || mes} de ${ano}`;
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.innerText = text;
        return div.innerHTML;
    }

    return {
        init,
        load,
        toggleMes,
        openModalNovoMes,
        openModalEditarMes,
        deleteMes,
        openModalAlocacao,
        salvarAlocacoesModal
    };
})();
