
/**
 * Middleware para validación de operaciones de usuario
 */

/**
 * Verificar que el usuario está autenticado
 */
exports.ensureAuthenticated = (req, res, next) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      success: false,
      message: 'Usuario no autenticado'
    });
  }
  
  next();
};

/**
 * Validar datos de actualización de perfil
 */
exports.validateProfileUpdate = (req, res, next) => {
  const { hourlyRate } = req.body;
  
  // Validar tasa por hora si se proporciona
  if (hourlyRate !== undefined) {
    const rate = parseFloat(hourlyRate);
    if (isNaN(rate) || rate < 0) {
      return res.status(400).json({
        success: false,
        message: 'La tasa por hora debe ser un número positivo'
      });
    }
    
    // Convertir a número para asegurarnos de que es el tipo correcto
    req.body.hourlyRate = rate;
  }
  
  next();
};
