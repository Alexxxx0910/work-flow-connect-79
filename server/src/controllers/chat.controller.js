const { Chat, User, Message, ChatParticipant, sequelize } = require('../models');
const { Op } = require('sequelize');

// Crear un nuevo chat
exports.createChat = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { participantIds, name = '', isGroup = false } = req.body;
    
    // Verificar autenticación
    if (!req.user || !req.user.id) {
      console.error("Error: Usuario no autenticado o sin ID", req.user);
      await t.rollback();
      return res.status(401).json({ success: false, message: 'No autenticado' });
    }
    
    console.log("Creando chat - Usuario autenticado:", req.user.id);
    console.log("Datos recibidos:", { participantIds, name, isGroup });
    
    const currentUserId = req.user.id;
    
    if (!Array.isArray(participantIds) || participantIds.length < 1) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Se requiere al menos un participante' });
    }

    // Asegurar que el usuario actual está incluido
    let allParticipantIds = [...participantIds];
    if (!allParticipantIds.includes(currentUserId)) {
      allParticipantIds.push(currentUserId);
    }
    console.log("Participantes finales:", allParticipantIds);

    // Si es un chat privado, verificar si ya existe uno entre estos usuarios
    if (!isGroup && allParticipantIds.length === 2) {
      console.log("Verificando chat privado existente entre usuarios:", allParticipantIds);
      
      // Buscar todos los chats privados donde el usuario actual es participante
      const userChats = await ChatParticipant.findAll({
        where: { 
          userId: currentUserId 
        },
        include: [{
          model: Chat,
          as: 'chat',
          where: { isGroup: false },
          required: true
        }],
        transaction: t
      });
      
      // Extraer los IDs de chats donde el usuario actual es participante
      const userChatIds = userChats.map(cp => cp.chatId);
      
      // Buscar si el otro usuario también es participante en alguno de esos chats
      if (userChatIds.length > 0) {
        const otherUserId = allParticipantIds.find(id => id !== currentUserId);
        
        const existingChat = await ChatParticipant.findOne({
          where: {
            chatId: { [Op.in]: userChatIds },
            userId: otherUserId
          },
          include: [{
            model: Chat,
            as: 'chat',
            include: [{
              model: User,
              as: 'participants',
              through: { attributes: [] }
            }]
          }],
          transaction: t
        });
        
        if (existingChat) {
          console.log("Chat privado ya existe:", existingChat.chatId);
          await t.commit();
          return res.status(200).json({ 
            success: true, 
            chat: existingChat.chat,
            message: 'Chat existente recuperado' 
          });
        }
      }
    }
    
    // Determinar el nombre del chat para chats privados
    let chatName = name;
    if (!isGroup && allParticipantIds.length === 2) {
      const otherUserId = allParticipantIds.find(id => id !== currentUserId);
      if (otherUserId) {
        const otherUser = await User.findByPk(otherUserId, { 
          attributes: ['name'],
          transaction: t
        });
        if (otherUser) {
          chatName = otherUser.name;
        }
      }
    }
    
    // Crear el nuevo chat
    console.log("Creando nuevo chat:", { name: chatName, isGroup });
    const newChat = await Chat.create({
      name: chatName,
      isGroup,
      lastMessageAt: new Date()
    }, { transaction: t });
    
    console.log("Chat creado con ID:", newChat.id);
    
    // Añadir participantes
    for (const userId of allParticipantIds) {
      console.log(`Añadiendo participante ${userId} al chat ${newChat.id}`);
      await ChatParticipant.create({
        chatId: newChat.id,
        userId: userId
      }, { transaction: t });
    }
    
    // Cargar el chat completo con participantes
    const chatWithParticipants = await Chat.findByPk(newChat.id, {
      include: [
        {
          model: User,
          as: 'participants',
          through: { attributes: [] }
        }
      ],
      transaction: t
    });
    
    await t.commit();
    console.log("Chat creado y cargado con éxito:", newChat.id);
    
    return res.status(201).json({ 
      success: true, 
      chat: chatWithParticipants,
      message: 'Chat creado correctamente' 
    });
  } catch (error) {
    await t.rollback();
    console.error('Error al crear chat:', error);
    return res.status(500).json({ success: false, message: 'Error al crear chat', error: error.message });
  }
};

// Obtener todos los chats del usuario
exports.getChats = async (req, res) => {
  try {
    // Verificar autenticación
    if (!req.user || !req.user.id) {
      console.error("Error: Usuario no autenticado o sin ID en getChats", req.user);
      return res.status(401).json({ success: false, message: 'No autenticado' });
    }
    
    const userId = req.user.id;
    console.log("Obteniendo chats para usuario:", userId);
    
    // Obtener todos los chats donde el usuario es participante
    const userChats = await Chat.findAll({
      include: [
        {
          model: User,
          as: 'participants',
          attributes: ['id', 'name', 'photoURL', 'isOnline', 'lastSeen'],
          through: { attributes: [] }
        },
        {
          model: Message,
          as: 'messages',
          limit: 20,
          order: [['createdAt', 'DESC']],
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'photoURL']
            }
          ]
        }
      ],
      order: [['lastMessageAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'participants',
          attributes: ['id', 'name', 'photoURL', 'isOnline', 'lastSeen'],
          where: { id: userId },
          through: { attributes: [] },
          required: true
        },
        {
          model: Message,
          as: 'messages',
          separate: true,
          limit: 20,
          order: [['createdAt', 'DESC']],
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'photoURL']
            }
          ]
        }
      ]
    });
    
    console.log(`Se encontraron ${userChats.length} chats para el usuario ${userId}`);
    
    // Procesar los chats para el formato adecuado
    const chatsWithDetails = userChats.map(chat => {
      // Asegurarnos de que los mensajes estén definidos
      const messages = chat.messages || [];
      const sortedMessages = [...messages].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      // Obtener el último mensaje
      const lastMessage = sortedMessages.length > 0 ? sortedMessages[0] : null;
      
      return {
        id: chat.id,
        name: chat.name,
        isGroup: chat.isGroup,
        lastMessageAt: chat.lastMessageAt,
        participants: chat.participants || [],
        messages: sortedMessages.map(msg => ({
          id: msg.id,
          content: msg.content,
          senderId: msg.userId,
          read: msg.read,
          timestamp: msg.createdAt,
          user: msg.user
        })),
        lastMessage: lastMessage ? {
          id: lastMessage.id,
          content: lastMessage.content,
          senderId: lastMessage.userId,
          read: lastMessage.read,
          timestamp: lastMessage.createdAt,
          user: lastMessage.user
        } : null
      };
    });
    
    return res.status(200).json({ success: true, chats: chatsWithDetails });
  } catch (error) {
    console.error('Error al obtener chats:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener chats', error: error.message });
  }
};

// Obtener un chat específico
exports.getChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;
    
    // Verificar que el usuario pertenece al chat
    const [isParticipant] = await sequelize.query(`
      SELECT 1 FROM "ChatParticipants" 
      WHERE "chatId" = :chatId AND "userId" = :userId
    `, {
      replacements: { chatId, userId },
      type: sequelize.QueryTypes.SELECT
    });
    
    if (!isParticipant) {
      return res.status(403).json({ success: false, message: 'No tienes acceso a este chat' });
    }
    
    // Obtener detalles del chat
    const [chatDetails] = await sequelize.query(`
      SELECT * FROM "Chats" WHERE id = :chatId
    `, {
      replacements: { chatId },
      type: sequelize.QueryTypes.SELECT
    });
    
    if (!chatDetails) {
      return res.status(404).json({ success: false, message: 'Chat no encontrado' });
    }
    
    // Obtener participantes
    const [participants] = await sequelize.query(`
      SELECT u.id, u.name, u."photoURL", u."isOnline", u."lastSeen"
      FROM "Users" AS u
      JOIN "ChatParticipants" AS cp ON u.id = cp."userId"
      WHERE cp."chatId" = :chatId
    `, {
      replacements: { chatId },
      type: sequelize.QueryTypes.SELECT
    });
    
    // Obtener mensajes
    const [messages] = await sequelize.query(`
      SELECT m.id, m.content, m."userId" as "senderId", m.read, m."createdAt" as timestamp,
             u.id as "user.id", u.name as "user.name", u."photoURL" as "user.photoURL"
      FROM "Messages" AS m
      LEFT JOIN "Users" AS u ON m."userId" = u.id
      WHERE m."chatId" = :chatId
      ORDER BY m."createdAt" DESC
      LIMIT 50
    `, {
      replacements: { chatId },
      type: sequelize.QueryTypes.SELECT,
      nest: true
    });
    
    // Marcar mensajes como leídos
    await sequelize.query(`
      UPDATE "Messages"
      SET read = true
      WHERE "chatId" = :chatId AND "userId" != :userId AND read = false
    `, {
      replacements: { chatId, userId },
      type: sequelize.QueryTypes.UPDATE
    });
    
    const chatWithDetails = {
      ...chatDetails,
      participants,
      messages: messages.reverse()
    };
    
    return res.status(200).json({ success: true, chat: chatWithDetails });
  } catch (error) {
    console.error('Error al obtener chat:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener chat', error: error.message });
  }
};

// Enviar un mensaje
exports.sendMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;
    
    if (!content || content.trim() === '') {
      return res.status(400).json({ success: false, message: 'El contenido del mensaje no puede estar vacío' });
    }
    
    // Verificar que el chat existe
    const [chatExists] = await sequelize.query(`
      SELECT 1 FROM "Chats" WHERE id = :chatId
    `, {
      replacements: { chatId },
      type: sequelize.QueryTypes.SELECT
    });
    
    if (!chatExists) {
      return res.status(404).json({ success: false, message: 'Chat no encontrado' });
    }
    
    // Verificar que el usuario pertenece al chat
    const [isParticipant] = await sequelize.query(`
      SELECT 1 FROM "ChatParticipants" 
      WHERE "chatId" = :chatId AND "userId" = :userId
    `, {
      replacements: { chatId, userId },
      type: sequelize.QueryTypes.SELECT
    });
    
    if (!isParticipant) {
      return res.status(403).json({ success: false, message: 'No tienes acceso a este chat' });
    }
    
    // Crear el mensaje
    const [messageId] = await sequelize.query(`
      INSERT INTO "Messages" (id, content, "chatId", "userId", read, "createdAt", "updatedAt")
      VALUES (uuid_generate_v4(), :content, :chatId, :userId, false, NOW(), NOW())
      RETURNING id
    `, {
      replacements: { content, chatId, userId },
      type: sequelize.QueryTypes.INSERT
    });
    
    // Actualizar lastMessageAt del chat
    await sequelize.query(`
      UPDATE "Chats"
      SET "lastMessageAt" = NOW(), "updatedAt" = NOW()
      WHERE id = :chatId
    `, {
      replacements: { chatId },
      type: sequelize.QueryTypes.UPDATE
    });
    
    // Obtener el mensaje con datos del usuario
    const [message] = await sequelize.query(`
      SELECT m.id, m.content, m."userId" as "senderId", m.read, m."createdAt" as timestamp,
             u.id as "user.id", u.name as "user.name", u."photoURL" as "user.photoURL"
      FROM "Messages" AS m
      LEFT JOIN "Users" AS u ON m."userId" = u.id
      WHERE m.id = :messageId
    `, {
      replacements: { messageId: messageId[0].id },
      type: sequelize.QueryTypes.SELECT,
      nest: true
    });
    
    return res.status(201).json({ 
      success: true, 
      chatMessage: message,
      message: 'Mensaje enviado correctamente' 
    });
  } catch (error) {
    console.error('Error al enviar mensaje:', error);
    return res.status(500).json({ success: false, message: 'Error al enviar mensaje', error: error.message });
  }
};

// Añadir un participante a un chat
exports.addParticipant = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { chatId } = req.params;
    const { userId } = req.body;
    const currentUserId = req.user.id;
    
    // Verificar que el chat existe
    const [chat] = await sequelize.query(`
      SELECT * FROM "Chats" WHERE id = :chatId
    `, {
      replacements: { chatId },
      type: sequelize.QueryTypes.SELECT,
      transaction: t
    });
    
    if (!chat) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Chat no encontrado' });
    }
    
    // Verificar que el usuario actual pertenece al chat
    const [isParticipant] = await sequelize.query(`
      SELECT 1 FROM "ChatParticipants" 
      WHERE "chatId" = :chatId AND "userId" = :userId
    `, {
      replacements: { chatId, userId: currentUserId },
      type: sequelize.QueryTypes.SELECT,
      transaction: t
    });
    
    if (!isParticipant) {
      await t.rollback();
      return res.status(403).json({ success: false, message: 'No tienes acceso a este chat' });
    }
    
    // Verificar que el usuario a añadir existe
    const [userExists] = await sequelize.query(`
      SELECT 1 FROM "Users" WHERE id = :userId
    `, {
      replacements: { userId },
      type: sequelize.QueryTypes.SELECT,
      transaction: t
    });
    
    if (!userExists) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }
    
    // Verificar si el usuario ya es participante
    const [alreadyParticipant] = await sequelize.query(`
      SELECT 1 FROM "ChatParticipants" 
      WHERE "chatId" = :chatId AND "userId" = :userId
    `, {
      replacements: { chatId, userId },
      type: sequelize.QueryTypes.SELECT,
      transaction: t
    });
    
    if (alreadyParticipant) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'El usuario ya es participante del chat' });
    }
    
    // Añadir participante
    await sequelize.query(`
      INSERT INTO "ChatParticipants" ("id", "userId", "chatId", "createdAt", "updatedAt")
      VALUES (uuid_generate_v4(), :userId, :chatId, NOW(), NOW())
    `, {
      replacements: { userId, chatId },
      type: sequelize.QueryTypes.INSERT,
      transaction: t
    });
    
    // Crear mensaje del sistema
    await sequelize.query(`
      INSERT INTO "Messages" (id, content, "chatId", "userId", read, "createdAt", "updatedAt")
      VALUES (uuid_generate_v4(), :content, :chatId, :currentUserId, true, NOW(), NOW())
    `, {
      replacements: { 
        content: `Un nuevo participante ha sido añadido al chat`,
        chatId, 
        currentUserId
      },
      type: sequelize.QueryTypes.INSERT,
      transaction: t
    });
    
    // Actualizar lastMessageAt del chat
    await sequelize.query(`
      UPDATE "Chats"
      SET "lastMessageAt" = NOW(), "updatedAt" = NOW()
      WHERE id = :chatId
    `, {
      replacements: { chatId },
      type: sequelize.QueryTypes.UPDATE,
      transaction: t
    });
    
    await t.commit();
    
    return res.status(200).json({ 
      success: true,
      message: 'Participante añadido correctamente'
    });
  } catch (error) {
    await t.rollback();
    console.error('Error al añadir participante:', error);
    return res.status(500).json({ success: false, message: 'Error al añadir participante', error: error.message });
  }
};

// Abandonar un chat
exports.leaveChat = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { chatId } = req.params;
    const userId = req.user.id;
    
    // Verificar que el chat existe
    const [chat] = await sequelize.query(`
      SELECT * FROM "Chats" WHERE id = :chatId
    `, {
      replacements: { chatId },
      type: sequelize.QueryTypes.SELECT,
      transaction: t
    });
    
    if (!chat) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Chat no encontrado' });
    }
    
    // Verificar que el usuario es participante
    const [isParticipant] = await sequelize.query(`
      SELECT 1 FROM "ChatParticipants" 
      WHERE "chatId" = :chatId AND "userId" = :userId
    `, {
      replacements: { chatId, userId },
      type: sequelize.QueryTypes.SELECT,
      transaction: t
    });
    
    if (!isParticipant) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'No eres participante de este chat' });
    }
    
    // Eliminar participante
    await sequelize.query(`
      DELETE FROM "ChatParticipants" 
      WHERE "chatId" = :chatId AND "userId" = :userId
    `, {
      replacements: { chatId, userId },
      type: sequelize.QueryTypes.DELETE,
      transaction: t
    });
    
    // Verificar si quedan participantes
    const [[{ count }]] = await sequelize.query(`
      SELECT COUNT(*) as count FROM "ChatParticipants" 
      WHERE "chatId" = :chatId
    `, {
      replacements: { chatId },
      type: sequelize.QueryTypes.SELECT,
      transaction: t
    });
    
    // Si no quedan participantes, eliminar el chat
    if (parseInt(count) === 0) {
      await sequelize.query(`
        DELETE FROM "Messages" WHERE "chatId" = :chatId
      `, {
        replacements: { chatId },
        type: sequelize.QueryTypes.DELETE,
        transaction: t
      });
      
      await sequelize.query(`
        DELETE FROM "Chats" WHERE id = :chatId
      `, {
        replacements: { chatId },
        type: sequelize.QueryTypes.DELETE,
        transaction: t
      });
    } else {
      // Si quedan participantes, crear mensaje del sistema
      await sequelize.query(`
        INSERT INTO "Messages" (id, content, "chatId", "userId", read, "createdAt", "updatedAt")
        VALUES (uuid_generate_v4(), :content, :chatId, :userId, true, NOW(), NOW())
      `, {
        replacements: { 
          content: `Un usuario ha abandonado el chat`,
          chatId, 
          userId
        },
        type: sequelize.QueryTypes.INSERT,
        transaction: t
      });
      
      // Actualizar lastMessageAt del chat
      await sequelize.query(`
        UPDATE "Chats"
        SET "lastMessageAt" = NOW(), "updatedAt" = NOW()
        WHERE id = :chatId
      `, {
        replacements: { chatId },
        type: sequelize.QueryTypes.UPDATE,
        transaction: t
      });
    }
    
    await t.commit();
    
    return res.status(200).json({ 
      success: true,
      message: 'Has abandonado el chat correctamente'
    });
  } catch (error) {
    await t.rollback();
    console.error('Error al abandonar chat:', error);
    return res.status(500).json({ success: false, message: 'Error al abandonar chat', error: error.message });
  }
};

// Obtener mensajes de un chat
exports.getChatMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;
    const { page = 1, limit = 50 } = req.query;
    
    const offset = (page - 1) * limit;
    
    // Verificar que el usuario pertenece al chat
    const [isParticipant] = await sequelize.query(`
      SELECT 1 FROM "ChatParticipants" 
      WHERE "chatId" = :chatId AND "userId" = :userId
    `, {
      replacements: { chatId, userId },
      type: sequelize.QueryTypes.SELECT
    });
    
    if (!isParticipant) {
      return res.status(403).json({ success: false, message: 'No tienes acceso a este chat' });
    }
    
    // Obtener mensajes
    const [messages] = await sequelize.query(`
      SELECT m.id, m.content, m."userId" as "senderId", m.read, m."createdAt" as timestamp,
             u.id as "user.id", u.name as "user.name", u."photoURL" as "user.photoURL"
      FROM "Messages" AS m
      LEFT JOIN "Users" AS u ON m."userId" = u.id
      WHERE m."chatId" = :chatId
      ORDER BY m."createdAt" DESC
      LIMIT :limit OFFSET :offset
    `, {
      replacements: { chatId, limit, offset },
      type: sequelize.QueryTypes.SELECT,
      nest: true
    });
    
    // Marcar mensajes como leídos
    await sequelize.query(`
      UPDATE "Messages"
      SET read = true
      WHERE "chatId" = :chatId AND "userId" != :userId AND read = false
    `, {
      replacements: { chatId, userId },
      type: sequelize.QueryTypes.UPDATE
    });
    
    return res.status(200).json({ 
      success: true, 
      messages: messages.reverse(),
      page,
      limit
    });
  } catch (error) {
    console.error('Error al obtener mensajes:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener mensajes', error: error.message });
  }
};
