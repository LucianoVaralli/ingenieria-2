import { useState, useRef, useEffect } from "react";
import jsQR from "jsqr";
import api from "../api/api";

export default function EscanearQR({ fechaClase }) {
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

      const ctx = canvas.getContext("2d");
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
          const res = await api.post("/clases/escanear-qr", {
            codigo_qr: code.data,
            fecha_clase: fechaClase,
          });
          setMensaje(res.data.mensaje);
        } catch (err) {
          setError(err.response?.data?.detail || "Error al registrar asistencia");
        }
      }
    }, 500);

    return () => clearInterval(intervalo);
  }, [escaneando, fechaClase]);

  return (
    <div style={{ textAlign: "center", padding: "1rem" }}>

      {!camaraActiva && !mensaje && (
        <button onClick={iniciarCamara}>
          Habilitar cámara para escanear QR
        </button>
      )}

      <video
        ref={videoRef}
        style={{ width: "300px", display: camaraActiva ? "block" : "none", margin: "1rem auto" }}
      />
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {mensaje && <p style={{ color: "green", fontWeight: "bold" }}>{mensaje}</p>}
      {error && <p style={{ color: "green", fontWeight: "bold" }}>{error}</p>}
    </div>
  );
}