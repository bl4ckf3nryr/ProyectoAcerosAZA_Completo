import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const PORT = Number(process.env.PORT) || 3000;
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const JWT_SECRET = process.env.JWT_SECRET || 'aza-trefilado-jwt-secret-2026-cambiar-en-produccion';
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8';
export const SERVICE_TOKEN = process.env.SERVICE_TOKEN || 'AZA-TREFILADO-SERVICE-TOKEN-2026';
export const DB_PATH = process.env.DB_PATH || path.resolve(process.cwd(), 'db', 'trefilado.db');
export const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';
export const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
