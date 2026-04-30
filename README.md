# Ingenieria 2


## 1. Sportify

Es un gimnasio familiar ubicado en La Plata, Buenos Aires, que ofrece clases de Funcional, Pilates y Yoga. Su objetivo es brindar un espacio deportivo accesible y organizado, con un sistema de membresías que prioriza la fidelización de sus alumnos y la calidad de sus clases.

## 2. Sportify Web App

Es una plataforma web de gestión integral para el gimnasio Sportify y su objetivo es digitalizar y centralizar todos los procesos administrativos del negocio, incluyendo la reserva de clases, la gestión de membresías, el control de pagos y el registro de asistencia mediante código QR, reemplazando por completo el manejo manual con planillas y efectivo.

## Autores 

- Joaquin Alejo Gimenez Ruiz
- Luciano Varalli
- Luis Vilte Tisiano
- Nicole Antonella Chavez
- Erik Nishimura

## Documentación

## Tecnologías Utilizadas

### Lenguajes de Programación

- Python
- JavaScript

### Lenguajes de Marcado y Estilos
- HTML
- CSS

### Backend

- FastApi: Framework web para Python.
- SQLAlchemy: ORM para la gestión de bases de datos.
- SQLite: Base de datos.

### Frontend

### Otras Herramientas

## Requisitos

## Instalación y Ejecución

Para ejecutar este proyecto, se recomienda crear un entorno virtual y luego instalar las dependencias necesarias.

### 1. Clonar el repositorio
```bash
git clone https://gitlab.com/luchito233/ingenieria-2.git
cd ingenieria-2
```

### 2. Crear un entorno virtual (opcional pero recomendado)
```bash
python -m venv venv
```
# Para tener la version directa 3.12 se recomienda escribir
```bash
py 3.12 -m venv venv
``` 

### 3. Activar el entorno virtual
- En Windows:
  ```bash
  source venv\Scripts\activate
  ```
- En macOS/Linux:
  ```bash
  source venv/bin/activate
  ```

### 4. Instalar dependencias
Para poder ejecutar correctamente esta App se deben instalar las siguientes dependencias:

- En Windows:
1. Abre la linea de comandos o terminal en Windows.
2. Navega hasta el directorio donde se encuentra el archivo `requirements.txt` usando el comando `cd <ruta_del_directorio>`.
3. Una vez en el directorio correcto, puedes instalar las dependencias usando los siguientes comandos:

```bash
pip install -r requirements.txt
```

Este comando utiliza `pip`, el gestor de paquetes de Python, para instalar todas las dependencias listada en el archivo `requirements.txt`.

Instalación en Linux:
1. Abre la terminal en Linux.
2. Navega hasta el directorio donde se encuentra el archivo `requirements.txt` usando el comando `cd <ruta_del_directorio>`.
3. Una vez en el directorio correcto, puedes instalar las dependencias usando los siguientes comandos:

```bash
pip install -r requirements.txt
```

Al igual que en Windows, este comando utiliza `pip`, el gestor de paquetes de Python, para instalar todas las dependencias listada en el archivo `requirements.txt`.

Asegurate de tener Python 3.12 o posterior y `pip` instalados en tu sistema antes de ejecutar estos comandos. Tambien es recomendable utilizar un entorno virtual de Python para evitar conflictos entre diferentes proyectos y sus dependencias. 

### 5. Levantar la API

Para abrir uvicorn asegurate de estar posicionado en la carpeta backend en una terminal y ejecuta:

```bash
cd backend
uvicorn main:app --reload
```
#### Una vez levantado el servidor, abrí tu navegador en:
- `http://localhost:8000` — Bienvenida
- `http://localhost:8000/docs` — Documentación interactiva
- `http://localhost:8000/socios` — Lista de socios
- `http://localhost:8000/estado` — Estado de la API

### 6. Frontend 

Para abrir (app) asegurate de estar posicionado en la carpeta frontend en una terminal y ejecuta:

```bash
cd frontend

```

## Estructura del Proyecto
```
Sportify_App/
│── Backend                  # Módulo principal del servidor y lógica de negocio
|   │── .gitkeep             # Archivo para mantener la carpeta en el repositorio
|   |── database.py          # Configuración de la base de datos y definición de modelos
|   |── main.py              # Módulo con las funciones principales 
|   │── requirements.txt     # Dependencias del proyecto
|   |── sportify.db          # Base de datos SQLite generada automáticamente
│── docs                     # Documentación del proyecto
|   │── .gitkeep             # Archivo para mantener la carpeta en el repositorio
│── frontend                 # Módulo de la interfaz de usuario
|   │── .gitkeep             # Archivo para mantener la carpeta en el repositorio
│── .gitignore               # Archivos y carpetas ignorados por Git
│── .README.md               # Instrucciones y documentación