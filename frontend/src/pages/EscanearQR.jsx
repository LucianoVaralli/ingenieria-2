import { useState, useRef, useEffect } from "react";
import jsQR from "jsqr";
import api from "../api/api";
import '../assets/css/Perfil.css';

export default function EscanearQR() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [mensaje, setMensaje] = useState(null);
  const [error, setError] = useState(null);
  const [escaneando, setEscaneando] = useState(false);
  const [camaraActiva, setCamaraActiva] = useState(false);

  const iniciarCamara = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      videoRef.current.play();
      setCamaraActiva(true);
      setEscaneando(true);
    } catch {
      setError("No se pudo acceder a la cámara. Habilitá los permisos en tu navegador.");
    }
  };

  useEffect(() => {
    if (!escaneando) return;

    const intervalo = setInterval(async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState !== 4) return;

      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code) {
        setEscaneando(false);
        clearInterval(intervalo);

        // Detener cámara
        const stream = videoRef.current?.srcObject;
        if (stream) stream.getTracks().forEach(t => t.stop());
        setCamaraActiva(false);

        try {
          const hoy = new Date();
          const fechaLocal = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
          const res = await api.post("/clases/escanear-qr", {
            codigo_qr: code.data,
            fecha_clase: fechaLocal,
          });
          setMensaje(res.data.mensaje);
        } catch (err) {
          const detail = err.response?.data?.detail;
          const mensajeError = Array.isArray(detail)
            ? detail.map(d => d.msg).join(', ')

            : detail || "Error al registrar asistencia";

          setError(mensajeError);
        }
      }
    }, 500);

    return () => clearInterval(intervalo);
  }, [escaneando]);

  return (
    <div style={{ textAlign: "center", padding: "1rem" }}>

      {!camaraActiva && !mensaje && (
        <button className="habilitar-camara" onClick={iniciarCamara}>
          Habilitar cámara para escanear QR
        </button>
      )}

      <video
        ref={videoRef}
        style={{ width: "300px", display: camaraActiva ? "block" : "none", margin: "1rem auto" }}
      />
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {mensaje && <p style={{ color: "green", fontWeight: "bold" }}>{mensaje}</p>}
      {error && <p style={{ color: "#eb0c0c", fontWeight: "bold" }}>{error}</p>}
    </div>
  );
}