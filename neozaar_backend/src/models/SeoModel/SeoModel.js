const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize');

const SeoModel = sequelize.define('SeoModel', {
  id: { 
    type: DataTypes.BIGINT, 
    autoIncrement: true, 
    primaryKey: true 
  },

  page_id: { 
    type: DataTypes.BIGINT, 
    defaultValue: 0 
  },

  page_name: { 
    type: DataTypes.STRING(255), 
    allowNull: false 
  },

  page_url: { 
    type: DataTypes.STRING(255), 
    allowNull: false 
  },

  // ✅ NEW FIELDS (IMPORTANT)
  page_type: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'product | category | brand | marketplace | blog'
  },

  slug: {
    type: DataTypes.STRING(255),
    allowNull: true,
    unique: true
  },

  // ------------------------------------
  // SEO META
  // ------------------------------------
  meta_title: { type: DataTypes.STRING(255) },
  meta_description: { type: DataTypes.TEXT },
  meta_keywords: { type: DataTypes.TEXT },

  h1_title: { type: DataTypes.STRING(255) },
  canonical_url: { type: DataTypes.STRING(255) },

  // ------------------------------------
  // SCHEMA
  // ------------------------------------
  schema_markup: { type: DataTypes.TEXT },
  breadcrumb_schema: { type: DataTypes.TEXT },
  faq_schema: { type: DataTypes.TEXT },

  // ------------------------------------
  // SOCIAL SEO
  // ------------------------------------
  og_title: { type: DataTypes.STRING(255) },
  og_description: { type: DataTypes.TEXT },
  og_image: { type: DataTypes.STRING(255) },

  twitter_title: { type: DataTypes.STRING(255) },
  twitter_description: { type: DataTypes.TEXT },
  twitter_image: { type: DataTypes.STRING(255) },

  // ------------------------------------
  // ROBOTS CONTROL
  // ------------------------------------
  robots_meta: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'index, follow / noindex, nofollow'
  },

  is_follow: { 
    type: DataTypes.SMALLINT,
    defaultValue: 1,
    comment: '1 = follow, 0 = nofollow'
  },

  is_index: { 
    type: DataTypes.SMALLINT,
    defaultValue: 1,
    comment: '1 = index, 0 = noindex'
  },

  // ------------------------------------
  // STATUS
  // ------------------------------------
  status: { 
    type: DataTypes.STRING(200),
    defaultValue: 'inactive'
  },

  // ------------------------------------
  // TIMESTAMPS
  // ------------------------------------
  created_at: { 
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW 
  },

  updated_at: { 
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW 
  }

}, {
  tableName: 'seo_pages',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',

  // ✅ INDEXES (VERY IMPORTANT)
  indexes: [
    {
      unique: true,
      fields: ['slug']
    },
    {
      fields: ['page_type']
    },
    {
      fields: ['page_url']
    }
  ]
});

module.exports = SeoModel;
