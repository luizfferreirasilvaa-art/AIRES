/**
 * AIRES - Módulo de Finanças Pessoais, Metas & Investimentos
 * Obsidian Dark Glassmorphism / Pierre Fintech
 * Controle de Teto Mensal, Parcelamentos, Previsões Futuras, Alertas de Extrapolação
 * e Gestão Completa de Patrimônio, Economias Acumuladas & Investimentos
 */

const PersonalFinance = (() => {
    let itensList = [];
    let investimentosList = [];
    let resumoData = {
        teto_mensal: 5000,
        renda_mensal: 6000,
        total_fixos_mensais: 0,
        total_parcelas_mes_atual: 0,
        total_comprometido_mes_atual: 0,
        saldo_livre_mes_atual: 5000,
        percentual_comprometido: 0,
        extrapolou: false,
        valor_extrapolado: 0,
        total_divida_parcelada_restante: 0,
        qtd_metas_ativas: 0,
        total_itens: 0,
        meses_alerta_futuros: 0,
        patrimonio_investido_total: 0
    };
    let alertasData = {
        extrapolou_mes_atual: false,
        valor_extrapolado: 0,
        meses_extrapolados: []
    };
    let resumoInvestimentosData = {
        kpis: {
            patrimonio_total: 0,
            total_aplicado: 0,
            lucro_acumulado: 0,
            rentabilidade_media: 0,
            aporte_mensal_total: 0,
            reserva_total: 0,
            reserva_meta: 0,
            reserva_progresso_pct: 0,
            qtd_ativos: 0
        },
        distribuicao: [],
        ultimas_movimentacoes: []
    };
    let projecaoData = [];
    let configData = {
        teto_gastos_mensal: 5000,
        renda_mensal_estimada: 6000,
        alerta_percentual: 90
    };
    let currentFilter = {
        tipo: '',
        status: 'ativo',
        categoria: '',
        busca: ''
    };
    let currentInvestFilter = {
        tipo: '',
        status: 'ativo',
        busca: ''
    };
    let dashboardData = null;
    let currentSubView = 'dashboard'; // 'itens' | 'projecao' | 'simulador' | 'investimentos'

    const CATEGORIAS = {
        moradia: { label: 'Moradia / Aluguel', icone: '🏠', cor: 'cyan' },
        eletrodomestico: { label: 'Eletrodomésticos & Casa', icone: '🧊', cor: 'purple' },
        servicos: { label: 'Contas & Assinaturas', icone: '⚡', cor: 'lime' },
        tecnologia: { label: 'Tecnologia & Gadgets', icone: '💻', cor: 'indigo' },
        educacao: { label: 'Educação & Cursos', icone: '📚', cor: 'amber' },
        transporte: { label: 'Transporte & Carro', icone: '🚗', cor: 'orange' },
        lazer_viagem: { label: 'Lazer & Viagens', icone: '✈️', cor: 'pink' },
        saude: { label: 'Saúde & Bem-estar', icone: '❤️', cor: 'rose' },
        alimentacao: { label: 'Alimentação & Supermercado', icone: '🛒', cor: 'emerald' },
        outros: { label: 'Outros & Avulsos', icone: '🏷️', cor: 'zinc' }
    };

    const TIPOS_INVESTIMENTO = {
        reserva_emergencia: { label: 'Reserva de Emergência', icone: '🛡️', cor: 'emerald', bg: 'bg-emerald-400' },
        renda_fixa: { label: 'Renda Fixa / CDI / Tesouro', icone: '📈', cor: 'cyan', bg: 'bg-cyan-400' },
        fundos_imobiliarios: { label: 'Fundos Imobiliários (FIIs)', icone: '🏢', cor: 'purple', bg: 'bg-purple-400' },
        acoes: { label: 'Ações & Dividendos', icone: '📊', cor: 'lime', bg: 'bg-lime-400' },
        cripto: { label: 'Criptoativos / BTC', icone: '🪙', cor: 'amber', bg: 'bg-amber-400' },
        previdencia: { label: 'Previdência Privada', icone: '🏦', cor: 'indigo', bg: 'bg-indigo-400' },
        outro: { label: 'Outros Investimentos', icone: '💎', cor: 'zinc', bg: 'bg-zinc-400' }
    };

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    async function load() {
        const container = document.getElementById('personal-finance-container');
        if (!container) return;

        container.innerHTML = `
            <div class="py-16 flex flex-col items-center justify-center text-zinc-500">
                <div class="w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full animate-spin mb-3"></div>
                <p class="text-xs font-semibold">Analisando compromissos pessoais, investimentos e economias...</p>
            </div>
        `;

        try {
            const [respItens, respResumo, respProjecao, respConfig, respInvest, respInvestResumo, respDash] = await Promise.all([
                API.getPersonalFinance(currentFilter).catch(() => null),
                API.getPersonalFinanceResumo().catch(() => null),
                API.getPersonalFinanceProjecao({ meses: 12 }).catch(() => null),
                API.getPersonalFinanceConfig().catch(() => null),
                API.getPersonalInvestimentos(currentInvestFilter).catch(() => null),
                API.getPersonalInvestimentosResumo().catch(() => null),
                API.getPersonalFinanceDashboard ? API.getPersonalFinanceDashboard().catch(() => null) : Promise.resolve(null)
            ]);

            itensList = (respItens && respItens.itens) || [];
            resumoData = (respResumo && respResumo.kpis) || resumoData;
            alertasData = (respResumo && respResumo.alertas) || alertasData;
            projecaoData = (respProjecao && respProjecao.meses) || [];
            configData = (respConfig && respConfig.config) || configData;
            investimentosList = (respInvest && respInvest.itens) || [];
            resumoInvestimentosData = respInvestResumo || resumoInvestimentosData;
            dashboardData = respDash || null;

            render();
        } catch (err) {
            container.innerHTML = `
                <div class="glass-card rounded-3xl p-6 text-center text-red-400 space-y-3">
                    <p class="text-xs font-bold">Erro ao carregar finanças pessoais: ${escapeHtml(err.message)}</p>
                    <button type="button" onclick="PersonalFinance.load()" class="px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-xs font-bold rounded-full transition-all">
                        🔄 Tentar Novamente
                    </button>
                </div>
            `;
        }
    }

    function render() {
        const container = document.getElementById('personal-finance-container');
        if (!container) return;

        const teto = parseFloat(resumoData.teto_mensal || configData.teto_gastos_mensal || 5000);
        const fixos = parseFloat(resumoData.total_fixos_mensais || 0);
        const parcelasMes = parseFloat(resumoData.total_parcelas_mes_atual || 0);
        const comprometido = parseFloat(resumoData.total_comprometido_mes_atual || (fixos + parcelasMes));
        const saldoLivre = parseFloat(resumoData.saldo_livre_mes_atual || (teto - comprometido));
        const pctComprometido = parseFloat(resumoData.percentual_comprometido || (teto > 0 ? (comprometido / teto) * 100 : 0)).toFixed(1);
        const dividaRestante = parseFloat(resumoData.total_divida_parcelada_restante || 0);
        const extrapolou = comprometido > teto;
        const excesso = extrapolou ? (comprometido - teto) : 0;
        const mesesExtrapolados = alertasData.meses_extrapolados || [];

        // Dados de Investimento
        const invKpis = resumoInvestimentosData.kpis || {};
        const patrimonioTotal = parseFloat(invKpis.patrimonio_total || 0);
        const lucroTotal = parseFloat(invKpis.lucro_acumulado || 0);
        const aporteMensalTotal = parseFloat(invKpis.aporte_mensal_total || 0);

        let html = `
            <!-- ========================================================
                 BANNER DE ALERTA DE EXTRAPOLAÇÃO DE ORÇAMENTO (PROATIVO)
                 ======================================================== -->
            ${extrapolou ? `
                <div class="p-4 sm:p-5 rounded-3xl bg-red-500/10 border border-red-500/30 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl shadow-red-950/20 animate-pulse">
                    <div class="flex items-center gap-3.5">
                        <div class="w-11 h-11 rounded-2xl bg-red-500/20 text-red-400 border border-red-500/40 flex items-center justify-center text-xl shrink-0">
                            🚨
                        </div>
                        <div>
                            <h4 class="text-sm font-extrabold text-red-300 flex items-center gap-2">
                                TETO MENSAL EXTRAPOLADO NO MÊS ATUAL!
                                <span class="px-2 py-0.5 rounded-full bg-red-500/30 text-red-200 text-[10px] font-mono font-bold">+R$ ${excesso.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </h4>
                            <p class="text-xs text-zinc-300 mt-0.5">
                                O total comprometido este mês é de <strong>R$ ${comprometido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>, superando seu teto planejado de <strong>R$ ${teto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> (${pctComprometido}%).
                            </p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 self-stretch md:self-auto shrink-0">
                        <button type="button" onclick="PersonalFinance.abrirModalConfig()" class="flex-1 md:flex-initial px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 font-bold text-xs rounded-full transition-all">
                            Ajustar Teto
                        </button>
                        <button type="button" onclick="PersonalFinance.setSubView('projecao')" class="flex-1 md:flex-initial px-4 py-2 bg-white text-zinc-950 hover:bg-zinc-200 font-extrabold text-xs rounded-full shadow-lg transition-all">
                            Ver Meses Afetados
                        </button>
                    </div>
                </div>
            ` : (mesesExtrapolados.length > 0 ? `
                <div class="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-lg">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center text-lg shrink-0">
                            ⚠️
                        </div>
                        <div>
                            <h4 class="text-xs sm:text-sm font-bold text-amber-300">
                                Alerta de Extrapolação Futura: ${mesesExtrapolados.length} mês(es) projetados ultrapassam seu teto!
                            </h4>
                            <p class="text-[11px] text-zinc-300">
                                Meses com sobrecarga: ${mesesExtrapolados.map(m => `<span class="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] mr-1">${m.mes_nome} (+R$ ${parseFloat(m.excesso).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})</span>`).join('')}
                            </p>
                        </div>
                    </div>
                    <button type="button" onclick="PersonalFinance.setSubView('projecao')" class="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs rounded-full transition-all shrink-0">
                        Visualizar Cronograma
                    </button>
                </div>
            ` : '')}

            <!-- ========================================================
                 KPI CARDS: VISÃO INTEGRADA (DESPESAS + PATRIMÔNIO ECONOMIZADO)
                 ======================================================== -->
            <div class="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <!-- Teto Mensal Planejado -->
                <div class="glass-card rounded-2xl p-4 space-y-1 border border-white/5 bg-white/[0.02]">
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Teto de Gastos</span>
                        <button type="button" onclick="PersonalFinance.abrirModalConfig()" class="text-xs text-lime-400 hover:text-white transition-colors" title="Ajustar teto">⚙️</button>
                    </div>
                    <p class="text-xl sm:text-2xl font-black text-white font-mono">
                        R$ ${teto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p class="text-[10px] text-zinc-500 truncate">Renda: R$ ${parseFloat(configData.renda_mensal_estimada || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p>
                </div>

                <!-- Custos Fixos Mensais (Aluguel, etc.) -->
                <div class="glass-card rounded-2xl p-4 space-y-1 border border-white/5 bg-white/[0.02]">
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Custos Fixos</span>
                        <span class="text-cyan-400 text-sm">🏠</span>
                    </div>
                    <p class="text-xl sm:text-2xl font-black text-cyan-400 font-mono">
                        R$ ${fixos.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p class="text-[10px] text-zinc-500 truncate">Aluguel, contas recorrentes</p>
                </div>

                <!-- Parcelas de Metas no Mês (Geladeira, etc.) -->
                <div class="glass-card rounded-2xl p-4 space-y-1 border border-white/5 bg-white/[0.02]">
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Parcelas de Metas</span>
                        <span class="text-purple-400 text-sm">💳</span>
                    </div>
                    <p class="text-xl sm:text-2xl font-black text-purple-300 font-mono">
                        R$ ${parcelasMes.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p class="text-[10px] text-zinc-500 truncate">Saldo restante: R$ ${dividaRestante.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p>
                </div>

                <!-- Margem / Saldo Livre Mensal -->
                <div class="glass-card rounded-2xl p-4 space-y-1 border ${saldoLivre < 0 ? 'border-red-500/30 bg-red-500/[0.04]' : 'border-emerald-500/20 bg-emerald-500/[0.02]'}">
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] ${saldoLivre < 0 ? 'text-red-400' : 'text-emerald-400'} uppercase font-bold tracking-wider">Margem Livre</span>
                        <span class="text-sm">${saldoLivre < 0 ? '⚠️' : '💎'}</span>
                    </div>
                    <p class="text-xl sm:text-2xl font-black ${saldoLivre < 0 ? 'text-red-400 font-bold' : 'text-emerald-400'} font-mono">
                        R$ ${saldoLivre.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <div class="flex items-center gap-1.5 text-[10px] ${saldoLivre < 0 ? 'text-red-400' : 'text-zinc-400'}">
                        <span>${pctComprometido}% do teto</span>
                    </div>
                </div>

                <!-- Patrimônio Total Economizado / Investimentos -->
                <div class="col-span-2 lg:col-span-1 glass-card rounded-2xl p-4 space-y-1 border border-lime-400/20 bg-lime-400/[0.03] cursor-pointer hover:border-lime-400/40 transition-all" onclick="PersonalFinance.setSubView('investimentos')" title="Clique para ver os investimentos detalhados">
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] text-lime-400 uppercase font-extrabold tracking-wider">Economias & Investimentos</span>
                        <span class="text-lime-400 text-sm">💰</span>
                    </div>
                    <p class="text-xl sm:text-2xl font-black text-lime-400 font-mono">
                        R$ ${patrimonioTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <div class="flex items-center justify-between text-[10px] text-zinc-400">
                        <span class="text-emerald-400 font-semibold">+R$ ${lucroTotal.toLocaleString('pt-BR', { minimumFractionDigits: 0 })} rend.</span>
                        <span class="text-zinc-500 font-mono">${investimentosList.length} ativos</span>
                    </div>
                </div>
            </div>

            <!-- ========================================================
                 SUB-ABAS: ITENS & METAS | INVESTIMENTOS | FLUXO FUTURO | SIMULADOR
                 ======================================================== -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-white/5">
                <div class="inline-flex p-1 bg-zinc-900/90 rounded-full border border-white/10 gap-1 shadow-lg backdrop-blur-md self-start flex-wrap">
                    <button type="button" onclick="PersonalFinance.setSubView('dashboard')" class="px-4 py-1.5 rounded-full text-xs font-bold transition-all ${currentSubView === 'dashboard' ? 'glass-pill-active text-lime-400' : 'text-zinc-400 hover:text-white'} flex items-center gap-1.5">
                        <svg class="w-3.5 h-3.5 text-lime-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                        <span>Dashboard</span>
                    </button>
                    <button type="button" onclick="PersonalFinance.setSubView('itens')" class="px-4 py-1.5 rounded-full text-xs font-bold transition-all ${currentSubView === 'itens' ? 'glass-pill-active' : 'text-zinc-400 hover:text-white'} flex items-center gap-1.5">
                        <svg class="w-3.5 h-3.5 text-lime-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
                        <span>Fixos & Metas (${itensList.length})</span>
                    </button>
                    <button type="button" onclick="PersonalFinance.setSubView('investimentos')" class="px-4 py-1.5 rounded-full text-xs font-bold transition-all ${currentSubView === 'investimentos' ? 'glass-pill-active text-lime-400' : 'text-zinc-400 hover:text-white'} flex items-center gap-1.5">
                        <span class="text-sm">💰</span>
                        <span>Investimentos & Economias (${investimentosList.length})</span>
                    </button>
                    <button type="button" onclick="PersonalFinance.setSubView('projecao')" class="px-4 py-1.5 rounded-full text-xs font-bold transition-all ${currentSubView === 'projecao' ? 'glass-pill-active' : 'text-zinc-400 hover:text-white'} flex items-center gap-1.5">
                        <svg class="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                        <span>Previsão 12 Meses</span>
                        ${mesesExtrapolados.length > 0 ? `<span class="px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[9px] font-black">${mesesExtrapolados.length}</span>` : ''}
                    </button>
                    <button type="button" onclick="PersonalFinance.setSubView('simulador')" class="px-4 py-1.5 rounded-full text-xs font-bold transition-all ${currentSubView === 'simulador' ? 'glass-pill-active' : 'text-zinc-400 hover:text-white'} flex items-center gap-1.5">
                        <svg class="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                        <span>Simulador ("Posso Comprar?")</span>
                    </button>
                </div>

                <div class="flex items-center gap-2 self-end sm:self-auto">
                    ${currentSubView === 'investimentos' ? `
                        <button type="button" onclick="PersonalFinance.abrirModalNovoInvestimento()" class="px-4 py-2 bg-lime-400 hover:bg-lime-300 text-zinc-950 font-extrabold text-xs rounded-full shadow-lg shadow-lime-400/20 transition-all flex items-center gap-1.5 active:scale-95">
                            <span>+ Novo Investimento / Reserva</span>
                        </button>
                    ` : `
                        <button type="button" onclick="PersonalFinance.abrirModalNovoItem()" class="px-4 py-2 bg-lime-400 hover:bg-lime-300 text-zinc-950 font-extrabold text-xs rounded-full shadow-lg shadow-lime-400/20 transition-all flex items-center gap-1.5 active:scale-95">
                            <span>+ Nova Despesa ou Compra</span>
                        </button>
                    `}
                </div>
            </div>
        `;

        if (currentSubView === 'dashboard') {
            html += renderSubViewDashboard();
        } else if (currentSubView === 'itens') {
            html += renderSubViewItens();
        } else if (currentSubView === 'investimentos') {
            html += renderSubViewInvestimentos();
        } else if (currentSubView === 'projecao') {
            html += renderSubViewProjecao();
        } else if (currentSubView === 'simulador') {
            html += renderSubViewSimulador();
        }

        container.innerHTML = html;
    }


    // ========================================================
    // SEÇÃO DE DASHBOARD EXECUTIVO PESSOAL
    // ========================================================
    function renderSubViewDashboard() {
        const d = dashboardData || {};
        const kpis = d.kpis || {};
        const destinacao = d.destinacao_renda || [];
        const projecao = d.projecao_patrimonial || [];
        const insights = d.insights || [];

        const patLiq = parseFloat(kpis.patrimonio_liquido_real ?? ((resumoInvestimentosData.kpis?.patrimonio_total || 0) - (resumoData.total_divida_parcelada_restante || 0)));
        const patBruto = parseFloat(kpis.patrimonio_bruto_investido ?? (resumoInvestimentosData.kpis?.patrimonio_total || 0));
        const dividaRestante = parseFloat(kpis.total_divida_parcelada_restante ?? (resumoData.total_divida_parcelada_restante || 0));
        const lucroTotal = parseFloat(kpis.lucro_acumulado_investimentos ?? (resumoInvestimentosData.kpis?.lucro_acumulado || 0));
        const renda = parseFloat(kpis.renda_mensal ?? (configData.renda_mensal_estimada || 6000));
        const teto = parseFloat(kpis.teto_gastos_mensal ?? (configData.teto_gastos_mensal || 5000));
        const fixos = parseFloat(kpis.total_fixos_mensais ?? (resumoData.total_fixos_mensais || 0));
        const parcelasMes = parseFloat(kpis.total_parcelas_mes ?? (resumoData.total_parcelas_mes_atual || 0));
        const comprometido = parseFloat(kpis.total_comprometido_mes ?? (fixos + parcelasMes));
        const saldoLivre = parseFloat(kpis.saldo_livre_mes ?? (renda - comprometido));
        const aporteMensal = parseFloat(kpis.aporte_mensal_total ?? (resumoInvestimentosData.kpis?.aporte_mensal_total || 0));
        const reservaTotal = parseFloat(kpis.reserva_total ?? (resumoInvestimentosData.kpis?.reserva_total || 0));
        const mesesCobertura = parseFloat(kpis.meses_cobertura_reserva ?? (fixos > 0 ? reservaTotal / fixos : 0)).toFixed(1);
        const taxaPoupanca = parseFloat(kpis.taxa_poupanca_pct ?? (renda > 0 ? (aporteMensal / renda) * 100 : 0)).toFixed(1);
        const rentMedia = parseFloat(kpis.rentabilidade_media_anual ?? (resumoInvestimentosData.kpis?.rentabilidade_media || 0)).toFixed(2);
        const score = parseInt(kpis.saude_score ?? 85, 10);
        const scoreLabel = kpis.saude_label || (score >= 80 ? 'Excelente' : (score >= 60 ? 'Equilibrada' : 'Atenção'));
        const scoreCor = kpis.saude_cor || (score >= 80 ? 'emerald' : (score >= 60 ? 'lime' : 'amber'));

        let maxPatrimonio = 1;
        projecao.forEach(p => {
            const v = Math.max(parseFloat(p.patrimonio_bruto || 0), parseFloat(p.patrimonio_liquido || 0));
            if (v > maxPatrimonio) maxPatrimonio = v;
        });

        const badgeCorClasses = {
            emerald: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
            lime: 'bg-lime-400/15 text-lime-400 border-lime-400/30',
            amber: 'bg-amber-400/15 text-amber-400 border-amber-400/30',
            rose: 'bg-rose-500/15 text-rose-400 border-rose-500/30'
        }[scoreCor] || 'bg-lime-400/15 text-lime-400 border-lime-400/30';

        return `
            <div class="space-y-6 animate-fadeIn">
                <!-- 1. Hero Snapshot: 4 KPIs Estruturantes -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <!-- Card 1: Patrimônio Líquido Real -->
                    <div class="glass-card rounded-3xl p-5 space-y-2 border border-white/10 relative overflow-hidden group hover:border-lime-400/40 transition-all">
                        <div class="flex items-center justify-between">
                            <span class="text-[10px] text-zinc-400 uppercase font-extrabold tracking-wider">Patrimônio Líquido Real</span>
                            <span class="p-2 rounded-2xl bg-white/5 text-lime-400 text-sm">💎</span>
                        </div>
                        <p class="text-2xl sm:text-3xl font-black ${patLiq >= 0 ? 'text-white' : 'text-red-400'} font-mono">
                            R$ ${patLiq.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <div class="space-y-1 pt-1 border-t border-white/5 text-[11px]">
                            <div class="flex items-center justify-between text-zinc-400">
                                <span>Ativos Brutos:</span>
                                <span class="font-bold text-lime-400 font-mono">R$ ${patBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div class="flex items-center justify-between text-zinc-400">
                                <span>Dívidas Parceladas:</span>
                                <span class="font-bold text-rose-400 font-mono">-R$ ${dividaRestante.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Card 2: Score de Saúde Financeira -->
                    <div class="glass-card rounded-3xl p-5 space-y-2 border border-white/10 relative overflow-hidden group hover:border-lime-400/40 transition-all">
                        <div class="flex items-center justify-between">
                            <span class="text-[10px] text-zinc-400 uppercase font-extrabold tracking-wider">Saúde Financeira</span>
                            <span class="p-2 rounded-2xl bg-white/5 text-sm">🩺</span>
                        </div>
                        <div class="flex items-baseline gap-2">
                            <span class="text-3xl sm:text-4xl font-black text-white font-mono">${score}</span>
                            <span class="text-xs text-zinc-500 font-bold">/ 100</span>
                            <span class="ml-auto text-[10px] px-2.5 py-0.5 rounded-full border font-extrabold uppercase tracking-wide ${badgeCorClasses}">
                                ${escapeHtml(scoreLabel)}
                            </span>
                        </div>
                        <div class="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                            <div class="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-orange-500 via-amber-400 to-lime-400" style="width: ${Math.min(100, Math.max(5, score))}%"></div>
                        </div>
                        <p class="text-[10px] text-zinc-400">
                            ${score >= 80 ? 'Finanças blindadas com bom controle de teto e aportes contínuos.' : 'Oportunidade para acelerar quitação de parcelas e reforçar a reserva.'}
                        </p>
                    </div>

                    <!-- Card 3: Cobertura da Reserva -->
                    <div class="glass-card rounded-3xl p-5 space-y-2 border border-white/10 relative overflow-hidden group hover:border-lime-400/40 transition-all">
                        <div class="flex items-center justify-between">
                            <span class="text-[10px] text-zinc-400 uppercase font-extrabold tracking-wider">Reserva de Emergência</span>
                            <span class="p-2 rounded-2xl bg-white/5 text-emerald-400 text-sm">🛡️</span>
                        </div>
                        <p class="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
                            ${mesesCobertura} <span class="text-xs font-bold text-zinc-400">meses</span>
                        </p>
                        <div class="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-white/5">
                            <span>Saldo Guardado:</span>
                            <span class="font-bold text-white font-mono">R$ ${reservaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <p class="text-[10px] ${parseFloat(mesesCobertura) >= 6 ? 'text-emerald-400' : 'text-amber-400'} font-semibold">
                            ${parseFloat(mesesCobertura) >= 6 ? '✅ Tranquilidade total (meta de 6 meses cumprida)' : '⚠️ Abaixo da meta sugerida de 6 meses de custos fixos'}
                        </p>
                    </div>

                    <!-- Card 4: Taxa de Poupança & Aportes -->
                    <div class="glass-card rounded-3xl p-5 space-y-2 border border-white/10 relative overflow-hidden group hover:border-lime-400/40 transition-all">
                        <div class="flex items-center justify-between">
                            <span class="text-[10px] text-zinc-400 uppercase font-extrabold tracking-wider">Taxa de Aporte & Poupança</span>
                            <span class="p-2 rounded-2xl bg-white/5 text-lime-400 text-sm">📈</span>
                        </div>
                        <p class="text-2xl sm:text-3xl font-black text-lime-400 font-mono">
                            ${taxaPoupanca}% <span class="text-xs font-bold text-zinc-400">da renda</span>
                        </p>
                        <div class="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-white/5">
                            <span>Aporte Mensal:</span>
                            <span class="font-bold text-white font-mono">R$ ${aporteMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês</span>
                        </div>
                        <p class="text-[10px] text-zinc-400">
                            Rentabilidade média da carteira: <strong class="text-lime-400 font-mono">${rentMedia}% a.a.</strong>
                        </p>
                    </div>
                </div>

                <!-- 2. Balanço Visual da Renda Mensal (Destinação 100%) -->
                <div class="glass-card rounded-3xl p-5 sm:p-6 space-y-5 border border-white/10">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h4 class="text-sm font-extrabold text-white flex items-center gap-2">
                                🎯 Destinação da Renda Estimada
                                <span class="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-zinc-300 font-mono">R$ ${renda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </h4>
                            <p class="text-xs text-zinc-400">Visualização de como cada real da receita é distribuído entre despesas fixas, compras parceladas, investimentos e sobra livre.</p>
                        </div>
                        <div class="flex items-center gap-2">
                            <button type="button" onclick="PersonalFinance.abrirModalConfig()" class="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 rounded-full text-xs font-bold transition-all">
                                ⚙️ Ajustar Renda & Teto
                            </button>
                        </div>
                    </div>

                    <!-- Multi-segment Progress Bar -->
                    <div class="w-full h-4 bg-zinc-900 rounded-full overflow-hidden p-0.5 border border-white/10 flex">
                        ${(destinacao.length > 0 ? destinacao : [
                            { rotulo: 'Custos Fixos', valor: fixos, pct: (renda > 0 ? (fixos/renda)*100 : 0), cor: 'cyan' },
                            { rotulo: 'Parcelamentos', valor: parcelasMes, pct: (renda > 0 ? (parcelasMes/renda)*100 : 0), cor: 'purple' },
                            { rotulo: 'Aportes', valor: aporteMensal, pct: (renda > 0 ? (aporteMensal/renda)*100 : 0), cor: 'lime' },
                            { rotulo: 'Margem Livre', valor: Math.max(0, saldoLivre), pct: (renda > 0 ? (Math.max(0, saldoLivre)/renda)*100 : 0), cor: 'emerald' }
                        ]).map(item => {
                            const pct = Math.max(0, Math.min(100, parseFloat(item.pct || 0)));
                            if (pct <= 0) return '';
                            const bgCor = {
                                cyan: 'bg-cyan-400',
                                purple: 'bg-purple-400',
                                lime: 'bg-lime-400',
                                emerald: 'bg-emerald-400',
                                rose: 'bg-rose-500'
                            }[item.cor] || 'bg-lime-400';
                            return `<div class="${bgCor} h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full" style="width: ${pct}%" title="${escapeHtml(item.rotulo)}: ${pct.toFixed(1)}% (R$ ${parseFloat(item.valor).toLocaleString('pt-BR')})"></div>`;
                        }).join('')}
                    </div>

                    <!-- 4 Buckets Cards -->
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                        ${(destinacao.length > 0 ? destinacao : [
                            { rotulo: 'Custos Fixos', valor: fixos, pct: (renda > 0 ? (fixos/renda)*100 : 0), cor: 'cyan' },
                            { rotulo: 'Parcelamentos & Metas', valor: parcelasMes, pct: (renda > 0 ? (parcelasMes/renda)*100 : 0), cor: 'purple' },
                            { rotulo: 'Aportes & Economias', valor: aporteMensal, pct: (renda > 0 ? (aporteMensal/renda)*100 : 0), cor: 'lime' },
                            { rotulo: 'Margem Livre', valor: Math.max(0, saldoLivre), pct: (renda > 0 ? (Math.max(0, saldoLivre)/renda)*100 : 0), cor: 'emerald' }
                        ]).map(item => {
                            const corClasses = {
                                cyan: { text: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/20' },
                                purple: { text: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20' },
                                lime: { text: 'text-lime-400', bg: 'bg-lime-400/10', border: 'border-lime-400/20' },
                                emerald: { text: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' },
                                rose: { text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' }
                            }[item.cor] || { text: 'text-white', bg: 'bg-white/5', border: 'border-white/10' };

                            return `
                                <div class="p-3.5 rounded-2xl ${corClasses.bg} border ${corClasses.border} space-y-1">
                                    <div class="flex items-center justify-between">
                                        <span class="text-[11px] font-bold ${corClasses.text}">${escapeHtml(item.rotulo)}</span>
                                        <span class="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-md bg-white/5 text-white">${parseFloat(item.pct).toFixed(1)}%</span>
                                    </div>
                                    <p class="text-base sm:text-lg font-black text-white font-mono">
                                        R$ ${parseFloat(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>

                <!-- 3. Curva Patrimonial & Desalavancagem 12 Meses -->
                <div class="glass-card rounded-3xl p-5 sm:p-6 space-y-4 border border-white/10">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                            <h4 class="text-sm font-extrabold text-white flex items-center gap-2">
                                📊 Curva de Evolução Patrimonial (12 Meses)
                                <span class="text-[10px] px-2 py-0.5 rounded-full bg-lime-400/10 text-lime-400 border border-lime-400/20 font-bold uppercase tracking-wider">Patrimônio Líquido Real</span>
                            </h4>
                            <p class="text-xs text-zinc-400">Projeção mês a mês considerando amortização de parcelas e aportes acumulados com juros compostos.</p>
                        </div>
                        <div class="flex items-center gap-3 text-[11px]">
                            <div class="flex items-center gap-1.5">
                                <span class="w-2.5 h-2.5 rounded-sm bg-lime-400"></span>
                                <span class="text-zinc-300">Líquido</span>
                            </div>
                            <div class="flex items-center gap-1.5">
                                <span class="w-2.5 h-2.5 rounded-sm bg-cyan-400"></span>
                                <span class="text-zinc-300">Bruto</span>
                            </div>
                            <div class="flex items-center gap-1.5">
                                <span class="w-2.5 h-2.5 rounded-sm bg-rose-400"></span>
                                <span class="text-zinc-300">Dívidas</span>
                            </div>
                        </div>
                    </div>

                    <!-- Bar Chart Visualizer -->
                    <div class="pt-4 pb-2 overflow-x-auto">
                        <div class="min-w-[620px] flex items-end justify-between gap-2 h-44 px-2 border-b border-white/10">
                            ${(projecao.length > 0 ? projecao : [
                                { rotulo: 'Atual', patrimonio_liquido: patLiq, patrimonio_bruto: patBruto, divida_restante: dividaRestante }
                            ]).map((p, idx) => {
                                const pLiq = parseFloat(p.patrimonio_liquido || 0);
                                const pBruto = parseFloat(p.patrimonio_bruto || 0);
                                const pDiv = parseFloat(p.divida_restante || 0);
                                const heightPct = maxPatrimonio > 0 ? Math.max(12, Math.min(100, (pLiq / maxPatrimonio) * 100)) : 12;
                                const isCurrent = idx === 0;

                                return `
                                    <div class="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group cursor-pointer" title="${p.rotulo}: Líquido R$ ${pLiq.toLocaleString('pt-BR')}, Bruto R$ ${pBruto.toLocaleString('pt-BR')}, Dívida -R$ ${pDiv.toLocaleString('pt-BR')}">
                                        <div class="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-mono font-bold text-lime-400 text-center whitespace-nowrap mb-1">
                                            R$ ${(pLiq / 1000).toFixed(1)}k
                                        </div>

                                        <div class="w-full max-w-[36px] bg-white/5 rounded-t-xl overflow-hidden flex flex-col justify-end p-0.5 border ${isCurrent ? 'border-lime-400 shadow-lg shadow-lime-400/20' : 'border-white/10 group-hover:border-white/30'} transition-all" style="height: ${heightPct}%">
                                            <div class="w-full bg-gradient-to-t from-lime-500 to-emerald-400 rounded-t-lg transition-all" style="height: 100%"></div>
                                        </div>

                                        <span class="text-[10px] font-mono ${isCurrent ? 'text-lime-400 font-extrabold' : 'text-zinc-400'} pt-1">
                                            ${p.rotulo}
                                        </span>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>

                    ${projecao.length >= 2 ? `
                        <div class="flex items-center justify-between text-xs text-zinc-400 pt-1">
                            <span>Início: <strong class="text-white font-mono">R$ ${parseFloat(projecao[0].patrimonio_liquido).toLocaleString('pt-BR')}</strong></span>
                            <span class="text-emerald-400 font-bold flex items-center gap-1">
                                🚀 Crescimento em 12m: +R$ ${(parseFloat(projecao[projecao.length - 1].patrimonio_liquido) - parseFloat(projecao[0].patrimonio_liquido)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                            <span>Projetado: <strong class="text-lime-400 font-mono">R$ ${parseFloat(projecao[projecao.length - 1].patrimonio_liquido).toLocaleString('pt-BR')}</strong></span>
                        </div>
                    ` : ''}
                </div>

                <!-- 4. Insights Inteligentes do Copilot & Ações Rápidas -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <!-- Coluna de Insights Inteligentes (2 cols) -->
                    <div class="lg:col-span-2 glass-card rounded-3xl p-5 space-y-3.5 border border-white/10">
                        <div class="flex items-center justify-between">
                            <h4 class="text-sm font-extrabold text-white flex items-center gap-2">
                                🧠 Copilot Financeiro AIRES
                                <span class="text-[9px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-bold uppercase tracking-wider">Diagnóstico</span>
                            </h4>
                            <span class="text-xs text-zinc-400">${insights.length} observações</span>
                        </div>

                        <div class="space-y-2.5">
                            ${insights.length === 0 ? `
                                <div class="p-4 rounded-2xl bg-white/5 border border-white/5 text-center text-xs text-zinc-400">
                                    Nenhuma pendência ou extrapolação detectada. Suas finanças estão dentro do padrão planejado!
                                </div>
                            ` : insights.map(ins => {
                                const iconColors = {
                                    alerta: 'bg-red-500/15 text-red-400 border-red-500/30',
                                    sucesso: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
                                    info: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
                                    meta: 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                                }[ins.tipo] || 'bg-white/5 text-white border-white/10';

                                return `
                                    <div class="p-3.5 rounded-2xl bg-zinc-900/60 border border-white/5 flex items-start gap-3 hover:border-white/15 transition-all">
                                        <div class="w-8 h-8 rounded-xl ${iconColors} border flex items-center justify-center shrink-0 text-sm">
                                            ${ins.icone || '💡'}
                                        </div>
                                        <div class="flex-1 min-w-0">
                                            <h5 class="text-xs font-bold text-white">${escapeHtml(ins.titulo)}</h5>
                                            <p class="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">${escapeHtml(ins.descricao)}</p>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>

                    <!-- Coluna de Ações Rápidas & Navegação (1 col) -->
                    <div class="glass-card rounded-3xl p-5 space-y-4 border border-white/10 flex flex-col justify-between">
                        <div class="space-y-3">
                            <h4 class="text-sm font-extrabold text-white flex items-center gap-2">
                                ⚡ Ações Rápidas
                            </h4>
                            <p class="text-xs text-zinc-400">Atalhos imediatos para movimentar ou planejar suas contas.</p>

                            <div class="space-y-2 pt-1">
                                <button type="button" onclick="PersonalFinance.abrirModalNovoInvestimento()" class="w-full py-2.5 px-3.5 rounded-2xl bg-lime-400 hover:bg-lime-300 text-zinc-950 font-extrabold text-xs shadow-lg shadow-lime-400/20 flex items-center justify-center gap-2 transition-all active:scale-95">
                                    <span>💰 Registrar Aporte ou Reserva</span>
                                </button>
                                <button type="button" onclick="PersonalFinance.abrirModalNovoItem()" class="w-full py-2.5 px-3.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs border border-white/10 flex items-center justify-center gap-2 transition-all active:scale-95">
                                    <span>➕ Nova Despesa ou Compra</span>
                                </button>
                                <button type="button" onclick="PersonalFinance.setSubView('simulador')" class="w-full py-2.5 px-3.5 rounded-2xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white font-semibold text-xs border border-white/5 flex items-center justify-center gap-2 transition-all">
                                    <span>🧮 Simular Compra Parcelada</span>
                                </button>
                                <button type="button" onclick="PersonalFinance.setSubView('projecao')" class="w-full py-2.5 px-3.5 rounded-2xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white font-semibold text-xs border border-white/5 flex items-center justify-center gap-2 transition-all">
                                    <span>📅 Ver Fluxo Mensal Detalhado</span>
                                </button>
                            </div>
                        </div>

                        <!-- Micro Card Resumo Rápido -->
                        <div class="p-3 rounded-2xl bg-white/[0.02] border border-white/5 text-[11px] text-zinc-400 space-y-1">
                            <div class="flex justify-between">
                                <span>Comprometido este mês:</span>
                                <span class="font-mono font-bold text-white">R$ ${comprometido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div class="flex justify-between">
                                <span>Margem livre este mês:</span>
                                <span class="font-mono font-bold ${saldoLivre >= 0 ? 'text-emerald-400' : 'text-red-400'}">R$ ${saldoLivre.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // ========================================================
    // SEÇÃO DE INVESTIMENTOS & ECONOMIAS
    // ========================================================
    function renderSubViewInvestimentos() {
        const invKpis = resumoInvestimentosData.kpis || {};
        const patrimonioTotal = parseFloat(invKpis.patrimonio_total || 0);
        const totalAplicado = parseFloat(invKpis.total_aplicado || 0);
        const lucroTotal = parseFloat(invKpis.lucro_acumulado || 0);
        const rentMedia = parseFloat(invKpis.rentabilidade_media || 0).toFixed(2);
        const aporteMensal = parseFloat(invKpis.aporte_mensal_total || 0);
        const reservaTotal = parseFloat(invKpis.reserva_total || 0);
        const reservaMeta = parseFloat(invKpis.reserva_meta || 0);
        const reservaPct = parseFloat(invKpis.reserva_progresso_pct || 0).toFixed(1);
        const distribuicao = resumoInvestimentosData.distribuicao || [];
        const ultimasMov = resumoInvestimentosData.ultimas_movimentacoes || [];

        let html = `
            <div class="space-y-4 my-3">
                <!-- Banner de Destaque da Reserva & Patrimônio -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    <!-- Card Reserva de Emergência -->
                    <div class="glass-card rounded-3xl p-5 border border-emerald-500/30 bg-emerald-500/[0.03] space-y-3">
                        <div class="flex items-center justify-between">
                            <span class="text-[10px] text-emerald-400 uppercase font-black tracking-wider flex items-center gap-1.5">
                                <span>🛡️</span> RESERVA DE EMERGÊNCIA
                            </span>
                            <span class="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                                ${reservaPct}% da meta
                            </span>
                        </div>
                        <div>
                            <p class="text-2xl font-black text-white font-mono">
                                R$ ${reservaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                            <p class="text-[11px] text-zinc-400 mt-0.5">Meta planejada: R$ ${reservaMeta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div class="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                            <div class="bg-gradient-to-r from-emerald-500 to-lime-400 h-2 rounded-full transition-all" style="width: ${Math.min(100, reservaPct)}%"></div>
                        </div>
                    </div>

                    <!-- Card Rendimento Acumulado -->
                    <div class="glass-card rounded-3xl p-5 border border-lime-400/20 bg-lime-400/[0.02] space-y-3">
                        <div class="flex items-center justify-between">
                            <span class="text-[10px] text-lime-400 uppercase font-black tracking-wider flex items-center gap-1.5">
                                <span>📈</span> RENDIMENTO TOTAL ACUMULADO
                            </span>
                            <span class="px-2 py-0.5 rounded-full bg-lime-400/20 text-lime-300 text-[10px] font-mono font-bold">
                                +${rentMedia}%
                            </span>
                        </div>
                        <div>
                            <p class="text-2xl font-black text-lime-400 font-mono">
                                +R$ ${lucroTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                            <p class="text-[11px] text-zinc-400 mt-0.5">Total de capital aportado: R$ ${totalAplicado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div class="text-[10px] text-zinc-400 flex items-center gap-1">
                            <span>💡 Seu dinheiro economizado está trabalhando por você.</span>
                        </div>
                    </div>

                    <!-- Card Aporte Mensal Planejado -->
                    <div class="glass-card rounded-3xl p-5 border border-cyan-500/20 bg-cyan-500/[0.02] space-y-3">
                        <div class="flex items-center justify-between">
                            <span class="text-[10px] text-cyan-400 uppercase font-black tracking-wider flex items-center gap-1.5">
                                <span>🎯</span> APORTE MENSAL PLANEJADO
                            </span>
                            <span class="text-cyan-400 text-sm">🔄</span>
                        </div>
                        <div>
                            <p class="text-2xl font-black text-cyan-300 font-mono">
                                R$ ${aporteMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                <span class="text-xs text-zinc-400 font-normal">/mês</span>
                            </p>
                            <p class="text-[11px] text-zinc-400 mt-0.5">Alocado mensalmente a partir da sua margem livre.</p>
                        </div>
                        <div class="text-[10px] text-zinc-400 flex items-center gap-1">
                            <span>Soma de todos os aportes mensais recorrentes.</span>
                        </div>
                    </div>
                </div>

                <!-- Barra de Alocação de Ativos (Portfolio Allocation Bar) -->
                ${patrimonioTotal > 0 ? `
                    <div class="glass-card rounded-3xl p-4 border border-white/5 space-y-2">
                        <div class="flex items-center justify-between text-xs font-bold text-zinc-300">
                            <span>Alocação do Patrimônio Economizado</span>
                            <span class="text-zinc-500 font-mono text-[11px]">100% alocado</span>
                        </div>
                        <div class="w-full bg-zinc-800 rounded-full h-2.5 flex overflow-hidden">
                            ${distribuicao.filter(d => d.total > 0).map(d => `
                                <div class="${TIPOS_INVESTIMENTO[d.tipo]?.bg || 'bg-lime-400'} transition-all" style="width: ${d.percentual}%" title="${escapeHtml(d.label)}: R$ ${d.total.toLocaleString('pt-BR')} (${d.percentual}%)"></div>
                            `).join('')}
                        </div>
                        <div class="flex items-center gap-3 flex-wrap pt-1 text-[10px]">
                            ${distribuicao.filter(d => d.total > 0).map(d => `
                                <span class="flex items-center gap-1 text-zinc-300">
                                    <span class="w-2 h-2 rounded-full ${TIPOS_INVESTIMENTO[d.tipo]?.bg || 'bg-lime-400'}"></span>
                                    <span>${escapeHtml(d.label)}: <strong class="text-white">${d.percentual}%</strong> (R$ ${d.total.toLocaleString('pt-BR', { minimumFractionDigits: 0 })})</span>
                                </span>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- Filtros Rápidos por Tipo de Investimento -->
                <div class="flex items-center gap-2 flex-wrap py-1">
                    <button type="button" onclick="PersonalFinance.filtrarInvestTipo('')" class="px-3 py-1 rounded-full text-xs font-bold transition-all ${currentInvestFilter.tipo === '' ? 'bg-white/10 text-white border border-white/20' : 'text-zinc-400 hover:text-white'}">
                        Todos (${investimentosList.length})
                    </button>
                    ${Object.entries(TIPOS_INVESTIMENTO).map(([k, t]) => `
                        <button type="button" onclick="PersonalFinance.filtrarInvestTipo('${k}')" class="px-3 py-1 rounded-full text-xs font-bold transition-all ${currentInvestFilter.tipo === k ? 'bg-lime-400/20 text-lime-300 border border-lime-400/40' : 'text-zinc-400 hover:text-white'}">
                            ${t.icone} ${t.label}
                        </button>
                    `).join('')}
                </div>
        `;

        if (investimentosList.length === 0) {
            html += `
                <div class="glass-card rounded-3xl p-10 text-center space-y-3 border border-white/5 my-4">
                    <div class="w-12 h-12 mx-auto rounded-2xl bg-white/5 text-zinc-400 flex items-center justify-center text-2xl">
                        💰
                    </div>
                    <h4 class="text-sm font-bold text-white">Nenhum investimento ou reserva cadastrada</h4>
                    <p class="text-xs text-zinc-400 max-w-md mx-auto">
                        Cadastre sua reserva de emergência, caixinhas, CDBs, ações ou fundos imobiliários para acompanhar seu patrimônio total e registrar seus aportes mensais.
                    </p>
                    <button type="button" onclick="PersonalFinance.abrirModalNovoInvestimento()" class="px-5 py-2.5 bg-lime-400 text-black font-extrabold text-xs rounded-full shadow-lg shadow-lime-400/20 transition-all">
                        + Cadastrar Primeiro Investimento
                    </button>
                </div>
            `;
            return html;
        }

        html += `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 my-3">
        `;

        investimentosList.forEach(inv => {
            const tipoInfo = TIPOS_INVESTIMENTO[inv.tipo] || TIPOS_INVESTIMENTO.outro;
            const vAtual = parseFloat(inv.valor_atual || 0);
            const vAplicado = parseFloat(inv.valor_aplicado || 0);
            const lucro = parseFloat(inv.lucro_reais || (vAtual - vAplicado));
            const rentPct = parseFloat(inv.rentabilidade_pct || 0).toFixed(2);
            const aporteM = parseFloat(inv.aporte_mensal || 0);
            const meta = parseFloat(inv.meta_valor || 0);
            const progressoMeta = parseFloat(inv.progresso_meta_pct || 0);
            const share = parseFloat(inv.share_pct || 0).toFixed(1);

            html += `
                <div class="glass-card rounded-3xl p-5 border border-white/10 bg-white/[0.02] hover:border-white/20 flex flex-col justify-between space-y-4 transition-all">
                    <!-- Top: Ícone, Nome e Instituição -->
                    <div class="flex items-start justify-between gap-2">
                        <div class="flex items-center gap-2.5">
                            <span class="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-lg shrink-0 shadow-sm">
                                ${tipoInfo.icone}
                            </span>
                            <div>
                                <h4 class="text-sm font-extrabold text-white truncate max-w-[190px]" title="${escapeHtml(inv.nome)}">
                                    ${escapeHtml(inv.nome)}
                                </h4>
                                <div class="flex items-center gap-1.5 text-[10px] text-zinc-400">
                                    <span class="text-zinc-200 font-semibold">${escapeHtml(inv.instituicao || 'Banco')}</span>
                                    <span>•</span>
                                    <span>${tipoInfo.label}</span>
                                </div>
                            </div>
                        </div>
                        <div class="flex flex-col items-end gap-1">
                            <span class="px-2 py-0.5 rounded-full bg-white/5 text-zinc-300 text-[9px] font-mono font-bold">${share}% da carteira</span>
                            <span class="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-300 text-[9px] font-mono">${inv.liquidez || 'D+0'}</span>
                        </div>
                    </div>

                    <!-- Saldo Atual & Rentabilidade -->
                    <div class="p-3.5 rounded-2xl bg-zinc-950/40 border border-white/5 space-y-2">
                        <div class="flex items-baseline justify-between">
                            <span class="text-[10px] text-zinc-400 uppercase font-semibold">Saldo Acumulado</span>
                            <span class="text-xl font-black text-white font-mono">
                                R$ ${vAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                        </div>

                        <div class="flex items-center justify-between text-[11px] pt-1 border-t border-white/5">
                            <span class="text-zinc-400">Lucro / Rendimento:</span>
                            <span class="font-mono ${lucro >= 0 ? 'text-emerald-400' : 'text-red-400'} font-bold">
                                ${lucro >= 0 ? '+' : ''}R$ ${lucro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${rentPct}%)
                            </span>
                        </div>

                        ${meta > 0 ? `
                            <div class="space-y-1 pt-1 border-t border-white/5">
                                <div class="flex items-center justify-between text-[10px] text-zinc-400">
                                    <span>Meta: <strong>R$ ${meta.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</strong></span>
                                    <span class="text-lime-400 font-mono font-bold">${progressoMeta}%</span>
                                </div>
                                <div class="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                                    <div class="bg-lime-400 h-1.5 rounded-full transition-all" style="width: ${progressoMeta}%"></div>
                                </div>
                            </div>
                        ` : ''}

                        <div class="flex items-center justify-between text-[10px] text-zinc-500 pt-1">
                            <span>Aporte Mensal: <strong class="text-zinc-300 font-mono">R$ ${aporteM.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}/mês</strong></span>
                            <span>Rent. Estimada: <strong class="text-lime-400 font-mono">${inv.rentabilidade_anual}% a.a.</strong></span>
                        </div>
                    </div>

                    <!-- Rodapé com Ações de Aporte, Resgate e Edição -->
                    <div class="flex items-center justify-between pt-1 border-t border-white/5">
                        <div class="flex items-center gap-1.5">
                            <button type="button" onclick="PersonalFinance.abrirModalMovimentacao(${inv.id}, 'aporte')" class="px-2.5 py-1 bg-lime-400/20 hover:bg-lime-400/30 text-lime-300 border border-lime-400/30 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1" title="Registrar novo aporte economizado">
                                <span>+ Aporte</span>
                            </button>
                            <button type="button" onclick="PersonalFinance.abrirModalMovimentacao(${inv.id}, 'resgate')" class="px-2 py-1 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-xl text-[10px] font-semibold transition-all" title="Registrar resgate">
                                <span>- Resgate</span>
                            </button>
                        </div>
                        <div class="flex items-center gap-1">
                            <button type="button" onclick="PersonalFinance.abrirModalEditarInvestimento(${inv.id})" class="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-all" title="Editar">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                            </button>
                            <button type="button" onclick="PersonalFinance.excluirInvestimento(${inv.id})" class="p-1.5 rounded-lg text-red-400/70 hover:text-red-300 hover:bg-red-500/10 transition-all" title="Excluir">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        html += `
            </div>
        `;

        // Histórico de Últimas Movimentações
        if (ultimasMov.length > 0) {
            html += `
                <div class="glass-card rounded-3xl p-5 border border-white/5 space-y-3 mt-6">
                    <h5 class="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                        <span>📜</span> Histórico Recente de Aportes & Rendimentos
                    </h5>
                    <div class="divide-y divide-white/5">
                        ${ultimasMov.map(m => {
                            const isAporte = m.tipo === 'aporte';
                            const isRend = m.tipo === 'rendimento';
                            const v = parseFloat(m.valor || 0);

                            return `
                                <div class="py-2.5 flex items-center justify-between text-xs">
                                    <div class="flex items-center gap-2.5">
                                        <span class="w-7 h-7 rounded-xl ${isAporte ? 'bg-lime-400/20 text-lime-400' : (isRend ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400')} flex items-center justify-center text-xs font-bold">
                                            ${isAporte ? '+' : (isRend ? '📈' : '-')}
                                        </span>
                                        <div>
                                            <p class="font-bold text-white">${escapeHtml(m.investimento_nome)}</p>
                                            <p class="text-[10px] text-zinc-500">${m.data_movimentacao} • ${escapeHtml(m.observacoes || (isAporte ? 'Aporte' : (isRend ? 'Rendimento' : 'Resgate')))}</p>
                                        </div>
                                    </div>
                                    <span class="font-mono font-bold ${isAporte || isRend ? 'text-lime-400' : 'text-red-400'}">
                                        ${isAporte || isRend ? '+' : '-'}R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }

        html += `</div>`;
        return html;
    }

    function renderSubViewItens() {
        let html = `
            <!-- Filtros Rápidos -->
            <div class="flex items-center gap-2 flex-wrap py-2">
                <button type="button" onclick="PersonalFinance.filtrarTipo('')" class="px-3 py-1 rounded-full text-xs font-bold transition-all ${currentFilter.tipo === '' ? 'bg-white/10 text-white border border-white/20' : 'text-zinc-400 hover:text-white'}">
                    Todos
                </button>
                <button type="button" onclick="PersonalFinance.filtrarTipo('fixo_mensal')" class="px-3 py-1 rounded-full text-xs font-bold transition-all ${currentFilter.tipo === 'fixo_mensal' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-zinc-400 hover:text-white'}">
                    🏠 Custos Fixos (Aluguel, etc.)
                </button>
                <button type="button" onclick="PersonalFinance.filtrarTipo('parcelado')" class="px-3 py-1 rounded-full text-xs font-bold transition-all ${currentFilter.tipo === 'parcelado' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' : 'text-zinc-400 hover:text-white'}">
                    💳 Compras Parceladas (Geladeira, etc.)
                </button>
                <button type="button" onclick="PersonalFinance.filtrarTipo('avulso')" class="px-3 py-1 rounded-full text-xs font-bold transition-all ${currentFilter.tipo === 'avulso' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-zinc-400 hover:text-white'}">
                    🏷️ Gastos Avulsos
                </button>
            </div>
        `;

        if (itensList.length === 0) {
            html += `
                <div class="glass-card rounded-3xl p-10 text-center space-y-3 border border-white/5 my-4">
                    <div class="w-12 h-12 mx-auto rounded-2xl bg-white/5 text-zinc-400 flex items-center justify-center text-2xl">
                        🛒
                    </div>
                    <h4 class="text-sm font-bold text-white">Nenhuma despesa ou compra cadastrada</h4>
                    <p class="text-xs text-zinc-400 max-w-md mx-auto">
                        Cadastre seus custos fixos mensais (ex: aluguel, condomínio, internet) e suas metas de compra parceladas (ex: geladeira, viagem, eletrônicos) para ter controle total do teto orçamentário.
                    </p>
                    <button type="button" onclick="PersonalFinance.abrirModalNovoItem()" class="px-5 py-2.5 bg-lime-400 text-black font-extrabold text-xs rounded-full shadow-lg shadow-lime-400/20 transition-all">
                        + Cadastrar Primeiro Item
                    </button>
                </div>
            `;
            return html;
        }

        html += `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 my-3">
        `;

        itensList.forEach(item => {
            const catInfo = CATEGORIAS[item.categoria] || CATEGORIAS.outros;
            const isFixo = item.tipo === 'fixo_mensal';
            const isParcelado = item.tipo === 'parcelado';
            const vTotal = parseFloat(item.valor_total || 0);
            const vParc = parseFloat(item.valor_parcela || (vTotal / (item.qtd_parcelas || 1)));
            const pagas = parseInt(item.parcelas_pagas || 0, 10);
            const qtdParc = parseInt(item.qtd_parcelas || 1, 10);
            const restantes = Math.max(0, qtdParc - pagas);
            const saldoDevedor = parseFloat(item.saldo_devedor_restante || (vParc * restantes));
            const progressoPct = isParcelado && qtdParc > 0 ? Math.min(100, Math.round((pagas / qtdParc) * 100)) : 100;
            const isQuitado = item.status === 'quitado' || (isParcelado && restantes === 0);

            let tipoBadge = '';
            if (isFixo) {
                tipoBadge = `<span class="px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[9px] font-bold">🏠 FIXO MENSAL</span>`;
            } else if (isParcelado) {
                tipoBadge = `<span class="px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 text-[9px] font-bold">💳 PARCELADO ${qtdParc}X</span>`;
            } else {
                tipoBadge = `<span class="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[9px] font-bold">🏷️ AVULSO</span>`;
            }

            html += `
                <div class="glass-card rounded-3xl p-5 border ${isQuitado ? 'border-white/5 opacity-70 bg-white/[0.01]' : 'border-white/10 bg-white/[0.02] hover:border-white/20'} flex flex-col justify-between space-y-4 transition-all">
                    <!-- Top: Categoria & Status -->
                    <div class="flex items-start justify-between gap-2">
                        <div class="flex items-center gap-2.5">
                            <span class="w-9 h-9 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-base shrink-0 shadow-sm">
                                ${catInfo.icone}
                            </span>
                            <div>
                                <h4 class="text-sm font-extrabold text-white truncate max-w-[190px]" title="${escapeHtml(item.nome)}">
                                    ${escapeHtml(item.nome)}
                                </h4>
                                <span class="text-[10px] text-zinc-400 block">${catInfo.label}</span>
                            </div>
                        </div>
                        <div class="flex flex-col items-end gap-1">
                            ${tipoBadge}
                            ${isQuitado ? `<span class="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-bold">✓ QUITADO</span>` : ''}
                        </div>
                    </div>

                    <!-- Meta vinculada se houver -->
                    ${item.meta_relacionada ? `
                        <div class="px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center gap-2 text-[10px] text-zinc-300">
                            <span class="text-lime-400">🎯</span>
                            <span class="truncate">Meta: <strong>${escapeHtml(item.meta_relacionada)}</strong></span>
                        </div>
                    ` : ''}

                    <!-- Valores e Parcelamento -->
                    <div class="p-3.5 rounded-2xl bg-zinc-950/40 border border-white/5 space-y-2">
                        <div class="flex items-baseline justify-between">
                            <span class="text-[10px] text-zinc-400 uppercase font-semibold">Valor Mensal</span>
                            <span class="text-base font-black text-lime-400 font-mono">
                                R$ ${vParc.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                <span class="text-[10px] text-zinc-500 font-normal">/mês</span>
                            </span>
                        </div>

                        ${isParcelado ? `
                            <div class="space-y-1 pt-1">
                                <div class="flex items-center justify-between text-[10px] text-zinc-400">
                                    <span>Parcelas: <strong>${pagas}/${qtdParc}</strong> (${progressoPct}%)</span>
                                    <span>Restam: <strong>R$ ${saldoDevedor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></span>
                                </div>
                                <div class="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                                    <div class="bg-lime-400 h-1.5 rounded-full transition-all" style="width: ${progressoPct}%"></div>
                                </div>
                            </div>
                        ` : `
                            <div class="flex items-center justify-between text-[10px] text-zinc-400 pt-1">
                                <span>Dia do Vencimento:</span>
                                <span class="font-mono text-zinc-200">Todo dia ${item.dia_vencimento_fixo || 10}</span>
                            </div>
                        `}

                        <div class="flex items-center justify-between text-[10px] text-zinc-500 pt-1 border-t border-white/5">
                            <span>Forma: <strong class="text-zinc-300 uppercase">${escapeHtml(item.forma_pagamento)}</strong></span>
                            <span>Total: <strong class="text-zinc-200 font-mono">R$ ${vTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></span>
                        </div>
                    </div>

                    <!-- Rodapé com Ações -->
                    <div class="flex items-center justify-between pt-1 border-t border-white/5">
                        <div class="flex items-center gap-1.5">
                            ${isParcelado && !isQuitado ? `
                                <button type="button" onclick="PersonalFinance.pagarParcela(${item.id})" class="px-2.5 py-1 bg-lime-400/20 hover:bg-lime-400/30 text-lime-300 border border-lime-400/30 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1" title="Registrar pagamento da próxima parcela">
                                    <span>✓ Pagar Parcela (${pagas + 1}/${qtdParc})</span>
                                </button>
                            ` : ''}
                        </div>
                        <div class="flex items-center gap-1">
                            <button type="button" onclick="PersonalFinance.abrirModalEditarItem(${item.id})" class="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-all" title="Editar item">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                            </button>
                            <button type="button" onclick="PersonalFinance.excluirItem(${item.id})" class="p-1.5 rounded-lg text-red-400/70 hover:text-red-300 hover:bg-red-500/10 transition-all" title="Excluir item">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        html += `</div>`;
        return html;
    }

    function renderSubViewProjecao() {
        const teto = parseFloat(resumoData.teto_mensal || 5000);

        let html = `
            <div class="space-y-4 my-3">
                <div class="flex items-center justify-between flex-wrap gap-2">
                    <div>
                        <h4 class="text-sm font-extrabold text-white flex items-center gap-2">
                            📈 Cronograma Mensal Futuro (Próximos 12 Meses)
                        </h4>
                        <p class="text-xs text-zinc-400">Previsão exata de desembolsos somando custos fixos e compras parceladas de metas mês a mês.</p>
                    </div>
                    <div class="flex items-center gap-2 text-xs">
                        <span class="flex items-center gap-1.5 text-zinc-400"><span class="w-2.5 h-2.5 rounded-full bg-emerald-400"></span> Confortável (&lt;80%)</span>
                        <span class="flex items-center gap-1.5 text-zinc-400"><span class="w-2.5 h-2.5 rounded-full bg-amber-400"></span> Atenção (80-100%)</span>
                        <span class="flex items-center gap-1.5 text-zinc-400"><span class="w-2.5 h-2.5 rounded-full bg-red-400"></span> Extrapolou (&gt;100%)</span>
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
        `;

        projecaoData.forEach(mes => {
            const total = parseFloat(mes.total_previsto || 0);
            const fixos = parseFloat(mes.total_fixos || 0);
            const parcelas = parseFloat(mes.total_parcelas || 0);
            const pct = parseFloat(mes.percentual_teto || 0);
            const extrapolou = mes.extrapolou || (total > teto);
            const excesso = parseFloat(mes.valor_extrapolado || (total - teto));
            const saldoLivre = parseFloat(mes.saldo_livre || (teto - total));

            let statusCor = 'emerald';
            let barCor = 'bg-emerald-400';
            if (extrapolou) {
                statusCor = 'red';
                barCor = 'bg-red-500 animate-pulse';
            } else if (pct >= 85) {
                statusCor = 'amber';
                barCor = 'bg-amber-400';
            }

            html += `
                <div class="glass-card rounded-3xl p-4 border ${extrapolou ? 'border-red-500/40 bg-red-500/[0.04]' : 'border-white/10 bg-white/[0.02]'} space-y-3 transition-all hover:scale-[1.01]">
                    <!-- Top: Mês e Badge de Extrapolação -->
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <span class="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xs font-mono font-bold text-white">
                                ${mes.mes.split('-')[1]}
                            </span>
                            <div>
                                <h5 class="text-xs font-black text-white">${mes.mes_nome}</h5>
                                <span class="text-[9px] text-zinc-500 font-mono">${mes.mes}</span>
                            </div>
                        </div>
                        ${extrapolou ? `
                            <span class="px-2 py-0.5 rounded-full bg-red-500/30 border border-red-500/40 text-red-300 text-[9px] font-black uppercase tracking-wider animate-pulse">
                                ⚠️ EXTRAPOLOU
                            </span>
                        ` : `
                            <span class="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-bold">
                                OK (${pct}%)
                            </span>
                        `}
                    </div>

                    <!-- Total Previsto e Barra -->
                    <div class="space-y-1.5">
                        <div class="flex items-baseline justify-between">
                            <span class="text-[10px] text-zinc-400">Total Previsto</span>
                            <span class="text-base font-black ${extrapolou ? 'text-red-400' : 'text-white'} font-mono">
                                R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                        <div class="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                            <div class="${barCor} h-2 rounded-full transition-all" style="width: ${Math.min(100, pct)}%"></div>
                        </div>
                        <div class="flex items-center justify-between text-[10px]">
                            <span class="text-zinc-500">Teto: R$ ${teto.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</span>
                            <span class="${saldoLivre < 0 ? 'text-red-400 font-bold' : 'text-emerald-400'} font-mono">
                                ${saldoLivre < 0 ? `Excesso: +R$ ${excesso.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : `Livre: R$ ${saldoLivre.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                            </span>
                        </div>
                    </div>

                    <!-- Discriminação de Fixos vs Parcelas -->
                    <div class="p-2.5 rounded-xl bg-zinc-950/40 border border-white/5 space-y-1 text-[10px]">
                        <div class="flex items-center justify-between text-zinc-400">
                            <span>🏠 Fixos Mensais:</span>
                            <span class="font-mono text-zinc-200">R$ ${fixos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div class="flex items-center justify-between text-zinc-400">
                            <span>💳 Parcelas de Metas:</span>
                            <span class="font-mono text-purple-300">R$ ${parcelas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>

                    <!-- Lista de Itens no Mês -->
                    <div class="space-y-1 pt-1 border-t border-white/5">
                        <p class="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Itens caindo neste mês (${(mes.itens || []).length}):</p>
                        <div class="max-h-24 overflow-y-auto space-y-1 pr-1 overscroll-contain">
                            ${(mes.itens || []).map(it => `
                                <div class="flex items-center justify-between text-[10px] text-zinc-300 py-0.5">
                                    <span class="truncate max-w-[130px] text-zinc-300" title="${escapeHtml(it.nome)}">
                                        • ${escapeHtml(it.nome)} ${it.numero_parcela ? `<span class="text-[9px] text-zinc-500">(${it.numero_parcela}/${it.total_parcelas})</span>` : ''}
                                    </span>
                                    <span class="font-mono text-zinc-400 shrink-0">R$ ${parseFloat(it.valor).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;
        return html;
    }

    function renderSubViewSimulador() {
        const teto = parseFloat(resumoData.teto_mensal || 5000);

        let html = `
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 my-4">
                <!-- Painel do Formulário do Simulador -->
                <div class="lg:col-span-1 glass-card rounded-3xl p-6 border border-white/10 bg-white/[0.02] space-y-4">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-lg shrink-0">
                            🧮
                        </div>
                        <div>
                            <h4 class="text-sm font-extrabold text-white">Simulador "Posso Comprar?"</h4>
                            <p class="text-[11px] text-zinc-400">Verifique se uma nova compra cabe no seu orçamento sem estourar o teto.</p>
                        </div>
                    </div>

                    <form id="form-simulador-pessoal" onsubmit="PersonalFinance.executarSimulacao(event)" class="space-y-3.5">
                        <div>
                            <label class="block text-xs font-semibold text-zinc-300 mb-1">Nome da Compra / Meta *</label>
                            <input type="text" id="sim-nome" required placeholder="Ex: Geladeira Frost Free, Notebook, Viagem..." value="Geladeira Frost Free Inox" class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-lime-400/80">
                        </div>

                        <div>
                            <label class="block text-xs font-semibold text-zinc-300 mb-1">Categoria</label>
                            <select id="sim-categoria" class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-zinc-200 focus:outline-none focus:border-lime-400/80">
                                <option value="eletrodomestico" selected>🧊 Eletrodomésticos & Casa</option>
                                <option value="tecnologia">💻 Tecnologia & Gadgets</option>
                                <option value="lazer_viagem">✈️ Lazer & Viagens</option>
                                <option value="educacao">📚 Educação & Cursos</option>
                                <option value="transporte">🚗 Transporte & Carro</option>
                                <option value="moradia">🏠 Moradia & Reforma</option>
                                <option value="outros">🏷️ Outros</option>
                            </select>
                        </div>

                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block text-xs font-semibold text-zinc-300 mb-1">Valor Total (R$) *</label>
                                <input type="number" id="sim-valor" step="0.01" min="1" required value="3500.00" oninput="PersonalFinance.calcularPreviaParcelaSim()" class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white font-mono focus:outline-none focus:border-lime-400/80">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-zinc-300 mb-1">Nº Parcelas *</label>
                                <select id="sim-parcelas" onchange="PersonalFinance.calcularPreviaParcelaSim()" class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-zinc-200 focus:outline-none focus:border-lime-400/80">
                                    <option value="1">1x à vista</option>
                                    <option value="2">2x</option>
                                    <option value="3">3x</option>
                                    <option value="4">4x</option>
                                    <option value="5">5x</option>
                                    <option value="6">6x</option>
                                    <option value="10" selected>10x</option>
                                    <option value="12">12x</option>
                                    <option value="18">18x</option>
                                    <option value="24">24x</option>
                                    <option value="36">36x</option>
                                    <option value="48">48x</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label class="block text-xs font-semibold text-zinc-300 mb-1">Primeiro Vencimento</label>
                            <input type="date" id="sim-vencimento" value="${new Date().toISOString().substring(0, 10)}" class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-lime-400/80">
                        </div>

                        <!-- Prévia da Parcela -->
                        <div id="sim-previa-parcela-box" class="p-3 rounded-2xl bg-zinc-950/50 border border-white/5 text-center">
                            <span class="text-[10px] text-zinc-400">Impacto Estimado:</span>
                            <p id="sim-previa-valor-texto" class="text-base font-black text-lime-400 font-mono mt-0.5">
                                10x de R$ 350,00 / mês
                            </p>
                        </div>

                        <button type="submit" id="btn-submit-simulador" class="w-full py-3 bg-gradient-to-r from-lime-400 to-emerald-400 hover:from-lime-300 hover:to-emerald-300 text-black font-extrabold text-xs rounded-2xl shadow-lg shadow-lime-400/20 transition-all flex items-center justify-center gap-2 active:scale-95">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                            <span>Simular Impacto no Orçamento</span>
                        </button>
                    </form>
                </div>

                <!-- Painel do Veredito e Gráfico de Impacto -->
                <div class="lg:col-span-2 space-y-4" id="simulador-resultado-painel">
                    <div class="glass-card rounded-3xl p-8 border border-white/10 bg-white/[0.02] flex flex-col items-center justify-center text-center space-y-3 min-h-[300px]">
                        <div class="w-12 h-12 rounded-2xl bg-white/5 text-zinc-400 flex items-center justify-center text-2xl">
                            💡
                        </div>
                        <h4 class="text-sm font-bold text-white">Preencha o item ao lado para simular</h4>
                        <p class="text-xs text-zinc-400 max-w-md">
                            O sistema testará a compra contra seus custos fixos e parcelas ativas mês a mês pelos próximos 12 meses, verificando se seu teto de <strong>R$ ${teto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> será ultrapassado.
                        </p>
                    </div>
                </div>
            </div>
        `;
        return html;
    }

    function calcularPreviaParcelaSim() {
        const vTot = parseFloat(document.getElementById('sim-valor')?.value || 0);
        const qtdP = parseInt(document.getElementById('sim-parcelas')?.value || 1, 10);
        const textoEl = document.getElementById('sim-previa-valor-texto');
        if (textoEl && vTot > 0 && qtdP > 0) {
            const vParc = (vTot / qtdP);
            textoEl.textContent = `${qtdP}x de R$ ${vParc.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / mês`;
        }
    }

    async function executarSimulacao(e) {
        if (e) e.preventDefault();

        const btn = document.getElementById('btn-submit-simulador');
        const painel = document.getElementById('simulador-resultado-painel');
        if (!painel) return;

        const nome = document.getElementById('sim-nome')?.value || 'Compra Simulada';
        const categoria = document.getElementById('sim-categoria')?.value || 'eletrodomestico';
        const valorTotal = parseFloat(document.getElementById('sim-valor')?.value || 0);
        const qtdParcelas = parseInt(document.getElementById('sim-parcelas')?.value || 1, 10);
        const dataVenc = document.getElementById('sim-vencimento')?.value || new Date().toISOString().substring(0, 10);

        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<span class="animate-spin inline-block w-4 h-4 border-2 border-black border-t-transparent rounded-full"></span> <span>Calculando impacto nos 12 meses...</span>`;
        }

        try {
            const resp = await API.simularPersonalFinance({
                nome,
                categoria,
                valor_total: valorTotal,
                qtd_parcelas: qtdParcelas,
                data_primeiro_vencimento: dataVenc
            });

            renderResultadoSimulacao(resp, { nome, categoria, valorTotal, qtdParcelas, dataVenc });
        } catch (err) {
            painel.innerHTML = `
                <div class="glass-card rounded-3xl p-6 text-center text-red-400">
                    <p class="text-xs font-bold">Erro ao executar simulação: ${escapeHtml(err.message)}</p>
                </div>
            `;
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                    <span>Simular Impacto no Orçamento</span>
                `;
            }
        }
    }

    function renderResultadoSimulacao(data, formValues) {
        const painel = document.getElementById('simulador-resultado-painel');
        if (!painel) return;

        const aprovado = data.aprovado;
        const veredito = data.veredito;
        const vParc = parseFloat(data.valor_parcela || 0);
        const teto = parseFloat(data.teto_mensal || 5000);
        const maiorTotal = parseFloat(data.maior_total_projetado || 0);
        const mesesEstourados = data.meses_com_extrapolacao || [];
        const cronograma = data.cronograma_12m || [];

        let html = `
            <!-- Veredito Hero Card -->
            <div class="glass-card rounded-3xl p-6 border ${aprovado ? 'border-emerald-500/40 bg-emerald-500/[0.04]' : 'border-red-500/40 bg-red-500/[0.05]'} space-y-4 shadow-xl">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-2xl ${aprovado ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'} flex items-center justify-center text-2xl shrink-0 shadow-lg">
                        ${aprovado ? '✅' : '⚠️'}
                    </div>
                    <div class="space-y-1">
                        <span class="text-[10px] font-extrabold uppercase tracking-wider ${aprovado ? 'text-emerald-400' : 'text-red-400'}">
                            ${aprovado ? 'COMPRA TOTALMENTE COMPATÍVEL' : 'ALERTA DE EXTRAPOLAÇÃO ORÇAMENTÁRIA'}
                        </span>
                        <h4 class="text-base font-extrabold text-white">${veredito}</h4>
                    </div>
                </div>

                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-white/5 text-xs">
                    <div class="p-2.5 rounded-2xl bg-black/40 border border-white/5">
                        <span class="text-[10px] text-zinc-500 block">Parcela Calculada</span>
                        <span class="font-black text-lime-400 font-mono text-sm">R$ ${vParc.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div class="p-2.5 rounded-2xl bg-black/40 border border-white/5">
                        <span class="text-[10px] text-zinc-500 block">Teto Mensal</span>
                        <span class="font-black text-white font-mono text-sm">R$ ${teto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div class="p-2.5 rounded-2xl bg-black/40 border border-white/5">
                        <span class="text-[10px] text-zinc-500 block">Pico Mensal Projetado</span>
                        <span class="font-black ${maiorTotal > teto ? 'text-red-400' : 'text-white'} font-mono text-sm">R$ ${maiorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div class="p-2.5 rounded-2xl bg-black/40 border border-white/5">
                        <span class="text-[10px] text-zinc-500 block">Meses com Estouro</span>
                        <span class="font-black ${mesesEstourados.length > 0 ? 'text-red-400' : 'text-emerald-400'} font-mono text-sm">${mesesEstourados.length} mês(es)</span>
                    </div>
                </div>

                <!-- Ações Diretas -->
                <div class="flex items-center justify-end gap-3 pt-2">
                    <button type="button" onclick="PersonalFinance.cadastrarItemSimulado(${escapeHtml(JSON.stringify(formValues))})" class="px-5 py-2.5 bg-lime-400 hover:bg-lime-300 text-black font-extrabold text-xs rounded-full shadow-lg shadow-lime-400/20 transition-all active:scale-95 flex items-center gap-1.5">
                        <span>+ Adicionar ao Meu Planejamento</span>
                    </button>
                </div>
            </div>

            <!-- Gráfico Comparativo Mês a Mês com o Novo Item -->
            <div class="glass-card rounded-3xl p-5 border border-white/10 bg-white/[0.02] space-y-3">
                <h5 class="text-xs font-extrabold text-white uppercase tracking-wider">
                    Impacto Visual nos Próximos 12 Meses (Antes vs Depois)
                </h5>

                <div class="space-y-2">
                    ${cronograma.map(m => {
                        const totNovo = parseFloat(m.total_novo || 0);
                        const adic = parseFloat(m.adicional_item || 0);
                        const pctNovo = Math.min(100, Math.round((totNovo / teto) * 100));
                        const estourou = totNovo > teto;

                        return `
                            <div class="p-2.5 rounded-2xl bg-black/30 border ${estourou ? 'border-red-500/30' : 'border-white/5'} flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                                <div class="flex items-center gap-2 w-32 shrink-0">
                                    <span class="font-black text-white text-[11px]">${m.mes_nome}</span>
                                    ${adic > 0 ? `<span class="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[9px] font-mono">+R$${Math.round(adic)}</span>` : ''}
                                </div>

                                <div class="flex-1 min-w-[120px]">
                                    <div class="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                                        <div class="${estourou ? 'bg-red-500 animate-pulse' : 'bg-lime-400'} h-2 rounded-full" style="width: ${pctNovo}%"></div>
                                    </div>
                                </div>

                                <div class="flex items-center justify-between sm:justify-end gap-3 text-right shrink-0">
                                    <span class="font-mono text-zinc-400 text-[11px]">R$ ${totNovo.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</span>
                                    ${estourou ? `
                                        <span class="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[9px] font-black uppercase">
                                            +R$ ${(totNovo - teto).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                                        </span>
                                    ` : `
                                        <span class="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[9px] font-bold">
                                            Margem R$ ${(teto - totNovo).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                                        </span>
                                    `}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;

        painel.innerHTML = html;
    }

    async function cadastrarItemSimulado(values) {
        if (!values) return;
        try {
            await API.createPersonalFinanceItem({
                nome: values.nome,
                categoria: values.categoria,
                tipo: values.qtdParcelas > 1 ? 'parcelado' : 'avulso',
                valor_total: values.valorTotal,
                qtd_parcelas: values.qtdParcelas,
                data_primeiro_vencimento: values.dataVenc,
                dia_vencimento_fixo: 10,
                forma_pagamento: 'cartao',
                status: 'ativo',
                meta_relacionada: 'Planejamento Pessoal',
                observacoes: 'Adicionado via Simulador de Compras'
            });

            alert('✅ Item cadastrado com sucesso nas suas Finanças Pessoais!');
            setSubView('itens');
            await load();
        } catch (err) {
            alert('Erro ao salvar item: ' + err.message);
        }
    }

    // ========================================================
    // MODAIS: NOVO ITEM, EDITAR ITEM E CONFIGURAÇÃO
    // ========================================================

    function abrirModalNovoItem() {
        const modal = document.getElementById('modal-personal-finance-item');
        if (!modal) return;

        document.getElementById('form-personal-finance-item').reset();
        document.getElementById('pessoal-item-id').value = '';
        document.getElementById('modal-pessoal-item-title').textContent = 'Nova Despesa ou Compra de Meta';
        document.getElementById('pessoal-item-vencimento').value = new Date().toISOString().substring(0, 10);
        document.getElementById('pessoal-item-tipo').value = 'parcelado';
        personalFinanceToggleTipoCampos();
        calcularPreviaParcelaModal();

        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }

    function abrirModalEditarItem(id) {
        const item = itensList.find(it => it.id === id);
        if (!item) return;

        const modal = document.getElementById('modal-personal-finance-item');
        if (!modal) return;

        document.getElementById('pessoal-item-id').value = item.id;
        document.getElementById('modal-pessoal-item-title').textContent = 'Editar ' + item.nome;
        document.getElementById('pessoal-item-nome').value = item.nome;
        document.getElementById('pessoal-item-tipo').value = item.tipo;
        document.getElementById('pessoal-item-categoria').value = item.categoria;
        document.getElementById('pessoal-item-valor').value = item.valor_total;
        document.getElementById('pessoal-item-parcelas').value = item.qtd_parcelas;
        document.getElementById('pessoal-item-pagas').value = item.parcelas_pagas;
        document.getElementById('pessoal-item-vencimento').value = item.data_primeiro_vencimento;
        document.getElementById('pessoal-item-dia-fixo').value = item.dia_vencimento_fixo || 10;
        document.getElementById('pessoal-item-forma').value = item.forma_pagamento || 'cartao';
        document.getElementById('pessoal-item-status').value = item.status;
        document.getElementById('pessoal-item-meta').value = item.meta_relacionada || '';
        document.getElementById('pessoal-item-obs').value = item.observacoes || '';

        personalFinanceToggleTipoCampos();
        calcularPreviaParcelaModal();

        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }

    function fecharModalItem() {
        const modal = document.getElementById('modal-personal-finance-item');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    }

    function personalFinanceToggleTipoCampos() {
        const tipo = document.getElementById('pessoal-item-tipo')?.value || 'parcelado';
        const containerParcelas = document.getElementById('container-campos-parcelas');
        const containerFixo = document.getElementById('container-campos-fixo');

        if (tipo === 'parcelado') {
            containerParcelas?.classList.remove('hidden');
            containerFixo?.classList.add('hidden');
        } else if (tipo === 'fixo_mensal') {
            containerParcelas?.classList.add('hidden');
            containerFixo?.classList.remove('hidden');
        } else {
            containerParcelas?.classList.add('hidden');
            containerFixo?.classList.add('hidden');
        }
        calcularPreviaParcelaModal();
    }

    function calcularPreviaParcelaModal() {
        const tipo = document.getElementById('pessoal-item-tipo')?.value || 'parcelado';
        const vTot = parseFloat(document.getElementById('pessoal-item-valor')?.value || 0);
        const qtdP = parseInt(document.getElementById('pessoal-item-parcelas')?.value || 1, 10);
        const previewBox = document.getElementById('pessoal-modal-preview-box');
        const previewTexto = document.getElementById('pessoal-modal-preview-texto');

        if (!previewBox || !previewTexto) return;

        if (tipo === 'parcelado' && vTot > 0 && qtdP > 0) {
            previewBox.classList.remove('hidden');
            const vP = (vTot / qtdP);
            previewTexto.textContent = `${qtdP}x de R$ ${vP.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / mês`;
        } else if (tipo === 'fixo_mensal' && vTot > 0) {
            previewBox.classList.remove('hidden');
            previewTexto.textContent = `Custo recorrente de R$ ${vTot.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} todo mês`;
        } else {
            previewBox.classList.add('hidden');
        }
    }

    async function salvarItem(e) {
        if (e) e.preventDefault();

        const id = parseInt(document.getElementById('pessoal-item-id')?.value || 0, 10);
        const nome = document.getElementById('pessoal-item-nome')?.value.trim();
        const tipo = document.getElementById('pessoal-item-tipo')?.value;
        const categoria = document.getElementById('pessoal-item-categoria')?.value;
        const valorTotal = parseFloat(document.getElementById('pessoal-item-valor')?.value || 0);
        const qtdParcelas = parseInt(document.getElementById('pessoal-item-parcelas')?.value || 1, 10);
        const parcelasPagas = parseInt(document.getElementById('pessoal-item-pagas')?.value || 0, 10);
        const dataVenc = document.getElementById('pessoal-item-vencimento')?.value;
        const diaFixo = parseInt(document.getElementById('pessoal-item-dia-fixo')?.value || 10, 10);
        const formaPagamento = document.getElementById('pessoal-item-forma')?.value;
        const status = document.getElementById('pessoal-item-status')?.value;
        const meta = document.getElementById('pessoal-item-meta')?.value.trim();
        const obs = document.getElementById('pessoal-item-obs')?.value.trim();

        if (!nome || valorTotal <= 0) {
            alert('Por favor informe o nome e o valor da despesa.');
            return;
        }

        const payload = {
            nome,
            tipo,
            categoria,
            valor_total: valorTotal,
            qtd_parcelas: qtdParcelas,
            parcelas_pagas: parcelasPagas,
            data_primeiro_vencimento: dataVenc,
            dia_vencimento_fixo: diaFixo,
            forma_pagamento: formaPagamento,
            status,
            meta_relacionada: meta,
            observacoes: obs
        };

        const btn = document.getElementById('btn-submit-pessoal-item');
        if (btn) btn.disabled = true;

        try {
            if (id > 0) {
                await API.updatePersonalFinanceItem(id, payload);
            } else {
                await API.createPersonalFinanceItem(payload);
            }

            fecharModalItem();
            await load();
        } catch (err) {
            alert('Erro ao salvar item: ' + err.message);
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    async function pagarParcela(id) {
        if (!confirm('Deseja registrar o pagamento da próxima parcela deste item?')) return;
        try {
            const resp = await API.pagarPersonalFinanceParcela(id);
            alert(resp.mensagem || 'Parcela registrada!');
            await load();
        } catch (err) {
            alert('Erro ao pagar parcela: ' + err.message);
        }
    }

    async function excluirItem(id) {
        if (!confirm('Tem certeza que deseja remover este item do seu planejamento pessoal?')) return;
        try {
            await API.deletePersonalFinanceItem(id);
            await load();
        } catch (err) {
            alert('Erro ao excluir item: ' + err.message);
        }
    }

    // ========================================================
    // MODAIS DE INVESTIMENTOS & MOVIMENTAÇÕES
    // ========================================================

    function abrirModalNovoInvestimento() {
        const modal = document.getElementById('modal-personal-investimento');
        if (!modal) return;

        document.getElementById('form-personal-investimento').reset();
        document.getElementById('invest-id').value = '';
        document.getElementById('modal-invest-title').textContent = 'Novo Investimento / Reserva';
        document.getElementById('invest-data-inicio').value = new Date().toISOString().substring(0, 10);

        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }

    function abrirModalEditarInvestimento(id) {
        const inv = investimentosList.find(i => i.id === id);
        if (!inv) return;

        const modal = document.getElementById('modal-personal-investimento');
        if (!modal) return;

        document.getElementById('invest-id').value = inv.id;
        document.getElementById('modal-invest-title').textContent = 'Editar ' + inv.nome;
        document.getElementById('invest-nome').value = inv.nome;
        document.getElementById('invest-tipo').value = inv.tipo;
        document.getElementById('invest-instituicao').value = inv.instituicao || '';
        document.getElementById('invest-valor-atual').value = inv.valor_atual;
        document.getElementById('invest-valor-aplicado').value = inv.valor_aplicado;
        document.getElementById('invest-aporte-mensal').value = inv.aporte_mensal || 0;
        document.getElementById('invest-meta-valor').value = inv.meta_valor || '';
        document.getElementById('invest-rentabilidade').value = inv.rentabilidade_anual || 10.50;
        document.getElementById('invest-liquidez').value = inv.liquidez || 'Diária (D+0)';
        document.getElementById('invest-data-inicio').value = inv.data_inicio;
        document.getElementById('invest-status').value = inv.status;
        document.getElementById('invest-obs').value = inv.observacoes || '';

        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }

    function fecharModalInvestimento() {
        const modal = document.getElementById('modal-personal-investimento');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    }

    async function salvarInvestimento(e) {
        if (e) e.preventDefault();

        const id = parseInt(document.getElementById('invest-id')?.value || 0, 10);
        const nome = document.getElementById('invest-nome')?.value.trim();
        const tipo = document.getElementById('invest-tipo')?.value;
        const instituicao = document.getElementById('invest-instituicao')?.value.trim();
        const valorAtual = parseFloat(document.getElementById('invest-valor-atual')?.value || 0);
        const valorAplicado = parseFloat(document.getElementById('invest-valor-aplicado')?.value || valorAtual);
        const aporteMensal = parseFloat(document.getElementById('invest-aporte-mensal')?.value || 0);
        const metaValor = parseFloat(document.getElementById('invest-meta-valor')?.value || 0);
        const rentabilidade = parseFloat(document.getElementById('invest-rentabilidade')?.value || 10.50);
        const liquidez = document.getElementById('invest-liquidez')?.value.trim();
        const dataInicio = document.getElementById('invest-data-inicio')?.value;
        const status = document.getElementById('invest-status')?.value;
        const obs = document.getElementById('invest-obs')?.value.trim();

        if (!nome || valorAtual < 0) {
            alert('Por favor informe o nome do investimento e um saldo válido.');
            return;
        }

        const payload = {
            nome,
            tipo,
            instituicao,
            valor_atual: valorAtual,
            valor_aplicado: valorAplicado,
            aporte_mensal: aporteMensal,
            meta_valor: metaValor > 0 ? metaValor : null,
            rentabilidade_anual: rentabilidade,
            liquidez,
            data_inicio: dataInicio,
            status,
            observacoes: obs
        };

        const btn = document.getElementById('btn-submit-invest');
        if (btn) btn.disabled = true;

        try {
            if (id > 0) {
                await API.updatePersonalInvestimento(id, payload);
            } else {
                await API.createPersonalInvestimento(payload);
            }

            fecharModalInvestimento();
            await load();
        } catch (err) {
            alert('Erro ao salvar investimento: ' + err.message);
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    function abrirModalMovimentacao(id, tipoPadrao = 'aporte') {
        const inv = investimentosList.find(i => i.id === id);
        if (!inv) return;

        const modal = document.getElementById('modal-personal-movimentacao');
        if (!modal) return;

        document.getElementById('form-personal-movimentacao').reset();
        document.getElementById('mov-invest-id').value = inv.id;
        document.getElementById('mov-invest-nome').textContent = inv.nome;
        document.getElementById('mov-saldo-atual').textContent = `Saldo Atual: R$ ${parseFloat(inv.valor_atual).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
        document.getElementById('mov-tipo').value = tipoPadrao;
        document.getElementById('mov-data').value = new Date().toISOString().substring(0, 10);

        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }

    function fecharModalMovimentacao() {
        const modal = document.getElementById('modal-personal-movimentacao');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    }

    async function salvarMovimentacao(e) {
        if (e) e.preventDefault();

        const id = parseInt(document.getElementById('mov-invest-id')?.value || 0, 10);
        const tipo = document.getElementById('mov-tipo')?.value;
        const valor = parseFloat(document.getElementById('mov-valor')?.value || 0);
        const dataMov = document.getElementById('mov-data')?.value;
        const obs = document.getElementById('mov-obs')?.value.trim();

        if (id <= 0 || valor <= 0) {
            alert('Informe um valor válido maior que zero.');
            return;
        }

        try {
            const resp = await API.movimentarPersonalInvestimento(id, {
                tipo,
                valor,
                data_movimentacao: dataMov,
                observacoes: obs
            });

            alert(resp.mensagem || 'Movimentação registrada com sucesso!');
            fecharModalMovimentacao();
            await load();
        } catch (err) {
            alert('Erro ao registrar movimentação: ' + err.message);
        }
    }

    async function excluirInvestimento(id) {
        if (!confirm('Deseja realmente remover este investimento da sua carteira?')) return;
        try {
            await API.deletePersonalInvestimento(id);
            await load();
        } catch (err) {
            alert('Erro ao remover investimento: ' + err.message);
        }
    }

    // ========================================================
    // MODAL DE CONFIGURAÇÃO DE TETO & RENDA
    // ========================================================

    function abrirModalConfig() {
        const modal = document.getElementById('modal-personal-finance-config');
        if (!modal) return;

        document.getElementById('cfg-teto').value = configData.teto_gastos_mensal || 5000;
        document.getElementById('cfg-renda').value = configData.renda_mensal_estimada || 6000;
        document.getElementById('cfg-alerta').value = configData.alerta_percentual || 90;

        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }

    function fecharModalConfig() {
        const modal = document.getElementById('modal-personal-finance-config');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    }

    async function salvarConfig(e) {
        if (e) e.preventDefault();

        const teto = parseFloat(document.getElementById('cfg-teto')?.value || 0);
        const renda = parseFloat(document.getElementById('cfg-renda')?.value || 0);
        const alerta = parseInt(document.getElementById('cfg-alerta')?.value || 90, 10);

        if (teto <= 0) {
            alert('O teto de gastos mensal deve ser maior que zero.');
            return;
        }

        try {
            await API.savePersonalFinanceConfig({
                teto_gastos_mensal: teto,
                renda_mensal_estimada: renda,
                alerta_percentual: alerta
            });

            fecharModalConfig();
            await load();
        } catch (err) {
            alert('Erro ao salvar configuração: ' + err.message);
        }
    }

    function setSubView(subView) {
        currentSubView = subView;
        render();
    }

    function filtrarTipo(tipo) {
        currentFilter.tipo = tipo;
        load();
    }

    function filtrarInvestTipo(tipo) {
        currentInvestFilter.tipo = tipo;
        load();
    }

    return {
        load,
        render,
        setSubView,
        filtrarTipo,
        filtrarInvestTipo,
        abrirModalNovoItem,
        abrirModalEditarItem,
        fecharModalItem,
        personalFinanceToggleTipoCampos,
        calcularPreviaParcelaModal,
        salvarItem,
        pagarParcela,
        excluirItem,
        abrirModalConfig,
        fecharModalConfig,
        salvarConfig,
        calcularPreviaParcelaSim,
        executarSimulacao,
        cadastrarItemSimulado,
        abrirModalNovoInvestimento,
        abrirModalEditarInvestimento,
        fecharModalInvestimento,
        salvarInvestimento,
        abrirModalMovimentacao,
        fecharModalMovimentacao,
        salvarMovimentacao,
        excluirInvestimento
    };
})();
