/**
 * AIRES - Módulo Startup: Log de Auditoria & Rastreabilidade
 * Obsidian Dark Glassmorphism
 */

const StartupAuditoria = (() => {
    let logsList = [];

    function init() {
        const selectEntidade = document.getElementById('startup-auditoria-entidade');
        selectEntidade?.addEventListener('change', () => load());
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
        } catch (err) {
            container.innerHTML = `
                <div class="glass-card rounded-3xl p-6 text-center text-red-400">
                    <p class="text-xs font-bold">Erro ao carregar auditoria: ${escapeHtml(err.message)}</p>
                </div>
            `;
        }
    }

    function render() {
        const container = document.getElementById('startup-auditoria-container');
        if (!container) return;

        if (logsList.length === 0) {
            container.innerHTML = `
                <div class="glass-card rounded-3xl p-12 text-center text-zinc-500 space-y-3">
                    <div class="w-12 h-12 mx-auto rounded-2xl bg-white/5 text-zinc-400 border border-white/10 flex items-center justify-center text-xl">📋</div>
                    <p class="text-sm font-bold text-white">Nenhum evento registrado no log</p>
                    <p class="text-xs">Todas as ações executadas no módulo Startup ficarão registradas aqui automaticamente.</p>
                </div>
            `;
            return;
        }

        let html = `
            <div class="glass-card rounded-3xl p-5 space-y-4">
                <div class="flex items-center justify-between">
                    <div>
                        <h4 class="font-extrabold text-sm text-white">Trilha de Ações e Modificações</h4>
                        <p class="text-xs text-zinc-400">Registro cronológico de criação, alterações, faturamento e liquidações.</p>
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

    function getAcaoInfo(acao) {
        const map = {
            criar: { icon: '+', titulo: 'Novo Registro Criado', bg: 'bg-emerald-500/15', color: 'text-emerald-400', border: 'border-emerald-500/30' },
            editar: { icon: '✎', titulo: 'Registro Modificado', bg: 'bg-blue-500/15', color: 'text-blue-400', border: 'border-blue-500/30' },
            excluir: { icon: '✕', titulo: 'Registro Excluído', bg: 'bg-red-500/15', color: 'text-red-400', border: 'border-red-500/30' },
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
            cliente: '<span class="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Cliente</span>',
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
        load
    };
})();
