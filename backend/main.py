from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routes.socios import router as socios_router
from routes.auth import router as auth_router
from routes.gimnasio import router as gimnasio_router
from routes.clase import router as clase_router
Base.metadata.create_all(bind=engine)



app = FastAPI(
    title="Sportify API"
)

# Configuración de CORS
# Configuración de CORS
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,           # Permite que tu React entre
    allow_credentials=True,
    allow_methods=["*"],             # Permite POST, GET, etc.
    allow_headers=["*"],             # Permite Authorization y otros headers
)

app.include_router(socios_router)
app.include_router(auth_router)
app.include_router(gimnasio_router)
app.include_router(clase_router)

@app.get("/")
def read_root():
    return {
        "message": "Bienvenido a Sportify"
    }