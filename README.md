# 🧾 SPI ERP - Sistema de Planeación Integral

ERP empresarial robusto y modular inspirado en Odoo y SAP, construido con tecnologías modernas y preparado para el entorno fiscal mexicano (CFDI 4.0).

---

## 🚀 Stack Tecnológico

| Capa | Tecnología | Descripción |
|------|-----------|-------------|
| **Frontend** | Vue 3 + Vuetify 3 + Vite | SPA con diseño responsive, landing page pública y dashboard modular. |
| **Backend principal** | Node.js + Express | API REST transaccional, autenticación JWT, RBAC y lógica de negocio. |
| **Backend fiscal** | Python + FastAPI | Microservicio para generación y timbrado de CFDI 4.0. |
| **Base de datos** | PostgreSQL 15 | Modelo unificado de transacciones, auditoría CDHDR/CDPOS y catálogos SAT. |
| **Infraestructura** | Docker Compose | Cuatro servicios (postgres, api-node, api-python, frontend) orquestados localmente. |

---

## ✨ Módulos principales

- **Ventas:** cotizaciones → órdenes de venta → facturas. Validación de stock y flujo de crédito (CxC).
- **Compras:** cotizaciones de compra → órdenes → recepciones → facturas (CxP). Impacto automático en inventario.
- **Inventarios:** stock en tiempo real, traspasos entre almacenes, trazabilidad por número de serie.
- **Contabilidad:** catálogo de cuentas jerárquico, asientos automáticos por cada transacción, asientos manuales, libro mayor y balanza de comprobación.
- **Cuentas por Cobrar / Pagar:** control de saldos, antigüedad de deuda y registro de cobros/pagos.
- **Facturación electrónica:** XML CFDI 4.0 con catálogos SAT precargados. Timbrado simulado (listo para conectar PAC).
- **CRM:** oportunidades de negocio con pipeline de ventas.
- **Punto de Venta (POS):** interfaz rápida para ventas al mostrador.
- **Configuración:** empresa, almacenes, formatos, secuencias de documentos y generador de reportes SQL.
- **Seguridad:** roles y permisos (RBAC), middleware de autenticación JWT y auditoría completa de cambios.

---

## 📦 Estructura del proyecto
├── api-node/ # Backend Node.js (Express)   
│ ├── src/  
│ │ ├── middleware/ # auth, permisos, errorHandler  
│ │ ├── models/ # transacciones, cxc, cxp, catalogos...  
│ │ ├── routes/ # endpoints REST  
│ │ └── utils/ # auditContext, helpers  
│ └── Dockerfile  
├── api-python/ # Backend Python (FastAPI)  
│ ├── services/ # fiscal_service.py  
│ └── Dockerfile  
├── frontend/ # Vue 3 + Vuetify  
│ ├── src/  
│ │ ├── components/ # ErrorNotification, LoginModal...  
│ │ ├── layouts/ # PublicLayout, DashboardLayout  
│ │ ├── plugins/ # axios, vuetify  
│ │ ├── router/ # Vue Router    
│ │ ├── stores/ # errorStore    
│ │ └── views/ # ventas, compras, inventario, cxc, cxp...  
│ └── Dockerfile  
├── db/ # Scripts SQL  
│ ├── 01_init.sql # Tablas base  
│ ├── migration_v3.sql # Migración a transacciones unificadas  
│ └── demo_data.sql # Datos de demostración  
├── docker-compose.yml  
└── README.md  


---------------------------------------------------------------------------------------------------------

## 🛠️ Instalación y uso

### Requisitos
- [Docker Desktop](https://www.docker.com/products/docker-desktop) (Windows/macOS/Linux)

### Levantar el proyecto


git clone https://github.com/JuanDAvila12/ErpAnsoft.git
cd ErpAnsoft
docker compose up -d

Acceder
Servicio	URL
Frontend	http://localhost:5173
API Node	http://localhost:3000
API Python	http://localhost:8000
Usuario demo: admin@spierp.com / admin123

Comandos útiles

docker compose logs -f api-node   # ver logs de la API  
docker compose restart frontend   # reiniciar frontend tras cambios  
docker compose exec postgres psql -U spi_user -d spi_erp  # acceder a la BD  

📊 Base de datos: modelo unificado  
Todas las operaciones (ventas, compras, cobros, pagos, traspasos) se registran en las tablas transacciones, transacciones_detalle, transacciones_series y transacciones_contables. Esto garantiza trazabilidad total y simplifica los reportes.  

🗺️ Roadmap
El desarrollo de SPI ERP sigue en evolución. Estas son las funcionalidades planeadas para próximas versiones:

✅ Módulo de Ventas con flujo por etapas

✅ Módulo de Compras con flujo por etapas y recepciones

✅ Módulo de Inventarios con stock en tiempo real y traspasos

✅ Contabilidad con asientos automáticos y manuales

✅ Cuentas por Cobrar y Cuentas por Pagar

✅ Sistema de auditoría estilo SAP (CDHDR/CDPOS)

✅ Generación de XML CFDI 4.0 (timbrado simulado)

⬜ Conexión a PAC real para timbrado fiscal

⬜ Portal de clientes con consulta de facturas y estado de cuenta

⬜ Generación de PDFs para facturas, cotizaciones y reportes

⬜ Envío de documentos por correo electrónico

⬜ Módulo de nómina (integrado con contabilidad)

⬜ Dashboard con KPIs y gráficos financieros

⬜ Aplicación móvil complementaria (PWA)

⬜ API pública documentada con Swagger

  
🤝 Contribuciones
¡Las contribuciones son bienvenidas! Para mantener la calidad del proyecto, sigue estos pasos:

Haz un fork del repositorio.

Crea una rama con el nombre de tu funcionalidad: git checkout -b feature/nueva-funcionalidad.

Realiza tus cambios siguiendo las guías de estilo existentes.

Asegúrate de que las pruebas (si las hay) pasen y que el código no rompa la funcionalidad actual.

Documenta tus cambios en LOG_MODIFICACIONES.md si es necesario.

Haz commit con un mensaje descriptivo.

Sube la rama y abre un Pull Request hacia la rama main.

Si encuentras un error o tienes una idea, abre un issue en GitHub. Toda ayuda es valiosa.



🙏 Agradecimientos  

A la comunidad de Vue.js y Vuetify por facilitar la creación de interfaces potentes.  

A PostgreSQL por ser el corazón robusto de este ERP.  

A Docker por hacer posible un entorno de desarrollo reproducible.  

Al equipo de Node.js y FastAPI por las herramientas backend.  

A los desarrolladores de Odoo y SAP, cuya arquitectura inspiró muchas decisiones de diseño.  

Y un agradecimiento especial a la inteligencia artificial que ha colaborado activamente en la arquitectura y generación de código de este proyecto.  


📝 Licencia  
MIT © Juan Luis Delgadillo Ávila

text

---



¿Tienes una sugerencia? ¡Abre un issue!

📝 Licencia  
MIT © Juan Luis Delgadillo Ávila
