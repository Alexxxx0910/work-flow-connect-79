
const userService = require('../services/userService');

/**
 * Obtener información del usuario actual
 */
exports.getCurrentUser = async (req, res) => {
  try {
    console.log('Obteniendo usuario actual:', req.user?.id);
    // El usuario ya está en req.user gracias al middleware de autenticación
    return res.status(200).json({
      success: true,
      user: req.user.toJSON()
    });
  } catch (error) {
    console.error('Error al obtener usuario actual:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener información del usuario',
      error: error.message
    });
  }
};

/**
 * Obtener perfil de un usuario por ID
 */
exports.getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('Buscando usuario por ID:', userId);
    
    const user = await userService.getUserById(userId);
    
    if (!user) {
      console.log('Usuario no encontrado:', userId);
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    return res.status(200).json({
      success: true,
      user
    });
    
  } catch (error) {
    console.error('Error al obtener usuario por ID:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener información del usuario',
      error: error.message
    });
  }
};

/**
 * Actualizar perfil de usuario
 */
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('Actualizando perfil de usuario:', userId, req.body);
    
    const user = await userService.updateProfile(userId, req.body);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    console.log('Perfil actualizado correctamente:', userId);
    
    return res.status(200).json({
      success: true,
      message: 'Perfil actualizado correctamente',
      user: user.toJSON()
    });
    
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar perfil',
      error: error.message
    });
  }
};

/**
 * Subir foto de perfil
 */
exports.uploadProfilePhoto = async (req, res) => {
  try {
    const userId = req.user.id;
    
    console.log('Subiendo foto de perfil para usuario:', userId);
    
    const photoURL = await userService.updateProfilePhoto(userId, req.file);
    
    return res.status(200).json({
      success: true,
      message: 'Foto de perfil actualizada correctamente',
      photoURL
    });
    
  } catch (error) {
    console.error('Error al subir foto de perfil:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al subir foto de perfil',
      error: error.message
    });
  }
};

/**
 * Buscar usuarios (para añadir a chats o ver perfiles)
 */
exports.searchUsers = async (req, res) => {
  try {
    const { query, role } = req.query;
    const currentUser = req.user;
    
    console.log("Buscando usuarios, usuario actual:", currentUser?.id, "query:", query, "role:", role);
    
    // Asegurar que el usuario actual esté autenticado
    if (!currentUser || !currentUser.id) {
      console.error("Usuario no autenticado en searchUsers");
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }
    
    const users = await userService.searchUsers(query, role, currentUser.id);
    console.log(`Se encontraron ${users.length} usuarios (excluyendo al usuario actual ${currentUser.id})`);
    
    return res.status(200).json({
      success: true,
      users
    });
    
  } catch (error) {
    console.error('Error al buscar usuarios:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al buscar usuarios',
      error: error.message
    });
  }
};
