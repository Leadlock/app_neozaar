const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize');

const CommissionModel = sequelize.define('Commission', {
  id: { 
    type: DataTypes.BIGINT, 
    autoIncrement: true, 
    primaryKey: true 
  },
  isv_id: { 
    type: DataTypes.BIGINT, 
    allowNull: false 
  },
  commission_percentage: { 
    type: DataTypes.FLOAT, 
    allowNull: false 
  },
  approved_by: { 
    type: DataTypes.BIGINT, 
    allowNull: true 
  },
  created_at: { 
    type: DataTypes.DATE, 
    defaultValue: DataTypes.NOW 
  },updated_at: { 
    type: DataTypes.DATE, 
    defaultValue: DataTypes.NOW 
  }
}, {
  tableName: 'commissions',
   timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = CommissionModel;
