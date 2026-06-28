import { useState } from 'react'
import api from '../api/api.js'

export default function PagarConMP({ tipo, payload, onError }) {
    const [cargando, setCargando] = useState(false)

    const handlePagar = async () => {
        setCargando(true)
        try {
            const endpoint = tipo === 'individual'
                ? '/mp/preferencia/individual'
                : '/mp/preferencia/membresia'

            const res = await api.post(endpoint, payload)
            // Redirige al checkout sandbox de MP
            window.location.href = res.data.init_point
        } catch (err) {
            onError?.(err.response?.data?.detail || 'Error al conectar con Mercado Pago')
            setCargando(false)
        }
    }

    return (
        <button
            onClick={handlePagar}
            disabled={cargando}
            style={{
                width:           '100%',
                padding:         '14px',
                borderRadius:    '8px',
                backgroundColor: cargando ? '#80cfee' : '#009ee3',
                color:           'white',
                border:          'none',
                fontWeight:      '700',
                fontSize:        '16px',
                cursor:          cargando ? 'not-allowed' : 'pointer',
                display:         'flex',
                alignItems:      'center',
                justifyContent:  'center',
                gap:             '8px',
                transition:      'background-color 0.2s ease',
            }}
        >
            {cargando ? (
                <>
                    <span style={{
                        width: 18, height: 18,
                        border: '2px solid white',
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                        display: 'inline-block',
                        animation: 'spin 0.8s linear infinite',
                    }} />
                    Redirigiendo...
                </>
            ) : (
                'Pagar con Mercado Pago'
            )}
        </button>
    )
}