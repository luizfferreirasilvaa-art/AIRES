/**
 * AIRES - Módulo Startup: Financeiro & Fluxo de Caixa
 * Obsidian Dark Glassmorphism
 */

const StartupFinanceiro = (() => {
    let currentTab = 'fluxo'; // 'fluxo' ou 'inadimplencia'
    let pagamentosList = [];
    let resumoData = { entradas: 0, saidas: 0, saldo: 0, total_inadimplente: 0, qtd_inadimplentes: 0 };
    let inadimplentesList = [];

    function init() {
        // Eventos vinculados dinamicamente
    }

    async function load() {
        const container = document.getElementById('startup-financeiro-container');
        if (!container) return;

        container.innerHTML = `
            <div class="py-12 flex flex-col items-center justify-center text-zinc-500">
                <div class="w-8 h-8 border-2 border-orange-400 border-t-transparent rounded-full animate-spin mb-3"></div>
                <p class="text-xs">Carregando fluxo financeiro e inadimplência...</p>
            </div>
        `;

        try {
            const [respFin, respResumo] = await Promise.all([
                API.getStartupFinanceiro(),
                API.getStartupFinanceiroResumo()
            ]);

            pagamentosList = (respFin && respFin.pagamentos) || [];
            resumoData = (respResumo && respResumo.resumo) || resumoData;
            inadimplentesList = (respResumo && respResumo.inadimplentes) || [];

            // Atualizar badge de inadimplentes no header
            const badge = document.getElementById('badge-inadimplentes-count');
            if (badge) {
                if (inadimplentesList.length > 0) {
                    badge.innerText = inadimplentesList.length;
                    badge.classList.remove('hidden');
                } else {
                    badge.classList.add('hidden');
                }
            }

            render();
        } catch (err) {
            container.innerHTML = `
                <div class="glass-card rounded-3xl p-6 text-center text-red-400">
                    <p class="text-xs font-bold">Erro ao carregar dados financeiros: ${escapeHtml(err.message)}</p>
                </div>
            `;
        }
    }

    function switchTab(tab) {
        currentTab = tab;
        const btnFluxo = document.getElementById('btn-tab-fin-fluxo');
        const btnInad = document.getElementById('btn-tab-fin-inadimplencia');

        if (tab === 'fluxo') {
            btnFluxo?.classList.add('glass-pill-active', 'text-white');
            btnFluxo?.classList.remove('text-zinc-400');
            btnInad?.classList.remove('glass-pill-active', 'text-white');
            btnInad?.classList.add('text-zinc-400');
        } else {
            btnInad?.classList.add('glass-pill-active', 'text-white');
            btnInad?.classList.remove('text-zinc-400');
            btnFluxo?.classList.remove('glass-pill-active', 'text-white');
            btnFluxo?.classList.add('text-zinc-400');
        }

        render();
    }

    function render() {
        const container = document.getElementById('startup-financeiro-container');
        if (!container) return;

        const entradas = parseFloat(resumoData.entradas || 0);
        const saidas = parseFloat(resumoData.saidas || 0);
        const saldo = parseFloat(resumoData.saldo || 0);
        const totalInad = parseFloat(resumoData.total_inadimplente || 0);

        let html = `
            <!-- Cards de Resumo Financeiro -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div class="glass-card rounded-3xl p-4 space-y-1">
                    <span class="text-[10px] text-emerald-400 uppercase font-extrabold flex items-center gap-1">
                        <span>↓</span> Entradas do Mês
                    </span>
                    <p class="text-2xl font-black text-emerald-400">${formatarMoeda(entradas)}</p>
                    <p class="text-[10px] text-zinc-500">Recebimentos de faturas solares</p>
                </div>

                <div class="glass-card rounded-3xl p-4 space-y-1">
                    <span class="text-[10px] text-red-400 uppercase font-extrabold flex items-center gap-1">
                        <span>↑</span> Saídas / Custos Usina
                    </span>
                    <p class="text-2xl font-black text-red-400">${formatarMoeda(saidas)}</p>
                    <p class="text-[10px] text-zinc-500">Manutenção, arrendamento, seguros</p>
                </div>

                <div class="glass-card rounded-3xl p-4 space-y-1">
                    <span class="text-[10px] text-lime-400 uppercase font-extrabold">Saldo Operacional</span>
                    <p class="text-2xl font-black ${saldo >= 0 ? 'text-lime-400' : 'text-red-400'}">${formatarMoeda(saldo)}</p>
                    <p class="text-[10px] text-zinc-500">Lucro operacional do mês</p>
                </div>

                <div class="glass-card rounded-3xl p-4 space-y-1 ${inadimplentesList.length > 0 ? 'border-red-500/30 bg-red-500/[0.03]' : ''}">
                    <span class="text-[10px] text-amber-400 uppercase font-extrabold flex items-center justify-between">
                        <span>Inadimplência</span>
                        <span class="text-red-400 font-black">${inadimplentesList.length} pendentes</span>
                    </span>
                    <p class="text-2xl font-black text-amber-400">${formatarMoeda(totalInad)}</p>
                    <p class="text-[10px] text-zinc-500">Faturas vencidas não quitadas</p>
                </div>
            </div>
        `;

        if (currentTab === 'fluxo') {
            html += renderTabelaMovimentacoes();
        } else {
            html += renderTabelaInadimplentes();
        }

        container.innerHTML = html;
    }

    function renderTabelaMovimentacoes() {
        if (pagamentosList.length === 0) {
            return `
                <div class="glass-card rounded-3xl p-12 text-center text-zinc-500 space-y-3">
                    <p class="text-sm font-bold text-white">Nenhuma movimentação registrada</p>
                    <p class="text-xs">Registre recebimentos de clientes ou despesas de manutenção da usina.</p>
                </div>
            `;
        }

        let html = `
            <div class="glass-card rounded-3xl p-5 space-y-4">
                <div class="flex items-center justify-between flex-wrap gap-2">
                    <h4 class="font-extrabold text-sm text-white">Livro Caixa & Movimentações</h4>
                    <span class="text-xs text-zinc-400">${pagamentosList.length} lançamentos</span>
                </div>

                <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs">
                        <thead>
                            <tr class="border-b border-white/10 text-zinc-400 text-[10px] uppercase tracking-wider">
                                <th class="pb-3 font-bold">Data</th>
                                <th class="pb-3 font-bold">Tipo</th>
                                <th class="pb-3 font-bold">Categoria</th>
                                <th class="pb-3 font-bold">Descrição / Cliente</th>
                                <th class="pb-3 font-bold">Método</th>
                                <th class="pb-3 font-bold text-right">Valor</th>
                                <th class="pb-3 font-bold text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-white/5">
        `;

        pagamentosList.forEach(p => {
            const isEntrada = p.tipo === 'entrada';
            const catLabel = getCategoriaLabel(p.categoria);

            html += `
                <tr class="hover:bg-white/[0.02] transition-colors">
                    <td class="py-3 font-mono text-zinc-300">${formatarData(p.data_pagamento)}</td>
                    <td class="py-3">
                        <span class="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${isEntrada ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/15 text-red-400 border border-red-500/30'}">
                            ${isEntrada ? 'Entrada' : 'Saída'}
                        </span>
                    </td>
                    <td class="py-3 text-zinc-300 font-medium">${catLabel}</td>
                    <td class="py-3 font-bold text-white">
                        <div>${escapeHtml(p.descricao)}</div>
                        ${p.cliente_nome ? `<span class="text-[10px] text-zinc-500 font-normal">Cliente: ${escapeHtml(p.cliente_nome)}</span>` : ''}
                    </td>
                    <td class="py-3 font-mono text-zinc-400 uppercase text-[11px]">${escapeHtml(p.metodo_pagamento)}</td>
                    <td class="py-3 text-right font-black font-mono text-sm ${isEntrada ? 'text-emerald-400' : 'text-red-400'}">
                        ${isEntrada ? '+' : '-'} ${formatarMoeda(p.valor)}
                    </td>
                    <td class="py-3 text-right">
                        <button type="button" onclick="StartupFinanceiro.excluirMovimento(${p.id})" class="p-1.5 text-zinc-500 hover:text-red-400 rounded-xl hover:bg-red-500/10 transition-all" title="Excluir Lançamento">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                    </td>
                </tr>
            `;
        });

        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        return html;
    }

    function renderTabelaInadimplentes() {
        if (inadimplentesList.length === 0) {
            return `
                <div class="glass-card rounded-3xl p-12 text-center text-zinc-500 space-y-3">
                    <div class="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center text-xl">🎉</div>
                    <p class="text-sm font-bold text-white">Nenhum cliente inadimplente!</p>
                    <p class="text-xs">Todas as faturas emitidas estão quitadas ou em dia dentro do prazo de vencimento.</p>
                </div>
            `;
        }

        let html = `
            <div class="glass-card rounded-3xl p-5 space-y-4">
                <div class="flex items-center justify-between flex-wrap gap-2">
                    <div>
                        <h4 class="font-extrabold text-sm text-white text-red-400">Clientes com Faturas em Atraso</h4>
                        <p class="text-xs text-zinc-400">Cobrança ativa e régua de contato para recuperação de crédito.</p>
                    </div>
                </div>

                <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs">
                        <thead>
                            <tr class="border-b border-white/10 text-zinc-400 text-[10px] uppercase tracking-wider">
                                <th class="pb-3 font-bold">Cliente</th>
                                <th class="pb-3 font-bold">Mês Ref.</th>
                                <th class="pb-3 font-bold">Vencimento</th>
                                <th class="pb-3 font-bold">Dias em Atraso</th>
                                <th class="pb-3 font-bold">Valor em Aberto</th>
                                <th class="pb-3 font-bold text-right">Ação de Cobrança</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-white/5">
        `;

        inadimplentesList.forEach(fat => {
            const diasAtraso = parseInt(fat.dias_atraso || 0);
            const zap = fat.whatsapp ? `https://wa.me/55${fat.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${fat.cliente_nome}, informamos que sua fatura de energia solar ref. ${fat.mes_referencia} no valor de ${formatarMoeda(fat.valor_cobrado)} venceu em ${formatarData(fat.data_vencimento)}. Segue chave PIX para quitação.`)}` : null;

            html += `
                <tr class="hover:bg-white/[0.02] transition-colors">
                    <td class="py-3 font-bold text-white">
                        <div>${escapeHtml(fat.cliente_nome)}</div>
                        <span class="text-[10px] text-zinc-500 font-mono">${escapeHtml(fat.numero_uc || '')}</span>
                    </td>
                    <td class="py-3 font-mono text-zinc-300">${fat.mes_referencia}</td>
                    <td class="py-3 font-mono text-red-300 font-bold">${formatarData(fat.data_vencimento)}</td>
                    <td class="py-3 font-black text-red-400">${diasAtraso} dias de atraso</td>
                    <td class="py-3 font-black font-mono text-sm text-white">${formatarMoeda(fat.valor_cobrado)}</td>
                    <td class="py-3 text-right">
                        <div class="flex items-center justify-end gap-2">
                            ${zap ? `
                                <a href="${zap}" target="_blank" class="px-3 py-1.5 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold transition-all flex items-center gap-1">
                                    <span>💬 Cobrar WhatsApp</span>
                                </a>
                            ` : ''}
                            <button type="button" onclick="StartupFaturamento.marcarComoPaga(${fat.id})" class="px-3 py-1.5 rounded-full bg-lime-400 hover:bg-lime-300 text-black text-[11px] font-bold transition-all">
                                Baixar Pagamento
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });

        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        return html;
    }

    function openModalMovimento() {
        const existing = document.getElementById('modal-novo-movimento');
        if (existing) existing.remove();

        const modalHtml = `
            <div id="modal-novo-movimento" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                <div class="max-w-md w-full bg-[#121217] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
                    <div class="flex items-center justify-between pb-3 border-b border-white/5">
                        <div class="flex items-center gap-2.5">
                            <div class="w-9 h-9 rounded-2xl bg-orange-400/10 text-orange-400 border border-orange-400/20 flex items-center justify-center text-base">
                                💰
                            </div>
                            <div>
                                <h4 class="font-extrabold text-sm text-white">Novo Movimento Financeiro</h4>
                                <p class="text-[11px] text-zinc-400">Entrada ou custo operacional da usina solar</p>
                            </div>
                        </div>
                        <button type="button" onclick="document.getElementById('modal-novo-movimento').remove()" class="text-zinc-400 hover:text-white p-2 rounded-xl hover:bg-white/5 transition-all">
                            ✕
                        </button>
                    </div>

                    <form id="form-novo-movimento" class="space-y-4">
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block text-xs font-semibold text-zinc-300 mb-1">Tipo de Movimento *</label>
                                <select id="mov-tipo" class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-orange-400">
                                    <option value="saida">🔴 Saída (Custo/Despesa)</option>
                                    <option value="entrada">🟢 Entrada (Recebimento)</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-zinc-300 mb-1">Categoria *</label>
                                <select id="mov-cat" class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-orange-400">
                                    <option value="manutencao_usina">Manutenção da Usina</option>
                                    <option value="aluguel_terreno">Aluguel / Arrendamento</option>
                                    <option value="seguros">Seguros Operacionais</option>
                                    <option value="fatura_cliente">Fatura de Cliente</option>
                                    <option value="outros">Outros Custos</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label class="block text-xs font-semibold text-zinc-300 mb-1">Descrição do Lançamento *</label>
                            <input type="text" id="mov-desc" required placeholder="Ex: Limpeza de painéis solares / Troca de fusíveis" class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-orange-400">
                        </div>

                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block text-xs font-semibold text-zinc-300 mb-1">Valor (R$) *</label>
                                <input type="number" step="0.01" min="0.01" id="mov-valor" required placeholder="0,00" class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white font-mono font-bold focus:outline-none focus:border-orange-400">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-zinc-300 mb-1">Data *</label>
                                <input type="date" id="mov-data" required value="${new Date().toISOString().split('T')[0]}" class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-orange-400">
                            </div>
                        </div>

                        <div>
                            <label class="block text-xs font-semibold text-zinc-300 mb-1">Método de Pagamento</label>
                            <select id="mov-metodo" class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-orange-400">
                                <option value="pix">PIX</option>
                                <option value="boleto">Boleto Bancário</option>
                                <option value="transferencia">Transferência / TED</option>
                                <option value="cartao">Cartão de Crédito</option>
                                <option value="dinheiro">Dinheiro em Espécie</option>
                            </select>
                        </div>

                        <div class="flex items-center justify-end gap-3 pt-2">
                            <button type="button" onclick="document.getElementById('modal-novo-movimento').remove()" class="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-full transition-all">
                                Cancelar
                            </button>
                            <button type="submit" class="px-6 py-2.5 bg-orange-500 hover:bg-orange-400 text-white font-extrabold text-xs rounded-full shadow-lg shadow-orange-500/20 transition-all">
                                Salvar Lançamento
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        document.getElementById('form-novo-movimento')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const tipo = document.getElementById('mov-tipo')?.value;
            const cat = document.getElementById('mov-cat')?.value;
            const desc = document.getElementById('mov-desc')?.value.trim();
            const valor = parseFloat(document.getElementById('mov-valor')?.value || '0');
            const data = document.getElementById('mov-data')?.value;
            const metodo = document.getElementById('mov-metodo')?.value;

            try {
                await API.createStartupPagamento({
                    tipo,
                    categoria: cat,
                    descricao: desc,
                    valor,
                    data_pagamento: data,
                    metodo_pagamento: metodo
                });
                App.showToast('Lançamento financeiro registrado!', 'success');
                document.getElementById('modal-novo-movimento')?.remove();
                load();
            } catch (err) {
                App.showToast(err.message, 'error');
            }
        });
    }

    async function excluirMovimento(id) {
        if (!confirm('Deseja realmente excluir este lançamento financeiro?')) return;
        try {
            await API.deleteStartupPagamento(id);
            App.showToast('Lançamento removido com sucesso!', 'success');
            load();
        } catch (err) {
            App.showToast(err.message, 'error');
        }
    }

    function getCategoriaLabel(cat) {
        const map = {
            fatura_cliente: 'Fatura de Cliente',
            manutencao_usina: 'Manutenção da Usina',
            aluguel_terreno: 'Arrendamento do Terreno',
            seguros: 'Seguro Fotovoltaico',
            operacional: 'Despesa Operacional',
            outros: 'Outros'
        };
        return map[cat] || cat;
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
        openModalMovimento,
        excluirMovimento
    };
})();
