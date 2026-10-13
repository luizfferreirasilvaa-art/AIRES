/**
 * AIRES - Cliente de Comunicação REST API
 */

const API = (() => {
    const getBaseUrl = () => {
        const path = window.location.pathname;
        if (path.includes('/public')) {
            return path.substring(0, path.indexOf('/public') + 7) + '/api';
        }
        if (path.includes('/AIRES')) {
            return '/AIRES/api';
        }
        return '/api';
    };

    const BASE_URL = getBaseUrl();

    async function request(endpoint, options = {}) {
        const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
        
        const defaultHeaders = {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        };

        const config = {
            ...options,
            headers: {
                ...defaultHeaders,
                ...(options.headers || {})
            }
        };

        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json().catch(() => null);

            if (!response.ok) {
                if (response.status === 401 && !window.location.pathname.includes('/login')) {
                    const loginUrl = getBaseUrl().replace('/api', '') + '/login';
                    window.location.href = loginUrl;
                    return;
                }
                const error = new Error((data && data.erro) || (data && data.mensagem) || `Erro HTTP ${response.status}`);
                error.status = response.status;
                error.data = data;
                throw error;
            }

            if (data === null) {
                throw new Error('Resposta inválida do servidor.');
            }

            return data;
        } catch (err) {
            console.error(`[API Error] ${endpoint}:`, err);
            throw err;
        }
    }

    return {
        getTarefas: (params = {}) => {
            const query = new URLSearchParams(params).toString();
            return request(`/tarefas${query ? '?' + query : ''}`);
        },
        getTarefa: (id) => request(`/tarefas/${id}`),
        createTarefa: (payload) => request('/tarefas', { method: 'POST', body: payload }),
        updateTarefa: (id, payload) => request(`/tarefas/${id}`, { method: 'PUT', body: payload }),
        updateTarefaStatus: (id, status, ordem = 0) => request(`/tarefas/${id}/status`, { 
            method: 'PATCH', 
            body: { status, ordem } 
        }),
        deleteTarefa: (id) => request(`/tarefas/${id}`, { method: 'DELETE' }),
        checkConflict: (inicio, entrega, excludeId = null) => {
            const params = new URLSearchParams({ data_inicio: inicio, data_entrega: entrega });
            if (excludeId) params.append('exclude_id', excludeId);
            return request(`/tarefas/conflito?${params.toString()}`);
        },

        createSubtarefa: (tarefaId, titulo) => request(`/tarefas/${tarefaId}/subtarefas`, {
            method: 'POST',
            body: { titulo }
        }),
        toggleSubtarefa: (id) => request(`/subtarefas/${id}/toggle`, { method: 'PATCH' }),
        updateSubtarefa: (id, titulo) => request(`/subtarefas/${id}`, { method: 'PUT', body: { titulo } }),
        deleteSubtarefa: (id) => request(`/subtarefas/${id}`, { method: 'DELETE' }),

        getMissoes: () => request('/missoes'),
        createMissao: (payload) => request('/missoes', { method: 'POST', body: payload }),
        updateMissao: (id, payload) => request(`/missoes/${id}`, { method: 'PUT', body: payload }),
        deleteMissao: (id) => request(`/missoes/${id}`, { method: 'DELETE' }),

        getAlertasPendentes: () => request('/alertas/pendentes'),
        markAlertaLido: (id) => request(`/alertas/${id}/lido`, { method: 'PATCH' }),

        getDashboardStats: () => request('/dashboard/stats'),

        getNotas: (params = {}) => {
            const query = new URLSearchParams(params).toString();
            return request(`/notas${query ? '?' + query : ''}`);
        },
        createNota: (payload) => request('/notas', { method: 'POST', body: payload }),
        deleteNota: (id) => request(`/notas/${id}`, { method: 'DELETE' }),

        getModos: () => request('/modos'),
        createModo: (payload) => request('/modos', { method: 'POST', body: payload }),
        updateModo: (id, payload) => request(`/modos/${id}`, { method: 'PUT', body: payload }),
        deleteModo: (id) => request(`/modos/${id}`, { method: 'DELETE' }),

        // Startup - Clientes
        getStartupClientes: (params = {}) => {
            const query = new URLSearchParams(params).toString();
            return request(`/startup/clientes${query ? '?' + query : ''}`);
        },
        getStartupCliente: (id) => request(`/startup/clientes/${id}`),
        createStartupCliente: (payload) => request('/startup/clientes', { method: 'POST', body: payload }),
        updateStartupCliente: (id, payload) => request(`/startup/clientes/${id}`, { method: 'PUT', body: payload }),
        deleteStartupCliente: (id) => request(`/startup/clientes/${id}`, { method: 'DELETE' }),

        // Startup - Faturas
        getStartupFaturas: (params = {}) => {
            const query = new URLSearchParams(params).toString();
            return request(`/startup/faturas${query ? '?' + query : ''}`);
        },
        getStartupFatura: (id) => request(`/startup/faturas/${id}`),
        createStartupFatura: (payload) => request('/startup/faturas', { method: 'POST', body: payload }),
        updateStartupFatura: (id, payload) => request(`/startup/faturas/${id}`, { method: 'PUT', body: payload }),
        updateStartupFaturaStatus: (id, status) => request(`/startup/faturas/${id}/status`, { method: 'PATCH', body: { status } }),
        deleteStartupFatura: (id) => request(`/startup/faturas/${id}`, { method: 'DELETE' }),

        // Startup - Estoque de Créditos
        getStartupCreditos: (params = {}) => {
            const query = new URLSearchParams(params).toString();
            return request(`/startup/creditos${query ? '?' + query : ''}`);
        },
        getStartupCredito: (id) => request(`/startup/creditos/${id}`),
        createStartupCredito: (payload) => request('/startup/creditos', { method: 'POST', body: payload }),
        updateStartupCredito: (id, payload) => request(`/startup/creditos/${id}`, { method: 'PUT', body: payload }),
        getStartupCreditoAlocacoes: (id) => request(`/startup/creditos/${id}/alocacoes`),
        alocarStartupCreditos: (id, payload) => request(`/startup/creditos/${id}/alocar`, { method: 'POST', body: payload }),

        // Startup - Financeiro
        getStartupFinanceiro: (params = {}) => {
            const query = new URLSearchParams(params).toString();
            return request(`/startup/financeiro${query ? '?' + query : ''}`);
        },
        getStartupFinanceiroResumo: (params = {}) => {
            const query = new URLSearchParams(params).toString();
            return request(`/startup/financeiro/resumo${query ? '?' + query : ''}`);
        },
        createStartupPagamento: (payload) => request('/startup/financeiro', { method: 'POST', body: payload }),
        updateStartupPagamento: (id, payload) => request(`/startup/financeiro/${id}`, { method: 'PUT', body: payload }),
        deleteStartupPagamento: (id) => request(`/startup/financeiro/${id}`, { method: 'DELETE' }),

        // Startup - Dashboard Solar
        getStartupDashboard: () => request('/startup/dashboard'),

        // Startup - Log de Auditoria
        getStartupAuditoria: (params = {}) => {
            const query = new URLSearchParams(params).toString();
            return request(`/startup/auditoria${query ? '?' + query : ''}`);
        }
    };
})();
