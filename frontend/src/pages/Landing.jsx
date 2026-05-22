import Clases from './Clases'; 

const Landing = () => {
return (
    <div>
      {/* Sección Hero similar a la de la foto */}
    <header style={{ height: '400px', background: '#333', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <h1>ENTRENÁ EN SERIO, ENTRENÁ EN SPORTIFY</h1>
    </header>

    <section style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Nuestros Horarios</h2>
        <Clases /> 
    </section>
    </div>
);
};

export default Landing;