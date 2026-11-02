/**
 * AIRES - Módulo de Gestão de Usuários & Controle de Acessos
 * Obsidian Dark Glassmorphism / Pierre Fintech
 */

const AdminUsuarios = (() => {
    let usuariosList = [];
    let kpisData = {
        total: 0,
        ativos: 0,
        inativos: 0,
        admins: 0,
        usuarios: 0,
        personalizados: 0
    };
    let modulosCatalogo = {};
    let currentFilter = {
        busca: '',
        perfil: '',
        status: ''
    };
    let usuarioEmEdicao = null;

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
        const container = document.getElementById('admin-usuarios-container');
        if (!container) return;

        container.innerHTML = `
            <div class="py-16 flex flex-col items-center justify-center text-zinc-500">
                <div class="w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full animate-spin mb-3"></div>
                <p class="text-xs font-semibold">Carregando usuários e permissões do sistema...</p>
            </div>
        `;

        try {
            const resp = await API.getAdminUsuarios(currentFilter);
            if (resp && resp.sucesso) {
                usuariosList = resp.usuarios || [];
                kpisData = resp.kpis || kpisData;
                modulosCatalogo = resp.modulos_disponiveis || modulosCatalogo;
                render();
            } else {
                throw new Error((resp && resp.erro) || 'Falha ao obter lista de usuários.');
            }
        } catch (err) {
            container.innerHTML = `
                <div class="glass-card rounded-3xl p-6 text-center text-red-400 space-y-3">
                    <p class="text-sm font-bold">Erro ao carregar módulo de usuários: ${escapeHtml(err.message)}</p>
                    <button type="button" onclick="AdminUsuarios.load()" class="px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-xs font-bold rounded-full transition-all">
                        Tentar Novamente
                    </button>
                </div>
            `;
        }
    }

    function render() {
        const container = document.getElementById('admin-usuarios-container');
        if (!container) return;

        const totalModulos = Object.keys(modulosCatalogo).length;

        let html = `
            <!-- 1. KPIs da Equipe / Usuários -->
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div class="glass-card rounded-3xl p-4 sm:p-5 space-y-1 border border-white/5">
                    <span class="text-[10px] text-zinc-400 uppercase font-extrabold tracking-wider">Total de Usuários</span>
                    <p class="text-2xl sm:text-3xl font-black text-white font-mono">${kpisData.total}</p>
                    <p class="text-[10px] text-zinc-500">Cadastrados no AIRES</p>
                </div>
                <div class="glass-card rounded-3xl p-4 sm:p-5 space-y-1 border border-white/5">
                    <span class="text-[10px] text-emerald-400 uppercase font-extrabold tracking-wider">Usuários Ativos</span>
                    <p class="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">${kpisData.ativos}</p>
                    <p class="text-[10px] text-zinc-500">${kpisData.inativos} inativo(s)</p>
                </div>
                <div class="glass-card rounded-3xl p-4 sm:p-5 space-y-1 border border-white/5">
                    <span class="text-[10px] text-lime-400 uppercase font-extrabold tracking-wider">Administradores</span>
                    <p class="text-2xl sm:text-3xl font-black text-lime-400 font-mono">${kpisData.admins}</p>
                    <p class="text-[10px] text-zinc-500">Acesso irrestrito total</p>
                </div>
                <div class="glass-card rounded-3xl p-4 sm:p-5 space-y-1 border border-white/5">
                    <span class="text-[10px] text-cyan-400 uppercase font-extrabold tracking-wider">Acesso Personalizado</span>
                    <p class="text-2xl sm:text-3xl font-black text-cyan-400 font-mono">${kpisData.personalizados}</p>
                    <p class="text-[10px] text-zinc-500">Com restrição por página</p>
                </div>
            </div>

            <!-- 2. Filtros e Ações de Busca -->
            <div class="glass-card rounded-3xl p-4 sm:p-5 space-y-4 border border-white/5">
                <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div class="flex-1 relative">
                        <input type="text" id="admin-user-search-input" value="${escapeHtml(currentFilter.busca)}" placeholder="Buscar por nome ou e-mail..." onkeyup="if(event.key === 'Enter') AdminUsuarios.executarBusca()" class="w-full pl-9 pr-4 py-2 bg-zinc-900/80 border border-white/10 rounded-2xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-lime-400/80 transition-all">
                        <svg class="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    </div>

                    <div class="flex items-center gap-2 flex-wrap">
                        <select id="admin-user-filter-perfil" onchange="AdminUsuarios.setFiltro('perfil', this.value)" class="px-3 py-2 bg-zinc-900/80 border border-white/10 rounded-2xl text-xs text-zinc-300 focus:outline-none focus:border-lime-400/80">
                            <option value="" ${currentFilter.perfil === '' ? 'selected' : ''}>Perfil: Todos</option>
                            <option value="admin" ${currentFilter.perfil === 'admin' ? 'selected' : ''}>👑 Administradores</option>
                            <option value="usuario" ${currentFilter.perfil === 'usuario' ? 'selected' : ''}>👤 Usuários Padrão</option>
                        </select>

                        <select id="admin-user-filter-status" onchange="AdminUsuarios.setFiltro('status', this.value)" class="px-3 py-2 bg-zinc-900/80 border border-white/10 rounded-2xl text-xs text-zinc-300 focus:outline-none focus:border-lime-400/80">
                            <option value="" ${currentFilter.status === '' ? 'selected' : ''}>Status: Todos</option>
                            <option value="ativo" ${currentFilter.status === 'ativo' ? 'selected' : ''}>✅ Ativos</option>
                            <option value="inativo" ${currentFilter.status === 'inativo' ? 'selected' : ''}>⏸️ Inativos</option>
                        </select>

                        <button type="button" onclick="AdminUsuarios.openModalNovo()" class="px-4 py-2 bg-lime-400 hover:bg-lime-300 text-zinc-950 font-extrabold text-xs rounded-full shadow-lg shadow-lime-400/20 transition-all flex items-center gap-1.5 active:scale-95 shrink-0">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>
                            <span>+ Novo Usuário</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- 3. Lista de Usuários (Cards Responsivos) -->
            <div class="space-y-3">
                ${usuariosList.length === 0 ? `
                    <div class="glass-card rounded-3xl p-12 text-center text-zinc-500 space-y-2">
                        <p class="text-3xl">👥</p>
                        <p class="text-sm font-bold text-zinc-300">Nenhum usuário encontrado</p>
                        <p class="text-xs">Tente ajustar os filtros de busca ou cadastre um novo membro.</p>
                    </div>
                ` : usuariosList.map(u => {
                    const isMaster = u.is_master;
                    const isAdmin = u.is_admin;
                    const isAtivo = u.status === 'ativo';
                    const paginas = u.paginas_permitidas;
                    const temRestricao = !isAdmin && Array.isArray(paginas);

                    return `
                        <div class="glass-card rounded-3xl p-4 sm:p-5 border border-white/5 hover:border-white/15 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <!-- Info do Usuário -->
                            <div class="flex items-start sm:items-center gap-3.5 min-w-0">
                                <div class="w-11 h-11 rounded-2xl ${isAdmin ? 'bg-gradient-to-tr from-lime-400/20 to-emerald-400/30 text-lime-400 border border-lime-400/30' : 'bg-white/5 text-zinc-300 border border-white/10'} flex items-center justify-center font-extrabold text-base shrink-0 shadow-md">
                                    ${escapeHtml(u.nome.charAt(0).toUpperCase())}
                                </div>
                                <div class="min-w-0 flex-1">
                                    <div class="flex items-center gap-2 flex-wrap">
                                        <h4 class="text-sm font-bold text-white truncate">${escapeHtml(u.nome)}</h4>
                                        
                                        <!-- Badges de Perfil e Status -->
                                        ${isMaster ? `
                                            <span class="px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/30 text-[9px] font-extrabold uppercase tracking-wider">
                                                ⭐ Master
                                            </span>
                                        ` : isAdmin ? `
                                            <span class="px-2 py-0.5 rounded-full bg-lime-400/15 text-lime-400 border border-lime-400/30 text-[9px] font-extrabold uppercase tracking-wider">
                                                👑 Admin
                                            </span>
                                        ` : `
                                            <span class="px-2 py-0.5 rounded-full bg-zinc-500/15 text-zinc-400 border border-zinc-500/20 text-[9px] font-bold uppercase tracking-wider">
                                                👤 Usuário
                                            </span>
                                        `}

                                        <span class="px-2 py-0.5 rounded-full ${isAtivo ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'} text-[9px] font-extrabold uppercase tracking-wider">
                                            ${isAtivo ? '● Ativo' : '○ Inativo'}
                                        </span>
                                    </div>
                                    <p class="text-xs text-zinc-400 truncate mt-0.5">${escapeHtml(u.email)}</p>

                                    <!-- Indicador de Páginas Permitidas -->
                                    <div class="mt-2 flex items-center gap-1.5 flex-wrap">
                                        <span class="text-[10px] text-zinc-500 font-semibold">Páginas permitidas:</span>
                                        ${isAdmin ? `
                                            <span class="px-2 py-0.5 rounded-md bg-lime-400/10 text-lime-400 border border-lime-400/20 text-[10px] font-mono font-bold">
                                                Acesso Total (${totalModulos}/${totalModulos})
                                            </span>
                                        ` : temRestricao ? `
                                            <span class="px-2 py-0.5 rounded-md bg-cyan-400/10 text-cyan-400 border border-cyan-400/20 text-[10px] font-mono font-bold">
                                                ${paginas.length} de ${totalModulos} módulos
                                            </span>
                                            <div class="flex items-center gap-1 flex-wrap">
                                                ${paginas.slice(0, 4).map(p => {
                                                    const modInfo = modulosCatalogo[p];
                                                    const label = modInfo ? modInfo.titulo.split('&')[0].trim() : p;
                                                    return `<span class="px-1.5 py-0.2 rounded bg-white/5 text-zinc-300 text-[9px]">${escapeHtml(label)}</span>`;
                                                }).join('')}
                                                ${paginas.length > 4 ? `<span class="text-[9px] text-zinc-500 font-mono">+${paginas.length - 4}</span>` : ''}
                                            </div>
                                        ` : `
                                            <span class="px-2 py-0.5 rounded-md bg-white/5 text-zinc-300 text-[10px] font-mono font-bold">
                                                Todas as páginas (${totalModulos}/${totalModulos})
                                            </span>
                                        `}
                                    </div>
                                </div>
                            </div>

                            <!-- Botões de Ação -->
                            <div class="flex items-center gap-2 self-end md:self-center shrink-0">
                                <button type="button" onclick="AdminUsuarios.openModalEditar(${u.id})" class="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 rounded-full text-xs font-bold transition-all flex items-center gap-1">
                                    <span>✏️ Editar & Permissões</span>
                                </button>

                                ${!isMaster ? `
                                    <button type="button" onclick="AdminUsuarios.toggleStatus(${u.id})" class="p-2 rounded-full ${isAtivo ? 'bg-amber-400/10 hover:bg-amber-400/20 text-amber-400 border border-amber-400/20' : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'} transition-all text-xs" title="${isAtivo ? 'Desativar usuário' : 'Ativar usuário'}">
                                        ${isAtivo ? '⏸️' : '▶️'}
                                    </button>
                                    <button type="button" onclick="AdminUsuarios.excluirUsuario(${u.id}, '${escapeHtml(u.nome)}')" class="p-2 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all text-xs" title="Excluir usuário">
                                        🗑️
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        container.innerHTML = html;
    }

    function executarBusca() {
        const input = document.getElementById('admin-user-search-input');
        if (input) {
            currentFilter.busca = input.value.trim();
            load();
        }
    }

    function setFiltro(tipo, valor) {
        currentFilter[tipo] = valor;
        load();
    }

    async function openModalNovo() {
        usuarioEmEdicao = null;
        renderModal({
            id: 0,
            nome: '',
            email: '',
            perfil: 'usuario',
            status: 'ativo',
            paginas_permitidas: Object.keys(modulosCatalogo) // Por padrão, todas marcadas
        }, 'Novo Usuário & Permissões');
    }

    async function openModalEditar(id) {
        try {
            const resp = await API.getAdminUsuario(id);
            if (resp && resp.sucesso && resp.usuario) {
                usuarioEmEdicao = resp.usuario;
                renderModal(usuarioEmEdicao, `Editar Usuário: ${usuarioEmEdicao.nome}`);
            } else {
                alert('Erro ao carregar dados do usuário.');
            }
        } catch (err) {
            alert('Falha ao obter usuário: ' + err.message);
        }
    }

    function renderModal(dados, tituloModal) {
        let modalEl = document.getElementById('modal-admin-usuario');
        if (!modalEl) {
            modalEl = document.createElement('div');
            modalEl.id = 'modal-admin-usuario';
            modalEl.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md hidden';
            document.body.appendChild(modalEl);
        }

        const isNovo = !dados.id;
        const isMaster = dados.is_master;
        const paginasAtivas = Array.isArray(dados.paginas_permitidas) ? dados.paginas_permitidas : Object.keys(modulosCatalogo);
        const isAdmin = dados.perfil === 'admin';

        // Agrupamento por módulo
        const grupos = {};
        for (const [slug, info] of Object.entries(modulosCatalogo)) {
            const grupoNome = info.modulo || 'Outros';
            if (!grupos[grupoNome]) grupos[grupoNome] = [];
            grupos[grupoNome].push({ slug, ...info });
        }

        modalEl.innerHTML = `
            <div class="glass-card rounded-3xl border border-white/10 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-scaleUp">
                <!-- Header do Modal -->
                <div class="px-6 py-4 border-b border-white/5 flex items-center justify-between shrink-0">
                    <div class="flex items-center gap-2.5">
                        <span class="p-2 rounded-2xl bg-lime-400/10 text-lime-400 text-sm">🛡️</span>
                        <div>
                            <h3 class="text-sm font-extrabold text-white">${escapeHtml(tituloModal)}</h3>
                            <p class="text-[11px] text-zinc-400">Defina credenciais de login e as páginas que este usuário pode observar.</p>
                        </div>
                    </div>
                    <button type="button" onclick="AdminUsuarios.fecharModal()" class="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors">
                        ✕
                    </button>
                </div>

                <!-- Formulário com Scroll -->
                <form id="form-admin-usuario" onsubmit="AdminUsuarios.salvarUsuario(event)" class="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                    <input type="hidden" id="usuario-id" value="${dados.id || 0}">

                    <!-- Dados Básicos -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-semibold text-zinc-300 mb-1.5">Nome Completo *</label>
                            <input type="text" id="usuario-nome" value="${escapeHtml(dados.nome)}" required placeholder="Ex: Carlos Silva" class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-lime-400/80 transition-all">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-zinc-300 mb-1.5">E-mail de Login *</label>
                            <input type="email" id="usuario-email" value="${escapeHtml(dados.email)}" required placeholder="carlos@empresa.com" class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-lime-400/80 transition-all">
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label class="block text-xs font-semibold text-zinc-300 mb-1.5">${isNovo ? 'Senha de Acesso *' : 'Nova Senha (Opcional)'}</label>
                            <input type="password" id="usuario-senha" ${isNovo ? 'required minlength="6"' : 'minlength="6"'} placeholder="${isNovo ? 'Mínimo 6 dígitos' : 'Deixe em branco para manter'}" class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-lime-400/80 transition-all">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-zinc-300 mb-1.5">Perfil de Acesso *</label>
                            <select id="usuario-perfil" onchange="AdminUsuarios.onPerfilChange(this.value)" ${isMaster ? 'disabled' : ''} class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-lime-400/80">
                                <option value="usuario" ${!isAdmin ? 'selected' : ''}>👤 Usuário Padrão</option>
                                <option value="admin" ${isAdmin ? 'selected' : ''}>👑 Administrador Total</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-zinc-300 mb-1.5">Status da Conta *</label>
                            <select id="usuario-status" ${isMaster ? 'disabled' : ''} class="w-full px-3.5 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-lime-400/80">
                                <option value="ativo" ${dados.status === 'ativo' ? 'selected' : ''}>✅ Ativo</option>
                                <option value="inativo" ${dados.status === 'inativo' ? 'selected' : ''}>⏸️ Inativo (Bloqueado)</option>
                            </select>
                        </div>
                    </div>

                    <!-- Seção de Permissões de Páginas -->
                    <div class="pt-3 border-t border-white/5 space-y-3">
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                                <h4 class="text-xs font-extrabold text-white flex items-center gap-1.5">
                                    <span>👁️ Páginas & Módulos Visíveis</span>
                                    <span id="badge-contador-permissoes" class="px-2 py-0.2 rounded-full bg-white/5 text-zinc-300 font-mono text-[10px]"></span>
                                </h4>
                                <p class="text-[11px] text-zinc-400">Marque apenas as páginas que este usuário pode observar na barra lateral e acessar.</p>
                            </div>

                            <!-- Atalhos de Seleção Rápida -->
                            <div id="acoes-selecao-paginas" class="flex items-center gap-1.5 flex-wrap self-start sm:self-auto">
                                <button type="button" onclick="AdminUsuarios.marcarTodasPaginas(true)" class="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white rounded-lg text-[10px] font-bold transition-all">
                                    Todas
                                </button>
                                <button type="button" onclick="AdminUsuarios.marcarTodasPaginas(false)" class="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white rounded-lg text-[10px] font-bold transition-all">
                                    Nenhuma
                                </button>
                                <button type="button" onclick="AdminUsuarios.marcarPorGrupo('Produtividade & Pessoal')" class="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white rounded-lg text-[10px] font-bold transition-all">
                                    Produtividade
                                </button>
                                <button type="button" onclick="AdminUsuarios.marcarPorGrupo('Startup Solar')" class="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white rounded-lg text-[10px] font-bold transition-all">
                                    Solar
                                </button>
                            </div>
                        </div>

                        <!-- Banner explicativo se perfil for Admin -->
                        <div id="banner-admin-permissoes" class="${isAdmin ? '' : 'hidden'} p-3 rounded-2xl bg-lime-400/10 border border-lime-400/20 text-lime-300 text-xs flex items-center gap-2">
                            <span>👑</span>
                            <span><strong>Administrador tem Acesso Total:</strong> Usuários com perfil Admin podem observar e gerenciar todas as páginas do sistema automaticamente.</span>
                        </div>

                        <!-- Grid de Módulos para Seleção -->
                        <div id="container-permissoes-checkboxes" class="${isAdmin ? 'opacity-50 pointer-events-none' : ''} space-y-4">
                            ${Object.entries(grupos).map(([grupoNome, itens]) => `
                                <div class="space-y-2">
                                    <div class="flex items-center justify-between pb-1 border-b border-white/5">
                                        <span class="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">${escapeHtml(grupoNome)}</span>
                                        <button type="button" onclick="AdminUsuarios.marcarPorGrupo('${escapeHtml(grupoNome)}')" class="text-[10px] text-lime-400 hover:underline">
                                            Alternar Grupo
                                        </button>
                                    </div>
                                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        ${itens.map(item => {
                                            const isChecked = paginasAtivas.includes(item.slug);
                                            return `
                                                <label class="p-2.5 rounded-2xl bg-zinc-900/60 border border-white/5 hover:border-white/15 transition-all flex items-start gap-2.5 cursor-pointer group">
                                                    <input type="checkbox" name="paginas_permitidas[]" value="${item.slug}" ${isChecked ? 'checked' : ''} onchange="AdminUsuarios.atualizarContadorPermissoes()" data-grupo="${escapeHtml(grupoNome)}" class="mt-0.5 w-4 h-4 rounded text-lime-400 bg-zinc-800 border-white/10 focus:ring-lime-400 focus:ring-offset-0 cursor-pointer">
                                                    <div class="flex-1 min-w-0">
                                                        <div class="flex items-center gap-1.5">
                                                            <span class="text-sm">${item.icone || '📄'}</span>
                                                            <span class="text-xs font-bold text-white group-hover:text-lime-400 transition-colors">${escapeHtml(item.titulo)}</span>
                                                        </div>
                                                        <p class="text-[10px] text-zinc-400 leading-tight mt-0.5 truncate">${escapeHtml(item.descricao)}</p>
                                                    </div>
                                                </label>
                                            `;
                                        }).join('')}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Footer com Botões -->
                    <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-white/5">
                        <button type="button" onclick="AdminUsuarios.fecharModal()" class="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs rounded-full transition-all">
                            Cancelar
                        </button>
                        <button type="submit" id="btn-submit-usuario" class="px-5 py-2 bg-lime-400 hover:bg-lime-300 text-black font-extrabold text-xs rounded-full shadow-lg shadow-lime-400/20 transition-all flex items-center gap-1.5 active:scale-95">
                            <span>${isNovo ? 'Cadastrar Usuário' : 'Salvar Alterações'}</span>
                        </button>
                    </div>
                </form>
            </div>
        `;

        modalEl.classList.remove('hidden');
        atualizarContadorPermissoes();
    }

    function fecharModal() {
        const modalEl = document.getElementById('modal-admin-usuario');
        if (modalEl) modalEl.classList.add('hidden');
    }

    function onPerfilChange(perfil) {
        const containerChecks = document.getElementById('container-permissoes-checkboxes');
        const bannerAdmin = document.getElementById('banner-admin-permissoes');
        const acoesSelecao = document.getElementById('acoes-selecao-paginas');

        if (perfil === 'admin') {
            if (bannerAdmin) bannerAdmin.classList.remove('hidden');
            if (containerChecks) {
                containerChecks.classList.add('opacity-50', 'pointer-events-none');
            }
            marcarTodasPaginas(true);
        } else {
            if (bannerAdmin) bannerAdmin.classList.add('hidden');
            if (containerChecks) {
                containerChecks.classList.remove('opacity-50', 'pointer-events-none');
            }
        }
        atualizarContadorPermissoes();
    }

    function marcarTodasPaginas(marcar) {
        document.querySelectorAll('input[name="paginas_permitidas[]"]').forEach(chk => {
            chk.checked = marcar;
        });
        atualizarContadorPermissoes();
    }

    function marcarPorGrupo(grupoNome) {
        const checks = document.querySelectorAll(`input[name="paginas_permitidas[]"][data-grupo="${grupoNome}"]`);
        const todosMarcados = Array.from(checks).every(c => c.checked);
        checks.forEach(c => c.checked = !todosMarcados);
        atualizarContadorPermissoes();
    }

    function atualizarContadorPermissoes() {
        const total = document.querySelectorAll('input[name="paginas_permitidas[]"]').length;
        const marcados = document.querySelectorAll('input[name="paginas_permitidas[]"]:checked').length;
        const badge = document.getElementById('badge-contador-permissoes');
        if (badge) {
            badge.textContent = `${marcados} de ${total} selecionadas`;
        }
    }

    async function salvarUsuario(e) {
        e.preventDefault();
        const id = parseInt(document.getElementById('usuario-id').value, 10);
        const nome = document.getElementById('usuario-nome').value.trim();
        const email = document.getElementById('usuario-email').value.trim();
        const senha = document.getElementById('usuario-senha').value;
        const perfil = document.getElementById('usuario-perfil').value;
        const status = document.getElementById('usuario-status').value;

        const paginas = [];
        document.querySelectorAll('input[name="paginas_permitidas[]"]:checked').forEach(c => {
            paginas.push(c.value);
        });

        if (perfil === 'usuario' && paginas.length === 0) {
            if (!confirm('Atenção: Você não selecionou nenhuma página para este usuário. Ele não conseguirá observar nenhum módulo. Deseja continuar mesmo assim?')) {
                return;
            }
        }

        const payload = {
            nome,
            email,
            perfil,
            status,
            paginas_permitidas: paginas
        };

        if (senha) {
            payload.senha = senha;
        }

        const btnSubmit = document.getElementById('btn-submit-usuario');
        if (btnSubmit) {
            btnSubmit.disabled = true;
            btnSubmit.innerHTML = '<span>Salvando...</span>';
        }

        try {
            let resp;
            if (id > 0) {
                resp = await API.updateAdminUsuario(id, payload);
            } else {
                resp = await API.createAdminUsuario(payload);
            }

            if (resp && resp.sucesso) {
                fecharModal();
                load();
            } else {
                alert('Erro: ' + ((resp && resp.erro) || 'Falha ao salvar usuário.'));
            }
        } catch (err) {
            alert('Erro ao salvar usuário: ' + err.message);
        } finally {
            if (btnSubmit) {
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = `<span>${id > 0 ? 'Salvar Alterações' : 'Cadastrar Usuário'}</span>`;
            }
        }
    }

    async function toggleStatus(id) {
        try {
            const resp = await API.toggleAdminUsuarioStatus(id);
            if (resp && resp.sucesso) {
                load();
            } else {
                alert('Erro: ' + ((resp && resp.erro) || 'Falha ao alterar status.'));
            }
        } catch (err) {
            alert('Erro: ' + err.message);
        }
    }

    async function excluirUsuario(id, nome) {
        if (!confirm(`Tem certeza que deseja excluir o usuário "${nome}"? Esta ação desativará o acesso ao sistema.`)) {
            return;
        }

        try {
            const resp = await API.deleteAdminUsuario(id);
            if (resp && resp.sucesso) {
                load();
            } else {
                alert('Erro: ' + ((resp && resp.erro) || 'Falha ao excluir usuário.'));
            }
        } catch (err) {
            alert('Erro: ' + err.message);
        }
    }

    return {
        load,
        render,
        executarBusca,
        setFiltro,
        openModalNovo,
        openModalEditar,
        fecharModal,
        onPerfilChange,
        marcarTodasPaginas,
        marcarPorGrupo,
        atualizarContadorPermissoes,
        salvarUsuario,
        toggleStatus,
        excluirUsuario
    };
})();

