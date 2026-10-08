// models/CompanyDetail.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const CompanyDetail = sequelize.define('CompanyDetail', {
  id: {
    type: DataTypes.BIGINT,
    autoIncrement: true,
    primaryKey: true,
  },
  action_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
  action_type: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  company_name: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  registered_business_name: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  brand_name: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  brand_logo: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  company_registration_number: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  legal_entity_type: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  tax_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  headquater_country: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  website_url: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  linkedin_url: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  created_by: {
    type: DataTypes.BIGINT,
    allowNull: true,
  },
  updated_by: {
    type: DataTypes.BIGINT,
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
}, {
  tableName: 'company_detail',
  timestamps: false, 
});

module.exports = CompanyDetail;
