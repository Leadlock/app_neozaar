const { DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

const AskTheChamp = sequelize.define(
  "ask_the_champ",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    banner: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    label: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    link: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    is_feature: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },

    updated_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },
    mobile_banner: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    timestamps: false,
    tableName: "ask_the_champ",
  },
);

module.exports = AskTheChamp;
