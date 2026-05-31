from sqlalchemy.orm import Session

from models.tarjeta_simulada import TarjetaSimulada


def crear_tarjetas_simuladas(db: Session):

    tarjetas = db.query(TarjetaSimulada).count()

    # Si ya existen no volvemos a crearlas
    if tarjetas > 0:
        return

    tarjetas_fake = [

        # Crédito OK
        TarjetaSimulada(
            numero="1111",
            titular="Erik Nishimura",
            cvv="111",
            tipo="credito",
            saldo=999999,
            conexion_exitosa=True
        ),

        # Débito OK
        TarjetaSimulada(
            numero="2222",
            titular="Lucho Varalli",
            cvv="222",
            tipo="debito",
            saldo=999999,
            conexion_exitosa=True
        ),

        # Sin saldo
        TarjetaSimulada(
            numero="3333",
            titular="Nicole Chavez",
            cvv="333",
            tipo="credito",
            saldo=0,
            conexion_exitosa=True
        ),

        # Error banco
        TarjetaSimulada(
            numero="4444",
            titular="Joaco Gimenez",
            cvv="444",
            tipo="credito",
            saldo=999999,
            conexion_exitosa=False
        )
    ]

    db.add_all(tarjetas_fake)

    db.commit()