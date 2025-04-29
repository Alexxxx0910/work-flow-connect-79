
const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');

// Todas las rutas están protegidas por el middleware verifyToken en app.js

// Rutas de chat
router.post('/', chatController.createChat);
router.get('/', chatController.getChats);
router.get('/:chatId', chatController.getChat);
router.post('/:chatId/messages', chatController.sendMessage);
router.post('/:chatId/participants', chatController.addParticipant);
router.delete('/:chatId/leave', chatController.leaveChat);
router.get('/:chatId/messages', chatController.getChatMessages);

module.exports = router;
