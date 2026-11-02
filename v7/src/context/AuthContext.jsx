import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, setAuthToken, getAuthToken } from '../services/api.js';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setTokenState] = useState(getAuthToken());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function verifyExistingAuth() {
      const storedToken = getAuthToken();
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const res = await api.getMe();
        if (res.usuario) {
          setUser(res.usuario);
        } else {
          logout();
        }
      } catch (err) {
        console.warn('[AUTH] Sesión expirada o token inválido:', err);
        logout();
      } finally {
        setLoading(false);
      }
    }

    verifyExistingAuth();
  }, []);

  const login = async (nombre_usuario, password) => {
    const res = await api.login({ nombre_usuario, password });
    setAuthToken(res.token);
    setTokenState(res.token);
    setUser(res.usuario);
  };

  const quickLogin = async (rolName) => {
    const creds = {
      Operador: { u: 'operador1', p: 'oper123' },
      Supervisor: { u: 'supervisor', p: 'super123' },
      Administrador: { u: 'admin', p: 'admin123' },
    };
    const c = creds[rolName];
    if (c) {
      await login(c.u, c.p);
    }
  };

  const logout = () => {
    setAuthToken(null);
    setTokenState(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, quickLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
}
