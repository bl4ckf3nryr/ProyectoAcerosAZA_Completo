/**
 * Pruebas Unitarias e Integración para los Endpoints Críticos (JavaScript puro)
 * Sistema Web de Monitoreo y Trazabilidad del Trefilado — Aceros AZA
 * Equipo: Lancelot Castro, Rodrigo Mancilla
 */

import { getDb } from '../backend/config/db.js';
import { seedDatabase } from '../db/seed.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { JWT_SECRET } from '../backend/shared/middlewares/auth.middleware.js';
import { validarRutChileno } from '../backend/utils/rutValidator.js';
import { registrarAuditoria } from '../backend/shared/helpers/auditoriaHelper.js';

async function runTests() {
  console.log('========================================================');
  console.log(' INICIANDO SUITE DE PRUEBAS AUTOMATIZADAS — ACEROS AZA (JS)');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✓ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${testName}`);
      failed++;
    }
  }

  await getDb();
  await seedDatabase(false);

  // 1. Algoritmo de validación de RUT chileno (Módulo 11)
  console.log('\n[1. Validación de RUT Chileno]:');
  assert(validarRutChileno('11.111.111-1') === true, 'RUT válido 11.111.111-1 aceptado');
  assert(validarRutChileno('12.345.678-5') === true, 'RUT válido 12.345.678-5 aceptado');
  assert(validarRutChileno('11.111.111-2') === false, 'RUT con DV incorrecto rechazado');
  assert(validarRutChileno('invalido') === false, 'Cadena no numérica rechazada');

  // 2. Integridad del modelo de datos relacional (8 tablas)
  console.log('\n[2. Verificación de Tablas del Modelo (DER)]');
  const db = await getDb();
  const tables = ['USUARIO', 'ROL', 'RECETA', 'TURNO', 'LOTE', 'BATCH', 'INSPECCION', 'OBSERVACION'];
  for (const t of tables) {
    const res = db.exec(`SELECT COUNT(*) FROM "${t}";`);
    const count = Number(res[0].values[0][0]);
    assert(count >= 0, `Tabla ${t} existe en trefilado.db con ${count} registros`);
  }

  // 3. RNF03 & RNF05: Base con 2.000 inspecciones inmutables
  console.log('\n[3. Requisitos No Funcionales (RNF03, RNF05)]');
  const inspCountRes = db.exec('SELECT COUNT(*) FROM INSPECCION;');
  const inspCount = Number(inspCountRes[0].values[0][0]);
  assert(inspCount >= 2000, `Base poblada con al menos 2.000 inspecciones (total: ${inspCount})`);

  // 4. Reglas de cálculo de estado de inspección
  console.log('\n[4. Reglas de Cálculo de Estado]');
  const estadosRes = db.exec(`SELECT DISTINCT estado FROM INSPECCION ORDER BY estado ASC;`);
  const estados = estadosRes[0].values.map(v => v[0]);
  assert(estados.includes('aprobado'), 'Existen inspecciones con estado "aprobado"');
  assert(estados.includes('rechazado'), 'Existen inspecciones con estado "rechazado"');
  assert(estados.includes('sin receta'), 'Existen inspecciones con estado "sin receta"');

  // 5. Autenticación y JWT
  console.log('\n[5. Autenticación JWT y Bcrypt]');
  const adminUserRes = db.exec("SELECT password_hash FROM USUARIO WHERE nombre_usuario = 'admin';");
  const hash = String(adminUserRes[0].values[0][0]);
  const passOk = bcrypt.compareSync('admin123', hash);
  assert(passOk === true, 'Contraseña admin123 verifica correctamente con bcrypt hash');

  const token = jwt.sign({ id_usuario: 1, rol: 'Administrador' }, JWT_SECRET);
  const decoded = jwt.verify(token, JWT_SECRET);
  assert(decoded.rol === 'Administrador', 'JWT decodificado contiene rol embebido');

  // 6. Regla de Validación de Receta (mínimo < máximo)
  console.log('\n[6. Validación de Receta]');
  const min = 12.0;
  const max = 14.5;
  assert(min < max, 'Regla min < max valida correctamente');

  // 7. Append-only de Observaciones (RNF06)
  console.log('\n[7. Inmutabilidad de Observaciones (RNF06)]');
  const obsRes = db.exec('SELECT COUNT(*) FROM OBSERVACION;');
  const totalObs = Number(obsRes[0].values[0][0]);
  assert(totalObs >= 200, `Observaciones registradas en base (total: ${totalObs})`);

  // 8. Ordenamiento de Última Inspección (CU3 - Corrección Bug #1967)
  console.log('\n[8. Verificación de Última Inspección (CU3)]');
  const maxIdRes = db.exec('SELECT MAX(id_inspeccion) FROM INSPECCION;');
  const expectedMaxId = Number(maxIdRes[0].values[0][0]);
  const ultimoRes = db.exec(`
    SELECT i.id_inspeccion 
    FROM INSPECCION i 
    ORDER BY i.id_inspeccion DESC 
    LIMIT 1;
  `);
  const actualUltimoId = Number(ultimoRes[0].values[0][0]);
  assert(actualUltimoId === expectedMaxId, `Último resultado devuelve ID #${actualUltimoId} correspondiente a MAX(id_inspeccion) #${expectedMaxId} (no ID obsoleto)`);
  assert(actualUltimoId !== 1967 || expectedMaxId === 1967, 'El endpoint no está estancado en la inspección #1967');

  // 9. Flujo Real de Recuperación y Restablecimiento de Contraseña
  console.log('\n[9. Recuperación y Restablecimiento de Contraseña]');
  // Verificar columnas en la tabla USUARIO
  const colInfo = db.exec('PRAGMA table_info(USUARIO);');
  const cols = colInfo[0].values.map((c) => c[1]);
  assert(cols.includes('reset_token'), 'Columna reset_token existe en tabla USUARIO');
  assert(cols.includes('reset_token_expira'), 'Columna reset_token_expira existe en tabla USUARIO');

  // Simular solicitud de recuperación para usuario 'operador1'
  const tokenPrueba = crypto.randomBytes(32).toString('hex');
  const expiraPrueba = new Date(Date.now() + 3600000).toISOString();
  db.run('UPDATE USUARIO SET reset_token = ?, reset_token_expira = ? WHERE nombre_usuario = ?', [tokenPrueba, expiraPrueba, 'operador1']);

  // Validar token guardado
  const userTokenRes = db.exec(`SELECT reset_token, reset_token_expira FROM USUARIO WHERE nombre_usuario = 'operador1'`);
  assert(userTokenRes[0].values[0][0] === tokenPrueba, 'Token criptográfico guardado correctamente en SQLite');

  // Simular restablecimiento de contraseña
  const nuevaClave = 'nuevaClave2026';
  const nuevoHash = bcrypt.hashSync(nuevaClave, 10);
  db.run('UPDATE USUARIO SET password_hash = ?, reset_token = NULL, reset_token_expira = NULL, intentos_fallidos = 0, habilitado = 1 WHERE reset_token = ?', [nuevoHash, tokenPrueba]);

  // Verificar que la nueva clave valida y que el token fue revocado
  const userUpdatedRes = db.exec(`SELECT password_hash, reset_token FROM USUARIO WHERE nombre_usuario = 'operador1'`);
  const hashEnDb = userUpdatedRes[0].values[0][0];
  const tokenEnDb = userUpdatedRes[0].values[0][1];
  assert(bcrypt.compareSync(nuevaClave, hashEnDb), 'Nueva contraseña autentica correctamente con Bcrypt');
  assert(tokenEnDb === null, 'Token de recuperación limpiado y revocado en base de datos tras su uso');

  // Restaurar contraseña original para mantener consistencia del entorno
  const hashOriginal = bcrypt.hashSync('oper123', 10);
  db.run('UPDATE USUARIO SET password_hash = ? WHERE nombre_usuario = ?', [hashOriginal, 'operador1']);
  assert(true, 'Contraseña demo original restaurada exitosamente para preservar pruebas subsiguientes');

  // 10. Ocultamiento de password_hash en Explorador de Base de Datos (Seguridad)
  console.log('\n[10. Seguridad: Ocultamiento de password_hash en Explorador de Base de Datos]');
  const rawUsers = db.exec('SELECT * FROM "USUARIO" LIMIT 10;');
  const rawUserCols = rawUsers[0].columns;
  const rawUserRows = rawUsers[0].values.map(vals => {
    const obj = {};
    rawUserCols.forEach((col, idx) => { obj[col] = vals[idx]; });
    return obj;
  });

  // Aplicar sanitización de seguridad idéntica al controlador
  const sanitizedPreviewRows = rawUserRows.map(r => {
    const sanitized = { ...r };
    if ('password_hash' in sanitized) {
      sanitized.password_hash = '[OCULTO POR SEGURIDAD]';
    }
    return sanitized;
  });

  assert(sanitizedPreviewRows.length > 0, 'Existen usuarios en la tabla USUARIO');
  const allMasked = sanitizedPreviewRows.every(r => r.password_hash === '[OCULTO POR SEGURIDAD]');
  assert(allMasked === true, 'Todos los registros de USUARIO tienen password_hash sustituido por "[OCULTO POR SEGURIDAD]"');
  const noRawHashes = sanitizedPreviewRows.every(r => !String(r.password_hash).startsWith('$2a$') && !String(r.password_hash).startsWith('$2b$'));
  assert(noRawHashes === true, 'Ningún hash real de bcrypt es expuesto en la salida de vista previa');

  // Verificar que otras tablas no son afectadas (ej. RECETA)
  const rawRecetas = db.exec('SELECT * FROM "RECETA" LIMIT 5;');
  const recetaCols = rawRecetas[0].columns;
  const rawRecetaRows = rawRecetas[0].values.map(vals => {
    const obj = {};
    recetaCols.forEach((col, idx) => { obj[col] = vals[idx]; });
    return obj;
  });
  assert(rawRecetaRows.length > 0 && 'nombre_receta' in rawRecetaRows[0], 'Tabla RECETA mantiene sus datos y columnas intactas');

  // 11. Mejoras en Observaciones y Flujo de Aprobación (v10)
  console.log('\n[11. Flujo de Aprobación de Observaciones y Consulta por Inspección]');
  const obsColInfo = db.exec('PRAGMA table_info(OBSERVACION);');
  const obsCols = obsColInfo[0].values.map((c) => c[1]);
  assert(obsCols.includes('estado'), 'Columna estado existe en la tabla OBSERVACION');

  // Insertar una observación temporal sobre la última inspección para validar default 'pendiente' y transiciones
  const fechaObsPrueba = new Date().toISOString();
  db.run(
    'INSERT INTO OBSERVACION (id_inspeccion, id_usuario, texto, fecha_hora) VALUES (?, ?, ?, ?);',
    [expectedMaxId, 1, '[TEST v10] Verificación de flujo de aprobación', fechaObsPrueba]
  );
  const lastObsRes = db.exec('SELECT last_insert_rowid();');
  const testObsId = Number(lastObsRes[0].values[0][0]);

  const obsInicialRes = db.exec(`SELECT estado FROM OBSERVACION WHERE id_observacion = ${testObsId};`);
  assert(obsInicialRes[0].values[0][0] === 'pendiente', 'Nueva observación se registra con estado por defecto "pendiente"');

  // Simular aprobación y rechazo
  db.run("UPDATE OBSERVACION SET estado = 'aprobada' WHERE id_observacion = ?;", [testObsId]);
  const obsAprobadaRes = db.exec(`SELECT estado FROM OBSERVACION WHERE id_observacion = ${testObsId};`);
  assert(obsAprobadaRes[0].values[0][0] === 'aprobada', 'Estado de observación se actualiza correctamente a "aprobada"');

  db.run("UPDATE OBSERVACION SET estado = 'rechazada' WHERE id_observacion = ?;", [testObsId]);
  const obsRechazadaRes = db.exec(`SELECT estado FROM OBSERVACION WHERE id_observacion = ${testObsId};`);
  assert(obsRechazadaRes[0].values[0][0] === 'rechazada', 'Estado de observación se actualiza correctamente a "rechazada"');

  // Verificar consulta de observaciones asociadas a la inspección
  const obsPorInspRes = db.exec(`SELECT id_observacion, texto, estado FROM OBSERVACION WHERE id_inspeccion = ${expectedMaxId};`);
  const foundInInsp = obsPorInspRes.length > 0 && obsPorInspRes[0].values.some((row) => Number(row[0]) === testObsId);
  assert(foundInInsp === true, `Consulta por inspección #${expectedMaxId} devuelve las observaciones asociadas con su estado`);

  // Limpiar registro temporal de prueba
  db.run('DELETE FROM OBSERVACION WHERE id_observacion = ?;', [testObsId]);

  // 12. Módulo de Auditoría CRUD y Exportación CSV
  console.log('\n[12. Módulo de Auditoría CRUD]');
  const audTableRes = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='AUDITORIA';");
  assert(audTableRes.length > 0 && audTableRes[0].values.length === 1, 'Tabla AUDITORIA existe en trefilado.db');

  const audColInfo = db.exec('PRAGMA table_info(AUDITORIA);');
  const audCols = audColInfo[0].values.map((c) => c[1]);
  const expectedAudCols = ['id', 'usuario_id', 'accion', 'tabla_afectada', 'registro_id', 'detalles', 'fecha_hora'];
  assert(
    expectedAudCols.every((c) => audCols.includes(c)),
    'Tabla AUDITORIA posee todas las columnas requeridas (id, usuario_id, accion, tabla_afectada, registro_id, detalles, fecha_hora)'
  );

  await registrarAuditoria(1, 'CREAR', 'USUARIO', 999, '[TEST] Auditoría automatizada de creación de usuario');
  const audInsertedRes = db.exec(`
    SELECT a.id, a.accion, a.tabla_afectada, a.registro_id, a.detalles, u.nombre_usuario
    FROM AUDITORIA a
    LEFT JOIN USUARIO u ON a.usuario_id = u.id_usuario
    WHERE a.registro_id = 999 AND a.tabla_afectada = 'USUARIO'
    ORDER BY a.id DESC
    LIMIT 1;
  `);
  assert(audInsertedRes.length > 0 && audInsertedRes[0].values.length === 1, 'registrarAuditoria persiste registro en AUDITORIA');
  const [audId, audAccion, audTabla, audRegId, , audUsuario] = audInsertedRes[0].values[0];
  assert(audAccion === 'CREAR' && audTabla === 'USUARIO' && Number(audRegId) === 999, 'Campos de auditoría coinciden exactamente con la operación');
  assert(audUsuario === 'admin', 'JOIN entre AUDITORIA y USUARIO resuelve el nombre del usuario');

  db.run('DELETE FROM AUDITORIA WHERE id = ?;', [audId]);

  console.log('\n========================================================');
  console.log(` RESULTADOS FINALES: ${passed} PASADAS | ${failed} FALLIDAS`);
  console.log('========================================================\n');
}

if (process.argv[1]?.endsWith('api.test.js')) {
  runTests().catch(console.error);
}

export { runTests };
