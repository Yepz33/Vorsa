const bcrypt = require('bcrypt');
const db = require('./database');

const hash = bcrypt.hashSync('Escorpionpuma4+', 10);
db.prepare("INSERT INTO usuarios (email, password_hash, rol) VALUES (?, ?, 'admin')").run('lcyepizg@gmail.com', hash);
console.log('Admin creado ✓  →  lcyepizg@gmail.com');
