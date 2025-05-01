
const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');
const { verifyToken } = require('../middleware/auth');

// Aplicar middleware de autenticación para todas las rutas de chat
router.use(verifyToken);

// Rutas de chat
router.post('/', chatController.createChat);
router.get('/', chatController.getChats);
router.get('/:chatId', chatController.getChat);
router.post('/:chatId/messages', chatController.sendMessage);
router.post('/:chatId/participants', chatController.addParticipant);
router.delete('/:chatId/leave', chatController.leaveChat);
router.get('/:chatId/messages', chatController.getChatMessages);

module.exports = router;
