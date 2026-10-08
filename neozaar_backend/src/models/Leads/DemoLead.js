const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize');
const LeadDetail = require('./LeadDetail');

const DemoLead = sequelize.define('DemoLead', {
  id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
  lead_id: {
    type: DataTypes.BIGINT,
    references: { model: LeadDetail, key: 'id' }
  },
  role_title: { type: DataTypes.STRING(100) },
  use_case: { type: DataTypes.TEXT }
}, {
  tableName: 'demo_leads',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});


module.exports = DemoLead;
