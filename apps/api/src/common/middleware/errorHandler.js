// apps/api/src/common/middleware/errorHandler.js

function errorHandler(err, req, res, next) {
  console.error('❌ Error:', err.message);

  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }
  if (err.name === 'UnauthorizedError' || err.status === 401) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'Ya existe un registro con esos datos' });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Registro no encontrado' });
  }

  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Error interno del servidor'
      : err.message,
  });
}

module.exports = { errorHandler };
