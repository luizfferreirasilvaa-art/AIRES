/**
 * AIRES - Modo Calendário Mensal (Capacidade & Planejamento)
 * Visual Pierre / Dark Bento Grid
 */

const CalendarView = (() => {
    let containerEl = null;
    let currentDate = new Date(); // Mês atual exibido

    function init(container) {
        containerEl = container;
    }

    async function render() {
        if (!containerEl) return;

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth(); // 0 a 11

        containerEl.innerHTML = `
            <div class="flex items-center justify-center p-16 text-zinc-500 text-xs">
                <svg class="w-5 h-5 animate-spin mr-2 text-lime-400" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Carregando visão de capacidade...
            </div>
        `;

        try {
            // Buscar todas as tarefas e tarefas sem data para o Backlog
            const [tasksRes, backlogRes] = await Promise.all([
                API.getTarefas(),
                API.getTarefas({ inbox: 1 })
            ]);

            const allTasks = tasksRes.sucesso ? tasksRes.tarefas : [];
            const backlogTasks = allTasks.filter(t => !t.data_inicio && !t.data_entrega);

            renderCalendarGrid(year, month, allTasks, backlogTasks);
        } catch (err) {
            containerEl.innerHTML = `<div class="p-6 text-center text-red-400">Erro: ${err.message}</div>`;
        }
    }

    function renderCalendarGrid(year, month, tasks, backlogTasks) {
        const monthNames = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];

        // Ajustar para segunda-feira como primeiro dia (0=Seg, 6=Dom)
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const startOffset = (firstDayOfMonth + 6) % 7;
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const prevMonthDays = new Date(year, month, 0).getDate();

        // Mapear tarefas por dia (formato YYYY-MM-DD)
        const tasksByDate = {};
        tasks.forEach(t => {
            if (t.data_inicio) {
                const dayKey = t.data_inicio.substring(0, 10);
                if (!tasksByDate[dayKey]) tasksByDate[dayKey] = [];
                tasksByDate[dayKey].push(t);
            } else if (t.data_entrega) {
                const dayKey = t.data_entrega.substring(0, 10);
                if (!tasksByDate[dayKey]) tasksByDate[dayKey] = [];
                tasksByDate[dayKey].push(t);
            }
        });

        const todayKey = new Date().toISOString().substring(0, 10);

        const priorityStyles = {
            critica: 'bg-red-500/20 text-red-300 border-red-500/30',
            alta: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
            media: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
            baixa: 'bg-zinc-800 text-zinc-300 border-white/5'
        };

        const html = `
            <div class="flex flex-col lg:flex-row gap-5 pb-24 md:pb-8">
                <!-- Main Calendar Bento Box -->
                <div class="flex-1 glass-card rounded-3xl p-5">
                    <!-- Header -->
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex items-center gap-2.5">
                            <h3 class="text-base md:text-lg font-black text-white">
                                ${monthNames[month]} <span class="text-lime-400">${year}</span>
                            </h3>
                            <button type="button" id="btn-cal-today" class="px-3 py-1 text-xs font-bold rounded-full bg-white/10 text-zinc-300 hover:bg-white hover:text-black transition-all">
                                Hoje
                            </button>
                        </div>
                        <div class="flex items-center gap-1.5">
                            <button type="button" id="btn-cal-prev" class="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors">
                                ‹
                            </button>
                            <button type="button" id="btn-cal-next" class="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors">
                                ›
                            </button>
                        </div>
                    </div>

                    <!-- Days Header -->
                    <div class="grid grid-cols-7 text-center text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest mb-2">
                        <div>Seg</div><div>Ter</div><div>Qua</div><div>Qui</div><div>Sex</div><div>Sáb</div><div>Dom</div>
                    </div>

                    <!-- Calendar Grid -->
                    <div class="grid grid-cols-7 gap-1 md:gap-1.5 select-none">
                        <!-- Previous Month Leading Days -->
                        ${Array.from({ length: startOffset }).map((_, i) => {
                            const d = prevMonthDays - startOffset + i + 1;
                            return `
                                <div class="min-h-[75px] md:min-h-[105px] p-2 rounded-2xl bg-zinc-900/20 opacity-20 text-xs font-medium text-zinc-500">
                                    <span>${d}</span>
                                </div>
                            `;
                        }).join('')}

                        <!-- Current Month Days -->
                        ${Array.from({ length: daysInMonth }).map((_, i) => {
                            const dayNum = i + 1;
                            const dayStr = String(dayNum).padStart(2, '0');
                            const monthStr = String(month + 1).padStart(2, '0');
                            const dateKey = `${year}-${monthStr}-${dayStr}`;
                            const isToday = dateKey === todayKey;

                            const dayTasks = tasksByDate[dateKey] || [];
                            const taskCount = dayTasks.length;

                            let heatBg = 'bg-[#121217]/70 border-white/[0.04]';
                            if (taskCount >= 3) heatBg = 'bg-lime-950/40 border-lime-500/30';
                            else if (taskCount >= 1) heatBg = 'bg-lime-950/20 border-lime-500/20';

                            return `
                                <div class="cal-day-cell min-h-[75px] md:min-h-[105px] p-2 rounded-2xl border transition-all cursor-pointer ${isToday ? 'ring-2 ring-lime-400 bg-zinc-900' : heatBg} hover:border-white/20 flex flex-col" data-date="${dateKey}">
                                    <div class="flex items-center justify-between mb-1.5">
                                        <span class="text-xs font-bold ${isToday ? 'w-5 h-5 rounded-full bg-lime-400 text-black flex items-center justify-center font-black' : 'text-zinc-300'}">
                                            ${dayNum}
                                        </span>
                                        ${taskCount > 0 ? `
                                            <span class="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-white/10 text-lime-400">
                                                ${taskCount}
                                            </span>
                                        ` : ''}
                                    </div>

                                    <!-- Chips de Tarefas -->
                                    <div class="space-y-1 overflow-hidden flex-1">
                                        ${dayTasks.slice(0, 3).map(t => `
                                            <div class="cal-task-chip px-2 py-0.5 rounded-full text-[9px] font-bold truncate border ${priorityStyles[t.prioridade] || priorityStyles.baixa} shadow-2xs" data-id="${t.id}" title="${escapeHtml(t.titulo)}">
                                                ${t.status === 'feito' ? '✓ ' : ''}${escapeHtml(t.titulo)}
                                            </div>
                                        `).join('')}
                                        ${taskCount > 3 ? `
                                            <div class="text-[9px] font-extrabold text-zinc-500 text-center">
                                                +${taskCount - 3} mais
                                            </div>
                                        ` : ''}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>

                <!-- Backlog Sidebar (Bento Box) -->
                <div class="w-full lg:w-72 glass-card rounded-3xl p-5 flex flex-col justify-between">
                    <div>
                        <div class="flex items-center justify-between mb-2">
                            <div class="flex items-center gap-2">
                                <span class="w-2 h-2 rounded-full bg-orange-400"></span>
                                <h4 class="font-bold text-xs uppercase tracking-wider text-zinc-200">Backlog (Sem Data)</h4>
                            </div>
                            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-zinc-300">
                                ${backlogTasks.length}
                            </span>
                        </div>
                        <p class="text-[11px] text-zinc-500 mb-4">
                            Arraste ou clique para alocar em um dia livre da agenda.
                        </p>

                        <div class="space-y-2 overflow-y-auto max-h-[380px] pr-1">
                            ${backlogTasks.length === 0 ? `
                                <p class="text-xs text-zinc-600 italic text-center py-8">Nenhum item pendente no backlog.</p>
                            ` : backlogTasks.map(t => `
                                <div class="p-3 rounded-2xl bg-[#141418] hover:bg-[#181820] border border-white/[0.05] hover:border-white/20 transition-all cursor-pointer" onclick="TaskModal.open(window._cachedTasksMap[${t.id}])">
                                    <div class="flex items-center justify-between gap-1 mb-1">
                                        <span class="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-zinc-400 uppercase">
                                            ${t.prioridade}
                                        </span>
                                        <span class="text-[10px] text-lime-400 font-bold hover:underline">
                                            Agendar →
                                        </span>
                                    </div>
                                    <h5 class="text-xs font-semibold text-zinc-200 truncate">
                                        ${escapeHtml(t.titulo)}
                                    </h5>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <button type="button" class="mt-4 w-full py-2.5 rounded-full bg-white/5 hover:bg-white text-zinc-300 hover:text-black text-xs font-bold transition-all" onclick="TaskModal.open(null, { inbox: true })">
                        + Capturar para Backlog
                    </button>
                </div>
            </div>
        `;

        containerEl.innerHTML = html;
        setupCalendarEvents(tasks);
    }

    function setupCalendarEvents(tasks) {
        // Mês Anterior / Próximo / Hoje
        document.getElementById('btn-cal-prev')?.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() - 1);
            render();
        });

        document.getElementById('btn-cal-next')?.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() + 1);
            render();
        });

        document.getElementById('btn-cal-today')?.addEventListener('click', () => {
            currentDate = new Date();
            render();
        });

        // Clique em um dia para criar tarefa pré-agendada
        containerEl.querySelectorAll('.cal-day-cell').forEach(cell => {
            cell.addEventListener('click', (e) => {
                if (e.target.closest('.cal-task-chip')) return;
                const dateKey = cell.dataset.date;
                TaskModal.open(null, {
                    data_inicio: `${dateKey}T09:00`,
                    data_entrega: `${dateKey}T10:00`
                });
            });
        });

        // Clique no chip da tarefa para editar
        containerEl.querySelectorAll('.cal-task-chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                e.stopPropagation();
                const taskId = chip.dataset.id;
                const task = tasks.find(t => t.id == taskId);
                if (task) {
                    TaskModal.open(task);
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

    return { init, render };
})();
