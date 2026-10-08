// src/models/pricingModel.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize'); // your Sequelize instance

const PricingModel = sequelize.define('PricingModel', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  action_id: { type: DataTypes.INTEGER, allowNull: false },
  action_type: {
    type: DataTypes.ENUM('product', 'bundle'),
    allowNull: false
  },
  model_type: {
    type: DataTypes.ENUM('subscription', 'pay_as_you_go', 'custom_quote', 'byoc', 'free'),
    allowNull: false
  },
  base_price: { type: DataTypes.DECIMAL(10, 2) },
  currency: { type: DataTypes.STRING(10) },
  details: { type: DataTypes.JSONB },
  // status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active' },
}, {
  tableName: 'pricing_models',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = PricingModel;
