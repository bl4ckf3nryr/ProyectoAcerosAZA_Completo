/**
 * Cliente API para el Sistema de Monitoreo de Trefilado (Aceros AZA) — JavaScript puro
 */

const API_BASE = import.meta.env.VITE_BACKEND_URL || '/api';

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

async function request(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

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
  getObservaciones: (idInspeccion) => {
    const q = idInspeccion ? `?id_inspeccion=${idInspeccion}` : '';
    return request(`/observaciones${q}`);
  },

  crearObservacion: (data) =>
    request('/observaciones', {
      method: 'POST',
      body: JSON.stringify(data),
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

  // Simulador
  dispararSimulador: () => request('/simulador/disparar', { method: 'POST' }),
};
