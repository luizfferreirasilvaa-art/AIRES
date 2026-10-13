/**
 * AIRES - Módulo Startup: Faturamento Solar
 * Robô Emissor em Tempo Real + Fatura Padrão INJETAMT + Painel de Gestão
 * Obsidian Dark Glassmorphism
 */

const StartupFaturamento = (() => {
    let currentTab = 'painel'; // 'painel' ou 'emissao'
    let faturasList = [];
    let clientesList = [];
    let faturaAtualModal = null; // Dados da fatura aberta no modal para impressão

    const MESES_PT = {
        '01': 'JANEIRO',
        '02': 'FEVEREIRO',
        '03': 'MARÇO',
        '04': 'ABRIL',
        '05': 'MAIO',
        '06': 'JUNHO',
        '07': 'JULHO',
        '08': 'AGOSTO',
        '09': 'SETEMBRO',
        '10': 'OUTUBRO',
        '11': 'NOVEMBRO',
        '12': 'DEZEMBRO'
    };

    function init() {
        // Inicialização sob demanda
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
     * VISTA 1: ROBÔ EMISSOR DE FATURAS + FATURA PADRÃO AO VIVO
     * ======================================================== */
    function renderEmissorRobo(container) {
        const mesAtual = new Date().toISOString().substring(0, 7);

        container.innerHTML = `
            <div class="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                
                <!-- COLUNA ESQUERDA: FORMULÁRIO DO ROBÔ EMISSOR -->
                <div class="xl:col-span-5 space-y-4">
                    <div class="glass-card rounded-3xl p-5 sm:p-6 space-y-4 border border-lime-400/20">
                        
                        <!-- Topo do Card -->
                        <div class="flex items-center justify-between pb-3 border-b border-white/5">
                            <div class="flex items-center gap-2.5">
                                <div class="w-9 h-9 rounded-2xl bg-lime-400/10 text-lime-400 border border-lime-400/20 flex items-center justify-center text-lg">
                                    🤖
                                </div>
                                <div>
                                    <h4 class="font-extrabold text-sm text-white">Robô de Emissão Solar</h4>
                                    <p class="text-[11px] text-zinc-400">Preencha os dados para alimentar a fatura ao vivo.</p>
                                </div>
                            </div>
                        </div>

                        <!-- Botão de Ação Rápida: Modelo Exemplar (Ziulmar) -->
                        <button type="button" onclick="StartupFaturamento.carregarExemplarZiulmar()" class="w-full py-2.5 px-3 bg-gradient-to-r from-lime-400/15 via-emerald-400/15 to-lime-400/15 hover:from-lime-400/25 hover:to-lime-400/25 text-lime-400 border border-lime-400/30 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm group">
                            <span class="group-hover:rotate-12 transition-transform">⚡</span>
                            <span>Carregar Dados da Fatura Exemplar (Ziulmar)</span>
                        </button>

                        <form id="form-emissor-fatura" class="space-y-4">
                            
                            <!-- Cliente e Mês -->
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div class="sm:col-span-2">
                                    <label class="block text-xs font-semibold text-zinc-300 mb-1">Selecione o Cliente *</label>
                                    <select id="emissao-cliente" required class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-lime-400 transition-colors">
                                        <option value="">Selecione um cliente...</option>
                                        ${clientesList.map(c => `
                                            <option value="${c.id}" 
                                                data-nome="${escapeHtml(c.nome)}" 
                                                data-endereco="${escapeHtml(c.endereco || '')}"
                                                data-codigo="${escapeHtml(c.cpf_cnpj || '')}" 
                                                data-uc="${escapeHtml(c.numero_uc || '')}" 
                                                data-desc="${c.desconto_padrao_pct || 20}">
                                                ${escapeHtml(c.nome)} (UC: ${escapeHtml(c.numero_uc || 'Sem UC')})
                                            </option>
                                        `).join('')}
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-xs font-semibold text-zinc-300 mb-1">Mês de Referência *</label>
                                    <input type="month" id="emissao-mes" required value="${mesAtual}" class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white font-mono focus:outline-none focus:border-lime-400">
                                </div>
                                <div>
                                    <label class="block text-xs font-semibold text-zinc-300 mb-1">Data de Vencimento *</label>
                                    <input type="date" id="emissao-vencimento" required value="${calcularDataVencimentoPadrao()}" class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white font-mono focus:outline-none focus:border-lime-400">
                                </div>
                            </div>

                            <!-- Dados Extraídos da Conta Energisa -->
                            <div class="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                                <h5 class="text-[10px] font-extrabold text-lime-400 uppercase tracking-wider flex items-center justify-between">
                                    <span>⚡ Dados da Fatura Energisa</span>
                                    <span class="text-zinc-500 font-normal">Calcula em tempo real</span>
                                </h5>

                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label class="block text-[11px] font-semibold text-zinc-300 mb-1">Consumo (kWh) *</label>
                                        <input type="number" step="0.01" min="0" id="emissao-consumo" required placeholder="Ex: 465" class="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-xl text-xs text-white font-mono font-bold focus:outline-none focus:border-lime-400">
                                    </div>
                                    <div>
                                        <label class="block text-[11px] font-semibold text-zinc-300 mb-1">Tarifa Unitária (R$ Unt) *</label>
                                        <input type="number" step="0.0001" min="0.01" id="emissao-tarifa" required value="1.19" placeholder="Ex: 1.19" class="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-xl text-xs text-zinc-300 font-mono focus:outline-none focus:border-lime-400">
                                    </div>
                                    <div>
                                        <label class="block text-[11px] font-semibold text-zinc-300 mb-1">Total Consumo (R$) *</label>
                                        <input type="number" step="0.01" min="0" id="emissao-total-consumo" required placeholder="Ex: 555.25" class="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-xl text-xs text-zinc-200 font-mono focus:outline-none focus:border-lime-400">
                                    </div>
                                    <div>
                                        <label class="block text-[11px] font-semibold text-zinc-300 mb-1">Contrib. Ilum. Pública (R$) *</label>
                                        <input type="number" step="0.01" min="0" id="emissao-iluminacao" required placeholder="Ex: 26.62" class="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-lime-400">
                                    </div>
                                </div>

                                <div class="pt-1">
                                    <div class="flex items-center justify-between mb-1">
                                        <label class="text-[11px] font-semibold text-zinc-300">Desconto Acordado (%) *</label>
                                        <span class="text-xs font-black text-emerald-400 font-mono" id="label-desconto-pct">20%</span>
                                    </div>
                                    <div class="flex items-center gap-3">
                                        <input type="range" min="1" max="40" step="0.5" id="emissao-desconto-slider" value="20" class="flex-1 accent-lime-400">
                                        <input type="number" min="1" max="100" step="0.5" id="emissao-desconto-pct" value="20" class="w-20 px-2 py-1.5 bg-zinc-900 border border-white/10 rounded-xl text-xs text-emerald-400 font-mono font-bold text-center focus:outline-none focus:border-lime-400">
                                    </div>
                                </div>
                            </div>

                            <!-- Seção Retrátil: Dados Bancários e Assinatura -->
                            <details class="group rounded-2xl bg-white/[0.02] border border-white/5 transition-all">
                                <summary class="px-4 py-2.5 cursor-pointer text-[11px] font-bold text-zinc-400 flex items-center justify-between select-none">
                                    <span>⚙️ Dados de Pagamento & Assinatura da Fatura</span>
                                    <span class="group-open:rotate-180 transition-transform">▼</span>
                                </summary>
                                <div class="p-4 pt-1 space-y-3 border-t border-white/5">
                                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                        <div>
                                            <label class="block text-[10px] font-semibold text-zinc-400 mb-0.5">Instituição Financeira</label>
                                            <input type="text" id="emissao-banco" value="NuBank" class="w-full px-2.5 py-1.5 bg-zinc-900 border border-white/10 rounded-xl text-xs text-zinc-300 focus:outline-none focus:border-lime-400">
                                        </div>
                                        <div>
                                            <label class="block text-[10px] font-semibold text-zinc-400 mb-0.5">Boleto ou Chave Pix</label>
                                            <input type="text" id="emissao-pix" value="60366165000103" class="w-full px-2.5 py-1.5 bg-zinc-900 border border-white/10 rounded-xl text-xs text-zinc-300 font-mono focus:outline-none focus:border-lime-400">
                                        </div>
                                        <div>
                                            <label class="block text-[10px] font-semibold text-zinc-400 mb-0.5">Em Nome de (Favorecido)</label>
                                            <input type="text" id="emissao-titular" value="Luiz Felipe Ferreira da Silva" class="w-full px-2.5 py-1.5 bg-zinc-900 border border-white/10 rounded-xl text-xs text-zinc-300 focus:outline-none focus:border-lime-400">
                                        </div>
                                        <div>
                                            <label class="block text-[10px] font-semibold text-zinc-400 mb-0.5">Nome do Assinante</label>
                                            <input type="text" id="emissao-assinante" value="Luiz Felipe Silva" class="w-full px-2.5 py-1.5 bg-zinc-900 border border-white/10 rounded-xl text-xs text-zinc-300 focus:outline-none focus:border-lime-400">
                                        </div>
                                        <div class="sm:col-span-2">
                                            <label class="block text-[10px] font-semibold text-zinc-400 mb-0.5">Cargo / Título</label>
                                            <input type="text" id="emissao-cargo" value="Administrator" class="w-full px-2.5 py-1.5 bg-zinc-900 border border-white/10 rounded-xl text-xs text-zinc-300 focus:outline-none focus:border-lime-400">
                                        </div>
                                    </div>
                                </div>
                            </details>

                            <!-- Status Inicial e Ações -->
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                                <div>
                                    <label class="block text-[11px] font-semibold text-zinc-300 mb-1">Status Inicial</label>
                                    <select id="emissao-status" class="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-lime-400">
                                        <option value="emitida">📄 Emitida (Aguardando)</option>
                                        <option value="enviada">🚀 Enviada ao Cliente</option>
                                        <option value="paga">✅ Paga (Quitação)</option>
                                        <option value="rascunho">📝 Rascunho</option>
                                    </select>
                                </div>
                                <div class="flex items-center justify-end gap-2 pt-5">
                                    <button type="button" onclick="StartupFaturamento.imprimirFaturaAoVivo()" class="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs rounded-full transition-all flex items-center gap-1.5" title="Imprimir ou Salvar PDF">
                                        <span>🖨️ Imprimir / PDF</span>
                                    </button>
                                    <button type="submit" class="px-5 py-2 bg-lime-400 hover:bg-lime-300 text-black font-extrabold text-xs rounded-full shadow-lg shadow-lime-400/20 transition-all flex items-center gap-1.5 active:scale-95">
                                        <span>⚡ Emitir & Salvar</span>
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>

                <!-- COLUNA DIREITA: FATURA PADRÃO INJETAMT (RENDERIZAÇÃO EM TEMPO REAL) -->
                <div class="xl:col-span-7 space-y-3">
                    
                    <!-- Barra de Controle do Preview -->
                    <div class="flex items-center justify-between flex-wrap gap-2 px-1">
                        <div class="flex items-center gap-2">
                            <span class="text-xs font-black uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                                <span class="w-2.5 h-2.5 rounded-full bg-lime-400 animate-pulse"></span>
                                Fatura Padrão INJETAMT (Ao Vivo)
                            </span>
                            <span class="text-[10px] px-2 py-0.5 rounded-full bg-lime-400/10 text-lime-400 border border-lime-400/20 font-bold">
                                Espelho Físico
                            </span>
                        </div>
                        <div class="flex items-center gap-2">
                            <button type="button" onclick="StartupFaturamento.imprimirFaturaAoVivo()" class="px-3.5 py-1.5 bg-lime-400 hover:bg-lime-300 text-zinc-950 font-black text-xs rounded-full shadow-md transition-all flex items-center gap-1.5 active:scale-95">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                                <span>Imprimir / Gerar PDF</span>
                            </button>
                        </div>
                    </div>

                    <!-- Container da Folha Físico-Digital da Fatura Padrão -->
                    <div id="fatura-padrao-preview-container" class="transition-all">
                        <!-- O conteúdo é preenchido dinamicamente por recalcularPreview() -->
                    </div>
                </div>

            </div>
        `;

        bindEmissorEvents();
    }

    function bindEmissorEvents() {
        const selectCli = document.getElementById('emissao-cliente');
        const inputMes = document.getElementById('emissao-mes');
        const inputVenc = document.getElementById('emissao-vencimento');
        const inputConsumo = document.getElementById('emissao-consumo');
        const inputTarifa = document.getElementById('emissao-tarifa');
        const inputTotalConsumo = document.getElementById('emissao-total-consumo');
        const inputIlum = document.getElementById('emissao-iluminacao');
        const inputDesc = document.getElementById('emissao-desconto-pct');
        const sliderDesc = document.getElementById('emissao-desconto-slider');
        const inputBanco = document.getElementById('emissao-banco');
        const inputPix = document.getElementById('emissao-pix');
        const inputTitular = document.getElementById('emissao-titular');
        const inputAssinante = document.getElementById('emissao-assinante');
        const inputCargo = document.getElementById('emissao-cargo');
        const form = document.getElementById('form-emissor-fatura');

        // Seleção de cliente auto-preenche dados
        selectCli?.addEventListener('change', () => {
            const opt = selectCli.selectedOptions[0];
            if (opt && opt.value) {
                const desc = parseFloat(opt.dataset.desc || '20');
                if (inputDesc) inputDesc.value = desc;
                if (sliderDesc) sliderDesc.value = desc;
                const lblDesc = document.getElementById('label-desconto-pct');
                if (lblDesc) lblDesc.innerText = `${desc}%`;
            }
            recalcularPreview();
        });

        // Sincronização entre Slider e Input de Desconto
        sliderDesc?.addEventListener('input', () => {
            if (inputDesc) inputDesc.value = sliderDesc.value;
            const lblDesc = document.getElementById('label-desconto-pct');
            if (lblDesc) lblDesc.innerText = `${sliderDesc.value}%`;
            recalcularPreview();
        });

        inputDesc?.addEventListener('input', () => {
            if (sliderDesc) sliderDesc.value = inputDesc.value;
            const lblDesc = document.getElementById('label-desconto-pct');
            if (lblDesc) lblDesc.innerText = `${inputDesc.value}%`;
            recalcularPreview();
        });

        // Quando o Consumo ou Tarifa mudam, atualiza o Total do Consumo
        inputConsumo?.addEventListener('input', () => {
            const consumo = parseFloat(inputConsumo.value || '0');
            const tarifa = parseFloat(inputTarifa?.value || '1.19');
            if (inputTotalConsumo && consumo > 0) {
                inputTotalConsumo.value = (consumo * tarifa).toFixed(2);
            }
            recalcularPreview();
        });

        inputTarifa?.addEventListener('input', () => {
            const consumo = parseFloat(inputConsumo?.value || '0');
            const tarifa = parseFloat(inputTarifa.value || '0');
            if (inputTotalConsumo && consumo > 0 && tarifa > 0) {
                inputTotalConsumo.value = (consumo * tarifa).toFixed(2);
            }
            recalcularPreview();
        });

        // Quando o Total de Consumo é digitado diretamente, recalcula a tarifa unitária
        inputTotalConsumo?.addEventListener('input', () => {
            const consumo = parseFloat(inputConsumo?.value || '0');
            const total = parseFloat(inputTotalConsumo.value || '0');
            if (consumo > 0 && total > 0 && inputTarifa) {
                inputTarifa.value = (total / consumo).toFixed(4);
            }
            recalcularPreview();
        });

        [inputMes, inputVenc, inputIlum, inputBanco, inputPix, inputTitular, inputAssinante, inputCargo].forEach(inp => {
            inp?.addEventListener('input', recalcularPreview);
        });

        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await submeterFatura();
        });

        // Tentar carregar cliente Ziulmar por padrão se existir
        const ziulmarOpt = Array.from(selectCli?.options || []).find(o => o.text.includes('ZIULMAR'));
        if (ziulmarOpt) {
            selectCli.value = ziulmarOpt.value;
            selectCli.dispatchEvent(new Event('change'));
        }

        recalcularPreview();
    }

    /**
     * Preenche automaticamente todos os dados com os valores exatos da Fatura Exemplar do usuário
     */
    function carregarExemplarZiulmar() {
        const selectCli = document.getElementById('emissao-cliente');
        const ziulmarOpt = Array.from(selectCli?.options || []).find(o => o.text.includes('ZIULMAR') || o.value === '5');
        if (ziulmarOpt && selectCli) {
            selectCli.value = ziulmarOpt.value;
        }

        const inputMes = document.getElementById('emissao-mes');
        const inputVenc = document.getElementById('emissao-vencimento');
        const inputConsumo = document.getElementById('emissao-consumo');
        const inputTarifa = document.getElementById('emissao-tarifa');
        const inputTotalConsumo = document.getElementById('emissao-total-consumo');
        const inputIlum = document.getElementById('emissao-iluminacao');
        const inputDesc = document.getElementById('emissao-desconto-pct');
        const sliderDesc = document.getElementById('emissao-desconto-slider');
        const lblDesc = document.getElementById('label-desconto-pct');

        if (inputMes) inputMes.value = '2026-08';
        if (inputVenc) inputVenc.value = '2026-10-21';
        if (inputConsumo) inputConsumo.value = '465';
        if (inputTarifa) inputTarifa.value = '1.19';
        if (inputTotalConsumo) inputTotalConsumo.value = '555.25';
        if (inputIlum) inputIlum.value = '26.62';
        if (inputDesc) inputDesc.value = '20';
        if (sliderDesc) sliderDesc.value = '20';
        if (lblDesc) lblDesc.innerText = '20%';

        recalcularPreview();
        App.showToast('Dados da fatura exemplar (Ziulmar / Agosto) carregados!', 'success');
    }

    /**
     * Extrai os dados do formulário atual e calcula todos os totais matematicamente
     */
    function extrairDadosFormulario() {
        const selectCli = document.getElementById('emissao-cliente');
        const opt = selectCli?.selectedOptions[0];

        const clienteNome = opt?.dataset.nome || (opt?.value ? opt.text.split('(')[0].trim() : 'NOME DO CLIENTE');
        const endereco = opt?.dataset.endereco || 'RUA OURO PRETO, SN - QD08LT13 - 78550001';
        const codigoCliente = opt?.dataset.codigo || '1.866.806.017-50';
        const codigoInstalacao = opt?.dataset.uc || '2077812';

        const mesRef = document.getElementById('emissao-mes')?.value || '2026-08';
        const vencimento = document.getElementById('emissao-vencimento')?.value || '2026-10-21';

        const consumo = parseFloat(document.getElementById('emissao-consumo')?.value || '0');
        const tarifa = parseFloat(document.getElementById('emissao-tarifa')?.value || '1.19');
        let totalConsumo = parseFloat(document.getElementById('emissao-total-consumo')?.value || '0');
        if (totalConsumo <= 0 && consumo > 0) {
            totalConsumo = Math.round(consumo * tarifa * 100) / 100;
        }

        const iluminacao = parseFloat(document.getElementById('emissao-iluminacao')?.value || '0');
        const descPct = parseFloat(document.getElementById('emissao-desconto-pct')?.value || '20');

        // Matemática da Fatura Padrão INJETAMT:
        // Sub Total = Total do Consumo kWh + Iluminação Pública
        const subtotal = Math.round((totalConsumo + iluminacao) * 100) / 100;

        // Desconto = Sub Total * (Desconto % / 100)
        const valorDesconto = Math.round(subtotal * (descPct / 100) * 100) / 100;

        // Total Final = Sub Total - Desconto
        const totalCobrado = Math.max(0, Math.round((subtotal - valorDesconto) * 100) / 100);

        const instituicao = document.getElementById('emissao-banco')?.value || 'NuBank';
        const chavePix = document.getElementById('emissao-pix')?.value || '60366165000103';
        const titular = document.getElementById('emissao-titular')?.value || 'Luiz Felipe Ferreira da Silva';
        const assinante = document.getElementById('emissao-assinante')?.value || 'Luiz Felipe Silva';
        const cargo = document.getElementById('emissao-cargo')?.value || 'Administrator';

        return {
            cliente_id: parseInt(selectCli?.value || '0'),
            cliente_nome: clienteNome,
            endereco: endereco,
            codigo_cliente: codigoCliente,
            codigo_instalacao: codigoInstalacao,
            mes_referencia: mesRef,
            mes_nome: obterNomeMes(mesRef),
            data_vencimento: vencimento,
            consumo_kwh: consumo,
            tarifa_kwh: tarifa,
            total_consumo: totalConsumo,
            iluminacao_publica: iluminacao,
            subtotal: subtotal,
            desconto_pct: descPct,
            valor_desconto: valorDesconto,
            total_cobrado: totalCobrado,
            instituicao: instituicao,
            chave_pix: chavePix,
            titular_nome: titular,
            assinatura_nome: assinante,
            assinatura_cargo: cargo
        };
    }

    /**
     * Recalcula a fatura e atualiza o espelho ao vivo em tempo real
     */
    function recalcularPreview() {
        const dados = extrairDadosFormulario();
        const containerPreview = document.getElementById('fatura-padrao-preview-container');
        if (containerPreview) {
            containerPreview.innerHTML = gerarFaturaPadraoHtml(dados, 'preview-live-sheet');
        }
    }

    /**
     * Gera o código HTML idêntico à Fatura Padrão INJETAMT física do PDF exemplar
     */
    function gerarFaturaPadraoHtml(dados, elementId = 'fatura-padrao-sheet') {
        const vConsumo = formatarMoeda(dados.total_consumo);
        const vIlum = formatarMoeda(dados.iluminacao_publica);
        const vSubtotal = formatarMoeda(dados.subtotal);
        const vDesconto = formatarMoeda(dados.valor_desconto);
        const vTotal = formatarMoeda(dados.total_cobrado);
        const vTarifa = formatarMoeda(dados.tarifa_kwh);
        const dataVencFormatada = formatarData(dados.data_vencimento);

        return `
            <div id="${elementId}" class="fatura-padrao-sheet bg-[#faf8f4] text-zinc-950 rounded-3xl p-5 sm:p-7 md:p-8 border-2 border-zinc-950 shadow-2xl relative select-text font-sans max-w-[660px] mx-auto transition-all">
                
                <!-- Font do Assinante Cursiva -->
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap" rel="stylesheet">

                <!-- 1. BLOCO SUPERIOR: DADOS DO CLIENTE + LOGO INJETAMT + VENCIMENTO + MÊS -->
                <div class="border-2 border-zinc-950 rounded-2xl p-4 sm:p-5 flex items-start justify-between gap-3 bg-white/40 mb-4 sm:mb-5">
                    <div class="min-w-0 pr-2">
                        <h2 class="font-black text-base sm:text-lg text-zinc-950 tracking-tight uppercase leading-snug break-words">
                            ${escapeHtml(dados.cliente_nome)}
                        </h2>
                        <p class="text-[10px] sm:text-[11px] text-zinc-800 font-semibold mt-1 uppercase leading-snug break-words">
                            ${escapeHtml(dados.endereco)}
                        </p>
                    </div>

                    <div class="text-right shrink-0">
                        <!-- Logo INJETAMT -->
                        <div class="flex items-center justify-end gap-1.5 mb-2">
                            <svg class="w-5 h-5 shrink-0" viewBox="0 0 36 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M2 7C8 2 16 2 22 7C28 12 34 12 36 7" stroke="#06b6d4" stroke-width="2.8" stroke-linecap="round"/>
                                <path d="M2 13C8 8 16 8 22 13C28 18 34 18 36 13" stroke="#10b981" stroke-width="2.8" stroke-linecap="round"/>
                            </svg>
                            <span class="font-black text-xs sm:text-sm tracking-wide text-zinc-950">INJETAMT</span>
                        </div>

                        <!-- Vencimento -->
                        <div class="text-[9px] uppercase font-bold text-zinc-800 tracking-wider">VENCIMENTO</div>
                        <div class="text-xs sm:text-sm font-black text-zinc-950 mb-1 font-mono">${dataVencFormatada}</div>

                        <!-- Mês de Referência -->
                        <div class="text-[9px] uppercase font-bold text-zinc-800 tracking-wider">MÊS</div>
                        <div class="text-xs sm:text-sm font-black text-zinc-950 uppercase tracking-wide">${dados.mes_nome}</div>
                    </div>
                </div>

                <!-- 2. BLOCO DE IDENTIFICAÇÃO E DESCONTO: CÓDIGO DO CLIENTE, INSTALAÇÃO E BADGE VERDE -->
                <div class="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center mb-4 sm:mb-5">
                    <div class="sm:col-span-4 text-left">
                        <div class="text-[9px] sm:text-[10px] uppercase font-bold text-zinc-800 tracking-wider mb-0.5">CÓDIGO DO CLIENTE</div>
                        <div class="text-base sm:text-lg font-black text-zinc-950 font-mono tracking-tight break-all">
                            ${escapeHtml(dados.codigo_cliente)}
                        </div>
                    </div>

                    <div class="sm:col-span-4 text-left sm:text-center">
                        <div class="text-[9px] sm:text-[10px] uppercase font-bold text-zinc-800 tracking-wider mb-0.5">CÓDIGO DA INSTALAÇÃO</div>
                        <div class="text-base sm:text-lg font-black text-zinc-950 font-mono tracking-tight">
                            ${escapeHtml(dados.codigo_instalacao)}
                        </div>
                    </div>

                    <div class="sm:col-span-4">
                        <div class="bg-[#72e342] border-2 border-zinc-950 rounded-2xl py-2 px-3 text-center shadow-sm">
                            <div class="text-[9px] uppercase font-black text-zinc-950 tracking-wider">DESCONTO</div>
                            <div class="text-base sm:text-lg font-black text-zinc-950 font-mono tracking-tight">${vDesconto}</div>
                        </div>
                    </div>
                </div>

                <!-- 3. TABELA DE ITENS - CABEÇALHO AMARELO -->
                <div class="bg-[#ebfa4a] border-2 border-zinc-950 rounded-2xl px-4 sm:px-6 py-2.5 grid grid-cols-12 text-[10px] sm:text-[11px] font-black uppercase text-zinc-950 tracking-wider shadow-sm mb-2.5">
                    <div class="col-span-5 text-left">DESCRIÇÃO</div>
                    <div class="col-span-2 text-center">QTD</div>
                    <div class="col-span-2 text-center">R$ Unt</div>
                    <div class="col-span-3 text-right">Total</div>
                </div>

                <!-- 4. TABELA DE ITENS - CORPO BRANCO COM BORDA PRETA -->
                <div class="border-2 border-zinc-950 rounded-2xl p-4 sm:p-6 bg-white/40 min-h-[160px] flex flex-col justify-start space-y-3.5 mb-4 sm:mb-5">
                    
                    <!-- Linha 1: Consumo em kWh -->
                    <div class="grid grid-cols-12 text-xs font-semibold text-zinc-900 items-center">
                        <div class="col-span-5 text-left font-medium">Consumo em kWh</div>
                        <div class="col-span-2 text-center font-mono">${dados.consumo_kwh} kWh</div>
                        <div class="col-span-2 text-center font-mono">${vTarifa}</div>
                        <div class="col-span-3 text-right font-mono font-bold">${vConsumo}</div>
                    </div>

                    <!-- Linha 2: Contrib de Ilum Pub. -->
                    <div class="grid grid-cols-12 text-xs font-semibold text-zinc-900 items-center">
                        <div class="col-span-5 text-left font-medium">Contrib de Ilum Pub.</div>
                        <div class="col-span-2 text-center font-mono">1</div>
                        <div class="col-span-2 text-center font-mono">-</div>
                        <div class="col-span-3 text-right font-mono font-bold">${vIlum}</div>
                    </div>

                </div>

                <!-- 5. BLOCO INFERIOR: PAGAMENTO + ASSINATURA À ESQUERDA | TOTAIS À DIREITA -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                    
                    <!-- Coluna Esquerda: Informações de pagamento + Assinatura -->
                    <div class="space-y-3">
                        <div class="border-2 border-zinc-950 rounded-2xl p-3.5 bg-white/40 space-y-1 text-xs text-zinc-900">
                            <div class="font-black text-[11px] uppercase tracking-wide text-zinc-950 mb-1.5">Informações de pagamento</div>
                            <div class="flex items-center gap-1.5"><span class="font-semibold text-zinc-700">Instituição:</span> <span class="font-bold text-zinc-950">${escapeHtml(dados.instituicao)}</span></div>
                            <div class="flex items-center gap-1.5 flex-wrap"><span class="font-semibold text-zinc-700">Boleto ou Chave Pix:</span> <span class="font-mono font-bold text-zinc-950 select-all">${escapeHtml(dados.chave_pix)}</span></div>
                            <div class="flex items-center gap-1.5"><span class="font-semibold text-zinc-700">Em Nome de:</span> <span class="font-medium text-zinc-950">${escapeHtml(dados.titular_nome)}</span></div>
                        </div>

                        <!-- Bloco de Assinatura Cursiva do Administrador -->
                        <div class="pt-1 text-center flex flex-col items-center justify-center">
                            <div class="text-3xl text-zinc-950 select-none tracking-wide" style="font-family: 'Dancing Script', 'Brush Script MT', 'Caveat', cursive;">LuizFS</div>
                            <div class="font-black text-xs text-zinc-950 tracking-tight -mt-1">${escapeHtml(dados.assinatura_nome)}</div>
                            <div class="text-[10px] text-zinc-600 font-medium">${escapeHtml(dados.assinatura_cargo)}</div>
                        </div>
                    </div>

                    <!-- Coluna Direita: Sub Total + Desconto + Total Final Amarelo -->
                    <div class="space-y-2.5">
                        <div class="border-2 border-zinc-950 rounded-2xl p-3.5 bg-white/40 space-y-2 text-xs text-zinc-900">
                            <div class="flex items-center justify-between font-bold">
                                <span class="text-zinc-800">Sub Total</span>
                                <span class="font-mono text-zinc-950 font-black">${vSubtotal}</span>
                            </div>
                            <div class="flex items-center justify-between font-bold">
                                <span class="text-zinc-800">Desconto</span>
                                <span class="font-mono text-zinc-950 font-black">${dados.desconto_pct}%</span>
                            </div>
                        </div>

                        <!-- Caixa Total Amarela com Borda Preta Grossa -->
                        <div class="bg-[#ebfa4a] border-2 border-zinc-950 rounded-2xl p-3.5 flex items-center justify-between shadow-sm">
                            <span class="font-black text-sm uppercase text-zinc-950">Total</span>
                            <span class="font-black text-lg sm:text-xl font-mono text-zinc-950">${vTotal}</span>
                        </div>
                    </div>

                </div>

            </div>
        `;
    }

    /**
     * Dispara a impressão limpa ou download em PDF da fatura ao vivo
     */
    function imprimirFaturaAoVivo() {
        const dados = extrairDadosFormulario();
        imprimirFaturaPadrao(dados);
    }

    /**
     * Imprime a fatura atualmente em exibição no modal
     */
    function imprimirFaturaModal() {
        if (!faturaAtualModal) return;
        imprimirFaturaPadrao(faturaAtualModal);
    }

    /**
     * Abre a janela de impressão nativa com estilo A4 limpo e cores preservadas
     */
    function imprimirFaturaPadrao(dados) {
        const htmlFatura = gerarFaturaPadraoHtml(dados, 'fatura-print-target');
        const win = window.open('', '_blank', 'width=900,height=1100');
        if (!win) {
            alert('Por favor, autorize pop-ups para imprimir a fatura.');
            return;
        }

        win.document.write(`
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <title>Fatura Solar INJETAMT - ${dados.cliente_nome} - ${dados.mes_nome}</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap" rel="stylesheet">
                <style>
                    @page {
                        size: A4 portrait;
                        margin: 10mm;
                    }
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    body {
                        background: #ffffff;
                        margin: 0;
                        padding: 12px;
                        font-family: ui-sans-serif, system-ui, sans-serif;
                    }
                    .print-wrapper {
                        max-width: 660px;
                        margin: 0 auto;
                    }
                </style>
            </head>
            <body>
                <div class="print-wrapper">
                    ${htmlFatura}
                </div>
                <script>
                    window.addEventListener('load', () => {
                        setTimeout(() => {
                            window.focus();
                            window.print();
                        }, 500);
                    });
                </script>
            </body>
            </html>
        `);
        win.document.close();
    }

    async function submeterFatura() {
        const dados = extrairDadosFormulario();

        if (dados.cliente_id <= 0) {
            App.showToast('Selecione um cliente para emitir a fatura.', 'error');
            return;
        }

        const status = document.getElementById('emissao-status')?.value || 'emitida';

        const payload = {
            cliente_id: dados.cliente_id,
            mes_referencia: dados.mes_referencia,
            consumo_kwh: dados.consumo_kwh,
            creditos_injetados_kwh: dados.consumo_kwh,
            iluminacao_publica: dados.iluminacao_publica,
            tarifa_kwh: dados.tarifa_kwh,
            valor_energisa: dados.subtotal,
            desconto_pct: dados.desconto_pct,
            valor_desconto: dados.valor_desconto,
            valor_cobrado: dados.total_cobrado,
            data_vencimento: dados.data_vencimento,
            status: status
        };

        try {
            await API.createStartupFatura(payload);
            App.showToast('Fatura padrão INJETAMT gerada e salva com sucesso!', 'success');
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
                    <button type="button" onclick="StartupFaturamento.switchTab('emissao')" class="px-3.5 py-1.5 bg-lime-400 hover:bg-lime-300 text-zinc-950 font-bold text-xs rounded-full shadow-sm transition-all flex items-center gap-1.5">
                        <span>+ Nova Fatura (Robô)</span>
                    </button>
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
                            <span class="text-[9px] text-zinc-500 uppercase block font-bold">Consumo</span>
                            <span class="text-zinc-200 font-mono">${consumoKwh} kWh</span>
                        </div>
                        <div>
                            <span class="text-[9px] text-zinc-500 uppercase block font-bold">Sub Total</span>
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
                            <button type="button" onclick="StartupFaturamento.verEspelhoFatura(${fat.id})" class="px-2.5 py-1.5 text-zinc-300 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold transition-all flex items-center gap-1" title="Ver Espelho da Fatura Padrão">
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
                            <button type="button" onclick="StartupFaturamento.verEspelhoFatura(${fat.id})" class="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-white/10 transition-all" title="Ver Espelho da Fatura Padrão">
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
                                <th class="pb-3 px-3 font-bold whitespace-nowrap">Consumo</th>
                                <th class="pb-3 px-3 font-bold whitespace-nowrap">Sub Total</th>
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

    /**
     * Abre o modal com o espelho oficial idêntico da Fatura Padrão INJETAMT
     */
    async function verEspelhoFatura(faturaId) {
        try {
            const resp = await API.getStartupFatura(faturaId);
            const fat = resp.fatura;
            if (!fat) return;

            const dadosModal = {
                cliente_id: fat.cliente_id,
                cliente_nome: fat.cliente_nome || 'CLIENTE NÃO IDENTIFICADO',
                endereco: fat.endereco || 'RUA OURO PRETO, SN - QD08LT13 - 78550001',
                codigo_cliente: fat.cpf_cnpj || '1.866.806.017-50',
                codigo_instalacao: fat.numero_uc || '2077812',
                mes_referencia: fat.mes_referencia,
                mes_nome: obterNomeMes(fat.mes_referencia),
                data_vencimento: fat.data_vencimento,
                consumo_kwh: parseFloat(fat.consumo_kwh || 0),
                tarifa_kwh: parseFloat(fat.tarifa_kwh || 1.19),
                total_consumo: Math.round(parseFloat(fat.consumo_kwh || 0) * parseFloat(fat.tarifa_kwh || 1.19) * 100) / 100,
                iluminacao_publica: parseFloat(fat.iluminacao_publica || 0),
                subtotal: parseFloat(fat.valor_energisa || 0),
                desconto_pct: parseFloat(fat.desconto_pct || 20),
                valor_desconto: parseFloat(fat.valor_desconto || 0),
                total_cobrado: parseFloat(fat.valor_cobrado || 0),
                instituicao: 'NuBank',
                chave_pix: '60366165000103',
                titular_nome: 'Luiz Felipe Ferreira da Silva',
                assinatura_nome: 'Luiz Felipe Silva',
                assinatura_cargo: 'Administrator'
            };

            faturaAtualModal = dadosModal;

            const existing = document.getElementById('modal-espelho-fatura');
            if (existing) existing.remove();

            const folhaHtml = gerarFaturaPadraoHtml(dadosModal, 'modal-fatura-sheet');

            const modalHtml = `
                <div id="modal-espelho-fatura" class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
                    <div class="max-w-3xl w-full my-auto bg-[#121217] border border-white/10 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-4">
                        
                        <!-- Barra Superior do Modal -->
                        <div class="flex items-center justify-between pb-3 border-b border-white/10 flex-wrap gap-2">
                            <div class="flex items-center gap-2">
                                <span class="text-sm font-extrabold text-white flex items-center gap-1.5">
                                    <span>📄</span>
                                    Espelho da Fatura Padrão INJETAMT • ${dadosModal.mes_referencia}
                                </span>
                                ${getFaturaStatusBadge(fat.status)}
                            </div>
                            <div class="flex items-center gap-2">
                                <button type="button" onclick="StartupFaturamento.imprimirFaturaModal()" class="px-3.5 py-1.5 bg-lime-400 hover:bg-lime-300 text-zinc-950 font-bold text-xs rounded-full shadow-md transition-all flex items-center gap-1.5 active:scale-95">
                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                                    <span>Imprimir / Salvar PDF</span>
                                </button>
                                <button type="button" onclick="document.getElementById('modal-espelho-fatura').remove()" class="text-zinc-400 hover:text-white p-2 rounded-xl hover:bg-white/5 transition-all text-base">
                                    ✕
                                </button>
                            </div>
                        </div>

                        <!-- Folha da Fatura Padrão Renderizada -->
                        <div class="max-h-[75vh] overflow-y-auto pr-1 py-1">
                            ${folhaHtml}
                        </div>

                        <!-- Barra Inferior de Ações -->
                        <div class="flex items-center justify-between gap-3 pt-3 border-t border-white/10 flex-wrap">
                            <div class="text-xs text-zinc-400">
                                ${fat.status === 'paga' ? `<span class="text-emerald-400 font-bold">✓ Fatura quitada em ${formatarData(fat.data_pagamento)}</span>` : '<span class="text-amber-400 font-bold">● Aguardando pagamento</span>'}
                            </div>
                            <div class="flex items-center gap-2">
                                <button type="button" onclick="document.getElementById('modal-espelho-fatura').remove()" class="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-full transition-all">
                                    Fechar
                                </button>
                                ${fat.status !== 'paga' ? `
                                    <button type="button" onclick="StartupFaturamento.marcarComoPaga(${fat.id}); document.getElementById('modal-espelho-fatura').remove();" class="px-5 py-2 bg-emerald-400 hover:bg-emerald-300 text-black font-extrabold text-xs rounded-full shadow-lg transition-all">
                                        Confirmar Pagamento
                                    </button>
                                ` : ''}
                            </div>
                        </div>

                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHtml);
        } catch (err) {
            App.showToast(err.message, 'error');
        }
    }

    function obterNomeMes(mesReferencia) {
        if (!mesReferencia) return 'MÊS';
        const parts = mesReferencia.split('-');
        const mesDigito = parts.length > 1 ? parts[1] : parts[0];
        return MESES_PT[mesDigito] || mesReferencia.toUpperCase();
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
        carregarExemplarZiulmar,
        recalcularPreview,
        imprimirFaturaAoVivo,
        imprimirFaturaModal,
        marcarComoPaga,
        excluirFatura,
        verEspelhoFatura
    };
})();
