const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Bundle = sequelize.define('bundle', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  user_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  bundle_type: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  short_description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  detailed_description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  primary_business_outcome: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    allowNull: true,
    defaultValue: [],
  },
  target_customer_segments: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  licensing_model: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  delivery_mode: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  workload_types: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  supported_regions: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    allowNull: true,
    defaultValue: [],
  },
  bundle_pricing_model: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  indicative_price_range: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  free_assessment_poc: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  },
  engagement_duration: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  cloud_provider_focus: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    allowNull: true,
    defaultValue: [],
  },
  bundle_logo: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  datasheets: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    allowNull: true,
  },
  case_studies: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    allowNull: true,
  },
  demo_video_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  accept_bundle_listing_terms: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  },
  consent_data_privacy_policy: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  },
  external_support_required: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
  },

  // New fields added here
  select_isv_products: {
    type: DataTypes.ARRAY(DataTypes.BIGINT),
    allowNull: true,
    defaultValue: [],
  },
  product_role_in_bundle: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  select_spectrum_partner_services: {
    type: DataTypes.ARRAY(DataTypes.BIGINT),
    allowNull: true,
    defaultValue: [],
  },
  service_role_in_bundle: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  spectrum_partners: {
    type: DataTypes.ARRAY(DataTypes.BIGINT),
    allowNull: true,
    defaultValue: [],
  },type:{
    type: DataTypes.TEXT,
    allowNull: true,
  },
  is_drapt:{
    type: DataTypes.BOOLEAN,
    allowNull: true,
  },is_publish:{
    type: DataTypes.BOOLEAN,
    allowNull: true,
  },is_approved:{
    type: DataTypes.BOOLEAN,
    allowNull: true,
  },published_by:{
    type: DataTypes.INTEGER,
    allowNull:true
  },approved_by:{
    type: DataTypes.INTEGER,
    allowNull:true
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  tableName: 'bundles',
});

module.exports = Bundle;
