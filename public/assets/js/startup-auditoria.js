/**
 * AIRES - Módulo Startup: Log de Auditoria & Lixeira de Restauração (7 Dias)
 * Obsidian Dark Glassmorphism
 */

const StartupAuditoria = (() => {
    let currentSubTab = 'logs'; // 'logs' | 'lixeira'
    let logsList = [];
    let lixeiraList = [];

    function init() {
        const selectEntidade = document.getElementById('startup-auditoria-entidade');
        selectEntidade?.addEventListener('change', () => {
            if (currentSubTab === 'logs') load();
        });
    }

    function switchSubTab(tab) {
        currentSubTab = tab;
        const btnLogs = document.getElementById('tab-btn-auditoria-logs');
        const btnLixeira = document.getElementById('tab-btn-auditoria-lixeira');
        const subtabLogs = document.getElementById('subtab-auditoria-logs');
        const subtabLixeira = document.getElementById('subtab-auditoria-lixeira');

        if (tab === 'logs') {
            btnLogs?.classList.add('bg-white', 'text-zinc-950', 'shadow-md');
            btnLogs?.classList.remove('text-zinc-400');
            btnLixeira?.classList.remove('bg-white', 'text-zinc-950', 'shadow-md');
            btnLixeira?.classList.add('text-zinc-400');

            subtabLogs?.classList.remove('hidden');
            subtabLixeira?.classList.add('hidden');
            load();
        } else {
            btnLixeira?.classList.add('bg-white', 'text-zinc-950', 'shadow-md');
            btnLixeira?.classList.remove('text-zinc-400');
            btnLogs?.classList.remove('bg-white', 'text-zinc-950', 'shadow-md');
            btnLogs?.classList.add('text-zinc-400');

            subtabLixeira?.classList.remove('hidden');
            subtabLogs?.classList.add('hidden');
            loadLixeira();
        }
    }

    async function load() {
        const container = document.getElementById('startup-auditoria-container');
        if (!container) return;

        container.innerHTML = `
            <div class="py-12 flex flex-col items-center justify-center text-zinc-500">
                <div class="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mb-3"></div>
                <p class="text-xs">Carregando trilha de auditoria...</p>
            </div>
        `;

        const entidade = document.getElementById('startup-auditoria-entidade')?.value || '';

        try {
            const resp = await API.getStartupAuditoria({ entidade });
            logsList = (resp && resp.logs) || [];
            render();
            // Atualiza contagem silenciosa da lixeira no badge
            checkLixeiraBadge();
        } catch (err) {
            container.innerHTML = `
                <div class="glass-card rounded-3xl p-6 text-center text-red-400">
                    <p class="text-xs font-bold">Erro ao carregar auditoria: ${escapeHtml(err.message)}</p>
                </div>
            `;
        }
    }

    async function checkLixeiraBadge() {
        try {
            const res = await API.getStartupAuditoriaLixeira();
            const badge = document.getElementById('badge-lixeira-count');
            if (badge && res && res.sucesso) {
                const total = res.total || 0;
                badge.textContent = total;
                if (total > 0) {
                    badge.classList.remove('hidden');
                } else {
                    badge.classList.add('hidden');
                }
            }
        } catch (_) {}
    }

    function render() {
        const container = document.getElementById('startup-auditoria-container');
        if (!container) return;

        if (logsList.length === 0) {
            container.innerHTML = `
                <div class="glass-card rounded-3xl p-12 text-center text-zinc-500 space-y-3">
                    <div class="w-12 h-12 mx-auto rounded-2xl bg-white/5 text-zinc-400 border border-white/10 flex items-center justify-center text-xl">📋</div>
                    <p class="text-sm font-bold text-white">Nenhum evento registrado no log</p>
                    <p class="text-xs">Todas as ações executadas no sistema ficarão registradas aqui automaticamente.</p>
                </div>
            `;
            return;
        }

        let html = `
            <div class="glass-card rounded-3xl p-5 space-y-4">
                <div class="flex items-center justify-between">
                    <div>
                        <h4 class="font-extrabold text-sm text-white">Trilha de Ações e Modificações</h4>
                        <p class="text-xs text-zinc-400">Registro cronológico de criação, alterações, exclusões e restaurações.</p>
                    </div>
                    <span class="text-xs text-zinc-400 font-bold">${logsList.length} registros</span>
                </div>

                <!-- Timeline de Auditoria -->
                <div class="space-y-3 pt-2">
        `;

        logsList.forEach(log => {
            const acaoInfo = getAcaoInfo(log.acao);
            const entidadeBadge = getEntidadeBadge(log.entidade);
            const detalhes = log.detalhes_json || {};

            html += `
                <div class="p-3.5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 transition-all flex items-start gap-3.5">
                    <div class="w-9 h-9 rounded-xl ${acaoInfo.bg} ${acaoInfo.color} border ${acaoInfo.border} flex items-center justify-center text-sm shrink-0 mt-0.5">
                        ${acaoInfo.icon}
                    </div>

                    <div class="flex-1 min-w-0 space-y-1">
                        <div class="flex items-center justify-between flex-wrap gap-2">
                            <div class="flex items-center gap-2">
                                <span class="font-extrabold text-xs text-white">${acaoInfo.titulo}</span>
                                ${entidadeBadge}
                                <span class="text-[10px] text-zinc-500 font-mono">#ID ${log.entidade_id}</span>
                            </div>
                            <span class="text-[10px] text-zinc-500 font-mono">${formatarDataHora(log.criado_em)}</span>
                        </div>

                        <!-- Detalhes do JSON formatados -->
                        <div class="text-[11px] text-zinc-400">
                            ${renderDetalhesJson(detalhes)}
                        </div>

                        <div class="flex items-center gap-3 text-[10px] text-zinc-500 pt-1">
                            <span>👤 Operador: ${escapeHtml(log.usuario_nome || 'Administrador')}</span>
                            <span>•</span>
                            <span>IP: ${escapeHtml(log.ip_address || '127.0.0.1')}</span>
                        </div>
                    </div>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    /* ========================================================
     * LIXEIRA & RESTAURAÇÃO RÁPIDA (ATÉ 7 DIAS)
     * ======================================================== */
    async function loadLixeira() {
        const container = document.getElementById('startup-lixeira-container');
        if (!container) return;

        container.innerHTML = `
            <div class="py-12 flex flex-col items-center justify-center text-zinc-500">
                <div class="w-8 h-8 border-2 border-lime-400/20 border-t-lime-400 rounded-full animate-spin mb-3"></div>
                <p class="text-xs">Consultando itens disponíveis para restauração...</p>
            </div>
        `;

        try {
            const resp = await API.getStartupAuditoriaLixeira();
            lixeiraList = (resp && resp.itens) || [];

            const badge = document.getElementById('badge-lixeira-count');
            if (badge) {
                badge.textContent = lixeiraList.length;
                if (lixeiraList.length > 0) {
                    badge.classList.remove('hidden');
                } else {
                    badge.classList.add('hidden');
                }
            }

            renderLixeira();
        } catch (err) {
            container.innerHTML = `
                <div class="glass-card rounded-3xl p-6 text-center text-red-400">
                    <p class="text-xs font-bold">Erro ao consultar lixeira: ${escapeHtml(err.message)}</p>
                </div>
            `;
        }
    }

    function renderLixeira() {
        const container = document.getElementById('startup-lixeira-container');
        if (!container) return;

        if (lixeiraList.length === 0) {
            container.innerHTML = `
                <div class="glass-card rounded-3xl p-12 text-center text-zinc-500 space-y-3">
                    <div class="w-12 h-12 mx-auto rounded-2xl bg-white/5 text-zinc-400 border border-white/10 flex items-center justify-center text-xl">♻️</div>
                    <p class="text-sm font-bold text-white">Lixeira Vazia</p>
                    <p class="text-xs">Nenhum item (missão, tarefa, nota, finança ou cliente) foi excluído nos últimos 7 dias.</p>
                </div>
            `;
            return;
        }

        let html = `
            <div class="glass-card rounded-3xl p-5 space-y-4">
                <div class="flex items-center justify-between flex-wrap gap-2">
                    <div>
                        <h4 class="font-extrabold text-sm text-white flex items-center gap-2">
                            <span>Itens Excluídos Recentemente</span>
                            <span class="text-xs px-2 py-0.5 rounded-full bg-lime-400/10 text-lime-400 font-bold font-mono">${lixeiraList.length}</span>
                        </h4>
                        <p class="text-xs text-zinc-400">Você pode restaurar qualquer um destes itens com 1 clique antes do prazo de expiração.</p>
                    </div>
                </div>

                <div class="space-y-2.5 pt-1">
        `;

        lixeiraList.forEach(item => {
            const dias = item.dias_restantes;
            let badgeExpira = '';
            if (dias <= 1) {
                badgeExpira = `<span class="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[10px] font-extrabold uppercase tracking-wider animate-pulse">⚠️ ${item.expira_texto}</span>`;
            } else if (dias <= 3) {
                badgeExpira = `<span class="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px] font-extrabold uppercase tracking-wider">⏳ ${item.expira_texto}</span>`;
            } else {
                badgeExpira = `<span class="px-2 py-0.5 rounded-full bg-lime-400/15 text-lime-400 border border-lime-400/30 text-[10px] font-extrabold uppercase tracking-wider">⏳ ${item.expira_texto}</span>`;
            }

            const valorHtml = item.valor ? `<span class="text-xs font-mono font-bold text-lime-400">R$ ${parseFloat(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>` : '';
            const subinfoHtml = item.subinfo ? `<span class="text-[11px] text-zinc-500 font-medium">(${escapeHtml(item.subinfo)})</span>` : '';

            html += `
                <div class="p-3.5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 transition-all flex items-center justify-between flex-wrap gap-3">
                    <div class="flex items-center gap-3 min-w-0 flex-1">
                        <div class="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-lg shrink-0">
                            ${item.icone || '📦'}
                        </div>

                        <div class="min-w-0 space-y-0.5">
                            <div class="flex items-center gap-2 flex-wrap">
                                <span class="font-extrabold text-xs text-white truncate">${escapeHtml(item.titulo || 'Item sem título')}</span>
                                <span class="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-white/10">${escapeHtml(item.tipo_label || item.tipo)}</span>
                                ${subinfoHtml}
                                ${valorHtml}
                            </div>
                            <div class="flex items-center gap-2 text-[10px] text-zinc-500">
                                <span>Apagado em: ${formatarDataHora(item.deletado_em)}</span>
                            </div>
                        </div>
                    </div>

                    <div class="flex items-center gap-3 shrink-0">
                        ${badgeExpira}
                        <button type="button" onclick="StartupAuditoria.restaurarItem('${item.tipo}', ${item.id}, '${escapeHtml(item.titulo || '').replace(/'/g, "\\'")}')" class="px-3.5 py-1.5 rounded-full bg-lime-400 hover:bg-lime-300 text-zinc-950 font-bold text-xs shadow-md shadow-lime-400/20 active:scale-95 transition-all flex items-center gap-1.5">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                            <span>Restaurar</span>
                        </button>
                    </div>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    async function restaurarItem(tipo, id, titulo) {
        if (!confirm(`Deseja restaurar "${titulo}" de volta para o sistema?`)) {
            return;
        }

        try {
            const res = await API.restaurarStartupAuditoriaItem({ tipo, id });
            if (res && res.sucesso !== false) {
                if (typeof App !== 'undefined' && App.showToast) {
                    App.showToast(res.mensagem || 'Item restaurado com sucesso!', 'success');
                } else if (typeof Toast !== 'undefined') {
                    Toast.success(res.mensagem || 'Item restaurado com sucesso!');
                }

                // Recarrega lixeira
                await loadLixeira();

                // Atualiza módulos se aplicável
                if (tipo === 'missao' && typeof App !== 'undefined' && App.renderMissions) {
                    App.renderMissions();
                } else if (tipo === 'tarefa' && typeof App !== 'undefined' && App.reloadCurrentView) {
                    App.reloadCurrentView();
                }
            } else {
                const erroMsg = (res && res.erro) || 'Falha ao restaurar item.';
                if (typeof App !== 'undefined' && App.showToast) {
                    App.showToast(erroMsg, 'error');
                }
            }
        } catch (err) {
            if (typeof App !== 'undefined' && App.showToast) {
                App.showToast('Erro ao restaurar: ' + err.message, 'error');
            }
        }
    }

    function getAcaoInfo(acao) {
        const map = {
            criar: { icon: '+', titulo: 'Novo Registro Criado', bg: 'bg-emerald-500/15', color: 'text-emerald-400', border: 'border-emerald-500/30' },
            editar: { icon: '✎', titulo: 'Registro Modificado', bg: 'bg-blue-500/15', color: 'text-blue-400', border: 'border-blue-500/30' },
            excluir: { icon: '✕', titulo: 'Registro Excluído (Lixeira)', bg: 'bg-red-500/15', color: 'text-red-400', border: 'border-red-500/30' },
            restaurar: { icon: '🔄', titulo: 'Item Restaurado da Lixeira', bg: 'bg-lime-400/15', color: 'text-lime-400', border: 'border-lime-400/30' },
            emitir_fatura: { icon: '⚡', titulo: 'Fatura Solar Emitida', bg: 'bg-lime-400/15', color: 'text-lime-400', border: 'border-lime-400/30' },
            alterar_status: { icon: '✓', titulo: 'Status da Fatura Atualizado', bg: 'bg-purple-500/15', color: 'text-purple-400', border: 'border-purple-500/30' },
            alocar_creditos: { icon: '🔄', titulo: 'Rateio de Créditos Solar', bg: 'bg-cyan-400/15', color: 'text-cyan-400', border: 'border-cyan-400/30' },
            registrar_pagamento: { icon: '💰', titulo: 'Lançamento Financeiro', bg: 'bg-orange-400/15', color: 'text-orange-400', border: 'border-orange-400/30' },
            inicializacao: { icon: '🚀', titulo: 'Módulo Inicializado', bg: 'bg-white/10', color: 'text-white', border: 'border-white/20' }
        };

        return map[acao] || { icon: '•', titulo: `Ação: ${acao}`, bg: 'bg-white/5', color: 'text-zinc-300', border: 'border-white/10' };
    }

    function getEntidadeBadge(entidade) {
        const map = {
            missoes: '<span class="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">Missões</span>',
            tarefas: '<span class="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-lime-400/10 text-lime-400 border border-lime-400/20">Tarefas</span>',
            notas: '<span class="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/20">Notas</span>',
            financas_pessoais_itens: '<span class="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-cyan-400/10 text-cyan-400 border border-cyan-400/20">Finanças</span>',
            cliente: '<span class="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Cliente</span>',
            startup_clientes: '<span class="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Cliente</span>',
            fatura: '<span class="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-lime-400/10 text-lime-400 border border-lime-400/20">Fatura</span>',
            credito: '<span class="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-cyan-400/10 text-cyan-400 border border-cyan-400/20">Créditos</span>',
            pagamento: '<span class="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-orange-400/10 text-orange-400 border border-orange-400/20">Financeiro</span>',
            sistema: '<span class="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-white/10 text-white border border-white/20">Sistema</span>'
        };

        return map[entidade] || `<span class="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-white/5 text-zinc-400">${escapeHtml(entidade)}</span>`;
    }

    function renderDetalhesJson(detalhes) {
        if (!detalhes || Object.keys(detalhes).length === 0) return '<span>Sem detalhes adicionais</span>';

        const items = [];
        for (const [key, val] of Object.entries(detalhes)) {
            const kFormat = key.replace(/_/g, ' ');
            let vFormat = val;
            if (typeof val === 'number') {
                vFormat = (key.includes('valor') || key.includes('desconto')) ? `R$ ${val.toFixed(2)}` : val;
            } else if (typeof val === 'object') {
                vFormat = JSON.stringify(val);
            }
            items.push(`<span class="inline-flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-lg mr-1 mb-1 font-mono text-[10px]"><strong class="text-zinc-300">${kFormat}:</strong> <span class="text-zinc-400">${escapeHtml(String(vFormat))}</span></span>`);
        }

        return items.join('');
    }

    function formatarDataHora(dtStr) {
        if (!dtStr) return '-';
        try {
            const d = new Date(dtStr);
            if (isNaN(d.getTime())) return dtStr;
            return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        } catch {
            return dtStr;
        }
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.innerText = text;
        return div.innerHTML;
    }

    return {
        init,
        load,
        switchSubTab,
        loadLixeira,
        restaurarItem
    };
})();
