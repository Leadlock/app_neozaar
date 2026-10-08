const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize');

const IsvDetail = sequelize.define('IsvDetail', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  user_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
  cloud_partnership: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    allowNull: true,
  },
  existing_marketplace_listing: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    allowNull: true,
  },
  preferred_engagement: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  business_certification: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  neozaar_tc: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  data_privacy: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
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
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  competencies_certifications: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  sla_link: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  support_desk_email: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  signed_document: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  is_document_signed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  is_approved: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  terms_of_use_link: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  service_sub_options: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  approved_by: {
    type: DataTypes.BIGINT,
    allowNull: true,
  },
}, {
  tableName: 'isv_details',
  timestamps: false, // we already have created_at and updated_at
});


module.exports = IsvDetail;
