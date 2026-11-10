// Envuelve un manejador async para que los errores lleguen al middleware de errores.
export const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
