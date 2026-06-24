import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/api.js';
import '../assets/css/Perfil.css';
import ModalConfirmacion from '../components/ModalConfirmacion.jsx';
import ModalResultado from '../components/ModalResultado.jsx';

const Perfil = ({ token, setToken }) => {
    const [user, setUser]           = useState(null);
    const [reservas, setReservas]   = useState([]);
    const navigate                  = useNavigate();
    const [alertaIndividual, setAlertaIndividual] = useState([]);
    const [mensajeExito, setMensajeExito]         = useState('');
    const [rol, setRol]             = useState('');
    const [membresiaActiva, setMembresiaActiva]   = useState(false);
    const [fechaVencimiento, setFechaVencimiento] = useState(null);

<<<<<<< HEAD
    // ── Renovación ──
    const [membresíasRenovables, setMembresíasRenovables] = useState([]);
    const [modalAbierto, setModalAbierto]                 = useState(false);
    const [seleccionadas, setSeleccionadas]               = useState([]);
    const [cargandoRenovar, setCargandoRenovar]           = useState(false);
    const [errorRenovar, setErrorRenovar]                 = useState('');
=======
    const [creditos, setCreditos] = useState(0);

    // ── MODALES ──
    const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
    const [mostrarResultado, setMostrarResultado] = useState(false);
    const [reservaAbordador, setReservaAbordador] = useState(null);
    const [mensajeResultado, setMensajeResultado] = useState("");

    const hoy = new Date();
    const dia = hoy.getDate();

    const puedeRenovar =
        user?.rol === "miembro" &&
        user?.membresia_vencimiento &&
        dia >= 1 &&
        dia <= 10;

    useEffect(() => {
        const cargarPerfil = async () => {
            const res = await api.get('/socios/me');

            setCreditos(res.data.creditos_disponibles || 0);
            setRol(res.data.rol);
            setMembresiaActiva(res.data.membresia_activa);
            setFechaVencimiento(res.data.membresia_vencimiento);
            setUser(res.data);
        };

        cargarPerfil();
    }, []);

    const salirListaEspera = async (reservaId) => {
        try {

            await api.delete(
                `/reservas/lista-espera/cancelar/${reservaId}`
            );

            setReservas(prev =>
                prev.filter(r => r.id !== reservaId)
            );

            setMensajeResultado("Baja exitosa");
            setMostrarResultado(true);

        } catch (error) {

            console.error(error);

            alert("No se pudo salir de la lista de espera");
        }
    };

    const renovarMembresia = async () => {
        try {
            setLoadingRenovar(true);

            const res = await api.post("/membresia/renovar");

            alert(res.data.mensaje || "Membresía renovada con éxito");

            const resUser = await api.get("/socios/me");
            setUser(resUser.data);

        } catch (err) {
            console.error(err);
            alert(err?.response?.data?.detail || "Error al renovar membresía");
        } finally {
            setLoadingRenovar(false);
        }
    };
>>>>>>> main

    const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const mapeoDias  = { 0: 'Domingo', 1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado' };

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
                setReservas(resReservas.data);

                if (resUser.data.rol === 'miembro') {
                    try {
                        const resRen = await api.get('/membresia/renovables');
                        setMembresíasRenovables(resRen.data);
                    } catch (e) {
                        setMembresíasRenovables([]);
                    }
                }

<<<<<<< HEAD
=======
                const activas = resReservas.data.filter(r =>
                    (r.estado === 'confirmada' || r.estado === 'en_espera' || r.estado === 'notificado') &&
                    new Date(r.fecha_clase) >= hoy
                );

                setReservas(activas);

                // ALERTAS EN OTRO TRY (IMPORTANTE)
>>>>>>> main
                try {
                    const resAlertas = await api.get('/reservas/alertas-individuales');
                    setAlertaIndividual(resAlertas.data);
                } catch (e) {
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

    const salirListaEspera = async (reservaId) => {
        try {
            await api.delete(`/reservas/lista-espera/cancelar/${reservaId}`);
            setReservas(prev => prev.filter(r => r.id !== reservaId));
            setMensajeExito('Baja exitosa');
        } catch (error) {
            alert('No se pudo salir de la lista de espera');
        }
    };

    const toggleSeleccion = (claseId) => {
        setSeleccionadas(prev =>
            prev.includes(claseId)
                ? prev.filter(id => id !== claseId)
                : [...prev, claseId]
        );
    };

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

    const formatearFecha = (fechaStr, opciones = { day: 'numeric', month: 'long' }) => {
        if (!fechaStr) return null;
        return new Date(fechaStr + 'T00:00:00').toLocaleDateString('es-AR', opciones);
    };

    // ── Agrupar por mes → dentro de cada mes por día ──
    const reservasPorMes = useMemo(() => {
        const meses = {};
        [...reservas]
            .sort((a, b) => a.fecha_clase.localeCompare(b.fecha_clase))
            .forEach(r => {
                const fecha    = new Date(r.fecha_clase + 'T00:00:00');
                const mesKey   = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
                const mesLabel = fecha.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
                if (!meses[mesKey]) {
                    meses[mesKey] = { label: mesLabel, porDia: {} };
                    diasSemana.forEach(d => { meses[mesKey].porDia[d] = []; });
                }
                const nombreDia = mapeoDias[fecha.getDay()];
                if (meses[mesKey].porDia[nombreDia]) {
                    meses[mesKey].porDia[nombreDia].push(r);
                }
            });
        return meses;
    }, [reservas]);

    // ── Última fecha confirmada por clase/mes (para chip "Última del mes") ──
    const ultimaFechaPorClaseYMes = useMemo(() => {
        const map = {};
        reservas.forEach(r => {
            if (r.tipo !== 'membresia' || r.estado !== 'confirmada') return;
            const fecha = new Date(r.fecha_clase + 'T00:00:00');
            const key   = `${r.clase_id}-${fecha.getFullYear()}-${fecha.getMonth()}`;
            if (!map[key] || r.fecha_clase > map[key]) map[key] = r.fecha_clase;
        });
<<<<<<< HEAD
        return map;
    }, [reservas]);

    // ── Chip por reserva ──
    const chipMembresia = (reserva) => {
        if (reserva.tipo !== 'membresia') return null;

        // Reserva pendiente de pago = mes siguiente pre-reservado
        if (reserva.estado === 'pendiente_pago') {
            return { tipo: 'pendiente' };
        }

        // Reserva confirmada: marcar solo la última del mes
        const fecha    = new Date(reserva.fecha_clase + 'T00:00:00');
        const key      = `${reserva.clase_id}-${fecha.getFullYear()}-${fecha.getMonth()}`;
        const esUltima = ultimaFechaPorClaseYMes[key] === reserva.fecha_clase;
        if (!esUltima) return null;

        return { tipo: 'vence' };
=======
    
    // ── CANCELAR RESERVA ──
    const iniciarCancelacion = (reserva) => {
        setReservaAbordador(reserva);
        setMostrarConfirmacion(true);
    };

    const confirmarCancelacion = async () => {
        if (!reservaAbordador) return;

        try {
            setMostrarConfirmacion(false);

            let endpoint = '';
            if (reservaAbordador.tipo === 'membresia') {
                endpoint = `/reservas/membresia/cancelar/${reservaAbordador.id}`;
            } else {
                endpoint = `/reservas/individual/cancelar-confirmada/${reservaAbordador.id}`;
            }

            let res;
            if (reservaAbordador.tipo === 'membresia') {
                res = await api.post(`/reservas/membresia/cancelar/${reservaAbordador.id}`);
            } else {
                res = await api.delete(`/reservas/individual/cancelar-confirmada/${reservaAbordador.id}`);
            }

            setMensajeResultado(res.data.mensaje);
            setMostrarResultado(true);

            // Actualizar la lista de reservas
            setReservas(prev => prev.filter(r => r.id !== reservaAbordador.id));

            // Actualizar créditos si se otorgó uno
            if (res.data.credito_otorgado) {
                setCreditos(res.data.creditos_disponibles);
            }

            setReservaAbordador(null);

        } catch (error) {
            console.error("Error cancelando reserva:", error);
            setMostrarConfirmacion(false);
            alert("Error: " + (error.response?.data?.detail || "No se pudo cancelar"));
            setReservaAbordador(null);
        }
    };

    const cancelarCancelacion = () => {
        setMostrarConfirmacion(false);
        setReservaAbordador(null);
    };

    // ── ACEPTAR CUPO ──
    const aceptarCupo = async (reservaId) => {
        try {
            const res = await api.post(`/reservas/aceptar-cupo/${reservaId}`);

            setMensajeResultado(res.data.mensaje);
            setMostrarResultado(true);

            // Actualizar estado de la reserva
            setReservas(prev =>
                prev.map(r =>
                    r.id === reservaId ? { ...r, estado: 'confirmada', notificado: false } : r
                )
            );

        } catch (error) {
            console.error("Error aceptando cupo:", error);
            alert("Error: " + (error.response?.data?.detail || "No se pudo aceptar el cupo"));
        }
    };

    // ── RECHAZAR CUPO ──
    const rechazarCupo = async (reservaId) => {
        try {
            const res = await api.post(`/reservas/rechazar-cupo/${reservaId}`);

            setMensajeResultado(res.data.mensaje);
            setMostrarResultado(true);

            // Actualizar estado de la reserva
            setReservas(prev =>
                prev.map(r =>
                    r.id === reservaId ? { ...r, estado: 'en_espera', notificado: false } : r
                )
            );

        } catch (error) {
            console.error("Error rechazando cupo:", error);
            alert("Error: " + (error.response?.data?.detail || "No se pudo rechazar el cupo"));
        }
>>>>>>> main
    };

    return (
        <div className="perfil-container">
            
            <ModalConfirmacion
                isOpen={mostrarConfirmacion}
                titulo="¿Estás seguro?"
                onConfirm={confirmarCancelacion}
                onCancel={cancelarCancelacion}
            />

            <ModalResultado
                isOpen={mostrarResultado}
                mensaje={mensajeResultado}
                onClose={() => setMostrarResultado(false)}
            />

            {user ? (
                <>
                    {/* ── HERO ── */}
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
<<<<<<< HEAD
                                <span className="dato-valor">🎟️ {user.creditos_disponibles || 0}</span>
=======
                                <span className="dato-valor">
                                    🎟️ {creditos}  {/* Antes estaba "{user.creditos_disponibles || 0}" pero lo cambie porque me dijo esto claude "Si dejás user.creditos_disponibles, el número en pantalla no cambia después de la cancelación, porque user no se actualiza. Solo creditos (el estado nuevo) se actualiza." */}
                                </span>
>>>>>>> main
                            </div>
                        )}

                        <div className="dato-item btn-container">
                            <button className="btn-cambiar-pass" onClick={() => navigate('/cambiar-password')}>
                                Cambiar Contraseña
                            </button>
                        </div>

                        {user.rol !== 'profesor' && (
                            <div className="perfil-acta-section">
                                <div className="perfil-section-header">
                                    <span className="perfil-section-icon">🩺</span>
                                    <h3 className="perfil-section-title">Apto Físico</h3>
                                </div>
                                {user.apto_fisico ? (
                                    <a href={`http://localhost:8000/${user.apto_fisico}`} target="_blank" rel="noreferrer" className="btn-ver-acta">
                                        Ver PDF
                                    </a>
                                ) : (
                                    <p className="acta-faltante">No tenés un apto físico cargado.</p>
                                )}
                            </div>
                        )}

                        {/* MEMBRESÍA */}
                        {rol === 'miembro' && (
                            <div className="perfil-membresia">
                                {membresiaActiva && fechaVencimiento ? (
                                    <p>🟢 Membresía activa hasta: <strong>{fechaVencimiento}</strong></p>
                                ) : (
                                    <p>🔴 No tenés membresía activa</p>
                                )}
                                {membresíasRenovables.length > 0 && (
                                    <button
                                        className="boton-accion"
                                        onClick={() => { setModalAbierto(true); setSeleccionadas([]); setErrorRenovar(''); }}
                                    >
                                        Renovar membresías
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {mensajeExito && <div className="mensaje-exito">{mensajeExito}</div>}

                    {/* ── CALENDARIO ── */}
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
                                        <p>No tenés turnos reservados.</p>
                                        <Link to="/" className="reserva-empty-link">
                                            Andá al inicio para agendar una clase
                                        </Link>
                                    </div>
                                ) : (
<<<<<<< HEAD
                                    Object.entries(reservasPorMes).map(([mesKey, { label, porDia }]) => (
                                        <div key={mesKey} className="perfil-mes-block">
                                            <h4 className="perfil-mes-titulo" style={{ textTransform: 'capitalize' }}>
                                                📆 {label}
                                            </h4>
                                            <div className="perfil-agenda-container">
                                                {diasSemana.map(dia => {
                                                    const clasesDelDia = porDia[dia] || [];
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
                                                                        // Las pendiente_pago de membresía tienen estilo diferente
                                                                        const esPendiente = r.tipo === 'membresia' && r.estado === 'pendiente_pago';
                                                                        return (
                                                                            <div
                                                                                className={`reserva-card-mini ${esPendiente ? 'reserva-card-mini--pendiente' : ''}`}
                                                                                key={r.id}
=======
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
                                                            clasesDelDia.map(r => (
                                                                <div className="reserva-card-mini" key={r.id}>
                                                                    <div className="reserva-mini-fecha">
                                                                        {new Date(r.fecha_clase + 'T00:00:00').toLocaleDateString('es-AR', {
                                                                            day: 'numeric',
                                                                            month: 'short',
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
                                                                        {r.lista_espera && r.estado === 'en_espera' && (
                                                                            <span className="reserva-mini-espera">
                                                                                En Espera
                                                                            </span>
                                                                        )}

                                                                        {r.notificado && (
                                                                            <span className="reserva-mini-notificado">
                                                                                ¡Cupo disponible!
                                                                            </span>
                                                                        )}

                                                                        {/* Botones de acción */}
                                                                        {r.estado === 'confirmada' && (
                                                                            <button
                                                                                className="btn-cancelar-reserva"
                                                                                onClick={() => iniciarCancelacion(r)}
                                                                            >
                                                                                Cancelar
                                                                            </button>
                                                                        )}

                                                                        {r.notificado && (
                                                                            <button
                                                                                className="btn-aceptar-cupo"
                                                                                onClick={() => aceptarCupo(r.id)}
                                                                            >
                                                                                Aceptar cupo
                                                                            </button>
                                                                        )}

                                                                        {r.notificado && (
                                                                            <button
                                                                                className="btn-rechazar-cupo"
                                                                                onClick={() => rechazarCupo(r.id)}
                                                                            >
                                                                                Rechazar cupo
                                                                            </button>
                                                                        )}


                                                                        {r.lista_espera && r.estado === 'en_espera' &&(
                                                                            <button
                                                                                className="btn-salir-espera"
                                                                                onClick={() => salirListaEspera(r.id)}
>>>>>>> main
                                                                            >
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

                                                                                    {/* Chip: pendiente de pago (mes siguiente pre-reservado) */}
                                                                                    {chip?.tipo === 'pendiente' && (
                                                                                        <span className="reserva-mini-pendiente">
                                                                                            ⏳ Cupo reservado · Pendiente de pago
                                                                                        </span>
                                                                                    )}

                                                                                    {/* Chip: última clase confirmada del mes */}
                                                                                    {chip?.tipo === 'vence' && (
                                                                                        <span className="reserva-mini-vencimiento">
                                                                                            📅 Última del mes
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
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {user.rol !== 'profesor' && (
                        <Link to="/historial-pagos" className="btn-historial">
                            Ver historial de pagos
                        </Link>
                    )}

                    {/* ── MODAL RENOVACIÓN ── */}
                    {modalAbierto && (
                        <div className="modal-overlay" onClick={() => setModalAbierto(false)}>
                            <div className="modal-renovar" onClick={e => e.stopPropagation()}>
                                <div className="modal-renovar-header">
                                    <h3>Renovar membresías</h3>
                                    <button className="modal-cerrar" onClick={() => setModalAbierto(false)}>✕</button>
                                </div>
                                <p className="modal-renovar-desc">
                                    Seleccioná las clases que querés renovar para el mes que viene.
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
                                                    📅 Para {m.mes_renovacion}
                                                </span>
                                                {m.ultima_fecha_reservada && (
                                                    <span className="modal-renovar-vence">
                                                        ⚠️ Venció el {formatearFecha(m.ultima_fecha_reservada)}
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
