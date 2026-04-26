from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
import database

# Crea las tablas si no existen
database.Base.metadata.create_all(bind=database.engine)

app = FastAPI()

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

class SocioCreate(BaseModel):
    nombre: str
    apellido: str
    dni: int

# Esta es la función para GUARDAR en la base de datos
@app.post("/socios")
def crear_socio(socio: SocioCreate, db: Session = Depends(get_db)):
    nuevo_socio = database.Socio(
        nombre=socio.nombre, 
        apellido=socio.apellido, 
        dni=socio.dni
    )
    db.add(nuevo_socio)
    db.commit()
    db.refresh(nuevo_socio)
    return nuevo_socio

@app.get("/")
def read_root():
    return {"message": "Bienvenido a la API de Sportify - Gimnasio UNLP"}

@app.get("/estado")
def get_status():
    return {"status": "operativo", "version": "0.1.0"}

# Nueva ruta para ver todos los socios
@app.get("/socios")
def obtener_socios(db: Session = Depends(get_db)):
    socios = db.query(database.Socio).all()
    return socios