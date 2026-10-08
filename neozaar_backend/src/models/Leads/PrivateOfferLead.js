const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize');
const LeadDetail = require('./LeadDetail');

const PrivateOfferLead = sequelize.define('PrivateOfferLead', {
  id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
  lead_id: {
    type: DataTypes.BIGINT,
    references: { model: LeadDetail, key: 'id' }
  },
  aws_account_id: { type: DataTypes.STRING(20) },
  desired_pricing: { type: DataTypes.TEXT },
  term_length: { type: DataTypes.STRING(50) },
  notes: { type: DataTypes.TEXT }
}, {
  tableName: 'private_offer_leads',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});


module.exports = PrivateOfferLead;
