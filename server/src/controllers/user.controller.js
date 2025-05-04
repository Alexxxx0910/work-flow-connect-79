
const { User, Job } = require('../models');
const fs = require('fs').promises;
const path = require('path');

/**
 * Obtener información del usuario actual
 */
exports.getCurrentUser = async (req, res) => {
  try {
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
    
    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password'] },
      include: [
        {
          model: Job,
          as: 'jobs',
          limit: 5,
          order: [['createdAt', 'DESC']]
        }
      ]
    });
    
    if (!user) {
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
    const { name, bio, skills, hourlyRate } = req.body;
    
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    // Actualizar campos
    if (name) user.name = name;
    if (bio !== undefined) user.bio = bio;
    if (skills) user.skills = skills;
    if (hourlyRate !== undefined) user.hourlyRate = hourlyRate;
    
    await user.save();
    
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
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se ha subido ninguna imagen'
      });
    }
    
    const userId = req.user.id;
    const photoURL = `/uploads/profiles/${req.file.filename}`;
    
    const user = await User.findByPk(userId);
    
    // Eliminar foto anterior si existe
    if (user.photoURL && user.photoURL !== '') {
      try {
        const oldPhotoPath = path.join(__dirname, '../../', user.photoURL);
        await fs.access(oldPhotoPath);
        await fs.unlink(oldPhotoPath);
      } catch (err) {
        // Si el archivo no existe, ignoramos el error
        console.log('No se pudo eliminar la foto anterior:', err);
      }
    }
    
    // Actualizar URL de la foto
    user.photoURL = photoURL;
    await user.save();
    
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
    const searchQuery = {
      attributes: { exclude: ['password'] },
      where: {}
    };
    
    // Añadir filtro por nombre o email si hay query
    if (query) {
      const { Op } = require('sequelize');
      searchQuery.where = {
        [Op.or]: [
          { name: { [Op.iLike]: `%${query}%` } },
          { email: { [Op.iLike]: `%${query}%` } }
        ]
      };
    }
    
    // Añadir filtro por rol si se especifica
    if (role && ['freelancer', 'client'].includes(role)) {
      searchQuery.where.role = role;
    }
    
    const users = await User.findAll(searchQuery);
    
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
