-- ============================================================
-- MIGRACIÓN v14 - Rediseño CxC/CxP + Integración Asientos Contables
-- ============================================================
-- FASE 1: Agregar columnas saldo_restante y estado_saldo a transacciones
-- FASE 2: Rediseñar transacciones_cuentas para abonos
-- FASE 3: Eliminar tablas cxc_movimientos y cxp_movimientos si existen
-- FASE 4: Agregar tipo 'asiento_manual' al CHECK de transacciones.tipo
-- ============================================================

BEGIN;

-- ============================================================
-- 1. Agregar columnas a transacciones
-- ============================================================
ALTER TABLE transacciones
  ADD COLUMN IF NOT EXISTS saldo_restante DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estado_saldo VARCHAR(20) DEFAULT 'pendiente';

-- Agregar CHECK constraint para estado_saldo
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'transacciones_estado_saldo_check'
  ) THEN
    ALTER TABLE transacciones
      ADD CONSTRAINT transacciones_estado_saldo_check
      CHECK (estado_saldo IN ('pendiente', 'parcial', 'liquidado'));
  END IF;
END $$;

-- ============================================================
-- 2. Rediseñar transacciones_cuentas (solo abonos)
-- ============================================================

-- Eliminar la tabla existente si tiene estructura antigua
DROP TABLE IF EXISTS transacciones_cuentas CASCADE;

-- Crear la nueva tabla de abonos
CREATE TABLE transacciones_cuentas (
    id                      SERIAL PRIMARY KEY,
    transaccion_id          INTEGER NOT NULL REFERENCES transacciones(id) ON DELETE RESTRICT,
    transaccion_factura_id  INTEGER NOT NULL REFERENCES transacciones(id) ON DELETE RESTRICT,
    monto                   DECIMAL(12,2) NOT NULL,
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_transacciones_cuentas_transaccion_id ON transacciones_cuentas(transaccion_id);
CREATE INDEX IF NOT EXISTS idx_transacciones_cuentas_factura_id ON transacciones_cuentas(transaccion_factura_id);

-- Trigger de auditoría para transacciones_cuentas
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_transacciones_cuentas') THEN
    CREATE TRIGGER trg_audit_transacciones_cuentas
      AFTER INSERT OR UPDATE OR DELETE ON transacciones_cuentas
      FOR EACH ROW EXECUTE FUNCTION fn_auditar_cambios();
  END IF;
END $$;

-- ============================================================
-- 3. Eliminar tablas cxc_movimientos y cxp_movimientos si existen
-- ============================================================
DROP TABLE IF EXISTS cxc_movimientos CASCADE;
DROP TABLE IF EXISTS cxp_movimientos CASCADE;

-- ============================================================
-- 4. Agregar tipo 'asiento_manual' al CHECK de transacciones.tipo
-- ============================================================

-- Primero verificar los valores actuales
DO $$
BEGIN
  -- Eliminar la constraint existente
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'transacciones_tipo_check'
  ) THEN
    ALTER TABLE transacciones DROP CONSTRAINT transacciones_tipo_check;
  END IF;

  -- Crear la nueva constraint con todos los tipos incluyendo asiento_manual
  ALTER TABLE transacciones
    ADD CONSTRAINT transacciones_tipo_check
    CHECK (tipo IN (
      'cotizacion', 'orden_venta', 'venta',
      'orden_compra', 'compra',
      'ajuste_inventario', 'entrada_inventario', 'salida_inventario',
      'pago', 'cobro',
      'cotizacion_compra', 'recepcion_compra', 'traspaso', 'recepcion_traspaso',
      'asiento_manual'
    ));
END $$;

-- ============================================================
-- 5. Agregar índices para saldos
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_transacciones_saldo_estado ON transacciones(saldo_restante, estado_saldo);
CREATE INDEX IF NOT EXISTS idx_transacciones_tipo_saldo ON transacciones(tipo, estado_saldo);

COMMIT;
