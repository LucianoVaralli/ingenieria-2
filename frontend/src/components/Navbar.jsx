import { Link, useNavigate } from 'react-router-dom';

const Navbar = () => {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/');
        window.location.reload(); // fuerza que el navbar se actualice
    };

    return (
        <nav style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '10px 20px',
            background: '#222',
            color: 'white'
        }}>
            <div>
                <Link to="/" style={{ color: 'white', fontWeight: 'bold', textDecoration: 'none' }}>
                    SPORTIFY 🏋️‍♂️
                </Link>
            </div>

            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                <Link to="/nosotros" style={{ color: 'white' }}>El Gimnasio</Link>

                {token ? (
                    // Socio registrado y logueado
                    <>
                        <Link to="/home" style={{ color: '#fbaf32' }}>Mi Perfil</Link>
                        <button
                            onClick={handleLogout}
                            style={{
                                background: '#ff4444',
                                color: 'white',
                                border: 'none',
                                padding: '5px 12px',
                                borderRadius: '5px',
                                cursor: 'pointer'
                            }}
                        >
                            Cerrar Sesión
                        </button>
                    </>
                ) : (
                    // Usuario no registrado / no logueado
                    <>
                        <Link to="/login" style={{ color: 'white' }}>Iniciar Sesión</Link>
                        <Link to="/registro" style={{
                            background: '#fbaf32',
                            padding: '5px 10px',
                            borderRadius: '5px',
                            color: 'black',
                            textDecoration: 'none'
                        }}>
                            Registrarse
                        </Link>
                    </>
                )}
            </div>
        </nav>
    );
};

export default Navbar;