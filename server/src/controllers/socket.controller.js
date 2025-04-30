
const { User, Chat, Message } = require('../models');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');

const initSocket = (io) => {
  // Mapeo de usuarios a sus sockets
  const userSockets = new Map();
  
  // Middleware para autenticación de sockets
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('No se proporcionó token de autenticación'));
      }
      
      try {
        // Verificar token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Buscar usuario en la base de datos
        const user = await User.findByPk(decoded.id);
        
        if (!user) {
          return next(new Error('Usuario no encontrado'));
        }
        
        // Guardar usuario en el socket
        socket.user = user;
        next();
        
      } catch (error) {
        return next(new Error('Token inválido o expirado'));
      }
      
    } catch (error) {
      console.error('Error en middleware de autenticación de socket:', error);
      next(new Error('Error interno del servidor'));
    }
  });
  
  io.on('connection', async (socket) => {
    try {
      const user = socket.user;
      console.log(`Usuario conectado: ${user.name} (${user.id})`);
      
      // Actualizar estado de conexión del usuario
      await User.update(
        { isOnline: true, lastSeen: new Date() },
        { where: { id: user.id } }
      );
      
      // Añadir socket a la colección de sockets del usuario
      if (!userSockets.has(user.id)) {
        userSockets.set(user.id, new Set());
      }
      userSockets.get(user.id).add(socket.id);
      
      // Enviar estado online a todos
      io.emit('user_status_change', {
        userId: user.id,
        isOnline: true,
        lastSeen: new Date()
      });
      
      // Unirse a las salas de chat del usuario
      try {
        // Obtener chats del usuario usando la asociación correcta
        const userChats = await Chat.findAll({
          include: [{
            model: User,
            as: 'participants',
            where: { id: user.id },
            attributes: ['id', 'name'],
            through: { attributes: [] } // No incluir atributos de la tabla intermedia
          }]
        });
        
        if (userChats && userChats.length > 0) {
          userChats.forEach(chat => {
            socket.join(`chat:${chat.id}`);
            console.log(`Usuario ${user.name} unido a la sala chat:${chat.id}`);
          });
        } else {
          console.log(`No se encontraron chats para el usuario ${user.name}`);
        }
      } catch (error) {
        console.error('Error al unir usuario a las salas de chat:', error);
      }
      
      // Manejar envío de mensajes
      socket.on('send_message', async (data) => {
        try {
          const { chatId, content } = data;
          
          // Verificar que el chat existe
          const chat = await Chat.findByPk(chatId);
          if (!chat) {
            socket.emit('error', { message: 'Chat no encontrado' });
            return;
          }
          
          // Verificar que el usuario es participante
          const participants = await chat.getParticipants({ where: { id: user.id } });
          if (participants.length === 0) {
            socket.emit('error', { message: 'No tienes acceso a este chat' });
            return;
          }
          
          // Crear mensaje
          const message = await Message.create({
            content,
            chatId,
            userId: user.id
          });
          
          // Actualizar lastMessageAt del chat
          chat.lastMessageAt = new Date();
          await chat.save();
          
          // Cargar mensaje con información del usuario
          const messageWithUser = await Message.findByPk(message.id, {
            include: [
              {
                model: User,
                as: 'user',
                attributes: ['id', 'name', 'photoURL']
              }
            ]
          });
          
          // Emitir mensaje a todos los participantes del chat
          io.to(`chat:${chatId}`).emit('new_message', messageWithUser);
          
        } catch (error) {
          console.error('Error al enviar mensaje via socket:', error);
          socket.emit('error', { message: 'Error al enviar mensaje' });
        }
      });
      
      // Manejar escritura
      socket.on('typing', (data) => {
        const { chatId } = data;
        
        // Emitir evento de escritura a todos los participantes excepto el remitente
        socket.to(`chat:${chatId}`).emit('user_typing', {
          chatId,
          userId: user.id,
          userName: user.name
        });
      });
      
      // Manejar lectura de mensajes
      socket.on('mark_read', async (data) => {
        try {
          const { chatId } = data;
          
          // Marcar mensajes como leídos
          await Message.update(
            { read: true },
            {
              where: {
                chatId,
                userId: { [Op.ne]: user.id },
                read: false
              }
            }
          );
          
          // Notificar a los demás usuarios
          socket.to(`chat:${chatId}`).emit('messages_read', {
            chatId,
            userId: user.id
          });
          
        } catch (error) {
          console.error('Error al marcar mensajes como leídos:', error);
        }
      });
      
      // Manejar unirse a un chat
      socket.on('join_chat', async (data) => {
        try {
          const { chatId } = data;
          
          // Verificar que el chat existe
          const chat = await Chat.findByPk(chatId);
          if (!chat) {
            socket.emit('error', { message: 'Chat no encontrado' });
            return;
          }
          
          // Verificar que el usuario es participante
          const isParticipant = await chat.hasParticipant(user.id);
          if (!isParticipant) {
            socket.emit('error', { message: 'No tienes acceso a este chat' });
            return;
          }
          
          // Unirse a la sala de chat
          socket.join(`chat:${chatId}`);
          
        } catch (error) {
          console.error('Error al unirse al chat:', error);
          socket.emit('error', { message: 'Error al unirse al chat' });
        }
      });
      
      // Manejar desconexión
      socket.on('disconnect', async () => {
        console.log(`Usuario desconectado: ${user.name} (${user.id})`);
        
        // Eliminar socket de la colección
        if (userSockets.has(user.id)) {
          userSockets.get(user.id).delete(socket.id);
          
          // Si no quedan sockets para este usuario, actualizar estado a offline
          if (userSockets.get(user.id).size === 0) {
            userSockets.delete(user.id);
            
            // Actualizar estado de conexión del usuario
            await User.update(
              { isOnline: false, lastSeen: new Date() },
              { where: { id: user.id } }
            );
            
            // Enviar estado offline a todos
            io.emit('user_status_change', {
              userId: user.id,
              isOnline: false,
              lastSeen: new Date()
            });
          }
        }
      });
      
    } catch (error) {
      console.error('Error en conexión de socket:', error);
    }
  });
};

module.exports = { initSocket };
