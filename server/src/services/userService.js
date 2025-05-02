
const { User, Job } = require('../models');
const fs = require('fs').promises;
const path = require('path');
const { Op } = require('sequelize');

/**
 * Servicio para operaciones relacionadas con usuarios
 */
class UserService {
  /**
   * Obtener un usuario por ID con sus trabajos recientes
   */
  async getUserById(userId) {
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
    
    return user;
  }

  /**
   * Actualizar el perfil de un usuario
   */
  async updateProfile(userId, profileData) {
    const { name, bio, skills, hourlyRate } = profileData;
    
    const user = await User.findByPk(userId);
    if (!user) {
      return null;
    }
    
    // Actualizar campos
    if (name) user.name = name;
    if (bio !== undefined) user.bio = bio;
    if (skills) user.skills = skills;
    if (hourlyRate !== undefined) user.hourlyRate = hourlyRate;
    
    await user.save();
    
    return user;
  }

  /**
   * Subir y actualizar la foto de perfil de un usuario
   */
  async updateProfilePhoto(userId, file) {
    if (!file) {
      throw new Error('No se ha subido ninguna imagen');
    }
    
    const photoURL = `/uploads/profiles/${file.filename}`;
    
    const user = await User.findByPk(userId);
    
    // Eliminar foto anterior si existe
    if (user.photoURL && user.photoURL !== '') {
      try {
        const oldPhotoPath = path.join(__dirname, '../../../', user.photoURL);
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
    
    return photoURL;
  }

  /**
   * Buscar usuarios por nombre, email o rol
   */
  async searchUsers(query, role, currentUserId) {
    // Configurar la búsqueda de usuarios
    const searchQuery = {
      attributes: { exclude: ['password'] },
      where: {}
    };
    
    // Añadir filtro por nombre o email si hay query
    if (query) {
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
    
    // Excluir al usuario actual de los resultados
    searchQuery.where = {
      ...searchQuery.where,
      id: { [Op.ne]: currentUserId }
    };
    
    // Realizar la búsqueda
    const users = await User.findAll(searchQuery);
    
    return users;
  }
}

module.exports = new UserService();
