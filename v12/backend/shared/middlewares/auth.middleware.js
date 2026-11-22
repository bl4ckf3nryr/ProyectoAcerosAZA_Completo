import jwt from 'jsonwebtoken';
import { JWT_SECRET, SERVICE_TOKEN } from '../../config/env.js';

export { JWT_SECRET, SERVICE_TOKEN };

/**
 * Middleware para validar token JWT de usuario.
 */
export function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No autorizado: Cabecera Authorization requerida con formato Bearer' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

/**
 * Middleware para autorizar roles específicos (RBAC).
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }

    if (!allowedRoles.includes(req.user.rol)) {
      res.status(403).json({ 
        error: `Acceso denegado: Se requiere rol [${allowedRoles.join(', ')}]. Rol actual: ${req.user.rol}` 
      });
      return;
    }

    next();
  };
}

/**
 * Middleware para registrar inspecciones vía API:
 * Acepta tanto Token de Servicio del simulador (x-service-token o Bearer)
 * como token JWT de usuarios autenticados.
 */
export function authenticateServiceOrUser(req, res, next) {
  const serviceHeader = req.headers['x-service-token'];
  const authHeader = req.headers.authorization;

  // 1. Verificación por cabecera de servicio explícita
  if (serviceHeader && serviceHeader === SERVICE_TOKEN) {
    req.isServiceToken = true;
    return next();
  }

  // 2. Verificación si el Bearer coincide con el SERVICE_TOKEN
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    if (token === SERVICE_TOKEN) {
      req.isServiceToken = true;
      return next();
    }

    // 3. Verificación de JWT de usuario
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      return next();
    } catch {
      // Continuar al rechazo
    }
  }

  res.status(401).json({ 
    error: 'No autorizado: Se requiere Token de Servicio de máquina (x-service-token) o JWT válido' 
  });
}
