# Log de Modificaciones - ERP Ansoft

| Número | Fecha | Módulo | Tipo | Descripción | Autor | Estado |
|--------|-------|--------|------|-------------|-------|--------|
| 0001 | 2026-05-09 | Seguridad | Corrección | JWT ahora solo almacena user ID, secret obligatoria por variable de entorno | Cline | Completado |
| 0002 | 2026-05-09 | Base de Datos | Corrección | Cambiado ON DELETE CASCADE a RESTRICT en ventas_detalle | Cline | Completado |
| 0003 | 2026-05-09 | Ventas | Mejora | Modelo de ventas migrado a usar entidades (cliente/vendedor) en lugar de IDs directos | Cline | Completado |
| 0004 | 2026-05-09 | Auditoría | Nuevo | Implementado sistema de log de modificaciones estilo SAP (CDHDR/CDPOS) | Cline | Completado |
| 0005 | 2026-05-09 | Ventas/BD | Corrección | JOIN de almacén reemplazado por subconsulta LATERAL desde inventario_movimientos; columnas referencia_tipo/referencia_id agregadas | Cline | Completado |

## Notas de Implementación

### 0001 - Seguridad JWT
- Se agregó validación crítica al inicio: si `NODE_ENV=production` y no hay `JWT_SECRET`, el servidor lanza error fatal y termina.
- `generarToken(usuario)` ahora solo guarda `{ id: usuario.id }` en el payload. Se eliminó email y rol_id.
- Nueva función `obtenerUsuarioDesdeToken(token)` que decodifica el token, consulta la BD con JOIN a usuarios, roles, entidades y entidad_roles, y devuelve el objeto completo.
- `authMiddleware` ahora usa `obtenerUsuarioDesdeToken` internamente.
- El endpoint `/api/v1/auth/login` ya no devuelve datos del usuario en el body; solo retorna el token.
- El endpoint `/api/v1/auth/perfil` permite al frontend obtener los datos completos del usuario después del login.

### 0002 - ON DELETE CASCADE a RESTRICT
- Se modificó la definición de `ventas_detalle.venta_id` para usar `ON DELETE RESTRICT`.
- Se agregó bloque `DO $$ ... END $$` para migrar automáticamente BD existentes que ya tengan la constraint con CASCADE.
- Se agregó comentario documentando la política: "En ERP financiero nunca se borran transacciones, se cancelan cambiando estatus."

### 0003 - Migración a Entidades en Ventas
- `crearVenta()` ahora acepta `entidad_cliente_id` (obligatorio), `entidad_vendedor_id` (opcional) y `almacen_id` (opcional, default 1).
- Validaciones: se verifica que `entidad_cliente_id` exista en entidades con rol 'cliente', y que `entidad_vendedor_id` tenga rol 'vendedor'.
- Se agregó columna `entidad_vendedor_id` a la tabla `ventas`.
- Los INSERT en ventas ahora usan `entidad_cliente_id` y `entidad_vendedor_id`.
- Los INSERT en inventario_movimientos ahora incluyen `almacen_id`.
- `findAll()` y `findById()` hacen JOIN con entidades para devolver `cliente_nombre`, `cliente_rfc`, `vendedor_nombre` y `almacen_nombre`.
- Se mantuvo intacta la lógica de transacción (BEGIN/COMMIT/ROLLBACK).
- Se actualizó la ruta POST `/api/v1/ventas` con las nuevas validaciones de entrada.

### 0004 - Sistema de Auditoría Estilo SAP
- Se crearon dos tablas de auditoría:
  - `log_modificaciones_cabecera` (equivalente a CDHDR de SAP): almacena cabecera de cada cambio con tabla, registro, tipo operación (I/U/D), usuario, fecha, IP.
  - `log_modificaciones_detalle` (equivalente a CDPOS de SAP): almacena campo por campo los valores anteriores y nuevos.
- Se creó la función PL/pgSQL `fn_auditar_cambios()` ejecutada por triggers AFTER INSERT/UPDATE/DELETE.
  - Para INSERT: registra tipo 'I' con valores iniciales.
  - Para UPDATE: compara OLD vs NEW campo por campo y registra diferencias.
  - Para DELETE: registra tipo 'D' con valores eliminados.
  - Usa variables de sesión (`app.usuario_id`, `app.ip_origen`, `app.comentario`) para obtener contexto de la aplicación.
  - Excluye campos temporales automáticos (`created_at`, `updated_at`, `creado_en`).
- Se agregaron triggers para las tablas: ventas, ventas_detalle, inventario_movimientos, articulos, entidades.
- Se creó modelo `auditoria.model.js` con funciones `getHistorialPorRegistro()` y `getAll()`.
- Se creó ruta `auditoria.routes.js` con endpoints protegidos (solo admin):
  - `GET /api/v1/auditoria/:tabla/:registro_id` - historial completo de un registro
  - `GET /api/v1/auditoria` - listado paginado con filtros.

### 0005 - Corrección JOIN de Almacén con Subconsulta LATERAL
- Se agregaron las columnas `referencia_tipo VARCHAR(50)` y `referencia_id INTEGER` a la tabla `inventario_movimientos` para rastrear el origen del movimiento.
- Se actualizó el INSERT en `crearVenta()` para incluir `referencia_tipo = 'venta'` y `referencia_id = venta.id` en los movimientos de inventario.
- En `findAll()` y `findById()`, se reemplazó el `LEFT JOIN almacenes al ON al.id = 1` (que siempre devolvía el almacén ID=1) por una subconsulta `LEFT JOIN LATERAL` que obtiene el almacén real desde `inventario_movimientos` donde `referencia_tipo = 'venta'`, `referencia_id = v.id` y `tipo_movimiento = 'salida'`, limitando a 1 resultado.
