
const { sequelize } = require('../config/database');
const User = require('./user.model');
const Job = require('./job.model');
const Comment = require('./comment.model');
const Reply = require('./reply.model');
const Chat = require('./chat.model');
const Message = require('./message.model');

// Definir las relaciones entre los modelos
// Users - Jobs (Un usuario puede tener muchos trabajos)
User.hasMany(Job, { foreignKey: 'userId', as: 'jobs', onDelete: 'CASCADE' });
Job.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Jobs - Comments (Un trabajo puede tener muchos comentarios)
Job.hasMany(Comment, { foreignKey: 'jobId', as: 'comments', onDelete: 'CASCADE' });
Comment.belongsTo(Job, { foreignKey: 'jobId', as: 'job' });

// Comments - Replies (Un comentario puede tener muchas respuestas)
Comment.hasMany(Reply, { foreignKey: 'commentId', as: 'replies', onDelete: 'CASCADE' });
Reply.belongsTo(Comment, { foreignKey: 'commentId', as: 'comment' });

// Users - Comments (Un usuario puede hacer muchos comentarios)
User.hasMany(Comment, { foreignKey: 'userId', as: 'comments', onDelete: 'CASCADE' });
Comment.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Users - Replies (Un usuario puede hacer muchas respuestas)
User.hasMany(Reply, { foreignKey: 'userId', as: 'replies', onDelete: 'CASCADE' });
Reply.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Users - Jobs (Likes) (Muchos usuarios pueden dar like a muchos trabajos)
User.belongsToMany(Job, { through: 'JobLikes', as: 'likedJobs', foreignKey: 'userId' });
Job.belongsToMany(User, { through: 'JobLikes', as: 'likedBy', foreignKey: 'jobId' });

// Users - Jobs (Saved) (Muchos usuarios pueden guardar muchos trabajos)
User.belongsToMany(Job, { through: 'SavedJobs', as: 'savedJobs', foreignKey: 'userId' });
Job.belongsToMany(User, { through: 'SavedJobs', as: 'savedBy', foreignKey: 'jobId' });

// Chats - Users (Muchos usuarios pueden participar en muchos chats)
User.belongsToMany(Chat, { through: 'ChatParticipants', as: 'chats', foreignKey: 'userId' });
Chat.belongsToMany(User, { through: 'ChatParticipants', as: 'participants', foreignKey: 'ChatId' });

// Chats - Messages (Un chat puede tener muchos mensajes)
Chat.hasMany(Message, { foreignKey: 'chatId', as: 'messages', onDelete: 'CASCADE' });
Message.belongsTo(Chat, { foreignKey: 'chatId', as: 'chat' });

// Users - Messages (Un usuario puede enviar muchos mensajes)
User.hasMany(Message, { foreignKey: 'userId', as: 'messages', onDelete: 'CASCADE' });
Message.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// NO ejecutamos sequelize.sync() aquí ya que lo haremos en el archivo principal (index.js)

// Exportar los modelos
module.exports = {
  sequelize,
  User,
  Job,
  Comment,
  Reply,
  Chat,
  Message
};
