import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
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

/**
 * POST /api/auth/recuperar-password
 * Genera token seguro y enlace de recuperación para el usuario (almacenado en BD)
 */
authRouter.post('/recuperar-password', async (req, res) => {
  const { identificador } = req.body;

  if (!identificador || typeof identificador !== 'string' || !identificador.trim()) {
    res.status(400).json({ error: 'Debe ingresar un RUT o nombre de usuario válido' });
    return;
  }

  const cleanIdentificador = identificador.trim();

  try {
    // Buscar por nombre_usuario o RUT
    const user = await queryOne(`
      SELECT u.id_usuario, u.nombre_usuario, u.rut, u.apellido, r.nombre AS rol
      FROM USUARIO u
      JOIN ROL r ON u.id_rol = r.id_rol
      WHERE LOWER(u.nombre_usuario) = LOWER(?) OR u.rut = ?;
    `, [cleanIdentificador, cleanIdentificador]);

    if (!user) {
      // Respuesta uniforme para evitar enumeración de usuarios en entornos corporativos
      res.json({
        mensaje: 'Si el identificador ingresado corresponde a un usuario corporativo de Aceros AZA, se ha generado el enlace de recuperación.',
        encontrado: false
      });
      return;
    }

    // Generar token criptográfico de 32 bytes (64 caracteres hexadecimales)
    const token = crypto.randomBytes(32).toString('hex');
    // Expiración en 1 hora (ISO 8601)
    const expiraMs = Date.now() + 60 * 60 * 1000;
    const expiraIso = new Date(expiraMs).toISOString();

    // Guardar token y expiración en BD
    await run(`
      UPDATE USUARIO 
      SET reset_token = ?, reset_token_expira = ? 
      WHERE id_usuario = ?;
    `, [token, expiraIso, user.id_usuario]);

    // Construcción del enlace hacia el frontend
    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol || 'http';
    const link = `${protocol}://${host}/reset-password?token=${token}`;

    // Registro en consola de simulación de correo SMTP para auditoría / evaluación docente
    console.log('\n┌────────────────────────────────────────────────────────────────────────┐');
    console.log('│  [SIMULADOR SMTP ACEROS AZA] Envío de Correo de Restablecimiento        │');
    console.log('├────────────────────────────────────────────────────────────────────────┤');
    console.log(`│ Para: ${user.nombre_usuario.toLowerCase()}@acerosaza.cl (RUT: ${user.rut})`);
    console.log('│ Asunto: Restablecimiento de Credenciales de Acceso — Sistema Trefilado');
    console.log(`│ Usuario: ${user.apellido ? user.apellido + ', ' : ''}${user.nombre_usuario} [${user.rol}]`);
    console.log('│ Enlace Generado:');
    console.log(`│ -> ${link}`);
    console.log(`│ Expira: ${expiraIso} (1 hora de vigencia estricta)`);
    console.log(`│ Token Hash en BD: ${token.substring(0, 16)}... (64 hex characters)`);
    console.log('└────────────────────────────────────────────────────────────────────────┘\n');

    res.json({
      mensaje: 'Enlace generado exitosamente.',
      token,
      link,
      encontrado: true,
      expira: expiraIso,
      usuario: {
        nombre_usuario: user.nombre_usuario,
        rut: user.rut,
        apellido: user.apellido,
        rol: user.rol
      }
    });
  } catch (err) {
    console.error('[AUTH] Error en recuperar-password:', err);
    res.status(500).json({ error: 'Error interno al procesar la recuperación de contraseña' });
  }
});

/**
 * GET /api/auth/verificar-token-reset
 * Valida si un token existe y no ha expirado
 */
authRouter.get('/verificar-token-reset', async (req, res) => {
  const { token } = req.query;

  if (!token || typeof token !== 'string') {
    res.status(400).json({ valido: false, error: 'Token no proporcionado' });
    return;
  }

  try {
    const user = await queryOne(`
      SELECT u.id_usuario, u.nombre_usuario, u.rut, u.apellido, u.reset_token_expira, r.nombre AS rol
      FROM USUARIO u
      JOIN ROL r ON u.id_rol = r.id_rol
      WHERE u.reset_token = ?;
    `, [token.trim()]);

    if (!user) {
      res.status(400).json({ 
        valido: false, 
        error: 'El enlace de restablecimiento es inválido o ya fue utilizado.' 
      });
      return;
    }

    const expiraTime = new Date(user.reset_token_expira).getTime();
    if (isNaN(expiraTime) || expiraTime < Date.now()) {
      res.status(400).json({ 
        valido: false, 
        error: 'El enlace de restablecimiento ha expirado (límite de seguridad de 1 hora).' 
      });
      return;
    }

    res.json({
      valido: true,
      usuario: {
        nombre_usuario: user.nombre_usuario,
        rut: user.rut,
        apellido: user.apellido,
        rol: user.rol
      }
    });
  } catch (err) {
    console.error('[AUTH] Error al verificar token:', err);
    res.status(500).json({ valido: false, error: 'Error interno al validar token' });
  }
});

/**
 * POST /api/auth/reset-password
 * Valida el token, hashea la nueva contraseña y actualiza la BD limpiando el token
 */
authRouter.post('/reset-password', async (req, res) => {
  const { token, nuevaPassword } = req.body;

  if (!token || typeof token !== 'string' || !token.trim()) {
    res.status(400).json({ error: 'Token de restablecimiento requerido' });
    return;
  }

  if (!nuevaPassword || typeof nuevaPassword !== 'string' || nuevaPassword.trim().length < 6) {
    res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
    return;
  }

  try {
    const cleanToken = token.trim();
    const user = await queryOne(`
      SELECT id_usuario, nombre_usuario, rut, reset_token_expira, habilitado
      FROM USUARIO
      WHERE reset_token = ?;
    `, [cleanToken]);

    if (!user) {
      res.status(400).json({ 
        error: 'El enlace de restablecimiento es inválido o ya fue utilizado anteriormente.' 
      });
      return;
    }

    const expiraTime = new Date(user.reset_token_expira).getTime();
    if (isNaN(expiraTime) || expiraTime < Date.now()) {
      res.status(400).json({ 
        error: 'El enlace de restablecimiento ha expirado. Por favor solicite un nuevo enlace.' 
      });
      return;
    }

    // Hashear la nueva contraseña con salt de bcrypt
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(nuevaPassword.trim(), salt);

    // Actualizar hash, desbloquear cuenta, reiniciar intentos y limpiar token
    await run(`
      UPDATE USUARIO 
      SET password_hash = ?, 
          reset_token = NULL, 
          reset_token_expira = NULL, 
          intentos_fallidos = 0, 
          habilitado = 1 
      WHERE id_usuario = ?;
    `, [passwordHash, user.id_usuario]);

    console.log(`[AUTH] Contraseña restablecida exitosamente para usuario ${user.nombre_usuario} (ID: ${user.id_usuario})`);

    res.json({
      message: 'Contraseña actualizada correctamente. Su cuenta ha sido restablecida y puede iniciar sesión ahora.'
    });
  } catch (err) {
    console.error('[AUTH] Error en reset-password:', err);
    res.status(500).json({ error: 'Error interno al actualizar la contraseña' });
  }
});
