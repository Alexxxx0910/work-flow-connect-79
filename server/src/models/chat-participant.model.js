
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ChatParticipant = sequelize.define('ChatParticipant', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  // Importante: Usamos camelCase para los nombres de columnas
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  chatId: {
    type: DataTypes.UUID,
    allowNull: false
  }
}, {
  timestamps: true,
  tableName: 'ChatParticipants'
});

module.exports = ChatParticipant;
