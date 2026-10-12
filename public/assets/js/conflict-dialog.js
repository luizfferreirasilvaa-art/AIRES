/**
 * AIRES - Diálogo de Prevenção de Conflito de Agenda (Anti-Colisão)
 */

const ConflictDialog = (() => {
    let modalEl = null;
    let onConfirmCallback = null;
    let onCancelCallback = null;

    function init() {
        modalEl = document.getElementById('conflict-modal');
        if (!modalEl) return;

        document.getElementById('conflict-btn-cancel')?.addEventListener('click', () => {
            hide();
            if (onCancelCallback) onCancelCallback();
        });

        document.getElementById('conflict-btn-confirm')?.addEventListener('click', () => {
            hide();
            if (onConfirmCallback) onConfirmCallback();
        });
    }

    function show(conflictData, onConfirm, onCancel) {
        if (!modalEl) init();
        onConfirmCallback = onConfirm;
        onCancelCallback = onCancel;

        const infoEl = document.getElementById('conflict-details');
        if (infoEl && conflictData) {
            const inicio = conflictData.data_inicio ? new Date(conflictData.data_inicio).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'N/A';
            const entrega = conflictData.data_entrega ? new Date(conflictData.data_entrega).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'N/A';

            infoEl.innerHTML = `
                <div class="p-3.5 bg-orange-500/10 border border-orange-500/30 rounded-2xl text-left space-y-1">
                    <p class="text-[10px] font-black text-orange-400 uppercase tracking-widest">Ação Concorrente</p>
                    <p class="text-xs font-bold text-white">${escapeHtml(conflictData.titulo)}</p>
                    <p class="text-[11px] text-zinc-400">
                        ⏰ Intervalo: <span class="font-semibold text-zinc-200">${inicio}</span> até <span class="font-semibold text-zinc-200">${entrega}</span>
                    </p>
                </div>
            `;
        }

        modalEl.classList.remove('hidden');
        modalEl.classList.add('flex');
    }

    function hide() {
        if (!modalEl) return;
        modalEl.classList.add('hidden');
        modalEl.classList.remove('flex');
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.innerText = text;
        return div.innerHTML;
    }

    return { init, show, hide };
})();
