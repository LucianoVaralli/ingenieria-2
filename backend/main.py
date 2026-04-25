from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Bienvenido a la API de Sportify - Gimnasio UNLP"}

@app.get("/estado")
def get_status():
    return {"status": "operativo", "version": "0.1.0"}