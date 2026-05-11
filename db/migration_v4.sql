-- ============================================================
-- MIGRACIÓN v4.0 - Sistema de Permisos RBAC + Portal Clientes
-- SPI ERP
-- ============================================================
-- Este script se ejecuta DESPUÉS de migration_v3.sql
-- ============================================================

-- ============================================================
-- BLOQUE 1: TABLAS DE PERMISOS (RBAC)
-- ============================================================

-- 1.1 Tabla de permisos
CREATE TABLE IF NOT EXISTS permisos (
    id              SERIAL PRIMARY KEY,
    codigo          VARCHAR(100) NOT NULL UNIQUE,
    descripcion     VARCHAR(255),
    modulo          VARCHAR(50) NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1.2 Tabla rol_permisos
CREATE TABLE IF NOT EXISTS rol_permisos (
    rol_id          INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permiso_id      INTEGER NOT NULL REFERENCES permisos(id) ON DELETE CASCADE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (rol_id, permiso_id)
);

-- ============================================================
-- BLOQUE 2: PRECARGA DE PERMISOS
-- ============================================================
INSERT INTO permisos (codigo, descripcion, modulo) VALUES
    -- Ventas
    ('ventas.ver', 'Ver módulo de ventas', 'ventas'),
    ('ventas.crear', 'Crear cotizaciones, órdenes y facturas', 'ventas'),
    ('ventas.editar', 'Editar documentos de venta', 'ventas'),
    ('ventas.cancelar', 'Cancelar documentos de venta', 'ventas'),
    ('ventas.exportar', 'Exportar datos de ventas', 'ventas'),
    -- Compras
    ('compras.ver', 'Ver módulo de compras', 'compras'),
    ('compras.crear', 'Crear órdenes de compra', 'compras'),
    ('compras.editar', 'Editar órdenes de compra', 'compras'),
    ('compras.cancelar', 'Cancelar órdenes de compra', 'compras'),
    -- Inventario
    ('inventario.ver', 'Ver módulo de inventario', 'inventario'),
    ('inventario.crear', 'Crear movimientos de inventario', 'inventario'),
    ('inventario.editar', 'Editar movimientos de inventario', 'inventario'),
    ('inventario.ajustar', 'Realizar ajustes de inventario', 'inventario'),
    -- Contabilidad
    ('contabilidad.ver', 'Ver módulo de contabilidad', 'contabilidad'),
    ('contabilidad.crear', 'Crear asientos contables', 'contabilidad'),
    ('contabilidad.exportar', 'Exportar balanza y reportes', 'contabilidad'),
    -- Fiscal
    ('fiscal.ver', 'Ver módulo fiscal', 'fiscal'),
    ('fiscal.timbrar', 'Timbrar CFDI', 'fiscal'),
    ('fiscal.cancelar', 'Cancelar CFDI', 'fiscal'),
    -- CRM
    ('crm.ver', 'Ver módulo CRM', 'crm'),
    ('crm.crear', 'Crear oportunidades y actividades', 'crm'),
    ('crm.editar', 'Editar oportunidades', 'crm'),
    -- POS
    ('pos.usar', 'Usar módulo de punto de venta', 'pos'),
    -- Configuración
    ('admin.configurar', 'Acceso a configuración del sistema', 'admin'),
    ('admin.usuarios', 'Gestionar usuarios', 'admin'),
    ('admin.roles', 'Gestionar roles y permisos', 'admin'),
    ('admin.auditoria', 'Ver registros de auditoría', 'admin')
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================
-- BLOQUE 3: ASIGNAR PERMISOS A ROLES
-- ============================================================

-- Admin: todos los permisos
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r, permisos p
WHERE r.nombre = 'admin'
  AND NOT EXISTS (
      SELECT 1 FROM rol_permisos rp
      WHERE rp.rol_id = r.id AND rp.permiso_id = p.id
  );

-- Ventas: permisos del módulo ventas + inventario.ver + crm.ver + pos.usar
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r, permisos p
WHERE r.nombre = 'ventas'
  AND p.codigo IN ('ventas.ver','ventas.crear','ventas.editar','ventas.cancelar',
                   'inventario.ver','crm.ver','crm.crear','crm.editar','pos.usar')
  AND NOT EXISTS (
      SELECT 1 FROM rol_permisos rp
      WHERE rp.rol_id = r.id AND rp.permiso_id = p.id
  );

-- Almacén: permisos del módulo inventario
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r, permisos p
WHERE r.nombre = 'almacen'
  AND p.codigo IN ('inventario.ver','inventario.crear','inventario.editar','inventario.ajustar',
                   'compras.ver')
  AND NOT EXISTS (
      SELECT 1 FROM rol_permisos rp
      WHERE rp.rol_id = r.id AND rp.permiso_id = p.id
  );

-- Consulta: solo permisos de ver
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r, permisos p
WHERE r.nombre = 'consulta'
  AND p.codigo IN ('ventas.ver','compras.ver','inventario.ver','contabilidad.ver',
                   'fiscal.ver','crm.ver')
  AND NOT EXISTS (
      SELECT 1 FROM rol_permisos rp
      WHERE rp.rol_id = r.id AND rp.permiso_id = p.id
  );

-- ============================================================
-- BLOQUE 4: ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_permisos_codigo ON permisos(codigo);
CREATE INDEX IF NOT EXISTS idx_permisos_modulo ON permisos(modulo);
CREATE INDEX IF NOT EXISTS idx_rol_permisos_rol ON rol_permisos(rol_id);
CREATE INDEX IF NOT EXISTS idx_rol_permisos_permiso ON rol_permisos(permiso_id);
