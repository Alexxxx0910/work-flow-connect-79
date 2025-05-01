
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
Job.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(Job, { foreignKey: 'userId', as: 'jobs' });

// Relaciones de comentarios
Comment.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Comment.belongsTo(Job, { foreignKey: 'jobId', as: 'job' });
User.hasMany(Comment, { foreignKey: 'userId', as: 'comments' });
Job.hasMany(Comment, { foreignKey: 'jobId', as: 'comments' });

// Relaciones de respuestas
Reply.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Reply.belongsTo(Comment, { foreignKey: 'commentId', as: 'comment' });
User.hasMany(Reply, { foreignKey: 'userId', as: 'replies' });
Comment.hasMany(Reply, { foreignKey: 'commentId', as: 'replies' });

// Usuarios que han dado like a trabajos (relación muchos a muchos)
Job.belongsToMany(User, { through: 'JobLikes', as: 'likedBy' });
User.belongsToMany(Job, { through: 'JobLikes', as: 'likedJobs' });

// Usuarios que han guardado trabajos (relación muchos a muchos)
Job.belongsToMany(User, { through: 'SavedJobs', as: 'savedBy' });
User.belongsToMany(User, { through: 'SavedJobs', as: 'savedJobs' });

// Relaciones de chat
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
Chat.hasMany(Message, { foreignKey: 'chatId', as: 'messages' });
Message.belongsTo(Chat, { foreignKey: 'chatId', as: 'chat' });

// Usuario y mensajes
User.hasMany(Message, { foreignKey: 'userId', as: 'messages' });
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
