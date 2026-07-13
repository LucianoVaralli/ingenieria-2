import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import React, { useState } from 'react';
import Login from './pages/Login'; 
import Home from './pages/Home'; 
import Registro from './pages/Registro';
import Navbar from './components/Navbar';
import ReservaMembresia from './pages/ReservaMembresia';               
import Clases from './pages/Clases';       
import Pago from './pages/Pago';           
import Perfil from './pages/Perfil';
import AdminDashboard from "./pages/admin/AdminDashboard";
import CrearClase from "./pages/admin/CrearClase";
import ListaClasesAdmin from "./pages/admin/ListaClasesAdmin";
import EditarCapacidad from "./pages/admin/EditarCapacidad";
import { Navigate } from "react-router-dom";
import ReservaIndividual from './pages/ReservaIndividual';
import Notificaciones from "./pages/Notificaciones";
import HistorialPagos from './pages/HistorialPagos';
import CambiarPassword from "./pages/CambiarPassword";
import ResetPassword from './pages/ResetPassword';
import ForgotPassword from './pages/ForgotPassword';
import GestionPreguntasFrecuentes from './pages/admin/GestionPreguntasFrecuentes';
import CambiarPasswordInicial from './pages/CambiarPasswordInicial';
import GestionProfesores from './pages/admin/GestionProfesores';
import PagoResultado from './pages/PagoResultado'
import Estadisticas from "./pages/admin/Estadisticas";
import AdminCalificaciones from './pages/admin/Calificaciones';
// 🌟 1. Creamos un sub-componente para poder usar useLocation
function AppContent({ token, setToken }) {
  const location = useLocation();

  // 🌟 2. Definimos en qué rutas NO queremos que aparezca el Navbar común, aca se define en todos los paneles de admin
  const esRutaAdmin = location.pathname.startsWith("/admin");

  const isAdmin = () => {
      return localStorage.getItem("rol")?.toLowerCase() === "admin";
  };

  return (
    <>
      {/* 🌟 3. Condición: Si la ruta actual NO está en la lista, mostramos el Navbar */}
      {!esRutaAdmin && (
    <Navbar token={token} setToken={setToken} />
    )}

      <Routes>
        {/* Rutas Públicas y de Clientes */}
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />
        <Route path="/clases" element={<Clases token={token} />} />   
        <Route path="/reservar/membresia" element={<ReservaMembresia />} />
        <Route path="/reservar/individual" element={<ReservaIndividual />} />
        <Route path="/pago" element={<Pago />} />
        <Route path="/notificaciones" element={<Notificaciones />} />

        {/* Rutas de Autenticación y Password */}
        <Route path="/login" element={<Login setToken={setToken} />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/perfil" element={<Perfil token={token} setToken={setToken} />} />
        <Route path="/historial-pagos" element={<HistorialPagos />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/cambiar-password" element={<CambiarPassword />} />

        {/* Rutas de Administración */}
        <Route path="/admin" element={ isAdmin()
            ? <AdminDashboard />
            : <Navigate to="/" /> } />
        <Route path="/admin/crear-clase" element={<CrearClase />} />
        <Route path="/admin/eliminar-clase" element={<ListaClasesAdmin />} />
        <Route path="/admin/editar-capacidad" element={<EditarCapacidad />} />
        <Route path="/admin/preguntas-frecuentes" element={<GestionPreguntasFrecuentes />} />
        <Route path="/admin/gestion-profesores" element={<GestionProfesores />} />
        <Route path="/cambiar-password-inicial" element={<CambiarPasswordInicial />} />
        <Route path="/admin/estadisticas" element={<Estadisticas />} />  
        <Route path="/admin/calificaciones" element={<AdminCalificaciones />} />
        {/* Rutas de Mercado Pago */}
        <Route path="/pago/resultado" element={<PagoResultado />} />
        {/* Ruta 404 - Captura cualquier ruta inexistente */}
        <Route path="*" element={<h1>404 - Página no encontrada</h1>} />
      </Routes>
    </>
  );
}

// 4. Tu App principal ahora solo envuelve todo con el Router
function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));

  return (
    <Router>
      <AppContent token={token} setToken={setToken} />
    </Router>
  );
}

export default App;
