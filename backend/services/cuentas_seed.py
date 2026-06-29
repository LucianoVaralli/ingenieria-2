# services/cuentas_seed.py
# Corré esto UNA VEZ para cargar cuentas de prueba en la DB.
# Uso: python -m services.cuentas_seed

from dependencies.database import SessionLocal
from models.cuenta_simulada import CuentaSimulada

CUENTAS = [
    {
        "alias":            "juan.perez.mp",
        "cvu":              "0000003100025698742001",
        "titular":          "Juan Perez",
        "saldo":            50000.0,
        "conexion_exitosa": True,
    },
    {
        "alias":            "maria.gomez.mp",
        "cvu":              "0000003100025698742002",
        "titular":          "Maria Gomez",
        "saldo":            10000.0,
        "conexion_exitosa": True,
    },
    {
        "alias":            "sin.saldo.mp",
        "cvu":              "0000003100025698742003",
        "titular":          "Sin Saldo",
        "saldo":            0.0,
        "conexion_exitosa": True,
    },
    {
        "alias":            "sin.conexion.mp",
        "cvu":              "0000003100025698742004",
        "titular":          "Sin Conexion",
        "saldo":            99999.0,
        "conexion_exitosa": False,  # simula falla de MP
    },
]


def seed():
    db = SessionLocal()
    try:
        for datos in CUENTAS:
            existe = db.query(CuentaSimulada).filter(
                CuentaSimulada.alias == datos["alias"]
            ).first()
            if not existe:
                db.add(CuentaSimulada(**datos))
        db.commit()
        print(f"✅ {len(CUENTAS)} cuentas cargadas correctamente.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()