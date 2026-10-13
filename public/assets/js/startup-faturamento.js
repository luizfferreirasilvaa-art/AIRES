/**
 * AIRES - Módulo Startup: Faturamento Solar (Robô Emissor + Painel de Controle)
 * Obsidian Dark Glassmorphism
 */

const StartupFaturamento = (() => {
    let currentTab = 'painel'; // 'painel' ou 'emissao'
    let faturasList = [];
    let clientesList = [];

    function init() {
        // Eventos são disparados dinamicamente
    }

    async function load() {
        const container = document.getElementById('startup-faturamento-container');
        if (!container) return;

        container.innerHTML = `
            <div class="py-12 flex flex-col items-center justify-center text-zinc-500">
                <div class="w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full animate-spin mb-3"></div>
                <p class="text-xs">Carregando faturas e dados de faturamento...</p>
            </div>
        `;

        try {
            const [respFaturas, respClientes] = await Promise.all([
                API.getStartupFaturas(),
                API.getStartupClientes({ status: 'ativo' })
            ]);

            faturasList = (respFaturas && respFaturas.faturas) || [];
            clientesList = (respClientes && respClientes.clientes) || [];

            render();
        } catch (err) {
            container.innerHTML = `
                <div class="glass-card rounded-3xl p-6 text-center text-red-400">
                    <p class="text-xs font-bold">Erro ao carregar faturamento: ${escapeHtml(err.message)}</p>
                </div>
            `;
        }
    }

    function switchTab(tab) {
        currentTab = tab;
        const btnPainel = document.getElementById('btn-tab-fatura-painel');
        const btnEmissao = document.getElementById('btn-tab-fatura-emissao');

        if (tab === 'painel') {
            btnPainel?.classList.add('glass-pill-active', 'text-white');
            btnPainel?.classList.remove('text-zinc-400');
            btnEmissao?.classList.remove('glass-pill-active', 'text-white');
            btnEmissao?.classList.add('text-zinc-400');
        } else {
            btnEmissao?.classList.add('glass-pill-active', 'text-white');
            btnEmissao?.classList.remove('text-zinc-400');
            btnPainel?.classList.remove('glass-pill-active', 'text-white');
            btnPainel?.classList.add('text-zinc-400');
        }

        render();
    }

    function openEmissaoParaCliente(clienteId) {
        switchTab('emissao');
        setTimeout(() => {
            const selectCli = document.getElementById('emissao-cliente');
            if (selectCli) {
                selectCli.value = clienteId;
                selectCli.dispatchEvent(new Event('change'));
            }
        }, 100);
    }

    function render() {
        const container = document.getElementById('startup-faturamento-container');
        if (!container) return;

        if (currentTab === 'emissao') {
            renderEmissorRobo(container);
        } else {
            renderPainelFaturas(container);
        }
    }

    /* ========================================================
     * VISTA 1: ROBÔ EMISSOR DE FATURAS
     * ======================================================== */
    function renderEmissorRobo(container) {
        const mesAtual = new Date().toISOString().substring(0, 7);

        container.innerHTML = `
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <!-- Formulário de Entrada da Fatura Energisa -->
                <div class="lg:col-span-7 space-y-4">
                    <div class="glass-card rounded-3xl p-6 space-y-4">
                        <div class="flex items-center justify-between pb-3 border-b border-white/5">
                            <div class="flex items-center gap-2.5">
                                <div class="w-9 h-9 rounded-2xl bg-lime-400/10 text-lime-400 border border-lime-400/20 flex items-center justify-center text-base">
                                    🤖
                                </div>
                                <div>
                                    <h4 class="font-extrabold text-sm text-white">Robô de Emissão Solar</h4>
                                    <p class="text-[11px] text-zinc-400">Insira os dados da conta da Energisa para cálculo automático do desconto.</p>
                                </div>
                            </div>
                        </div>

                        <form id="form-emissor-fatura" class="space-y-4">
                            <!-- Cliente e Mês -->
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label class="block text-xs font-semibold text-zinc-300 mb-1">Selecione o Cliente *</label>
                                    <select id="emissao-cliente" required class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-lime-400">
                                        <option value="">Selecione um cliente...</option>
                                        ${clientesList.map(c => `
                                            <option value="${c.id}" data-desc="${c.desconto_padrao_pct || 15}" data-uc="${escapeHtml(c.numero_uc || '')}">
                                                ${escapeHtml(c.nome)} (UC: ${escapeHtml(c.numero_uc || 'Sem UC')})
                                            </option>
                                        `).join('')}
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-xs font-semibold text-zinc-300 mb-1">Mês de Referência *</label>
                                    <input type="month" id="emissao-mes" required value="${mesAtual}" class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-lime-400">
                                </div>
                            </div>

                            <!-- Dados da Conta Energisa -->
                            <div class="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                                <h5 class="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <span>⚡ Dados Extraídos da Fatura Energisa</span>
                                </h5>

                                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                        <label class="block text-[11px] font-semibold text-zinc-300 mb-1">Consumo Total (kWh) *</label>
                                        <input type="number" step="0.01" min="0" id="emissao-consumo" required placeholder="Ex: 500.00" class="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-lime-400">
                                    </div>
                                    <div>
                                        <label class="block text-[11px] font-semibold text-zinc-300 mb-1">Créditos Injetados (kWh) *</label>
                                        <input type="number" step="0.01" min="0" id="emissao-creditos" required placeholder="Ex: 500.00" class="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-xl text-xs text-lime-400 font-mono font-bold focus:outline-none focus:border-lime-400">
                                    </div>
                                    <div>
                                        <label class="block text-[11px] font-semibold text-zinc-300 mb-1">Iluminação Pública (R$) *</label>
                                        <input type="number" step="0.01" min="0" id="emissao-iluminacao" required placeholder="Ex: 45.90" class="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-lime-400">
                                    </div>
                                </div>

                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                    <div>
                                        <label class="block text-[11px] font-semibold text-zinc-300 mb-1">Tarifa Média do kWh (R$)</label>
                                        <input type="number" step="0.0001" min="0.1" id="emissao-tarifa" value="0.9500" class="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-xl text-xs text-zinc-300 font-mono focus:outline-none focus:border-lime-400">
                                    </div>
                                    <div>
                                        <label class="block text-[11px] font-semibold text-zinc-300 mb-1">Desconto Acordado com Cliente (%)</label>
                                        <input type="number" step="0.5" min="1" max="100" id="emissao-desconto-pct" value="15" class="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-xl text-xs text-emerald-400 font-bold focus:outline-none focus:border-lime-400">
                                    </div>
                                </div>
                            </div>

                            <!-- Vencimento e Status -->
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label class="block text-xs font-semibold text-zinc-300 mb-1">Data de Vencimento *</label>
                                    <input type="date" id="emissao-vencimento" required value="${calcularDataVencimentoPadrao()}" class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-lime-400">
                                </div>
                                <div>
                                    <label class="block text-xs font-semibold text-zinc-300 mb-1">Status Inicial</label>
                                    <select id="emissao-status" class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-lime-400">
                                        <option value="emitida">📄 Emitida (Aguardando envio)</option>
                                        <option value="enviada">🚀 Enviada ao Cliente</option>
                                        <option value="paga">✅ Paga (Recebimento efetuado)</option>
                                        <option value="rascunho">📝 Rascunho</option>
                                    </select>
                                </div>
                            </div>

                            <div class="pt-2 flex items-center justify-end gap-3">
                                <button type="button" onclick="StartupFaturamento.switchTab('painel')" class="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs rounded-full transition-all">
                                    Voltar ao Painel
                                </button>
                                <button type="submit" class="px-6 py-2.5 bg-lime-400 hover:bg-lime-300 text-black font-extrabold text-xs rounded-full shadow-lg shadow-lime-400/20 transition-all flex items-center gap-1.5 active:scale-95">
                                    <span>⚡ Gerar & Salvar Fatura</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                <!-- Preview / Simulador ao Vivo da Fatura -->
                <div class="lg:col-span-5 space-y-4">
                    <div class="glass-card rounded-3xl p-6 space-y-4 border border-lime-400/20 bg-gradient-to-b from-[#14141c] to-[#0d0d12]">
                        <div class="flex items-center justify-between pb-3 border-b border-white/5">
                            <span class="text-[10px] font-extrabold uppercase tracking-wider text-lime-400 flex items-center gap-1">
                                <span class="w-2 h-2 rounded-full bg-lime-400 animate-pulse"></span>
                                Demonstrativo em Tempo Real
                            </span>
                            <span class="text-[10px] text-zinc-500 font-mono" id="preview-uc-badge">UC: -</span>
                        </div>

                        <!-- Card de Comparação Financeira -->
                        <div class="space-y-3">
                            <div class="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                                <span class="text-[10px] text-zinc-400 uppercase font-semibold">Valor da Fatura Energisa</span>
                                <p class="text-xl font-black text-zinc-300" id="preview-valor-energisa">R$ 0,00</p>
                                <p class="text-[10px] text-zinc-500">Total que o cliente pagaria sem a usina solar</p>
                            </div>

                            <!-- Pílula de Desconto -->
                            <div class="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                                <div class="flex items-center justify-between">
                                    <span class="text-[10px] text-emerald-300 uppercase font-extrabold">Desconto Concedido</span>
                                    <span class="text-xs font-black text-emerald-400" id="preview-desc-badge">15%</span>
                                </div>
                                <p class="text-2xl font-black text-emerald-400" id="preview-valor-desconto">- R$ 0,00</p>
                                <p class="text-[10px] text-emerald-300/80">Economia real do cliente garantida pela sua usina</p>
                            </div>

                            <!-- Total a Pagar à Empresa Solar -->
                            <div class="p-4 rounded-2xl bg-lime-400/10 border border-lime-400/30 space-y-1">
                                <span class="text-[10px] text-lime-300 uppercase font-black tracking-wider">Valor a Pagar (Fatura Solar)</span>
                                <p class="text-3xl font-black text-white" id="preview-valor-cobrado">R$ 0,00</p>
                                <p class="text-[10px] text-zinc-400">Receita bruta da sua empresa com esta unidade</p>
                            </div>
                        </div>

                        <!-- Detalhamento dos Componentes -->
                        <div class="text-[11px] text-zinc-400 space-y-1.5 pt-2 border-t border-white/5">
                            <div class="flex justify-between">
                                <span>Consumo Base:</span>
                                <span class="font-mono text-zinc-200" id="preview-det-consumo">0 kWh</span>
                            </div>
                            <div class="flex justify-between">
                                <span>Créditos Compensados:</span>
                                <span class="font-mono text-lime-400" id="preview-det-creditos">0 kWh</span>
                            </div>
                            <div class="flex justify-between">
                                <span>Taxa Iluminação Pública:</span>
                                <span class="font-mono text-zinc-200" id="preview-det-ilum">R$ 0,00</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        bindEmissorEvents();
    }

    function bindEmissorEvents() {
        const selectCli = document.getElementById('emissao-cliente');
        const inputConsumo = document.getElementById('emissao-consumo');
        const inputCreditos = document.getElementById('emissao-creditos');
        const inputIlum = document.getElementById('emissao-iluminacao');
        const inputTarifa = document.getElementById('emissao-tarifa');
        const inputDesc = document.getElementById('emissao-desconto-pct');
        const form = document.getElementById('form-emissor-fatura');

        selectCli?.addEventListener('change', () => {
            const opt = selectCli.selectedOptions[0];
            if (opt) {
                const desc = opt.dataset.desc;
                const uc = opt.dataset.uc;
                if (desc && inputDesc) inputDesc.value = desc;
                const ucBadge = document.getElementById('preview-uc-badge');
                if (ucBadge) ucBadge.innerText = `UC: ${uc || '-'}`;
            }
            recalcularPreview();
        });

        [inputConsumo, inputCreditos, inputIlum, inputTarifa, inputDesc].forEach(inp => {
            inp?.addEventListener('input', recalcularPreview);
        });

        // Quando o consumo muda, se os créditos estiverem vazios, preenche com o consumo
        inputConsumo?.addEventListener('change', () => {
            if (inputCreditos && !inputCreditos.value && inputConsumo.value) {
                inputCreditos.value = inputConsumo.value;
                recalcularPreview();
            }
        });

        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await submeterFatura();
        });

        recalcularPreview();
    }

    function recalcularPreview() {
        const consumo = parseFloat(document.getElementById('emissao-consumo')?.value || '0');
        const creditos = parseFloat(document.getElementById('emissao-creditos')?.value || '0');
        const ilum = parseFloat(document.getElementById('emissao-iluminacao')?.value || '0');
        const tarifa = parseFloat(document.getElementById('emissao-tarifa')?.value || '0.95');
        const descPct = parseFloat(document.getElementById('emissao-desconto-pct')?.value || '15');

        // 1. Valor Energisa original
        const valorEnergisa = (consumo * tarifa) + ilum;

        // 2. Base dos créditos = créditos injetados consumidos + iluminação pública
        // Conforme instrução: "irá somar a quantidade consumida de créditos + iluminação publica e dará o desconto em cima do valor da soma"
        const baseSoma = (creditos * tarifa) + ilum;
        const valorDesconto = baseSoma * (descPct / 100);

        // 3. Valor cobrado pela empresa = Valor Energisa - Desconto
        const valorCobrado = Math.max(0, valorEnergisa - valorDesconto);

        // Atualizar interface de preview
        const elEnergisa = document.getElementById('preview-valor-energisa');
        const elDesconto = document.getElementById('preview-valor-desconto');
        const elCobrado = document.getElementById('preview-valor-cobrado');
        const elDescBadge = document.getElementById('preview-desc-badge');
        const elDetConsumo = document.getElementById('preview-det-consumo');
        const elDetCreditos = document.getElementById('preview-det-creditos');
        const elDetIlum = document.getElementById('preview-det-ilum');

        if (elEnergisa) elEnergisa.innerText = formatarMoeda(valorEnergisa);
        if (elDesconto) elDesconto.innerText = `- ${formatarMoeda(valorDesconto)}`;
        if (elCobrado) elCobrado.innerText = formatarMoeda(valorCobrado);
        if (elDescBadge) elDescBadge.innerText = `${descPct.toFixed(0)}%`;
        if (elDetConsumo) elDetConsumo.innerText = `${consumo.toFixed(1)} kWh`;
        if (elDetCreditos) elDetCreditos.innerText = `${creditos.toFixed(1)} kWh`;
        if (elDetIlum) elDetIlum.innerText = formatarMoeda(ilum);
    }

    async function submeterFatura() {
        const clienteId = parseInt(document.getElementById('emissao-cliente')?.value || '0');
        const mes = document.getElementById('emissao-mes')?.value;
        const consumo = parseFloat(document.getElementById('emissao-consumo')?.value || '0');
        const creditos = parseFloat(document.getElementById('emissao-creditos')?.value || '0');
        const ilum = parseFloat(document.getElementById('emissao-iluminacao')?.value || '0');
        const tarifa = parseFloat(document.getElementById('emissao-tarifa')?.value || '0.95');
        const descPct = parseFloat(document.getElementById('emissao-desconto-pct')?.value || '15');
        const vencimento = document.getElementById('emissao-vencimento')?.value;
        const status = document.getElementById('emissao-status')?.value || 'emitida';

        if (clienteId <= 0) {
            App.showToast('Selecione um cliente para emissão.', 'error');
            return;
        }

        const payload = {
            cliente_id: clienteId,
            mes_referencia: mes,
            consumo_kwh: consumo,
            creditos_injetados_kwh: creditos,
            iluminacao_publica: ilum,
            tarifa_kwh: tarifa,
            desconto_pct: descPct,
            data_vencimento: vencimento,
            status: status
        };

        try {
            await API.createStartupFatura(payload);
            App.showToast('Fatura solar emitida com sucesso!', 'success');
            switchTab('painel');
            load();
        } catch (err) {
            App.showToast(err.message, 'error');
        }
    }

    /* ========================================================
     * VISTA 2: PAINEL DE CONTROLE DE FATURAS
     * ======================================================== */
    function renderPainelFaturas(container) {
        if (faturasList.length === 0) {
            container.innerHTML = `
                <div class="glass-card rounded-3xl p-12 text-center text-zinc-500 space-y-3">
                    <div class="w-12 h-12 mx-auto rounded-2xl bg-lime-400/10 text-lime-400 border border-lime-400/20 flex items-center justify-center text-xl">🧾</div>
                    <p class="text-sm font-bold text-white">Nenhuma fatura emitida ainda</p>
                    <p class="text-xs max-w-sm mx-auto">Use o Robô Emissor para lançar a primeira fatura da usina com base na conta da Energisa.</p>
                    <button type="button" onclick="StartupFaturamento.switchTab('emissao')" class="px-5 py-2.5 bg-lime-400 hover:bg-lime-300 text-black font-extrabold text-xs rounded-full shadow-lg transition-all">
                        ⚡ Emitir Primeira Fatura
                    </button>
                </div>
            `;
            return;
        }

        // Resumo do painel
        const totalFaturas = faturasList.length;
        const pagas = faturasList.filter(f => f.status === 'paga');
        const totalRecebido = pagas.reduce((acc, f) => acc + parseFloat(f.valor_cobrado || 0), 0);
        const pendentes = faturasList.filter(f => ['emitida', 'enviada', 'atrasada'].includes(f.status));
        const totalPendente = pendentes.reduce((acc, f) => acc + parseFloat(f.valor_cobrado || 0), 0);

        let html = `
            <!-- Cards de Resumo de Faturamento -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div class="glass-card rounded-3xl p-4 space-y-1">
                    <span class="text-[10px] text-zinc-400 uppercase font-bold">Total Recebido (Pagas)</span>
                    <p class="text-2xl font-black text-emerald-400">${formatarMoeda(totalRecebido)}</p>
                    <p class="text-[10px] text-zinc-500">${pagas.length} faturas quitadas</p>
                </div>
                <div class="glass-card rounded-3xl p-4 space-y-1">
                    <span class="text-[10px] text-zinc-400 uppercase font-bold">A Receber / Em Aberto</span>
                    <p class="text-2xl font-black text-amber-400">${formatarMoeda(totalPendente)}</p>
                    <p class="text-[10px] text-zinc-500">${pendentes.length} faturas pendentes</p>
                </div>
                <div class="glass-card rounded-3xl p-4 space-y-1 sm:col-span-2 lg:col-span-1">
                    <span class="text-[10px] text-zinc-400 uppercase font-bold">Total de Faturas Emitidas</span>
                    <p class="text-2xl font-black text-white">${totalFaturas}</p>
                    <p class="text-[10px] text-zinc-500">Histórico completo</p>
                </div>
            </div>

            <!-- Tabela e Cards de Faturas -->
            <div class="glass-card rounded-3xl p-5 space-y-4">
                <div class="flex items-center justify-between flex-wrap gap-2">
                    <div>
                        <h4 class="font-extrabold text-sm text-white">Faturas Emitidas</h4>
                        <span class="text-xs text-zinc-400">${totalFaturas} faturas registradas</span>
                    </div>
                </div>
        `;

        let cardsHtml = '';
        let tableRowsHtml = '';

        faturasList.forEach(fat => {
            const statusBadge = getFaturaStatusBadge(fat.status);
            const isPaga = fat.status === 'paga';
            const consumoKwh = parseFloat(fat.consumo_kwh || 0).toFixed(0);
            const creditosInjKwh = parseFloat(fat.creditos_injetados_kwh || 0).toFixed(0);
            const descPct = parseFloat(fat.desconto_pct || 0).toFixed(0);

            // Card para telas menores/janelas minimizadas
            cardsHtml += `
                <div class="rounded-2xl border border-white/5 bg-white/[0.02] p-4 space-y-3 hover:border-white/10 transition-all">
                    <div class="flex items-start justify-between gap-2">
                        <div class="min-w-0">
                            <div class="flex items-center gap-2 mb-1 flex-wrap">
                                <span class="font-mono font-bold text-xs text-lime-400 bg-lime-400/10 px-2 py-0.5 rounded-md border border-lime-400/20">${fat.mes_referencia}</span>
                                ${statusBadge}
                            </div>
                            <h5 class="font-bold text-sm text-white truncate" title="${escapeHtml(fat.cliente_nome)}">${escapeHtml(fat.cliente_nome)}</h5>
                            <span class="text-[10px] font-mono text-zinc-400">UC: ${escapeHtml(fat.numero_uc || 'Sem UC')}</span>
                        </div>
                        <div class="text-right shrink-0">
                            <span class="text-[9px] uppercase font-bold text-zinc-500 block">Total a Pagar</span>
                            <span class="text-base font-black text-white tracking-tight">${formatarMoeda(fat.valor_cobrado)}</span>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-black/40 border border-white/5 text-xs">
                        <div>
                            <span class="text-[9px] text-zinc-500 uppercase block font-bold">Consumo / Injetado</span>
                            <span class="text-zinc-200 font-mono">${consumoKwh} kWh</span>
                            <span class="text-[10px] text-lime-400 font-mono block font-bold">${creditosInjKwh} kWh inj.</span>
                        </div>
                        <div>
                            <span class="text-[9px] text-zinc-500 uppercase block font-bold">Valor Energisa</span>
                            <span class="text-zinc-300 font-mono">${formatarMoeda(fat.valor_energisa)}</span>
                        </div>
                        <div>
                            <span class="text-[9px] text-zinc-500 uppercase block font-bold">Desconto Solar</span>
                            <span class="text-emerald-400 font-mono font-bold">- ${formatarMoeda(fat.valor_desconto)} (${descPct}%)</span>
                        </div>
                        <div>
                            <span class="text-[9px] text-zinc-500 uppercase block font-bold">Vencimento</span>
                            <span class="text-zinc-200 font-mono">${formatarData(fat.data_vencimento)}</span>
                        </div>
                    </div>

                    <div class="flex items-center justify-between pt-1 border-t border-white/5 text-xs flex-wrap gap-2">
                        <div>
                            ${isPaga ? `
                                <span class="text-[10px] text-zinc-500 font-mono">Pago em ${formatarData(fat.data_pagamento)}</span>
                            ` : `
                                <span class="text-[10px] text-amber-400 font-medium flex items-center gap-1">
                                    <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                                    Aguardando pagamento
                                </span>
                            `}
                        </div>
                        <div class="flex items-center gap-1.5 ml-auto">
                            ${!isPaga ? `
                                <button type="button" onclick="StartupFaturamento.marcarComoPaga(${fat.id})" class="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 font-bold text-xs transition-all flex items-center gap-1" title="Confirmar Pagamento">
                                    ✓ Paga
                                </button>
                            ` : ''}
                            <button type="button" onclick="StartupFaturamento.verEspelhoFatura(${fat.id})" class="px-2.5 py-1.5 text-zinc-300 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold transition-all flex items-center gap-1" title="Ver Espelho da Fatura">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                                <span>Espelho</span>
                            </button>
                            <button type="button" onclick="StartupFaturamento.excluirFatura(${fat.id})" class="p-1.5 text-zinc-500 hover:text-red-400 rounded-xl hover:bg-red-500/10 transition-all" title="Excluir Fatura">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                        </div>
                    </div>
                </div>
            `;

            // Linha da tabela para desktop / tela cheia
            tableRowsHtml += `
                <tr class="hover:bg-white/[0.02] transition-colors">
                    <td class="py-3 px-3 font-mono font-bold text-lime-400 whitespace-nowrap">${fat.mes_referencia}</td>
                    <td class="py-3 px-3 whitespace-nowrap">
                        <div class="font-bold text-white truncate max-w-[180px]" title="${escapeHtml(fat.cliente_nome)}">${escapeHtml(fat.cliente_nome)}</div>
                        <span class="text-[10px] font-mono text-zinc-500">${escapeHtml(fat.numero_uc || 'Sem UC')}</span>
                    </td>
                    <td class="py-3 px-3 text-zinc-300 whitespace-nowrap">
                        <div>${consumoKwh} kWh</div>
                        <span class="text-[10px] text-lime-400 font-bold">${creditosInjKwh} kWh inj.</span>
                    </td>
                    <td class="py-3 px-3 text-zinc-400 font-mono whitespace-nowrap">${formatarMoeda(fat.valor_energisa)}</td>
                    <td class="py-3 px-3 text-emerald-400 font-mono font-bold whitespace-nowrap">- ${formatarMoeda(fat.valor_desconto)} (${descPct}%)</td>
                    <td class="py-3 px-3 text-white font-mono font-black text-sm whitespace-nowrap">${formatarMoeda(fat.valor_cobrado)}</td>
                    <td class="py-3 px-3 text-zinc-300 font-mono whitespace-nowrap">${formatarData(fat.data_vencimento)}</td>
                    <td class="py-3 px-3 whitespace-nowrap">${statusBadge}</td>
                    <td class="py-3 px-3 text-right whitespace-nowrap">
                        <div class="flex items-center justify-end gap-1">
                            ${!isPaga ? `
                                <button type="button" onclick="StartupFaturamento.marcarComoPaga(${fat.id})" class="px-2.5 py-1 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 font-bold text-[10px] transition-all" title="Confirmar Pagamento">
                                    ✓ Paga
                                </button>
                            ` : `
                                <span class="text-[10px] text-zinc-500 px-2 py-1 font-mono">Pago em ${formatarData(fat.data_pagamento)}</span>
                            `}
                            <button type="button" onclick="StartupFaturamento.verEspelhoFatura(${fat.id})" class="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-white/10 transition-all" title="Ver Espelho da Fatura">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                            </button>
                            <button type="button" onclick="StartupFaturamento.excluirFatura(${fat.id})" class="p-1.5 text-zinc-500 hover:text-red-400 rounded-xl hover:bg-red-500/10 transition-all" title="Excluir Fatura">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });

        html += `
                <!-- Visão Mobile/Minimizada: Cards -->
                <div class="block lg:hidden space-y-3">
                    ${cardsHtml}
                </div>

                <!-- Visão Desktop/Maximizada: Tabela Completa com Scroll Suave -->
                <div class="hidden lg:block overflow-x-auto pb-1">
                    <table class="w-full text-left text-xs min-w-[920px]">
                        <thead>
                            <tr class="border-b border-white/10 text-zinc-400 text-[10px] uppercase tracking-wider">
                                <th class="pb-3 px-3 font-bold whitespace-nowrap">Mês Ref.</th>
                                <th class="pb-3 px-3 font-bold whitespace-nowrap">Cliente / UC</th>
                                <th class="pb-3 px-3 font-bold whitespace-nowrap">Consumo / Injetados</th>
                                <th class="pb-3 px-3 font-bold whitespace-nowrap">Valor Energisa</th>
                                <th class="pb-3 px-3 font-bold whitespace-nowrap">Desconto</th>
                                <th class="pb-3 px-3 font-bold whitespace-nowrap">A Pagar (Solar)</th>
                                <th class="pb-3 px-3 font-bold whitespace-nowrap">Vencimento</th>
                                <th class="pb-3 px-3 font-bold whitespace-nowrap">Status</th>
                                <th class="pb-3 px-3 font-bold text-right whitespace-nowrap">Ações</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-white/5">
                            ${tableRowsHtml}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    function getFaturaStatusBadge(status) {
        const map = {
            paga: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
            emitida: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
            enviada: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
            atrasada: 'bg-red-500/15 text-red-400 border-red-500/30',
            rascunho: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
            cancelada: 'bg-zinc-700/20 text-zinc-500 border-zinc-700/30'
        };
        const labelMap = {
            paga: 'Paga',
            emitida: 'Emitida',
            enviada: 'Enviada',
            atrasada: 'Vencida',
            rascunho: 'Rascunho',
            cancelada: 'Cancelada'
        };

        const cls = map[status] || map.emitida;
        const lbl = labelMap[status] || status;

        return `<span class="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${cls}">${lbl}</span>`;
    }

    async function marcarComoPaga(faturaId) {
        try {
            await API.updateStartupFaturaStatus(faturaId, 'paga');
            App.showToast('Fatura marcada como Paga e recebimento registrado no Financeiro!', 'success');
            load();
        } catch (err) {
            App.showToast(err.message, 'error');
        }
    }

    async function excluirFatura(faturaId) {
        if (!confirm('Deseja realmente remover esta fatura?')) return;
        try {
            await API.deleteStartupFatura(faturaId);
            App.showToast('Fatura excluída com sucesso!', 'success');
            load();
        } catch (err) {
            App.showToast(err.message, 'error');
        }
    }

    async function verEspelhoFatura(faturaId) {
        try {
            const resp = await API.getStartupFatura(faturaId);
            const fat = resp.fatura;
            if (!fat) return;

            const existing = document.getElementById('modal-espelho-fatura');
            if (existing) existing.remove();

            const modalHtml = `
                <div id="modal-espelho-fatura" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div class="max-w-lg w-full bg-[#121217] border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl space-y-5">
                        <div class="flex items-center justify-between pb-3 border-b border-white/5">
                            <div>
                                <span class="text-[10px] font-extrabold text-lime-400 uppercase tracking-wider">Espelho de Cobrança</span>
                                <h3 class="text-base font-extrabold text-white">Fatura Solar • ${fat.mes_referencia}</h3>
                            </div>
                            <button type="button" onclick="document.getElementById('modal-espelho-fatura').remove()" class="text-zinc-400 hover:text-white p-2 rounded-xl hover:bg-white/5 transition-all">
                                ✕
                            </button>
                        </div>

                        <!-- Detalhes do Cliente -->
                        <div class="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2 text-xs">
                            <div class="flex justify-between">
                                <span class="text-zinc-400">Cliente:</span>
                                <span class="font-bold text-white">${escapeHtml(fat.cliente_nome)}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-zinc-400">Unidade Consumidora (UC):</span>
                                <span class="font-mono text-emerald-400 font-bold">${escapeHtml(fat.numero_uc || '-')}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-zinc-400">Vencimento:</span>
                                <span class="text-zinc-200 font-bold">${formatarData(fat.data_vencimento)}</span>
                            </div>
                        </div>

                        <!-- Demonstrativo de Valores -->
                        <div class="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2.5 text-xs">
                            <div class="flex justify-between text-zinc-300">
                                <span>Energisa (Sem Usina Solar):</span>
                                <span class="font-mono">${formatarMoeda(fat.valor_energisa)}</span>
                            </div>
                            <div class="flex justify-between text-emerald-400 font-bold">
                                <span>Desconto Solar (${parseFloat(fat.desconto_pct).toFixed(0)}%):</span>
                                <span class="font-mono">- ${formatarMoeda(fat.valor_desconto)}</span>
                            </div>
                            <div class="h-px bg-white/10 my-1"></div>
                            <div class="flex justify-between text-sm font-black text-white">
                                <span>Valor Líquido a Pagar:</span>
                                <span class="text-lime-400 font-mono text-base">${formatarMoeda(fat.valor_cobrado)}</span>
                            </div>
                        </div>

                        <div class="flex items-center justify-end gap-3 pt-2">
                            <button type="button" onclick="document.getElementById('modal-espelho-fatura').remove()" class="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-full transition-all">
                                Fechar
                            </button>
                            ${fat.status !== 'paga' ? `
                                <button type="button" onclick="StartupFaturamento.marcarComoPaga(${fat.id}); document.getElementById('modal-espelho-fatura').remove();" class="px-5 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-black font-extrabold text-xs rounded-full shadow-lg transition-all">
                                    Confirmar Recebimento
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHtml);
        } catch (err) {
            App.showToast(err.message, 'error');
        }
    }

    function calcularDataVencimentoPadrao() {
        const d = new Date();
        d.setDate(d.getDate() + 15);
        return d.toISOString().split('T')[0];
    }

    function formatarMoeda(val) {
        const n = parseFloat(val) || 0;
        return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function formatarData(dataStr) {
        if (!dataStr) return '-';
        const parts = dataStr.split('-');
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return dataStr;
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
        switchTab,
        openEmissaoParaCliente,
        marcarComoPaga,
        excluirFatura,
        verEspelhoFatura
    };
})();
