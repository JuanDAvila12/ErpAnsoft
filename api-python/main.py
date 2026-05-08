from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime

app = FastAPI(
    title="SPI ERP - API Python",
    description="API de procesamiento del sistema ERP",
    version="1.0.0",
)

# Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/v1/health")
async def health_check():
    return {
        "status": "ok",
        "servicio": "api-python",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.get("/")
async def root():
    return {
        "mensaje": "SPI ERP - API Python (FastAPI)",
        "documentacion": "/docs",
    }
