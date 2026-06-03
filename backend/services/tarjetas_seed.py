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
            numero="1111111111111111",
            titular="Erik Nishimura",
            cvv="111",
            fecha_vencimiento="05/28",
            tipo="credito",
            saldo=999999,
            conexion_exitosa=True
        ),

        # Débito OK
        TarjetaSimulada(
            numero="2222222222222222",
            titular="Lucho Varalli",
            cvv="222",
            fecha_vencimiento="06/28",
            tipo="debito",
            saldo=999999,
            conexion_exitosa=True
        ),

        # Sin saldo
        TarjetaSimulada(
            numero="3333333333333333",
            titular="Nicole Chavez",
            cvv="333",
            fecha_vencimiento="07/28",
            tipo="credito",
            saldo=0,
            conexion_exitosa=True
        ),

        # Error banco
        TarjetaSimulada(
            numero="4444444444444444",
            titular="Joaco Gimenez",
            cvv="444",
            fecha_vencimiento="08/28",
            tipo="credito",
            saldo=999999,
            conexion_exitosa=False
        )
    ]

    db.add_all(tarjetas_fake)

    db.commit()