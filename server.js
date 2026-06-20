const express = require('express');
const cors = require('cors');
const multer = require('multer');
const xlsx = require('xlsx');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./database');
const app = express();

const JWT_SECRET = 'vorsa_secret_2024';
const upload = multer({ storage: multer.memoryStorage() });

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: 'No autorizado' });
  try {
    req.usuario = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
}

function soloAdmin(req, res, next) {
  if (req.usuario?.rol !== 'admin') return res.status(403).json({ error: 'Acceso restringido a administradores' });
  next();
}

app.use(cors());
app.use(express.json());

// ── AUTH ──────────────────────────────────────────

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' });
  const usuario = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email);
  if (!usuario) return res.status(401).json({ error: 'Credenciales incorrectas' });
  const valida = await bcrypt.compare(password, usuario.password_hash);
  if (!valida) return res.status(401).json({ error: 'Credenciales incorrectas' });
  const token = jwt.sign({ id: usuario.id, email: usuario.email, rol: usuario.rol, empleado_id: usuario.empleado_id }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, rol: usuario.rol, email: usuario.email });
});

app.post('/auth/register', authMiddleware, soloAdmin, async (req, res) => {
  const { email, password, rol, empleado_id } = req.body;
  if (!email || !password || !rol) return res.status(400).json({ error: 'Email, contraseña y rol requeridos' });
  const password_hash = await bcrypt.hash(password, 10);
  try {
    const result = db.prepare(
      'INSERT INTO usuarios (email, password_hash, rol, empleado_id) VALUES (?, ?, ?, ?)'
    ).run(email, password_hash, rol, empleado_id ?? null);
    res.json({ mensaje: 'Usuario creado ✓', id: result.lastInsertRowid });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'El email ya está registrado' });
    res.status(500).json({ error: e.message });
  }
});

app.get('/auth/me', authMiddleware, (req, res) => {
  const usuario = db.prepare('SELECT id, email, rol, empleado_id FROM usuarios WHERE id = ?').get(req.usuario.id);
  if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
  if (usuario.empleado_id) {
    const empleado = db.prepare(`
      SELECT e.*, emp.nombre as empresa_nombre
      FROM empleados e JOIN empresas emp ON e.empresa_id = emp.id
      WHERE e.id = ?
    `).get(usuario.empleado_id);
    return res.json({ ...usuario, empleado });
  }
  res.json(usuario);
});

// ── EMPRESAS ──────────────────────────────────────

app.get('/empresas', authMiddleware, (req, res) => {
  const empresas = db.prepare('SELECT * FROM empresas').all();
  res.json(empresas);
});

app.post('/empresas', authMiddleware, soloAdmin, (req, res) => {
  const { nombre, contacto, telefono, email, fecha_convenio } = req.body;
  const result = db.prepare(`
    INSERT INTO empresas (nombre, contacto, telefono, email, fecha_convenio)
    VALUES (?, ?, ?, ?, ?)
  `).run(nombre, contacto, telefono, email, fecha_convenio);
  res.json({ mensaje: 'Empresa agregada ✓', id: result.lastInsertRowid });
});

app.delete('/empresas/:id', authMiddleware, soloAdmin, (req, res) => {
  db.prepare('DELETE FROM empresas WHERE id = ?').run(req.params.id);
  res.json({ mensaje: 'Empresa eliminada ✓' });
});

// ── EMPLEADOS ─────────────────────────────────────

app.get('/empresas/:id/empleados', authMiddleware, (req, res) => {
  const empleados = db.prepare('SELECT * FROM empleados WHERE empresa_id = ?').all(req.params.id);
  res.json(empleados);
});

app.post('/empleados', authMiddleware, soloAdmin, (req, res) => {
  const { empresa_id, nombre, numero_empleado, salario_quincenal, clabe } = req.body;
  const limite = salario_quincenal * 0.4;
  const result = db.prepare(`
    INSERT INTO empleados (empresa_id, nombre, numero_empleado, salario_quincenal, clabe)
    VALUES (?, ?, ?, ?, ?)
  `).run(empresa_id, nombre, numero_empleado, salario_quincenal, clabe);
  res.json({ mensaje: 'Empleado agregado ✓', id: result.lastInsertRowid, limite_maximo: limite });
});

app.post('/empleados/excel', authMiddleware, soloAdmin, upload.single('archivo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió archivo' });
  try {
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet);

    const insert = db.prepare(`
      INSERT INTO empleados (empresa_id, nombre, numero_empleado, salario_quincenal, clabe)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((empleados) => {
      for (const row of empleados) {
        insert.run(
          row.empresa_id,
          row.nombre,
          row.numero_empleado,
          row.salario_quincenal,
          row.clabe
        );
      }
    });

    insertMany(rows);
    res.json({ mensaje: `${rows.length} empleado(s) importado(s) ✓`, total: rows.length });
  } catch (e) {
    res.status(500).json({ error: 'Error procesando el archivo: ' + e.message });
  }
});

// ── ADELANTOS ─────────────────────────────────────

app.post('/adelantos', authMiddleware, (req, res) => {
  const { empleado_id } = req.body;
  const empleado = db.prepare('SELECT * FROM empleados WHERE id = ?').get(empleado_id);
  if (!empleado) return res.status(404).json({ error: 'Empleado no encontrado' });
  const limite = empleado.salario_quincenal * 0.4;
  const adelantoActivo = db.prepare(`
    SELECT * FROM adelantos WHERE empleado_id = ? AND estado = 'pendiente'
  `).get(empleado_id);
  if (adelantoActivo) return res.status(400).json({ error: 'Ya tienes un adelanto activo' });
  const result = db.prepare(`
    INSERT INTO adelantos (empleado_id, empresa_id, monto, estado)
    VALUES (?, ?, ?, 'pendiente')
  `).run(empleado_id, empleado.empresa_id, limite);
  res.json({ mensaje: 'Solicitud recibida ✓', monto: limite, comision: 60, total_a_descontar: limite + 60 });
});

app.get('/adelantos', authMiddleware, soloAdmin, (req, res) => {
  const adelantos = db.prepare(`
    SELECT a.*, e.nombre as empleado, e.clabe, emp.nombre as empresa
    FROM adelantos a
    JOIN empleados e ON a.empleado_id = e.id
    JOIN empresas emp ON a.empresa_id = emp.id
    ORDER BY a.fecha_solicitud DESC
  `).all();
  res.json(adelantos);
});

app.put('/adelantos/:id/aprobar', authMiddleware, soloAdmin, (req, res) => {
  db.prepare(`
    UPDATE adelantos SET estado = 'aprobado', fecha_transferencia = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(req.params.id);
  res.json({ mensaje: 'Adelanto aprobado ✓' });
});

app.get('/reporte', authMiddleware, soloAdmin, (req, res) => {
  const reporte = db.prepare(`
    SELECT emp.nombre as empresa, e.nombre as nombre, e.numero_empleado,
      e.salario_quincenal, e.clabe,
      a.monto as monto_adelantado, a.comision,
      (a.monto + a.comision) as total_a_descontar, a.fecha_solicitud
    FROM adelantos a
    JOIN empleados e ON a.empleado_id = e.id
    JOIN empresas emp ON a.empresa_id = emp.id
    WHERE a.estado = 'aprobado'
    ORDER BY emp.nombre, e.nombre
  `).all();
  const total = reporte.reduce((sum, r) => sum + r.total_a_descontar, 0);
  res.json({ reporte, total_a_transferir: total });
});

app.get('/reporte/:empresa_id', authMiddleware, soloAdmin, (req, res) => {
  const reporte = db.prepare(`
    SELECT emp.nombre as empresa, e.nombre as nombre, e.numero_empleado,
      e.salario_quincenal, e.clabe,
      a.monto as monto_adelantado, a.comision,
      (a.monto + a.comision) as total_a_descontar, a.fecha_solicitud
    FROM adelantos a
    JOIN empleados e ON a.empleado_id = e.id
    JOIN empresas emp ON a.empresa_id = emp.id
    WHERE a.empresa_id = ? AND a.estado = 'aprobado'
    ORDER BY e.nombre
  `).all(req.params.empresa_id);
  const total = reporte.reduce((sum, r) => sum + r.total_a_descontar, 0);
  res.json({ reporte, total_a_transferir: total });
});

app.get('/', (req, res) => {
  res.json({ mensaje: 'VORSA API funcionando ✓' });
});

app.listen(3000, () => {
  console.log('Servidor VORSA corriendo en http://localhost:3000');
});
