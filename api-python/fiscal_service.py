"""
Módulo Fiscal CFDI 4.0 - SPI ERP
Servicio para generación de XML CFDI 4.0, timbrado simulado y consulta.
Usa los nuevos catálogos SAT (regimenes_fiscales, usos_cfdi, metodos_pago_sat,
objetos_impuesto, unidades_medida, formas_pago).
"""
import xml.etree.ElementTree as ET
from datetime import datetime
from decimal import Decimal
from typing import Optional
import uuid
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


def _crear_nodo(parent, tag, text=None, attrib=None):
    """Crea un sub-elemento XML con texto y atributos opcionales."""
    if attrib is None:
        attrib = {}
    elem = ET.SubElement(parent, tag, attrib=attrib)
    if text is not None:
        elem.text = str(text)
    return elem


async def generar_pre_xml(venta_id: int) -> dict:
    """
    Genera la estructura JSON pre-XML CFDI 4.0 para una venta.
    Consulta los nuevos catálogos SAT para mapeo correcto de claves.
    """
    conn = None
    try:
        conn = await get_db()

        # ============================================================
        # 1. Obtener datos del documento de venta con sus detalles
        # ============================================================
        documento = await conn.fetchrow(
            """
            SELECT dv.*,
                   fp.clave_sat as forma_pago_clave,
                   fp.nombre as forma_pago_nombre,
                   mps.clave_sat as metodo_pago_sat_clave,
                   tp.dias_credito,
                   ec.razon_social as cliente_razon_social,
                   ec.rfc as cliente_rfc,
                   ec.cp as cliente_cp,
                   ec.regimen_fiscal as cliente_regimen_fiscal,
                   ec.regimen_fiscal_id,
                   ec.uso_cfdi_default_id,
                   rf.clave_sat as regimen_fiscal_clave,
                   uc.clave_sat as uso_cfdi_clave,
                   COALESCE(
                     (SELECT json_agg(json_build_object(
                       'id', dvd.id,
                       'articulo_id', dvd.articulo_id,
                       'articulo_nombre', a.nombre,
                       'articulo_sku', a.sku,
                       'articulo_clave_sat', a.clave_sat,
                       'cantidad', dvd.cantidad,
                       'precio_unitario', dvd.precio_unitario,
                       'subtotal', dvd.subtotal,
                       'impuesto_id', a.impuesto_id,
                       'unidad_medida_id', a.unidad_medida_id,
                       'um_clave_sat', um.clave_sat,
                       'um_nombre', um.nombre
                     ))
                     FROM documentos_venta_detalle dvd
                     LEFT JOIN articulos a ON a.id = dvd.articulo_id
                     LEFT JOIN unidades_medida um ON um.id = a.unidad_medida_id
                     WHERE dvd.documento_venta_id = dv.id),
                     '[]'::json
                   ) AS detalles
            FROM documentos_venta dv
            LEFT JOIN formas_pago fp ON fp.id = dv.forma_pago_id
            LEFT JOIN metodos_pago_sat mps ON mps.clave_sat = 
                CASE WHEN dv.metodo_pago IN ('efectivo','tarjeta_debito','tarjeta_credito') THEN 'PUE' ELSE 'PPD' END
            LEFT JOIN terminos_pago tp ON tp.id = dv.terminos_pago_id
            LEFT JOIN entidades ec ON ec.id = dv.entidad_cliente_id
            LEFT JOIN regimenes_fiscales rf ON rf.id = ec.regimen_fiscal_id
            LEFT JOIN usos_cfdi uc ON uc.id = ec.uso_cfdi_default_id
            WHERE dv.id = $1
            """,
            venta_id,
        )

        if not documento:
            raise ValueError(f"Documento de venta con ID {venta_id} no encontrada")

        if documento["estado"] == "cancelado":
            raise ValueError(f"Documento de venta {venta_id} está cancelado")

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
        # 3. Obtener detalles con impuestos y unidades
        # ============================================================
        detalles = await conn.fetch(
            """
            SELECT dvd.*,
                   a.nombre as articulo_nombre,
                   a.sku,
                   a.clave_sat,
                   a.impuesto_id,
                   i.nombre as impuesto_nombre,
                   i.tasa as impuesto_tasa,
                   i.tipo as impuesto_tipo,
                   um.clave_sat as um_clave_sat,
                   um.nombre as um_nombre
            FROM documentos_venta_detalle dvd
            JOIN articulos a ON a.id = dvd.articulo_id
            LEFT JOIN impuestos i ON i.id = a.impuesto_id
            LEFT JOIN unidades_medida um ON um.id = a.unidad_medida_id
            WHERE dvd.documento_venta_id = $1
            """,
            venta_id,
        )

        # ============================================================
        # 4. Calcular totales con impuestos desglosados
        # ============================================================
        subtotal = sum(float(d["subtotal"]) for d in detalles)

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
        # 5. Construir estructura CFDI 4.0
        # ============================================================

        metodo_pago_sat = {
            "efectivo": "PUE",
            "tarjeta_debito": "PUE",
            "tarjeta_credito": "PPD",
            "transferencia": "PPD",
        }
        metodo_pago = metodo_pago_sat.get(documento["metodo_pago"], "PUE")
        forma_pago = documento["forma_pago_clave"] or "01"

        # Usar régimen fiscal del cliente si está mapeado al SAT
        cliente_regimen = documento["regimen_fiscal_clave"] or documento["cliente_regimen_fiscal"] or "616"
        # Usar uso CFDI del cliente
        uso_cfdi = documento["uso_cfdi_clave"] or "G01"

        # Construir emisor
        emisor = {
            "Rfc": empresa_rfc,
            "Nombre": empresa_nombre.upper(),
            "RegimenFiscal": empresa_regimen_fiscal,
            "DomicilioFiscal": empresa_cp,
            "LugarExpedicion": lugar_expedicion,
        }

        # Construir receptor
        receptor = {
            "Rfc": documento["cliente_rfc"] or "XAXX010101000",
            "Nombre": (documento["cliente_razon_social"] or "PUBLICO EN GENERAL").upper(),
            "DomicilioFiscal": documento["cliente_cp"] or "00000",
            "RegimenFiscalReceptor": cliente_regimen,
            "UsoCFDI": uso_cfdi,
        }

        # Construir conceptos
        conceptos = []
        for detalle in detalles:
            tasa_imp = float(detalle["impuesto_tasa"]) if detalle["impuesto_tasa"] else iva_porcentaje
            importe_imp = float(detalle["subtotal"]) * (tasa_imp / 100)

            # Clave de unidad SAT desde el artículo
            clave_unidad = detalle["um_clave_sat"] or "H87"
            nombre_unidad = detalle["um_nombre"] or "Pieza"

            concepto = {
                "ClaveProdServ": detalle["clave_sat"] or "43211509",
                "NoIdentificacion": detalle["sku"],
                "Cantidad": float(detalle["cantidad"]),
                "ClaveUnidad": clave_unidad,
                "Unidad": nombre_unidad,
                "Descripcion": detalle["articulo_nombre"],
                "ValorUnitario": float(detalle["precio_unitario"]),
                "Importe": round(float(detalle["subtotal"]), 2),
                "ObjetoImp": "02",
                "Impuestos": {
                    "Traslados": [
                        {
                            "Base": round(float(detalle["subtotal"]), 2),
                            "Impuesto": "002",
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
            traslados.append({
                "Base": round(imp["base"], 2),
                "Impuesto": codigo_impuesto,
                "TipoFactor": "Tasa",
                "TasaOCuota": f"{imp['tasa'] / 100:.6f}",
                "Importe": round(imp["importe"], 2),
            })

        impuestos = {
            "TotalImpuestosTrasladados": round(total_impuestos, 2),
            "Traslados": traslados,
        }

        # Armar estructura completa
        cfdi = {
            "Comprobante": {
                "Version": "4.0",
                "Serie": serie_default,
                "Folio": documento["folio"],
                "Fecha": documento["fecha"].isoformat(),
                "FormaPago": forma_pago,
                "MetodoPago": metodo_pago,
                "Moneda": "MXN",
                "TipoCambio": "1",
                "TipoDeComprobante": "I",
                "Exportacion": "01",
                "LugarExpedicion": lugar_expedicion,
                "SubTotal": round(subtotal, 2),
                "Total": round(total, 2),
                "Emisor": emisor,
                "Receptor": receptor,
                "Conceptos": conceptos,
                "Impuestos": impuestos,
            }
        }

        return {
            "documento_venta_id": venta_id,
            "folio": documento["folio"],
            "fecha": documento["fecha"].isoformat(),
            "subtotal": round(subtotal, 2),
            "total_impuestos": round(total_impuestos, 2),
            "total": round(total, 2),
            "moneda": "MXN",
            "metodo_pago": metodo_pago,
            "forma_pago": forma_pago,
            "cliente": {
                "id": documento["entidad_cliente_id"],
                "rfc": documento["cliente_rfc"],
                "razon_social": documento["cliente_razon_social"],
                "regimen_fiscal": cliente_regimen,
                "uso_cfdi": uso_cfdi,
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


async def generar_xml_cfdi(documento_venta_id: int) -> dict:
    """
    Genera el XML CFDI 4.0 real, lo inserta en comprobantes_fiscales
    y retorna UUID (simulado por ahora).

    En producción aquí se llamaría al PAC para timbrar.
    """
    conn = None
    try:
        conn = await get_db()

        # 1. Obtener datos completos para CFDI
        pre_xml = await generar_pre_xml(documento_venta_id)
        cfdi_data = pre_xml["estructura_cfdi"]["Comprobante"]

        # 2. Generar UUID simulado
        uuid_generado = str(uuid.uuid4())

        # 3. Construir XML string (versión simplificada)
        cfdi_attr = {
            "Version": cfdi_data["Version"],
            "Serie": cfdi_data["Serie"],
            "Folio": cfdi_data["Folio"],
            "Fecha": cfdi_data["Fecha"],
            "FormaPago": cfdi_data["FormaPago"],
            "MetodoPago": cfdi_data["MetodoPago"],
            "Moneda": cfdi_data["Moneda"],
            "TipoCambio": cfdi_data["TipoCambio"],
            "TipoDeComprobante": cfdi_data["TipoDeComprobante"],
            "Exportacion": cfdi_data["Exportacion"],
            "LugarExpedicion": cfdi_data["LugarExpedicion"],
            "SubTotal": str(cfdi_data["SubTotal"]),
            "Total": str(cfdi_data["Total"]),
            "xmlns": "http://www.sat.gob.mx/cfd/4",
            "xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
        }

        # Namespaces for SAT
        ET.register_namespace('', 'http://www.sat.gob.mx/cfd/4')
        ET.register_namespace('xsi', 'http://www.w3.org/2001/XMLSchema-instance')

        root = ET.Element(f"{{http://www.sat.gob.mx/cfd/4}}Comprobante", attrib=cfdi_attr)

        # Emisor
        emisor = ET.SubElement(root, "Emisor")
        for k, v in cfdi_data["Emisor"].items():
            emisor.set(k, str(v))

        # Receptor
        receptor = ET.SubElement(root, "Receptor")
        for k, v in cfdi_data["Receptor"].items():
            receptor.set(k, str(v))

        # Conceptos
        conceptos_node = ET.SubElement(root, "Conceptos")
        for concepto in cfdi_data["Conceptos"]:
            conc_attr = {k: str(v) for k, v in concepto.items() if k != "Impuestos"}
            conc_elem = ET.SubElement(conceptos_node, "Concepto", attrib=conc_attr)

            if "Impuestos" in concepto and concepto["Impuestos"]:
                imp_node = ET.SubElement(conc_elem, "Impuestos")
                for traslado in concepto["Impuestos"].get("Traslados", []):
                    trasl_attr = {k: str(v) for k, v in traslado.items()}
                    ET.SubElement(imp_node, "Traslado", attrib=trasl_attr)

        # Impuestos globales
        impuestos_node = ET.SubElement(root, "Impuestos")
        impuestos_global = cfdi_data["Impuestos"]
        for k, v in impuestos_global.items():
            if k == "Traslados":
                traslados_node = ET.SubElement(impuestos_node, "Traslados")
                for t in v:
                    t_attr = {k2: str(v2) for k2, v2 in t.items()}
                    ET.SubElement(traslados_node, "Traslado", attrib=t_attr)
            elif k == "TotalImpuestosTrasladados":
                impuestos_node.set(k, str(v))

        xml_string = ET.tostring(root, encoding="unicode", xml_declaration=True)

        # 4. Insertar en comprobantes_fiscales
        fecha_ahora = datetime.utcnow()
        await conn.execute(
            """
            INSERT INTO comprobantes_fiscales
                (documento_venta_id, uuid, xml, fecha_timbrado, estatus)
            VALUES ($1, $2, $3, $4, 'timbrado')
            """,
            documento_venta_id,
            uuid_generado,
            xml_string,
            fecha_ahora,
        )

        # 5. Actualizar estado del documento a 'facturado'
        await conn.execute(
            """
            UPDATE documentos_venta
            SET estado = 'facturado', updated_at = NOW()
            WHERE id = $1 AND estado != 'cancelado'
            """,
            documento_venta_id,
        )

        return {
            "documento_venta_id": documento_venta_id,
            "uuid": uuid_generado,
            "xml": xml_string,
            "fecha_timbrado": fecha_ahora.isoformat(),
            "estatus": "timbrado",
            "folio": cfdi_data["Folio"],
            "total": cfdi_data["Total"],
            "mensaje": "CFDI 4.0 timbrado exitosamente (UUID simulado)",
            "timestamp": datetime.utcnow().isoformat(),
        }

    except ValueError:
        raise
    except Exception as e:
        raise RuntimeError(f"Error al generar/timbrar CFDI: {str(e)}")
    finally:
        if conn:
            await conn.close()


async def obtener_comprobante(comprobante_id: int) -> dict:
    """Obtiene un comprobante fiscal por ID."""
    conn = None
    try:
        conn = await get_db()

        comprobante = await conn.fetchrow(
            """
            SELECT cf.*, dv.folio, dv.total, ec.razon_social as cliente_nombre, ec.rfc as cliente_rfc
            FROM comprobantes_fiscales cf
            JOIN documentos_venta dv ON dv.id = cf.documento_venta_id
            LEFT JOIN entidades ec ON ec.id = dv.entidad_cliente_id
            WHERE cf.id = $1
            """,
            comprobante_id,
        )

        if not comprobante:
            raise ValueError(f"Comprobante fiscal con ID {comprobante_id} no encontrado")

        return {
            "id": comprobante["id"],
            "documento_venta_id": comprobante["documento_venta_id"],
            "folio": comprobante["folio"],
            "uuid": comprobante["uuid"],
            "xml": comprobante["xml"],
            "fecha_timbrado": comprobante["fecha_timbrado"].isoformat() if comprobante["fecha_timbrado"] else None,
            "estatus": comprobante["estatus"],
            "cliente_nombre": comprobante["cliente_nombre"],
            "cliente_rfc": comprobante["cliente_rfc"],
            "total": float(comprobante["total"]),
            "created_at": comprobante["created_at"].isoformat(),
        }

    except ValueError:
        raise
    except Exception as e:
        raise RuntimeError(f"Error al obtener comprobante: {str(e)}")
    finally:
        if conn:
            await conn.close()
