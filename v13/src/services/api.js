/**
 * Cliente API para el Sistema de Monitoreo de Trefilado (Aceros AZA) — JavaScript puro
 */

const API_BASE = import.meta.env?.VITE_API_URL || '/api';

export function getAuthToken() {
  return localStorage.getItem('aza_auth_token');
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('aza_auth_token', token);
  } else {
    localStorage.removeItem('aza_auth_token');
  }
}

function notifyForbidden(detailMessage) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('aza:forbidden', {
        detail: {
          message: 'Error 403: Acceso no autorizado',
          detail: detailMessage || 'Su rol actual no tiene permisos para acceder a este recurso.',
        },
      })
    );
  }
}

async function apiFetch(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    ...(options.headers || {}),
  };

  if (!options.skipJsonContentType && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 403) {
    const errBody = await response.clone().json().catch(() => ({}));
    const msg = errBody.error || 'Error 403: Acceso no autorizado';
    notifyForbidden(msg);
    throw new Error(msg);
  }

  return response;
}

async function request(endpoint, options = {}) {
  const response = await apiFetch(endpoint, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Error ${response.status}: ${response.statusText}`);
  }

  return data;
}

export const api = {
  // Autenticación
  login: (credentials) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  getMe: () => request('/auth/me'),

  getDemoUsers: () => request('/auth/demo-users'),

  verificarTokenReset: (token) =>
    request(`/auth/verificar-token-reset?token=${encodeURIComponent(token)}`),

  resetPassword: (token, nuevaPassword) =>
    request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, nuevaPassword }),
    }),

  // Inspecciones
  getUltimoResultado: () => request('/inspecciones/ultimo'),

  getFiltrosMeta: () => request('/inspecciones/meta/filtros'),

  getHistorico: (params) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, String(val));
      }
    });
    return request(`/inspecciones?${query.toString()}`);
  },

  getInspeccionDetalle: (id) => request(`/inspecciones/${id}`),

  crearInspeccion: (data, serviceToken) => {
    const headers = {};
    if (serviceToken) {
      headers['x-service-token'] = serviceToken;
    }
    return request('/inspecciones', {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
  },

  // Observaciones
  getObservaciones: (params) => {
    if (!params) return request('/observaciones');
    if (typeof params === 'number' || typeof params === 'string') {
      return request(`/observaciones?id_inspeccion=${params}`);
    }
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, String(val));
      }
    });
    const qs = query.toString();
    return request(`/observaciones${qs ? `?${qs}` : ''}`);
  },

  getObservacionesPorInspeccion: (idInspeccion) =>
    request(`/observaciones/por-inspeccion/${idInspeccion}`),

  crearObservacion: (data) =>
    request('/observaciones', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  actualizarEstadoObservacion: (id, estado) =>
    request(`/observaciones/${id}/estado`, {
      method: 'PUT',
      body: JSON.stringify({ estado }),
    }),

  // Recetas
  getRecetas: (soloVigentes = false) =>
    request(`/recetas${soloVigentes ? '?solo_vigentes=true' : ''}`),

  crearReceta: (data) =>
    request('/recetas', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  cerrarVigenciaReceta: (id) =>
    request(`/recetas/${id}/cerrar-vigencia`, {
      method: 'PUT',
    }),

  // Usuarios
  getUsuarios: () => request('/usuarios'),

  crearUsuario: (data) =>
    request('/usuarios', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  actualizarUsuario: (id, data) =>
    request(`/usuarios/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  toggleUsuarioEstado: (id) =>
    request(`/usuarios/${id}/toggle-estado`, {
      method: 'PUT',
    }),

  // Dashboard
  getDashboardSummary: (params) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') query.append(key, String(val));
    });
    return request(`/dashboard/summary?${query.toString()}`);
  },

  getDashboardTrend: (params) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') query.append(key, String(val));
    });
    return request(`/dashboard/trend?${query.toString()}`);
  },

  getDashboardByRecipe: (params) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') query.append(key, String(val));
    });
    return request(`/dashboard/by-recipe?${query.toString()}`);
  },

  getDashboardByShift: (params) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') query.append(key, String(val));
    });
    return request(`/dashboard/by-shift?${query.toString()}`);
  },

  getDashboardHistogram: (params) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') query.append(key, String(val));
    });
    return request(`/dashboard/histogram?${query.toString()}`);
  },

  getDashboardDrilldown: (params) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') query.append(key, String(val));
    });
    return request(`/dashboard/drilldown?${query.toString()}`);
  },

  // Base de Datos (Admin)
  getDbTables: () => request('/database/tables'),

  getDbTableSchema: (tableName) => request(`/database/schema/${tableName}`),

  getDbTablePreview: (tableName, page = 1, limit = 20) =>
    request(`/database/preview/${tableName}?page=${page}&limit=${limit}`),

  ejecutarDbQuery: (sql) =>
    request('/database/query', {
      method: 'POST',
      body: JSON.stringify({ query: sql }),
    }),

  // Auditoría (Admin)
  exportarAuditoriaCsv: async () => {
    const response = await apiFetch('/admin/auditoria/exportar', {
      method: 'GET',
      skipJsonContentType: true,
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || `Error ${response.status} al exportar informe`);
    }

    return response.blob();
  },

  // Simulador
  dispararSimulador: () => request('/simulador/disparar', { method: 'POST' }),
};
