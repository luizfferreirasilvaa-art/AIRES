/**
 * AIRES - Aplicação Principal e Orquestrador de Interface
 * Estética Pierre / High-End Obsidian Glassmorphism
 */

const App = (() => {
    let currentSection = 'inicio';
    let currentTaskView = 'kanban';
    let alertInterval = null;

    function init() {
        initNavigation();
        initUserMenu();
        initTaskViewSwitcher();
        initFastCapture();
        initAlertChecker();
        
        // Inicializar submódulos
        ConflictDialog.init();
        TaskModal.init();
        KanbanView.init(document.getElementById('view-kanban-container'));
        ListView.init(document.getElementById('view-lista-container'));
        CalendarView.init(document.getElementById('view-calendario-container'));

        // Carregar visão inicial
        loadSection('inicio');
        updateStats();

        // Checagem imediata de alertas
        checkAlerts();
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
            CalendarView.render();
        }
    }

    function getActiveFilters() {
        const busca = document.getElementById('search-task-input')?.value.trim() || '';
        const prioridade = document.getElementById('filter-priority-select')?.value || '';
        const filters = {};
        if (busca) filters.busca = busca;
        if (prioridade) filters.prioridade = prioridade;
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
                    status: 'planejamento'
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
                        <p class="text-zinc-500 text-xs">Nenhuma anotação Zettelkasten registrada.</p>
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
            if (res.sucesso) {
                const u = res.usuario;
                const m = res.metricas;

                // ---- Streak (all locations) ----
                document.querySelectorAll('.user-streak-display').forEach(el => el.innerText = `${u.streak_dias}d`);
                
                const streakEl = document.getElementById('stat-streak');
                if (streakEl) streakEl.innerText = `${u.streak_dias} dias`;

                const streakDashEl = document.getElementById('stat-streak-dash');
                if (streakDashEl) streakDashEl.innerText = `${u.streak_dias}d`;

                // ---- XP (all locations) ----
                const xpEl = document.getElementById('stat-xp');
                if (xpEl) xpEl.innerText = `${u.xp} XP`;

                const xpDashEl = document.getElementById('stat-xp-dash');
                if (xpDashEl) xpDashEl.innerText = `${u.xp}`;

                // Header XP pill
                document.querySelectorAll('.user-xp-display').forEach(el => el.innerText = `${u.xp} XP`);

                // ---- Level progress bar ----
                const level = Math.floor(u.xp / 100) + 1;
                const xpInLevel = u.xp % 100;
                const xpToNext = 100 - xpInLevel;
                const levelProgress = xpInLevel;
                const levelBar = document.getElementById('level-progress-bar');
                if (levelBar) levelBar.style.width = `${levelProgress}%`;
                const levelText = document.getElementById('level-text');
                if (levelText) levelText.innerText = `Nível ${level} • ${xpToNext} XP para o Nível ${level + 1}`;

                // ---- Dashboard stats ----
                const concluidasEl = document.getElementById('stat-concluidas');
                if (concluidasEl) concluidasEl.innerText = m.semana_concluidas || m.concluidas;

                const focoEl = document.getElementById('stat-foco');
                if (focoEl) focoEl.innerText = `${m.taxa_foco}%`;

                // ---- Hero Cards (Início) ----
                const heroActive = document.getElementById('hero-active-count');
                if (heroActive) heroActive.innerText = `${(m.planejamento || 0) + m.a_fazer + m.em_andamento} Tarefas`;

                const heroFocus = document.getElementById('hero-focus-rate');
                if (heroFocus) heroFocus.innerText = `${m.taxa_foco}% Foco`;

                const heroConcluded = document.getElementById('hero-concluded-today');
                if (heroConcluded) heroConcluded.innerText = `${m.hoje_concluidas || 0} concluídas hoje`;

                return res;
            }
        } catch (e) {
            console.error(e);
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
        closeSettingsModal
    };
})();

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
