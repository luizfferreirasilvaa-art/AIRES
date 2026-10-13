/**
 * AIRES - Módulo Startup: Cadastro de Clientes & Contratos
 * Obsidian Dark Glassmorphism
 */

const StartupClientes = (() => {
    let currentSubTab = 'clientes';
    let clientesList = [];

    function init() {
        const buscaInput = document.getElementById('startup-clientes-busca');
        const statusFilter = document.getElementById('startup-clientes-status-filter');

        buscaInput?.addEventListener('input', debounce(() => load(), 300));
        statusFilter?.addEventListener('change', () => load());
    }

    async function load() {
        const container = document.getElementById('startup-clientes-container');
        if (!container) return;

        container.innerHTML = `
            <div class="py-12 flex flex-col items-center justify-center text-zinc-500">
                <div class="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mb-3"></div>
                <p class="text-xs">Carregando carteira de clientes...</p>
            </div>
        `;

        const busca = document.getElementById('startup-clientes-busca')?.value || '';
        const status = document.getElementById('startup-clientes-status-filter')?.value || '';

        try {
            const resp = await API.getStartupClientes({ busca, status });
            clientesList = (resp && resp.clientes) || [];
            render();
        } catch (err) {
            container.innerHTML = `
                <div class="glass-card rounded-3xl p-6 text-center text-red-400">
                    <p class="text-xs font-bold">Erro ao carregar clientes: ${escapeHtml(err.message)}</p>
                </div>
            `;
        }
    }

    function switchSubTab(tab) {
        currentSubTab = tab;
        const btnLista = document.getElementById('tab-btn-clientes-lista');
        const btnContratos = document.getElementById('tab-btn-clientes-contratos');

        if (tab === 'clientes') {
            btnLista?.classList.add('bg-white/10', 'text-white', 'font-bold');
            btnLista?.classList.remove('text-zinc-400', 'font-medium');
            btnContratos?.classList.remove('bg-white/10', 'text-white', 'font-bold');
            btnContratos?.classList.add('text-zinc-400', 'font-medium');
        } else {
            btnContratos?.classList.add('bg-white/10', 'text-white', 'font-bold');
            btnContratos?.classList.remove('text-zinc-400', 'font-medium');
            btnLista?.classList.remove('bg-white/10', 'text-white', 'font-bold');
            btnLista?.classList.add('text-zinc-400', 'font-medium');
        }

        render();
    }

    function render() {
        const container = document.getElementById('startup-clientes-container');
        if (!container) return;

        if (clientesList.length === 0) {
            container.innerHTML = `
                <div class="glass-card rounded-3xl p-12 text-center text-zinc-500 space-y-3">
                    <div class="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center text-xl">👥</div>
                    <p class="text-sm font-bold text-white">Nenhum cliente cadastrado</p>
                    <p class="text-xs max-w-sm mx-auto">Cadastre os consumidores que receberão os créditos da usina solar e o percentual de desconto acordado.</p>
                    <button type="button" onclick="StartupClientes.openModal()" class="px-5 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-black font-extrabold text-xs rounded-full shadow-lg transition-all">
                        + Cadastrar Primeiro Cliente
                    </button>
                </div>
            `;
            return;
        }

        if (currentSubTab === 'clientes') {
            renderListaClientes(container);
        } else {
            renderContratos(container);
        }
    }

    function renderListaClientes(container) {
        let html = `
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        `;

        clientesList.forEach(cli => {
            const statusBadge = getStatusBadge(cli.status);
            const tipoLabel = cli.tipo_pessoa === 'pj' ? 'Pessoa Jurídica' : 'Pessoa Física';
            const propsCount = cli.qtd_propriedades || 1;
            const zapLink = cli.whatsapp ? `https://wa.me/55${cli.whatsapp.replace(/\D/g, '')}` : null;

            html += `
                <div class="glass-card rounded-3xl p-5 flex flex-col justify-between hover:border-white/20 transition-all group relative">
                    <div class="space-y-3">
                        <!-- Top Header Card -->
                        <div class="flex items-start justify-between gap-2">
                            <div class="min-w-0">
                                <div class="flex items-center gap-1.5 flex-wrap">
                                    <span class="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-white/5 text-zinc-400 border border-white/5">${tipoLabel}</span>
                                    ${statusBadge}
                                </div>
                                <h4 class="font-extrabold text-sm text-white mt-1.5 truncate group-hover:text-emerald-300 transition-colors" title="${escapeHtml(cli.nome)}">
                                    ${escapeHtml(cli.nome)}
                                </h4>
                                <p class="text-[11px] text-zinc-400 flex items-center gap-1">
                                    <span class="text-emerald-400 font-mono font-bold">${escapeHtml(cli.numero_uc || 'Sem UC')}</span>
                                    <span>•</span>
                                    <span>${escapeHtml(cli.cpf_cnpj || 'Doc. não inf.')}</span>
                                </p>
                            </div>
                            <div class="flex items-center gap-1">
                                <button type="button" onclick="StartupClientes.openModal(${cli.id})" class="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-white/10 transition-all" title="Editar Cliente">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                </button>
                                <button type="button" onclick="StartupClientes.deleteCliente(${cli.id}, '${escapeHtml(cli.nome)}')" class="p-1.5 text-zinc-500 hover:text-red-400 rounded-xl hover:bg-red-500/10 transition-all" title="Excluir Cliente">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                </button>
                            </div>
                        </div>

                        <!-- Métricas Rápidas do Cliente -->
                        <div class="grid grid-cols-3 gap-2 py-2 px-3 rounded-2xl bg-black/30 border border-white/5 text-center">
                            <div>
                                <span class="text-[9px] text-zinc-500 block uppercase font-bold">Propriedades</span>
                                <span class="text-xs font-black text-amber-400">${propsCount} un</span>
                            </div>
                            <div>
                                <span class="text-[9px] text-zinc-500 block uppercase font-bold">Desconto</span>
                                <span class="text-xs font-black text-emerald-400">${parseFloat(cli.desconto_padrao_pct || 15).toFixed(0)}%</span>
                            </div>
                            <div>
                                <span class="text-[9px] text-zinc-500 block uppercase font-bold">Faturas</span>
                                <span class="text-xs font-black text-cyan-400">${cli.total_faturas || 0}</span>
                            </div>
                        </div>

                        <!-- Endereço e Contato -->
                        <div class="space-y-1 text-[11px] text-zinc-400">
                            ${cli.endereco ? `
                                <p class="truncate flex items-center gap-1.5" title="${escapeHtml(cli.endereco)}">
                                    <span class="text-zinc-600">📍</span> ${escapeHtml(cli.endereco)}
                                </p>
                            ` : ''}
                            <div class="flex items-center gap-3 pt-0.5">
                                ${cli.telefone ? `<span class="flex items-center gap-1"><span class="text-zinc-600">📞</span> ${escapeHtml(cli.telefone)}</span>` : ''}
                                ${zapLink ? `
                                    <a href="${zapLink}" target="_blank" class="text-emerald-400 hover:underline flex items-center gap-1 font-semibold">
                                        <span>💬 WhatsApp</span>
                                    </a>
                                ` : ''}
                            </div>
                        </div>
                    </div>

                    <!-- Footer Action -->
                    <div class="pt-3 mt-3 border-t border-white/5 flex items-center justify-between text-xs">
                        <span class="text-[10px] text-zinc-500">Adesão: ${formatarData(cli.data_adesao)}</span>
                        <button type="button" onclick="StartupFaturamento.openEmissaoParaCliente(${cli.id})" class="px-3 py-1 rounded-full bg-emerald-400/10 hover:bg-emerald-400/20 text-emerald-400 border border-emerald-400/20 font-bold text-[11px] transition-all flex items-center gap-1">
                            <span>⚡ Emitir Fatura</span>
                        </button>
                    </div>
                </div>
            `;
        });

        html += `</div>`;
        container.innerHTML = html;
    }

    function renderContratos(container) {
        let html = `
            <div class="glass-card rounded-3xl p-5 space-y-4">
                <div class="flex items-center justify-between">
                    <div>
                        <h4 class="font-extrabold text-sm text-white">Gestão de Contratos de Fornecimento Solar</h4>
                        <p class="text-xs text-zinc-400">Supervisão de vigência, percentual pactuado e termos por unidade consumidora.</p>
                    </div>
                    <span class="text-xs font-bold text-zinc-400">${clientesList.length} contratos ativos</span>
                </div>

                <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs">
                        <thead>
                            <tr class="border-b border-white/10 text-zinc-400 text-[10px] uppercase tracking-wider">
                                <th class="pb-3 font-bold">Cliente / Razão</th>
                                <th class="pb-3 font-bold">Unidade (UC)</th>
                                <th class="pb-3 font-bold">Propriedades</th>
                                <th class="pb-3 font-bold">Desconto Pactuado</th>
                                <th class="pb-3 font-bold">Adesão</th>
                                <th class="pb-3 font-bold">Vigência Fim</th>
                                <th class="pb-3 font-bold">Status</th>
                                <th class="pb-3 font-bold text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-white/5">
        `;

        clientesList.forEach(cli => {
            const fimVigencia = cli.contrato_vigencia_fim ? formatarData(cli.contrato_vigencia_fim) : 'Indeterminado';
            const statusBadge = getStatusBadge(cli.status);

            html += `
                <tr class="hover:bg-white/[0.02] transition-colors">
                    <td class="py-3 font-bold text-white">${escapeHtml(cli.nome)}</td>
                    <td class="py-3 font-mono text-emerald-400">${escapeHtml(cli.numero_uc || '-')}</td>
                    <td class="py-3 text-amber-400 font-bold">${cli.qtd_propriedades || 1} un</td>
                    <td class="py-3 text-emerald-300 font-black">${parseFloat(cli.desconto_padrao_pct || 15).toFixed(0)}%</td>
                    <td class="py-3 text-zinc-400">${formatarData(cli.data_adesao)}</td>
                    <td class="py-3 text-zinc-300 font-medium">${fimVigencia}</td>
                    <td class="py-3">${statusBadge}</td>
                    <td class="py-3 text-right">
                        <button type="button" onclick="StartupClientes.openModal(${cli.id})" class="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 font-semibold text-[11px] transition-all">
                            Ver Termos
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

        container.innerHTML = html;
    }

    function getStatusBadge(status) {
        if (status === 'ativo') {
            return `<span class="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">Ativo</span>`;
        } else if (status === 'suspenso') {
            return `<span class="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">Suspenso</span>`;
        } else {
            return `<span class="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30">Cancelado</span>`;
        }
    }

    function openModal(clienteId = null) {
        const cliente = clienteId ? clientesList.find(c => c.id == clienteId) : null;
        const isEdit = Boolean(cliente);

        const existingModal = document.getElementById('modal-startup-cliente');
        if (existingModal) existingModal.remove();

        const modalHtml = `
            <div id="modal-startup-cliente" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                <div class="max-w-2xl w-full bg-[#121217] border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
                    <div class="flex items-center justify-between pb-3 border-b border-white/5">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center text-lg">
                                👥
                            </div>
                            <div>
                                <h3 class="text-base font-extrabold text-white">${isEdit ? 'Editar Cliente' : 'Novo Cliente Solar'}</h3>
                                <p class="text-xs text-zinc-400">Preencha os dados de consumo e rateio de créditos</p>
                            </div>
                        </div>
                        <button type="button" onclick="document.getElementById('modal-startup-cliente').remove()" class="text-zinc-400 hover:text-white p-2 rounded-xl hover:bg-white/5 transition-all">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>

                    <form id="form-startup-cliente" class="space-y-4">
                        <input type="hidden" id="cli-id" value="${cliente ? cliente.id : ''}">

                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div class="sm:col-span-2">
                                <label class="block text-xs font-semibold text-zinc-300 mb-1">Nome Completo / Razão Social *</label>
                                <input type="text" id="cli-nome" required value="${cliente ? escapeHtml(cliente.nome) : ''}" placeholder="Ex: Supermercado Sol / João da Silva" class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-emerald-400">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-zinc-300 mb-1">Tipo de Pessoa</label>
                                <select id="cli-tipo" class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-emerald-400">
                                    <option value="pf" ${cliente && cliente.tipo_pessoa === 'pf' ? 'selected' : ''}>Pessoa Física (PF)</option>
                                    <option value="pj" ${cliente && cliente.tipo_pessoa === 'pj' ? 'selected' : ''}>Pessoa Jurídica (PJ)</option>
                                </select>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label class="block text-xs font-semibold text-zinc-300 mb-1">CPF ou CNPJ</label>
                                <input type="text" id="cli-doc" value="${cliente ? escapeHtml(cliente.cpf_cnpj || '') : ''}" placeholder="000.000.000-00" class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-emerald-400">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-zinc-300 mb-1">Nº Unidade Consumidora (UC Energisa) *</label>
                                <input type="text" id="cli-uc" value="${cliente ? escapeHtml(cliente.numero_uc || '') : ''}" placeholder="Ex: UC-881209" class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-emerald-400 font-mono focus:outline-none focus:border-emerald-400">
                            </div>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label class="block text-xs font-semibold text-zinc-300 mb-1">Quantas Propriedades Recebem Crédito? *</label>
                                <input type="number" min="1" id="cli-props" value="${cliente ? (cliente.qtd_propriedades || 1) : 1}" class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-emerald-400 font-bold" title="Quantidade de unidades consumidoras/propriedades atendidas">
                                <span class="text-[10px] text-zinc-500 block mt-1">Número de imóveis do cliente atendidos pelos créditos</span>
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-zinc-300 mb-1">Desconto Acordado (% na Fatura) *</label>
                                <div class="relative">
                                    <input type="number" step="0.5" min="1" max="100" id="cli-desc" value="${cliente ? (cliente.desconto_padrao_pct || 15) : 15}" class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-emerald-300 focus:outline-none focus:border-emerald-400 font-bold">
                                    <span class="absolute right-3.5 top-2.5 text-xs text-zinc-500 font-bold">%</span>
                                </div>
                                <span class="text-[10px] text-zinc-500 block mt-1">Economia aplicada sobre os créditos compensados</span>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <label class="block text-xs font-semibold text-zinc-300 mb-1">Telefone</label>
                                <input type="text" id="cli-tel" value="${cliente ? escapeHtml(cliente.telefone || '') : ''}" placeholder="(67) 3211-0000" class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-emerald-400">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-zinc-300 mb-1">WhatsApp</label>
                                <input type="text" id="cli-zap" value="${cliente ? escapeHtml(cliente.whatsapp || '') : ''}" placeholder="(67) 99999-0000" class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-emerald-400">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-zinc-300 mb-1">E-mail</label>
                                <input type="email" id="cli-email" value="${cliente ? escapeHtml(cliente.email || '') : ''}" placeholder="cliente@email.com" class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-emerald-400">
                            </div>
                        </div>

                        <div>
                            <label class="block text-xs font-semibold text-zinc-300 mb-1">Endereço da Unidade</label>
                            <input type="text" id="cli-end" value="${cliente ? escapeHtml(cliente.endereco || '') : ''}" placeholder="Rua, número, bairro, cidade" class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-emerald-400">
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <label class="block text-xs font-semibold text-zinc-300 mb-1">Data de Adesão</label>
                                <input type="date" id="cli-adesao" value="${cliente ? (cliente.data_adesao || '') : new Date().toISOString().split('T')[0]}" class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-emerald-400">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-zinc-300 mb-1">Vigência do Contrato Até</label>
                                <input type="date" id="cli-fim" value="${cliente ? (cliente.contrato_vigencia_fim || '') : ''}" class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-emerald-400">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-zinc-300 mb-1">Status</label>
                                <select id="cli-status" class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-emerald-400">
                                    <option value="ativo" ${cliente && cliente.status === 'ativo' ? 'selected' : ''}>✅ Ativo</option>
                                    <option value="suspenso" ${cliente && cliente.status === 'suspenso' ? 'selected' : ''}>⏸️ Suspenso</option>
                                    <option value="cancelado" ${cliente && cliente.status === 'cancelado' ? 'selected' : ''}>❌ Cancelado</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label class="block text-xs font-semibold text-zinc-300 mb-1">Observações & Cláusulas Específicas</label>
                            <textarea id="cli-obs" rows="2" placeholder="Notas sobre o cliente ou contrato..." class="w-full px-3.5 py-2 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-emerald-400">${cliente ? escapeHtml(cliente.observacoes || '') : ''}</textarea>
                        </div>

                        <div class="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
                            <button type="button" onclick="document.getElementById('modal-startup-cliente').remove()" class="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs rounded-full transition-all">
                                Cancelar
                            </button>
                            <button type="submit" class="px-6 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-black font-extrabold text-xs rounded-full shadow-lg shadow-emerald-400/20 transition-all">
                                ${isEdit ? 'Salvar Alterações' : 'Cadastrar Cliente'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        document.getElementById('form-startup-cliente')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await salvarCliente();
        });
    }

    async function salvarCliente() {
        const id = document.getElementById('cli-id')?.value;
        const payload = {
            nome: document.getElementById('cli-nome')?.value.trim(),
            tipo_pessoa: document.getElementById('cli-tipo')?.value,
            cpf_cnpj: document.getElementById('cli-doc')?.value.trim(),
            numero_uc: document.getElementById('cli-uc')?.value.trim(),
            qtd_propriedades: parseInt(document.getElementById('cli-props')?.value || '1'),
            desconto_padrao_pct: parseFloat(document.getElementById('cli-desc')?.value || '15'),
            telefone: document.getElementById('cli-tel')?.value.trim(),
            whatsapp: document.getElementById('cli-zap')?.value.trim(),
            email: document.getElementById('cli-email')?.value.trim(),
            endereco: document.getElementById('cli-end')?.value.trim(),
            data_adesao: document.getElementById('cli-adesao')?.value || null,
            contrato_vigencia_fim: document.getElementById('cli-fim')?.value || null,
            status: document.getElementById('cli-status')?.value || 'ativo',
            observacoes: document.getElementById('cli-obs')?.value.trim()
        };

        try {
            if (id) {
                await API.updateStartupCliente(id, payload);
                App.showToast('Cliente atualizado com sucesso!', 'success');
            } else {
                await API.createStartupCliente(payload);
                App.showToast('Cliente cadastrado com sucesso!', 'success');
            }
            document.getElementById('modal-startup-cliente')?.remove();
            load();
        } catch (err) {
            App.showToast(err.message, 'error');
        }
    }

    async function deleteCliente(id, nome) {
        if (!confirm(`Deseja realmente remover o cliente "${nome}"? As faturas existentes serão mantidas no histórico.`)) {
            return;
        }

        try {
            await API.deleteStartupCliente(id);
            App.showToast('Cliente removido com sucesso!', 'success');
            load();
        } catch (err) {
            App.showToast(err.message, 'error');
        }
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

    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    return {
        init,
        load,
        switchSubTab,
        openModal,
        deleteCliente,
        getClientesList: () => clientesList
    };
})();
