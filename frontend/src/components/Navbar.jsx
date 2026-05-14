import { Link } from 'react-router-dom';

const Navbar = () => {
  const token = localStorage.getItem('token'); // Verificamos si ya inició sesión

return (
    <nav style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 20px', background: '#222', color: 'white' }}>
    <div className="logo">
        <Link to="/" style={{ color: 'white', fontWeight: 'bold', textDecoration: 'none' }}>SPORTIFY 🏋️‍♂️</Link>
    </div>
    
    <div className="menu" style={{ display: 'flex', gap: '15px' }}>
        <Link to="/clases" style={{ color: 'white' }}>Clases</Link>
        <Link to="/nosotros" style={{ color: 'white' }}>El Gimnasio</Link>
        
        {/* Si hay token, mostramos "Mi Perfil", si no, Login/Registro */}
        {token ? (
            <Link to="/home" style={{ color: '#fbaf32' }}>Mi Perfil</Link>
        ) : (
        <div>
            <Link to="/login" style={{ marginRight: '10px', color: 'white' }}>Iniciar Sesión</Link>
            <Link to="/registro" style={{ background: '#fbaf32', padding: '5px 10px', borderRadius: '5px', color: 'black' }}>Registrarse</Link>
        </div>
        )}
    </div>
    </nav>
);
};

export default Navbar;