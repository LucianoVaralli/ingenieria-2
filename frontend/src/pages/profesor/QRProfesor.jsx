import { useState, useEffect } from "react";
import api from "../../api/api";
import QRCode from "qrcode";

export default function QRProfesor({ claseId, claseNombre }) {
  const [qrUrl, setQrUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Al entrar intenta obtener el QR existente o generarlo
  useEffect(() => {
    obtenerOGenerarQR();
  }, [claseId]);

  const obtenerOGenerarQR = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post(`/clases/${claseId}/generar-qr`);
      const codigo = res.data.codigo_qr;
      // Convierte el UUID en imagen QR
      const url = await QRCode.toDataURL(codigo);
      setQrUrl(url);
    } catch (err) {
      setError(err.response?.data?.detail || "Error al obtener el QR");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ textAlign: "center", padding: "1rem" }}>
      <h3>{claseNombre}</h3>
      {loading && <p>Cargando QR...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {qrUrl && (
        <div>
          <p>Mostrá este QR a tus alumnos para registrar la asistencia:</p>
          <img src={qrUrl} alt="Código QR de la clase" width={200} />
        </div>
      )}
    </div>
  );
}