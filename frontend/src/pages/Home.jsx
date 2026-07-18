import React, { useState, useEffect  } from 'react';
import { Link } from 'react-router-dom';
import '../assets/css/Home.css';
import Clases from './Clases';
import api from '../api/api.js';
import { Dumbbell, Check, ChevronDown, MapPin, Zap } from 'lucide-react';
// ─────────────────────────────────────────────
// DATOS DEL SLIDESHOW
// Reemplazá las URLs por fotos propias del gimnasio cuando las tengas
// ─────────────────────────────────────────────
const slides = [
    {
        img: 'https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?w=1600&q=80',
        disciplina: 'Yoga',
        tagline: 'Encontrá el equilibrio entre cuerpo y mente.',
    },
    {
        img: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=1600&q=80',
        disciplina: 'Pilates',
        tagline: 'Fuerza desde el centro, control total del cuerpo.',
    },
    {
        img: 'https://images.unsplash.com/photo-1534258936925-c58bed479fcb?w=1600&q=80',
        disciplina: 'Funcional',
        tagline: 'Entrenamientos que te desafían de verdad.',
    },
];

// ─────────────────────────────────────────────
// DATOS DE DISCIPLINAS (extraídos del SRS)
// ─────────────────────────────────────────────
const disciplinas = [
    {
        emoji: '🧘',
        nombre: 'Yoga',
        bajada: 'Equilibrio entre cuerpo y mente',
        descripcion: 'Trabajamos posturas, respiración y meditación para reducir el estrés y mejorar la flexibilidad. Clases para todos los niveles.',
        beneficios: ['Reduce el estrés y la ansiedad', 'Mejora la flexibilidad y postura', 'Fortalece el sistema nervioso', 'Aumenta la concentración'],
        para: 'Ideal para cualquier edad y condición física.',
    },
    {
        emoji: '🤸',
        nombre: 'Pilates',
        bajada: 'Fuerza desde el centro',
        descripcion: 'Método de entrenamiento que trabaja el core, la alineación corporal y la respiración consciente. Perfecto para rehabilitación y tonificación.',
        beneficios: ['Fortalece el core y la espalda', 'Mejora la alineación postural', 'Rehabilitación de lesiones', 'Tonificación sin impacto'],
        para: 'Recomendado para personas con dolores de espalda o en recuperación.',
    },
    {
        emoji: '⚡',
        nombre: 'Funcional',
        bajada: 'Entrenamiento de alta intensidad',
        descripcion: 'Circuitos de ejercicios funcionales que trabajan fuerza, resistencia y coordinación. Cada clase es diferente y desafiante.',
        beneficios: ['Quema calorías eficientemente', 'Mejora la resistencia cardiovascular', 'Desarrolla fuerza real', 'Acelera el metabolismo'],
        para: 'Para quienes buscan un desafío físico real y resultados rápidos.',
    },
];

// ─────────────────────────────────────────────
// PASOS DE "CÓMO FUNCIONA"
// ─────────────────────────────────────────────
const pasos = [
    { num: '01', titulo: 'Registrate', desc: 'Creá tu cuenta en minutos con tus datos básicos y tu apto físico.' },
    { num: '02', titulo: 'Elegí tu clase', desc: 'Explorá el calendario, filtrá por disciplina, horario o profesor.' },
    { num: '03', titulo: 'Reservá tu lugar', desc: 'Confirmá tu reserva y recibí un recordatorio por email antes de la clase.' },
];

// ─────────────────────────────────────────────
// DATOS DE EJEMPLO PARA EL CALENDARIO
// Cuando conectes el backend, reemplazá este array con los datos
// que te devuelva tu API (ej: GET /clases/semana)
// ─────────────────────────────────────────────
const clasesEjemplo = [
    { id: 1, dia: 'Lunes',     hora: '08:00', nombre: 'Yoga',      profesor: 'Laura',  cupos: 10, ocupados: 7 },
    { id: 2, dia: 'Lunes',     hora: '18:00', nombre: 'Funcional', profesor: 'José',   cupos: 15, ocupados: 15 },
    { id: 3, dia: 'Martes',    hora: '09:00', nombre: 'Pilates',   profesor: 'Laura',  cupos: 8,  ocupados: 3 },
    { id: 4, dia: 'Miércoles', hora: '07:00', nombre: 'Funcional', profesor: 'José',   cupos: 15, ocupados: 10 },
    { id: 5, dia: 'Miércoles', hora: '19:00', nombre: 'Yoga',      profesor: 'Laura',  cupos: 10, ocupados: 10 },
    { id: 6, dia: 'Jueves',    hora: '09:00', nombre: 'Pilates',   profesor: 'Laura',  cupos: 8,  ocupados: 5 },
    { id: 7, dia: 'Viernes',   hora: '08:00', nombre: 'Funcional', profesor: 'José',   cupos: 15, ocupados: 12 },
    { id: 8, dia: 'Sábado',    hora: '10:00', nombre: 'Yoga',      profesor: 'Laura',  cupos: 10, ocupados: 4 },
];

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────
const Home = ({ token }) => {
    const [actual, setActual] = useState(0);
    const [animando, setAnimando] = useState(false);
    const [faqAbierto, setFaqAbierto] = useState(null);
    const [filtroClase, setFiltroClase] = useState('Todas');
    const [faqs, setFaqs] = useState([]);
    const [clases, setClases] = useState([]);
    const [actividadAbierta, setActividadAbierta] = useState(null);

    // Slideshow automático: cambia cada 5 segundos
    useEffect(() => {
        const timer = setInterval(() => {
            setAnimando(true);
            setTimeout(() => {
                setActual(prev => (prev + 1) % slides.length);
                setAnimando(false);
            }, 600);
        }, 5000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        obtenerPreguntas();
        obtenerClases();
    }, []);

    const obtenerPreguntas = async () => {
        const res = await api.get("/preguntas-frecuentes/listar_preguntas");
        setFaqs(res.data);
    };

    const obtenerClases = async () => {
        try {
            const res = await api.get("/clases/");
            setClases(res.data);
        } catch (err) {
            console.error("ERROR CLASES", err);
        }
    };

    const irASlide = (i) => {
        if (i === actual) return;
        setAnimando(true);
        setTimeout(() => { setActual(i); setAnimando(false); }, 600);
    };

    const toggleFaq = (i) => setFaqAbierto(faqAbierto === i ? null : i);

    // Filtra las clases del ejemplo según la disciplina seleccionada
    const clasesFiltradas = filtroClase === 'Todas'
        ? clasesEjemplo
        : clasesEjemplo.filter(c => c.nombre === filtroClase);

    const slide = slides[actual];

    const ordenDias = {
        lunes: 1,
        martes: 2,
        miercoles: 3,
        jueves: 4,
        viernes: 5,
        sabado: 6,
        domingo: 7
    };

    const capitalize = (texto) =>
    texto
        ?.split(" ")
        .map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
        .join(" ") || "";

    const horariosPorActividad = {
        yoga: [],
        pilates: [],
        funcional: []
    };

    clases.forEach(clase => {
        if (horariosPorActividad[clase.actividad.toLowerCase()]) {
            horariosPorActividad[clase.actividad.toLowerCase()].push(clase);
        }
    });

    Object.values(horariosPorActividad).forEach(lista => {
        lista.sort((a, b) => {
            const diaA = ordenDias[a.dia.toLowerCase()];
            const diaB = ordenDias[b.dia.toLowerCase()];

            if (diaA !== diaB)
                return diaA - diaB;

            return a.horario.localeCompare(b.horario);
        });
    });

    return (
        <div className="home-container">

            {/* ════════════════════════════════════════
                HERO — SLIDESHOW AUTOMÁTICO
                Muestra fotos de cada disciplina con
                transición suave cada 5 segundos
            ════════════════════════════════════════ */}
            <section className="hero-slide">
                <div
                    className={`hero-slide-bg ${animando ? 'hero-slide-bg--fade' : ''}`}
                    style={{ backgroundImage: `url(${slide.img})` }}
                />
                <div className="hero-slide-overlay" />

                <div className={`hero-slide-content ${animando ? 'hero-slide-content--fade' : ''}`}>
                    <span className="hero-slide-tag">{slide.disciplina}</span>
                    <h1 className="hero-slide-title">
                        ENTRENÁ EN <span>SERIO</span>,<br />
                        ENTRENÁ EN SPORTIFY
                    </h1>
                    <p className="hero-slide-sub">{slide.tagline}</p>
                    <div className="hero-slide-actions">
                        {token && (
                            <Link to="/perfil" className="hero-btn-primary">Ver mi perfil</Link>
                        )}
                    </div>
                </div>

                {/* Dots para navegar manualmente entre slides */}
                <div className="hero-dots">
                    {slides.map((_, i) => (
                        <button key={i} className={`hero-dot ${i === actual ? 'hero-dot--active' : ''}`} onClick={() => irASlide(i)} />
                    ))}
                </div>

                {/* Barra de progreso verde que indica cuánto falta para el próximo slide */}
                <div className="hero-progress">
                    <div key={actual} className="hero-progress-bar" />
                </div>
            </section>

            <section className="home-section">

                <div className="home-section-label">
                    Horarios
                </div>

                <h2 className="home-section-title">
                    ¿Cuándo entrenamos?
                </h2>

                <div className="home-horarios">
                    {Object.entries(horariosPorActividad).map(([actividad, lista]) => (
                        <div className="home-horario-card" key={actividad}>
                        
                            <div
                                className="home-horario-header"
                                onClick={() =>
                                    setActividadAbierta(prev =>
                                        prev === actividad ? null : actividad
                                    )
                                }
                            >
                                <h3 className="home-horario-titulo">
                                    <span>{capitalize(actividad)}</span>

                                    <span className="cantidad-clases">
                                        ({lista.length} {lista.length === 1 ? "clase" : "clases"})
                                    </span>
                                </h3>

                                <span>
                                    {actividadAbierta === actividad ? "▲" : "▼"}
                                </span>
                            </div>

                            {actividadAbierta === actividad && (
                                <div className="home-horario-lista">

                                    {lista.length === 0 ? (
                                        <p className="sin-horarios">
                                            No hay clases disponibles por el momento.
                                        </p>
                                    ) : (
                                        lista.map(clase => (
                                            <div className="home-horario-item" key={clase.id}>
                                                <span>{capitalize(clase.dia)}</span>
                                                <strong>{clase.horario.slice(0,5)}</strong>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                        </div>
                    ))}

                </div>

            </section>

            {/* ════════════════════════════════════════
                SECCIÓN: CÓMO FUNCIONA
                3 pasos simples para que el visitante
                entienda el flujo del sistema
            ════════════════════════════════════════ */}
            <section className="home-section">
                <div className="home-section-label">El proceso</div>
                <h2 className="home-section-title">Tres pasos para empezar</h2>
                <div className="home-pasos">
                    {pasos.map((p, i) => (
                        <div className="home-paso" key={i}>
                            <span className="home-paso-num">{p.num}</span>
                            <h3 className="home-paso-title">{p.titulo}</h3>
                            <p className="home-paso-desc">{p.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

        <section id="seccion-clases" className="home-section">
        <div className="home-section-label">Reservá tu lugar</div>
        <Clases />
        </section>
            {/* ════════════════════════════════════════
                SECCIÓN: DISCIPLINAS
                Cards con descripción y beneficios
                de cada actividad del gimnasio
            ════════════════════════════════════════ */}
            <section className="home-section">
                <div className="home-section-label">Nuestras actividades</div>
                <h2 className="home-section-title">Las disciplinas</h2>
                <div className="home-disciplinas">
                    {disciplinas.map((d, i) => (
                        <div className="home-disciplina-card" key={i}>
                            <div className="home-disciplina-top">
                                <span className="home-disciplina-emoji">{d.emoji}</span>
                                <div>
                                    <h3 className="home-disciplina-nombre">{d.nombre}</h3>
                                    <p className="home-disciplina-bajada">{d.bajada}</p>
                                </div>
                            </div>
                            <p className="home-disciplina-desc">{d.descripcion}</p>
                            <ul className="home-disciplina-beneficios">
                                {d.beneficios.map((b, j) => (
                                    <li key={j}><span className="home-check">✓</span>{b}</li>
                                ))}
                            </ul>
                            <p className="home-disciplina-para">{d.para}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ════════════════════════════════════════
                SECCIÓN: EL GIMNASIO
                Info sobre el espacio, ubicación
                y mapa de Google Maps embebido
                → Reemplazá las coordenadas del iframe
                  por la dirección real del gimnasio
            ════════════════════════════════════════ 
            <section id="seccion-gimnasio" className="home-section home-section--dark">
                <div className="home-section-label">Quiénes somos</div>
                <h2 className="home-section-title">El Gimnasio</h2>
                <div className="home-gimnasio-grid">
                    <div className="home-gimnasio-texto">
                        <p className="home-gimnasio-intro">
                            Sportify nació con la idea de que entrenar no tiene que ser complicado. Laura y José crearon un espacio donde la calidad de enseñanza y el bienestar del alumno son lo primero.
                        </p>
                        <div className="home-gimnasio-items">
                            {[
                                { icon: '📍', titulo: 'Ubicación', desc: 'Pleno centro de La Plata, Buenos Aires. Fácil acceso en transporte público.' },
                                { icon: '🏗️', titulo: 'Instalaciones', desc: 'Vestuarios completos, sala climatizada, racks profesionales y zona de peso libre.' },
                                { icon: '👨‍🏫', titulo: 'Profesores', desc: 'Todos nuestros profesores están certificados y con experiencia comprobada en su disciplina.' },
                                { icon: '📲', titulo: 'Seguinos en Instagram', desc: 'Mirá clases, novedades y la comunidad Sportify en nuestras redes.' },
                            ].map((item, i) => (
                                <div className="home-gimnasio-item" key={i}>
                                    <span className="home-gimnasio-icon">{item.icon}</span>
                                    <div>
                                        <strong>{item.titulo}</strong>
                                        <p>{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                     TODO: reemplazar src del iframe por la dirección real del gimnasio 
                    <div className="home-gimnasio-mapa">
                        <iframe
                            title="Ubicación Sportify"
                            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d26266.39689557396!2d-57.97432!3d-34.92145!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x95a2e62b1f0085a1%3A0xbe19514f10de49b5!2sLa%20Plata%2C%20Buenos%20Aires!5e0!3m2!1ses!2sar!4v1700000000000"
                            width="100%" height="100%"
                            style={{ border: 0, borderRadius: '14px' }}
                            allowFullScreen="" loading="lazy"
                        />
                    </div>
                </div>
            </section>
            */}


            {/* ════════════════════════════════════════
                SECCIÓN: FAQ
                Acordeón con preguntas frecuentes.
                Las preguntas se pueden gestionar
                desde el panel de admin (según SRS)
            ════════════════════════════════════════ */}
            <section id="seccion-gimnasio" className="home-section">
                <div className="home-section-label">Dudas frecuentes</div>
                <h2 className="home-section-title">Preguntas frecuentes</h2>
                <div className="home-faq">
                    {faqs.map((f, i) => (
                        <div
                            key={f.id}
                            className={`home-faq-item ${faqAbierto === i ? 'home-faq-item--open' : ''}`}
                            onClick={() => toggleFaq(i)}
                        >
                            <div className="home-faq-header">
                                <span className="home-faq-pregunta">
                                    {f.titulo}
                                </span>

                                <span className="home-faq-arrow">
                                    {faqAbierto === i ? '−' : '+'}
                                </span>
                            </div>

                            {faqAbierto === i && (
                                <p className="home-faq-respuesta">
                                    {f.respuesta}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            {/* ════════════════════════════════════════
                FOOTER
            ════════════════════════════════════════ */}
            <footer className="home-footer">
                <div className="home-footer-inner">
                    <div className="home-footer-brand">
                        <span className="home-footer-logo"><Dumbbell color="#5CB84D" size={24} /></span>
                        <span className="home-footer-name">SPORTIFY</span>
                    </div>
                    <p className="home-footer-copy">© 2026 Sportify · La Plata, Argentina · Todos los derechos reservados.</p>
                    <p className="home-footer-dev">Desarrollado por ABMODEL</p>
                </div>
            </footer>

        </div>
    );
};

export default Home;