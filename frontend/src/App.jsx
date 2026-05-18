import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import React, { useState } from 'react';
import Login from './pages/Login'; 
import Home from './pages/Home'; 
import Registro from './pages/Registro';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Perfil from './pages/Perfil';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));

  return (
    <Router>
      {/* LE PASAMOS EL SETTOKEN AL NAVBAR */}
      <Navbar token={token} setToken={setToken} /> 
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login setToken={setToken} />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/home" element={<Home token={token} />} />
        <Route path="/perfil" element={<Perfil token={token} setToken={setToken} />} />
        <Route path="*" element={<h1>404 - Página no encontrada</h1>} />
      </Routes>
    </Router>
  );
}

export default App;