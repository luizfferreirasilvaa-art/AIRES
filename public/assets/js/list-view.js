/**
 * AIRES - Modo Lista Compacta (Velocidade)
 * Visual Pierre / Dark Glassmorphism
 */

const ListView = (() => {
    let containerEl = null;

    function init(container) {
        containerEl = container;
    }

    async function render(filters = {}) {
        if (!containerEl) return;
        containerEl.innerHTML = `
            <div class="flex items-center justify-center p-16 text-zinc-500 text-xs">
                <svg class="w-5 h-5 animate-spin mr-2 text-lime-400" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Carregando lista...
            </div>
        `;

        try {
            const res = await API.getTarefas(filters);
            const tasks = res.sucesso ? res.tarefas : [];
            renderList(tasks);
        } catch (err) {
            containerEl.innerHTML = `<div class="p-6 text-center text-red-400">Erro: ${err.message}</div>`;
        }
    }

    function renderList(tasks) {
        if (tasks.length === 0) {
            containerEl.innerHTML = `
                <div class="p-12 text-center border border-dashed border-white/10 rounded-3xl">
                    <p class="text-zinc-500 text-xs">Nenhuma ação cadastrada.</p>
                    <button type="button" class="mt-3 px-5 py-2.5 bg-white text-zinc-950 font-bold text-xs rounded-full shadow-lg" onclick="TaskModal.open()">
                        + Criar Tarefa
                    </button>
                </div>
            `;
            return;
        }

        const priorityStyles = {
            critica: 'text-red-400 bg-red-500/10 border border-red-500/30',
            alta: 'text-orange-400 bg-orange-500/10 border border-orange-500/30',
            media: 'text-cyan-400 bg-cyan-500/10 border border-cyan-500/30',
            baixa: 'text-zinc-400 bg-zinc-800 border border-white/5'
        };

        const html = `
            <div class="space-y-2 pb-24 md:pb-8">
                ${tasks.map(t => {
                    const isDone = t.status === 'feito';
                    const dateFormatted = t.data_entrega ? new Date(t.data_entrega).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : null;

                    return `
                        <div class="task-list-row flex items-center justify-between p-3.5 bg-[#141418] hover:bg-[#191920] border border-white/[0.06] hover:border-white/20 rounded-2xl transition-all gap-3 group cursor-pointer" onclick="TaskModal.open(window._cachedTasksMap[${t.id}])">
                            
                            <!-- Toggle Checkbox (Circular Neon) -->
                            <div class="flex items-center gap-3.5 min-w-0 flex-1">
                                <button type="button" class="btn-fast-check w-6 h-6 rounded-full border flex items-center justify-center transition-all ${isDone ? 'bg-lime-400 border-lime-400 text-black shadow-sm shadow-lime-400/30' : 'border-zinc-700 hover:border-lime-400'}" data-id="${t.id}" data-current="${t.status}" onclick="event.stopPropagation()">
                                    ${isDone ? '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>' : ''}
                                </button>

                                <div class="min-w-0 flex-1">
                                    <div class="flex items-center gap-2">
                                        <h4 class="text-xs md:text-sm font-bold truncate ${isDone ? 'line-through text-zinc-500' : 'text-zinc-100'}">
                                            ${escapeHtml(t.titulo)}
                                        </h4>
                                        <span class="text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${priorityStyles[t.prioridade]}">
                                            ${t.prioridade}
                                        </span>
                                        ${t.vencida ? '<span class="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">Atrasada</span>' : ''}
                                    </div>

                                    <div class="flex items-center gap-3 text-[11px] text-zinc-500 mt-0.5">
                                        ${t.missao_titulo ? `<span class="text-purple-400 font-medium">🎯 ${escapeHtml(t.missao_titulo)}</span>` : ''}
                                        ${dateFormatted ? `<span>📅 ${dateFormatted}</span>` : ''}
                                        ${t.exige_veiculo && t.tempo_viagem_minutos > 0 ? `<span class="text-orange-400">🚗 ${t.tempo_viagem_minutos} min</span>` : ''}
                                        ${t.checklist_total > 0 ? `<span class="text-lime-400">☑️ ${t.checklist_concluido}/${t.checklist_total}</span>` : ''}
                                    </div>
                                </div>
                            </div>

                            <!-- Right Chevron (like Pierre list items) -->
                            <div class="text-zinc-600 group-hover:text-zinc-300 transition-colors pr-1 font-bold">
                                ›
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        window._cachedTasksMap = {};
        tasks.forEach(t => { window._cachedTasksMap[t.id] = t; });

        containerEl.innerHTML = html;

        // Setup fast toggle
        containerEl.querySelectorAll('.btn-fast-check').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                const current = btn.dataset.current;
                const nextStatus = current === 'feito' ? 'a_fazer' : 'feito';

                try {
                    await API.updateTarefaStatus(id, nextStatus);
                    App.showToast(nextStatus === 'feito' ? '🎉 Concluída (+15 XP)!' : 'Reaberta', 'success');
                    render();
                    App.updateStats();
                } catch (err) {
                    App.showToast(err.message, 'error');
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
