const { DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

const Product = sequelize.define(
  "product",
  {
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
      allowNull: true,
    },
    short_description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    long_description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    key_features: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    primary_use_cases: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    target_audience: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: true,
    },
    category_subcategory: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: true,
    },
    cloud_provider_support: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: true,
    },
    regions_supported: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: true,
    },
    cta_model: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: true,
    },
    technical_prerequisites: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    pricing_model: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    billing_dimension: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    license_model: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    free_trial_available: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    sku_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    api_metering_endpoint: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    sla_documents: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: true,
    },
    product_logo: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    screenshots: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: true,
    },
    brochures: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: true,
    },
    demo_video_link: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    customer_case_studies: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: true,
    },
    privacy_policy_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    compliance_certifications: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: true,
    },
    export_control_info: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    accept_marketplace_terms: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    consent_data_privacy_policy: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    type: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    is_drapt: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    is_publish: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    is_approved: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    published_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    approved_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    remark: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    is_import: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    is_feature: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    industry: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: true,
    },
    terms_of_use_url: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    oem_sku: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    action_type: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        isIn: [["product", "service", "solution"]],
      },
    },
    action_for: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        isIn: [["customer", "ISV", "both", "all"]],
      },
    },
    starting_price: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    solution_differentiator: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    risks_addressed: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    brand_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    category: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: true,
    },
    subcategory: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: true,
    },
    target_segments: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: true,
    },
    customer_challenges: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: true,
      defaultValue: [],
    },
    use_cases: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: true,
      defaultValue: [],
    },
    primary_business_outcome: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: true,
      defaultValue: [],
    },
    slug: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
    },
    select_isv_products: {
      type: DataTypes.ARRAY(DataTypes.BIGINT),
      allowNull: true,
      defaultValue: [],
    },
    select_spectrum_partner_services: {
      type: DataTypes.ARRAY(DataTypes.BIGINT),
      allowNull: true,
      defaultValue: [],
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: true,
      defaultValue: [],
    },
  },
  {
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    tableName: "products",
    paranoid: true,
    deletedAt: "deleted_at",
  },
);

module.exports = Product;
