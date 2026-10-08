const Product = require('../product');
const SeoModel = require('./SeoModel');

// SAFETY CHECKS
if (!(Product.prototype instanceof require('sequelize').Model)) {
  throw new Error("Product is NOT a Sequelize Model");
}
if (!(SeoModel.prototype instanceof require('sequelize').Model)) {
  throw new Error("SeoModel is NOT a Sequelize Model");
}

// 🔗 Define associations centrally
Product.hasOne(SeoModel, {
  foreignKey: 'page_id',
  sourceKey: 'id',
  as: 'seo'
});

SeoModel.belongsTo(Product, {
  foreignKey: 'page_id',
  targetKey: 'id',
  as: 'product'
});

module.exports = {
  Product,
  SeoModel
};
