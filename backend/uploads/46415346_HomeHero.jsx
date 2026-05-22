import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

// Slides con fotos de Unsplash (libres de uso) de yoga, pilates y funcional
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

const HomeHero = ({ token }) => {
    const [actual, setActual] = useState(0);
    const [animando, setAnimando] = useState(false);

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

    const irA = (i) => {
        if (i === actual) return;
        setAnimando(true);
        setTimeout(() => {
            setActual(i);
            setAnimando(false);
        }, 600);
    };

    const slide = slides[actual];

    return (
        <>
            {/* ── HERO SLIDESHOW ── */}
            <section className="hero-slide">
                {/* Fondo con imagen */}
                <div
                    className={`hero-slide-bg ${animando ? 'hero-slide-bg--fade' : ''}`}
                    style={{ backgroundImage: `url(${slide.img})` }}
                />
                {/* Overlay oscuro */}
                <div className="hero-slide-overlay" />

                {/* Contenido */}
                <div className={`hero-slide-content ${animando ? 'hero-slide-content--fade' : ''}`}>
                    <span className="hero-slide-tag">{slide.disciplina}</span>
                    <h1 className="hero-slide-title">
                        ENTRENÁ EN <span>SERIO</span>,<br />
                        ENTRENÁ EN SPORTIFY
                    </h1>
                    <p className="hero-slide-sub">{slide.tagline}</p>
                    <div className="hero-slide-actions">
                        {token ? (
                            <Link to="/perfil" className="hero-btn-primary">Ver mi perfil</Link>
                        ) : (
                            <>
                                <Link to="/registro" className="hero-btn-primary">Comenzar ahora</Link>
                                <Link to="/login" className="hero-btn-ghost">Iniciar sesión</Link>
                            </>
                        )}
                    </div>
                </div>

                {/* Dots de navegación */}
                <div className="hero-dots">
                    {slides.map((_, i) => (
                        <button
                            key={i}
                            className={`hero-dot ${i === actual ? 'hero-dot--active' : ''}`}
                            onClick={() => irA(i)}
                        />
                    ))}
                </div>

                {/* Barra de progreso */}
                <div className="hero-progress">
                    <div
                        key={actual}
                        className="hero-progress-bar"
                    />
                </div>
            </section>

            {/* ── SECCIÓN CLASES ── */}
            <section id="seccion-clases" className="hero-clases">
                <div className="hero-clases-inner">
                    <div className="hero-clases-texto">
                        <span className="hero-clases-label">Reservas online</span>
                        <h2 className="hero-clases-title">Clases del Gimnasio</h2>
                        <p className="hero-clases-desc">
                            Consultá la grilla de clases disponibles, filtrá por disciplina u horario y reservá tu lugar en segundos.
                        </p>
                        {token ? (
                            <Link to="/clases" className="hero-btn-primary">Ver clases disponibles</Link>
                        ) : (
                            <div className="hero-clases-aviso">
                                <span className="hero-clases-aviso-icon">🔒</span>
                                <span>Iniciá sesión para reservar una clase.</span>
                                <Link to="/login" className="hero-clases-link">Ingresar</Link>
                            </div>
                        )}
                    </div>
                    <div className="hero-clases-cards">
                        {slides.map((s, i) => (
                            <div className="hero-clases-card" key={i}>
                                <div
                                    className="hero-clases-card-img"
                                    style={{ backgroundImage: `url(${s.img})` }}
                                />
                                <div className="hero-clases-card-body">
                                    <span className="hero-clases-card-nombre">{s.disciplina}</span>
                                    <span className="hero-clases-card-desc">{s.tagline}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </>
    );
};

export default HomeHero;
