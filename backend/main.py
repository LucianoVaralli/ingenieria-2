import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from dotenv import load_dotenv

# Cargar variables de entorno al principio por seguridad
load_dotenv()

from database import engine, Base, SessionLocal
from models.gimnasio import Gimnasio

# Importar los modelos para que SQLAlchemy cree las tablas
from models.reserva_MIO import Reserva
from models.lista_espera import ListaEspera
from models.password_recovery import PasswordRecovery
from models.tarjeta_simulada import TarjetaSimulada

# Importar Servicios y Routers
from services.scheduler import scheduler
from services.tarjetas_seed import crear_tarjetas_simuladas

from routes.socios import router as socios_router
from routes.auth import router as auth_router
from routes.gimnasio import router as gimnasio_router
from routes.clase import router as clase_router
from routes.reserva import router as reserva_router
from routes.notificacion import router as notificaciones_router
from routes.pregunta_frecuente import router as pregunta_frecuente_router
from routes.membresia import router as membresia_router

from fastapi.staticfiles import StaticFiles

from models.membresia import Membresia

from routes.mercadopago import router as mp_router
from models.cuenta_simulada import CuentaSimulada

# Crear las tablas en la base de datos
Base.metadata.create_all(bind=engine)

# =========================================
# FUNCIONES AUXILIARES DE INICIALIZACIÓN
# =========================================

def crear_gimnasio_por_defecto():
    db = SessionLocal()
    try:
        gimnasio = db.query(Gimnasio).first()

        if not gimnasio:
            nuevo_gimnasio = Gimnasio(
                capacidad_total=50,
            )
            db.add(nuevo_gimnasio)
            db.commit()

    except Exception as e:
        print(f"Error al inicializar el gimnasio: {e}")

    finally:
        db.close()


def inicializar_tarjetas_semilla():
    db: Session = SessionLocal()

    try:
        crear_tarjetas_simuladas(db)

    except Exception as e:
        print(f"Error al inicializar tarjetas simuladas: {e}")

    finally:
        db.close()


# =========================================
# CICLO DE VIDA DE LA APLICACIÓN (LIFESPAN)
# =========================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Lo que se ejecuta AL ARRANCAR la app
    crear_gimnasio_por_defecto()
    inicializar_tarjetas_semilla()

    if not scheduler.running:
        scheduler.start()

    yield

    # Lo que se ejecuta AL APAGAR la app
    if scheduler.running:
        scheduler.shutdown()


# =========================================
# INICIALIZACIÓN DE FASTAPI
# =========================================

app = FastAPI(
    title="Sportify API",
    lifespan=lifespan
)

# =========================================
# CORS
# =========================================

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================
# ROUTERS
# =========================================

app.include_router(socios_router)
app.include_router(auth_router)
app.include_router(gimnasio_router)
app.include_router(clase_router)
app.include_router(reserva_router)
app.include_router(notificaciones_router)
app.include_router(pregunta_frecuente_router)
app.include_router(membresia_router)
app.include_router(mp_router)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# =========================================
# ROOT
# =========================================

@app.get("/")
def read_root():
    return {
        "message": "Bienvenido a Sportify"
    }