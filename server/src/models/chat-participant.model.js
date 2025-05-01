
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ChatParticipant = sequelize.define('ChatParticipant', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'userId'  // Explicitly define the field name
  },
  chatId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'chatId'  // Explicitly define the field name
  }
}, {
  timestamps: true,
  tableName: 'ChatParticipants'
});

module.exports = ChatParticipant;
