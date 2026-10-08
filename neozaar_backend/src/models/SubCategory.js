const { DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

const SubCategory = sequelize.define(
  "SubCategory", // ✅ PascalCase (important for Sequelize)
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    category_name: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "sub_categories",
    timestamps: false,
  }
);

module.exports = SubCategory;
