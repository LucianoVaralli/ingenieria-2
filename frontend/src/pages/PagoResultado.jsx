import { useSearchParams, useNavigate } from 'react-router-dom'

const TEXTOS = {
    approved: {
        icon:   '✓',
        titulo: '¡Pago aprobado!',
        color:  '#4caf50',
        msg:    'Tu reserva fue confirmada. Te enviamos el comprobante por mail.',
    },
    failure: {
        icon:   '✕',
        titulo: 'Pago rechazado',
        color:  '#f44336',
        msg:    'No se pudo procesar el pago. Podés intentarlo de nuevo.',
    },
    pending: {
        icon:   '⏳',
        titulo: 'Pago pendiente',
        color:  '#ff9800',
        msg:    'Tu pago está siendo procesado. Te avisaremos cuando se confirme.',
    },
}

export default function PagoResultado() {
    const [params] = useSearchParams()
    const navigate = useNavigate()

    const status = params.get('status') || 'pending'
    const tipo   = params.get('tipo')            // 'individual' | 'membresia'

    const t = TEXTOS[status] || TEXTOS['pending']

    return (
        <div style={{
            maxWidth:   420,
            margin:     '80px auto',
            padding:    '32px 24px',
            textAlign:  'center',
            fontFamily: 'sans-serif',
        }}>
            <div style={{ fontSize: 72, color: t.color, marginBottom: 16 }}>
                {t.icon}
            </div>

            <h2 style={{ margin: '0 0 12px', color: '#fff' }}>
                {t.titulo}
            </h2>

            <p style={{ color: '#aaa', marginBottom: 32, lineHeight: 1.5 }}>
                {t.msg}
            </p>

            <button
                onClick={() => navigate('/perfil')}
                style={{
                    padding:         '12px 28px',
                    borderRadius:    '8px',
                    backgroundColor: '#009ee3',
                    color:           'white',
                    border:          'none',
                    cursor:          'pointer',
                    fontWeight:      '600',
                    fontSize:        '15px',
                    marginRight:     '12px',
                }}
            >
                Ver mis reservas
            </button>

            {status !== 'approved' && (
                <button
                    onClick={() => navigate(-1)}
                    style={{
                        padding:         '12px 28px',
                        borderRadius:    '8px',
                        backgroundColor: 'transparent',
                        color:           '#aaa',
                        border:          '1px solid #444',
                        cursor:          'pointer',
                        fontWeight:      '600',
                        fontSize:        '15px',
                    }}
                >
                    Intentar de nuevo
                </button>
            )}
        </div>
    )
}