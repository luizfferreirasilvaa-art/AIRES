/**
 * AIRES - Módulo Startup: Estoque de Créditos & Supervisão
 * Obsidian Dark Glassmorphism
 */

const StartupCreditos = (() => {
    let creditosList = [];
    let resumoData = { total_gerado: 0, total_distribuido: 0, total_saldo: 0 };
    let clientesList = [];

    function init() {
        // Eventos vinculados dinamicamente
    }

    async function load() {
        const container = document.getElementById('startup-creditos-container');
        if (!container) return;

        container.innerHTML = `
            <div class="py-12 flex flex-col items-center justify-center text-zinc-500">
                <div class="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mb-3"></div>
                <p class="text-xs">Carregando balanço de créditos e previsões...</p>
            </div>
        `;

        try {
            const [respCred, respCli] = await Promise.all([
                API.getStartupCreditos(),
                API.getStartupClientes({ status: 'ativo' })
            ]);

            creditosList = (respCred && respCred.creditos) || [];
            resumoData = (respCred && respCred.resumo) || { total_gerado: 0, total_distribuido: 0, total_saldo: 0 };
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
        const totalSaldo = parseFloat(resumoData.total_saldo || 0);

        let html = `
            <!-- Cards de Resumo de Estoque da Usina -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div class="glass-card rounded-3xl p-5 space-y-1">
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] text-zinc-400 uppercase font-bold">Total Gerado (Usina)</span>
                        <span class="text-cyan-400">⚡</span>
                    </div>
                    <p class="text-3xl font-black text-cyan-400">${totalGerado.toLocaleString('pt-BR')} <span class="text-xs font-semibold text-zinc-400">kWh</span></p>
                    <p class="text-[10px] text-zinc-500">Produção solar acumulada</p>
                </div>

                <div class="glass-card rounded-3xl p-5 space-y-1">
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] text-zinc-400 uppercase font-bold">Créditos Distribuídos</span>
                        <span class="text-emerald-400">🔄</span>
                    </div>
                    <p class="text-3xl font-black text-emerald-400">${totalDist.toLocaleString('pt-BR')} <span class="text-xs font-semibold text-zinc-400">kWh</span></p>
                    <p class="text-[10px] text-zinc-500">Alocados para clientes cadastrados</p>
                </div>

                <div class="glass-card rounded-3xl p-5 space-y-1 sm:col-span-2 lg:col-span-1">
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] text-zinc-400 uppercase font-bold">Saldo Guardado (Estoque)</span>
                        <span class="text-lime-400">📦</span>
                    </div>
                    <p class="text-3xl font-black text-lime-400">${totalSaldo.toLocaleString('pt-BR')} <span class="text-xs font-semibold text-zinc-400">kWh</span></p>
                    <p class="text-[10px] text-zinc-500">Reserva técnica disponível na rede</p>
                </div>
            </div>
        `;

        if (creditosList.length === 0) {
            html += `
                <div class="glass-card rounded-3xl p-12 text-center text-zinc-500 space-y-3">
                    <div class="w-12 h-12 mx-auto rounded-2xl bg-cyan-400/10 text-cyan-400 border border-cyan-400/20 flex items-center justify-center text-xl">📊</div>
                    <p class="text-sm font-bold text-white">Nenhum mês de produção registrado</p>
                    <p class="text-xs max-w-sm mx-auto">Lance a geração mensal da usina fotovoltaica para distribuir e acompanhar a duração do estoque dos clientes.</p>
                    <button type="button" onclick="StartupCreditos.openModalNovoMes()" class="px-5 py-2.5 bg-cyan-400 hover:bg-cyan-300 text-black font-extrabold text-xs rounded-full shadow-lg transition-all">
                        + Registrar Primeiro Mês
                    </button>
                </div>
            `;
            container.innerHTML = html;
            return;
        }

        // Tabela de Meses com Expansão de Alocações
        html += `
            <div class="glass-card rounded-3xl p-5 space-y-4">
                <div class="flex items-center justify-between flex-wrap gap-2">
                    <div>
                        <h4 class="font-extrabold text-sm text-white">Histórico Mensal & Rateio</h4>
                        <p class="text-xs text-zinc-400">Clique em um mês para visualizar o estoque individual de cada cliente e a previsão de duração.</p>
                    </div>
                </div>

                <div class="space-y-3" id="lista-meses-creditos">
        `;

        creditosList.forEach((cred, idx) => {
            const isFirst = idx === 0;
            const gerados = parseFloat(cred.creditos_gerados_kwh || 0);
            const dist = parseFloat(cred.creditos_distribuidos_kwh || 0);
            const saldo = parseFloat(cred.saldo_kwh || 0);

            html += `
                <div class="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden transition-all">
                    <!-- Linha do Mês (Header Acordeom) -->
                    <div class="p-4 flex items-center justify-between flex-wrap gap-3 cursor-pointer hover:bg-white/[0.04] transition-colors" onclick="StartupCreditos.toggleMes(${cred.id})">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-2xl bg-cyan-400/10 text-cyan-400 border border-cyan-400/20 flex items-center justify-center font-bold font-mono text-sm">
                                ${cred.mes_referencia.substring(5, 7)}
                            </div>
                            <div>
                                <h5 class="font-extrabold text-sm text-white flex items-center gap-2">
                                    <span>${formatarMesNome(cred.mes_referencia)}</span>
                                    <span class="text-[10px] text-zinc-500 font-mono">(${cred.mes_referencia})</span>
                                </h5>
                                <p class="text-[11px] text-zinc-400">${cred.total_clientes_alocados || 0} clientes atendidos</p>
                            </div>
                        </div>

                        <div class="flex items-center gap-4 text-xs font-mono">
                            <div class="text-right">
                                <span class="text-[10px] text-zinc-500 uppercase block font-sans">Gerado</span>
                                <span class="text-cyan-400 font-bold">${gerados.toLocaleString('pt-BR')} kWh</span>
                            </div>
                            <div class="text-right">
                                <span class="text-[10px] text-zinc-500 uppercase block font-sans">Distribuído</span>
                                <span class="text-emerald-400 font-bold">${dist.toLocaleString('pt-BR')} kWh</span>
                            </div>
                            <div class="text-right">
                                <span class="text-[10px] text-zinc-500 uppercase block font-sans">Saldo</span>
                                <span class="text-lime-400 font-bold">${saldo.toLocaleString('pt-BR')} kWh</span>
                            </div>
                            <button type="button" class="p-2 text-zinc-400 hover:text-white transition-transform" id="chevron-mes-${cred.id}">
                                ▼
                            </button>
                        </div>
                    </div>

                    <!-- Container de Alocações por Cliente -->
                    <div id="alocacoes-container-${cred.id}" class="${isFirst ? '' : 'hidden'} border-t border-white/5 p-4 bg-black/40">
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
                    <div class="py-4 text-center text-xs text-zinc-500">
                        Nenhuma alocação registrada para este mês.
                        <button type="button" onclick="StartupCreditos.openModalAlocacao(${creditoId})" class="text-cyan-400 underline font-bold ml-1">Distribuir Créditos</button>
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
                const isBaixo = a.alerta_estoque_baixo;

                // Card para telas menores/minimizadas
                cardsHtml += `
                    <div class="rounded-xl border border-white/5 bg-white/[0.02] p-3.5 space-y-2.5">
                        <div class="flex items-start justify-between gap-2">
                            <div class="min-w-0">
                                <h6 class="font-bold text-xs text-white truncate">${escapeHtml(a.cliente_nome)}</h6>
                                <span class="text-[10px] font-mono text-zinc-500">UC: ${escapeHtml(a.numero_uc || 'Sem UC')} • ${a.qtd_propriedades || 1} un</span>
                            </div>
                            <div>
                                ${isBaixo ? `
                                    <span class="px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-[9px] font-extrabold uppercase animate-pulse">
                                        ⚠️ Estoque Baixo
                                    </span>
                                ` : `
                                    <span class="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[9px] font-bold">
                                        ✓ Saudável
                                    </span>
                                `}
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-2 p-2 rounded-lg bg-black/40 border border-white/5 text-xs font-mono">
                            <div>
                                <span class="text-[9px] text-zinc-500 uppercase block font-sans">Alocado / Consumido</span>
                                <span class="text-cyan-300">${aloc.toLocaleString('pt-BR')} kWh</span>
                                <span class="text-zinc-500 block text-[10px]">Cons: ${cons.toLocaleString('pt-BR')} kWh</span>
                            </div>
                            <div>
                                <span class="text-[9px] text-zinc-500 uppercase block font-sans">Estoque / Previsão</span>
                                <span class="text-lime-400 font-bold">${saldo.toLocaleString('pt-BR')} kWh</span>
                                <span class="block text-[10px] font-sans ${isBaixo ? 'text-red-400 font-bold' : 'text-emerald-400'}">
                                    ${previsaoMeses >= 90 ? '>3 anos' : `~${previsaoMeses} m`}
                                </span>
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
                        <td class="py-2.5 px-3 whitespace-nowrap">
                            <span class="font-extrabold ${isBaixo ? 'text-red-400' : 'text-emerald-400'}">
                                ${previsaoMeses >= 90 ? 'Longo Prazo (>3 anos)' : `~${previsaoMeses} ${previsaoMeses === 1 ? 'mês' : 'meses'}`}
                            </span>
                        </td>
                        <td class="py-2.5 px-3 text-right whitespace-nowrap">
                            ${isBaixo ? `
                                <span class="px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-[9px] font-extrabold uppercase animate-pulse">
                                    ⚠️ Estoque Baixo (< 1 mês)
                                </span>
                            ` : `
                                <span class="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[9px] font-bold">
                                    ✓ Saudável
                                </span>
                            `}
                        </td>
                    </tr>
                `;
            });

            let html = `
                <div class="flex items-center justify-between pb-3 mb-2 flex-wrap gap-2">
                    <span class="text-[11px] font-bold text-zinc-300">Estoque de Créditos & Previsão por Cliente</span>
                    <button type="button" onclick="StartupCreditos.openModalAlocacao(${creditoId})" class="px-3 py-1 rounded-full bg-cyan-400/10 hover:bg-cyan-400/20 text-cyan-400 border border-cyan-400/20 text-[11px] font-bold transition-all">
                        ⚙️ Ajustar Rateio do Mês
                    </button>
                </div>

                <!-- Visão Mobile/Minimizada: Cards -->
                <div class="block lg:hidden space-y-2.5">
                    ${cardsHtml}
                </div>

                <!-- Visão Desktop/Maximizada: Tabela -->
                <div class="hidden lg:block overflow-x-auto pb-1">
                    <table class="w-full text-left text-xs min-w-[780px]">
                        <thead>
                            <tr class="text-zinc-500 text-[10px] uppercase border-b border-white/5 pb-2">
                                <th class="pb-2 px-3 font-bold whitespace-nowrap">Cliente</th>
                                <th class="pb-2 px-3 font-bold whitespace-nowrap">Propriedades</th>
                                <th class="pb-2 px-3 font-bold whitespace-nowrap">Alocado (kWh)</th>
                                <th class="pb-2 px-3 font-bold whitespace-nowrap">Consumido (kWh)</th>
                                <th class="pb-2 px-3 font-bold whitespace-nowrap">Estoque Guardado</th>
                                <th class="pb-2 px-3 font-bold whitespace-nowrap">Previsão Duração</th>
                                <th class="pb-2 px-3 font-bold text-right whitespace-nowrap">Alerta</th>
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
            container.innerHTML = `<div class="p-3 text-red-400 text-xs">Erro: ${escapeHtml(err.message)}</div>`;
        }
    }

    function openModalNovoMes() {
        const mesAtual = new Date().toISOString().substring(0, 7);
        const existing = document.getElementById('modal-novo-mes-credito');
        if (existing) existing.remove();

        const modalHtml = `
            <div id="modal-novo-mes-credito" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                <div class="max-w-md w-full bg-[#121217] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-5">
                    <div class="flex items-center justify-between pb-3 border-b border-white/5">
                        <div class="flex items-center gap-2.5">
                            <div class="w-9 h-9 rounded-2xl bg-cyan-400/10 text-cyan-400 border border-cyan-400/20 flex items-center justify-center text-base">
                                ⚡
                            </div>
                            <div>
                                <h4 class="font-extrabold text-sm text-white">Registrar Produção da Usina</h4>
                                <p class="text-[11px] text-zinc-400">Geração solar mensal total da usina fotovoltaica</p>
                            </div>
                        </div>
                        <button type="button" onclick="document.getElementById('modal-novo-mes-credito').remove()" class="text-zinc-400 hover:text-white p-2 rounded-xl hover:bg-white/5 transition-all">
                            ✕
                        </button>
                    </div>

                    <form id="form-novo-mes-credito" class="space-y-4">
                        <div>
                            <label class="block text-xs font-semibold text-zinc-300 mb-1">Mês de Referência *</label>
                            <input type="month" id="novo-cred-mes" required value="${mesAtual}" class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-cyan-400">
                        </div>

                        <div>
                            <label class="block text-xs font-semibold text-zinc-300 mb-1">Créditos Gerados na Usina (kWh) *</label>
                            <input type="number" step="0.01" min="1" id="novo-cred-gerados" required placeholder="Ex: 25000.00" class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-cyan-300 font-mono font-bold focus:outline-none focus:border-cyan-400">
                        </div>

                        <div>
                            <label class="block text-xs font-semibold text-zinc-300 mb-1">Observações da Operação</label>
                            <textarea id="novo-cred-obs" rows="2" placeholder="Notas sobre a produção, irradiação solar ou inversores..." class="w-full px-3.5 py-2 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-cyan-400"></textarea>
                        </div>

                        <div class="flex items-center justify-end gap-3 pt-2">
                            <button type="button" onclick="document.getElementById('modal-novo-mes-credito').remove()" class="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-full transition-all">
                                Cancelar
                            </button>
                            <button type="submit" class="px-6 py-2.5 bg-cyan-400 hover:bg-cyan-300 text-black font-extrabold text-xs rounded-full shadow-lg shadow-cyan-400/20 transition-all">
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

    async function openModalAlocacao(creditoId) {
        try {
            const resp = await API.getStartupCredito(creditoId);
            const cred = resp.credito;
            if (!cred) return;

            const alocacoes = cred.alocacoes || [];

            const existing = document.getElementById('modal-alocacao-credito');
            if (existing) existing.remove();

            let rowsHtml = '';
            clientesList.forEach(cli => {
                const alocAtual = alocacoes.find(a => a.cliente_id == cli.id);
                const valAloc = alocAtual ? alocAtual.creditos_alocados_kwh : 0;
                const valCons = alocAtual ? alocAtual.creditos_consumidos_kwh : 0;
                const valSaldo = alocAtual ? alocAtual.saldo_acumulado_kwh : 0;

                rowsHtml += `
                    <tr class="border-b border-white/5" data-cli-id="${cli.id}">
                        <td class="py-2.5 text-xs text-white font-bold">
                            ${escapeHtml(cli.nome)}
                            <span class="block text-[9px] text-zinc-500 font-mono">${escapeHtml(cli.numero_uc || '')} • ${cli.qtd_propriedades || 1} prop.</span>
                        </td>
                        <td class="py-2.5">
                            <input type="number" step="0.01" class="inp-aloc w-24 px-2 py-1 bg-zinc-900 border border-white/10 rounded-xl text-xs text-cyan-300 font-mono" value="${valAloc}">
                        </td>
                        <td class="py-2.5">
                            <input type="number" step="0.01" class="inp-cons w-24 px-2 py-1 bg-zinc-900 border border-white/10 rounded-xl text-xs text-zinc-300 font-mono" value="${valCons}">
                        </td>
                        <td class="py-2.5">
                            <input type="number" step="0.01" class="inp-saldo w-24 px-2 py-1 bg-zinc-900 border border-white/10 rounded-xl text-xs text-lime-400 font-mono font-bold" value="${valSaldo}">
                        </td>
                    </tr>
                `;
            });

            const modalHtml = `
                <div id="modal-alocacao-credito" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div class="max-w-2xl w-full bg-[#121217] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
                        <div class="flex items-center justify-between pb-3 border-b border-white/5">
                            <div>
                                <h4 class="font-extrabold text-sm text-white">Rateio de Créditos • ${cred.mes_referencia}</h4>
                                <p class="text-[11px] text-zinc-400">Total gerado na usina: <strong class="text-cyan-400 font-mono">${parseFloat(cred.creditos_gerados_kwh).toLocaleString('pt-BR')} kWh</strong></p>
                            </div>
                            <button type="button" onclick="document.getElementById('modal-alocacao-credito').remove()" class="text-zinc-400 hover:text-white p-2 rounded-xl hover:bg-white/5 transition-all">
                                ✕
                            </button>
                        </div>

                        <div class="overflow-x-auto">
                            <table class="w-full text-left text-xs">
                                <thead>
                                    <tr class="text-zinc-500 text-[10px] uppercase border-b border-white/5 pb-2">
                                        <th class="pb-2 font-bold">Cliente</th>
                                        <th class="pb-2 font-bold">Alocado (kWh)</th>
                                        <th class="pb-2 font-bold">Consumido (kWh)</th>
                                        <th class="pb-2 font-bold">Saldo Guardado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${rowsHtml}
                                </tbody>
                            </table>
                        </div>

                        <div class="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
                            <button type="button" onclick="document.getElementById('modal-alocacao-credito').remove()" class="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-full transition-all">
                                Cancelar
                            </button>
                            <button type="button" onclick="StartupCreditos.salvarAlocacoesModal(${creditoId})" class="px-6 py-2.5 bg-cyan-400 hover:bg-cyan-300 text-black font-extrabold text-xs rounded-full shadow-lg transition-all">
                                Salvar Rateio
                            </button>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHtml);
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
            App.showToast('Alocações salvas com sucesso!', 'success');
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
        openModalAlocacao,
        salvarAlocacoesModal
    };
})();
