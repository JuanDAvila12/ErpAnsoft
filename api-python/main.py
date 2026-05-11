from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from decimal import Decimal
from typing import Optional
import asyncpg
import os

from fiscal_service import generar_pre_xml, generar_xml_cfdi, obtener_comprobante

app = FastAPI(
    title="SPI ERP - API Python",
    description="API de procesamiento del sistema ERP",
    version="2.0.0",
)

# Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuración de base de datos
DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", "5432")),
    "database": os.getenv("DB_NAME", "spi_erp"),
    "user": os.getenv("DB_USER", "spi_user"),
    "password": os.getenv("DB_PASSWORD", "spi_password"),
}


async def get_db():
    """Obtiene una conexión a la base de datos."""
    return await asyncpg.connect(**DB_CONFIG)


@app.get("/api/v1/health")
async def health_check():
    return {
        "status": "ok",
        "servicio": "api-python",
        "version": "2.0.0",
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.get("/")
async def root():
    return {
        "mensaje": "SPI ERP - API Python (FastAPI)",
        "documentacion": "/docs",
    }


# ============================================================
# Módulo Fiscal CFDI 4.0
# ============================================================


@app.post("/api/v1/fiscal/generar-pre-xml/{venta_id}")
async def generar_pre_xml_endpoint(venta_id: int):
    """
    Genera la estructura JSON pre-XML CFDI 4.0 para una venta.

    Consulta la venta, sus detalles, el cliente (entidad) y la configuración
    de la empresa para retornar un objeto JSON estructurado listo para ser
    convertido al XML del SAT (CFDI 4.0), incluyendo objetos para:
    - Emisor
    - Receptor
    - Conceptos
    - Impuestos (desglosados por tipo/tasa)
    """
    try:
        resultado = await generar_pre_xml(venta_id)
        return resultado
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al generar pre-XML CFDI: {str(e)}",
        )


# ============================================================
# Endpoint: Timbrar CFDI 4.0 (POST)
# ============================================================


@app.post("/api/v1/fiscal/timbrar/{documento_venta_id}")
async def timbrar_cfdi(documento_venta_id: int):
    """
    Genera XML CFDI 4.0 completo, timbra (simulado) y retorna UUID.
    Construye todos los nodos del SAT: Comprobante, Emisor, Receptor,
    Conceptos, Impuestos usando los catálogos SAT.
    """
    try:
        resultado = await generar_xml_cfdi(documento_venta_id)
        return resultado
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al timbrar CFDI: {str(e)}",
        )


# ============================================================
# Endpoint: Consultar comprobante fiscal por ID (GET)
# ============================================================


@app.get("/api/v1/comprobantes/{comprobante_id}")
async def consultar_comprobante(comprobante_id: int):
    """
    Obtiene un comprobante fiscal por ID, incluyendo UUID, XML y datos del cliente.
    """
    try:
        resultado = await obtener_comprobante(comprobante_id)
        return resultado
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al consultar comprobante: {str(e)}",
        )


# ============================================================
# Endpoint CFDI existente (mantenido por compatibilidad)
# ============================================================


@app.get("/api/v1/cfdi/generar/{venta_id}")
async def generar_cfdi(venta_id: int):
    """
    Genera la estructura JSON básica para un CFDI 4.0 (Factura Mexicana)
    a partir de una venta registrada en el sistema.
    Aún no timbra, solo genera la estructura.
    """
    conn = None
    try:
        conn = await get_db()

        # Obtener datos de la venta
        venta = await conn.fetchrow(
            """
            SELECT v.*, 
                   COALESCE(
                     (SELECT json_agg(json_build_object(
                       'id', vd.id,
                       'articulo_id', vd.articulo_id,
                       'articulo_nombre', a.nombre,
                       'articulo_sku', a.sku,
                       'cantidad', vd.cantidad,
                       'precio_unitario', vd.precio_unitario,
                       'subtotal', vd.subtotal
                     ))
                     FROM ventas_detalle vd
                     LEFT JOIN articulos a ON a.id = vd.articulo_id
                     WHERE vd.venta_id = v.id),
                     '[]'::json
                   ) AS detalles
            FROM ventas v
            WHERE v.id = $1
            """,
            venta_id,
        )

        if not venta:
            raise HTTPException(
                status_code=404,
                detail=f"Venta con ID {venta_id} no encontrada",
            )

        # Obtener configuración de la empresa
        config = await conn.fetch(
            "SELECT clave, valor FROM configuracion_sistema WHERE activo = TRUE"
        )
        config_dict = {row["clave"]: row["valor"] for row in config}

        empresa_nombre = config_dict.get("empresa_nombre", "Mi Empresa S.A. de C.V.")
        empresa_rfc = config_dict.get("empresa_rfc", "XAXX010101000")
        iva_porcentaje = float(config_dict.get("iva_porcentaje", "16"))

        # Obtener detalles de la venta
        detalles = await conn.fetch(
            """
            SELECT vd.*, a.nombre as articulo_nombre, a.sku, a.clave_sat
            FROM ventas_detalle vd
            JOIN articulos a ON a.id = vd.articulo_id
            WHERE vd.venta_id = $1
            """,
            venta_id,
        )

        # Calcular totales
        subtotal = sum(float(d["subtotal"]) for d in detalles)
        iva = subtotal * (iva_porcentaje / 100)
        total = subtotal + iva

        # Construir estructura CFDI 4.0
        cfdi = {
            "Comprobante": {
                "Version": "4.0",
                "Serie": "F",
                "Folio": venta["folio"],
                "Fecha": venta["fecha"].isoformat(),
                "FormaPago": "01",  # Efectivo por defecto
                "MetodoPago": "PUE",  # Pago en una sola exhibición
                "Moneda": "MXN",
                "TipoCambio": "1",
                "TipoDeComprobante": "I",  # Ingreso
                "Exportacion": "01",  # No aplica
                "LugarExpedicion": "00000",
                "SubTotal": round(subtotal, 2),
                "Total": round(total, 2),
                "Emisor": {
                    "Rfc": empresa_rfc,
                    "Nombre": empresa_nombre,
                    "RegimenFiscal": "601",  # General de Ley Personas Morales
                },
                "Receptor": {
                    "Rfc": "XAXX010101000",  # Público en general por defecto
                    "Nombre": "PUBLICO EN GENERAL",
                    "DomicilioFiscal": "00000",
                    "RegimenFiscalReceptor": "616",  # Sin obligaciones fiscales
                    "UsoCFDI": "G01",  # Adquisición de mercancías
                },
                "Conceptos": [],
                "Impuestos": {
                    "TotalImpuestosTrasladados": round(iva, 2),
                    "Traslados": [
                        {
                            "Base": round(subtotal, 2),
                            "Impuesto": "002",  # IVA
                            "TipoFactor": "Tasa",
                            "TasaOCuota": f"{iva_porcentaje / 100:.6f}",
                            "Importe": round(iva, 2),
                        }
                    ],
                },
            }
        }

        # Agregar conceptos
        for detalle in detalles:
            concepto = {
                "ClaveProdServ": detalle["clave_sat"] or "43211509",
                "NoIdentificacion": detalle["sku"],
                "Cantidad": float(detalle["cantidad"]),
                "ClaveUnidad": "H87",  # Pieza
                "Unidad": "Pieza",
                "Descripcion": detalle["articulo_nombre"],
                "ValorUnitario": float(detalle["precio_unitario"]),
                "Importe": float(detalle["subtotal"]),
                "ObjetoImp": "02",  # Sí objeto de impuesto
                "Impuestos": {
                    "Traslados": [
                        {
                            "Base": float(detalle["subtotal"]),
                            "Impuesto": "002",
                            "TipoFactor": "Tasa",
                            "TasaOCuota": f"{iva_porcentaje / 100:.6f}",
                            "Importe": round(
                                float(detalle["subtotal"]) * (iva_porcentaje / 100), 2
                            ),
                        }
                    ]
                },
            }
            cfdi["Comprobante"]["Conceptos"].append(concepto)

        return {
            "venta_id": venta_id,
            "folio": venta["folio"],
            "total": float(venta["total"]),
            "cfdi_version": "4.0",
            "estructura_cfdi": cfdi,
            "mensaje": "Estructura CFDI 4.0 generada exitosamente (pendiente de timbrar)",
            "timestamp": datetime.utcnow().isoformat(),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al generar CFDI: {str(e)}",
        )
    finally:
        if conn:
            await conn.close()
