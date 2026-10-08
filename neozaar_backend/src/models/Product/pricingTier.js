// src/models/pricingTier.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize');
const PricingModel = require('./pricingModel');

const PricingTier = sequelize.define('PricingTier', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  pricing_model_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'pricing_models', key: 'id' },
    onDelete: 'CASCADE'
  },
  tier_name: { type: DataTypes.STRING(100), allowNull: false },
  price: { type: DataTypes.DECIMAL(10, 2) },
  currency: { type: DataTypes.STRING(10) },
  features: { type: DataTypes.JSONB },
  limits: { type: DataTypes.JSONB },
  sort_order: { type: DataTypes.INTEGER, defaultValue: 1 }
}, {
  tableName: 'pricing_tiers',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

PricingModel.hasMany(PricingTier, { foreignKey: 'pricing_model_id', onDelete: 'CASCADE' });
PricingTier.belongsTo(PricingModel, { foreignKey: 'pricing_model_id' });

module.exports = PricingTier;
