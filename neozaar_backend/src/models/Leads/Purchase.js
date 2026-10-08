const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize');
const LeadDetail = require('./LeadDetail');

const Purchase = sequelize.define('Purchase', {
  id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
  lead_id: {
    type: DataTypes.BIGINT,
    references: { model: LeadDetail, key: 'id' }
  },
  aws_account_id: { type: DataTypes.STRING(20) },
  product_id: { type: DataTypes.INTEGER, allowNull: false },
  purchase_date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  entitlement_status: { type: DataTypes.STRING(50) }
}, {
  tableName: 'purchases',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});


module.exports = Purchase;
