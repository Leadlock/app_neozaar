const { DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

const HomeMaster = sequelize.define(
  "home_master",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    color_title: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    subtitle: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    banner: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    label: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    link: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    is_feature: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    // Title color controls
    title_color_type: { type: DataTypes.STRING(10), allowNull: true, defaultValue: 'solid' },
    title_color: { type: DataTypes.STRING(20), allowNull: true, defaultValue: '#ffffff' },
    title_color_end: { type: DataTypes.STRING(20), allowNull: true },
    title_color_direction: { type: DataTypes.STRING(20), allowNull: true, defaultValue: 'to right' },
    // Color title controls
    color_title_color_type: { type: DataTypes.STRING(10), allowNull: true, defaultValue: 'solid' },
    color_title_color: { type: DataTypes.STRING(20), allowNull: true, defaultValue: '#F97316' },
    color_title_color_end: { type: DataTypes.STRING(20), allowNull: true },
    color_title_color_direction: { type: DataTypes.STRING(20), allowNull: true, defaultValue: 'to right' },
    // Subtitle color controls
    subtitle_color_type: { type: DataTypes.STRING(10), allowNull: true, defaultValue: 'solid' },
    subtitle_color: { type: DataTypes.STRING(20), allowNull: true, defaultValue: '#d1d5db' },
    subtitle_color_end: { type: DataTypes.STRING(20), allowNull: true },
    subtitle_color_direction: { type: DataTypes.STRING(20), allowNull: true, defaultValue: 'to right' },
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
  },
  {
    timestamps: false,
    tableName: "home_master",
  },
);

module.exports = HomeMaster;
