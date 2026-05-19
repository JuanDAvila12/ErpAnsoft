-- Cleanup: Standardize old accounts from v4 to match v11 structure
BEGIN;

-- Update old accounts to match new naming
UPDATE cuentas_contables SET nombre = 'Activo Circulante', tipo = 'control' WHERE codigo = '1100' AND nombre = 'Efectivo y Equivalentes';
UPDATE cuentas_contables SET nombre = 'Activo No Circulante', tipo = 'control' WHERE codigo = '1200' AND nombre = 'Clientes';
UPDATE cuentas_contables SET nombre = 'Activo Diferido', tipo = 'control' WHERE codigo = '1300' AND nombre = 'Inventarios';
UPDATE cuentas_contables SET nombre = 'Pasivo Circulante', tipo = 'control' WHERE codigo = '2100' AND nombre = 'Proveedores';
UPDATE cuentas_contables SET nombre = 'Pasivo No Circulante', tipo = 'control' WHERE codigo = '2200' AND nombre = 'Impuestos por Pagar';
UPDATE cuentas_contables SET nombre = 'Capital Contable' WHERE codigo = '3000' AND nombre = 'Capital';

-- Delete duplicate accounts (keep only the one with the lowest id)
DELETE FROM cuentas_contables a USING (
  SELECT codigo, MIN(id) as min_id FROM cuentas_contables GROUP BY codigo HAVING COUNT(*) > 1
) b WHERE a.codigo = b.codigo AND a.id <> b.min_id;

COMMIT;
