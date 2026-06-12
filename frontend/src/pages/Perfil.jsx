import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/api.js';
import '../assets/css/Perfil.css';

const Perfil = ({ token, setToken }) => {
    const [user, setUser]       = useState(null);
    const [reservas, setReservas] = useState([]);
    const navigate              = useNavigate();
    const [alertaIndividual, setAlertaIndividual] = useState([]);
    const [mensajeExito, setMensajeExito]         = useState('');
    const [rol, setRol]         = useState('');
    const [membresiaActiva, setMembresiaActiva]   = useState(false);
    const [fechaVencimiento, setFechaVencimiento] = useState(null);

    // ── Renovación ──
    const [membresíasRenovables, setMembresíasRenovables] = useState([]);
    const [modalAbierto, setModalAbierto]                 = useState(false);
    const [seleccionadas, setSeleccionadas]               = useState([]);
    const [cargandoRenovar, setCargandoRenovar]           = useState(false);
    const [errorRenovar, setErrorRenovar]                 = useState('');

    const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const mapeoDias  = { 0: 'Domingo', 1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado' };

    // ── Carga inicial ──
    useEffect(() => {
        if (!token) { navigate('/login'); return; }

        const fetchData = async () => {
            try {
                const [resUser, resReservas] = await Promise.all([
                    api.get('/socios/me'),
                    api.get('/reservas/mis-reservas'),
                ]);

                setUser(resUser.data);
                setRol(resUser.data.rol);
                setMembresiaActiva(resUser.data.membresia_activa);
                setFechaVencimiento(resUser.data.membresia_vencimiento);

                const hoy = new Date();
                hoy.setHours(0, 0, 0, 0);
                const activas = resReservas.data.filter(r =>
                    (r.estado === 'confirmada' || r.estado === 'en_espera') &&
                    new Date(r.fecha_clase) >= hoy
                );
                setReservas(activas);

                // Membresías renovables (solo miembros)
                if (resUser.data.rol === 'miembro') {
                    try {
                        const resRen = await api.get('/membresia/renovables');
                        setMembresíasRenovables(resRen.data);
                    } catch (e) {
                        console.log('Sin membresías renovables');
                    }
                }

                try {
                    const resAlertas = await api.get('/reservas/alertas-individuales');
                    setAlertaIndividual(resAlertas.data);
                } catch (e) {
                    console.log('sin alertas, no rompe sesión');
                    setAlertaIndividual([]);
                }

            } catch (err) {
                console.error('Error cargando perfil', err);
                localStorage.removeItem('token');
                setToken(null);
                navigate('/login');
            }
        };

        fetchData();
    }, [token, navigate, setToken]);

    // ── Salir de lista de espera ──
    const salirListaEspera = async (reservaId) => {
        try {
            await api.delete(`/reservas/lista-espera/cancelar/${reservaId}`);
            setReservas(prev => prev.filter(r => r.id !== reservaId));
            setMensajeExito('Baja exitosa');
        } catch (error) {
            console.error(error);
            alert('No se pudo salir de la lista de espera');
        }
    };

    // ── Modal: toggle selección ──
    const toggleSeleccion = (claseId) => {
        setSeleccionadas(prev =>
            prev.includes(claseId)
                ? prev.filter(id => id !== claseId)
                : [...prev, claseId]
        );
    };

    // ── Confirmar renovación → cotizar → navegar a ReservaMembresia ──
    const handleConfirmarRenovacion = async () => {
        if (seleccionadas.length === 0) return;
        setCargandoRenovar(true);
        setErrorRenovar('');

        try {
            const res = await api.post('/membresia/cotizar-renovacion', {
                clase_ids: seleccionadas,
            });

            setModalAbierto(false);

            if (res.data.length === 1) {
                const item = res.data[0];
                navigate('/reservar/membresia', {
                    state: {
                        clase:        item.clase,
                        fechasDelMes: item.fechas_mes,
                        esRenovacion: true,
                        mesLabel:     item.mes_label,
                    }
                });
                return;
            }

            // Varias clases: navega a la primera y guarda el resto
            const [primera, ...resto] = res.data;
            if (resto.length > 0) {
                sessionStorage.setItem('renovaciones_pendientes', JSON.stringify(resto));
            }
            navigate('/reservar/membresia', {
                state: {
                    clase:        primera.clase,
                    fechasDelMes: primera.fechas_mes,
                    esRenovacion: true,
                    mesLabel:     primera.mes_label,
                }
            });

        } catch (err) {
            setErrorRenovar(err.response?.data?.detail || 'Error al cotizar renovación.');
        } finally {
            setCargandoRenovar(false);
        }
    };

    // ── Formateador de fecha para el chip ──
    const formatearUltimaFecha = (fechaStr) => {
        if (!fechaStr) return null;
        const f = new Date(fechaStr + 'T00:00:00');
        return f.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
    };

    // Para cada clase de membresía, calcula cuál es la última fecha reservada
    const ultimaFechaPorClase = useMemo(() => {
        const map = {};
        reservas.forEach(r => {
            if (r.tipo !== 'membresia') return;
            if (!map[r.clase_id] || r.fecha_clase > map[r.clase_id]) {
                map[r.clase_id] = r.fecha_clase;
            }
        });
        return map;
    }, [reservas]);

    // Devuelve info del chip para una reserva de membresía:
    // - Si es la última del mes y aún no pasó → { tipo: 'vence', fecha }
    // - Si ya pasó la última clase → { tipo: 'renovar', mesLabel }
    // - En cualquier otra reserva → null
    const chipMembresia = (reserva) => {
        if (reserva.tipo !== 'membresia') return null;
        const esUltima = ultimaFechaPorClase[reserva.clase_id] === reserva.fecha_clase;
        if (!esUltima) return null;

        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const fechaUltima = new Date(reserva.fecha_clase + 'T00:00:00');
        const renovable   = membresíasRenovables.find(m => m.clase_id === reserva.clase_id);

        if (fechaUltima >= hoy) {
            return { tipo: 'vence', fecha: reserva.fecha_clase };
        } else {
            return { tipo: 'renovar', mesLabel: renovable?.mes_renovacion || null };
        }
    };

    // ── Agrupación por día ──
    const reservasPorDia = diasSemana.reduce((acc, dia) => { acc[dia] = []; return acc; }, {});
    [...reservas]
        .sort((a, b) => {
            const mA = `${a.fecha_clase}T${a.clase?.horario || '00:00:00'}`;
            const mB = `${b.fecha_clase}T${b.clase?.horario || '00:00:00'}`;
            return mA.localeCompare(mB);
        })
        .forEach(r => {
            const fecha     = new Date(r.fecha_clase + 'T00:00:00');
            const nombreDia = mapeoDias[fecha.getDay()];
            if (reservasPorDia[nombreDia]) reservasPorDia[nombreDia].push(r);
        });

    return (
        <div className="perfil-container">
            {user ? (
                <>
                    {/* ── BLOQUE 1: HERO ── */}
                    <div className="perfil-info-block">
                        <div className="perfil-hero">
                            <div className="perfil-hero-bg" />
                            <div className="perfil-hero-inner">
                                <div className="perfil-avatar">
                                    {user.nombre ? user.nombre.charAt(0).toUpperCase() : 'S'}
                                </div>
                                <div className="perfil-hero-info">
                                    <h2 className="perfil-nombre">{user.nombre}</h2>
                                    <p className="perfil-id">ID Socio · #2026{user.id || '01'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── DATOS PERSONALES ── */}
                    <div className="perfil-datos-row">
                        <div className="dato-item">
                            <span className="dato-label">Email</span>
                            <span className="dato-valor">{user.email || 'No registrado'}</span>
                        </div>
                        <div className="dato-item">
                            <span className="dato-label">DNI</span>
                            <span className="dato-valor">{user.dni || '—'}</span>
                        </div>
                        <div className="dato-item">
                            <span className="dato-label">Teléfono</span>
                            <span className="dato-valor">{user.telefono || '—'}</span>
                        </div>

                        {user.rol === 'miembro' && (
                            <div className="dato-item">
                                <span className="dato-label">Créditos disponibles</span>
                                <span className="dato-valor">🎟️ {user.creditos_disponibles || 0}</span>
                            </div>
                        )}

                        <div className="dato-item btn-container">
                            <button
                                className="btn-cambiar-pass"
                                onClick={() => navigate('/cambiar-password')}
                            >
                                Cambiar Contraseña
                            </button>
                        </div>

                        {/* APTO FÍSICO */}
                        {user.rol !== 'profesor' && (
                            <div className="perfil-acta-section">
                                <div className="perfil-section-header">
                                    <span className="perfil-section-icon">🩺</span>
                                    <h3 className="perfil-section-title">Apto Físico</h3>
                                </div>
                                {user.apto_fisico ? (
                                    <a
                                        href={`http://localhost:8000/${user.apto_fisico}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="btn-ver-acta"
                                    >
                                        Ver PDF
                                    </a>
                                ) : (
                                    <p className="acta-faltante">No tenés un apto físico cargado.</p>
                                )}
                            </div>
                        )}

                        {/* MEMBRESÍA + BOTÓN RENOVAR */}
                        {rol === 'miembro' && (
                            <div className="perfil-membresia">
                                {membresiaActiva ? (
                                    <p>🟢 Membresía activa hasta: <strong>{fechaVencimiento}</strong></p>
                                ) : (
                                    <p>🔴 No tenés membresía activa</p>
                                )}

                                {membresíasRenovables.length > 0 && (
                                    <button
                                        className="boton-accion"
                                        onClick={() => {
                                            setModalAbierto(true);
                                            setSeleccionadas([]);
                                            setErrorRenovar('');
                                        }}
                                    >
                                        Renovar membresías
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {mensajeExito && (
                        <div className="mensaje-exito">{mensajeExito}</div>
                    )}

                    {/* ── BLOQUE 2: CALENDARIO DE RESERVAS ── */}
                    {user.rol !== 'profesor' && (
                        <div className="perfil-calendar-block">
                            <div className="perfil-reservas-section">
                                <div className="perfil-section-header">
                                    <span className="perfil-section-icon">📅</span>
                                    <h3 className="perfil-section-title">Mis Reservas Activas</h3>
                                    {reservas.length > 0 && (
                                        <span className="perfil-reservas-count">{reservas.length}</span>
                                    )}
                                </div>

                                {reservas.length === 0 ? (
                                    <div className="reserva-empty">
                                        <span className="reserva-empty-icon">🏋️</span>
                                        <p>No tenés turnos reservados para esta semana.</p>
                                        <Link to="/" className="reserva-empty-link">
                                            Andá al inicio para agendar una clase
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="perfil-agenda-container">
                                        {diasSemana.map(dia => {
                                            const clasesDelDia = reservasPorDia[dia];
                                            return (
                                                <div className="agenda-columna" key={dia}>
                                                    <div className="agenda-columna-header">
                                                        <h4>{dia}</h4>
                                                        <span className={`agenda-badge ${clasesDelDia.length > 0 ? 'active' : ''}`}>
                                                            {clasesDelDia.length}
                                                        </span>
                                                    </div>
                                                    <div className="agenda-columna-body">
                                                        {clasesDelDia.length === 0 ? (
                                                            <p className="agenda-columna-vacio">Sin clases</p>
                                                        ) : (
                                                            clasesDelDia.map(r => {
                                                                const chip = chipMembresia(r);
                                                                return (
                                                                    <div className="reserva-card-mini" key={r.id}>
                                                                        <div className="reserva-mini-fecha">
                                                                            {new Date(r.fecha_clase + 'T00:00:00').toLocaleDateString('es-AR', {
                                                                                day: 'numeric', month: 'short'
                                                                            })}
                                                                        </div>
                                                                        <div className="reserva-mini-detalles">
                                                                            <span className="reserva-mini-actividad">
                                                                                {r.clase?.actividad || `Clase #${r.clase_id}`}
                                                                            </span>
                                                                            <span className="reserva-mini-horario">
                                                                                {r.clase?.horario ? r.clase.horario.slice(0, 5) : '—'} hs
                                                                            </span>
                                                                            <span className="reserva-mini-tipo">
                                                                                {r.tipo === 'membresia' ? 'Memb.' : 'Indiv.'}
                                                                            </span>

                                                                            {/* ── CHIP DE VENCIMIENTO / RENOVACIÓN ── */}
                                                                            {chip?.tipo === 'vence' && (
                                                                                <span className="reserva-mini-vencimiento">
                                                                                    📅 Hasta el {formatearUltimaFecha(chip.fecha)}
                                                                                </span>
                                                                            )}
                                                                            {chip?.tipo === 'renovar' && (
                                                                                <span className="reserva-mini-renovar">
                                                                                    🔄 Podés renovar para {chip.mesLabel || 'el mes siguiente'}
                                                                                </span>
                                                                            )}

                                                                            {r.lista_espera && (
                                                                                <>
                                                                                    <span className="reserva-mini-espera">En Espera</span>
                                                                                    <button
                                                                                        className="btn-salir-espera"
                                                                                        onClick={() => salirListaEspera(r.id)}
                                                                                    >
                                                                                        Salir de lista de espera
                                                                                    </button>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {user.rol !== 'profesor' && (
                        <Link to="/historial-pagos" className="btn-historial">
                            Ver historial de pagos
                        </Link>
                    )}

                    {/* ── MODAL DE RENOVACIÓN ── */}
                    {modalAbierto && (
                        <div className="modal-overlay" onClick={() => setModalAbierto(false)}>
                            <div className="modal-renovar" onClick={e => e.stopPropagation()}>
                                <div className="modal-renovar-header">
                                    <h3>Renovar membresías</h3>
                                    <button className="modal-cerrar" onClick={() => setModalAbierto(false)}>✕</button>
                                </div>

                                <p className="modal-renovar-desc">
                                    Seleccioná las clases que querés renovar. Cada una se calculará para el mes que corresponda.
                                </p>

                                <div className="modal-renovar-lista">
                                    {membresíasRenovables.map(m => (
                                        <div
                                            key={m.clase_id}
                                            className={`modal-renovar-item ${seleccionadas.includes(m.clase_id) ? 'selected' : ''}`}
                                            onClick={() => toggleSeleccion(m.clase_id)}
                                        >
                                            <div className="modal-renovar-item-check">
                                                {seleccionadas.includes(m.clase_id) ? '✓' : ''}
                                            </div>
                                            <div className="modal-renovar-item-info">
                                                <span className="modal-renovar-actividad" style={{ textTransform: 'capitalize' }}>
                                                    {m.actividad}
                                                </span>
                                                <span className="modal-renovar-detalle">
                                                    {m.dia} · {m.horario} hs · {m.total_clases} clase{m.total_clases !== 1 ? 's' : ''}
                                                </span>
                                                <span className="modal-renovar-mes">
                                                    📅 Se renueva para {m.mes_renovacion}
                                                </span>
                                                {m.ultima_fecha_reservada && (
                                                    <span className="modal-renovar-vence">
                                                        ⚠️ Vence el {formatearUltimaFecha(m.ultima_fecha_reservada)}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="modal-renovar-precio">
                                                ${(m.precio_individual * m.total_clases).toFixed(2)}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {errorRenovar && (
                                    <p className="pago-error-msg" style={{ margin: '0 22px' }}>{errorRenovar}</p>
                                )}

                                <div className="modal-renovar-footer">
                                    <span className="modal-renovar-selec">
                                        {seleccionadas.length} seleccionada{seleccionadas.length !== 1 ? 's' : ''}
                                    </span>
                                    <button
                                        className="boton-accion"
                                        onClick={handleConfirmarRenovacion}
                                        disabled={seleccionadas.length === 0 || cargandoRenovar}
                                    >
                                        {cargandoRenovar ? 'Cargando...' : 'Continuar →'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div className="perfil-loading">
                    <div className="perfil-loading-spinner" />
                    <p>Cargando panel de socio...</p>
                </div>
            )}
        </div>
    );
};

export default Perfil;
