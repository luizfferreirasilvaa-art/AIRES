/**
 * AIRES - Módulo de Finanças Pessoais & Metas
 * Obsidian Dark Glassmorphism / Pierre Fintech
 * Controle de Teto Mensal, Previsões Futuras, Parcelamentos e Alertas de Extrapolação
 */

const PersonalFinance = (() => {
    let itensList = [];
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
        meses_alerta_futuros: 0
    };
    let alertasData = {
        extrapolou_mes_atual: false,
        valor_extrapolado: 0,
        meses_extrapolados: []
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
    let currentSubView = 'itens'; // 'itens' | 'projecao' | 'simulador'

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
                <p class="text-xs font-semibold">Analisando compromissos pessoais, parcelamentos e margem orçamentária...</p>
            </div>
        `;

        try {
            const [respItens, respResumo, respProjecao, respConfig] = await Promise.all([
                API.getPersonalFinance(currentFilter),
                API.getPersonalFinanceResumo(),
                API.getPersonalFinanceProjecao({ meses: 12 }),
                API.getPersonalFinanceConfig()
            ]);

            itensList = (respItens && respItens.itens) || [];
            resumoData = (respResumo && respResumo.kpis) || resumoData;
            alertasData = (respResumo && respResumo.alertas) || alertasData;
            projecaoData = (respProjecao && respProjecao.meses) || [];
            configData = (respConfig && respConfig.config) || configData;

            render();
        } catch (err) {
            container.innerHTML = `
                <div class="glass-card rounded-3xl p-6 text-center text-red-400">
                    <p class="text-xs font-bold">Erro ao carregar finanças pessoais: ${escapeHtml(err.message)}</p>
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
                                Meses com sobrecarga financeira: ${mesesExtrapolados.map(m => `<span class="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] mr-1">${m.mes_nome} (+R$ ${parseFloat(m.excesso).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})</span>`).join('')}
                            </p>
                        </div>
                    </div>
                    <button type="button" onclick="PersonalFinance.setSubView('projecao')" class="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs rounded-full transition-all shrink-0">
                        Visualizar Cronograma
                    </button>
                </div>
            ` : '')}

            <!-- ========================================================
                 KPI CARDS: VISÃO GERAL DAS FINANÇAS PESSOAIS
                 ======================================================== -->
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <!-- Teto Mensal Planejado -->
                <div class="glass-card rounded-2xl p-4 space-y-1 border border-white/5 bg-white/[0.02]">
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Teto Mensal Planejado</span>
                        <button type="button" onclick="PersonalFinance.abrirModalConfig()" class="text-xs text-lime-400 hover:text-white transition-colors" title="Ajustar teto">⚙️</button>
                    </div>
                    <p class="text-xl sm:text-2xl font-black text-white font-mono">
                        R$ ${teto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <div class="flex items-center justify-between text-[10px] text-zinc-500">
                        <span>Renda: R$ ${parseFloat(configData.renda_mensal_estimada || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        <button type="button" onclick="PersonalFinance.abrirModalConfig()" class="text-lime-400 hover:underline">Editar</button>
                    </div>
                </div>

                <!-- Custos Fixos Recorrentes (Aluguel, etc.) -->
                <div class="glass-card rounded-2xl p-4 space-y-1 border border-white/5 bg-white/[0.02]">
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Custos Fixos Mensais</span>
                        <span class="text-cyan-400 text-sm">🏠</span>
                    </div>
                    <p class="text-xl sm:text-2xl font-black text-cyan-400 font-mono">
                        R$ ${fixos.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p class="text-[10px] text-zinc-500 truncate">Aluguel, condomínio, internet, etc.</p>
                </div>

                <!-- Parcelas de Metas no Mês (Geladeira, etc.) -->
                <div class="glass-card rounded-2xl p-4 space-y-1 border border-white/5 bg-white/[0.02]">
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Parcelas de Metas (Mês)</span>
                        <span class="text-purple-400 text-sm">💳</span>
                    </div>
                    <p class="text-xl sm:text-2xl font-black text-purple-300 font-mono">
                        R$ ${parcelasMes.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p class="text-[10px] text-zinc-500 truncate">Saldo total a parcelar: R$ ${dividaRestante.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>

                <!-- Margem / Saldo Livre Mensal -->
                <div class="glass-card rounded-2xl p-4 space-y-1 border ${saldoLivre < 0 ? 'border-red-500/30 bg-red-500/[0.04]' : 'border-emerald-500/20 bg-emerald-500/[0.02]'}">
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] ${saldoLivre < 0 ? 'text-red-400' : 'text-emerald-400'} uppercase font-bold tracking-wider">Saldo Livre no Mês</span>
                        <span class="text-sm">${saldoLivre < 0 ? '⚠️' : '💎'}</span>
                    </div>
                    <p class="text-xl sm:text-2xl font-black ${saldoLivre < 0 ? 'text-red-400 font-bold' : 'text-emerald-400'} font-mono">
                        R$ ${saldoLivre.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <div class="flex items-center gap-1.5 text-[10px] ${saldoLivre < 0 ? 'text-red-400' : 'text-zinc-400'}">
                        <span class="w-1.5 h-1.5 rounded-full ${saldoLivre < 0 ? 'bg-red-400 animate-pulse' : 'bg-emerald-400'}"></span>
                        <span>${pctComprometido}% comprometido ${saldoLivre < 0 ? '(EXTRAPOLADO!)' : ''}</span>
                    </div>
                </div>
            </div>

            <!-- ========================================================
                 SUB-ABAS: ITENS & METAS | FLUXO FUTURO | SIMULADOR
                 ======================================================== -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-white/5">
                <div class="inline-flex p-1 bg-zinc-900/90 rounded-full border border-white/10 gap-1 shadow-lg backdrop-blur-md self-start">
                    <button type="button" onclick="PersonalFinance.setSubView('itens')" class="px-4 py-1.5 rounded-full text-xs font-bold transition-all ${currentSubView === 'itens' ? 'glass-pill-active' : 'text-zinc-400 hover:text-white'} flex items-center gap-1.5">
                        <svg class="w-3.5 h-3.5 text-lime-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
                        <span>Fixos & Metas (${itensList.length})</span>
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
                    <button type="button" onclick="PersonalFinance.abrirModalNovoItem()" class="px-4 py-2 bg-lime-400 hover:bg-lime-300 text-zinc-950 font-extrabold text-xs rounded-full shadow-lg shadow-lime-400/20 transition-all flex items-center gap-1.5 active:scale-95">
                        <span>+ Nova Despesa ou Compra</span>
                    </button>
                </div>
            </div>
        `;

        if (currentSubView === 'itens') {
            html += renderSubViewItens();
        } else if (currentSubView === 'projecao') {
            html += renderSubViewProjecao();
        } else if (currentSubView === 'simulador') {
            html += renderSubViewSimulador();
        }

        container.innerHTML = html;
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
                        const totAtual = parseFloat(m.total_atual || 0);
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

    return {
        load,
        render,
        setSubView,
        filtrarTipo,
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
        cadastrarItemSimulado
    };
})();
