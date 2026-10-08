// models/NewsletterSubscriber.js
const { DataTypes, Model } = require('sequelize');
const sequelize = require('../../config/sequelize');


const NewsletterSubscriber = sequelize.define('newsletter_subscribers', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    subscribed_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'active',
      validate: {
        isIn: [['active', 'unsubscribed']],
      },
    },
    source: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
  },
  {
    modelName: 'NewsletterSubscriber',
    tableName: 'newsletter_subscribers',
    timestamps: false,
  }
);

module.exports = NewsletterSubscriber;
