# Task Progress - ERP Redesign

- [x] Analyze existing codebase structure
- [ ] **Step 1: Database Schema** - Update init.sql with new tables (entidades, entidad_roles, almacenes, bancos, cuentas_bancarias, cuentas_contables, paises, monedas, impuestos, formas_pago, listas_precios, unidades_transporte) + modify usuarios table
- [ ] **Step 2: Backend Node.js** - Create generic CRUD controller + update usuarios model/routes for entidad_roles
- [ ] **Step 3: Backend Python** - Create fiscal_service.py with POST /api/v1/fiscal/generar-pre-xml/{venta_id}
- [ ] **Step 4: Frontend Vue/Vuetify** - Create "Configuración Maestra" view for catalogs
- [ ] **Step 5: Docker & Integration** - Update docker-compose if needed, ensure everything connects
