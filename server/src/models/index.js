
const User = require('./user.model');
const Job = require('./job.model');
const Comment = require('./comment.model');
const Reply = require('./reply.model');
const Chat = require('./chat.model');
const Message = require('./message.model');
const ChatParticipant = require('./chat-participant.model');
const { sequelize } = require('../config/database');

// Definir relaciones entre modelos
// Relaciones de trabajo
Job.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(Job, { foreignKey: 'userId' });

// Relaciones de comentarios
Comment.belongsTo(User, { foreignKey: 'userId' });
Comment.belongsTo(Job, { foreignKey: 'jobId' });
User.hasMany(Comment, { foreignKey: 'userId' });
Job.hasMany(Comment, { foreignKey: 'jobId' });

// Relaciones de respuestas
Reply.belongsTo(User, { foreignKey: 'userId' });
Reply.belongsTo(Comment, { foreignKey: 'commentId' });
User.hasMany(Reply, { foreignKey: 'userId' });
Comment.hasMany(Reply, { foreignKey: 'commentId' });

// Usuarios que han dado like a trabajos (relación muchos a muchos)
Job.belongsToMany(User, { through: 'JobLikes', as: 'likedBy' });
User.belongsToMany(Job, { through: 'JobLikes', as: 'likedJobs' });

// Relaciones de chat
// Chat y usuarios (relación muchos a muchos)
Chat.belongsToMany(User, { 
  through: ChatParticipant,
  foreignKey: 'chatId',
  otherKey: 'userId',
  as: 'participants' 
});

User.belongsToMany(Chat, { 
  through: ChatParticipant,
  foreignKey: 'userId',
  otherKey: 'chatId',
  as: 'chats' 
});

// Chat y mensajes
Chat.hasMany(Message, { foreignKey: 'chatId' });
Message.belongsTo(Chat, { foreignKey: 'chatId' });

// Usuario y mensajes
User.hasMany(Message, { foreignKey: 'userId' });
Message.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = {
  sequelize,
  User,
  Job,
  Comment,
  Reply,
  Chat,
  Message,
  ChatParticipant
};
