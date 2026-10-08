const IsvDetail = require('../ISVModel/IsvDetail');
const User = require('../User');
const CompanyDetail = require('../CompanyDetail');

User.hasOne(IsvDetail, { foreignKey: 'user_id', as: 'isv_detail' });
IsvDetail.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Direct User → CompanyDetail (for SUPPORT_PARTNER, AGENT who don't have isv_detail)
User.hasOne(CompanyDetail, { foreignKey: 'action_id', as: 'company_details' });
CompanyDetail.belongsTo(User, { foreignKey: 'action_id', as: 'user_direct' });

IsvDetail.hasOne(CompanyDetail, {
  foreignKey: 'action_id',
  as: 'company_detail',
  scope: {
    action_type: 'ISV',
  },
});
CompanyDetail.belongsTo(IsvDetail, { foreignKey: 'action_id', as: 'isv_detail' });


module.exports = {
  User,
  IsvDetail,
  CompanyDetail,
};
