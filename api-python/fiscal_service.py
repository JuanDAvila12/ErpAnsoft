"""
Módulo Fiscal CFDI 4.0 - SPI ERP
Servicio para generación de pre-XML (estructura JSON) para facturación electrónica SAT.
"""
from datetime import datetime
from decimal import Decimal
from typing import Optional
import asyncpg
import os

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


async def generar_pre_xml(venta_id: int) -> dict:
    """
    Genera la estructura JSON pre-XML CFDI 4.0 para una venta.

    Consulta:
    - Venta y sus detalles
    - Datos del cliente (entidad)
    - Datos de la empresa (configuracion_sistema)
    - Catálogos de impuestos, formas de pago, monedas

    Retorna un objeto JSON estructurado listo para ser convertido a XML del SAT.
    """
    conn = None
    try:
        conn = await get_db()

        # ============================================================
        # 1. Obtener datos de la venta con sus detalles
        # ============================================================
        venta = await conn.fetchrow(
            """
            SELECT v.*,
                   fp.clave_sat as forma_pago_clave,
                   fp.nombre as forma_pago_nombre,
                   COALESCE(
                     (SELECT json_agg(json_build_object(
                       'id', vd.id,
                       'articulo_id', vd.articulo_id,
                       'articulo_nombre', a.nombre,
                       'articulo_sku', a.sku,
                       'articulo_clave_sat', a.clave_sat,
                       'cantidad', vd.cantidad,
                       'precio_unitario', vd.precio_unitario,
                       'subtotal', vd.subtotal,
                       'impuesto_id', a.impuesto_id
                     ))
                     FROM ventas_detalle vd
                     LEFT JOIN articulos a ON a.id = vd.articulo_id
                     WHERE vd.venta_id = v.id),
                     '[]'::json
                   ) AS detalles
            FROM ventas v
            LEFT JOIN formas_pago fp ON fp.id = v.forma_pago_id
            WHERE v.id = $1
            """,
            venta_id,
        )

        if not venta:
            raise ValueError(f"Venta con ID {venta_id} no encontrada")

        # ============================================================
        # 2. Obtener configuración de la empresa
        # ============================================================
        config_rows = await conn.fetch(
            "SELECT clave, valor FROM configuracion_sistema WHERE activo = TRUE"
        )
        config = {row["clave"]: row["valor"] for row in config_rows}

        empresa_nombre = config.get("empresa_nombre", "Mi Empresa S.A. de C.V.")
        empresa_rfc = config.get("empresa_rfc", "XAXX010101000")
        empresa_regimen_fiscal = config.get("empresa_regimen_fiscal", "601")
        empresa_cp = config.get("empresa_cp", "00000")
        empresa_direccion = config.get("empresa_direccion", "Dirección Fiscal")
        lugar_expedicion = config.get("lugar_expedicion", empresa_cp)
        iva_porcentaje = float(config.get("iva_porcentaje", "16"))
        serie_default = config.get("serie_factura_default", "F")

        # ============================================================
        # 3. Obtener datos del cliente (entidad)
        # ============================================================
        cliente = None
        if venta["entidad_cliente_id"]:
            cliente = await conn.fetchrow(
                """
                SELECT e.*, p.codigo as pais_codigo
                FROM entidades e
                LEFT JOIN paises p ON p.id = e.pais_id
                WHERE e.id = $1
                """,
                venta["entidad_cliente_id"],
            )

        # ============================================================
        # 4. Obtener detalles de la venta con impuestos
        # ============================================================
        detalles = await conn.fetch(
            """
            SELECT vd.*,
                   a.nombre as articulo_nombre,
                   a.sku,
                   a.clave_sat,
                   a.impuesto_id,
                   i.nombre as impuesto_nombre,
                   i.tasa as impuesto_tasa,
                   i.tipo as impuesto_tipo
            FROM ventas_detalle vd
            JOIN articulos a ON a.id = vd.articulo_id
            LEFT JOIN impuestos i ON i.id = a.impuesto_id
            WHERE vd.venta_id = $1
            """,
            venta_id,
        )

        # ============================================================
        # 5. Calcular totales con impuestos desglosados
        # ============================================================
        subtotal = sum(float(d["subtotal"]) for d in detalles)

        # Agrupar impuestos por tipo/tasa
        impuestos_agrupados = {}
        for d in detalles:
            tasa = float(d["impuesto_tasa"]) if d["impuesto_tasa"] else iva_porcentaje
            tipo_imp = d["impuesto_tipo"] or "IVA"
            base = float(d["subtotal"])
            importe = base * (tasa / 100)

            key = f"{tipo_imp}_{tasa}"
            if key not in impuestos_agrupados:
                impuestos_agrupados[key] = {
                    "impuesto": tipo_imp,
                    "tasa": tasa,
                    "base": 0,
                    "importe": 0,
                }
            impuestos_agrupados[key]["base"] += base
            impuestos_agrupados[key]["importe"] += importe

        total_impuestos = sum(v["importe"] for v in impuestos_agrupados.values())
        total = subtotal + total_impuestos

        # ============================================================
        # 6. Construir estructura CFDI 4.0
        # ============================================================

        # Mapeo de método de pago a clave SAT
        metodo_pago_sat = {
            "efectivo": "PUE",
            "tarjeta_debito": "PUE",
            "tarjeta_credito": "PPD",
            "transferencia": "PPD",
        }
        metodo_pago = metodo_pago_sat.get(venta["metodo_pago"], "PUE")

        # Forma de pago (clave SAT)
        forma_pago = venta["forma_pago_clave"] or "01"

        # Construir emisor
        emisor = {
            "Rfc": empresa_rfc,
            "Nombre": empresa_nombre.upper(),
            "RegimenFiscal": empresa_regimen_fiscal,
        }

        # Construir receptor
        if cliente:
            receptor = {
                "Rfc": cliente["rfc"],
                "Nombre": (cliente["razon_social"] or cliente["nombre_comercial"] or "PUBLICO EN GENERAL").upper(),
                "DomicilioFiscal": cliente["cp"] or "00000",
                "RegimenFiscalReceptor": cliente["regimen_fiscal"] or "616",
                "UsoCFDI": "G01",  # Por defecto, se podría mapear según el cliente
            }
        else:
            receptor = {
                "Rfc": "XAXX010101000",
                "Nombre": "PUBLICO EN GENERAL",
                "DomicilioFiscal": "00000",
                "RegimenFiscalReceptor": "616",
                "UsoCFDI": "G01",
            }

        # Construir conceptos
        conceptos = []
        for detalle in detalles:
            tasa_imp = float(detalle["impuesto_tasa"]) if detalle["impuesto_tasa"] else iva_porcentaje
            importe_imp = float(detalle["subtotal"]) * (tasa_imp / 100)

            concepto = {
                "ClaveProdServ": detalle["clave_sat"] or "43211509",
                "NoIdentificacion": detalle["sku"],
                "Cantidad": float(detalle["cantidad"]),
                "ClaveUnidad": "H87",  # Pieza - se podría obtener de unidades_medida
                "Unidad": "Pieza",
                "Descripcion": detalle["articulo_nombre"],
                "ValorUnitario": float(detalle["precio_unitario"]),
                "Importe": round(float(detalle["subtotal"]), 2),
                "ObjetoImp": "02",  # Sí objeto de impuesto
                "Impuestos": {
                    "Traslados": [
                        {
                            "Base": round(float(detalle["subtotal"]), 2),
                            "Impuesto": "002",  # IVA
                            "TipoFactor": "Tasa",
                            "TasaOCuota": f"{tasa_imp / 100:.6f}",
                            "Importe": round(importe_imp, 2),
                        }
                    ]
                },
            }
            conceptos.append(concepto)

        # Construir impuestos
        traslados = []
        for key, imp in impuestos_agrupados.items():
            codigo_impuesto = {"IVA": "002", "IEPS": "003", "ISR": "001"}.get(
                imp["impuesto"], "002"
            )
            traslados.append(
                {
                    "Base": round(imp["base"], 2),
                    "Impuesto": codigo_impuesto,
                    "TipoFactor": "Tasa",
                    "TasaOCuota": f"{imp['tasa'] / 100:.6f}",
                    "Importe": round(imp["importe"], 2),
                }
            )

        impuestos = {
            "TotalImpuestosTrasladados": round(total_impuestos, 2),
            "Traslados": traslados,
        }

        # ============================================================
        # 7. Armar estructura completa
        # ============================================================
        cfdi = {
            "Comprobante": {
                "Version": "4.0",
                "Serie": serie_default,
                "Folio": venta["folio"],
                "Fecha": venta["fecha"].isoformat(),
                "FormaPago": forma_pago,
                "MetodoPago": metodo_pago,
                "Moneda": "MXN",
                "TipoCambio": "1",
                "TipoDeComprobante": "I",  # Ingreso
                "Exportacion": "01",  # No aplica
                "LugarExpedicion": lugar_expedicion,
                "SubTotal": round(subtotal, 2),
                "Total": round(total, 2),
                "Emisor": emisor,
                "Receptor": receptor,
                "Conceptos": conceptos,
                "Impuestos": impuestos,
            }
        }

        # ============================================================
        # 8. Armar respuesta completa
        # ============================================================
        return {
            "venta_id": venta_id,
            "folio": venta["folio"],
            "fecha": venta["fecha"].isoformat(),
            "subtotal": round(subtotal, 2),
            "total_impuestos": round(total_impuestos, 2),
            "total": round(total, 2),
            "moneda": "MXN",
            "metodo_pago": metodo_pago,
            "forma_pago": forma_pago,
            "cliente": {
                "id": cliente["id"] if cliente else None,
                "rfc": cliente["rfc"] if cliente else "XAXX010101000",
                "razon_social": cliente["razon_social"] if cliente else "PUBLICO EN GENERAL",
            },
            "empresa": {
                "rfc": empresa_rfc,
                "nombre": empresa_nombre,
                "regimen_fiscal": empresa_regimen_fiscal,
            },
            "cfdi_version": "4.0",
            "estructura_cfdi": cfdi,
            "conceptos_count": len(conceptos),
            "impuestos_desglosados": [
                {
                    "tipo": v["impuesto"],
                    "tasa": v["tasa"],
                    "base": round(v["base"], 2),
                    "importe": round(v["importe"], 2),
                }
                for v in impuestos_agrupados.values()
            ],
            "mensaje": "Pre-XML CFDI 4.0 generado exitosamente (pendiente de timbrar)",
            "timestamp": datetime.utcnow().isoformat(),
        }

    except ValueError:
        raise
    except Exception as e:
        raise RuntimeError(f"Error al generar pre-XML CFDI: {str(e)}")
    finally:
        if conn:
            await conn.close()
