import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/api.js';
import '../assets/css/Perfil.css';
import ModalConfirmacion from '../components/ModalConfirmacion.jsx';
import ModalResultado from '../components/ModalResultado.jsx';
import { useRef } from "react";
import EscanearQR from "./EscanearQR";
import QRCode from "qrcode";
import { toast, Toaster } from "react-hot-toast";
import PagarConMP from "../components/PagarConMP";


const Perfil = ({ token, setToken }) => {
    const [user, setUser]           = useState(null);
    const [reservas, setReservas]   = useState([]);
    const navigate                  = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
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
    const [mostrarConfirmacionRechazo, setMostrarConfirmacionRechazo] = useState(false);
    const [reservaRechazar, setReservaRechazar] = useState(null);
    const [mostrarResultado, setMostrarResultado] = useState(false);
    const [reservaAbordador, setReservaAbordador] = useState(null);
    const [mensajeResultado, setMensajeResultado] = useState("");

    const modalPagoRef = useRef(null);

    const [mostrarPagoCupo, setMostrarPagoCupo] = useState(false);
    const [pasoPagoCupo, setPasoPagoCupo] = useState("inicio");
    const [reservaAPagar, setReservaAPagar] = useState(null);
    const [nroTarjeta, setNroTarjeta] = useState('');
    const [titular, setTitular] = useState('');
    const [cvv, setCvv] = useState('');
    const [vencimiento, setVencimiento] = useState('');
    const [tipoPagoCupo, setTipoPagoCupo] = useState('total');
    const [usaCreditoCupo, setUsaCreditoCupo] = useState(false);
    const [procesandoPago, setProcesandoPago] = useState(false);
    const [metodoPagoCupo, setMetodoPagoCupo] = useState('tarjeta'); // 'tarjeta' | 'mp'

    const hoy = new Date();
    const dia = hoy.getDate();

    const puedeRenovar =
        user?.rol === "miembro" &&
        user?.membresia_vencimiento &&
        dia >= 1 &&
        dia <= 10;

    // PROFESOR
    const [clasesProfesor, setClasesProfesor] = useState([]);
    const [error, setError] = useState("");

    //ESCANER 
    const [abrirScanner, setAbrirScanner] = useState(false);
    const [qrGenerado, setQrGenerado] = useState({});
    const [qrUrls, setQrUrls] = useState({});
    const [mostrarQR, setMostrarQR] = useState(false);
    const [qrSeleccionado, setQrSeleccionado] = useState(null);

    //ALUMNOS
    const [alumnos, setAlumnos] = useState([]);
    const [modalAlumnos, setModalAlumnos] = useState(false);
    const [claseSeleccionada, setClaseSeleccionada] = useState(null);
    const [asistencia, setAsistencia] = useState({ presentes: 0, ausentes: 0 });
    const [estadoSeleccionado, setEstadoSeleccionado] = useState(null);

    const generarQR = async (claseId) => {
        // Buscar la clase
        const clase = clasesProfesor.find(c => c.id === claseId);

        if (!clase) return;

        const estado = estadoClase(clase);

        if (estado === "pendiente") {
            toast("El QR sólo puede generarse cuando comienza la clase.");
            return;
        }

        if (estado === "caducado") {
            toast.error("La clase ya finalizó.");
            return;
        }

        // Ya fue generado
        if (qrGenerado[claseId]) {
            toast("El QR ya fue generado.");
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

            setQrSeleccionado(url);
            setMostrarQR(true);

            toast.success("QR generado");

        } catch (err) {
            toast.error(
                err?.response?.data?.detail || "Error generando QR"
            );
        }
    };

    const abrirQR = (clase) => {
        const estado = estadoClase(clase);

        if (estado === "pendiente") {
            toast("La clase todavía no comenzó.");
            return;
        }

        if (estado === "caducado") {
            toast.error("El QR ya caducó.");
            return;
        }

        if (!qrGenerado[clase.id]) {
            toast("Primero generá el QR.");
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
            toast.error(err?.response?.data?.detail || "Error obteniendo QR" );
        }
    };

    const capitalize = (texto) =>
        texto
            ? texto.charAt(0).toUpperCase() + texto.slice(1)
            : "";

    // Normaliza texto sacando tildes y pasando a minúsculas,
    // para poder comparar "Miércoles" (mapeoDias) con "Miercoles" (backend)
    const quitarTildes = (texto) =>
        texto
            ? texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
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

    useEffect(() => {
        if (mostrarPagoCupo && modalPagoRef.current) {
            modalPagoRef.current.scrollTop = 0;
        }
    }, [mostrarPagoCupo]);

    // ── Manejo de vuelta desde Mercado Pago ──
    useEffect(() => {
        const status = searchParams.get('status');
        if (!status) return;

        if (status === 'approved') {
            toast.success('¡Pago confirmado con Mercado Pago!');

            // Refrescar reservas para reflejar el cambio de estado
            (async () => {
                try {
                    const resReservas = await api.get('/reservas/mis-reservas');
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
                } catch (err) {
                    console.error("Error refrescando reservas tras pago MP:", err);
                }
            })();

        } else if (status === 'failure') {
            toast.error('El pago con Mercado Pago no se pudo completar.');
        } else if (status === 'pending') {
            toast('Tu pago quedó pendiente de confirmación en Mercado Pago.');
        }

        // Limpiar los query params para que el toast no se repita al recargar/navegar
        setSearchParams({}, { replace: true });
    }, [searchParams]);

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

            toast.error(error?.response?.data?.detail || "No se pudo salir de la lista de espera" );
        }
    };

    const renovarMembresia = async () => {
        try {
            setCargandoRenovar(true);

            const res = await api.post("/membresia/renovar");

            toast.success(res.data.mensaje || "Membresía renovada con éxito");

            const resUser = await api.get("/socios/me");
            setUser(resUser.data);

        } catch (err) {
            console.error(err);

            toast.error(err?.response?.data?.detail || "Error al renovar membresía");
        } finally {
            setCargandoRenovar(false);
        }
    };

    const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const mapeoDias  = { 0: 'Domingo', 1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado' };

    const ahora = new Date();

    // 1. Obtenemos el nombre del día de hoy, sin tildes (ej: "martes")
    const opciones = { weekday: 'long' };
    const diaHoyTexto = quitarTildes(mapeoDias[ahora.getDay()]);

    // 2. Clases de hoy
    const clasesHoy = (clasesProfesor || []).filter(c => {
        return quitarTildes(c?.dia) === diaHoyTexto;
    });

    // 3. Clases futuras (días distintos a hoy)
    const clasesFuturas = (clasesProfesor || []).filter(c => {
        if (!c?.dia) return false;
        return quitarTildes(c.dia) !== diaHoyTexto;
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
                toast.error(err?.response?.data?.detail || "Error cargando perfil");
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
            toast.error(error.response?.data?.detail || "No se pudo cancelar la reserva");
            setReservaAbordador(null);
        }
    };

    const cancelarCancelacion = () => {
        setMostrarConfirmacion(false);
        setReservaAbordador(null);
    };


    // ── RECHAZAR CUPO ──
    const iniciarRechazo = (reserva) => {
        setReservaRechazar(reserva);
        setMostrarConfirmacionRechazo(true);
    };

    const confirmarRechazo = async () => {
        if (!reservaRechazar) return;

        try {
            setMostrarConfirmacionRechazo(false);

            await rechazarCupo(reservaRechazar.id);

            setReservaRechazar(null);

        } catch (error) {
            console.error(error);
            setMostrarConfirmacionRechazo(false);
            setReservaRechazar(null);
        }
    };

    const cancelarRechazo = () => {
        setMostrarConfirmacionRechazo(false);
        setReservaRechazar(null);
    };

    // ── ACEPTAR CUPO ──
    const aceptarCupo = async (reserva) => {
        try {
            // Llamar al backend para cambiar a pendiente_pago
            const res = await api.post(`/reservas/aceptar-cupo/${reserva.id}`);

             console.log("RESPUESTA DE ACEPTAR:", res.data);

            // Guardar los datos para el modal
            setReservaAPagar({
                id: res.data.reserva_id,
                tipo: res.data.tipo_reserva,
                clase: res.data.clase,
                fecha_clase: res.data.fecha_clase,
                monto_100: res.data.monto_100,
                monto_50: res.data.monto_50
            });

            // Limpiar formulario
            setNroTarjeta('');
            setTitular('');
            setCvv('');
            setVencimiento('');
            setMetodoPagoCupo('tarjeta');

            // Para individual: mostrar opciones (default 50%)
            // Para membresía: solo 100%
            if (res.data.tipo_reserva === 'membresia') {
                setTipoPagoCupo('total');
            } else {
                setTipoPagoCupo('sena');
            }

            setUsaCreditoCupo(creditos > 0);

            // Abrir el modal
            setMostrarPagoCupo(true);

            setPasoPagoCupo("inicio");
            setUsaCreditoCupo(creditos > 0)

        } catch (error) {
            console.error("Error aceptando cupo:", error);

            toast.error(error.response?.data?.detail || "No se pudo aceptar el cupo");
        }
    };


    const procesarPagoCupo = async () => {
        // AGREGAR ESTO AL INICIO
        if (procesandoPago) return;  // Si ya está procesando, no hacer nada

        // Validar tarjeta si no usa crédito
        if (!usaCreditoCupo && (!nroTarjeta.trim() || !titular.trim() || !cvv.trim() || !vencimiento.trim())) {
            alert("Por favor, completá todos los datos de la tarjeta");
            return;
        }

        // AGREGAR ESTO AQUÍ
        setProcesandoPago(true);  // Bloquear los clics

        try {
            const res = await api.post(`/reservas/pagar-cupo/${reservaAPagar.id}`, {
                numero_tarjeta: usaCreditoCupo ? '0000000000000000' : nroTarjeta,
                titular: usaCreditoCupo ? 'credito' : titular,
                cvv: usaCreditoCupo ? '000' : cvv,
                fecha_vencimiento: usaCreditoCupo ? '12/99' : vencimiento,
                tipo_pago: tipoPagoCupo,
                usa_credito: creditos > 0
            });

            // Cerrar modal
            setMostrarPagoCupo(false);

            // Mostrar mensaje de éxito
            setMensajeResultado(res.data.mensaje);
            setMostrarResultado(true);

            // Actualizar la lista: eliminar la reserva que acaba de confirmarse
            setReservas(prev =>
                prev.map(r =>
                    r.id === reservaAPagar.id 
                        ? { ...r, estado: 'confirmada', notificado: false } 
                        : r
                )
            );

            // Actualizar créditos si se usaron
            if (usaCreditoCupo) {
                setCreditos(creditos - 1);
            }

        } catch (error) {
            console.error("Error procesando pago:", error);
            alert("Error: " + (error.response?.data?.detail || "No se pudo procesar el pago"));
        } finally {
            // AGREGAR ESTO AL FINAL
            setProcesandoPago(false);  // Desbloquear
        }
    };



    // ── RECHAZAR CUPO ──
    const rechazarCupo = async (reservaId) => {
        try {
            const res = await api.post(`/reservas/rechazar-cupo/${reservaId}`);

            setMensajeResultado(res.data.mensaje);
            setMostrarResultado(true);

            // Actualizar estado de la reserva
            setReservas(prev => prev.filter(r => r.id !== reservaId));

        } catch (error) {
            console.error("Error rechazando cupo:", error);

            toast.error(error?.response?.data?.detail || "No se pudo rechazar el cupo");
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
            dias[quitarTildes(clase.dia)] - ahora.getDay();

        inicio.setDate(ahora.getDate() + diferencia);

        const [h, m] = clase.horario.split(":");
        inicio.setHours(Number(h), Number(m), 0, 0);

        const fin = new Date(inicio);
        fin.setMinutes(fin.getMinutes() + (clase.duracion || 60));

        if (ahora >= inicio && ahora <= fin) return "en_curso";
        if (ahora > fin) return "finalizada";

        return "proxima";
    };

    const verAlumnos = async (clase) => {
        try {

            setAlumnos([]);
            setAsistencia(null);
            setEstadoSeleccionado(null);
            setClaseSeleccionada(clase);

            const res = await api.get(`/clases/${clase.id}/alumnos`);

            const estado = estadoClase(clase);

            setAlumnos(res.data.alumnos);
            setEstadoSeleccionado(estado);

            // SOLO si ya pasó la clase
            if (estado === "en_curso" || estado === "finalizada") {
                const presentes = res.data.alumnos.filter(a => a.asistio).length;
                const total = res.data.alumnos.length;

                setAsistencia({
                    presentes,
                    ausentes: total - presentes
                });
            } else {
                setAsistencia(null);
            }

            setModalAlumnos(true);

        } catch (err) {
            toast.error(err?.response?.data?.detail || "Error al obtener alumnos");
        }
    };


    return (
        <>  {/*esto y el toaster esta demas */}
        <Toaster />
            <div className="perfil-container">
                
                <ModalConfirmacion
                    isOpen={mostrarConfirmacion}
                    titulo="¿Estás seguro?"
                    onConfirm={confirmarCancelacion}
                    onCancel={cancelarCancelacion}
                />

            <ModalConfirmacion
                isOpen={mostrarConfirmacionRechazo}
                titulo="¿Rechazar cupo?"
                mensaje="¿Estás seguro de que querés rechazar este cupo? El lugar será ofrecido al siguiente cliente en la lista de espera."
                onConfirm={confirmarRechazo}
                onCancel={cancelarRechazo}
            />

            <ModalResultado
                isOpen={mostrarResultado}
                mensaje={mensajeResultado}
                onClose={() => setMostrarResultado(false)}
            />

            {/* MODAL DE PAGO PARA ACEPTAR CUPO */}
            {mostrarPagoCupo && reservaAPagar && (
                <div className="modal-overlay" onClick={() => setMostrarPagoCupo(false)}>
                    <div className="modal-content modal-pago-cupo" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close" onClick={() => setMostrarPagoCupo(false)}>×</button>

                        <h2 className="modal-titulo">Confirmar Aceptación de Cupo</h2>
                        <div className="reserva-layout"> 

                            <div className="reserva-info-col">

                                {/* RESUMEN - IGUAL A ReservaIndividual */}
                                <div className="reserva-desglose">
                                    <div className="reserva-desglose-titulo">Detalle de la sesión</div>
                                    
                                    <div className="reserva-desglose-fila" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                                        <span style={{ fontWeight: '500' }}>Fecha elegida:</span>
                                        <span style={{ textTransform: 'capitalize', color: '#555', marginTop: '2px' }}>
                                            {new Date(reservaAPagar.fecha_clase + 'T00:00:00').toLocaleDateString('es-AR', {
                                                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                                            })}
                                        </span>
                                    </div>

                                    <div className="reserva-desglose-fila">
                                        <span>Precio base</span>
                                        <span>${Number(reservaAPagar.monto_100).toFixed(2)}</span>
                                    </div>

                                    {reservaAPagar.tipo === 'individual' && (
                                        <div className="reserva-desglose-fila" style={{ color: '#666', fontSize: '0.95em' }}>
                                            <span>Concepto</span>
                                            <span>{tipoPagoCupo === 'sena' ? 'Seña (50%)' : 'Totalidad (100%)'}</span>
                                        </div>
                                    )}

                                    {reservaAPagar.tipo === 'membresia' && (
                                        <div className="reserva-desglose-fila" style={{ color: '#666', fontSize: '0.95em' }}>
                                            <span>Concepto</span>
                                            <span>Totalidad (100%)</span>
                                        </div>
                                    )}

                                    {creditos > 0 && (
                                        <div className="reserva-desglose-fila reserva-desglose-fila--descuento">
                                            <span>🎟️ Crédito aplicado</span>
                                            <span>-${Number(
                                                reservaAPagar.tipo === 'membresia' 
                                                    ? reservaAPagar.monto_100 
                                                    : (tipoPagoCupo === 'sena' ? reservaAPagar.monto_50 : reservaAPagar.monto_100)
                                            ).toFixed(2)}</span>
                                        </div>
                                    )}

                                    <div className="reserva-desglose-total">
                                        <span>Total a abonar</span>
                                        <span>${Number(
                                            usaCreditoCupo ? 0 : (
                                                reservaAPagar.tipo === 'membresia' 
                                                    ? reservaAPagar.monto_100 
                                                    : (tipoPagoCupo === 'sena' ? reservaAPagar.monto_50 : reservaAPagar.monto_100)
                                            )
                                        ).toFixed(2)}</span>
                                    </div>
                                </div>

                                {/* SELECTOR DE MÉTODO DE PAGO — solo si no usa crédito */}
                                {creditos === 0 && (
                                    <div className="metodo-pago-selector" style={{ marginTop: '20px' }}>
                                        <button
                                            className={`metodo-pago-btn metodo-pago-btn--tarjeta ${metodoPagoCupo === 'tarjeta' ? 'activo' : ''}`}
                                            onClick={() => setMetodoPagoCupo('tarjeta')}
                                        >
                                            Tarjeta
                                        </button>
                                        <button
                                            className={`metodo-pago-btn metodo-pago-btn--mp ${metodoPagoCupo === 'mp' ? 'activo' : ''}`}
                                            onClick={() => setMetodoPagoCupo('mp')}
                                        >
                                            Mercado Pago
                                        </button>
                                    </div>
                                )}

                                {/* TARJETA VISUAL — solo con método tarjeta */}
                                {creditos === 0 && metodoPagoCupo === 'tarjeta' && (
                                    <div className="pago-card-visual" style={{ marginTop: '20px' }}>
                                        <div className="pago-card-chip">▬</div>

                                        <div className="pago-card-numero">
                                            {nroTarjeta || '···· ···· ···· ····'}
                                        </div>

                                        <div className="pago-card-bottom">

                                            <div>
                                                <div className="pago-card-sublabel">
                                                    Titular
                                                </div>

                                                <div
                                                    className="pago-card-valor"
                                                    style={{ textTransform: 'uppercase' }}
                                                >
                                                    {titular || 'NOMBRE APELLIDO'}
                                                </div>
                                            </div>

                                            <div>
                                                <div className="pago-card-sublabel">
                                                    CVV
                                                </div>

                                                <div className="pago-card-valor">
                                                    {cvv ? '•'.repeat(cvv.length) : '•••'}
                                                </div>
                                            </div>

                                        </div>
                                    </div>
                                )}

                            </div>

                            <div className="reserva-accion-col">

                                {pasoPagoCupo === "inicio" && creditos > 0 && (
                                    <div className="reserva-accion-card">

                                        <div className="pago-credito-icon">🎟️</div>

                                        <h3 className="reserva-accion-titulo">
                                            Tenés créditos disponibles
                                        </h3>

                                        <p className="reserva-accion-desc">
                                            Tenés <strong>{creditos} crédito{creditos > 1 ? "s" : ""}</strong> disponible{creditos > 1 ? "s" : ""}.
                                            Esta reserva quedará completamente cubierta con tus créditos.
                                        </p>

                                    </div>
                                )}

                                {/* OPCIONES DE PAGO - SOLO SI ES INDIVIDUAL */}
                                {reservaAPagar.tipo === 'individual' && !usaCreditoCupo && (
                                    <div style={{ display: 'flex', gap: '12px', margin: '25px 0' }}>
                                        <button
                                            type="button"
                                            style={{
                                                flex: 1,
                                                padding: '12px',
                                                borderRadius: '8px',
                                                border: tipoPagoCupo === 'sena' ? '2px solid #4caf50' : '1px solid #ccc',
                                                backgroundColor: tipoPagoCupo === 'sena' ? 'rgba(76,175,80,0.1)' : 'transparent',
                                                color: tipoPagoCupo === 'sena' ? '#4caf50' : '#aaa',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease'
                                            }}
                                            onClick={() => setTipoPagoCupo('sena')}
                                        >
                                            Abonar Seña (50%)
                                        </button>
                                        <button
                                            type="button"
                                            style={{
                                                flex: 1,
                                                padding: '12px',
                                                borderRadius: '8px',
                                                border: tipoPagoCupo === 'total' ? '2px solid #4caf50' : '1px solid #ccc',
                                                backgroundColor: tipoPagoCupo === 'total' ? 'rgba(76,175,80,0.1)' : 'transparent',
                                                color: tipoPagoCupo === 'total' ? '#4caf50' : '#aaa',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease'
                                            }}
                                            onClick={() => setTipoPagoCupo('total')}
                                        >
                                            Abonar Total (100%)
                                        </button>
                                    </div>
                                )}

                                {/* FORMULARIO DE TARJETA — IGUAL A ReservaIndividual */}
                                {creditos === 0 && metodoPagoCupo === 'tarjeta' && (
                                    <div className="pago-form-card">
                                        <h2 className="pago-form-titulo">Datos de pago</h2>
                                        
                                        <div className="pago-field">
                                            <label className="pago-label">Número de tarjeta</label>
                                            <input 
                                                className="pago-input pago-input--wide" 
                                                type="text" 
                                                inputMode="numeric"
                                                placeholder="1111 2222 3333 4444" 
                                                value={nroTarjeta} 
                                                maxLength={19}
                                                onChange={(e) => {
                                                    const n = e.target.value.replace(/\D/g, '');
                                                    const parts = [];
                                                    for (let i = 0; i < n.length; i += 4) parts.push(n.substring(i, i + 4));
                                                    setNroTarjeta(parts.join(' '));
                                                }}
                                            />
                                        </div>

                                        <div className="pago-field">
                                            <label className="pago-label">Nombre del titular</label>
                                            <input 
                                                className="pago-input pago-input--wide" 
                                                type="text"
                                                placeholder="Tal como aparece en la tarjeta" 
                                                value={titular}
                                                onChange={(e) => setTitular(e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, ''))}
                                            />
                                        </div>

                                        <div style={{ display: 'flex', gap: '15px' }}>
                                            <div className="pago-field" style={{ flex: 1 }}>
                                                <label className="pago-label">CVV</label>
                                                <input 
                                                    className="pago-input" 
                                                    type="text" 
                                                    inputMode="numeric"
                                                    style={{ WebkitTextSecurity: 'disc' }} 
                                                    placeholder="•••" 
                                                    maxLength={3}
                                                    value={cvv} 
                                                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
                                                />
                                            </div>
                                            <div className="pago-field" style={{ flex: 1 }}>
                                                <label className="pago-label">Vencimiento</label>
                                                <input 
                                                    className="pago-input" 
                                                    type="text" 
                                                    placeholder="MM/AA" 
                                                    maxLength={5}
                                                    value={vencimiento}
                                                    onChange={(e) => {
                                                        let v = e.target.value.replace(/\D/g, '');
                                                        if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2, 4);
                                                        setVencimiento(v);
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        <button 
                                            className="pago-btn-primary" 
                                            onClick={procesarPagoCupo}
                                            disabled={procesandoPago}
                                        >
                                            {procesandoPago ? "Procesando..." :`Pagar $${Number(
                                                reservaAPagar.tipo === 'membresia' 
                                                    ? reservaAPagar.monto_100 
                                                    : (tipoPagoCupo === 'sena' ? reservaAPagar.monto_50 : reservaAPagar.monto_100)
                                            ).toFixed(2)}`}
                                        </button>

                                        <p className="pago-seguro-txt">🔒 Pago simulado — tus datos no se almacenan</p>
                                    </div>
                                )}

                                {/* MERCADO PAGO */}
                                {creditos === 0 && metodoPagoCupo === 'mp' && (
                                    <div className="mp-bloque">
                                        <p className="mp-descripcion">
                                            Serás redirigido al sitio de Mercado Pago para completar el pago de forma segura.
                                        </p>
                                        <PagarConMP
                                            tipo="individual"
                                            payload={{
                                                reserva_id: reservaAPagar.id,
                                                tipo_pago: reservaAPagar.tipo === 'membresia' ? 'total' : tipoPagoCupo,
                                            }}
                                            onError={(msg) => toast.error(msg)}
                                        />
                                    </div>
                                )}

                                {/* BOTONES */}
                                {creditos > 0 && (
                                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                        <button className="boton-cancelar" onClick={() => setMostrarPagoCupo(false)}>
                                            Cancelar
                                        </button>
                                        <button className="pago-btn-primary" onClick={procesarPagoCupo} disabled={procesandoPago}>
                                            {procesandoPago ? "Procesando..." : "Confirmar con crédito"}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}


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
                                        🎟️ {creditos}
                                    </span>
                                </div>
                            )}

                            <div className="dato-item btn-container">
                                <button className="btn-cambiar-pass" onClick={() => navigate('/cambiar-password')}>
                                    Cambiar Contraseña
                                </button>
                            </div>

                            {user?.rol !== "profesor" && (
                                <>
                                    <div className="perfil-qr-boton">
                                        <button
                                            className="btn-escanear-qr"
                                            onClick={() => setAbrirScanner(true)}
                                        >
                                            📷 Escanear asistencia
                                        </button>
                                    </div>

                                    {abrirScanner && (
                                        <div
                                            className="modal-overlay"
                                            onClick={() => setAbrirScanner(false)}
                                        >
                                            <div
                                                className="modal-box"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <h2>📷 Escanear QR</h2>

                                                <EscanearQR />

                                                <button
                                                    className="btn-cerrar"
                                                    onClick={() => setAbrirScanner(false)}
                                                    style={{ marginTop: "15px" }}
                                                >
                                                    Cerrar
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

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
                                                                                                onClick={() => aceptarCupo(r)}
                                                                                            >
                                                                                                Aceptar cupo
                                                                                            </button>
                                                                                        )}

                                                                                        {/* Rechazar cupo */}
                                                                                        {r.notificado && (
                                                                                            <button
                                                                                                className="btn-rechazar-cupo"
                                                                                                onClick={() => iniciarRechazo(r)}
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
                                                <div className="clases-row">

                                                    {clasesHoy.map(clase => {
                                                        const estado = estadoClase(clase);
                                                        return (
                                                            <div key={clase.id} className="mis-clase-card">

                                                                <h3>{capitalize(clase.actividad)}</h3>
                                                                <span className={`estado-clase ${estado}`}>
                                                                    {estado === "proxima" && "🟡 Próxima"}
                                                                    {estado === "en_curso" && "🟢 En curso"}
                                                                    {estado === "finalizada" && "⚫ Finalizada"}
                                                                </span>

                                                                <p>📅 {capitalize(clase.dia)}</p>

                                                                <p>🕒 {clase.horario?.slice(0, 5)} hs</p>

                                                                <p>👥 {clase.alumnos_inscriptos} / {clase.cupo}</p>

                                                                <div className="mis-clase-footer">
                                                                    <div className="mis-clase-botones">
                                                                        <button className="btn-ver-alumnos" onClick={() => verAlumnos(clase)}>
                                                                            Ver alumnos
                                                                        </button>

                                                                        <button
                                                                            className="btn-generar-qr"
                                                                            disabled={
                                                                                estadoClase(clase) !== "en_curso" ||
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
                                                    )})}
                                                </div>
                                            </>
                                        )}

                                        {/* 🟡 FUTURO */}
                                        {clasesFuturas.length > 0 && (
                                            <>
                                                <h2 className="dia-titulo" style={{ marginTop: "35px" }}>📆 Próximas clases</h2>

                                                <div className="clases-row">
                                                    {clasesFuturas.map(clase => (
                                                        <div key={clase.id} className="mis-clase-card">

                                                        <h3>{capitalize(clase.actividad)}</h3>

                                                            <p>📅 {capitalize(clase.dia)}</p>

                                                            <p>🕒 {clase.horario?.slice(0, 5)} hs</p>

                                                            <p>👥 {clase.alumnos_inscriptos} / {clase.cupo}</p>
                                                            <div className="mis-clase-footer">

                                                                <div className="mis-clase-botones">
                                                                    <button className="btn-ver-alumnos" onClick={() => verAlumnos(clase)}>
                                                                        Ver alumnos
                                                                    </button>
                                                        
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
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
                        className="modal-overlay"
                        onClick={() => setMostrarQR(false)}
                    >
                        <div
                            className="modal-box"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h2>📱 Código QR</h2>

                            <img
                                src={qrSeleccionado}
                                alt="QR"
                                width={280}
                                style={{ margin: "20px 0" }}
                            />

                            <p>
                                Mostrale este QR al alumno para registrar la asistencia.
                            </p>

                            <button
                                className="btn-cerrar"
                                onClick={() => setMostrarQR(false)}
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                )}

                {modalAlumnos && (
                    <div
                        className="modal-overlay"
                        onClick={() => setModalAlumnos(false)}
                    >
                        <div
                            className="modal-box"
                            onClick={(e) => e.stopPropagation()}
                        >

                            {/* TÍTULO */}
                            <h2>📋 Lista de alumnos</h2>

                            {/* RESUMEN */}
                            {asistencia && (estadoSeleccionado === "en_curso" || estadoSeleccionado === "finalizada") &&(
                                <p>
                                    📊 Presentes: {asistencia.presentes} |{" "}
                                    ❌ Ausentes: {asistencia.ausentes}
                                </p>
                            )}

                            {/* CONTENIDO */}
                            {alumnos.length === 0 ? (
                                <p>No hay alumnos inscriptos</p>
                            ) : (
                                <>
                                    <p>
                                        👥 Alumnos inscriptos ({alumnos.length})
                                    </p>

                                    <div className="alumnos-lista">
                                        {alumnos.map((a) => (
                                            <div key={a.id} className="alumno-card">
                                                <strong>
                                                    {capitalize(a.nombre)} {capitalize(a.apellido)} - {a.email}
                                                </strong>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            {/* BOTÓN CERRAR */}
                            <button
                                className="btn-cerrar"
                                onClick={() => setModalAlumnos(false)}
                            >
                                Cerrar
                            </button>

                        </div>
                    </div>
                )}

            </div> 
        </>
    );
};

export default Perfil;