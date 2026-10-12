/**
 * AIRES - Painel de Detalhes da Tarefa (Modal / Drawer)
 */

const TaskModal = (() => {
    let currentTask = null;
    let pendingSubtasks = [];

    const elements = {};

    function init() {
        elements.container = document.getElementById('task-modal-container');
        elements.backdrop = document.getElementById('task-modal-backdrop');
        elements.drawer = document.getElementById('task-modal-drawer');
        elements.form = document.getElementById('task-form');

        elements.id = document.getElementById('task-id');
        elements.title = document.getElementById('task-title');
        elements.missao = document.getElementById('task-missao');
        elements.prioridade = document.getElementById('task-prioridade');
        elements.status = document.getElementById('task-status');
        elements.inbox = document.getElementById('task-inbox');

        elements.inicio = document.getElementById('task-inicio');
        elements.entrega = document.getElementById('task-entrega');

        elements.endereco = document.getElementById('task-endereco');
        elements.exigeVeiculo = document.getElementById('task-exige-veiculo');
        elements.veiculoContainer = document.getElementById('veiculo-tempo-container');
        elements.tempoViagem = document.getElementById('task-tempo-viagem');

        elements.antecedencia = document.getElementById('task-antecedencia');
        elements.alertaInfo = document.getElementById('alerta-calculado-info');

        elements.descricao = document.getElementById('task-descricao');
        elements.checklistContainer = document.getElementById('checklist-items');
        elements.checkProgress = document.getElementById('checklist-progress-bar');
        elements.checkText = document.getElementById('checklist-progress-text');
        elements.newSubtaskInput = document.getElementById('new-subtask-input');
        elements.btnSubtaskAdd = document.getElementById('btn-add-subtask');

        elements.btnSave = document.getElementById('btn-save-task');
        elements.btnDelete = document.getElementById('btn-delete-task');
        elements.btnClose = document.getElementById('btn-close-task-modal');

        setupEvents();
    }

    function setupEvents() {
        elements.btnClose?.addEventListener('click', close);
        elements.backdrop?.addEventListener('click', close);

        elements.exigeVeiculo?.addEventListener('change', (e) => {
            if (e.target.checked) {
                elements.veiculoContainer.classList.remove('hidden');
                if (!elements.tempoViagem.value || elements.tempoViagem.value == 0) {
                    elements.tempoViagem.value = 30;
                }
            } else {
                elements.veiculoContainer.classList.add('hidden');
            }
            recalcularAlertaVisual();
        });

        elements.inicio?.addEventListener('input', recalcularAlertaVisual);
        elements.tempoViagem?.addEventListener('input', recalcularAlertaVisual);
        elements.antecedencia?.addEventListener('change', recalcularAlertaVisual);

        const addSubHandler = () => {
            let val = elements.newSubtaskInput.value.trim();
            if (!val) {
                const count = (currentTask && currentTask.id) 
                    ? (elements.checklistContainer.querySelectorAll('.subtask-row').length + 1)
                    : (pendingSubtasks.length + 1);
                val = `Subtarefa ${count}`;
            }

            if (currentTask && currentTask.id) {
                API.createSubtarefa(currentTask.id, val).then(() => {
                    elements.newSubtaskInput.value = '';
                    elements.newSubtaskInput.focus();
                    refreshTask(currentTask.id);
                    App.reloadCurrentView();
                }).catch(err => App.showToast(err.message, 'error'));
            } else {
                pendingSubtasks.push({ titulo: val, concluida: false });
                elements.newSubtaskInput.value = '';
                elements.newSubtaskInput.focus();
                renderPendingSubtasks();
            }
        };

        elements.btnSubtaskAdd?.addEventListener('click', addSubHandler);
        elements.newSubtaskInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addSubHandler();
            }
        });

        elements.form?.addEventListener('submit', (e) => {
            e.preventDefault();
            saveTask();
        });

        elements.btnDelete?.addEventListener('click', () => {
            if (!currentTask || !currentTask.id) return;
            if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
                API.deleteTarefa(currentTask.id).then(() => {
                    App.showToast('Tarefa excluída', 'success');
                    close();
                    App.reloadCurrentView();
                }).catch(err => App.showToast(err.message, 'error'));
            }
        });
    }

    function recalcularAlertaVisual() {
        const inicioStr = elements.inicio.value;
        const exige = elements.exigeVeiculo.checked;
        const viagem = exige ? (parseInt(elements.tempoViagem.value) || 0) : 0;
        const aviso = parseInt(elements.antecedencia.value) || 0;

        if (!inicioStr || (viagem === 0 && aviso === 0)) {
            elements.alertaInfo.innerHTML = `
                <div class="text-[11px] text-zinc-500 italic mt-1">
                    Defina início e configure deslocamento ou aviso para calcular a saída.
                </div>
            `;
            return;
        }

        const dtInicio = new Date(inicioStr);
        if (isNaN(dtInicio.getTime())) return;

        const dtSaida = new Date(dtInicio.getTime() - viagem * 60000);
        const dtAlerta = new Date(dtSaida.getTime() - aviso * 60000);

        const formatTime = (d) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const formatDate = (d) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

        elements.alertaInfo.innerHTML = `
            <div class="p-3 bg-zinc-900 border border-orange-500/30 rounded-2xl space-y-1.5 text-xs text-zinc-200 mt-2">
                <div class="flex items-center justify-between font-bold text-orange-400">
                    <span class="flex items-center gap-1.5">
                        ${viagem > 0 ? `🚗 Horário de Saída: ${formatTime(dtSaida)}` : 'Início no Local'}
                    </span>
                    <span class="text-[10px] text-zinc-500">${formatDate(dtSaida)}</span>
                </div>
                <div class="flex items-center gap-1 text-[11px] text-zinc-400">
                    <span>🔔 Notificação soará às: <strong class="text-white">${formatTime(dtAlerta)}</strong></span>
                    ${viagem > 0 ? `(${viagem}m viagem + ${aviso}m aviso)` : `(${aviso}m aviso)`}
                </div>
            </div>
        `;
    }

    function renderPendingSubtasks() {
        elements.checklistContainer.innerHTML = '';
        if (pendingSubtasks.length === 0) {
            elements.checklistContainer.innerHTML = '<p class="text-xs text-zinc-600 italic">Nenhum item adicionado.</p>';
            updateProgress(0, 0);
            return;
        }

        pendingSubtasks.forEach((item, index) => {
            const row = document.createElement('div');
            row.className = 'subtask-row flex items-center justify-between gap-2 p-2 rounded-xl bg-zinc-900 text-xs border border-white/5';
            row.innerHTML = `
                <span class="w-4 h-4 rounded-full border border-zinc-700 flex items-center justify-center shrink-0 text-[10px] text-zinc-500">•</span>
                <input type="text" class="flex-1 bg-transparent text-zinc-200 focus:text-white focus:outline-none border-b border-transparent focus:border-lime-400 text-xs py-0.5" value="${escapeHtml(item.titulo)}">
                <button type="button" class="text-zinc-500 hover:text-red-400 p-1 text-xs transition-colors" data-idx="${index}" title="Excluir">✕</button>
            `;
            const titleInput = row.querySelector('input');
            titleInput.addEventListener('change', () => {
                pendingSubtasks[index].titulo = titleInput.value.trim() || item.titulo;
            });
            titleInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    titleInput.blur();
                }
            });
            row.querySelector('button').addEventListener('click', () => {
                pendingSubtasks.splice(index, 1);
                renderPendingSubtasks();
            });
            elements.checklistContainer.appendChild(row);
        });

        updateProgress(0, pendingSubtasks.length);
    }

    function updateProgress(concluidas, total) {
        const pct = total > 0 ? Math.round((concluidas / total) * 100) : 0;
        elements.checkProgress.style.width = `${pct}%`;
        elements.checkText.innerText = `${concluidas}/${total} (${pct}%)`;
    }

    async function refreshTask(id) {
        try {
            const res = await API.getTarefa(id);
            if (res.sucesso) {
                renderSubtasks(res.tarefa.subtarefas || []);
            }
        } catch (err) {
            console.error(err);
        }
    }

    function renderSubtasks(subtasks) {
        elements.checklistContainer.innerHTML = '';
        const total = subtasks.length;
        const done = subtasks.filter(s => s.concluida == 1).length;
        updateProgress(done, total);

        if (total === 0) {
            elements.checklistContainer.innerHTML = '<p class="text-xs text-zinc-600 italic">Nenhum item no checklist.</p>';
            return;
        }

        subtasks.forEach(s => {
            const isDone = s.concluida == 1;
            const row = document.createElement('div');
            row.className = 'subtask-row flex items-center justify-between gap-2 p-2 rounded-xl bg-zinc-900 border border-white/5';
            row.innerHTML = `
                <label class="flex items-center cursor-pointer select-none shrink-0">
                    <input type="checkbox" ${isDone ? 'checked' : ''} class="w-4 h-4 rounded text-lime-400 focus:ring-lime-400 bg-black border-zinc-700 cursor-pointer">
                </label>
                <input type="text" class="flex-1 bg-transparent ${isDone ? 'line-through text-zinc-500' : 'text-zinc-200'} focus:text-white focus:outline-none border-b border-transparent focus:border-lime-400 text-xs py-0.5" value="${escapeHtml(s.titulo)}">
                <button type="button" class="text-zinc-500 hover:text-red-400 p-1 text-xs transition-colors" title="Excluir">✕</button>
            `;

            row.querySelector('input[type="checkbox"]').addEventListener('change', () => {
                API.toggleSubtarefa(s.id).then(res => {
                    refreshTask(currentTask.id);
                    App.reloadCurrentView();
                }).catch(err => App.showToast(err.message, 'error'));
            });

            const titleInput = row.querySelector('input[type="text"]');
            titleInput.addEventListener('change', () => {
                const newTitle = titleInput.value.trim();
                if (newTitle && newTitle !== s.titulo) {
                    API.updateSubtarefa(s.id, newTitle).then(() => {
                        App.showToast('Subtarefa atualizada', 'success');
                    }).catch(err => App.showToast(err.message, 'error'));
                }
            });
            titleInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    titleInput.blur();
                }
            });

            row.querySelector('button').addEventListener('click', () => {
                API.deleteSubtarefa(s.id).then(() => {
                    refreshTask(currentTask.id);
                    App.reloadCurrentView();
                }).catch(err => App.showToast(err.message, 'error'));
            });

            elements.checklistContainer.appendChild(row);
        });
    }

    function formatForInput(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        const pad = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    async function open(task = null, defaultValues = {}) {
        currentTask = task;
        pendingSubtasks = [];

        await populateMissions();

        if (task) {
            elements.id.value = task.id;
            elements.title.value = task.titulo || '';
            elements.missao.value = task.missao_id || '';
            elements.prioridade.value = task.prioridade || 'media';
            elements.status.value = task.status || 'planejamento';
            elements.inbox.checked = task.inbox ? true : false;

            elements.inicio.value = formatForInput(task.data_inicio);
            elements.entrega.value = formatForInput(task.data_entrega);

            elements.endereco.value = task.endereco_local || '';
            elements.exigeVeiculo.checked = !!task.exige_veiculo;
            elements.tempoViagem.value = task.tempo_viagem_minutos || 0;
            if (task.exige_veiculo) {
                elements.veiculoContainer.classList.remove('hidden');
            } else {
                elements.veiculoContainer.classList.add('hidden');
            }

            elements.antecedencia.value = task.antecedencia_aviso_minutos || 0;
            elements.descricao.value = task.descricao || '';

            elements.btnDelete.classList.remove('hidden');
            document.getElementById('modal-heading').innerText = 'Editar Ação';

            refreshTask(task.id);
        } else {
            elements.form.reset();
            elements.id.value = '';
            elements.missao.value = defaultValues.missao_id || '';
            elements.status.value = defaultValues.status || 'planejamento';
            elements.prioridade.value = defaultValues.prioridade || 'media';
            elements.inbox.checked = defaultValues.inbox || false;
            
            if (defaultValues.data_inicio) {
                elements.inicio.value = formatForInput(defaultValues.data_inicio);
            }
            if (defaultValues.data_entrega) {
                elements.entrega.value = formatForInput(defaultValues.data_entrega);
            }

            elements.veiculoContainer.classList.add('hidden');
            elements.btnDelete.classList.add('hidden');
            document.getElementById('modal-heading').innerText = 'Nova Ação';

            renderPendingSubtasks();
        }

        recalcularAlertaVisual();

        elements.container.classList.remove('hidden');
        setTimeout(() => {
            elements.drawer.classList.add('drawer-active');
            elements.title.focus();
        }, 10);
    }

    function close() {
        elements.drawer.classList.remove('drawer-active');
        setTimeout(() => {
            elements.container.classList.add('hidden');
            currentTask = null;
        }, 200);
    }

    async function populateMissions() {
        try {
            const res = await API.getMissoes();
            elements.missao.innerHTML = '<option value="">(Sem Missão Vinculada)</option>';
            if (res.sucesso && res.missoes) {
                res.missoes.forEach(m => {
                    const opt = document.createElement('option');
                    opt.value = m.id;
                    opt.innerText = m.titulo;
                    elements.missao.appendChild(opt);
                });
            }
        } catch (e) {
            console.error(e);
        }
    }

    async function saveTask(overrideConflict = false) {
        const payload = {
            titulo: elements.title.value.trim(),
            missao_id: elements.missao.value ? parseInt(elements.missao.value) : null,
            prioridade: elements.prioridade.value,
            status: elements.status.value,
            inbox: elements.inbox.checked,
            data_inicio: elements.inicio.value ? elements.inicio.value.replace('T', ' ') + ':00' : null,
            data_entrega: elements.entrega.value ? elements.entrega.value.replace('T', ' ') + ':00' : null,
            endereco_local: elements.endereco.value.trim(),
            exige_veiculo: elements.exigeVeiculo.checked,
            tempo_viagem_minutos: elements.exigeVeiculo.checked ? (parseInt(elements.tempoViagem.value) || 0) : 0,
            antecedencia_aviso_minutos: parseInt(elements.antecedencia.value) || 0,
            descricao: elements.descricao.value,
            confirmar_conflito: overrideConflict
        };

        if (!currentTask || !currentTask.id) {
            payload.subtarefas = pendingSubtasks.map(s => s.titulo);
        }

        try {
            if (currentTask && currentTask.id) {
                await API.updateTarefa(currentTask.id, payload);
                App.showToast('Ação atualizada com sucesso!', 'success');
            } else {
                await API.createTarefa(payload);
                App.showToast('Ação criada com sucesso!', 'success');
            }

            close();
            App.reloadCurrentView();
        } catch (err) {
            if (err.status === 409 && err.data && err.data.codigo === 'CONFLITO_AGENDA') {
                ConflictDialog.show(
                    err.data.conflito,
                    () => saveTask(true),
                    () => elements.inicio.focus()
                );
            } else {
                App.showToast(err.message, 'error');
            }
        }
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.innerText = text;
        return div.innerHTML;
    }

    return { init, open, close };
})();
