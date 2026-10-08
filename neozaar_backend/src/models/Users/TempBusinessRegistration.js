const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize');

const TempBusinessRegistration = sequelize.define('TempBusinessRegistration', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      unique: true
    },
    business_data: {
      type: DataTypes.JSONB,
      allowNull: false
    },
    email_verification_token: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  },
  {
    sequelize,
    modelName: 'TempBusinessRegistration',
    tableName: 'temp_business_registration',
    timestamps: false 
  }
);

module.exports = TempBusinessRegistration;
