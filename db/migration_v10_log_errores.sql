-- Migration v10: Log de errores persistente
-- Crea la tabla log_errores para almacenar errores del sistema

CREATE TABLE IF NOT EXISTS log_errores (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL,
    mensaje TEXT NOT NULL,
    modulo VARCHAR(100) NOT NULL DEFAULT 'Sistema',
    detalle TEXT,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    ruta VARCHAR(500),
    ip VARCHAR(45),
    fecha TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para búsqueda y filtrado
CREATE INDEX IF NOT EXISTS idx_log_errores_fecha ON log_errores(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_log_errores_modulo ON log_errores(modulo);
CREATE INDEX IF NOT EXISTS idx_log_errores_codigo ON log_errores(codigo);
CREATE INDEX IF NOT EXISTS idx_log_errores_usuario ON log_errores(usuario_id);

-- Trigger de auditoría para log_errores
CREATE OR REPLACE FUNCTION audit_log_errores()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO log_modificaciones_cabecera (
        tabla_afectada, registro_id, tipo_operacion, usuario_id, direccion_ip, comentario
    ) VALUES (
        TG_TABLE_NAME, NEW.id, TG_OP,
        current_setting('app.usuario_id')::INTEGER,
        current_setting('app.direccion_ip'),
        CASE TG_OP
            WHEN 'INSERT' THEN 'Nuevo error registrado: ' || NEW.codigo || ' - ' || NEW.modulo
            ELSE TG_OP || ' en log_errores'
        END
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_log_errores ON log_errores;
CREATE TRIGGER trg_audit_log_errores
    AFTER INSERT ON log_errores
    FOR EACH ROW
    EXECUTE FUNCTION audit_log_errores();
