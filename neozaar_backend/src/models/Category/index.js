const Category = require('../categories.js');
const SubCategory = require('../SubCategory');

// ✅ DEFINE ONLY ONCE HERE

Category.hasMany(SubCategory, {
  foreignKey: "category_id",
  as: "subcategories",
});

SubCategory.belongsTo(Category, {
  foreignKey: "category_id",
  as: "category",
});

module.exports = {
  Category,
  SubCategory,
};
