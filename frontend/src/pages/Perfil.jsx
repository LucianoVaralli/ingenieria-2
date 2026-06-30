import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/api.js';
import '../assets/css/Perfil.css';
import ModalConfirmacion from '../components/ModalConfirmacion.jsx';
import ModalResultado from '../components/ModalResultado.jsx';
import EscanearQR from "./EscanearQR";
import QRCode from "qrcode";

const Perfil = ({ token, setToken }) => {
    const [user, setUser]           = useState(null);
    const [reservas, setReservas]   = useState([]);
    const navigate                  = useNavigate();
    const [alertaIndividual, setAlertaIndividual] = useState([]);
    const [mensajeExito, setMensajeExito]         = useState('');
    const [rol, setRol]             = useState('');
    const [membresiaActiva, setMembresiaActiva]   = useState(false);
    const [fechaVencimiento, setFechaVencimiento] = useState(null);

    // ── Renovación ──
    const [membresíasRenovables, setMembresíasRenovables] = useState([]);
    const [modalAbierto, setModalAbierto]                 = useState(false);
    const [seleccionadas, setSeleccionadas]               = useState([]);
    const [cargandoRenovar, setCargandoRenovar]           = useState(false);
    const [errorRenovar, setErrorRenovar]                 = useState('');
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

    // PROFESOR
    const [clasesProfesor, setClasesProfesor] = useState([]);
    const [clases, setClases] = useState([]);
    const [error, setError] = useState("");

    //ESCANER 
    const [abrirScanner, setAbrirScanner] = useState(false);
    const [qrGenerado, setQrGenerado] = useState({});
    const [qrUrls, setQrUrls] = useState({});
    const [mostrarQR, setMostrarQR] = useState(false);
    const [qrSeleccionado, setQrSeleccionado] = useState(null);

    useEffect(() => {
            cargarClases();
        }, []);
    
    const cargarClases = async () => {
        try {
            const res = await api.get("/clases/mis-clases");
            setClases(res.data);
        } catch (error) {
            setError(
                error.response?.data?.detail ||
                "Error cargando las clases"
            );
        }
    };
    
    const generarQR = async (claseId) => {
        // Buscar la clase
        const clase = clasesProfesor.find(c => c.id === claseId);

        if (!clase) return;

        const estado = estadoClase(clase);

        if (estado === "pendiente") {
            alert("El QR sólo puede generarse cuando comienza la clase.");
            return;
        }

        if (estado === "caducado") {
            alert("La clase ya finalizó.");
            return;
        }

        // Ya fue generado
        if (qrGenerado[claseId]) {
            alert("El QR ya fue generado.");
            return;
        }

        try {
            const res = await api.post(`/clases/${claseId}/generar-qr`);
            const codigo = res.data.codigo_qr;

            const url = await QRCode.toDataURL(codigo, { width: 120 });

            setQrGenerado(prev => ({
                ...prev,
                [claseId]: url
            }));

            alert("QR generado");

        } catch (err) {
            console.error(err);
            alert("Error generando QR");
        }
    };

    const abrirQR = (clase) => {
        const estado = estadoClase(clase);

        if (estado === "pendiente") {
            alert("La clase todavía no comenzó.");
            return;
        }

        if (estado === "caducado") {
            alert("El QR ya caducó.");
            return;
        }

        if (!qrGenerado[clase.id]) {
            alert("Primero generá el QR.");
            return;
        }

        setQrSeleccionado(qrGenerado[clase.id]);
        setMostrarQR(true);
    };

    const obtenerQRClase = async (claseId) => {
        if (qrUrls[claseId]) return;

        try {
            const res = await api.post(`/clases/${claseId}/generar-qr`);
            const codigo = res.data.codigo_qr;

            const url = await QRCode.toDataURL(codigo, { width: 100 });

            setQrUrls(prev => ({ ...prev, [claseId]: url }));

            localStorage.setItem(`qr_clase_${claseId}`, url);

        } catch (err) {
            console.error("Error obteniendo QR", err);
        }
    };

    const capitalize = (texto) =>
        texto
            ? texto.charAt(0).toUpperCase() + texto.slice(1)
            : "";

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
            setCargandoRenovar(true);

            const res = await api.post("/membresia/renovar");

            alert(res.data.mensaje || "Membresía renovada con éxito");

            const resUser = await api.get("/socios/me");
            setUser(resUser.data);

        } catch (err) {
            console.error(err);
            alert(err?.response?.data?.detail || "Error al renovar membresía");
        } finally {
            setCargandoRenovar(false);
        }
    };

    const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const mapeoDias  = { 0: 'Domingo', 1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado' };

    const ahora = new Date();

    // 1. Obtenemos el nombre del día de hoy en minúsculas (ej: "martes")
    const opciones = { weekday: 'long' };
    const diaHoyTexto = mapeoDias[ahora.getDay()].toLowerCase();

    // 2. Clases de hoy
    const clasesHoy = (clasesProfesor || []).filter(c => {
        if (!c?.dia || !c?.horario) return false;
        
        // Normalizamos a minúsculas por si acaso
        const diaClase = c.dia.toLowerCase(); 
        if (diaClase !== diaHoyTexto) return false;

        // Validar si la hora ya pasó
        const [hora, minuto] = c.horario.split(':');
        const fechaClase = new Date();
        fechaClase.setHours(Number(hora), Number(minuto), 0, 0);

        return fechaClase > ahora;
    });

    // 3. Clases futuras (días distintos a hoy)
    const clasesFuturas = (clasesProfesor || []).filter(c => {
        if (!c?.dia) return false;
        return c.dia.toLowerCase() !== diaHoyTexto;
    });

    useEffect(() => {
        if (!token) {
            navigate("/login");
            return;
        }

        const fetchData = async () => {
            try {
                const resUser = await api.get("/socios/me");

                setUser(resUser.data);
                setRol(resUser.data.rol);
                setMembresiaActiva(resUser.data.membresia_activa);
                setFechaVencimiento(resUser.data.membresia_vencimiento);

                // ===========================
                // PROFESOR
                // ===========================
                if (resUser.data.rol === "profesor") {

                    const resClases = await api.get("/clases/mis-clases");
                    setClasesProfesor(resClases.data);
                }

                // ===========================
                // SOCIO NORMAL
                // ===========================
                else {

                    const resReservas = await api.get("/reservas/mis-reservas");

                    const activas = resReservas.data.filter(r =>
                        (
                            r.estado === "confirmada" ||
                            r.estado === "en_espera" ||
                            r.estado === "notificado" ||
                            r.estado === "pendiente_pago"
                        ) &&
                        new Date(r.fecha_clase) >= hoy
                    );

                    setReservas(activas);

                    if (resUser.data.rol === "miembro") {
                        try {
                            const resRen = await api.get("/membresia/renovables");
                            setMembresíasRenovables(resRen.data);
                        } catch {
                            setMembresíasRenovables([]);
                        }
                    }

                    try {
                        const resAlertas = await api.get("/reservas/alertas-individuales");
                        setAlertaIndividual(resAlertas.data);
                    } catch {
                        setAlertaIndividual([]);
                    }
                }

            } catch (err) {
                console.error("Error cargando perfil", err);
                localStorage.removeItem("token");
                setToken(null);
                navigate("/login");
            }
        };

        fetchData();

    }, [token, navigate, setToken]);

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

            // Para renovación, las fechas ya existen como pendiente_pago en la BD.
            // Vamos directo a /pago sin pasar por /reservar/membresia,
            // así evitamos que ese endpoint descarte las fechas por ya estar reservadas.
            // El endpoint /reservas/membresia/confirmar-pago se encarga de actualizar
            // los pendiente_pago existentes a confirmada.

            if (res.data.length === 1) {
                const item = res.data[0];
                const monto = item.clase.precio_individual * item.fechas_mes.length;

                navigate('/pago', {
                    state: {
                        claseId:            item.clase.id,
                        claseInfo:          item.clase,
                        fechasConCupo:      item.fechas_mes,
                        fechasSinCupo:      [],
                        monto:              monto,
                        creditosUsados:     0,
                        esRenovacion:       true,
                        esPrimeraMembresia: false,
                        mesLabel:           item.mes_label,
                    }
                });
                return;
            }

            // Múltiples clases: procesar la primera, guardar el resto
            const [primera, ...resto] = res.data;
            if (resto.length > 0) {
                sessionStorage.setItem('renovaciones_pendientes', JSON.stringify(resto));
            }

            const monto = primera.clase.precio_individual * primera.fechas_mes.length;

            // Armar resumen completo de todas las clases para mostrar en /pago
            const todasLasClases = res.data.map(item => ({
                actividad:   item.clase.actividad,
                dia:         item.clase.dia,
                horario:     item.clase.horario,
                clases:      item.fechas_mes.length,
                subtotal:    item.clase.precio_individual * item.fechas_mes.length,
            }));
            const montoTotal = todasLasClases.reduce((acc, c) => acc + c.subtotal, 0);

            navigate('/pago', {
                state: {
                    claseId:            primera.clase.id,
                    claseInfo:          primera.clase,
                    fechasConCupo:      primera.fechas_mes,
                    fechasSinCupo:      [],
                    monto:              monto,
                    creditosUsados:     0,
                    esRenovacion:       true,
                    esPrimeraMembresia: false,
                    mesLabel:           primera.mes_label,
                    todasLasClases,
                    montoTotal,
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
    }; 
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
    };
    
    const estadoClase = (clase) => {
        const dias = {
            domingo: 0,
            lunes: 1,
            martes: 2,
            miercoles: 3,
            jueves: 4,
            viernes: 5,
            sabado: 6
        };

        const ahora = new Date();

        const inicio = new Date();

        const diferencia =
            dias[clase.dia.toLowerCase()] -
            ahora.getDay();

        inicio.setDate(ahora.getDate() + diferencia);

        const [h, m] = clase.horario.split(":");

        inicio.setHours(Number(h), Number(m), 0, 0);

        const fin = new Date(inicio);

        fin.setHours(fin.getHours() + 1);

        if (ahora < inicio)
            return "pendiente";

        if (ahora > fin)
            return "caducado";

        return "activa";
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
                                <span className="dato-valor">
                                    🎟️ {creditos}  {/* Antes estaba "{user.creditos_disponibles || 0}" pero lo cambie porque me dijo esto claude "Si dejás user.creditos_disponibles, el número en pantalla no cambia después de la cancelación, porque user no se actualiza. Solo creditos (el estado nuevo) se actualiza." */}
                                </span>
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
                        {user?.rol !== "profesor" && (
                            <div className="perfil-qr-boton">
                                <button
                                    className="btn-escanear-qr"
                                    onClick={() => setAbrirScanner(true)}
                                >
                                    📷 Escanear asistencia
                                </button>

                                {abrirScanner && (
                                    <div className="scanner-modal">
                                        <div className="scanner-content">
                                            <button
                                                onClick={() => setAbrirScanner(false)}
                                            >
                                                ✕
                                            </button>

                                            <EscanearQR />
                                        </div>
                                    </div>
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

                                                                                    {r.lista_espera && r.estado === 'en_espera' && (
                                                                                        <>
                                                                                            <span className="reserva-mini-espera">
                                                                                                En Espera
                                                                                            </span>

                                                                                            <button
                                                                                                className="btn-salir-espera"
                                                                                                onClick={() => salirListaEspera(r.id)}
                                                                                            >
                                                                                                Salir de lista de espera
                                                                                            </button>
                                                                                        </>
                                                                                    )}

                                                                                    {r.notificado && (
                                                                                        <span className="reserva-mini-notificado">
                                                                                            ¡Cupo disponible!
                                                                                        </span>
                                                                                    )}

                                                                                    {/* Cancelar reserva */}
                                                                                    {r.estado === 'confirmada' && (
                                                                                        <button
                                                                                            className="btn-cancelar-reserva"
                                                                                            onClick={() => iniciarCancelacion(r)}
                                                                                        >
                                                                                            Cancelar
                                                                                        </button>
                                                                                    )}

                                                                                    {/* Aceptar cupo */}
                                                                                    {r.notificado && (
                                                                                        <button
                                                                                            className="btn-aceptar-cupo"
                                                                                            onClick={() => aceptarCupo(r.id)}
                                                                                        >
                                                                                            Aceptar cupo
                                                                                        </button>
                                                                                    )}

                                                                                    {/* Rechazar cupo */}
                                                                                    {r.notificado && (
                                                                                        <button
                                                                                            className="btn-rechazar-cupo"
                                                                                            onClick={() => rechazarCupo(r.id)}
                                                                                        >
                                                                                            Rechazar cupo
                                                                                        </button>
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

                    {user?.rol === "profesor" && (

                        <div className="perfil-calendar-block">

                            <div className="perfil-reservas-section">

                                <div className="perfil-section-header">

                                    <span className="perfil-section-icon">
                                        🏋️
                                    </span>

                                    <h3 className="perfil-section-title">
                                        Mis clases
                                    </h3>

                                    <span className="perfil-reservas-count">
                                        {clasesProfesor.length}
                                    </span>

                                </div>
                                {error && (
                                    <p className="mis-clases-error">
                                        {error}
                                    </p>
                                )}

                                {clasesProfesor.length === 0 ? (

                                    <div className="reserva-empty">

                                        <span className="reserva-empty-icon">
                                            📭
                                        </span>

                                        <p>No tenés clases asignadas.</p>

                                    </div>

                                ) : (

                                <div className="mis-clases-grid">

                                    {/* 🔵 HOY */}
                                    {clasesHoy.length > 0 && (
                                        <>
                                            <h2 className="dia-titulo">📅 Hoy</h2>

                                            {clasesHoy.map(clase => (
                                                <div key={clase.id} className="mis-clase-card">

                                                    <h3>{capitalize(clase.actividad)}</h3>

                                                    <p>📅 {capitalize(clase.dia)}</p>

                                                    <p>🕒 {clase.horario?.slice(0, 5)} hs</p>

                                                    <p>👥 {clase.alumnos_inscriptos} / {clase.cupo}</p>
                                                    <div className="mis-clase-footer">
                                                        <div className="mis-clase-botones">
                                                            <button className="btn-ver-alumnos">
                                                                Ver alumnos
                                                            </button>

                                                            <button
                                                                className="btn-generar-qr"
                                                                disabled={
                                                                    estadoClase(clase) !== "activa" ||
                                                                    qrGenerado[clase.id]
                                                                }
                                                                onClick={() => generarQR(clase.id)}
                                                            >
                                                                {qrGenerado[clase.id]
                                                                    ? "QR generado"
                                                                    : "Generar QR"}
                                                            </button>

                                                            <button
                                                                className="btn-ver-qr"
                                                                onClick={() => abrirQR(clase)}
                                                            >
                                                                Mostrar QR
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </>
                                    )}

                                    {/* 🟡 FUTURO */}
                                    {clasesFuturas.length > 0 && (
                                        <>
                                            <h2 className="dia-titulo">📆 Próximas clases</h2>

                                            {clasesFuturas.map(clase => (
                                                <div key={clase.id} className="mis-clase-card">

                                                    <h3>{capitalize(clase.actividad)}</h3>

                                                    <p>📅 {capitalize(clase.dia)}</p>

                                                    <p>🕒 {clase.horario?.slice(0, 5)} hs</p>

                                                    <p>👥 {clase.alumnos_inscriptos} / {clase.cupo}</p>
                                                    <div className="mis-clase-footer">

                                                        <div className="mis-clase-botones">
                                                            <button className="btn-ver-alumnos">
                                                                Ver alumnos
                                                            </button>
                                                
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </>
                                    )}

                                </div>

                                )}

                            </div>

                        </div>

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
                                                {m.mes_renovacion && (
                                                    <span className="modal-renovar-vence">
                                                        ⚠️ Venció en {(() => {
                                                            const [mes, anio] = m.mes_renovacion.split('/').map(Number);
                                                            const fechaMesAnterior = new Date(anio, mes - 2); // mes anterior al de renovación
                                                            return fechaMesAnterior.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
                                                        })()}
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
            {mostrarQR && (
                <div
                    className="scanner-modal"
                    onClick={() => setMostrarQR(false)}
                >
                    <div
                        className="scanner-content"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setMostrarQR(false)}
                        >
                            ✕
                        </button>

                        <img
                            src={qrSeleccionado}
                            width={320}
                            alt="QR"
                        />

                        <p>
                            Mostrale este QR al alumno
                        </p>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Perfil;