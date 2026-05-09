from fastapi import FastAPI

from database import engine, Base
from routes.socios import router as socios_router
from routes.auth import router as auth_router

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Sportify API"
)

app.include_router(socios_router)
app.include_router(auth_router)

@app.get("/")
def read_root():
    return {
        "message": "Bienvenido a Sportify"
    }