/**
 * AIRES - Aplicação Principal e Orquestrador de Interface
 * Estética Pierre / High-End Obsidian Glassmorphism
 */

const App = (() => {
    let currentSection = 'inicio';
    let currentTaskView = 'kanban';
    let alertInterval = null;

    function init() {
        try { initNavigation(); } catch (e) { console.error('initNavigation erro:', e); }
        try { initUserMenu(); } catch (e) { console.error('initUserMenu erro:', e); }
        try { initModeSwitcher(); } catch (e) { console.error('initModeSwitcher erro:', e); }
        try { initTaskViewSwitcher(); } catch (e) { console.error('initTaskViewSwitcher erro:', e); }
        try { initFastCapture(); } catch (e) { console.error('initFastCapture erro:', e); }
        try { initAlertChecker(); } catch (e) { console.error('initAlertChecker erro:', e); }
        
        // Inicializar submódulos
        try { ConflictDialog?.init(); } catch (e) { console.error('ConflictDialog erro:', e); }
        try { TaskModal?.init(); } catch (e) { console.error('TaskModal erro:', e); }
        try { KanbanView?.init(document.getElementById('view-kanban-container')); } catch (e) { console.error('KanbanView erro:', e); }
        try { ListView?.init(document.getElementById('view-lista-container')); } catch (e) { console.error('ListView erro:', e); }
        try { CalendarView?.init(document.getElementById('view-calendario-container')); } catch (e) { console.error('CalendarView erro:', e); }

        // Carregar visão inicial
        try { loadSection('inicio'); } catch (e) { console.error('loadSection erro:', e); }
        updateStats();

        // Checagem imediata de alertas
        try { checkAlerts(); } catch (e) { console.error('checkAlerts erro:', e); }
    }

    /* ========================================================
     * NAVEGAÇÃO ENTRE SEÇÕES (Mobile Dock + Desktop Sidebar)
     * ======================================================== */
    function initNavigation() {
        document.querySelectorAll('[data-nav-section]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const section = btn.dataset.navSection;
                loadSection(section);
            });
        });
    }

    function loadSection(section) {
        currentSection = section;

        document.querySelectorAll('[data-nav-section]').forEach(btn => {
            const isActive = btn.dataset.navSection === section;
            const isDesktopSidebar = btn.closest('aside') !== null;

            if (isDesktopSidebar) {
                // Desktop sidebar: toggle background/border/text
                if (isActive) {
                    btn.classList.add('nav-active', 'text-white', 'bg-white/10', 'shadow-sm', 'border', 'border-white/5');
                    btn.classList.remove('text-zinc-400', 'hover:text-white', 'hover:bg-white/5');
                } else {
                    btn.classList.remove('nav-active', 'text-white', 'bg-white/10', 'shadow-sm', 'border', 'border-white/5');
                    btn.classList.add('text-zinc-400', 'hover:text-white', 'hover:bg-white/5');
                }
            } else {
                // Mobile dock: toggle text color
                if (isActive) {
                    btn.classList.add('text-lime-400');
                    btn.classList.remove('text-zinc-400');
                } else {
                    btn.classList.remove('text-lime-400');
                    btn.classList.add('text-zinc-400');
                }
            }
        });

        document.querySelectorAll('.app-section').forEach(sec => sec.classList.add('hidden'));
        const targetSec = document.getElementById(`section-${section}`);
        if (targetSec) targetSec.classList.remove('hidden');

        if (section === 'inicio') {
            updateStats();
        } else if (section === 'tarefas') {
            loadTaskView(currentTaskView);
        } else if (section === 'missoes') {
            renderMissions();
        } else if (section === 'notas') {
            renderNotes();
        } else if (section === 'dashboard') {
            renderDashboard();
        }
    }

    /* ========================================================
     * MENU DO USUÁRIO & CONFIGURAÇÕES (Dropdown)
     * ======================================================== */
    function initUserMenu() {
        const btn = document.getElementById('btn-user-menu');
        const menu = document.getElementById('user-dropdown-menu');
        const chevron = document.getElementById('user-menu-chevron');

        if (!btn || !menu) return;

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isHidden = menu.classList.contains('hidden');
            if (isHidden) {
                menu.classList.remove('hidden');
                chevron?.classList.add('rotate-180');
            } else {
                menu.classList.add('hidden');
                chevron?.classList.remove('rotate-180');
            }
        });

        document.addEventListener('click', (e) => {
            if (!menu.contains(e.target) && !btn.contains(e.target)) {
                menu.classList.add('hidden');
                chevron?.classList.remove('rotate-180');
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                menu.classList.add('hidden');
                chevron?.classList.remove('rotate-180');
                closeSettingsModal();
            }
        });
    }

    function openSettingsModal() {
        const menu = document.getElementById('user-dropdown-menu');
        const chevron = document.getElementById('user-menu-chevron');
        menu?.classList.add('hidden');
        chevron?.classList.remove('rotate-180');

        const modal = document.getElementById('settings-modal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
    }

    function closeSettingsModal() {
        const modal = document.getElementById('settings-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    }

    /* ========================================================
     * MODOS DE CONTEXTO & FOCO (Trabalho, Pessoal, Empresarial...)
     * ======================================================== */
    const MODE_THEMES = {
        lime: {
            name: 'Lime',
            btn: 'bg-lime-400 hover:bg-lime-300 text-black shadow-lime-400/25',
            badge: 'bg-lime-500/15 text-lime-400 border-lime-500/30',
            border: 'border-lime-500/40',
            borderFocus: 'focus:border-lime-400/80',
            glow: 'shadow-lime-500/20',
            text: 'text-lime-400',
            dot: 'bg-lime-400',
            ring: 'ring-lime-400/50',
            bgSubtle: 'bg-lime-500/10'
        },
        purple: {
            name: 'Purple',
            btn: 'bg-purple-500 hover:bg-purple-400 text-white shadow-purple-500/25',
            badge: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
            border: 'border-purple-500/40',
            borderFocus: 'focus:border-purple-400/80',
            glow: 'shadow-purple-500/20',
            text: 'text-purple-400',
            dot: 'bg-purple-500',
            ring: 'ring-purple-400/50',
            bgSubtle: 'bg-purple-500/10'
        },
        orange: {
            name: 'Orange',
            btn: 'bg-orange-500 hover:bg-orange-400 text-white shadow-orange-500/25',
            badge: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
            border: 'border-orange-500/40',
            borderFocus: 'focus:border-orange-400/80',
            glow: 'shadow-orange-500/20',
            text: 'text-orange-400',
            dot: 'bg-orange-500',
            ring: 'ring-orange-400/50',
            bgSubtle: 'bg-orange-500/10'
        },
        cyan: {
            name: 'Cyan',
            btn: 'bg-cyan-400 hover:bg-cyan-300 text-black shadow-cyan-400/25',
            badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
            border: 'border-cyan-500/40',
            borderFocus: 'focus:border-cyan-400/80',
            glow: 'shadow-cyan-400/20',
            text: 'text-cyan-400',
            dot: 'bg-cyan-400',
            ring: 'ring-cyan-400/50',
            bgSubtle: 'bg-cyan-500/10'
        },
        emerald: {
            name: 'Emerald',
            btn: 'bg-emerald-400 hover:bg-emerald-300 text-black shadow-emerald-400/25',
            badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
            border: 'border-emerald-500/40',
            borderFocus: 'focus:border-emerald-400/80',
            glow: 'shadow-emerald-400/20',
            text: 'text-emerald-400',
            dot: 'bg-emerald-400',
            ring: 'ring-emerald-400/50',
            bgSubtle: 'bg-emerald-500/10'
        },
        rose: {
            name: 'Rose',
            btn: 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/25',
            badge: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
            border: 'border-rose-500/40',
            borderFocus: 'focus:border-rose-400/80',
            glow: 'shadow-rose-500/20',
            text: 'text-rose-400',
            dot: 'bg-rose-500',
            ring: 'ring-rose-400/50',
            bgSubtle: 'bg-rose-500/10'
        }
    };

    let activeMode = localStorage.getItem('aires_active_mode') || 'todos';
    let modesList = [];

    async function initModeSwitcher() {
        const btn = document.getElementById('btn-mode-switcher');
        const menu = document.getElementById('modes-dropdown-menu');
        const chevron = document.getElementById('mode-chevron');

        // Buscar lista inicial de modos da API
        try {
            const res = await API.getModos();
            if (res.sucesso && Array.isArray(res.modos)) {
                modesList = res.modos;
                renderModesDropdown();
                if (typeof TaskModal !== 'undefined' && TaskModal.updateModeOptions) {
                    TaskModal.updateModeOptions(modesList);
                }
            }
        } catch (e) {
            console.error('Erro ao carregar modos:', e);
        }

        updateModeSwitcherUI();

        if (btn && menu) {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                // Fechar menu de usuário se aberto
                document.getElementById('user-dropdown-menu')?.classList.add('hidden');
                document.getElementById('user-menu-chevron')?.classList.remove('rotate-180');

                const isHidden = menu.classList.contains('hidden');
                if (isHidden) {
                    menu.classList.remove('hidden');
                    chevron?.classList.add('rotate-180');
                } else {
                    menu.classList.add('hidden');
                    chevron?.classList.remove('rotate-180');
                }
            });

            document.addEventListener('click', (e) => {
                if (!menu.contains(e.target) && !btn.contains(e.target)) {
                    menu.classList.add('hidden');
                    chevron?.classList.remove('rotate-180');
                }
            });

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    menu.classList.add('hidden');
                    chevron?.classList.remove('rotate-180');
                    closeCreateModeModal();
                }
            });
        }

        setupCreateModeModal();
    }

    function renderModesDropdown() {
        const listContainer = document.getElementById('modes-list-container');
        if (!listContainer) return;

        let html = `
            <button type="button" data-mode-slug="todos" class="mode-select-btn w-full flex items-center justify-between px-3 py-2 rounded-2xl text-xs font-semibold hover:bg-white/5 transition-all text-left group ${activeMode === 'todos' ? 'bg-white/10 text-white' : 'text-zinc-300'}">
                <div class="flex items-center gap-2.5">
                    <div class="flex items-center -space-x-1.5">
                        <span class="w-5 h-5 rounded-full bg-purple-600/80 flex items-center justify-center text-[10px]">💼</span>
                        <span class="w-5 h-5 rounded-full bg-orange-600/80 flex items-center justify-center text-[10px]">👤</span>
                        <span class="w-5 h-5 rounded-full bg-cyan-600/80 flex items-center justify-center text-[10px]">🏢</span>
                    </div>
                    <div>
                        <p class="font-bold text-xs ${activeMode === 'todos' ? 'text-white' : 'text-zinc-200 group-hover:text-white'}">Todos os Modos</p>
                        <p class="text-[9px] text-zinc-500">Visão integrada geral</p>
                    </div>
                </div>
                <span class="mode-check-indicator ${activeMode === 'todos' ? '' : 'hidden'} text-lime-400 font-black text-xs">✓</span>
            </button>
        `;

        modesList.forEach(m => {
            const isSelected = activeMode === m.slug;
            const theme = MODE_THEMES[m.cor] || MODE_THEMES.lime;
            html += `
                <div class="mode-item-row w-full flex items-center justify-between px-3 py-1.5 rounded-2xl text-xs font-semibold hover:bg-white/5 transition-all group ${isSelected ? 'bg-white/10 text-white' : 'text-zinc-300'}">
                    <button type="button" data-mode-slug="${escapeHtml(m.slug)}" class="mode-select-btn flex items-center gap-2.5 flex-1 min-w-0 text-left py-0.5">
                        <span class="w-7 h-7 rounded-xl ${theme.badge} border flex items-center justify-center text-sm shadow-sm group-hover:scale-105 transition-transform shrink-0">${escapeHtml(m.icone || '🎯')}</span>
                        <div class="min-w-0 truncate">
                            <p class="font-bold text-xs ${isSelected ? 'text-white' : 'text-zinc-200 group-hover:text-white'} truncate">${escapeHtml(m.nome)}</p>
                            <p class="text-[9px] text-zinc-500 truncate">${m.tarefas_ativas !== undefined ? `${m.tarefas_ativas} ações ativas` : `Filtrar por ${escapeHtml(m.nome)}`}</p>
                        </div>
                    </button>
                    <div class="flex items-center gap-1 shrink-0">
                        <span class="mode-check-indicator ${isSelected ? '' : 'hidden'} ${theme.text} font-black text-xs mr-1">✓</span>
                        <button type="button" class="btn-edit-mode text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" data-mode-id="${m.id}" title="Editar ${escapeHtml(m.nome)}">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                        </button>
                    </div>
                </div>
            `;
        });

        listContainer.innerHTML = html;

        listContainer.querySelectorAll('.mode-select-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const slug = btn.dataset.modeSlug;
                selectMode(slug);
            });
        });

        listContainer.querySelectorAll('.btn-edit-mode').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const modeId = parseInt(btn.dataset.modeId);
                openEditModeModal(modeId);
            });
        });
    }

    function selectMode(slug) {
        activeMode = slug;
        localStorage.setItem('aires_active_mode', slug);
        updateModeSwitcherUI();
        renderModesDropdown();

        const menu = document.getElementById('modes-dropdown-menu');
        const chevron = document.getElementById('mode-chevron');
        menu?.classList.add('hidden');
        chevron?.classList.remove('rotate-180');

        showToast(
            slug === 'todos' ? 'Modo: Visão Integrada (Todos)' : `Modo alternado: ${getModeName(slug)}`,
            'info'
        );

        reloadCurrentView();
    }

    function updateModeSwitcherUI() {
        const btn = document.getElementById('btn-mode-switcher');
        const label = document.getElementById('mode-active-label');
        const pillDisplay = document.getElementById('mode-pill-display');
        const totalBadge = document.getElementById('mode-badge-total');

        if (activeMode === 'todos') {
            if (btn) {
                btn.className = 'flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-white/10 hover:border-white/20 shadow-inner transition-all select-none group';
            }
            if (label) {
                label.innerText = 'Todos';
                label.className = 'text-[10px] font-extrabold text-zinc-300 hidden sm:inline';
            }
            if (totalBadge) {
                totalBadge.innerText = 'Todos';
                totalBadge.className = 'text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-white/10 text-lime-400';
            }
            if (pillDisplay) {
                pillDisplay.innerHTML = `
                    <span class="w-5 h-5 rounded-full bg-purple-600/80 flex items-center justify-center text-[10px] shadow-sm">💼</span>
                    <span class="w-5 h-5 rounded-full bg-orange-600/80 flex items-center justify-center text-[10px] shadow-sm">👤</span>
                    <span class="w-5 h-5 rounded-full bg-cyan-600/80 flex items-center justify-center text-[10px] shadow-sm">🏢</span>
                `;
            }
        } else {
            const current = modesList.find(m => m.slug === activeMode);
            const nome = current ? current.nome : activeMode;
            const icone = current ? current.icone : '🎯';
            const cor = current ? current.cor : 'lime';
            const theme = MODE_THEMES[cor] || MODE_THEMES.lime;

            if (btn) {
                btn.className = `flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border ${theme.border} shadow-sm ${theme.glow} transition-all select-none group`;
            }
            if (label) {
                label.innerText = nome;
                label.className = `text-[10px] font-extrabold ${theme.text} hidden sm:inline`;
            }
            if (totalBadge) {
                totalBadge.innerText = nome;
                totalBadge.className = `text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${theme.badge}`;
            }
            if (pillDisplay) {
                pillDisplay.innerHTML = `
                    <span class="w-5 h-5 rounded-full ${theme.badge} border flex items-center justify-center text-[11px] shadow-sm">${icone}</span>
                `;
            }
        }
    }

    function getModeName(slug) {
        if (slug === 'todos') return 'Todos';
        const found = modesList.find(m => m.slug === slug);
        return found ? found.nome : slug;
    }

    function getModeIcon(slug) {
        if (!slug || slug === 'todos') return '⚡';
        const found = modesList.find(m => m.slug === slug);
        if (found) return found.icone || '🎯';
        if (slug === 'trabalho') return '💼';
        if (slug === 'pessoal') return '👤';
        if (slug === 'empresarial') return '🏢';
        return '🎯';
    }

    function getModeBadgeHtml(slug) {
        if (!slug) return '';
        const found = modesList.find(m => m.slug === slug);
        const nome = found ? found.nome : slug;
        const icone = found ? found.icone : (slug === 'trabalho' ? '💼' : slug === 'pessoal' ? '👤' : slug === 'empresarial' ? '🏢' : '🎯');
        const cor = found ? found.cor : 'lime';
        const theme = MODE_THEMES[cor] || MODE_THEMES.lime;

        return `
            <span class="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${theme.badge}" title="Modo: ${escapeHtml(nome)}">
                <span>${icone}</span>
                <span>${escapeHtml(nome)}</span>
            </span>
        `;
    }

    function applyModalThemeColor(color, emoji = null) {
        const theme = MODE_THEMES[color] || MODE_THEMES.lime;

        const iconBadge = document.getElementById('modal-mode-icon-badge');
        if (iconBadge) {
            iconBadge.className = `w-11 h-11 rounded-2xl flex items-center justify-center text-xl transition-all border ${theme.badge}`;
            if (emoji !== null) {
                iconBadge.innerText = emoji;
            }
        }

        const submitBtn = document.getElementById('btn-submit-create-mode');
        if (submitBtn) {
            submitBtn.className = `px-5 py-2 font-extrabold text-xs rounded-full shadow-lg transition-all ${theme.btn}`;
        }

        const iconInput = document.getElementById('new-mode-icone');
        if (iconInput) {
            iconInput.className = `w-14 text-center py-2 bg-zinc-900 border rounded-2xl text-lg transition-all focus:outline-none ${theme.border} ${theme.bgSubtle} ${theme.borderFocus}`;
        }

        const nameInput = document.getElementById('new-mode-nome');
        if (nameInput) {
            nameInput.className = `w-full px-4 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-zinc-100 placeholder-zinc-500 focus:outline-none text-xs transition-all ${theme.borderFocus}`;
        }
    }

    function setupCreateModeModal() {
        const btnOpen = document.getElementById('btn-open-create-mode');
        const btnClose = document.getElementById('btn-close-create-mode');
        const btnCancel = document.getElementById('btn-cancel-create-mode');
        const btnDelete = document.getElementById('btn-delete-mode');
        const form = document.getElementById('form-create-mode');
        const iconInput = document.getElementById('new-mode-icone');

        btnOpen?.addEventListener('click', (e) => {
            e.stopPropagation();
            document.getElementById('modes-dropdown-menu')?.classList.add('hidden');
            document.getElementById('mode-chevron')?.classList.remove('rotate-180');
            openCreateModeModal();
        });

        btnClose?.addEventListener('click', closeCreateModeModal);
        btnCancel?.addEventListener('click', closeCreateModeModal);

        // Ouvir mudanças nos rádios de cor temática para alterar o modal em tempo real
        document.querySelectorAll('input[name="new-mode-cor"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    applyModalThemeColor(e.target.value);
                }
            });
        });

        // Digitação no input de emoji atualiza o badge do header do modal
        iconInput?.addEventListener('input', () => {
            const iconBadge = document.getElementById('modal-mode-icon-badge');
            if (iconBadge && iconInput.value.trim()) {
                iconBadge.innerText = iconInput.value.trim();
            }
        });

        document.querySelectorAll('.mode-emoji-opt').forEach(opt => {
            opt.addEventListener('click', () => {
                if (iconInput) {
                    iconInput.value = opt.dataset.emoji;
                    const iconBadge = document.getElementById('modal-mode-icon-badge');
                    if (iconBadge) iconBadge.innerText = opt.dataset.emoji;
                }
            });
        });

        // Submit form (Criar ou Atualizar)
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const modeId = document.getElementById('new-mode-id')?.value;
            const nome = document.getElementById('new-mode-nome')?.value.trim();
            const icone = iconInput?.value.trim() || '🎯';
            const corRadio = document.querySelector('input[name="new-mode-cor"]:checked');
            const cor = corRadio ? corRadio.value : 'lime';

            if (!nome) {
                showToast('Informe o nome do modo.', 'error');
                return;
            }

            try {
                if (modeId) {
                    // Atualizar modo existente
                    const res = await API.updateModo(modeId, { nome, icone, cor });
                    if (res && res.sucesso && res.modo) {
                        const idx = modesList.findIndex(m => m.id == modeId);
                        if (idx !== -1) {
                            modesList[idx] = { ...modesList[idx], ...res.modo };
                        }
                        if (typeof TaskModal !== 'undefined' && TaskModal.updateModeOptions) {
                            TaskModal.updateModeOptions(modesList);
                        }
                        closeCreateModeModal();
                        updateModeSwitcherUI();
                        renderModesDropdown();
                        reloadCurrentView();
                        showToast(`Modo "${res.modo.nome}" atualizado!`, 'success');
                    }
                } else {
                    // Criar novo modo
                    const res = await API.createModo({ nome, icone, cor });
                    if (res && res.sucesso && res.modo) {
                        modesList.push(res.modo);
                        if (typeof TaskModal !== 'undefined' && TaskModal.updateModeOptions) {
                            TaskModal.updateModeOptions(modesList);
                        }
                        closeCreateModeModal();
                        selectMode(res.modo.slug);
                        showToast(`Novo modo "${res.modo.nome}" criado com sucesso!`, 'success');
                    }
                }
            } catch (err) {
                showToast(err.message || 'Erro ao salvar modo', 'error');
            }
        });

        // Excluir modo
        btnDelete?.addEventListener('click', async () => {
            const modeId = document.getElementById('new-mode-id')?.value;
            if (!modeId) return;

            const mode = modesList.find(m => m.id == modeId);
            const nome = mode ? mode.nome : 'este modo';

            if (!confirm(`Deseja realmente excluir o modo "${nome}"? As tarefas vinculadas serão preservadas.`)) {
                return;
            }

            try {
                const res = await API.deleteModo(modeId);
                if (res && res.sucesso) {
                    if (mode && activeMode === mode.slug) {
                        activeMode = res.fallback_modo || 'todos';
                        localStorage.setItem('aires_active_mode', activeMode);
                    }
                    modesList = modesList.filter(m => m.id != modeId);
                    if (typeof TaskModal !== 'undefined' && TaskModal.updateModeOptions) {
                        TaskModal.updateModeOptions(modesList);
                    }
                    closeCreateModeModal();
                    updateModeSwitcherUI();
                    renderModesDropdown();
                    reloadCurrentView();
                    showToast(`Modo "${nome}" removido!`, 'success');
                }
            } catch (err) {
                showToast(err.message || 'Erro ao excluir modo', 'error');
            }
        });
    }

    function openCreateModeModal() {
        const modal = document.getElementById('modal-create-mode');
        const form = document.getElementById('form-create-mode');
        const idInput = document.getElementById('new-mode-id');
        const title = document.getElementById('modal-mode-title');
        const desc = document.getElementById('modal-mode-desc');
        const submitBtn = document.getElementById('btn-submit-create-mode');
        const deleteBtn = document.getElementById('btn-delete-mode');

        if (form) form.reset();
        if (idInput) idInput.value = '';
        if (title) title.innerText = 'Novo Modo de Contexto';
        if (desc) desc.innerText = 'Separe fluxos de tarefas (Ex: Freelance, Família)';
        if (submitBtn) submitBtn.innerText = 'Salvar Modo';
        if (deleteBtn) deleteBtn.classList.add('hidden');

        const limeRadio = document.querySelector('input[name="new-mode-cor"][value="lime"]');
        if (limeRadio) limeRadio.checked = true;

        applyModalThemeColor('lime', '✨');

        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            document.getElementById('new-mode-nome')?.focus();
        }
    }

    function openEditModeModal(modeId) {
        const modal = document.getElementById('modal-create-mode');
        const idInput = document.getElementById('new-mode-id');
        const nameInput = document.getElementById('new-mode-nome');
        const iconInput = document.getElementById('new-mode-icone');
        const title = document.getElementById('modal-mode-title');
        const desc = document.getElementById('modal-mode-desc');
        const submitBtn = document.getElementById('btn-submit-create-mode');
        const deleteBtn = document.getElementById('btn-delete-mode');

        const mode = modesList.find(m => m.id == modeId);
        if (!mode) return;

        // Fechar dropdown de modos
        document.getElementById('modes-dropdown-menu')?.classList.add('hidden');
        document.getElementById('mode-chevron')?.classList.remove('rotate-180');

        if (idInput) idInput.value = mode.id;
        if (nameInput) nameInput.value = mode.nome;
        if (iconInput) iconInput.value = mode.icone;
        if (title) title.innerText = 'Editar Modo de Contexto';
        if (desc) desc.innerText = `Personalize o nome, ícone e cor de "${mode.nome}"`;
        if (submitBtn) submitBtn.innerText = 'Salvar Alterações';

        // Permitir exclusão se houver mais de 1 modo cadastrado
        if (deleteBtn) {
            if (modesList.length > 1) {
                deleteBtn.classList.remove('hidden');
            } else {
                deleteBtn.classList.add('hidden');
            }
        }

        const cor = mode.cor || 'lime';
        const colorRadio = document.querySelector(`input[name="new-mode-cor"][value="${cor}"]`);
        if (colorRadio) colorRadio.checked = true;

        applyModalThemeColor(cor, mode.icone || '🎯');

        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            nameInput?.focus();
        }
    }

    function closeCreateModeModal() {
        const modal = document.getElementById('modal-create-mode');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    }

    /* ========================================================
     * ALTERNADOR DE VISÕES (Pills estilo Pierre)
     * ======================================================== */
    function initTaskViewSwitcher() {
        document.querySelectorAll('[data-task-view]').forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.dataset.taskView;
                loadTaskView(view);
            });
        });

        const searchInput = document.getElementById('search-task-input');
        let searchTimeout;
        searchInput?.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                reloadCurrentView();
            }, 300);
        });

        document.getElementById('filter-priority-select')?.addEventListener('change', () => {
            reloadCurrentView();
        });
    }

    function loadTaskView(view) {
        currentTaskView = view;
        if (currentSection !== 'tarefas') {
            loadSection('tarefas');
            return;
        }

        document.querySelectorAll('[data-task-view]').forEach(btn => {
            const isActive = btn.dataset.taskView === view;
            if (isActive) {
                btn.classList.add('glass-pill-active');
                btn.classList.remove('text-zinc-400');
            } else {
                btn.classList.remove('glass-pill-active');
                btn.classList.add('text-zinc-400');
            }
        });

        ['kanban', 'lista', 'calendario'].forEach(v => {
            const el = document.getElementById(`view-${v}-container`);
            if (el) {
                if (v === view) el.classList.remove('hidden');
                else el.classList.add('hidden');
            }
        });

        const filters = getActiveFilters();
        if (view === 'kanban') {
            KanbanView.render(filters);
        } else if (view === 'lista') {
            ListView.render(filters);
        } else if (view === 'calendario') {
            CalendarView.render(filters);
        }
    }

    function getActiveFilters() {
        const busca = document.getElementById('search-task-input')?.value.trim() || '';
        const prioridade = document.getElementById('filter-priority-select')?.value || '';
        const filters = {};
        if (busca) filters.busca = busca;
        if (prioridade) filters.prioridade = prioridade;
        if (activeMode && activeMode !== 'todos') filters.modo = activeMode;
        return filters;
    }

    function reloadCurrentView() {
        if (currentSection === 'inicio') {
            updateStats();
        } else if (currentSection === 'tarefas') {
            loadTaskView(currentTaskView);
        } else if (currentSection === 'missoes') {
            renderMissions();
        } else if (currentSection === 'notas') {
            renderNotes();
        } else if (currentSection === 'dashboard') {
            renderDashboard();
        }
        updateStats();
    }

    /* ========================================================
     * FAST CAPTURE BAR (Inspirado no "Pergunte ao Pierre")
     * ======================================================== */
    function initFastCapture() {
        const input = document.getElementById('fast-capture-input');
        const submitBtn = document.getElementById('btn-fast-capture-submit');

        const doFastCapture = async () => {
            const val = input.value.trim();
            if (!val) return;

            try {
                await API.createTarefa({
                    titulo: val,
                    inbox: true,
                    prioridade: 'media',
                    status: 'planejamento',
                    modo: (activeMode && activeMode !== 'todos') ? activeMode : 'trabalho'
                });

                input.value = '';
                showToast('⚡ Ação capturada com sucesso em Planejamento!', 'success');
                
                // Mover a página para Execução & Tarefas com foco em Planejamento
                if (typeof KanbanView !== 'undefined' && KanbanView.setMobileColumn) {
                    KanbanView.setMobileColumn('planejamento');
                }
                loadSection('tarefas');
                loadTaskView('kanban');
            } catch (err) {
                showToast(err.message, 'error');
            }
        };

        submitBtn?.addEventListener('click', doFastCapture);
        input?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                doFastCapture();
            }
        });

        document.getElementById('btn-quick-capture')?.addEventListener('click', () => {
            TaskModal.open(null, { status: 'planejamento' });
        });
        document.getElementById('btn-desktop-new-task')?.addEventListener('click', () => {
            TaskModal.open(null, { status: 'planejamento' });
        });
    }

    /* ========================================================
     * INTELIGÊNCIA ATIVA: ALERTA DE SAÍDA E NOTIFICAÇÕES
     * ======================================================== */
    function initAlertChecker() {
        alertInterval = setInterval(checkAlerts, 30000);
    }

    async function checkAlerts() {
        try {
            const res = await API.getAlertasPendentes();
            if (res.sucesso && res.alertas && res.alertas.length > 0) {
                res.alertas.forEach(alerta => {
                    showAlertBanner(alerta);
                });
            }
        } catch (e) {
            // Silencioso
        }
    }

    function showAlertBanner(alerta) {
        const banner = document.createElement('div');
        banner.className = 'fixed top-5 right-5 z-50 max-w-sm w-full p-4 rounded-3xl bg-[#141418] border border-orange-500/40 text-white font-medium shadow-2xl flex items-start gap-3 transform translate-y-0 transition-all duration-300';
        banner.innerHTML = `
            <div class="w-9 h-9 rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400 font-bold shrink-0">
                🚗
            </div>
            <div class="flex-1">
                <p class="text-[10px] uppercase font-black tracking-widest text-orange-400">Gatilho de Saída Calculado</p>
                <p class="text-xs font-bold text-zinc-100 mt-0.5">${escapeHtml(alerta.mensagem)}</p>
                ${alerta.endereco_local ? `<p class="text-[11px] mt-1 text-zinc-400">📍 ${escapeHtml(alerta.endereco_local)}</p>` : ''}
            </div>
            <button type="button" class="w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center text-xs">✕</button>
        `;

        banner.querySelector('button').addEventListener('click', () => {
            API.markAlertaLido(alerta.id);
            banner.remove();
        });

        document.body.appendChild(banner);

        setTimeout(() => {
            if (banner.parentElement) {
                API.markAlertaLido(alerta.id);
                banner.remove();
            }
        }, 15000);
    }

    /* ========================================================
     * SEÇÃO: MISSÕES ESTRATÉGICAS (Pilar 1 - Bento Grid)
     * ======================================================== */
    async function renderMissions() {
        const container = document.getElementById('missions-grid');
        if (!container) return;

        container.innerHTML = '<div class="p-8 text-center text-zinc-500 text-xs">Carregando missões...</div>';

        try {
            const res = await API.getMissoes();
            const missoes = res.sucesso ? res.missoes : [];

            if (missoes.length === 0) {
                container.innerHTML = `
                    <div class="col-span-full p-12 text-center border border-dashed border-white/10 rounded-3xl">
                        <p class="text-zinc-500 text-xs">Nenhuma missão estratégica cadastrada.</p>
                        <button type="button" class="mt-3 px-5 py-2.5 bg-white text-zinc-950 font-bold text-xs rounded-full shadow-lg" onclick="App.openMissionModal()">
                            + Criar Missão
                        </button>
                    </div>
                `;
                return;
            }

            container.innerHTML = missoes.map(m => {
                const total = parseInt(m.total_tarefas) || 0;
                const concluidas = parseInt(m.tarefas_concluidas) || 0;
                const progresso = total > 0 ? Math.round((concluidas / total) * 100) : m.progresso;
                const dateLimit = m.data_limite ? new Date(m.data_limite).toLocaleDateString('pt-BR') : 'Sem prazo';

                return `
                    <div class="glass-card rounded-3xl p-5 space-y-4 hover:border-white/20 transition-all">
                        <div class="flex items-center justify-between">
                            <span class="text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${m.status === 'concluida' ? 'bg-lime-400/10 text-lime-400 border border-lime-400/20' : 'bg-purple-500/10 text-purple-300 border border-purple-500/20'}">
                                ${m.status === 'concluida' ? 'Concluída' : 'Em Execução'}
                            </span>
                            <span class="text-[11px] text-zinc-500">🎯 ${dateLimit}</span>
                        </div>

                        <div>
                            <h4 class="font-extrabold text-sm md:text-base text-zinc-100">${escapeHtml(m.titulo)}</h4>
                            <p class="text-xs text-zinc-400 mt-1 line-clamp-2">${escapeHtml(m.descricao || 'Sem descrição detalhada.')}</p>
                        </div>

                        <div>
                            <div class="flex items-center justify-between text-xs font-semibold mb-1.5 text-zinc-300">
                                <span>Progresso da Missão</span>
                                <span class="text-lime-400 font-bold">${progresso}% (${concluidas}/${total})</span>
                            </div>
                            <div class="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                                <div class="bg-gradient-to-r from-purple-500 via-indigo-500 to-lime-400 h-1.5 rounded-full transition-all" style="width: ${progresso}%"></div>
                            </div>
                        </div>

                        <div class="pt-3 border-t border-white/[0.04] flex items-center justify-between text-xs">
                            <span class="text-zinc-500">Orçamento: R$ ${parseFloat(m.orcamento_estimado).toFixed(2)}</span>
                            <button type="button" class="text-lime-400 hover:underline font-bold" onclick="App.filterTasksByMission(${m.id})">
                                Ver Ações →
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        } catch (err) {
            container.innerHTML = `<div class="p-6 text-red-400">Erro: ${err.message}</div>`;
        }
    }

    /* ========================================================
     * SEÇÃO: BASE DE CONHECIMENTO (Zettelkasten)
     * ======================================================== */
    async function renderNotes() {
        const container = document.getElementById('notes-grid');
        if (!container) return;

        container.innerHTML = '<div class="p-8 text-center text-zinc-500 text-xs">Carregando notas...</div>';

        try {
            const res = await API.getNotas();
            const notas = res.sucesso ? res.notas : [];

            if (notas.length === 0) {
                container.innerHTML = `
                    <div class="col-span-full p-12 text-center border border-dashed border-white/10 rounded-3xl">
                        <p class="text-zinc-500 text-xs">Nenhuma anotação registrada.</p>
                        <button type="button" class="mt-3 px-5 py-2.5 bg-white text-zinc-950 font-bold text-xs rounded-full shadow-lg" onclick="App.openNoteModal()">
                            + Registrar Nota
                        </button>
                    </div>
                `;
                return;
            }

            container.innerHTML = notas.map(n => `
                <div class="glass-card rounded-3xl p-5 space-y-2.5 hover:border-white/20 transition-all ${n.fixado ? 'ring-1 ring-orange-500/40' : ''}">
                    <div class="flex items-center justify-between">
                        <h4 class="font-bold text-sm text-zinc-100 truncate">${escapeHtml(n.titulo)}</h4>
                        ${n.fixado ? '<span class="text-xs text-orange-400">📌 Fixada</span>' : ''}
                    </div>
                    <p class="text-xs text-zinc-400 line-clamp-4 whitespace-pre-wrap">${escapeHtml(n.conteudo || '')}</p>
                    ${n.tags ? `
                        <div class="pt-2 flex flex-wrap gap-1">
                            ${n.tags.split(',').map(tag => `<span class="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-zinc-400 border border-white/5">${escapeHtml(tag.trim())}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
            `).join('');
        } catch (err) {
            container.innerHTML = `<div class="p-6 text-red-400">Erro: ${err.message}</div>`;
        }
    }

    /* ========================================================
     * SEÇÃO: DASHBOARD DE PRODUTIVIDADE & GAMIFICAÇÃO
     * ======================================================== */
    async function renderDashboard() {
        await updateStats();
    }

    async function updateStats() {
        try {
            const res = await API.getDashboardStats();
            if (res && res.sucesso) {
                const u = res.usuario || {};
                const m = res.metricas || {};

                const streak = (typeof u.streak_dias !== 'undefined') ? u.streak_dias : 0;
                const xp = (typeof u.xp !== 'undefined') ? u.xp : 0;
                const totalActive = (m.planejamento || 0) + (m.a_fazer || 0) + (m.em_andamento || 0);
                const focusRate = m.taxa_foco || 0;
                const concludedToday = m.hoje_concluidas || 0;
                const concludedWeek = (typeof m.semana_concluidas !== 'undefined') ? m.semana_concluidas : (m.concluidas || 0);

                // ---- Streak (all locations) ----
                document.querySelectorAll('.user-streak-display').forEach(el => el.innerText = `${streak}d`);
                
                const streakEl = document.getElementById('stat-streak');
                if (streakEl) streakEl.innerText = `${streak} dias`;

                const streakDashEl = document.getElementById('stat-streak-dash');
                if (streakDashEl) streakDashEl.innerText = `${streak}d`;

                // ---- XP (all locations) ----
                const xpEl = document.getElementById('stat-xp');
                if (xpEl) xpEl.innerText = `${xp} XP`;

                const xpDashEl = document.getElementById('stat-xp-dash');
                if (xpDashEl) xpDashEl.innerText = `${xp}`;

                // Header XP pill
                document.querySelectorAll('.user-xp-display').forEach(el => el.innerText = `${xp} XP`);

                // ---- Level progress bar ----
                const level = Math.floor(xp / 100) + 1;
                const xpInLevel = xp % 100;
                const xpToNext = 100 - xpInLevel;
                const levelProgress = xpInLevel;
                const levelBar = document.getElementById('level-progress-bar');
                if (levelBar) levelBar.style.width = `${levelProgress}%`;
                const levelText = document.getElementById('level-text');
                if (levelText) levelText.innerText = `Nível ${level} • ${xpToNext} XP para o Nível ${level + 1}`;

                // ---- Dashboard stats ----
                const concluidasEl = document.getElementById('stat-concluidas');
                if (concluidasEl) concluidasEl.innerText = concludedWeek;

                const focoEl = document.getElementById('stat-foco');
                if (focoEl) focoEl.innerText = `${focusRate}%`;

                // ---- Hero Cards (Início) ----
                const heroActive = document.getElementById('hero-active-count');
                if (heroActive) heroActive.innerText = `${totalActive} Tarefas`;

                const heroFocus = document.getElementById('hero-focus-rate');
                if (heroFocus) heroFocus.innerText = `${focusRate}% Foco`;

                const heroConcluded = document.getElementById('hero-concluded-today');
                if (heroConcluded) heroConcluded.innerText = `${concludedToday} concluídas hoje`;

                // ---- Heatmap de Compromissos no Mês ----
                const comp = res.compromissos_mes;
                if (comp) {
                    const badgeEl = document.getElementById('heatmap-badge-count');
                    if (badgeEl) {
                        if (comp.dias_com_agenda > 0) {
                            badgeEl.className = 'text-[10px] font-bold text-lime-400 bg-lime-400/10 px-2 py-0.5 rounded-full';
                            badgeEl.innerText = `${comp.dias_com_agenda} dias marcados`;
                        } else {
                            badgeEl.className = 'text-[10px] font-bold text-zinc-400 bg-white/5 px-2 py-0.5 rounded-full';
                            badgeEl.innerText = 'Ritmo Livre';
                        }
                    }

                    const mesNomeEl = document.getElementById('heatmap-mes-nome');
                    if (mesNomeEl && comp.mes_nome) {
                        mesNomeEl.innerText = comp.mes_nome;
                    }

                    const container = document.getElementById('heatmap-cells-container');
                    if (container && Array.isArray(comp.dias)) {
                        container.innerHTML = comp.dias.map(d => {
                            const count = d.count || 0;
                            const isToday = !!d.is_today;
                            const diaNum = String(d.dia).padStart(2, '0');
                            const tarefasList = (d.tarefas && d.tarefas.length > 0) ? d.tarefas.join(', ') : '';

                            let titleText = `Dia ${diaNum}`;
                            if (isToday) titleText += ' (Hoje)';
                            if (count === 0) {
                                titleText += ': Sem compromissos';
                            } else if (count === 1) {
                                titleText += `: 1 compromisso (${tarefasList})`;
                            } else {
                                titleText += `: ${count} compromissos (${tarefasList})`;
                            }

                            const classes = ['heat-cell'];
                            if (count >= 4) {
                                classes.push('heat-cell-level-3');
                            } else if (count >= 2) {
                                classes.push('heat-cell-level-2');
                            } else if (count === 1) {
                                classes.push('heat-cell-level-1');
                            }
                            if (isToday) {
                                classes.push('ring-1', 'ring-lime-400/80');
                            }

                            return `<div class="${classes.join(' ')}" data-date="${d.data}" data-count="${count}" title="${escapeHtml(titleText)}"></div>`;
                        }).join('');
                    }
                }

                return res;
            }
        } catch (e) {
            console.error('Erro ao atualizar estatísticas:', e);
        }
        return null;
    }



    /* ========================================================
     * FEEDBACK VISUAL: TOASTS (Apple Pill Style)
     * ======================================================== */
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        const bgColors = {
            success: 'bg-zinc-900 border-lime-400/40 text-lime-400',
            error: 'bg-zinc-900 border-red-500/40 text-red-400',
            info: 'bg-zinc-900 border-white/20 text-white'
        };

        toast.className = `fixed bottom-20 md:bottom-6 right-5 z-50 px-4 py-2.5 rounded-full shadow-2xl text-xs font-bold flex items-center gap-2 border backdrop-blur-xl transform transition-all duration-200 ${bgColors[type] || bgColors.info}`;
        toast.innerHTML = `<span>${escapeHtml(message)}</span>`;

        document.body.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('opacity-0', 'translate-y-2');
            setTimeout(() => toast.remove(), 250);
        }, 3200);
    }

    function filterTasksByMission(missionId) {
        loadSection('tarefas');
        KanbanView.render({ missao_id: missionId });
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.innerText = text;
        return div.innerHTML;
    }

    return {
        init,
        loadSection,
        loadTaskView,
        reloadCurrentView,
        updateStats,
        showToast,
        filterTasksByMission,
        openMissionModal: () => {
            const title = prompt('Título da Missão Estratégica:');
            if (title) {
                API.createMissao({ titulo: title }).then(() => {
                    showToast('Missão criada!', 'success');
                    renderMissions();
                }).catch(e => showToast(e.message, 'error'));
            }
        },
        openNoteModal: () => {
            const title = prompt('Título da Nota:');
            if (title) {
                const content = prompt('Conteúdo / Referência:');
                API.createNota({ titulo: title, conteudo: content }).then(() => {
                    showToast('Nota registrada!', 'success');
                    renderNotes();
                }).catch(e => showToast(e.message, 'error'));
            }
        },
        openSettingsModal,
        closeSettingsModal,
        getModes: () => modesList,
        getActiveMode: () => activeMode,
        getModeName,
        getModeIcon,
        getModeBadgeHtml,
        selectMode,
        openCreateModeModal,
        openEditModeModal,
        closeCreateModeModal
    };
})();

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
