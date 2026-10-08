const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize');

const LeadDetail =  sequelize.define('LeadDetail', {
  id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
  status: { type: DataTypes.STRING(150) },
  type: { type: DataTypes.STRING(255), allowNull: false },
  user_id: { type: DataTypes.STRING(255) },
  action_id: { type: DataTypes.STRING(50) },
  action_for: { type: DataTypes.STRING(250) },
  action_type: { type: DataTypes.STRING(250) },
  message: { type: DataTypes.TEXT },
  remark:{
    type: DataTypes.STRING(255)
  },
  // Contact captured for leads with no linked portal user (e.g. WhatsApp bot leads)
  contact_name: { type: DataTypes.STRING(255) },
  contact_email: { type: DataTypes.STRING(255) },
  contact_phone: { type: DataTypes.STRING(50) }
}, {
  tableName: 'lead_details',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});



module.exports = LeadDetail;
