import bcrypt from 'bcryptjs';
import { getDb, persistDb } from '../backend/config/db.js';

export async function seedDatabase(force = false) {
  const db = await getDb();

  const countRes = db.exec('SELECT COUNT(*) as count FROM INSPECCION;');
  const existingCount = countRes.length > 0 && countRes[0].values.length > 0 
    ? Number(countRes[0].values[0][0]) 
    : 0;

  if (existingCount >= 2000 && !force) {
    console.log(`[SEED] La base de datos ya contiene ${existingCount} inspecciones. Omitiendo seed.`);
    return;
  }

  console.log('[SEED] Iniciando población de datos para Aceros AZA...');

  db.run('PRAGMA foreign_keys = OFF;');
  db.run('DELETE FROM OBSERVACION;');
  db.run('DELETE FROM INSPECCION;');
  db.run('DELETE FROM BATCH;');
  db.run('DELETE FROM LOTE;');
  db.run('DELETE FROM RECETA;');
  db.run('DELETE FROM TURNO;');
  db.run('DELETE FROM USUARIO;');
  db.run('DELETE FROM ROL;');
  db.run('DELETE FROM sqlite_sequence;');
  db.run('PRAGMA foreign_keys = ON;');

  // 1. ROLES
  db.run(`
    INSERT INTO ROL (id_rol, nombre) VALUES
    (1, 'Administrador'),
    (2, 'Supervisor'),
    (3, 'Operador');
  `);

  // 2. USUARIOS (5 usuarios de prueba con hash bcrypt)
  const salt = bcrypt.genSaltSync(10);
  const hashAdmin = bcrypt.hashSync('admin123', salt);
  const hashSuper = bcrypt.hashSync('super123', salt);
  const hashOper = bcrypt.hashSync('oper123', salt);

  const stmtUser = db.prepare(`
    INSERT INTO USUARIO (id_usuario, id_rol, nombre_usuario, rut, apellido, password_hash, habilitado, intentos_fallidos)
    VALUES (?, ?, ?, ?, ?, ?, 1, 0);
  `);

  stmtUser.run([1, 1, 'admin', '11.111.111-1', 'Mancilla', hashAdmin]);
  stmtUser.run([2, 2, 'supervisor', '12.222.222-2', 'Castro', hashSuper]);
  stmtUser.run([3, 3, 'operador1', '13.333.333-3', 'Soto', hashOper]);
  stmtUser.run([4, 3, 'operador2', '14.444.444-4', 'Vargas', hashOper]);
  stmtUser.run([5, 3, 'operador3', '15.555.555-5', 'Navarro', hashOper]);
  stmtUser.free();

  // 3. RECETAS
  const recetas = [
    {
      id: 1,
      nombre: 'Alambrón 5.5mm Grado 1008',
      min: 12.0,
      max: 14.5,
      desde: '2026-01-01T00:00:00Z',
      hasta: null
    },
    {
      id: 2,
      nombre: 'Alambre Galvanizado 2.2mm',
      min: 10.5,
      max: 13.0,
      desde: '2026-01-01T00:00:00Z',
      hasta: null
    },
    {
      id: 3,
      nombre: 'Barra Trefilada Alta Resistencia 8.0mm',
      min: 14.0,
      max: 16.5,
      desde: '2026-01-01T00:00:00Z',
      hasta: null
    },
    {
      id: 4,
      nombre: 'Alambre Recocido Industrial 3.0mm',
      min: 11.0,
      max: 13.5,
      desde: '2026-01-01T00:00:00Z',
      hasta: null
    },
    {
      id: 5,
      nombre: 'Micro-alambre Especial 1.2mm (Versión Histórica)',
      min: 9.0,
      max: 11.5,
      desde: '2025-06-01T00:00:00Z',
      hasta: '2026-02-15T23:59:59Z'
    }
  ];

  const stmtReceta = db.prepare(`
    INSERT INTO RECETA (id_receta, nombre_receta, limite_minimo, limite_maximo, vigente_desde, vigente_hasta)
    VALUES (?, ?, ?, ?, ?, ?);
  `);
  for (const r of recetas) {
    stmtReceta.run([r.id, r.nombre, r.min, r.max, r.desde, r.hasta]);
  }
  stmtReceta.free();

  // 4. TURNOS
  db.run(`
    INSERT INTO TURNO (id_turno, nombre, hora_inicio, hora_fin) VALUES
    (1, 'Mañana', '08:00', '16:00'),
    (2, 'Tarde', '16:00', '00:00'),
    (3, 'Noche', '00:00', '08:00');
  `);

  // 5. LOTES (50 lotes)
  const stmtLote = db.prepare(`
    INSERT INTO LOTE (id_lote, id_turno, correlativo, fecha_creacion)
    VALUES (?, ?, ?, ?);
  `);

  const now = new Date('2026-10-12T10:00:00Z');
  const lotesFechas = [];

  for (let l = 1; l <= 50; l++) {
    const turnoId = ((l - 1) % 3) + 1;
    const daysAgo = Math.floor(((50 - l) / 50) * 60);
    const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    const correlativo = `LOT-2026-${String(l).padStart(3, '0')}`;
    const isoDate = date.toISOString();
    lotesFechas.push(isoDate);
    stmtLote.run([l, turnoId, correlativo, isoDate]);
  }
  stmtLote.free();

  // 6. BATCHES (200 batches: 4 por lote)
  const stmtBatch = db.prepare(`
    INSERT INTO BATCH (id_batch, id_lote, correlativo)
    VALUES (?, ?, ?);
  `);

  const letras = ['A', 'B', 'C', 'D'];
  let batchIdCounter = 1;
  for (let l = 1; l <= 50; l++) {
    for (let b = 0; b < 4; b++) {
      const correlativo = `BAT-${String(l).padStart(3, '0')}-${letras[b]}`;
      stmtBatch.run([batchIdCounter, l, correlativo]);
      batchIdCounter++;
    }
  }
  stmtBatch.free();

  // 7. INSPECCIONES (Exactamente 2.000 inspecciones)
  console.log('[SEED] Generando 2.000 inspecciones simuladas...');
  const stmtInsp = db.prepare(`
    INSERT INTO INSPECCION (id_inspeccion, angulo, estado, id_lote, id_batch, id_receta, fecha_hora)
    VALUES (?, ?, ?, ?, ?, ?, ?);
  `);

  const recetasActivas = recetas.slice(0, 4);

  let seed = 42;
  function random() {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  }

  const TOTAL_INSPECCIONES = 2000;
  const inspeccionesCreadas = [];

  for (let i = 1; i <= TOTAL_INSPECCIONES; i++) {
    const loteIndex = Math.min(49, Math.floor(((i - 1) / TOTAL_INSPECCIONES) * 50));
    const loteId = loteIndex + 1;
    const batchOffset = Math.floor(random() * 4);
    const batchId = (loteId - 1) * 4 + batchOffset + 1;

    const loteDate = new Date(lotesFechas[loteIndex]);
    const hoursOffset = (i % 24) + random() * 4;
    const inspDate = new Date(loteDate.getTime() + hoursOffset * 3600 * 1000);
    const fechaHora = inspDate.toISOString();

    const probTipo = random();

    let idReceta = null;
    let angulo = 0;
    let estado = 'aprobado';

    if (probTipo < 0.07) {
      idReceta = null;
      angulo = parseFloat((10.0 + random() * 6.0).toFixed(2));
      estado = 'sin receta';
    } else {
      const rec = recetasActivas[Math.floor(random() * recetasActivas.length)];
      idReceta = rec.id;
      const centro = (rec.min + rec.max) / 2;
      const semiRango = (rec.max - rec.min) / 2;

      if (probTipo < 0.07 + 0.15) {
        const salirPorAbajo = random() < 0.5;
        if (salirPorAbajo) {
          angulo = parseFloat((rec.min - 0.2 - random() * 1.8).toFixed(2));
        } else {
          angulo = parseFloat((rec.max + 0.2 + random() * 1.8).toFixed(2));
        }
        estado = 'rechazado';
      } else {
        const u1 = random();
        const u2 = random();
        const gaussian = Math.sqrt(-2.0 * Math.log(u1 || 0.001)) * Math.cos(2.0 * Math.PI * u2);
        const stdDev = semiRango * 0.45;
        let ang = centro + gaussian * stdDev;
        if (ang < rec.min) ang = rec.min + 0.05;
        if (ang > rec.max) ang = rec.max - 0.05;
        angulo = parseFloat(ang.toFixed(2));
        estado = 'aprobado';
      }
    }

    stmtInsp.run([i, angulo, estado, loteId, batchId, idReceta, fechaHora]);
    inspeccionesCreadas.push({ id: i, angulo, estado, loteId });
  }
  stmtInsp.free();

  // 8. OBSERVACIONES (200 observaciones asociadas)
  console.log('[SEED] Generando 200 observaciones asociadas...');
  const textosObservacion = [
    'Ángulo fuera de tolerancia por desgaste prematuro en hilera de diamante policristalino.',
    'Verificado con calibre óptico. Se autoriza reproceso para este batch del lote.',
    'Ligera variación térmica en cabezal de trefilado #3. Parámetro corregido tras reajuste.',
    'Muestra tomada al inicio de bobina tras cambio de matriz de carburo de tungsteno.',
    'Se detiene línea 10 minutos para lubricación de emulsionado y calibración de troquel.',
    'Revisión solicitada por operador de turno. Aprobado bajo criterio de tolerancia B.',
    'Ángulo dentro de tolerancia óptima. Acabado superficial de alta uniformidad.',
    'Microfisura superficial descartada en ensayo no destructivo.',
    'Cambio de cono de reducción completado. Inspección post-mantenimiento conforme.',
    'Alambre sin receta activa al momento del registro. Se coordina validación con Ingeniería metalúrgica.',
    'Tensión de bobinado reajustada para mitigar deformación angular.',
    'Lote conforme para despacho hacia planta de trefilación secundaria.'
  ];

  const stmtObs = db.prepare(`
    INSERT INTO OBSERVACION (id_observacion, id_inspeccion, id_usuario, texto, fecha_hora)
    VALUES (?, ?, ?, ?, ?);
  `);

  const inspeccionesElegibles = inspeccionesCreadas.filter(insp => insp.estado !== 'aprobado');
  const inspeccionesNormales = inspeccionesCreadas.filter(insp => insp.estado === 'aprobado');

  for (let o = 1; o <= 200; o++) {
    let inspSelected;
    if (random() < 0.7 && inspeccionesElegibles.length > 0) {
      inspSelected = inspeccionesElegibles[Math.floor(random() * inspeccionesElegibles.length)];
    } else {
      inspSelected = inspeccionesNormales[Math.floor(random() * inspeccionesNormales.length)];
    }

    const idUsuario = random() < 0.65 ? 2 : (3 + Math.floor(random() * 3));
    const texto = textosObservacion[Math.floor(random() * textosObservacion.length)];
    const obsDate = new Date(now.getTime() - Math.floor(random() * 45) * 24 * 3600 * 1000);
    const fechaHora = obsDate.toISOString();

    stmtObs.run([o, inspSelected.id, idUsuario, texto, fechaHora]);
  }
  stmtObs.free();

  persistDb();
  console.log(`[SEED] Población completada con éxito:
  - 3 Roles
  - 5 Usuarios de prueba
  - 5 Recetas de trefilado
  - 3 Turnos
  - 50 Lotes
  - 200 Batches (4 por lote)
  - 2.000 Inspecciones (con estados calculados e inmutables)
  - 200 Observaciones`);
}

if (process.argv[1]?.endsWith('seed.js')) {
  seedDatabase(true).catch(console.error);
}
