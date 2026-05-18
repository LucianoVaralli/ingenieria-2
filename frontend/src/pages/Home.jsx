import React from 'react';

const Home = () => {
    // Revisamos si el usuario inició sesión
    const token = localStorage.getItem('token'); 

    return (
        <div className="landing-container">
            
            {/* 1. EL HEADBOARD (Igual para todos) */}
            <header style={{ height: '350px', background: 'linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.9)), #222', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifycontent: 'center', textAlign: 'center' }}>
                <h1 style={{ fontSize: '38px', letterSpacing: '2px', margin: '0 0 10px 0' }}>ENTRENÁ EN SERIO, ENTRENÁ EN SPORTIFY 💪</h1>
                <p style={{ color: '#aaa', margin: '0' }}>Tu próximo nivel empieza acá.</p>
            </header>

            {/* 2. SECCIÓN DEL CALENDARIO (Visible para todos) */}
            <section id="seccion-clases" className="landing-section">
                <div className="landing-section-content" style={{ textAlign: 'center' }}>
                    <h2 style={{ color: '#5DBB46', marginBottom: '10px' }}>📅 Calendario de Clases</h2>
                    <p style={{ color: '#ccc', marginBottom: '30px' }}>Consultá los horarios disponibles y asegurá tu lugar.</p>
                    
                    {/* El contenedor del calendario que van a programar */}
                    <div className="home-calendar-placeholder" style={{ border: '2px dashed #555', padding: '60px 20px', borderRadius: '15px', backgroundColor: '#1a1a1f', maxWidth: '800px', margin: '0 auto' }}>
                        
                        <h3 style={{ color: '#ffffff', marginBottom: '20px' }}>[ Acá se va a renderizar la grilla interactiva ]</h3>
                        
                        {/* 🌟 EL BOTÓN INTELIGENTE DEL CALENDARIO */}
                        {token ? (
                            /* Si está logueado, el botón le permite reservar */
                            <button className="navbar-btn" style={{ border: 'none', cursor: 'pointer', padding: '12px 24px' }}>
                                Reservar Turno Activo 🟢
                            </button>
                        ) : (
                            /* Si es un usuario random, el botón lo invita a loguearse */
                            <p style={{ color: '#ff4444', fontWeight: 'bold', margin: '0' }}>
                                ⚠️ Estás en modo lectura. Para reservar una clase, por favor iniciá sesión.
                            </p>
                        )}

                    </div>
                </div>
            </section>

            {/* 3. SECCIÓN DE EL GIMNASIO (Igual para todos) */}
            <section id="seccion-gimnasio" className="landing-section alt-bg">
                <div className="landing-section-content">
                    <h2>🏢 Sobre El Gimnasio</h2>
                    <p>Ubicados en pleno centro de La Plata, Sportify te ofrece una experiencia de entrenamiento premium con profesores capacitados.</p>
                    <div className="landing-card">
                        <h3>📍 Ubicación e Instalaciones</h3>
                        <p>Nuestra sede cuenta con vestuarios completos, racks profesionales de crossfit y zonas de peso libre totalmente climatizadas.</p>
                    </div>
                </div>
            </section>

        </div>
    );
};

export default Home;