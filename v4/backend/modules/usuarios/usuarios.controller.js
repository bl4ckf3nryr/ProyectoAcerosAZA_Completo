import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query, queryOne, run } from '../../config/db.js';
import { authenticateJWT, requireRole } from '../../shared/middlewares/auth.middleware.js';
import { validarRutChileno, formatearRutChileno } from '../../utils/rutValidator.js';

export const usuariosRouter = Router();

/**
 * GET /api/usuarios
 */
usuariosRouter.get('/', authenticateJWT, requireRole('Administrador'), async (_req, res) => {
  try {
    const usuarios = await query(`
      SELECT 
        u.id_usuario,
        u.id_rol,
        u.nombre_usuario,
        u.rut,
        u.apellido,
        u.habilitado,
        u.intentos_fallidos,
        r.nombre AS rol_nombre,
        (SELECT COUNT(*) FROM OBSERVACION o WHERE o.id_usuario = u.id_usuario) AS total_observaciones
      FROM USUARIO u
      JOIN ROL r ON u.id_rol = r.id_rol
      ORDER BY u.id_usuario ASC;
    `);

    const roles = await query('SELECT id_rol, nombre FROM ROL ORDER BY id_rol ASC;');

    res.json({ usuarios, roles });
  } catch (err) {
    console.error('[USUARIOS] Error al listar usuarios:', err);
    res.status(500).json({ error: 'Error al listar usuarios' });
  }
});

/**
 * POST /api/usuarios
 */
usuariosRouter.post('/', authenticateJWT, requireRole('Administrador'), async (req, res) => {
  const { nombre_usuario, rut, apellido, password, id_rol } = req.body;

  if (!nombre_usuario || !rut || !apellido || !password || !id_rol) {
    res.status(400).json({ error: 'Todos los campos son obligatorios: nombre_usuario, rut, apellido, password, id_rol' });
    return;
  }

  if (!validarRutChileno(rut)) {
    res.status(400).json({ 
      error: 'El RUT ingresado no es válido según el algoritmo chileno de módulo 11 (ejemplo: 12.345.678-9)' 
    });
    return;
  }

  const rutFormateado = formatearRutChileno(rut);

  try {
    const userExist = await queryOne('SELECT id_usuario FROM USUARIO WHERE nombre_usuario = ?;', [nombre_usuario.trim()]);
    if (userExist) {
      res.status(400).json({ error: 'El nombre de usuario ya está registrado en el sistema' });
      return;
    }

    const rutExist = await queryOne('SELECT id_usuario FROM USUARIO WHERE rut = ?;', [rutFormateado]);
    if (rutExist) {
      res.status(400).json({ error: 'El RUT ya se encuentra registrado para otro usuario' });
      return;
    }

    const rol = await queryOne('SELECT id_rol FROM ROL WHERE id_rol = ?;', [Number(id_rol)]);
    if (!rol) {
      res.status(400).json({ error: 'El rol seleccionado no es válido' });
      return;
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    const result = await run(`
      INSERT INTO USUARIO (id_rol, nombre_usuario, rut, apellido, password_hash, habilitado, intentos_fallidos)
      VALUES (?, ?, ?, ?, ?, 1, 0);
    `, [Number(id_rol), nombre_usuario.trim().toLowerCase(), rutFormateado, apellido.trim(), passwordHash]);

    res.status(201).json({
      message: 'Usuario creado exitosamente',
      usuario: {
        id_usuario: result.lastInsertRowid,
        nombre_usuario: nombre_usuario.trim().toLowerCase(),
        rut: rutFormateado,
        apellido: apellido.trim(),
        id_rol: Number(id_rol),
        habilitado: 1
      }
    });
  } catch (err) {
    console.error('[USUARIOS] Error al crear usuario:', err);
    res.status(500).json({ error: 'Error al registrar usuario en la base de datos' });
  }
});

/**
 * PUT /api/usuarios/:id
 */
usuariosRouter.put('/:id', authenticateJWT, requireRole('Administrador'), async (req, res) => {
  const id = Number(req.params.id);
  const { id_rol, apellido, password, habilitado } = req.body;

  try {
    const usuario = await queryOne('SELECT id_usuario FROM USUARIO WHERE id_usuario = ?;', [id]);
    if (!usuario) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    const updates = [];
    const params = [];

    if (id_rol !== undefined) {
      updates.push('id_rol = ?');
      params.push(Number(id_rol));
    }
    if (apellido !== undefined) {
      updates.push('apellido = ?');
      params.push(apellido.trim());
    }
    if (habilitado !== undefined) {
      updates.push('habilitado = ?');
      params.push(habilitado ? 1 : 0);
      if (habilitado) {
        updates.push('intentos_fallidos = 0');
      }
    }
    if (password && password.trim().length > 0) {
      const salt = bcrypt.genSaltSync(10);
      updates.push('password_hash = ?');
      params.push(bcrypt.hashSync(password, salt));
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No se enviaron campos para actualizar' });
      return;
    }

    params.push(id);
    await run(`UPDATE USUARIO SET ${updates.join(', ')} WHERE id_usuario = ?;`, params);

    res.json({ message: 'Usuario actualizado exitosamente' });
  } catch (err) {
    console.error('[USUARIOS] Error al actualizar usuario:', err);
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
});

/**
 * PUT /api/usuarios/:id/toggle-estado
 */
usuariosRouter.put('/:id/toggle-estado', authenticateJWT, requireRole('Administrador'), async (req, res) => {
  const id = Number(req.params.id);

  try {
    const usuario = await queryOne('SELECT id_usuario, habilitado FROM USUARIO WHERE id_usuario = ?;', [id]);
    if (!usuario) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    const nuevoEstado = usuario.habilitado === 1 ? 0 : 1;
    await run('UPDATE USUARIO SET habilitado = ?, intentos_fallidos = 0 WHERE id_usuario = ?;', [nuevoEstado, id]);

    res.json({ 
      message: `Usuario ${nuevoEstado === 1 ? 'habilitado' : 'inhabilitado'} exitosamente`,
      habilitado: nuevoEstado 
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al cambiar estado del usuario' });
  }
});
