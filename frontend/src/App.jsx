import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast'; // 🌟 IMPORTAMOS EL CONTENEDOR DE TOASTS

import Login from './pages/Login';
import Home from './pages/Home';
import Registro from './pages/Registro';
import Navbar from './components/Navbar';
import ReservaMembresia from './pages/ReservaMembresia';
import MisReservas from './pages/MisReservas';
import Clases from './pages/Clases';
import Pago from './pages/Pago';
import Perfil from './pages/Perfil';
import ForgotPassword from './pages/ForgotPassword';
import AdminDashboard from "./pages/admin/AdminDashboard";
import CrearClase from "./pages/admin/CrearClase";
import ListaClasesAdmin from "./pages/admin/ListaClasesAdmin";
import EditarCapacidad from "./pages/admin/EditarCapacidad";
import ResetPassword from './pages/ResetPassword';
import { Navigate } from "react-router-dom";
import ReservaIndividual from './pages/ReservaIndividual';
<<<<<<< HEAD
import Notificaciones from "./pages/Notificaciones";
=======
import CambiarPassword from "./pages/CambiarPassword";
>>>>>>> parent of 486aa10 (Revert "Merge branch 'feature-recuperar-password' into 'main'")

// 1. Creamos un sub-componente para poder usar useLocation
function AppContent({ token, setToken }) {
  const location = useLocation();

  // 2. Definimos en qué rutas NO queremos que aparezca el Navbar común
  const esRutaAdmin = location.pathname.startsWith("/admin");

  // 🚨 Ocultamos el Navbar en las rutas de autenticación y recuperación de clave
  const esRutaAuth = ["/login", "/registro", "/forgot-password", "/reset-password"].includes(location.pathname);

  return (
    <>
      {/* 🌟 CONFIGURAMOS EL TOASTER AQUÍ 
          Esto permite que los mensajes floten estéticamente en cualquier pantalla */}
      <Toaster position="top-right" reverseOrder={false} />

      {/* 3. Condición para mostrar el Navbar: No debe ser admin ni tampoco una pantalla de auth */}
      {!esRutaAdmin && !esRutaAuth && (
        <Navbar token={token} setToken={setToken} />
      )}

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />
        <Route path="/clases" element={<Clases />} />
        <Route path="/reservar/membresia" element={<ReservaMembresia />} />
        <Route path="/pago" element={<Pago />} />
        <Route path="/mis-reservas" element={<MisReservas />} />
        <Route path="/clases" element={<Clases />} />
        <Route path="/reservar/membresia" element={<ReservaMembresia />} />
        <Route path="/reservar/individual" element={<ReservaIndividual />} />
        <Route path="/pago" element={<Pago />} />
        <Route path="/mis-reservas" element={<MisReservas />} />
        <Route path="/login" element={<Login setToken={setToken} />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/perfil" element={<Perfil token={token} setToken={setToken} />} />
<<<<<<< HEAD
        <Route path="/admin" element={<AdminDashboard />} /> {/* usado por ahora para mostrar los paneles admin */}
        {/*<Route path="/admin" element={
          localStorage.getItem("rol") === "admin"
            ? <AdminDashboard />
            : <Navigate to="/" />}/>   
              
        */}
        <Route path="/admin/crear-clase" element={<CrearClase />} />
        <Route path="/admin/eliminar-clase" element={<ListaClasesAdmin />} />
        <Route path="/admin/editar-capacidad" element={<EditarCapacidad />} />
        <Route path="/notificaciones" element={<Notificaciones />}/>
        <Route path="*" element={<h1>404 - Página no encontrada</h1>} />
=======
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/cambiar-password" element={<CambiarPassword />} />

        {/* Rutas de Administración (Limpiadas las duplicadas) */}
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/crear-clase" element={<CrearClase />} />
        <Route path="/admin/eliminar-clase" element={<ListaClasesAdmin />} />
        <Route path="/admin/editar-capacidad" element={<EditarCapacidad />} />

        {/* Ruta 404 */}
        <Route path="/*" element={<h1>404 - Página no encontrada</h1>} />
>>>>>>> parent of 486aa10 (Revert "Merge branch 'feature-recuperar-password' into 'main'")
      </Routes>
    </>
  );
}

// 4. App principal que envuelve todo con el Router
function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));

  return (
    <Router>
      <AppContent token={token} setToken={setToken} />
    </Router>
  );
}

export default App;