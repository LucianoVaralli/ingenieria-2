# Ingenieria 2



## Sportify

descripción: 

## Colaboradores

- Luciano Varalli
- Joaquin Ruiz
- Luis Vilte
- Nicole Chavez
- Erik Nishimura

## Documentación

## Tecnologías Utilizadas

### Lenguajes de Programación

- Python
- JavaScript

### Backend

### Frontend

### Otras Herramientas

## Requisitos

## Instalación y Ejecución

Sigue estos pasos para levantar el entorno de desarrollo.

### 1. Clonar el repositorio
```bash
git clone [https://gitlab.com/luchito233/ingenieria-2.git](https://gitlab.com/luchito233/ingenieria-2.git)
cd ingenieria-2
```

### 2. Configurar el Backend

```bash
cd backend
python -m venv venv
```
Activar el entorno:

- En Windows: source venv/Scripts/activate

Instalar dependencias:
```bash
pip install -r requirements.txt
```
### 3. Levantar la API

```bash
uvicorn main:app --reload
```