import { useState } from 'react'
import axios from 'axios'

function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const login = async (e) => {
  e.preventDefault(); // IMPORTANTE: Esto evita que el navegador haga el GET por defecto
  
  try {
    const data = new URLSearchParams();
    data.append('username', email);
    data.append('password', password);

    // Verificá que diga .post y que la URL sea la correcta
    const res = await axios.post('http://127.0.0.1:8000/auth/login', data);
    
    localStorage.setItem('token', res.data.access_token);
    alert("¡Entraste! Token guardado.");
  } catch (err) {
    console.error("Error completo:", err);
    alert("Error al loguear");
  }
};

  return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h1>Sportify Login</h1>
      <form onSubmit={login}>
        <input type="text" placeholder="Email" onChange={e => setEmail(e.target.value)} /><br/>
        <input type="password" placeholder="Pass" onChange={e => setPassword(e.target.value)} /><br/>
        <button type="submit">Probar Conexión</button>
      </form>
    </div>
  )
}

export default App