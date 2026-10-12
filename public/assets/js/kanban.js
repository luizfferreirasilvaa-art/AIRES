/**
 * AIRES - Modo Kanban (Fluxo de Execução)
 * Visual Pierre / Obsidian Glassmorphism Dark
 */

const KanbanView = (() => {
    let containerEl = null;
    let currentMobileColumn = 'planejamento';
    let draggedTaskId = null;

    const COLUMNS = [
        { id: 'planejamento', label: 'Planejamento', color: 'purple', dot: 'bg-purple-400', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
        { id: 'a_fazer', label: 'A Fazer', color: 'orange', dot: 'bg-orange-400', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
        { id: 'fazendo', label: 'Fazendo', color: 'cyan', dot: 'bg-cyan-400', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
        { id: 'feito', label: 'Feito', color: 'lime', dot: 'bg-lime-400', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' }
    ];

    function init(container) {
        containerEl = container;
    }

    async function render(filters = {}) {
        if (!containerEl) return;
        containerEl.innerHTML = `
            <div class="flex items-center justify-center p-16 text-zinc-500 text-xs">
                <svg class="w-5 h-5 animate-spin mr-2 text-lime-400" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Carregando fluxo de execução...
            </div>
        `;

        try {
            const res = await API.getTarefas(filters);
            const tasks = res.sucesso ? res.tarefas : [];
            renderBoard(tasks);
        } catch (err) {
            containerEl.innerHTML = `<div class="p-6 text-center text-red-400">Erro: ${err.message}</div>`;
        }
    }

    function renderBoard(tasks) {
        const grouped = {
            planejamento: tasks.filter(t => t.status === 'planejamento'),
            a_fazer: tasks.filter(t => t.status === 'a_fazer'),
            fazendo: tasks.filter(t => t.status === 'fazendo'),
            feito: tasks.filter(t => t.status === 'feito')
        };

        // Mobile Switcher + Columns
        containerEl.innerHTML = `
            <!-- Mobile Column Switcher (Pill style like Pierre) -->
            <div class="md:hidden flex p-1 mb-4 bg-zinc-900/90 rounded-full border border-white/5 gap-1">
                ${COLUMNS.map(col => `
                    <button type="button" data-col="${col.id}" class="kanban-tab-btn flex-1 py-2 px-2 text-[11px] font-bold rounded-full transition-all flex items-center justify-center gap-1 ${currentMobileColumn === col.id ? 'glass-pill-active' : 'text-zinc-400 hover:text-white'}">
                        <span>${col.label}</span>
                        <span class="px-1.5 py-0.2 text-[9px] rounded-full ${currentMobileColumn === col.id ? 'bg-black text-white' : 'bg-white/10 text-zinc-300'}">
                            ${grouped[col.id].length}
                        </span>
                    </button>
                `).join('')}
            </div>

            <!-- Columns Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 pb-24 md:pb-8">
                ${COLUMNS.map(col => `
                    <div id="col-${col.id}" class="kanban-col-wrapper flex flex-col glass-card rounded-3xl p-4 min-h-[520px] transition-all ${currentMobileColumn === col.id ? 'block' : 'hidden md:flex'}" data-column-id="${col.id}">
                        <!-- Header -->
                        <div class="flex items-center justify-between px-2 py-1 mb-3.5">
                            <div class="flex items-center gap-2">
                                <span class="w-2.5 h-2.5 rounded-full ${col.dot} shadow-sm"></span>
                                <h3 class="font-extrabold text-xs uppercase tracking-wider text-zinc-200">${col.label}</h3>
                                <span class="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-zinc-400 border border-white/5">
                                    ${grouped[col.id].length}
                                </span>
                            </div>
                            <button type="button" class="btn-quick-add w-7 h-7 rounded-full bg-white/5 hover:bg-white text-zinc-400 hover:text-black flex items-center justify-center transition-all" data-col="${col.id}" title="Nova tarefa">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>
                            </button>
                        </div>

                        <!-- Cards Dropzone -->
                        <div class="kanban-dropzone flex-1 space-y-2.5 min-h-[350px]" data-status="${col.id}">
                            ${grouped[col.id].length === 0 ? `
                                <div class="empty-dropzone flex flex-col items-center justify-center p-10 text-center border border-dashed border-white/5 rounded-2xl text-zinc-600 text-xs">
                                    <svg class="w-7 h-7 mb-2 opacity-40 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="${col.icon}"></path></svg>
                                    Nenhuma ação aqui
                                </div>
                            ` : grouped[col.id].map(task => renderTaskCard(task)).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        setupKanbanInteractions(tasks);
    }

    function renderTaskCard(task) {
        const priorityStyles = {
            critica: 'bg-red-500/15 text-red-400 border-red-500/30',
            alta: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
            media: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
            baixa: 'bg-zinc-800 text-zinc-400 border-white/5'
        };

        const priorityLabels = {
            critica: 'Crítica',
            alta: 'Alta',
            media: 'Média',
            baixa: 'Baixa'
        };

        // Formatação de data
        let dateBadge = '';
        if (task.data_entrega) {
            const dt = new Date(task.data_entrega);
            const timeStr = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const dateStr = dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            dateBadge = `
                <div class="flex items-center gap-1.5 text-[11px] ${task.vencida ? 'text-red-400 font-bold' : 'text-zinc-400'}">
                    <svg class="w-3 h-3 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    <span>${dateStr} às ${timeStr}</span>
                    ${task.vencida ? '<span class="px-1.5 py-0.2 bg-red-500/20 text-red-400 rounded text-[9px] uppercase font-bold tracking-wider">Atrasada</span>' : ''}
                </div>
            `;
        }

        // Subtarefas / Checklist com barra neon
        let checklistBadge = '';
        if (task.checklist_total > 0) {
            checklistBadge = `
                <div class="pt-2 mt-2 border-t border-white/[0.04] flex items-center justify-between text-[11px] text-zinc-400">
                    <span class="flex items-center gap-1.5 text-zinc-300">
                        <span class="w-1.5 h-1.5 rounded-full bg-lime-400"></span>
                        ${task.checklist_concluido}/${task.checklist_total}
                    </span>
                    <div class="w-20 bg-zinc-800 rounded-full h-1 overflow-hidden">
                        <div class="bg-lime-400 h-1 rounded-full transition-all" style="width: ${task.checklist_percentual}%"></div>
                    </div>
                </div>
            `;
        }

        // Logística / Deslocamento
        let travelBadge = '';
        if (task.exige_veiculo && task.tempo_viagem_minutos > 0) {
            travelBadge = `
                <span class="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-300 border border-orange-500/20 font-semibold">
                    🚗 ${task.tempo_viagem_minutos}m
                </span>
            `;
        }

        return `
            <div class="kanban-card group cursor-grab active:cursor-grabbing p-4 bg-[#141418] hover:bg-[#181820] rounded-2xl border border-white/[0.06] hover:border-white/20 shadow-sm transition-all select-none" draggable="true" data-id="${task.id}">
                <!-- Top Pills -->
                <div class="flex items-center justify-between gap-1.5 mb-2.5">
                    <div class="flex items-center gap-1.5 flex-wrap">
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full border ${priorityStyles[task.prioridade]}">
                            ${priorityLabels[task.prioridade]}
                        </span>
                        ${task.missao_titulo ? `
                            <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 max-w-[120px] truncate">
                                ${escapeHtml(task.missao_titulo)}
                            </span>
                        ` : ''}
                    </div>
                    ${travelBadge}
                </div>

                <!-- Title -->
                <h4 class="font-bold text-xs md:text-sm text-zinc-100 line-clamp-2 mb-2 group-hover:text-white transition-colors">
                    ${escapeHtml(task.titulo)}
                </h4>

                <!-- Meta & Checklist -->
                <div class="space-y-1">
                    ${dateBadge}
                    ${checklistBadge}
                </div>
            </div>
        `;
    }

    function setupKanbanInteractions(tasks) {
        // Mobile Tab
        containerEl.querySelectorAll('.kanban-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                currentMobileColumn = btn.dataset.col;
                renderBoard(tasks);
            });
        });

        // Quick add
        containerEl.querySelectorAll('.btn-quick-add').forEach(btn => {
            btn.addEventListener('click', () => {
                TaskModal.open(null, { status: btn.dataset.col });
            });
        });

        // Click card to open modal
        containerEl.querySelectorAll('.kanban-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (card.classList.contains('dragging')) return;
                const taskId = card.dataset.id;
                const task = tasks.find(t => t.id == taskId);
                if (task) {
                    TaskModal.open(task);
                }
            });
        });

        setupDragAndDrop(tasks);
    }

    function setupDragAndDrop(tasks) {
        const cards = containerEl.querySelectorAll('.kanban-card');
        const dropzones = containerEl.querySelectorAll('.kanban-dropzone');

        cards.forEach(card => {
            card.addEventListener('dragstart', (e) => {
                draggedTaskId = card.dataset.id;
                card.classList.add('dragging');
                e.dataTransfer.setData('text/plain', draggedTaskId);
                e.dataTransfer.effectAllowed = 'move';
            });

            card.addEventListener('dragend', () => {
                card.classList.remove('dragging');
                draggedTaskId = null;
                dropzones.forEach(dz => dz.classList.remove('drag-over'));
            });
        });

        dropzones.forEach(dz => {
            dz.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                dz.classList.add('drag-over');
            });

            dz.addEventListener('dragleave', (e) => {
                if (!dz.contains(e.relatedTarget)) {
                    dz.classList.remove('drag-over');
                }
            });

            dz.addEventListener('drop', async (e) => {
                e.preventDefault();
                dz.classList.remove('drag-over');

                const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
                const newStatus = dz.dataset.status;

                if (!taskId || !newStatus) return;

                const task = tasks.find(t => t.id == taskId);
                if (task && task.status !== newStatus) {
                    try {
                        await API.updateTarefaStatus(taskId, newStatus, 0);
                        App.showToast(`Ação movida para "${COLUMNS.find(c => c.id === newStatus).label}"`, 'success');
                        render();
                    } catch (err) {
                        App.showToast(err.message, 'error');
                    }
                }
            });
        });
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.innerText = text;
        return div.innerHTML;
    }

    function setMobileColumn(colId) {
        currentMobileColumn = colId;
    }

    return { init, render, setMobileColumn };
})();
