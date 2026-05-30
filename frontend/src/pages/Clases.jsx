import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api.js';
import '../assets/css/Clases.css';

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES       = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                     'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DIA_A_NUM   = {
    'domingo': 0, 'lunes': 1, 'martes': 2, 'miercoles': 3,
    'miércoles': 3, 'jueves': 4, 'viernes': 5, 'sabado': 6, 'sábado': 6
};

const DISCIPLINAS  = ['Yoga', 'Pilates', 'Funcional'];
const RANGOS_HORA  = [
    { label: 'Mañana',  desde: 0,  hasta: 12 },
    { label: 'Tarde',   desde: 12, hasta: 18 },
    { label: 'Noche',   desde: 18, hasta: 24 },
];

const formatearHora   = (hora) => hora?.slice(0, 5);
const calcularHoraFin = (hora, duracion) => {
    if (!hora || !duracion) return '';
    const [h, m] = hora.split(':').map(Number);
    const fecha = new Date();
    fecha.setHours(h);
    fecha.setMinutes(m + duracion);
    return fecha.toTimeString().slice(0, 5);
};
const capitalizar = (texto) => texto?.charAt(0).toUpperCase() + texto?.slice(1);

const Clases = ({ token }) => {
    const navigate = useNavigate();
    const hoy      = new Date();

    // ── Calendario ──
    const [anio, setAnio] = useState(hoy.getFullYear());
    const [mes, setMes]   = useState(hoy.getMonth());
    const [diaSelec, setDiaSelec] = useState(null);
    const [todasClases, setTodasClases]   = useState([]);
    const [claseElegida, setClaseElegida] = useState(null);
    const [modoReserva, setModoReserva]   = useState(null);
    const [mensajeError, setMensajeError] = useState('');

    // ── Filtros ──
    const [filtrosAbiertos, setFiltrosAbiertos]   = useState(false);
    const [filtroDisc, setFiltroDisc]             = useState([]);   
    const [filtroProfesor, setFiltroProfesor]     = useState('');
    const [filtroHorario, setFiltroHorario]       = useState([]);   
    const [profesores, setProfesores]             = useState([]);

    // Cargar clases y profesores (Hacemos los profesores públicos para que funcione el filtro siempre)
    useEffect(() => {
        const fetchData = async () => {
            try {
                const resClases = await api.get('/clases/');
                setTodasClases(resClases.data);
            } catch (err) {
                console.error('Error cargando clases', err);
            }
            try {
                const resProfs = await api.get('/socios/profesores');
                setProfesores(resProfs.data);
            } catch (err) {
                console.error('Error cargando profesores', err);
            }
        };
        fetchData();
    }, []);

    // ── Helpers de filtro ──
    const toggleChip = (valor, lista, setLista) => {
        setLista(prev =>
            prev.includes(valor) ? prev.filter(v => v !== valor) : [...prev, valor]
        );
    };

    const limpiarFiltros = () => {
        setFiltroDisc([]);
        setFiltroProfesor('');
        setFiltroHorario([]);
    };

    const hayFiltrosActivos = filtroDisc.length > 0 || filtroProfesor || filtroHorario.length > 0;

    const aplicarFiltros = (clases) => {
        return clases.filter(c => {
            if (filtroDisc.length > 0 && !filtroDisc.map(d => d.toLowerCase()).includes(c.actividad?.toLowerCase()))
                return false;

            if (filtroProfesor && c.profesor_id !== parseInt(filtroProfesor))
                return false;

            if (filtroHorario.length > 0) {
                const hora = parseInt(c.horario?.split(':')[0] ?? 0, 10);
                const enRango = filtroHorario.some(label => {
                    const rango = RANGOS_HORA.find(r => r.label === label);
                    return rango && hora >= rango.desde && hora < rango.hasta;
                });
                if (!enRango) return false;
            }
            return true;
        });
    };

    // ── Calendario ──
    const primerDiaSemana = new Date(anio, mes, 1).getDay();
    const diasEnMes       = new Date(anio, mes + 1, 0).getDate();

    const calcularFechasDelMes = (diaClase) => {
        const numDia = DIA_A_NUM[diaClase.toLowerCase()] ?? -1;
        const fechas = [];
        for (let d = 1; d <= diasEnMes; d++) {
            const fecha = new Date(anio, mes, d);
            if (fecha.getDay() === numDia) {
                const mm = String(mes + 1).padStart(2, '0');
                const dd = String(d).padStart(2, '0');
                fechas.push(`${anio}-${mm}-${dd}`);
            }
        }
        return fechas;
    };

    const handleClickDia = (numDia) => {
        setDiaSelec(numDia);
        setClaseElegida(null);
        setModoReserva(null);
    };

    // CÁLCULO EN TIEMPO REAL: Reemplaza al viejo estado clasesDelDia
    const clasesDelDiaFiltradas = (() => {
        if (!diaSelec) return [];
        const nombreDia = DIAS_SEMANA[new Date(anio, mes, diaSelec).getDay()].toLowerCase();
        const mapaNombre = {
            'dom': 'domingo', 'lun': 'lunes', 'mar': 'martes',
            'mié': 'miercoles', 'jue': 'jueves', 'vie': 'viernes', 'sáb': 'sabado'
        };
        const diaDB = mapaNombre[nombreDia] ?? nombreDia;

        const clasesDia = todasClases
            .filter(c => c.dia.toLowerCase() === diaDB)
            .sort((a, b) => a.horario.localeCompare(b.horario));

        return aplicarFiltros(clasesDia);
    })();

    const handleElegirClase  = (clase) => { setClaseElegida(clase); setModoReserva(null); };

    const handleReservar = () => {
        if (!claseElegida || !modoReserva) return;
        const localToken = localStorage.getItem('token');
        if (!localToken) {
            navigate('/registro', { state: { mensaje: 'Debés registrarte para poder reservar.' } });
            return;
        }
        const fechasDelMes = calcularFechasDelMes(claseElegida.dia);
        if (modoReserva === 'membresia') {
            navigate('/reservar/membresia', { state: { clase: claseElegida, fechasDelMes } });
        } else {
            const mm      = String(mes + 1).padStart(2, '0');
            const dd      = String(diaSelec).padStart(2, '0');
            const fechaDia = `${anio}-${mm}-${dd}`;
            navigate('/reservar/individual', { state: { clase: claseElegida, fechaSeleccionada: fechaDia } });
        }
    };

    const irMesAnterior = () => {
        const esMesActual = mes === hoy.getMonth() && anio === hoy.getFullYear();
        if (esMesActual) return;
        if (mes === 0) { setMes(11); setAnio(a => a - 1); }
        else setMes(m => m - 1);
        setDiaSelec(null);
    };

    const irMesSiguiente = () => {
        if (mes === 11) { setMes(0); setAnio(a => a + 1); }
        else setMes(m => m + 1);
        setDiaSelec(null);
    };

    // ── Celdas del calendario ──
    const celdas = [];
    for (let i = 0; i < primerDiaSemana; i++) {
        celdas.push(<td key={`v-${i}`} className="cal-celda vacio" />);
    }
    for (let d = 1; d <= diasEnMes; d++) {
        const esHoy      = d === hoy.getDate() && mes === hoy.getMonth() && anio === hoy.getFullYear();
        const esSelec    = d === diaSelec;
        const fechaCelda = new Date(anio, mes, d);
        const esHoyExacto = fechaCelda.toDateString() === hoy.toDateString();
        const esPasado   = fechaCelda < hoy && !esHoyExacto;

        const nombreDia  = DIAS_SEMANA[fechaCelda.getDay()].toLowerCase();
        const mapaNombre = {
            'dom': 'domingo', 'lun': 'lunes', 'mar': 'martes',
            'mié': 'miercoles', 'jue': 'jueves', 'vie': 'viernes', 'sáb': 'sabado'
        };
        const diaDB       = mapaNombre[nombreDia] ?? nombreDia;
        const clasesDia   = todasClases.filter(c => c.dia.toLowerCase() === diaDB);
        const tieneClases = aplicarFiltros(clasesDia).length > 0;

        celdas.push(
            <td
                key={d}
                className={`cal-celda
                    ${esHoy      ? 'hoy'         : ''}
                    ${esSelec    ? 'seleccionado': ''}
                    ${esPasado   ? 'pasado'      : ''}
                    ${tieneClases && !esPasado ? 'con-clases' : ''}`}
                onClick={() => {
                    if (esPasado) {
                        setMensajeError('Esta fecha ya pasó. No podés reservar clases pasadas.');
                        return;
                    }
                    setMensajeError('');
                    handleClickDia(d);
                }}
            >
                {d}
                {tieneClases && !esPasado && <span className="cal-dot" />}
            </td>
        );
    }

    const filas = [];
    for (let i = 0; i < celdas.length; i += 7) {
        filas.push(<tr key={i}>{celdas.slice(i, i + 7)}</tr>);
    }

    const chipsActivos = [
        ...filtroDisc.map(d => ({ label: d, quitar: () => toggleChip(d, filtroDisc, setFiltroDisc) })),
        ...filtroHorario.map(h => ({ label: h, quitar: () => toggleChip(h, filtroHorario, setFiltroHorario) })),
        ...(filtroProfesor ? [{
            label: profesores.find(p => p.id === parseInt(filtroProfesor))?.nombre || 'Profesor',
            quitar: () => setFiltroProfesor('')
        }] : []),
    ];

    return (
        <div className="clases-wrapper">
            <div className="calendario-leyenda">
                <span className="punto-leyenda"></span> Clases disponibles
            </div>
            {/* ── FILTROS (Disponibles para todos) ── */}
            <div className="filtros-container">
                <button
                    className={`filtros-toggle ${filtrosAbiertos ? 'filtros-toggle--open' : ''}`}
                    onClick={() => setFiltrosAbiertos(v => !v)}
                >
                    <span>Filtrar clases</span>
                    <span className="filtros-toggle-arrow">{filtrosAbiertos ? '▲' : '▼'}</span>
                    {hayFiltrosActivos && <span className="filtros-badge">{chipsActivos.length}</span>}
                </button>

                {chipsActivos.length > 0 && (
                    <div className="filtros-chips-activos">
                        {chipsActivos.map((chip, i) => (
                            <span key={i} className="filtro-chip-activo">
                                {chip.label}
                                <button onClick={chip.quitar} className="filtro-chip-x">×</button>
                            </span>
                        ))}
                        <button onClick={limpiarFiltros} className="filtros-limpiar">
                            Limpiar todo
                        </button>
                    </div>
                )}

                {filtrosAbiertos && (
                    <div className="filtros-panel">
                        {/* Disciplina */}
                        <div className="filtros-grupo">
                            <span className="filtros-grupo-label">Disciplina</span>
                            <div className="filtros-chips">
                                {DISCIPLINAS.map(d => (
                                    <button
                                        key={d}
                                        className={`filtro-chip ${filtroDisc.includes(d) ? 'filtro-chip--activo' : ''}`}
                                        onClick={() => toggleChip(d, filtroDisc, setFiltroDisc)}
                                    >
                                        {d}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Horario */}
                        <div className="filtros-grupo">
                            <span className="filtros-grupo-label">Horario</span>
                            <div className="filtros-chips">
                                {RANGOS_HORA.map(r => (
                                    <button
                                        key={r.label}
                                        className={`filtro-chip ${filtroHorario.includes(r.label) ? 'filtro-chip--activo' : ''}`}
                                        onClick={() => toggleChip(r.label, filtroHorario, setFiltroHorario)}
                                    >
                                        {r.label}
                                        <span className="filtro-chip-sub">
                                            {r.desde}:00 – {r.hasta === 24 ? '24:00' : `${r.hasta}:00`}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Profesor */}
                        <div className="filtros-grupo">
                            <span className="filtros-grupo-label">Profesor</span>
                            <select
                                className="filtros-select"
                                value={filtroProfesor}
                                onChange={e => setFiltroProfesor(e.target.value)}
                            >
                                <option value="">Todos los profesores</option>
                                {profesores.map(p => (
                                    <option key={p.id} value={p.id}>{p.nombre}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {/* ── CALENDARIO ── */}
            
            <div className="cal-contenedor">
                <div className="cal-header">
                    <button
                        className="cal-nav"
                        onClick={irMesAnterior}
                        disabled={mes === hoy.getMonth() && anio === hoy.getFullYear()}
                        style={{ opacity: (mes === hoy.getMonth() && anio === hoy.getFullYear()) ? 0.3 : 1 }}
                    >‹</button>
                    <h2>{MESES[mes]} {anio}</h2>
                    <button className="cal-nav" onClick={irMesSiguiente}>›</button>
                </div>

                <table className="cal-tabla">
                    <thead>
                        <tr>{DIAS_SEMANA.map(d => <th key={d} className="cal-th">{d}</th>)}</tr>
                    </thead>
                    <tbody>{filas}</tbody>
                </table>

                {mensajeError && <p className="cal-error">{mensajeError}</p>}
            </div>

            {/* ── PANEL LATERAL ── */}
            {diaSelec && (
                <div className="panel-clases">
                    <h3>Clases del {diaSelec} de {MESES[mes]}</h3>

                    {clasesDelDiaFiltradas.length === 0 ? (
                        <p className="sin-clases">
                            {hayFiltrosActivos
                                ? 'No hay clases que coincidan con los filtros aplicados.'
                                : 'No hay clases para este día.'}
                        </p>
                    ) : (
                        clasesDelDiaFiltradas.map(clase => (
                            <div
                                key={clase.id}
                                className={`clase-card ${claseElegida?.id === clase.id ? 'elegida' : ''}`}
                                onClick={() => handleElegirClase(clase)}
                            >
                                <p className="clase-nombre">{capitalizar(clase.actividad)}</p>
                                <p>Profesor: <strong>{clase.profesor_nombre}</strong></p>
                                <p>Comienza a las: <strong>{formatearHora(clase.horario)}</strong></p>
                                <p>Duración: <strong>{clase.duracion} min</strong></p>
                                <p>Finaliza a las: <strong>{calcularHoraFin(clase.horario, clase.duracion)}</strong></p>
                                <p>Precio: <strong>${clase.precio_individual}</strong></p>
                                <p className={clase.cupo > 0 ? 'cupo-ok' : 'cupo-lleno'}>
                                    {clase.cupo > 0 ? `Cupos disponibles: ${clase.cupo}` : 'Sin cupos'}
                                </p>
                            </div>
                        ))
                    )}

                    {claseElegida && (
                        <div className="reserva-opciones">
                            <p className="reserva-titulo">
                                Reservar <strong>{capitalizar(claseElegida.actividad)}</strong> a las {formatearHora(claseElegida.horario)}:
                            </p>
                            <div className="reserva-modos">
                                <label className={`modo-btn ${modoReserva === 'membresia' ? 'activo' : ''}`}>
                                    <input type="radio" name="modo" value="membresia"
                                        checked={modoReserva === 'membresia'}
                                        onChange={() => setModoReserva('membresia')} />
                                    Membresía (todas las clases del mes)
                                </label>
                                <label className={`modo-btn ${modoReserva === 'individual' ? 'activo' : ''}`}>
                                    <input type="radio" name="modo" value="individual"
                                        checked={modoReserva === 'individual'}
                                        onChange={() => setModoReserva('individual')} />
                                    Individual (solo esta clase)
                                </label>
                            </div>
                            <button className="boton-reservar-cal" onClick={handleReservar} disabled={!modoReserva}>
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