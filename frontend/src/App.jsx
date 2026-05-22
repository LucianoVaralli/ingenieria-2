import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import React, { useState } from 'react';
import Login from './pages/Login'; 
import Home from './pages/Home'; 
import Registro from './pages/Registro';
import Navbar from './components/Navbar';
import Perfil from './pages/Perfil';
import AdminDashboard from "./pages/admin/AdminDashboard";

// 🌟 1. Creamos un sub-componente para poder usar useLocation
function AppContent({ token, setToken }) {
  const location = useLocation();

  // 🌟 2. Definimos en qué rutas NO queremos que aparezca el Navbar común
  const rutasSinNavbar = ["/admin"];

  return (
    <>
      {/* 🌟 3. Condición: Si la ruta actual NO está en la lista, mostramos el Navbar */}
      {!rutasSinNavbar.includes(location.pathname) && (
        <Navbar token={token} setToken={setToken} />
      )}

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />
        <Route path="/login" element={<Login setToken={setToken} />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/perfil" element={<Perfil token={token} setToken={setToken} />} />
        <Route path="/admin" element={<AdminDashboard />} />
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