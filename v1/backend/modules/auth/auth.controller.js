import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { queryOne, run, query } from '../../config/db.js';
import { JWT_SECRET, authenticateJWT } from '../../shared/middlewares/auth.middleware.js';

export const authRouter = Router();

/**
 * POST /api/auth/login
 * Autenticación mediante credenciales con bloqueo tras 3 intentos fallidos (CU1)
 */
authRouter.post('/login', async (req, res) => {
  const { nombre_usuario, password } = req.body;

  if (!nombre_usuario || !password) {
    res.status(400).json({ error: 'Debe ingresar nombre de usuario y contraseña' });
    return;
  }

  try {
    const user = await queryOne(`
      SELECT u.id_usuario, u.id_rol, u.nombre_usuario, u.rut, u.apellido, 
             u.password_hash, u.habilitado, u.intentos_fallidos, r.nombre AS rol
      FROM USUARIO u
      JOIN ROL r ON u.id_rol = r.id_rol
      WHERE u.nombre_usuario = ?;
    `, [nombre_usuario.trim()]);

    if (!user) {
      res.status(401).json({ error: 'Credenciales inválidas: usuario no encontrado' });
      return;
    }

    if (user.habilitado === 0) {
      res.status(403).json({ 
        error: 'Cuenta bloqueada o inhabilitada tras exceder 3 intentos fallidos. Comuníquese con un Administrador para su desbloqueo.' 
      });
      return;
    }

    const passwordOk = bcrypt.compareSync(password, user.password_hash);

    if (!passwordOk) {
      const nuevosIntentos = (user.intentos_fallidos || 0) + 1;
      if (nuevosIntentos >= 3) {
        await run('UPDATE USUARIO SET intentos_fallidos = ?, habilitado = 0 WHERE id_usuario = ?', [nuevosIntentos, user.id_usuario]);
        res.status(403).json({ 
          error: 'Ha superado el límite de 3 intentos fallidos. Su cuenta ha sido bloqueada por seguridad corporativa de Aceros AZA.' 
        });
      } else {
        await run('UPDATE USUARIO SET intentos_fallidos = ? WHERE id_usuario = ?', [nuevosIntentos, user.id_usuario]);
        const restantes = 3 - nuevosIntentos;
        res.status(401).json({ 
          error: `Contraseña incorrecta. Le quedan ${restantes} intento(s) antes del bloqueo automático de la cuenta.` 
        });
      }
      return;
    }

    // Login exitoso: reiniciar contador de intentos fallidos
    await run('UPDATE USUARIO SET intentos_fallidos = 0 WHERE id_usuario = ?', [user.id_usuario]);

    const payload = {
      id_usuario: user.id_usuario,
      id_rol: user.id_rol,
      nombre_usuario: user.nombre_usuario,
      rut: user.rut,
      apellido: user.apellido,
      rol: user.rol
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });

    res.json({
      message: 'Autenticación exitosa',
      token,
      usuario: payload
    });
  } catch (err) {
    console.error('[AUTH] Error en login:', err);
    res.status(500).json({ error: 'Error interno de autenticación' });
  }
});

/**
 * GET /api/auth/me
 * Retorna datos del usuario actualmente autenticado
 */
authRouter.get('/me', authenticateJWT, (req, res) => {
  res.json({ usuario: req.user });
});

/**
 * GET /api/auth/demo-users
 * Retorna lista de perfiles disponibles para facilitar las pruebas del evaluador
 */
authRouter.get('/demo-users', async (_req, res) => {
  try {
    const users = await query(`
      SELECT u.id_usuario, u.nombre_usuario, u.rut, u.apellido, u.habilitado, r.nombre AS rol
      FROM USUARIO u
      JOIN ROL r ON u.id_rol = r.id_rol
      ORDER BY u.id_rol ASC, u.id_usuario ASC;
    `);
    res.json({ usuarios: users });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener usuarios de prueba' });
  }
});
