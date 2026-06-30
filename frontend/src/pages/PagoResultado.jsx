import { useSearchParams, useNavigate } from 'react-router-dom'
import '../assets/css/PagoResultado.css'

const TEXTOS = {
    approved: {
        icono:   '✓',
        clase:   'ok',
        titulo:  '¡Pago aprobado!',
        msg:     'Tu reserva fue confirmada. Te enviamos el comprobante por mail.',
    },
    failure: {
        icono:   '✕',
        clase:   'error',
        titulo:  'Error inesperado en el pago',
        msg:     'No pudimos procesar tu pago. Volvé al inicio e intentá de nuevo.',
    },
    pending: {
        icono:   '⏳',
        clase:   'pending',
        titulo:  'Pago pendiente',
        msg:     'Tu pago está siendo procesado. Te avisaremos cuando se confirme.',
    },
}

export default function PagoResultado() {
    const [params] = useSearchParams()
    const navigate = useNavigate()

    const status = params.get('status') || 'pending'
    const t = TEXTOS[status] || TEXTOS['failure']

    return (
        <div className="pago-resultado-page">
            <div className={`pago-resultado-card pago-resultado-card--${t.clase}`}>

                <div className={`pago-resultado-icono pago-resultado-icono--${t.clase}`}>
                    {t.icono}
                </div>

                <h2 className="pago-resultado-titulo">{t.titulo}</h2>
                <p className="pago-resultado-msg">{t.msg}</p>

                <div className="pago-resultado-botones">
                    {status === 'approved' ? (
                        <button
                            className="pago-resultado-btn-primary"
                            onClick={() => navigate('/perfil')}
                        >
                            Ver mis reservas
                        </button>
                    ) : (
                        <button
                            className="pago-resultado-btn-ghost"
                            onClick={() => navigate('/')}
                        >
                            Volver al inicio
                        </button>
                    )}
                </div>

            </div>
        </div>
    )
}
