// src/models/productOtherDetails.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize');
const Product = require('../product'); // adjust path if needed

const ProductOtherDetails = sequelize.define('ProductOtherDetails', {
  id: {
    type: DataTypes.BIGINT,
    autoIncrement: true,
    primaryKey: true
  },

  product_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
    references: {
      model: 'products',   // table name
      key: 'id'
    },
    onDelete: 'CASCADE'
  },

  overview: {
    type: DataTypes.TEXT,
    allowNull: true
  },

  scope: {
    type: DataTypes.TEXT,
    allowNull: true
  },

  approach: {
    type: DataTypes.TEXT,
    allowNull: true
  },

    outcome: {
    type: DataTypes.JSONB,
    allowNull: true
    },

  challenges_addressed: {
    type: DataTypes.TEXT,
    allowNull: true
  },

  solution_differentiator: {
    type: DataTypes.TEXT,
    allowNull: true
  },

  why_choose_neozaar: {
    type: DataTypes.TEXT,
    allowNull: true
  },

  coverage: {
    type: DataTypes.TEXT,
    allowNull: true
  }

}, {
  tableName: 'product_other_details',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});


// Associations
Product.hasOne(ProductOtherDetails, {
  foreignKey: 'product_id',
  onDelete: 'CASCADE'
});

ProductOtherDetails.belongsTo(Product, {
  foreignKey: 'product_id'
});

module.exports = ProductOtherDetails;
