import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import './App.css';

const API = 'http://localhost:3000';

function apiFetch(path, options = {}, token = null) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(`${API}${path}`, { ...options, headers });
}

function App() {
  const [token, setToken] = useState(null);
  const [usuario, setUsuario] = useState(null);
  const [pantalla, setPantalla] = useState('inicio');

  const login = (tok, user) => { setToken(tok); setUsuario(user); setPantalla(user.rol === 'admin' ? 'admin' : 'empleado'); };
  const logout = () => { setToken(null); setUsuario(null); setPantalla('inicio'); };

  if (!token) return <Login onLogin={login} />;

  return (
    <div style={{ backgroundColor: '#1C2125', minHeight: '100vh', fontFamily: 'Arial, sans-serif', color: '#FFFFFF' }}>
      <nav style={{ backgroundColor: '#151A1E', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #0D9E75' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#FFFFFF', fontFamily: 'Georgia' }}>Vorsa</span>
          <span style={{ fontSize: '11px', color: '#A0ADB5', letterSpacing: '3px' }}>LIQUIDEZ LABORAL</span>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          {usuario?.rol === 'admin' && (
            <>
              <button onClick={() => setPantalla('inicio')} style={btnNav(pantalla === 'inicio')}>Inicio</button>
              <button onClick={() => setPantalla('solicitar')} style={btnNav(pantalla === 'solicitar')}>Solicitar Adelanto</button>
              <button onClick={() => setPantalla('admin')} style={btnNav(pantalla === 'admin')}>Admin</button>
            </>
          )}
          <div style={{ color: '#A0ADB5', fontSize: '13px' }}>{usuario?.email}</div>
          <button onClick={logout} style={{ backgroundColor: 'transparent', color: '#FF6B6B', border: '1px solid #FF6B6B', borderRadius: '6px', padding: '6px 14px', cursor: 'pointer', fontSize: '13px' }}>
            Salir
          </button>
        </div>
      </nav>
      <div style={{ padding: '40px 32px' }}>
        {usuario?.rol === 'empleado' && <DashboardEmpleado token={token} />}
        {usuario?.rol === 'admin' && pantalla === 'inicio' && <Inicio setPantalla={setPantalla} />}
        {usuario?.rol === 'admin' && pantalla === 'solicitar' && <SolicitarAdelanto token={token} />}
        {usuario?.rol === 'admin' && pantalla === 'admin' && <Admin token={token} />}
      </div>
    </div>
  );
}

function Login({ onLogin }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setCargando(true);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setCargando(false); return; }
      onLogin(data.token, { email: data.email, rol: data.rol });
    } catch { setError('Error conectando con el servidor'); }
    setCargando(false);
  };

  return (
    <div style={{ backgroundColor: '#1C2125', minHeight: '100vh', fontFamily: 'Arial, sans-serif', color: '#FFFFFF', display: 'flex', flexDirection: 'column' }}>
      <nav style={{ backgroundColor: '#151A1E', padding: '16px 32px', borderBottom: '2px solid #0D9E75' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#FFFFFF', fontFamily: 'Georgia' }}>Vorsa</span>
          <span style={{ fontSize: '11px', color: '#A0ADB5', letterSpacing: '3px' }}>LIQUIDEZ LABORAL</span>
        </div>
      </nav>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <h2 style={{ fontSize: '32px', fontFamily: 'Georgia', marginBottom: '8px', color: '#1CC68F', textAlign: 'center' }}>Bienvenido</h2>
          <p style={{ color: '#A0ADB5', textAlign: 'center', marginBottom: '32px', fontSize: '15px' }}>Inicia sesión para continuar</p>
          <form onSubmit={submit}>
            <div style={{ backgroundColor: '#151A1E', borderRadius: '12px', padding: '32px', border: '1px solid #2A3A35' }}>
              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>Correo electrónico</label>
                <input
                  type="email" required autoFocus
                  value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="tu@correo.com" style={inputStyle}
                />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={labelStyle}>Contraseña</label>
                <input
                  type="password" required
                  value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••" style={inputStyle}
                />
              </div>
              {error && <div style={{ backgroundColor: '#2A1515', border: '1px solid #A32D2D', borderRadius: '8px', padding: '12px', marginBottom: '16px', color: '#FF6B6B', fontSize: '14px' }}>{error}</div>}
              <button type="submit" disabled={cargando} style={{ backgroundColor: cargando ? '#2A3A35' : '#0D9E75', color: '#FFFFFF', border: 'none', borderRadius: '8px', padding: '14px', fontSize: '16px', fontWeight: 'bold', cursor: cargando ? 'not-allowed' : 'pointer', width: '100%' }}>
                {cargando ? 'Entrando...' : 'Entrar →'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function DashboardEmpleado({ token }) {
  const [datos, setDatos] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    apiFetch('/auth/me', {}, token).then(r => r.json()).then(setDatos).catch(() => {});
  }, [token]);

  const solicitar = async () => {
    setError(''); setResultado(null); setCargando(true);
    try {
      const res = await apiFetch('/adelantos', { method: 'POST', body: JSON.stringify({ empleado_id: datos.empleado_id }) }, token);
      const data = await res.json();
      if (data.error) setError(data.error);
      else setResultado(data);
    } catch { setError('Error conectando con el servidor'); }
    setCargando(false);
  };

  if (!datos) return <div style={{ textAlign: 'center', color: '#A0ADB5', padding: '80px' }}>Cargando...</div>;

  const emp = datos.empleado;
  const limite = emp ? emp.salario_quincenal * 0.4 : 0;

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '32px', fontFamily: 'Georgia', marginBottom: '8px', color: '#1CC68F' }}>Hola, {emp?.nombre?.split(' ')[0] || 'empleado'}</h2>
      <p style={{ color: '#A0ADB5', marginBottom: '32px' }}>{emp?.empresa_nombre}</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#151A1E', borderRadius: '12px', padding: '20px', border: '1px solid #2A3A35' }}>
          <div style={{ color: '#A0ADB5', fontSize: '11px', letterSpacing: '1px', marginBottom: '8px' }}>EMPLEADO</div>
          <div style={{ fontWeight: 'bold' }}>{emp?.nombre}</div>
          <div style={{ color: '#A0ADB5', fontSize: '12px' }}>No. {emp?.numero_empleado}</div>
        </div>
        <div style={{ backgroundColor: '#151A1E', borderRadius: '12px', padding: '20px', border: '1px solid #2A3A35' }}>
          <div style={{ color: '#A0ADB5', fontSize: '11px', letterSpacing: '1px', marginBottom: '8px' }}>SALARIO</div>
          <div style={{ fontWeight: 'bold' }}>${emp?.salario_quincenal?.toLocaleString()}</div>
          <div style={{ color: '#A0ADB5', fontSize: '12px' }}>quincenal</div>
        </div>
        <div style={{ backgroundColor: '#152A1E', borderRadius: '12px', padding: '20px', border: '1px solid #0D9E7540' }}>
          <div style={{ color: '#A0ADB5', fontSize: '11px', letterSpacing: '1px', marginBottom: '8px' }}>LÍMITE</div>
          <div style={{ fontWeight: 'bold', color: '#1CC68F' }}>${limite.toLocaleString()}</div>
          <div style={{ color: '#A0ADB5', fontSize: '12px' }}>disponible (40%)</div>
        </div>
      </div>

      {!resultado ? (
        <div style={{ backgroundColor: '#151A1E', borderRadius: '12px', padding: '28px', border: '1px solid #2A3A35' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', color: '#A0ADB5', fontSize: '14px' }}>
            <span>Monto del adelanto</span><span style={{ color: '#FFFFFF' }}>${limite.toLocaleString()} MXN</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', color: '#A0ADB5', fontSize: '14px' }}>
            <span>Comisión fija</span><span style={{ color: '#FFFFFF' }}>$60 MXN</span>
          </div>
          <div style={{ borderTop: '1px solid #2A3A35', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
            <span style={{ fontWeight: 'bold' }}>Total a descontar</span>
            <span style={{ color: '#1CC68F', fontWeight: 'bold' }}>${(limite + 60).toLocaleString()} MXN</span>
          </div>
          {error && <div style={{ backgroundColor: '#2A1515', border: '1px solid #A32D2D', borderRadius: '8px', padding: '12px', marginBottom: '16px', color: '#FF6B6B' }}>{error}</div>}
          <button onClick={solicitar} disabled={cargando} style={{ backgroundColor: cargando ? '#2A3A35' : '#0D9E75', color: '#FFFFFF', border: 'none', borderRadius: '8px', padding: '14px', fontSize: '16px', fontWeight: 'bold', cursor: cargando ? 'not-allowed' : 'pointer', width: '100%' }}>
            {cargando ? 'Enviando...' : 'Solicitar adelanto →'}
          </button>
        </div>
      ) : (
        <div style={{ backgroundColor: '#152A1E', border: '1px solid #0D9E75', borderRadius: '12px', padding: '32px', textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>✓</div>
          <div style={{ color: '#1CC68F', fontWeight: 'bold', fontSize: '20px', fontFamily: 'Georgia', marginBottom: '8px' }}>Solicitud enviada</div>
          <div style={{ color: '#A0ADB5', fontSize: '14px', marginBottom: '20px' }}>Recibirás tu dinero en 1 día hábil</div>
          <div style={{ display: 'inline-block', backgroundColor: '#1C2125', borderRadius: '8px', padding: '16px 32px' }}>
            <div style={{ color: '#A0ADB5', fontSize: '13px' }}>Total a descontar en nómina</div>
            <div style={{ color: '#1CC68F', fontWeight: 'bold', fontSize: '28px', fontFamily: 'Georgia' }}>${resultado.total_a_descontar?.toLocaleString()} MXN</div>
          </div>
        </div>
      )}
    </div>
  );
}

function Inicio({ setPantalla }) {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
      <div style={{ marginBottom: '48px' }}>
        <h1 style={{ fontSize: '48px', fontFamily: 'Georgia', marginBottom: '16px' }}>
          Tu salario,<br/>
          <span style={{ color: '#0D9E75' }}>cuando lo necesitas.</span>
        </h1>
        <p style={{ fontSize: '18px', color: '#A0ADB5', lineHeight: '1.6' }}>
          Accede al dinero que ya ganaste antes del día de pago.<br/>
          Sin préstamos. Sin intereses. Solo tu propio dinero.
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '48px' }}>
        {[
          { n: '$60', l: 'Comisión fija por retiro' },
          { n: '40%', l: 'Máximo de tu quincena' },
          { n: '1 día', l: 'Para recibir tu dinero' },
        ].map((s, i) => (
          <div key={i} style={{ backgroundColor: '#151A1E', border: '1px solid #0D9E75', borderRadius: '12px', padding: '24px' }}>
            <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#1CC68F', fontFamily: 'Georgia' }}>{s.n}</div>
            <div style={{ fontSize: '14px', color: '#A0ADB5', marginTop: '8px' }}>{s.l}</div>
          </div>
        ))}
      </div>
      <button onClick={() => setPantalla('solicitar')} style={{
        backgroundColor: '#0D9E75', color: '#FFFFFF', border: 'none',
        borderRadius: '8px', padding: '16px 48px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer'
      }}>
        Solicitar mi adelanto →
      </button>
    </div>
  );
}

function SolicitarAdelanto({ token }) {
  const [empresas, setEmpresas] = useState([]);
  const [empresaId, setEmpresaId] = useState('');
  const [empleados, setEmpleados] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [mostrarLista, setMostrarLista] = useState(false);
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    apiFetch('/empresas', {}, token)
      .then(r => r.json())
      .then(setEmpresas)
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!empresaId) { setEmpleados([]); setEmpleadoSeleccionado(null); setBusqueda(''); return; }
    apiFetch(`/empresas/${empresaId}/empleados`, {}, token)
      .then(r => r.json())
      .then(setEmpleados)
      .catch(() => {});
    setEmpleadoSeleccionado(null);
    setBusqueda('');
  }, [empresaId, token]);

  const filtrados = busqueda.trim().length === 0 ? [] : empleados.filter(e =>
    e.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    String(e.numero_empleado).includes(busqueda)
  );

  const seleccionarEmpleado = (emp) => {
    setEmpleadoSeleccionado(emp);
    setBusqueda(emp.nombre);
    setMostrarLista(false);
    setResultado(null);
    setError('');
  };

  const solicitar = async () => {
    setError(''); setResultado(null); setCargando(true);
    try {
      const res = await apiFetch('/adelantos', {
        method: 'POST',
        body: JSON.stringify({ empleado_id: empleadoSeleccionado.id })
      }, token);
      const data = await res.json();
      if (data.error) setError(data.error);
      else setResultado(data);
    } catch (e) { setError('Error conectando con el servidor'); }
    setCargando(false);
  };

  const limite = empleadoSeleccionado ? empleadoSeleccionado.salario_quincenal * 0.4 : 0;

  return (
    <div style={{ maxWidth: '520px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '32px', fontFamily: 'Georgia', marginBottom: '8px', color: '#1CC68F' }}>Solicitar Adelanto</h2>
      <p style={{ color: '#A0ADB5', marginBottom: '32px', fontSize: '15px' }}>Accede al dinero que ya ganaste antes del día de pago.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Paso 1: Empresa */}
        <div style={{ backgroundColor: '#151A1E', borderRadius: '12px', padding: '24px', border: '1px solid #2A3A35' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: empresaId ? '#0D9E75' : '#2A3A35', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', flexShrink: 0 }}>
              {empresaId ? '✓' : '1'}
            </div>
            <span style={{ color: '#A0ADB5', fontSize: '13px', letterSpacing: '1px' }}>EMPRESA</span>
          </div>
          <select
            value={empresaId}
            onChange={e => { setEmpresaId(e.target.value); setResultado(null); setError(''); }}
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            <option value="">— Selecciona tu empresa —</option>
            {empresas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
        </div>

        {/* Paso 2: Buscar empleado */}
        {empresaId && (
          <div style={{ backgroundColor: '#151A1E', borderRadius: '12px', padding: '24px', border: '1px solid #2A3A35' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: empleadoSeleccionado ? '#0D9E75' : '#2A3A35', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', flexShrink: 0 }}>
                {empleadoSeleccionado ? '✓' : '2'}
              </div>
              <span style={{ color: '#A0ADB5', fontSize: '13px', letterSpacing: '1px' }}>EMPLEADO</span>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={busqueda}
                onChange={e => { setBusqueda(e.target.value); setMostrarLista(true); setEmpleadoSeleccionado(null); setResultado(null); }}
                onFocus={() => { if (busqueda.trim()) setMostrarLista(true); }}
                placeholder="Busca por nombre o número de empleado"
                style={inputStyle}
              />
              {mostrarLista && filtrados.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#1C2125', border: '1px solid #2A3A35', borderRadius: '8px', marginTop: '4px', zIndex: 10, maxHeight: '200px', overflowY: 'auto' }}>
                  {filtrados.map(emp => (
                    <div
                      key={emp.id}
                      onMouseDown={() => seleccionarEmpleado(emp)}
                      style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #2A3A35', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#2A3A35'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{emp.nombre}</div>
                        <div style={{ color: '#A0ADB5', fontSize: '12px' }}>No. {emp.numero_empleado}</div>
                      </div>
                      <div style={{ color: '#1CC68F', fontSize: '13px' }}>${emp.salario_quincenal?.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              )}
              {mostrarLista && busqueda.trim().length > 0 && filtrados.length === 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#1C2125', border: '1px solid #2A3A35', borderRadius: '8px', marginTop: '4px', padding: '16px', color: '#A0ADB5', fontSize: '14px', zIndex: 10 }}>
                  No se encontraron empleados
                </div>
              )}
            </div>
          </div>
        )}

        {/* Paso 3: Info del empleado */}
        {empleadoSeleccionado && (
          <div style={{ backgroundColor: '#151A1E', borderRadius: '12px', padding: '24px', border: '1px solid #0D9E75' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#0D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', flexShrink: 0 }}>3</div>
              <span style={{ color: '#A0ADB5', fontSize: '13px', letterSpacing: '1px' }}>RESUMEN</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '8px' }}>
              <div style={{ backgroundColor: '#1C2125', borderRadius: '8px', padding: '16px' }}>
                <div style={{ color: '#A0ADB5', fontSize: '11px', marginBottom: '6px', letterSpacing: '1px' }}>EMPLEADO</div>
                <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{empleadoSeleccionado.nombre}</div>
                <div style={{ color: '#A0ADB5', fontSize: '12px' }}>No. {empleadoSeleccionado.numero_empleado}</div>
              </div>
              <div style={{ backgroundColor: '#1C2125', borderRadius: '8px', padding: '16px' }}>
                <div style={{ color: '#A0ADB5', fontSize: '11px', marginBottom: '6px', letterSpacing: '1px' }}>SALARIO</div>
                <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#FFFFFF' }}>${empleadoSeleccionado.salario_quincenal?.toLocaleString()}</div>
                <div style={{ color: '#A0ADB5', fontSize: '12px' }}>quincenal</div>
              </div>
              <div style={{ backgroundColor: '#152A1E', borderRadius: '8px', padding: '16px', border: '1px solid #0D9E7540' }}>
                <div style={{ color: '#A0ADB5', fontSize: '11px', marginBottom: '6px', letterSpacing: '1px' }}>LÍMITE</div>
                <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#1CC68F' }}>${limite.toLocaleString()}</div>
                <div style={{ color: '#A0ADB5', fontSize: '12px' }}>disponible (40%)</div>
              </div>
            </div>
          </div>
        )}

        {/* Paso 4: Confirmar */}
        {empleadoSeleccionado && !resultado && (
          <div style={{ backgroundColor: '#151A1E', borderRadius: '12px', padding: '24px', border: '1px solid #2A3A35' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', color: '#A0ADB5', fontSize: '14px' }}>
              <span>Monto del adelanto</span><span style={{ color: '#FFFFFF' }}>${limite.toLocaleString()} MXN</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', color: '#A0ADB5', fontSize: '14px' }}>
              <span>Comisión fija</span><span style={{ color: '#FFFFFF' }}>$60 MXN</span>
            </div>
            <div style={{ borderTop: '1px solid #2A3A35', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontSize: '15px' }}>
              <span style={{ fontWeight: 'bold' }}>Total a descontar</span>
              <span style={{ color: '#1CC68F', fontWeight: 'bold' }}>${(limite + 60).toLocaleString()} MXN</span>
            </div>
            {error && <div style={{ backgroundColor: '#2A1515', border: '1px solid #A32D2D', borderRadius: '8px', padding: '12px', marginBottom: '16px', color: '#FF6B6B' }}>{error}</div>}
            <button onClick={solicitar} disabled={cargando} style={{
              backgroundColor: cargando ? '#2A3A35' : '#0D9E75', color: '#FFFFFF',
              border: 'none', borderRadius: '8px', padding: '14px',
              fontSize: '16px', fontWeight: 'bold', cursor: cargando ? 'not-allowed' : 'pointer', width: '100%'
            }}>
              {cargando ? 'Enviando...' : 'Solicitar adelanto →'}
            </button>
          </div>
        )}

        {/* Éxito */}
        {resultado && (
          <div style={{ backgroundColor: '#152A1E', border: '1px solid #0D9E75', borderRadius: '12px', padding: '32px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>✓</div>
            <div style={{ color: '#1CC68F', fontWeight: 'bold', fontSize: '20px', fontFamily: 'Georgia', marginBottom: '8px' }}>Solicitud enviada</div>
            <div style={{ color: '#A0ADB5', fontSize: '14px', marginBottom: '20px' }}>Recibirás tu dinero en 1 día hábil</div>
            <div style={{ display: 'inline-block', backgroundColor: '#1C2125', borderRadius: '8px', padding: '16px 32px' }}>
              <div style={{ color: '#A0ADB5', fontSize: '13px' }}>Total a descontar en nómina</div>
              <div style={{ color: '#1CC68F', fontWeight: 'bold', fontSize: '28px', fontFamily: 'Georgia' }}>${resultado.total_a_descontar?.toLocaleString()} MXN</div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function Admin({ token }) {
  const [seccion, setSeccion] = useState('empresas');
  const menuItems = [
    { id: 'empresas', label: '🏢 Empresas' },
    { id: 'empleados', label: '👥 Empleados' },
    { id: 'adelantos', label: '💸 Adelantos' },
  ];
  return (
    <div style={{ display: 'flex', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ width: '200px', flexShrink: 0, backgroundColor: '#151A1E', borderRadius: '12px', padding: '24px 0', marginRight: '24px', border: '1px solid #2A3A35', alignSelf: 'flex-start' }}>
        <div style={{ padding: '0 16px 16px', borderBottom: '1px solid #2A3A35', marginBottom: '8px' }}>
          <span style={{ fontSize: '11px', color: '#A0ADB5', letterSpacing: '2px' }}>PANEL ADMIN</span>
        </div>
        {menuItems.map(item => (
          <button key={item.id} onClick={() => setSeccion(item.id)} style={{
            display: 'block', width: '100%', textAlign: 'left',
            backgroundColor: seccion === item.id ? '#0D9E7520' : 'transparent',
            color: seccion === item.id ? '#1CC68F' : '#A0ADB5',
            border: 'none', borderLeft: seccion === item.id ? '3px solid #0D9E75' : '3px solid transparent',
            padding: '12px 20px', cursor: 'pointer', fontSize: '14px',
            fontWeight: seccion === item.id ? 'bold' : 'normal',
          }}>{item.label}</button>
        ))}
      </div>
      <div style={{ flex: 1 }}>
        {seccion === 'empresas' && <ModuloEmpresas token={token} />}
        {seccion === 'empleados' && <ModuloEmpleados token={token} />}
        {seccion === 'adelantos' && <ModuloAdelantos token={token} />}
      </div>
    </div>
  );
}

function ModalConfirmar({ nombre, onConfirmar, onCancelar }) {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{
        backgroundColor: '#151A1E', border: '1px solid #2A3A35',
        borderRadius: '12px', padding: '32px', maxWidth: '400px', width: '90%', textAlign: 'center'
      }}>
        <div style={{ fontSize: '32px', marginBottom: '16px' }}>🗑</div>
        <h3 style={{ color: '#FFFFFF', fontFamily: 'Georgia', marginBottom: '8px' }}>¿Eliminar empresa?</h3>
        <p style={{ color: '#A0ADB5', marginBottom: '24px' }}>
          Estás por eliminar <strong style={{ color: '#FFFFFF' }}>"{nombre}"</strong>.<br/>
          Esta acción no se puede deshacer.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button onClick={onCancelar} style={{
            backgroundColor: 'transparent', color: '#A0ADB5',
            border: '1px solid #2A3A35', borderRadius: '8px',
            padding: '10px 24px', cursor: 'pointer', fontSize: '14px'
          }}>Cancelar</button>
          <button onClick={onConfirmar} style={{
            backgroundColor: '#A32D2D', color: '#FFFFFF',
            border: 'none', borderRadius: '8px',
            padding: '10px 24px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold'
          }}>Sí, eliminar</button>
        </div>
      </div>
    </div>
  );
}

function ModuloEmpresas({ token }) {
  const [empresas, setEmpresas] = useState([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState({ nombre: '', contacto: '', telefono: '', email: '', fecha_convenio: '' });
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [confirmar, setConfirmar] = useState(null);

  useEffect(() => { cargarEmpresas(); }, []);

  const cargarEmpresas = async () => {
    setCargando(true);
    try {
      const res = await apiFetch('/empresas', {}, token);
      setEmpresas(await res.json());
    } catch (e) { setError('Error conectando con el servidor'); }
    setCargando(false);
  };

  const agregarEmpresa = async () => {
    setError(''); setMensaje('');
    if (!form.nombre || !form.contacto) { setError('Nombre y contacto son obligatorios'); return; }
    try {
      const res = await apiFetch('/empresas', { method: 'POST', body: JSON.stringify(form) }, token);
      const data = await res.json();
      if (data.error) { setError(data.error); }
      else {
        setMensaje('Empresa agregada correctamente ✓');
        setForm({ nombre: '', contacto: '', telefono: '', email: '', fecha_convenio: '' });
        setMostrarForm(false);
        cargarEmpresas();
      }
    } catch (e) { setError('Error conectando con el servidor'); }
  };

  const eliminarEmpresa = async () => {
    try {
      await apiFetch(`/empresas/${confirmar.id}`, { method: 'DELETE' }, token);
      setMensaje('Empresa eliminada ✓');
      setConfirmar(null);
      cargarEmpresas();
    } catch (e) { setError('Error al eliminar'); }
  };

  return (
    <div>
      {confirmar && (
        <ModalConfirmar
          nombre={confirmar.nombre}
          onConfirmar={eliminarEmpresa}
          onCancelar={() => setConfirmar(null)}
        />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '28px', fontFamily: 'Georgia', color: '#1CC68F', margin: 0 }}>Empresas</h2>
          <p style={{ color: '#A0ADB5', fontSize: '13px', margin: '4px 0 0' }}>
            {empresas.length} empresa{empresas.length !== 1 ? 's' : ''} registrada{empresas.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => { setMostrarForm(!mostrarForm); setError(''); setMensaje(''); }} style={{
          backgroundColor: mostrarForm ? '#2A3A35' : '#0D9E75', color: '#FFFFFF',
          border: 'none', borderRadius: '8px', padding: '10px 20px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px'
        }}>
          {mostrarForm ? '✕ Cancelar' : '+ Nueva empresa'}
        </button>
      </div>

      {mensaje && (
        <div style={{ backgroundColor: '#152A1E', border: '1px solid #0D9E75', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', color: '#1CC68F' }}>
          {mensaje}
        </div>
      )}

      {mostrarForm && (
        <div style={{ backgroundColor: '#151A1E', borderRadius: '12px', padding: '24px', border: '1px solid #2A3A35', marginBottom: '24px' }}>
          <h3 style={{ color: '#FFFFFF', fontFamily: 'Georgia', marginTop: 0, marginBottom: '20px' }}>Nueva Empresa</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Nombre de la empresa *</label>
              <input type="text" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: CEMEX Monterrey" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Contacto *</label>
              <input type="text" value={form.contacto} onChange={e => setForm({ ...form, contacto: e.target.value })} placeholder="Nombre del responsable" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Teléfono</label>
              <input type="text" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} placeholder="81 0000 0000" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="contacto@empresa.com" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Fecha de convenio</label>
              <input type="date" value={form.fecha_convenio} onChange={e => setForm({ ...form, fecha_convenio: e.target.value })} style={inputStyle} />
            </div>
          </div>
          {error && <div style={{ backgroundColor: '#2A1515', border: '1px solid #A32D2D', borderRadius: '8px', padding: '12px', marginTop: '16px', color: '#FF6B6B' }}>{error}</div>}
          <button onClick={agregarEmpresa} style={{ backgroundColor: '#0D9E75', color: '#FFFFFF', border: 'none', borderRadius: '8px', padding: '12px 32px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', marginTop: '20px' }}>
            Guardar empresa →
          </button>
        </div>
      )}

      {cargando ? (
        <div style={{ textAlign: 'center', color: '#A0ADB5', padding: '48px' }}>Cargando...</div>
      ) : empresas.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#A0ADB5', padding: '48px', backgroundColor: '#151A1E', borderRadius: '12px', border: '1px solid #2A3A35' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🏢</div>
          <div>No hay empresas registradas aún.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {empresas.map(emp => (
            <div key={emp.id} style={{ backgroundColor: '#151A1E', borderRadius: '10px', padding: '20px 24px', border: '1px solid #2A3A35', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '4px' }}>{emp.nombre}</div>
                <div style={{ color: '#A0ADB5', fontSize: '13px' }}>👤 {emp.contacto}</div>
                {emp.telefono && <div style={{ color: '#A0ADB5', fontSize: '13px' }}>📞 {emp.telefono}</div>}
                {emp.email && <div style={{ color: '#A0ADB5', fontSize: '13px' }}>✉️ {emp.email}</div>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ backgroundColor: '#152A1E', color: '#1CC68F', fontSize: '12px', padding: '4px 12px', borderRadius: '20px', marginBottom: '4px' }}>✓ Activa</div>
                {emp.fecha_convenio && <div style={{ color: '#A0ADB5', fontSize: '12px' }}>Convenio: {emp.fecha_convenio}</div>}
                <div style={{ color: '#A0ADB5', fontSize: '12px', marginBottom: '8px' }}>ID: #{emp.id}</div>
                <button onClick={() => setConfirmar({ id: emp.id, nombre: emp.nombre })} style={{
                  backgroundColor: 'transparent', color: '#FF6B6B',
                  border: '1px solid #FF6B6B', borderRadius: '6px',
                  padding: '4px 12px', cursor: 'pointer', fontSize: '12px'
                }}>🗑 Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ModuloAdelantos({ token }) {
  const [adelantos, setAdelantos] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [filtroEmpresa, setFiltroEmpresa] = useState('');
  const [cargando, setCargando] = useState(false);
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    cargarAdelantos();
    apiFetch('/empresas', {}, token).then(r => r.json()).then(setEmpresas).catch(() => {});
  }, []);

  const cargarAdelantos = async () => {
    setCargando(true);
    const res = await apiFetch('/adelantos', {}, token);
    setAdelantos(await res.json());
    setCargando(false);
  };

  const aprobar = async (id) => {
    await apiFetch(`/adelantos/${id}/aprobar`, { method: 'PUT' }, token);
    cargarAdelantos();
  };

  const exportarExcel = async () => {
    setExportando(true);
    try {
      const url = filtroEmpresa ? `/reporte/${filtroEmpresa}` : '/reporte';
      const res = await apiFetch(url, {}, token);
      const data = await res.json();
      if (!data.reporte || data.reporte.length === 0) {
        alert('No hay adelantos aprobados para exportar.');
        setExportando(false);
        return;
      }
      const filas = data.reporte.map(r => ({
        'Empresa': r.empresa,
        'Nombre': r.nombre,
        'No. Empleado': r.numero_empleado,
        'Salario Quincenal': r.salario_quincenal,
        'CLABE': r.clabe,
        'Monto Adelantado': r.monto_adelantado,
        'Comisión': r.comision,
        'Total a Descontar': r.total_a_descontar,
        'Fecha Solicitud': r.fecha_solicitud,
      }));
      const ws = XLSX.utils.json_to_sheet(filas);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
      const nombreEmpresa = filtroEmpresa ? empresas.find(e => String(e.id) === filtroEmpresa)?.nombre : 'Todas';
      XLSX.writeFile(wb, `VORSA_Reporte_${nombreEmpresa}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch { alert('Error generando el reporte'); }
    setExportando(false);
  };

  const adelantosFiltrados = filtroEmpresa
    ? adelantos.filter(a => String(a.empresa_id) === filtroEmpresa)
    : adelantos;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '28px', fontFamily: 'Georgia', color: '#1CC68F', margin: 0 }}>Adelantos</h2>
          <p style={{ color: '#A0ADB5', fontSize: '13px', margin: '4px 0 0' }}>{adelantos.filter(a => a.estado === 'pendiente').length} pendiente(s)</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={filtroEmpresa} onChange={e => setFiltroEmpresa(e.target.value)} style={{ ...inputStyle, width: 'auto', padding: '8px 12px', fontSize: '13px' }}>
            <option value="">Todas las empresas</option>
            {empresas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
          <button onClick={exportarExcel} disabled={exportando} style={{ backgroundColor: '#1A3A2A', color: '#1CC68F', border: '1px solid #0D9E75', borderRadius: '8px', padding: '8px 16px', cursor: exportando ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '13px', whiteSpace: 'nowrap' }}>
            {exportando ? 'Generando...' : '↓ Exportar Excel'}
          </button>
          <button onClick={cargarAdelantos} style={{ backgroundColor: '#0D9E75', color: '#FFFFFF', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
            {cargando ? '...' : '↻'}
          </button>
        </div>
      </div>
      {adelantosFiltrados.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#A0ADB5', padding: '48px', backgroundColor: '#151A1E', borderRadius: '12px', border: '1px solid #2A3A35' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>💸</div>
          <div>No hay solicitudes de adelanto aún.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {adelantosFiltrados.map(a => (
            <div key={a.id} style={{ backgroundColor: '#151A1E', borderRadius: '10px', padding: '20px', border: `1px solid ${a.estado === 'aprobado' ? '#0D9E75' : '#2A3A35'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{a.empleado}</div>
                <div style={{ color: '#A0ADB5', fontSize: '13px' }}>{a.empresa}</div>
                <div style={{ color: '#A0ADB5', fontSize: '13px' }}>
                  Monto: <span style={{ color: '#1CC68F' }}>${a.monto} MXN</span> · Comisión: $60 · Total: <span style={{ color: '#FFFFFF' }}>${a.monto + a.comision} MXN</span>
                </div>
                {a.clabe && <div style={{ color: '#A0ADB5', fontSize: '12px', fontFamily: 'monospace', marginTop: '4px' }}>CLABE: {a.clabe}</div>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '12px', padding: '4px 12px', borderRadius: '20px', marginBottom: '8px', backgroundColor: a.estado === 'aprobado' ? '#152A1E' : '#2A2015', color: a.estado === 'aprobado' ? '#1CC68F' : '#F59E0B' }}>
                  {a.estado === 'aprobado' ? '✓ Aprobado' : '⏳ Pendiente'}
                </div>
                {a.estado === 'pendiente' && (
                  <button onClick={() => aprobar(a.id)} style={{ backgroundColor: '#0D9E75', color: '#FFFFFF', border: 'none', borderRadius: '6px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px' }}>
                    Aprobar →
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ModuloEmpleados({ token }) {
  const [empresas, setEmpresas] = useState([]);
  const [empresaId, setEmpresaId] = useState('');
  const [empleados, setEmpleados] = useState([]);
  const [archivo, setArchivo] = useState(null);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    apiFetch('/empresas', {}, token)
      .then(r => r.json())
      .then(setEmpresas)
      .catch(() => setError('Error cargando empresas'));
  }, [token]);

  useEffect(() => {
    if (!empresaId) { setEmpleados([]); return; }
    apiFetch(`/empresas/${empresaId}/empleados`, {}, token)
      .then(r => r.json())
      .then(setEmpleados)
      .catch(() => setError('Error cargando empleados'));
  }, [empresaId, token]);

  const subirExcel = async () => {
    setError(''); setMensaje('');
    if (!empresaId) { setError('Selecciona una empresa primero'); return; }
    if (!archivo) { setError('Selecciona un archivo Excel'); return; }
    setCargando(true);
    try {
      const formData = new FormData();
      formData.append('archivo', archivo);
      const res = await fetch(`${API}/empleados/excel`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (data.error) { setError(data.error); }
      else {
        setMensaje(data.mensaje);
        setArchivo(null);
        const res2 = await apiFetch(`/empresas/${empresaId}/empleados`, {}, token);
        setEmpleados(await res2.json());
      }
    } catch (e) { setError('Error conectando con el servidor'); }
    setCargando(false);
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '28px', fontFamily: 'Georgia', color: '#1CC68F', margin: 0 }}>Empleados</h2>
        <p style={{ color: '#A0ADB5', fontSize: '13px', margin: '4px 0 0' }}>Importa empleados desde Excel por empresa</p>
      </div>

      <div style={{ backgroundColor: '#151A1E', borderRadius: '12px', padding: '24px', border: '1px solid #2A3A35', marginBottom: '24px' }}>
        <h3 style={{ color: '#FFFFFF', fontFamily: 'Georgia', marginTop: 0, marginBottom: '20px' }}>Importar desde Excel</h3>
        <p style={{ color: '#A0ADB5', fontSize: '13px', marginTop: 0, marginBottom: '16px' }}>
          El archivo debe tener las columnas: <span style={{ color: '#FFFFFF' }}>nombre, numero_empleado, salario_quincenal, clabe, empresa_id</span>
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label style={labelStyle}>Empresa</label>
            <select value={empresaId} onChange={e => setEmpresaId(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="">— Selecciona empresa —</option>
              {empresas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Archivo Excel (.xlsx)</label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={e => setArchivo(e.target.files[0])}
              style={{ ...inputStyle, padding: '9px 12px', cursor: 'pointer' }}
            />
          </div>
        </div>
        {error && <div style={{ backgroundColor: '#2A1515', border: '1px solid #A32D2D', borderRadius: '8px', padding: '12px', marginBottom: '16px', color: '#FF6B6B' }}>{error}</div>}
        {mensaje && <div style={{ backgroundColor: '#152A1E', border: '1px solid #0D9E75', borderRadius: '8px', padding: '12px', marginBottom: '16px', color: '#1CC68F' }}>{mensaje}</div>}
        <button onClick={subirExcel} disabled={cargando} style={{
          backgroundColor: cargando ? '#2A3A35' : '#0D9E75', color: '#FFFFFF',
          border: 'none', borderRadius: '8px', padding: '12px 32px',
          fontSize: '15px', fontWeight: 'bold', cursor: cargando ? 'not-allowed' : 'pointer'
        }}>
          {cargando ? 'Importando...' : '↑ Importar empleados'}
        </button>
      </div>

      {empresaId && (
        <div>
          <h3 style={{ color: '#FFFFFF', fontFamily: 'Georgia', marginBottom: '16px' }}>
            {empleados.length} empleado{empleados.length !== 1 ? 's' : ''} registrado{empleados.length !== 1 ? 's' : ''}
          </h3>
          {empleados.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#A0ADB5', padding: '48px', backgroundColor: '#151A1E', borderRadius: '12px', border: '1px solid #2A3A35' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>👥</div>
              <div>No hay empleados en esta empresa aún.</div>
            </div>
          ) : (
            <div style={{ backgroundColor: '#151A1E', borderRadius: '12px', border: '1px solid #2A3A35', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#1C2125', borderBottom: '1px solid #2A3A35' }}>
                    {['#', 'Nombre', 'No. Empleado', 'Salario Quincenal', 'CLABE'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#A0ADB5', fontSize: '12px', letterSpacing: '1px', fontWeight: 'normal' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {empleados.map((emp, i) => (
                    <tr key={emp.id} style={{ borderBottom: '1px solid #2A3A35', backgroundColor: i % 2 === 0 ? 'transparent' : '#1A2025' }}>
                      <td style={{ padding: '12px 16px', color: '#A0ADB5', fontSize: '13px' }}>{emp.id}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>{emp.nombre}</td>
                      <td style={{ padding: '12px 16px', color: '#A0ADB5' }}>{emp.numero_empleado}</td>
                      <td style={{ padding: '12px 16px', color: '#1CC68F' }}>${emp.salario_quincenal?.toLocaleString()} MXN</td>
                      <td style={{ padding: '12px 16px', color: '#A0ADB5', fontFamily: 'monospace', fontSize: '13px' }}>{emp.clabe}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  width: '100%', backgroundColor: '#1C2125', border: '1px solid #2A3A35',
  borderRadius: '8px', padding: '12px', color: '#FFFFFF', fontSize: '15px', boxSizing: 'border-box'
};

const labelStyle = { display: 'block', marginBottom: '6px', color: '#A0ADB5', fontSize: '13px' };

const btnNav = (activo) => ({
  backgroundColor: activo ? '#0D9E75' : 'transparent',
  color: activo ? '#FFFFFF' : '#A0ADB5',
  border: activo ? 'none' : '1px solid #2A3A35',
  borderRadius: '6px', padding: '8px 16px', cursor: 'pointer', fontSize: '14px'
});

export default App;
