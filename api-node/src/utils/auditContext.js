async function setAuditContext(client, usuarioId, ip, comentario) {
    await client.query("SELECT set_config('app.usuario_id', $1, true)", [usuarioId || null]);
    await client.query("SELECT set_config('app.ip_origen', $1, true)", [ip || '127.0.0.1']);
    await client.query("SELECT set_config('app.comentario', $1, true)", [comentario || '']);
}

module.exports = { setAuditContext };
