const LeadDetail = require('./LeadDetail');
const DemoLead = require('./DemoLead');
const PrivateOfferLead = require('./PrivateOfferLead');
const Purchase = require('./Purchase');
const User = require('../User');
const Product = require('../product');
const LeadComment = require('./Leadcomments');

// Associations
LeadDetail.hasOne(DemoLead, { foreignKey: 'lead_id', as: 'demoLead' });
DemoLead.belongsTo(LeadDetail, { foreignKey: 'lead_id', as: 'lead' });

LeadDetail.hasOne(PrivateOfferLead, { foreignKey: 'lead_id', as: 'privateOfferLead' });
PrivateOfferLead.belongsTo(LeadDetail, { foreignKey: 'lead_id', as: 'lead' });

LeadDetail.hasOne(Purchase, { foreignKey: 'lead_id', as: 'purchase' });
Purchase.belongsTo(LeadDetail, { foreignKey: 'lead_id', as: 'lead' });

LeadDetail.belongsTo(Product, { foreignKey: 'action_id', as: 'product' });
Product.hasMany(LeadDetail, { foreignKey: 'action_id', as: 'lead_Details' });

LeadDetail.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(LeadDetail, { foreignKey: 'user_id', as: 'leads' });


LeadDetail.hasMany(LeadComment, { as: 'comments', foreignKey: 'lead_id' });
LeadComment.belongsTo(LeadDetail, { foreignKey: 'lead_id' });

LeadComment.belongsTo(User, { as: 'user', foreignKey: 'user_id' });



module.exports = {
  LeadDetail,
  DemoLead,
  PrivateOfferLead,
  Purchase,
  User,
  Product
};
