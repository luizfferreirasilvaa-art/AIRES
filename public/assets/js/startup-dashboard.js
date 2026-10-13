/**
 * AIRES - Módulo Startup: Dashboard Solar Executivo
 * Obsidian Dark Glassmorphism
 */

const StartupDashboard = (() => {
    let dashboardData = null;

    function init() {
        // Eventos vinculados dinamicamente
    }

    async function load() {
        const container = document.getElementById('startup-dashboard-container');
        if (!container) return;

        container.innerHTML = `
            <div class="py-12 flex flex-col items-center justify-center text-zinc-500">
                <div class="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mb-3"></div>
                <p class="text-xs">Consolidando métricas e indicadores solares...</p>
            </div>
        `;

        try {
            const resp = await API.getStartupDashboard();
            dashboardData = resp;
            render();
        } catch (err) {
            container.innerHTML = `
                <div class="glass-card rounded-3xl p-6 text-center text-red-400">
                    <p class="text-xs font-bold">Erro ao carregar Dashboard Solar: ${escapeHtml(err.message)}</p>
                </div>
            `;
        }
    }

    function render() {
        const container = document.getElementById('startup-dashboard-container');
        if (!container || !dashboardData) return;

        const kpis = dashboardData.kpis || {};
        const historico = dashboardData.historico || [];

        const receita = parseFloat(kpis.receita_mes || 0);
        const custos = parseFloat(kpis.custos_operacionais || 0);
        const lucro = parseFloat(kpis.lucro_estimado || 0);
        const inadPct = parseFloat(kpis.inadimplencia_pct || 0);
        const inadValor = parseFloat(kpis.valor_inadimplente || 0);
        const gerados = parseFloat(kpis.creditos_gerados || 0);
        const saldo = parseFloat(kpis.creditos_saldo || 0);
        const taxaAproveitamento = parseFloat(kpis.taxa_aproveitamento || 0);
        const clientesAtivos = parseInt(kpis.clientes_ativos || 0);
        const propsAtendidas = parseInt(kpis.total_propriedades || 0);

        let html = `
            <!-- Grid de 4 Bento Cards Executivos -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <!-- Card 1: Receita -->
                <div class="glass-card rounded-3xl p-5 space-y-2 relative overflow-hidden group hover:border-white/20 transition-all">
                    <div class="flex items-center justify-between">
                        <span class="text-[11px] text-zinc-400 font-medium">Receita Solar (Mês)</span>
                        <span class="w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xs font-bold">💰</span>
                    </div>
                    <div class="text-3xl font-black text-emerald-400 tracking-tight">${formatarMoeda(receita)}</div>
                    <p class="text-[11px] text-zinc-500 flex items-center gap-1.5">
                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        Faturas solares recebidas
                    </p>
                </div>

                <!-- Card 2: Lucro Operacional Líquido -->
                <div class="glass-card rounded-3xl p-5 space-y-2 relative overflow-hidden group hover:border-white/20 transition-all">
                    <div class="flex items-center justify-between">
                        <span class="text-[11px] text-zinc-400 font-medium">Lucro Líquido Estimado</span>
                        <span class="w-7 h-7 rounded-full bg-lime-400/10 text-lime-400 flex items-center justify-center text-xs font-bold">⚡</span>
                    </div>
                    <div class="text-3xl font-black ${lucro >= 0 ? 'text-lime-400' : 'text-red-400'} tracking-tight">${formatarMoeda(lucro)}</div>
                    <p class="text-[11px] text-zinc-500">
                        Custos da usina: <span class="text-red-400 font-bold">${formatarMoeda(custos)}</span>
                    </p>
                </div>

                <!-- Card 3: Produção & Aproveitamento -->
                <div class="glass-card rounded-3xl p-5 space-y-2 relative overflow-hidden group hover:border-white/20 transition-all">
                    <div class="flex items-center justify-between">
                        <span class="text-[11px] text-zinc-400 font-medium">Geração da Usina</span>
                        <span class="w-7 h-7 rounded-full bg-cyan-400/10 text-cyan-400 flex items-center justify-center text-xs font-bold">☀️</span>
                    </div>
                    <div class="text-3xl font-black text-cyan-400 tracking-tight">${gerados.toLocaleString('pt-BR')} <span class="text-sm font-semibold text-zinc-400">kWh</span></div>
                    <div class="flex items-center justify-between text-[11px] text-zinc-400">
                        <span>Aproveitamento:</span>
                        <span class="text-white font-extrabold">${taxaAproveitamento}%</span>
                    </div>
                </div>

                <!-- Card 4: Inadimplência -->
                <div class="glass-card rounded-3xl p-5 space-y-2 relative overflow-hidden group hover:border-white/20 transition-all ${inadPct > 0 ? 'border-red-500/20' : ''}">
                    <div class="flex items-center justify-between">
                        <span class="text-[11px] text-zinc-400 font-medium">Taxa de Inadimplência</span>
                        <span class="w-7 h-7 rounded-full ${inadPct > 0 ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'} flex items-center justify-center text-xs font-bold">🛡️</span>
                    </div>
                    <div class="text-3xl font-black ${inadPct > 0 ? 'text-red-400' : 'text-emerald-400'} tracking-tight">${inadPct}%</div>
                    <p class="text-[11px] text-zinc-500">
                        Em aberto: <span class="text-red-400 font-bold">${formatarMoeda(inadValor)}</span>
                    </p>
                </div>
            </div>

            <!-- Seção Central: Carteira de Clientes + Gráficos -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <!-- Gráfico de Comparação: Receitas vs Despesas (Últimos 6 meses) -->
                <div class="lg:col-span-8 glass-card rounded-3xl p-6 space-y-5">
                    <div class="flex items-center justify-between">
                        <div>
                            <h4 class="font-extrabold text-sm text-white">Evolução Financeira da Usina</h4>
                            <p class="text-xs text-zinc-400">Histórico de Receita Líquida vs Custos Operacionais</p>
                        </div>
                        <div class="flex items-center gap-3 text-xs">
                            <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-emerald-400"></span> Receita</span>
                            <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-red-400"></span> Custos</span>
                        </div>
                    </div>

                    <!-- CSS Bar Chart (Sem dependências externas) -->
                    <div class="pt-4 pb-2">
                        <div class="grid grid-cols-6 gap-3 items-end h-48 border-b border-white/5 pb-2">
                            ${renderBarrasHistorico(historico)}
                        </div>
                    </div>
                </div>

                <!-- Card Lateral: Status da Usina & Propriedades -->
                <div class="lg:col-span-4 space-y-4">
                    <div class="glass-card rounded-3xl p-6 space-y-4 bg-gradient-to-br from-[#121217] to-[#1a1725] border border-amber-400/15">
                        <div class="flex items-center justify-between pb-3 border-b border-white/5">
                            <h4 class="font-extrabold text-sm text-white">Status da Usina Solar</h4>
                            <span class="px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-400 text-[10px] font-black uppercase">Operando 100%</span>
                        </div>

                        <div class="space-y-3">
                            <div class="flex items-center justify-between py-2 border-b border-white/5 text-xs">
                                <span class="text-zinc-400">Clientes Ativos:</span>
                                <span class="font-black text-white text-sm">${clientesAtivos} assinantes</span>
                            </div>
                            <div class="flex items-center justify-between py-2 border-b border-white/5 text-xs">
                                <span class="text-zinc-400">Propriedades Atendidas:</span>
                                <span class="font-black text-amber-400 text-sm">${propsAtendidas} unidades</span>
                            </div>
                            <div class="flex items-center justify-between py-2 border-b border-white/5 text-xs">
                                <span class="text-zinc-400">Saldo Reserva Usina:</span>
                                <span class="font-mono font-black text-lime-400 text-sm">${saldo.toLocaleString('pt-BR')} kWh</span>
                            </div>
                        </div>

                        <!-- Barra de Aproveitamento Visual -->
                        <div class="space-y-1.5 pt-2">
                            <div class="flex items-center justify-between text-xs">
                                <span class="text-zinc-400">Taxa de Eficiência de Rateio</span>
                                <span class="font-bold text-white">${taxaAproveitamento}%</span>
                            </div>
                            <div class="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                                <div class="bg-gradient-to-r from-emerald-500 via-lime-400 to-amber-400 h-2 rounded-full transition-all" style="width: ${Math.min(100, taxaAproveitamento)}%"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    function renderBarrasHistorico(historico) {
        if (!historico || historico.length === 0) {
            return `<div class="col-span-6 text-center text-xs text-zinc-500 py-12">Sem dados históricos acumulados</div>`;
        }

        // Encontrar valor máximo para escala
        let maxVal = 1000;
        historico.forEach(h => {
            if (h.receita > maxVal) maxVal = h.receita;
            if (h.despesas > maxVal) maxVal = h.despesas;
        });

        return historico.map(h => {
            const hRec = Math.max(8, Math.round((h.receita / maxVal) * 100));
            const hDesp = Math.max(8, Math.round((h.despesas / maxVal) * 100));

            return `
                <div class="flex flex-col items-center justify-end h-full gap-1 group">
                    <div class="w-full flex items-end justify-center gap-1.5 h-36">
                        <!-- Barra Receita -->
                        <div class="w-3 sm:w-4 bg-emerald-400 rounded-t-lg transition-all group-hover:bg-emerald-300" style="height: ${hRec}%" title="Receita: ${formatarMoeda(h.receita)}"></div>
                        <!-- Barra Despesa -->
                        <div class="w-3 sm:w-4 bg-red-400/80 rounded-t-lg transition-all group-hover:bg-red-400" style="height: ${hDesp}%" title="Custos: ${formatarMoeda(h.despesas)}"></div>
                    </div>
                    <span class="text-[10px] text-zinc-400 font-mono mt-1">${h.mes_nome}</span>
                </div>
            `;
        }).join('');
    }

    function formatarMoeda(val) {
        const n = parseFloat(val) || 0;
        return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.innerText = text;
        return div.innerHTML;
    }

    return {
        init,
        load
    };
})();
