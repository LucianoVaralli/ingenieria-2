import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login'; // Ajustá la ruta según cómo llamaste a las carpetas
import Home from './pages/Home'; 
import Registro from './pages/Registro';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import ReservaMembresia from './pages/ReservaMembresia';   // NUEVO
import MisReservas from './pages/MisReservas';             // NUEVO
import Clases from './pages/Clases';       // ← AGREGAR
import Pago from './pages/Pago';           // ← AGREGAR
function App() {
  return (
    <Router>
      <Navbar /> {/* Se muestra siempre, arriba de cualquier ruta */}
      <Routes>
        
        {/* Aquí irán agregando las demás pantallas del gimnasio */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/home" element={<Home />} />
        <Route path="/clases" element={<Clases />} />    
        <Route path="/reservar/membresia" element={<ReservaMembresia />} />  {/* NUEVO */}
        <Route path="/pago" element={<Pago />} /> 
        <Route path="/mis-reservas" element={<MisReservas />} />        {/* NUEVO */}
        {/* Ruta para cuando alguien escribe cualquier cosa que no existe */}
        <Route path="*" element={<h1>404 - Página no encontrada</h1>} />
      </Routes>
    </Router>
  );
}

export default App;