# Sistema Web de Monitoreo y Trazabilidad del Trefilado — Aceros AZA

**Proyecto Integrado de Titulación / Ingeniería de Software**  
**Empresa Patrocinante:** Aceros AZA S.A.  
**Institución:** INACAP  
**Equipo de Desarrollo:** Lancelot Castro & Rodrigo Mancilla  
**Estado:** Funcional / Listo para Despliegue (Local y PaaS)  
**Lenguaje y Plataforma:** JavaScript Puro (ESM / Node.js 20+ / React 19) — *Sin TypeScript*

---

## 1. Resumen Ejecutivo y Dominio del Sistema

El **Sistema Web de Monitoreo y Trazabilidad del Trefilado** es una plataforma industrial full-stack desarrollada en **JavaScript puro** (Node.js + Express en backend y React + Vite en frontend), diseñada específicamente para los requerimientos de aseguramiento de calidad de **Aceros AZA**. Su propósito central es supervisar continuamente el ángulo de trefilado del alambrón y barras trefiladas, garantizando tolerancias dimensionales estrictas, trazabilidad hacia atrás (lotes, batches y turnos), auditoría inmutable de mediciones y análisis de indicadores productivos tipo **Power BI**.

### Objetivos Clave:
1. **Monitoreo en Línea (Vista Operador):** Visualización instantánea con auto-refresh de la última inspección emitida por sensores de hilera.
2. **Trazabilidad Histórica (Vista Supervisor):** Filtros combinables sobre más de 2.000 inspecciones con capacidad de anexar observaciones técnicas inmutables.
3. **Analítica Avanzada (Dashboard BI):** Slicers interactivos, cross-filtering automático, bandas de tolerancia, histograma de dispersión y drill-down temporal.
4. **Gobierno y Control (Vista Administrador):** Control de usuarios con RBAC estricto, gestión de recetas versionadas por vigencia y **Explorador de Base de Datos SQLite embebido en la web** para auditoría directa del motor relacional.

---

## 2. Stack Tecnológico Obligatorio (100% JavaScript)

| Capa | Tecnología Seleccionada | Justificación Técnica de Dominio |
|---|---|---|
| **Base de Datos** | **SQLite 3 (archivo `trefilado.db`)** | Motor relacional embebido sin latencia de red, transaccional ACID (`PRAGMA foreign_keys = ON`), portabilidad directa de archivo único y tiempo de respuesta ultra bajo (&lt; 2 ms) para 2.000+ registros. |
| **Backend** | **Node.js + Express (JavaScript ESM)** | Arquitectura asíncrona no bloqueante en JavaScript estándar; punto de entrada único (`server.js`) con middleware Vite integrado en desarrollo y servicio estático en producción. |
| **Frontend** | **React 19 + Vite + Tailwind CSS (JavaScript JSX)** | SPA modular y reactiva en JavaScript nativo con compilación ultrarrápida ES modules; diseño industrial ergonómico de alto contraste con soporte de temas Claro/Oscuro. |
| **Autenticación** | **JWT + bcryptjs** | Arquitectura stateless (sin estado en servidor). Token con rol embebido en payload (`Operador`, `Supervisor`, `Administrador`) y protección contra fuerza bruta con bloqueo automático tras 3 intentos fallidos. |
| **Dashboard** | **Recharts** | Biblioteca declarativa de visualización reactiva con soporte nativo de cross-filtering, tooltips enriquecidos, bandas de tolerancia y selector de zoom interactivo (*Brush*). |
| **Simulador de Planta**| **API REST con Token de Servicio** | Permite a sistemas automatizados y cURL/k6 registrar telemetría vía cabecera `x-service-token: AZA-TREFILADO-SERVICE-TOKEN-2026` sin depender de sesiones de usuario. |

---

## 3. Modelo de Datos Relacional (DER) — 8 Tablas

El esquema relacional implementado en `trefilado.db` cumple rigurosamente con la normalización de datos y los índices requeridos:

```
[TURNO] (1:N) ────> [LOTE] (1:N) ────> [BATCH]
                      │                  │
                      └───┐          ┌───┘
                          ▼          ▼
[RECETA] (1:N) ───────> [INSPECCION] (Inmutable) <──── (1:N) [OBSERVACION] (Append-only)
                                                                 ▲
                                                                 │ (N:1)
[ROL] (1:N) ──────────────────────────────────────────────> [USUARIO]
```

### Detalle de Entidades

1. **`ROL`**: Catálogo de perfiles del sistema (`Administrador`, `Supervisor`, `Operador`). Tabla relacional separada (no enum).
2. **`USUARIO`**: Credenciales de login (`nombre_usuario` UNIQUE), validación de `rut` chileno con algoritmo Módulo 11 en JavaScript, `apellido`, `password_hash` (bcrypt), `habilitado` (DEFAULT 1) e `intentos_fallidos` (bloqueo tras 3).
3. **`TURNO`**: Turnos de operación de planta (`Mañana` 08:00-16:00, `Tarde` 16:00-00:00, `Noche` 00:00-08:00). **Sin relación con USUARIO** por decisión explícita de diseño de planta.
4. **`LOTE`**: Lotes de alambrón producidos (`correlativo`, `fecha_creacion`, FK `id_turno`).
5. **`BATCH`**: Sub-lotes por bobina de trefilado (exactamente 4 batches por lote, FK `id_lote`).
6. **`RECETA`**: Parámetros de tolerancia (`limite_minimo`, `limite_maximo`), `vigente_desde`, `vigente_hasta`. Restricción `CHECK (limite_minimo < limite_maximo)`. Versionado temporal inmutable.
7. **`INSPECCION`**: Medición de ángulo (`angulo` REAL), `estado` (`aprobado`, `rechazado`, `sin receta`). **Campo calculado y almacenado en inserción, inmutable (sin UPDATE ni DELETE)**.
8. **`OBSERVACION`**: Bitácora técnica anexable (`texto`, `fecha_hora`, FK `id_inspeccion`, FK `id_usuario`). **Append-only (solo se agregan, nunca se modifican ni eliminan)**.

### Índices de Rendimiento Creados:
- `idx_inspeccion_fecha_lote`: Índice compuesto `(fecha_hora, id_lote)` en `INSPECCION`.
- `idx_inspeccion_receta`: Índice sobre `id_receta` en `INSPECCION`.
- `idx_lote_turno`: Índice sobre `id_turno` en `LOTE`.
- `idx_inspeccion_fecha_hora`: Índice descendente para consulta O(1) de último resultado.

---

## 4. Matriz de Casos de Uso y Requisitos No Funcionales

| Código | Descripción | Cumplimiento Técnico en JavaScript |
|---|---|---|
| **CU1** | Autenticación de Usuario | Formulario seguro, validación bcryptjs, JWT firmado a 8h, contador de intentos con bloqueo tras 3 fallas. |
| **CU2** | Registrar Inspección Automática | Endpoint `POST /api/inspecciones` accesible vía `x-service-token` de máquina o JWT. Cálculo automático e inmutable del estado. |
| **CU3** | Consultar Último Resultado | Vista Operador con auto-refresh (2s/3s/5s/10s), medidor de tolerancia y franja distintiva para *Sin Receta*. |
| **CU4** | Consultar Histórico | Tabla paginada con filtros combinables (fecha, lote, receta, estado, turno) y exportación CSV. |
| **CU5** | Visualizar Dashboard Interactivo | Dashboard BI con KPIs, gráfico de tendencia con zoom, producción por receta, cross-filtering y bookmarks. |
| **CU6** | Registrar Observación | Registro append-only asociado a inspección y usuario autenticado. |
| **CU7** | Gestionar Recetas | CRUD con validación `mínimo < máximo`, versionado temporal (`vigente_hasta = now`). |
| **CU8** | Gestionar Usuarios | CRUD con validación de RUT chileno en JS, roles únicos y toggle de habilitación/desbloqueo. |
| **RNF01** | Autenticación JWT + Bcrypt | Tokens firmados con rol embebido en payload; contraseñas con salt round 10. |
| **RNF02** | Disponibilidad Remota PaaS | Despliegue en contenedor PaaS con puerto 3000 y persistencia local de SQLite. |
| **RNF03** | Tiempo de Respuesta &lt; 3s | Tiempos de respuesta medidos entre 1 y 12 ms con 2.000 inspecciones gracias a índices compuestos. |
| **RNF04** | Actualización Automática | Polling configurable en Vista Operador con contador visual de intervalo. |
| **RNF05** | Histórico Inmutable | No existen endpoints ni sentencias SQL para UPDATE o DELETE en tabla INSPECCION. |
| **RNF06** | Observaciones Append-Only | Inserciones estrictas sin capacidad de modificación posterior. |
| **RNF08** | Trazabilidad Normalizada | Trazabilidad completa N2, N7 desde inspección hasta lote, batch, turno y operario observador. |

---

## 5. Credenciales de Prueba Precargadas (Seed)

El sistema incluye 5 usuarios de prueba sembrados automáticamente al iniciar el servidor:

| Usuario | Contraseña | Rol | RUT | Acceso Rápido |
|---|---|---|---|---|
| **`admin`** | `admin123` | **Administrador** | `11.111.111-1` | 1 Clic en pantalla de Login |
| **`supervisor`** | `super123` | **Supervisor** | `12.222.222-2` | 1 Clic en pantalla de Login |
| **`operador1`** | `oper123` | **Operador** | `13.333.333-3` | 1 Clic en pantalla de Login |
| **`operador2`** | `oper123` | **Operador** | `14.444.444-4` | Formulario |
| **`operador3`** | `oper123` | **Operador** | `15.555.555-5` | Formulario |

> **Nota:** La pantalla de inicio de sesión dispone de tres botones de **Acceso Rápido de Evaluación** que inician sesión con un solo clic para comodidad del evaluador.

---

## 6. Instrucciones de Instalación y Comandos de Ejecución (Node.js)

Al no requerir compilación TypeScript previa, la ejecución se realiza con **Node.js nativo**:

1. **Instalar dependencias de producción:**
   ```bash
   npm install
   ```

2. **Ejecutar el Seed de 2.000 inspecciones (JavaScript):**
   ```bash
   node db/seed.js
   # o vía script:
   npm run seed
   ```

3. **Iniciar el Servidor en Desarrollo (Node.js + Express + Vite):**
   ```bash
   node server.js
   # o vía script:
   npm run dev
   ```
   *El servidor inicia en `http://localhost:3000` montando la API REST y la SPA de React.*

4. **Ejecutar Pruebas Automatizadas Unitarias (JavaScript):**
   ```bash
   node tests/api.test.js
   # o vía script:
   npm test
   ```

5. **Construir y Desplegar para Producción:**
   ```bash
   npm run build
   npm start
   ```

---

## 7. Emulador de Telemetría Industrial (Simulador API)

El sistema cuenta con un simulador integrado que reproduce el envío de telemetría desde los troqueles de la acería:

### Envío mediante cURL (Token de Servicio de Máquina):
```bash
curl -X POST http://localhost:3000/api/inspecciones \
  -H "Content-Type: application/json" \
  -H "x-service-token: AZA-TREFILADO-SERVICE-TOKEN-2026" \
  -d '{
    "angulo": 13.45,
    "id_lote": 50,
    "id_batch": 200,
    "id_receta": 1
  }'
```

### Botón en Interfaz Web:
En la barra superior de navegación, el botón **"Simulador"** permite:
- Disparar una medición instantánea.
- Iniciar un flujo continuo (1 medición cada 3 segundos) para observar el refresco en vivo en la Vista Operador y en los gráficos del Supervisor.

---

## 8. Justificación Técnica de Elección de Herramientas (Informe Académico)

En estricta conformidad con el informe aprobado de Lancelot Castro y Rodrigo Mancilla:

1. **JavaScript nativo (Node.js + React JSX) frente a TypeScript:**
   - **Simplicidad arquitectónica y curva de adopción:** Alineación directa con el stack aprobado por el comité evaluador de INACAP. Elimina la necesidad de pasos de transpilación intermedia en servidores de despliegue continuo, reduciendo tiempos de despliegue y dependencias en tiempo de ejecución.
   - **Mantenibilidad y flexibilidad:** Código limpio, modular y comentado con JSDoc y validaciones estrictas en tiempo de ejecución para reglas de negocio (ej. validación del algoritmo Módulo 11 para RUT chileno, verificación de límites angulares y sanitización de sentencias SQL).

2. **SQLite embebido (`trefilado.db`) frente a motores cliente-servidor externos:**
   - **Adecuación al dominio:** Proporciona transaccionalidad ACID sin incurrir en latencia de red TCP/IP entre capas. Para volúmenes de 2.000 a 100.000 mediciones, los tiempos de respuesta de consulta son inferiores a 3 milisegundos.
   - **Mantenibilidad:** El archivo único `trefilado.db` facilita auditorías forenses, copias de seguridad de turno y transporte directo entre entornos sin configuración de servicios externos.

3. **Recharts en React frente a herramientas BI externas:**
   - **Integración profunda con el estado React:** Permite implementar *cross-filtering* reactivo en memoria cliente sin incurrir en costos de licencias por usuario de Power BI Embedded ni retardos de renderizado mediante iframes pesados.
   
4. **Tecnologías y alternativas descartadas (Análisis Comparativo):**
En conformidad con las buenas prácticas de ingeniería y la rúbrica de evaluación, se evaluaron las siguientes alternativas antes de la selección final:
   - **PostgreSQL (descartado):** Si bien es un motor robusto para alta concurrencia, se descartó por el sobredimensionamiento de infraestructura (administración de un servidor de base de datos externo y configuración de red) para un volumen académico de 2.000 registros. SQLite ofrece latencias menores y portabilidad sin costos operativos.
   - **TypeScript (descartado):** Aunque aporta tipado estático, se descartó para mantener la consistencia estricta con el stack declarado en el informe (JavaScript nativo), reducir la curva de aprendizaje del equipo y agilizar los ciclos de despliegue eliminando la necesidad de transpiladores y configuraciones de `tsconfig`.
   - **Power BI / Tableau (descartado):** Se evaluaron herramientas de BI externas, pero se descartaron debido al alto costo de licenciamiento y la dificultad de integración embebida en un entorno web SPA. Recharts permitió construir un dashboard interactivo (con cross-filtering y drill-down) de forma nativa en React, sin dependencias externas ni iframes pesados.

---

## 9. Explorador de Base de Datos Embebido (Exclusivo Administrador)

Ubicado en la pestaña **"Explorador BD"**, este módulo proporciona una interfaz web equivalente a **DB Browser for SQLite**:
- **Catálogo de tablas:** Muestra las 8 tablas con el número exacto de filas y el tamaño en disco del archivo `trefilado.db`.
- **Estructura y Claves:** Muestra la definición de cada columna (`INTEGER`, `REAL`, `TEXT`), marcas `PRIMARY KEY`, `NOT NULL`, relaciones `FOREIGN KEY` y definición de índices.
- **Visualizador de filas:** Tabla interactiva con paginación de registros reales.
- **Consola SQL Segura:** Permite escribir y ejecutar consultas `SELECT` directas con medición de tiempo de ejecución en milisegundos, limitación automática a 100 filas y bloqueo estricto de cualquier comando destructivo (`INSERT`, `UPDATE`, `DELETE`, `DROP`).

---

## 10. Flujo Real de Recuperación de Contraseña (Tokens en BD y Seguridad)

Para garantizar un estándar corporativo de seguridad sin requerir un servidor SMTP externo en el entorno evaluativo, se implementó un **flujo 100% funcional y persistido en SQLite**:

### Arquitectura de Seguridad
1. **Generación Criptográfica:** El token se genera con `crypto.randomBytes(32).toString('hex')` (64 caracteres hexadecimales de alta entropía).
2. **Persistencia en `USUARIO`:** Almacenado en las columnas `reset_token` y `reset_token_expira` (`TEXT ISO 8601`).
3. **Expiración Estricta:** Límite máximo de 1 hora. Peticiones con tokens vencidos son rechazadas con código HTTP 400.
4. **Token de Uso Único (Single-Use):** Una vez actualizada la contraseña, el token y su expiración se limpian (`NULL`), se reinician los `intentos_fallidos = 0` y la cuenta se desbloquea (`habilitado = 1`).
5. **Ruta Pública:** La vista `/reset-password?token=...` es accesible públicamente sin requerir sesión iniciada.
6. **Protección contra Enumeración:** La API responde de forma uniforme si el usuario o RUT existe o no, protegiendo la identidad de los colaboradores.
7. **Simulación SMTP en Terminal:** Para facilitar la revisión del docente evaluador, cada solicitud imprime en la consola del servidor un encabezado estructurado simulando el despacho por correo corporativo.

### Endpoints de la API
- **`POST /api/auth/recuperar-password`**: Recibe `{ identificador }` (RUT o nombre de usuario). Genera el token, guarda la expiración y retorna el enlace generado.
- **`GET /api/auth/verificar-token-reset?token=...`**: Valida existencia y vigencia del token antes de mostrar el formulario de cambio.
- **`POST /api/auth/reset-password`**: Recibe `{ token, nuevaPassword }`. Hashea la nueva clave con `bcryptjs` (salt 10), actualiza la base de datos e invalida el token.

---

## 11. Panel de Administración Unificado y Control RBAC

Para optimizar la experiencia de usuario y estructurar la gestión de planta conforme a las especificaciones del informe académico, se consolidaron los módulos de administración en un contenedor unificado:

### Estructura de Navegación
- **Enlace Exclusivo en Navbar:** Visible únicamente para el rol `Administrador` con insignia corporativa `Admin`.
- **Contenedor con Pestañas (`AdminPanelView.jsx`):**
  1. **Pestaña 1 — Gestión de Recetas (`CU7`):** Configuración de tolerancias mínimas y máximas (`min < max`), versionado temporal inmutable por vigencia (`vigente_hasta`).
  2. **Pestaña 2 — Gestión de Usuarios (`CU8`):** Control RBAC, validación de RUT chileno con algoritmo Módulo 11 en JavaScript, alta/edición de credenciales y desbloqueo tras bloqueo de 3 intentos fallidos.
  3. **Pestaña 3 — Explorador de Base de Datos (SQLite):** Catálogo de las 8 tablas, visualizador de esquema con claves foráneas, paginación de filas y consola SQL segura (bloqueo estricto de comandos destructivos).

### Control de Acceso y Enrutamiento Protegido
- **Redirección Post-Login:** Al iniciar sesión con credenciales de `Administrador`, el sistema redirige automáticamente al **Panel de Administración** (`/admin`).
- **Protección de Ruta:** Si un usuario con rol de `Operador` o `Supervisor` intenta acceder a `/admin`, el enrutador activa la pantalla de **Acceso Denegado (HTTP 403)** con explicación de privilegios y botón de retorno a su vista correspondiente.

---

## 12. Modo Claro / Modo Oscuro Funcional y Persistente

El sistema cuenta con un conmutador de tema visual accesible tanto desde la barra superior de navegación (`Navbar.jsx`) como desde la vista de autenticación y restablecimiento de credenciales:

### Características de la Implementación
1. **Configuración Tailwind CSS v4:** Variante personalizada `@custom-variant dark (&:where(.dark, .dark *));` habilitada en `src/index.css` para soportar activación por clase en el elemento `<html>` en lugar de consulta de medios únicamente.
2. **Contexto Centralizado (`ThemeContext.jsx`):** Expone `theme` (`'dark'` o `'light'`) y la función `toggleTheme()`.
3. **Persistencia Local (`localStorage`):** Guarda la selección del usuario bajo las claves `theme` y `aza_theme` para recordar la preferencia ante recargas de página.
4. **Íconos Dinámicos de Lucide React:**
   - En **Modo Oscuro**, el botón muestra el ícono de **Sol (`Sun`)** invitando a cambiar a modo claro.
   - En **Modo Claro**, el botón muestra el ícono de **Luna (`Moon`)** invitando a volver al modo oscuro.
5. **Paleta Industrial Adaptativa:**
   - **Modo Oscuro (por defecto):** Fondos `slate-950` y `slate-900`, tarjetas industriales con bordes sutiles `slate-800` y acentos naranja `orange-500`.
   - **Modo Claro:** Fondos suaves `bg-slate-50` / `bg-white`, tarjetas de contraste óptimo con bordes `border-slate-200`, sombras suaves y tipografía de alta legibilidad sin pérdida de acentos corporativos AZA.

---

**Aceros AZA S.A. — INACAP 2026**  
*Lancelot Castro & Rodrigo Mancilla*