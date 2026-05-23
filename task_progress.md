# Task Progress - Configuración Contable Granular

## FASE 1: Base de Datos (SQL)
- [ ] Create entidad_cuentas_contables table
- [ ] Add tipo_concepto field to transacciones table

## FASE 2: Frontend (Vue)
- [ ] Add "Configuración Contable" section in entity detail/edit view
- [ ] Add "Concepto" field in invoice creation dialogs (compra/venta)

## FASE 3: Backend (Node.js)
- [ ] Create PUT /api/v1/entidades/:id/contabilidad endpoint
- [ ] Modify generarAsientosContables to use entity-specific accounts
- [ ] Create GET /api/v1/entidades/:id/contabilidad endpoint

## FASE 4: Prueba y Cierre
- [ ] Restart containers and test
- [ ] Register entry in LOG_MODIFICACIONES.md
