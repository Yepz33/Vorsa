const Database = require('better-sqlite3');
const db = new Database('vorsa.db');

// Crear tablas
db.exec(`
  CREATE TABLE IF NOT EXISTS empresas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    contacto TEXT NOT NULL,
    telefono TEXT,
    email TEXT,
    activa INTEGER DEFAULT 1,
    fecha_convenio TEXT
  );

  CREATE TABLE IF NOT EXISTS empleados (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empresa_id INTEGER NOT NULL,
    nombre TEXT NOT NULL,
    numero_empleado TEXT,
    salario_quincenal REAL NOT NULL,
    clabe TEXT NOT NULL,
    activo INTEGER DEFAULT 1,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id)
  );

  CREATE TABLE IF NOT EXISTS adelantos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empleado_id INTEGER NOT NULL,
    empresa_id INTEGER NOT NULL,
    monto REAL NOT NULL,
    comision REAL DEFAULT 60,
    estado TEXT DEFAULT 'pendiente',
    fecha_solicitud TEXT DEFAULT CURRENT_TIMESTAMP,
    fecha_transferencia TEXT,
    fecha_recuperacion TEXT,
    FOREIGN KEY (empleado_id) REFERENCES empleados(id),
    FOREIGN KEY (empresa_id) REFERENCES empresas(id)
  );

  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    rol TEXT NOT NULL CHECK(rol IN ('admin', 'empleado')),
    empleado_id INTEGER,
    FOREIGN KEY (empleado_id) REFERENCES empleados(id)
  );
`);

console.log('Base de datos VORSA creada ✓');

module.exports = db;