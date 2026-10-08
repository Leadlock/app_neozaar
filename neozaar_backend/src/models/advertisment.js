const { DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

const Advertisment = sequelize.define(
  "advertisment",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true, // matches SERIAL
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    subtitle: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    image: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    mobile_banner: {
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
    is_feature: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    page_type: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    ads_type: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    ads_position: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    category_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    from_date: {
      type: DataTypes.DATE,
      allowNull: true, 
    },
    to_date: {
      type: DataTypes.DATE,
      allowNull: true, 
    },
  },
  {
    timestamps: false, // because you are manually handling created_at & updated_at
    tableName: "advertisment",
  },
);

module.exports = Advertisment;
