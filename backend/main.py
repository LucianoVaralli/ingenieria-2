from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import engine, Base, SessionLocal

from models.gimnasio import Gimnasio

from routes.socios import router as socios_router
from routes.auth import router as auth_router
from routes.gimnasio import router as gimnasio_router
from routes.clase import router as clase_router
from routes.reserva  import router as reserva_router   

# Importar los modelos nuevos para que SQLAlchemy cree las tablas
from models.reserva_MIO      import Reserva      
from models.lista_espera import ListaEspera   
from services.scheduler  import scheduler

from models.tarjeta_simulada import TarjetaSimulada

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Sportify API"
)

# =========================================
# CREAR GIMNASIO POR DEFECTO
# =========================================

def crear_gimnasio_por_defecto():

    db: Session = SessionLocal()

    gimnasio = db.query(Gimnasio).first()

    if not gimnasio:

        nuevo_gimnasio = Gimnasio(
            capacidad_total=50,
            capacidad_disponible=50
        )

        db.add(nuevo_gimnasio)
        db.commit()

    db.close()

# Ejecutar al iniciar la app
crear_gimnasio_por_defecto()

from services.tarjetas_seed import crear_tarjetas_simuladas

db = SessionLocal()

crear_tarjetas_simuladas(db)

db.close()
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

# =========================================
# ROOT
# =========================================

@app.get("/")
def read_root():
    return {
        "message": "Bienvenido a Sportify"
    }