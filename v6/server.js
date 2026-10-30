import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb } from './backend/config/db.js';
import { seedDatabase } from './db/seed.js';
import { authRouter } from './backend/modules/auth/auth.controller.js';
import { inspeccionesRouter } from './backend/modules/inspecciones/inspecciones.controller.js';
import { observacionesRouter } from './backend/modules/observaciones/observaciones.controller.js';
import { recetasRouter } from './backend/modules/recetas/recetas.controller.js';
import { usuariosRouter } from './backend/modules/usuarios/usuarios.controller.js';
import { dashboardRouter } from './backend/modules/dashboard/dashboard.controller.js';
import { databaseRouter } from './backend/modules/database/database.controller.js';
import { simuladorRouter } from './backend/modules/simulador/simulador.controller.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  console.log('[SISTEMA] Inicializando SQLite (trefilado.db)...');
  await getDb();
  await seedDatabase(false);

  // Registro de rutas API REST
  app.use('/api/auth', authRouter);
  app.use('/api/inspecciones', inspeccionesRouter);
  app.use('/api/observaciones', observacionesRouter);
  app.use('/api/recetas', recetasRouter);
  app.use('/api/usuarios', usuariosRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/database', databaseRouter);
  app.use('/api/simulador', simuladorRouter);

  // Endpoint de verificación de salud
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'OK',
      sistema: 'Sistema Web de Monitoreo y Trazabilidad del Trefilado',
      empresa: 'Aceros AZA',
      desarrolladores: ['Lancelot Castro', 'Rodrigo Mancilla'],
      timestamp: new Date().toISOString()
    });
  });

  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('[SISTEMA] Vite montado en Express en modo desarrollo (JavaScript puro).');
  } 
  // else {
  //  const distPath = path.resolve(__dirname, 'dist');
  //  app.use(express.static(distPath));
  //  app.get('*', (_req, res) => {
  //    res.sendFile(path.resolve(distPath, 'index.html'));
  //  });
  //  console.log('[SISTEMA] Sirviendo frontend estático desde /dist.');
  // }

  app.listen(PORT, () => {
    console.log(`[SISTEMA] Servidor corriendo en http://localhost:${PORT}`);
    console.log(`[SISTEMA] Aceros AZA — Monitoreo de Trefilado listo en Node.js + Express (JavaScript).`);
  });
}

startServer().catch((err) => {
  console.error('[FATAL] Error al iniciar el servidor:', err);
  process.exit(1);
});
