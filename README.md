# Kairós - Sistema Multi-Agente para la Gestión Dinámica de Citas Médicas

Kairós es un sistema distribuido e inteligente basado en una arquitectura de **Sistemas Multi-Agente (SMA)** diseñado para optimizar de forma autónoma la gestión, asignación y reasignación en cascada de citas médicas. El objetivo del sistema es erradicar la infrautilización de agendas médicas debido a cancelaciones y absentismo, automatizando el "efecto dominó" de optimización horaria sin intervención administrativa humana.

El proyecto cuenta con un enfoque integral (**Full-Stack**): un motor de agentes inteligentes autónomos, una capa de servicios REST robusta y segura, y un portal de usuario moderno, accesible e intuitivo.

---

## 💻 Arquitectura y Tecnologías Utilizadas

### Backend e Inteligencia Artificial
* **Python 3.10+**: Lenguaje de programación base del ecosistema.
* **SPADE (Smart Python Agent Development Environment)**: Framework para el desarrollo de los agentes inteligentes basados en el estándar de comunicación **FIPA-ACL** sobre redes **XMPP**.
* **FastAPI**: Framework web asíncrono de alto rendimiento para la exposición de servicios RESTful y orquestación del ciclo de vida del sistema (*Lifespan*).
* **SQLAlchemy (ORM)**: Abstracción de datos con soporte para herencia polimórfica, transacciones anidadas y encriptación transparente a nivel de columna (Fernet).
* **PostgreSQL 15**: Motor de base de datos relacional con control avanzado de concurrencia mediante la directiva pesimista `SKIP LOCKED`.

### Frontend
* **React (TypeScript)**: Biblioteca para la construcción de la interfaz de usuario basada en una Single Page Application (SPA).
* **Tailwind CSS**: Framework de estilos de utilidad para la consistencia visual y diseño responsivo (*Mobile-First*).
* **Axios**: Cliente HTTP integrado con interceptores globales para inyección asíncrona de tokens JWT.
* **WCAG 2.1 Nivel A Compliance**: Interfaz accesible con navegación por teclado completa, control de foco (*Focus Trapping*) y soporte para lectores de pantalla, logrando una puntuación del **94.07%** en auditorías automatizadas de Google Lighthouse.

### Infraestructura y Servicios Externos
* **Docker & Docker Compose**: Contenedorización de servicios e infraestructura base compartiendo la misma red virtual.
* **Openfire**: Servidor de mensajería XMPP encargado de gestionar el bus de comunicaciones internas de los agentes.
* **Resend API**: Proveedor externo de correo electrónico transaccional para notificaciones asíncronas con patrón *Fire-and-Forget*.

---

## 🛠️ Requisitos Previos

Antes de comenzar, asegúrate de tener instalado en tu máquina de desarrollo:
* [Docker y Docker Compose](https://docs.docker.com/get-docker/)
* [Python 3.10 o superior](https://www.python.org/downloads/)
* [Node.js (versión 18 o superior)](https://nodejs.org/) y npm
* **NOTA**: En caso de emplear Windows o macOS, será necesario descargar Docker Desktop
---

## ⚙️ Instrucciones de Instalación y Despliegue desde 0

Sigue estos pasos ordenadamente para levantar el entorno completo de Kairós de forma local.

### Paso 1: Clonar el Repositorio

Donde desee clonar el repositorio, ejecute los siguientes comandos:
```bash
git clone https://github.com/javiarellanoo/kairos.git
cd kairos
```

### Paso 2: Levantar la Infraestructura Base (Docker)
Este comando iniciará el motor de base de datos de PostgreSQL, la interfaz de administración PgAdmin y el servidor XMPP Openfire de forma aislada.

```bash
docker-compose up -d --build
```
**NOTA**: Asegúrate de que los puertos 5432 (PostgreSQL) y 5222 / 9090 (Openfire) estén libres en tu máquina local.

### Paso 3: Configurar el servidor XMPP
Para que los agentes inteligentes (SPADE) puedan comunicarse y registrarse automáticamente, es indispensable configurar Openfire tras levantar los contenedores. Esto sólo será necesario realizarlo la primera vez que vayamos a usar el sistema, si no borramos los contenedores:

1- Abre tu navegador y accede a la consola de administración: http://localhost:9090.

2- Sigue el asistente de configuración inicial:

3- Idioma: Selecciona tu preferencia.

4- Selecciona AES como estándar de cifrado

5- Base de datos: Selecciona la base de datos interna incrustada (Embedded Database) para simplificar el proceso.

6- Configuración de Perfil / Administrador: Crea una contraseña para el usuario admin.

7- Habilitar el Auto-Registro (Crucial):

- Inicia sesión en el panel con el usuario admin y la contraseña que acabas de crear.

- Navega a "Configuración del Servidor" -> "Registro y Conexiones"

- Asegúrate de que las tres opciones que aparecen estén habilitadas. Esto es obligatorio para que el Backend pueda registrar a los pacientes y doctores dinámicamente.

### Paso 4: Configuración del Backend

1- En la raíz del proyecto, crea un entorno virtual
```bash
cd backend
python -m venv venv
```

2- Activa el entorno virtual:
- En Linux/macOS:
  ```bash
  source venv/bin/activate
  ```
- En Windows:
  ```
  .\\venv\\Scripts\\Activate.ps1
  ```
3- Instala todas las dependencias requeridas

```bash
pip install -r requirements.txt
```
4- Copia las variables de entorno a tu archivo .env y cambia los parámetros ```SECRET_KEY``` y ```RESEND_API_KEY```por tus propios valores.

**NOTA:** Puedes emplear cualquier valor para ```SECRET_KEY```, sin embargo, se aconseja generar una clave robusta, por ejemplo, mediante el comando
```
python -c "import secrets; print(secrets.token_hex(32))"
```

**NOTA:** Puedes obtener tu API KEY de Resend de forma gratuita en el siguiente enlace: https://resend.com/api-keys En caso de no poseer un dominio al que asociarla, podrás enviar correos únicamente al correo con el que te diste de alta en la plataforma, por lo que se recomienda usar esa dirección en caso de querer probar las funciones de mensajería en la aplicación.

5- Para poblar la base de datos, copia las siguientes instrucciones en tu terminal desde la raíz del repositorio.
```bash
cd backend
python seed_db.py
```

### Paso 5: Configuración del Frontend
Abre una nueva pestaña de la consola, navega a la carpeta del cliente e instala los módulos de Node:

```bash
cd frontend
npm install
```
---
## 🚀 Cómo ejecutar el proyecto
### Lanzar el Backend:
Con el entorno virtual activado dentro de la carpeta ```backend```, arranca el servidor asíncrono con Uvicorn:
```bash
uvicorn main:app --reload
```
### Lanzar el Frontend:
Dentro de la carpeta ```frontend```, arranca el servidor web:
```bash
npm run dev
```
---
## 📁 Estructura del Proyecto

```plaintext
kairos/
├── backend/                  # Código fuente del servidor REST y Agentes
│   ├── agents/               # Definición y comportamientos de los Agentes SPADE
│   ├── tests/                # Batería de pruebas de integración
│   ├── data/                 # Archivos CSV sintéticos y scripts de generación de datos
│   ├── main.py               # Punto de entrada de FastAPI y orquestación del ciclo de vida
│   ├── models.py             # Modelos de datos de SQLAlchemy
│   ├── database.py           # Configuración de sesiones transaccionales con PostgreSQL
├── frontend/                 # Portal web de usuario (Single Page Application)
│   ├── src/
│   │   ├── api/              # Cliente HTTP Axios configurado con interceptores globales de JWT
│   │   ├── components/       # Componentes visuales reutilizables y envolturas de seguridad
│   │   ├── context/          # Gestión del estado global de autenticación (AuthContext)
│   │   ├── pages/            # Vistas principales organizadas según el rol del usuario
│   │   └── main.tsx          # Punto de entrada de React Router y renderizado de la aplicación
├── docker-compose.yaml       # Orquestación de contenedores
├── README.md                 # Este archivo informativo
├── requirements.txt          # Dependencias del sistema
└── .env.example              # Plantilla para el archivo .env
```








