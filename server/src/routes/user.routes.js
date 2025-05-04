
const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configurar multer para subida de imágenes de perfil
const uploadDir = path.join(__dirname, '../../uploads/profiles');

// Crear directorio si no existe
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${req.user.id}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: function(req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Solo se permiten imágenes (jpeg, jpg, png, gif)'));
  }
});

// Rutas de usuario
router.get('/me', userController.getCurrentUser);
router.get('/search', userController.searchUsers);
router.get('/:userId', userController.getUserById);
router.put('/profile', userController.updateProfile);
router.post('/profile/photo', upload.single('photo'), userController.uploadProfilePhoto);

module.exports = router;
