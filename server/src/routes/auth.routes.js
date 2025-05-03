
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth');

// Rutas públicas
router.post('/register', authController.register);
router.post('/login', authController.login);

// Rutas protegidas
router.post('/logout', verifyToken, authController.logout);
router.get('/verify', verifyToken, authController.verifySession);

// Añadir una ruta de test para verificar la conectividad
router.get('/test', (req, res) => {
  res.json({ message: 'API de autenticación funcionando correctamente' });
});

module.exports = router;
