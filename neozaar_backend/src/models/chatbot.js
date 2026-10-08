const { DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

const ChatbotQuestion = sequelize.define(
  "ChatbotQuestion",
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },

    system_prompt: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    instruction: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    is_featured: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },

    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "chatbot_question",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    underscored: true,
  },
);

module.exports = ChatbotQuestion;
