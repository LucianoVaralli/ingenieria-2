import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api.js';
import '../assets/css/Clases.css';


const DIAS_SEMANA  = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES        = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                      'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];


const DIA_A_NUM = {
    'domingo': 0, 'lunes': 1, 'martes': 2, 'miercoles': 3,
    'miércoles': 3, 'jueves': 4, 'viernes': 5, 'sabado': 6, 'sábado': 6
};

const Clases = () => {
    const navigate  = useNavigate();
    const hoy       = new Date();

    const [anio,        setAnio]        = useState(hoy.getFullYear());
    const [mes,         setMes]         = useState(hoy.getMonth());       // 0-11
    const [diaSelec,    setDiaSelec]    = useState(null);                  // número del día
    const [clasesDelDia, setClasesDelDia] = useState([]);
    const [todasClases, setTodasClases] = useState([]);
    const [claseElegida, setClaseElegida] = useState(null);
    const [modoReserva,  setModoReserva] = useState(null);                 // 'membresia' | 'individual'
    const [cargando,     setCargando]    = useState(false);

    // Cargar todas las clases del backend una sola vez
    useEffect(() => {
        const fetchClases = async () => {
            try {
                const res = await api.get('/clases/');
                setTodasClases(res.data);
            } catch (err) {
                console.error('Error cargando clases', err);
            }
        };
        fetchClases();
    }, []);

    

    const primerDiaSemana = new Date(anio, mes, 1).getDay();

    const diasEnMes = new Date(anio, mes + 1, 0).getDate();

    const calcularFechasDelMes = (diaClase) => {
        const numDia  = DIA_A_NUM[diaClase.toLowerCase()] ?? -1;
        const fechas  = [];
        for (let d = 1; d <= diasEnMes; d++) {
            const fecha = new Date(anio, mes, d);
            if (fecha.getDay() === numDia) {
                const mm  = String(mes + 1).padStart(2, '0');
                const dd  = String(d).padStart(2, '0');
                fechas.push(`${anio}-${mm}-${dd}`);
            }
        }
        return fechas;
    };

    const formatearFecha = (str) => {
        const [y, m, d] = str.split('-');
        return `${d}/${m}/${y}`;
    };

    const handleClickDia = (numDia) => {
        setDiaSelec(numDia);
        setClaseElegida(null);
        setModoReserva(null);

        const nombreDia = DIAS_SEMANA[new Date(anio, mes, numDia).getDay()].toLowerCase();

        const mapaNombre = {
            'dom': 'domingo', 'lun': 'lunes', 'mar': 'martes',
            'mié': 'miercoles', 'jue': 'jueves', 'vie': 'viernes', 'sáb': 'sabado'
        };
        const diaDB = mapaNombre[nombreDia] ?? nombreDia;

        
        const clasesFiltradas = todasClases
            .filter(c => c.dia.toLowerCase() === diaDB)
            .sort((a, b) => a.horario.localeCompare(b.horario));

        setClasesDelDia(clasesFiltradas);
    };

    
    const handleElegirClase = (clase) => {
        setClaseElegida(clase);
        setModoReserva(null);
    };

    
    const handleReservar = () => {
        if (!claseElegida || !modoReserva) return;

        
        const token = localStorage.getItem('token');
        if (!token) {
        navigate('/registro', {
            state: { mensaje: 'Debés registrarte para poder reservar una clase.' }
        });
        return;
    }
        const fechasDelMes = calcularFechasDelMes(claseElegida.dia);

        if (modoReserva === 'membresia') {
            navigate('/reservar/membresia', {
                state: { clase: claseElegida, fechasDelMes }
            });
        } else {
           
            const mm      = String(mes + 1).padStart(2, '0');
            const dd      = String(diaSelec).padStart(2, '0');
            const fechaDia = `${anio}-${mm}-${dd}`;
            navigate('/reservar/individual', {
                state: { clase: claseElegida, fechaSeleccionada: fechaDia }
            });
        }
    };

    
    const irMesAnterior = () => {
    const esMesActual = mes === hoy.getMonth() && anio === hoy.getFullYear();
    if (esMesActual) return; // no permite ir atrás
    if (mes === 0) { setMes(11); setAnio(a => a - 1); }
    else setMes(m => m - 1);
    setDiaSelec(null); setClasesDelDia([]);
    };

    const irMesSiguiente = () => {
        if (mes === 11) { setMes(0); setAnio(a => a + 1); }
        else setMes(m => m + 1);
        setDiaSelec(null); setClasesDelDia([]);
    };

    
    const celdas = [];
    
    for (let i = 0; i < primerDiaSemana; i++) {
        celdas.push(<td key={`v-${i}`} className="cal-celda vacio"></td>);
    }
    
    for (let d = 1; d <= diasEnMes; d++) {
        const esHoy     = d === hoy.getDate() && mes === hoy.getMonth() && anio === hoy.getFullYear();
        const esSelec   = d === diaSelec;
        celdas.push(
            <td
                key={d}
                className={`cal-celda ${esHoy ? 'hoy' : ''} ${esSelec ? 'seleccionado' : ''}`}
                onClick={() => handleClickDia(d)}
            >
                {d}
            </td>
        );
    }

    
    const filas = [];
    for (let i = 0; i < celdas.length; i += 7) {
        filas.push(<tr key={i}>{celdas.slice(i, i + 7)}</tr>);
    }

    return (
        <div className="clases-wrapper">

            {}
            <div className="cal-contenedor">
                <div className="cal-header">
                    <button
    className="cal-nav"
    onClick={irMesAnterior}
    disabled={mes === hoy.getMonth() && anio === hoy.getFullYear()}
    style={{ opacity: (mes === hoy.getMonth() && anio === hoy.getFullYear()) ? 0.3 : 1 }}
>
    ‹
</button>
                    <h2>{MESES[mes]} {anio}</h2>
                    <button className="cal-nav" onClick={irMesSiguiente}>›</button>
                </div>

                <table className="cal-tabla">
                    <thead>
                        <tr>
                            {DIAS_SEMANA.map(d => (
                                <th key={d} className="cal-th">{d}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>{filas}</tbody>
                </table>
            </div>

            {/* ── Panel lateral: clases del día seleccionado ─────────── */}
            {diaSelec && (
                <div className="panel-clases">
                    <h3>
                        Clases del {diaSelec} de {MESES[mes]}
                    </h3>

                    {clasesDelDia.length === 0 ? (
                        <p className="sin-clases">No hay clases para este día.</p>
                    ) : (
                        clasesDelDia.map(clase => (
                            <div
                                key={clase.id}
                                className={`clase-card ${claseElegida?.id === clase.id ? 'elegida' : ''}`}
                                onClick={() => handleElegirClase(clase)}
                            >
                                <p className="clase-nombre">{clase.actividad}</p>
                                <p>Profesor: <strong>{clase.profesor_nombre}</strong></p>
                                <p>Comienza a las: <strong>{clase.horario}</strong></p>
                                <p>Precio: <strong>${clase.precio_individual}</strong></p>
                                <p className={clase.cupo > 0 ? 'cupo-ok' : 'cupo-lleno'}>
                                    {clase.cupo > 0 ? `Cupos disponibles: ${clase.cupo}` : ' Sin cupos '}
                                </p>
                            </div>
                        ))
                    )}

                    {/* ── Opciones de reserva ── */}
                    {claseElegida && (
                        <div className="reserva-opciones">
                            <p className="reserva-titulo">
                                Reservar <strong>{claseElegida.actividad}</strong> a las {claseElegida.horario}:
                            </p>
                            <div className="reserva-modos">
                                <label className={`modo-btn ${modoReserva === 'membresia' ? 'activo' : ''}`}>
                                    <input
                                        type="radio"
                                        name="modo"
                                        value="membresia"
                                        checked={modoReserva === 'membresia'}
                                        onChange={() => setModoReserva('membresia')}
                                    />
                                    Membresía (todas las clases del mes)
                                </label>
                                <label className={`modo-btn ${modoReserva === 'individual' ? 'activo' : ''}`}>
                                    <input
                                        type="radio"
                                        name="modo"
                                        value="individual"
                                        checked={modoReserva === 'individual'}
                                        onChange={() => setModoReserva('individual')}
                                    />
                                    Individual (solo esta clase)
                                </label>
                            </div>

                            <button
                                className="boton-reservar-cal"
                                onClick={handleReservar}
                                disabled={!modoReserva}
                            >
                                Reservar
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Clases;
