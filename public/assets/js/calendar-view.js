/**
 * AIRES - Modo Calendário Mensal (Capacidade & Planejamento)
 * Grade mensal com mapa de calor de densidade, chips de tarefas por prioridade,
 * barras contínuas e barra lateral de Backlog para agendamento rápido.
 * AIRES - Modo Calendário Mensal
 * Visual Pierre / Dark Bento Grid
 */

const CalendarView = (() => {
    let containerEl = null;
    let currentDate = new Date(); // Mês atual exibido
    let currentDate = new Date();

    function init(container) {
        containerEl = container;
    }

    async function render() {
        if (!containerEl) return;

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth(); // 0 a 11
        const monthQuery = `${year}-${String(month + 1).padStart(2, '0')}`;
        const month = currentDate.getMonth();

        containerEl.innerHTML = `
            <div class="flex items-center justify-center p-12 text-slate-400">
                <svg class="w-6 h-6 animate-spin mr-2" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Carregando calendário...
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
            containerEl.innerHTML = `<div class="p-6 text-center text-red-500">Erro: ${err.message}</div>`;
            containerEl.innerHTML = `<div class="p-6 text-center text-red-400">Erro: ${err.message}</div>`;
        }
    }

    function renderCalendarGrid(year, month, tasks, backlogTasks) {
        const monthNames = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];

        // Dias do mês
        const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0=Dom, 1=Seg...
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

        const priorityColors = {
            critica: 'bg-red-500 text-white',
            alta: 'bg-amber-500 text-white',
            media: 'bg-indigo-600 text-white',
            baixa: 'bg-slate-500 text-white'
        const priorityStyles = {
            critica: 'bg-red-500/20 text-red-300 border-red-500/30',
            alta: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
            media: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
            baixa: 'bg-zinc-800 text-zinc-300 border-white/5'
        };

        const html = `
            <div class="flex flex-col lg:flex-row gap-5 pb-20 md:pb-6">
                <!-- Main Calendar Area -->
                <div class="flex-1 bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-4 shadow-sm">
                    <!-- Calendar Header (Month Switcher) -->
            <div class="flex flex-col lg:flex-row gap-5 pb-24 md:pb-8">
                <!-- Main Calendar Bento Box -->
                <div class="flex-1 glass-card rounded-3xl p-5">
                    <!-- Header -->
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex items-center gap-2">
                            <h3 class="text-base md:text-lg font-bold text-slate-800 dark:text-slate-100">
                                ${monthNames[month]} <span class="text-indigo-600 dark:text-indigo-400 font-extrabold">${year}</span>
                        <div class="flex items-center gap-2.5">
                            <h3 class="text-base md:text-lg font-black text-white">
                                ${monthNames[month]} <span class="text-lime-400">${year}</span>
                            </h3>
                            <button type="button" id="btn-cal-today" class="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors">
                            <button type="button" id="btn-cal-today" class="px-3 py-1 text-xs font-bold rounded-full bg-white/10 text-zinc-300 hover:bg-white hover:text-black transition-all">
                                Hoje
                            </button>
                        </div>
                        <div class="flex items-center gap-1">
                            <button type="button" id="btn-cal-prev" class="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
                        <div class="flex items-center gap-1.5">
                            <button type="button" id="btn-cal-prev" class="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors">
                                ‹
                            </button>
                            <button type="button" id="btn-cal-next" class="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                            <button type="button" id="btn-cal-next" class="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors">
                                ›
                            </button>
                        </div>
                    </div>

                    <!-- Days of Week Header -->
                    <div class="grid grid-cols-7 text-center text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
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
                                <div class="min-h-[75px] md:min-h-[100px] p-1.5 rounded-xl border border-transparent opacity-30 text-xs font-medium text-slate-400">
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

                            // Mapa de calor (Heatmap)
                            let heatClass = 'heat-0';
                            if (taskCount >= 4) heatClass = 'heat-3';
                            else if (taskCount >= 2) heatClass = 'heat-2';
                            else if (taskCount === 1) heatClass = 'heat-1';
                            let heatBg = 'bg-[#121217]/70 border-white/[0.04]';
                            if (taskCount >= 3) heatBg = 'bg-lime-950/40 border-lime-500/30';
                            else if (taskCount >= 1) heatBg = 'bg-lime-950/20 border-lime-500/20';

                            return `
                                <div class="cal-day-cell min-h-[75px] md:min-h-[105px] p-1.5 rounded-xl border transition-all cursor-pointer ${isToday ? 'border-indigo-500 ring-1 ring-indigo-500/50' : 'border-slate-200/60 dark:border-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700'} ${heatClass} flex flex-col" data-date="${dateKey}">
                                    <div class="flex items-center justify-between mb-1">
                                        <span class="text-xs font-bold ${isToday ? 'w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center' : 'text-slate-700 dark:text-slate-300'}">
                                <div class="cal-day-cell min-h-[75px] md:min-h-[105px] p-2 rounded-2xl border transition-all cursor-pointer ${isToday ? 'ring-2 ring-lime-400 bg-zinc-900' : heatBg} hover:border-white/20 flex flex-col" data-date="${dateKey}">
                                    <div class="flex items-center justify-between mb-1.5">
                                        <span class="text-xs font-bold ${isToday ? 'w-5 h-5 rounded-full bg-lime-400 text-black flex items-center justify-center font-black' : 'text-zinc-300'}">
                                            ${dayNum}
                                        </span>
                                        ${taskCount > 0 ? `
                                            <span class="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                            <span class="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-white/10 text-lime-400">
                                                ${taskCount}
                                            </span>
                                        ` : ''}
                                    </div>

                                    <!-- Chips de Tarefas -->
                                    <div class="space-y-1 overflow-hidden flex-1">
                                        ${dayTasks.slice(0, 3).map(t => `
                                            <div class="cal-task-chip px-1.5 py-0.5 rounded text-[10px] font-semibold truncate ${priorityColors[t.prioridade]} shadow-2xs hover:opacity-90 transition-opacity" data-id="${t.id}" title="${escapeHtml(t.titulo)}">
                                            <div class="cal-task-chip px-2 py-0.5 rounded-full text-[9px] font-bold truncate border ${priorityStyles[t.prioridade]} shadow-2xs" data-id="${t.id}" title="${escapeHtml(t.titulo)}">
                                                ${t.status === 'feito' ? '✓ ' : ''}${escapeHtml(t.titulo)}
                                            </div>
                                        `).join('')}
                                        ${taskCount > 3 ? `
                                            <div class="text-[9px] font-bold text-slate-400 dark:text-slate-500 text-center">
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

                <!-- Backlog Sidebar / Tarefas Sem Data (Backlog & Agendamento Rápido) -->
                <div class="w-full lg:w-72 bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-4 shadow-sm flex flex-col">
                    <div class="flex items-center justify-between mb-3">
                        <div class="flex items-center gap-1.5">
                            <span class="w-2 h-2 rounded-full bg-amber-500"></span>
                            <h4 class="font-bold text-sm text-slate-800 dark:text-slate-100">Backlog (Sem Data)</h4>
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
                        <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            ${backlogTasks.length}
                        </span>
                    </div>
                    <p class="text-xs text-slate-400 dark:text-slate-500 mb-3">
                        Tarefas capturadas rapidamente prontas para serem agendadas.
                    </p>
                        <p class="text-[11px] text-zinc-500 mb-4">
                            Arraste ou clique para alocar em um dia livre da agenda.
                        </p>

                    <div class="space-y-2 flex-1 overflow-y-auto max-h-[380px] pr-1">
                        ${backlogTasks.length === 0 ? `
                            <p class="text-xs text-slate-400 italic text-center py-6">Nenhuma tarefa pendente no backlog.</p>
                        ` : backlogTasks.map(t => `
                            <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700/60 hover:border-indigo-400 transition-all cursor-pointer" onclick="TaskModal.open(window._cachedTasksMap[${t.id}])">
                                <div class="flex items-center justify-between gap-1 mb-1">
                                    <span class="text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase tracking-wider text-slate-500 border-slate-300 dark:border-slate-700">
                                        ${t.prioridade}
                                    </span>
                                    <span class="text-[10px] text-indigo-500 font-semibold hover:underline">
                                        Agendar →
                                    </span>
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
                                <h5 class="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                                    ${escapeHtml(t.titulo)}
                                </h5>
                            </div>
                        `).join('')}
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
                // Se clicou direto no chip de tarefa, não abre nova tarefa
                if (e.target.closest('.cal-task-chip')) return;
                const dateKey = cell.dataset.date;
                const defaultInicio = `${dateKey}T09:00`;
                const defaultEntrega = `${dateKey}T10:00`;
                TaskModal.open(null, {
                    data_inicio: defaultInicio,
                    data_entrega: defaultEntrega
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

