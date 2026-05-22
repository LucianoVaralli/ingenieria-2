import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import React, { useState } from 'react';
import Login from './pages/Login'; 
import Home from './pages/Home'; 
import Registro from './pages/Registro';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import ReservaMembresia from './pages/ReservaMembresia';   
import MisReservas from './pages/MisReservas';             
import Clases from './pages/Clases';       
import Pago from './pages/Pago';           
import Perfil from './pages/Perfil';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));

  return (
    <Router>
      <Navbar token={token} setToken={setToken} /> 
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />
        <Route path="/clases" element={<Clases />} />    
        <Route path="/reservar/membresia" element={<ReservaMembresia />} />  
        <Route path="/pago" element={<Pago />} /> 
        <Route path="/mis-reservas" element={<MisReservas />} />        
        <Route path="/login" element={<Login setToken={setToken} />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/perfil" element={<Perfil token={token} setToken={setToken} />} />
        <Route path="*" element={<h1>404 - Página no encontrada</h1>} />
      </Routes>
    </Router>
  );
}

export default App;