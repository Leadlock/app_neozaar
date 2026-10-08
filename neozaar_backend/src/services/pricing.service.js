// src/services/pricingService.js
const PricingModel = require('../models/Product/pricingModel');
const PricingTier = require('../models/Product/pricingTier');
const Product = require('../models/product'); 
const Bundle = require('../models/bundle'); 

class PriceService {

  // Create new pricing model (with optional tiers)
  static async createPricingModel(modelsData) {
    const createdModels = [];
    for (const data of modelsData) {
      const { tiers, ...modelData } = data;
      let relatedRecord = null;
      if (modelData.action_type === 'product') {
        relatedRecord = await Product.findByPk(modelData.action_id);
      } else if (modelData.action_type === 'bundle') {
        relatedRecord = await Bundle.findByPk(modelData.action_id);
      } else {
        throw new Error(`Unknown action_type: ${modelData.action_type}`);
      }
      if (!relatedRecord) {
        return  false;
      }
      const model = await PricingModel.create(modelData);
      if (tiers && tiers.length > 0) {
        const tierRecords = tiers.map(t => ({ ...t, pricing_model_id: model.id }));
        await PricingTier.bulkCreate(tierRecords);
      }
      const fullModel = await PricingModel.findByPk(model.id, { include: [PricingTier] });
      createdModels.push(fullModel);
    }
    return createdModels;
  }

  // Update pricing model
  static async updatePricingModel(id, data) {
    const model = await PricingModel.findByPk(id);
    if (!model) throw new Error('Pricing not found to update');
    return await model.update(data);
  }

  // Delete model (cascade deletes tiers)
  static async deletePricingModel(id) {
    const model = await PricingModel.findByPk(id);
    if (!model) throw new Error('Pricing model not found');
    await model.destroy();
    return { message: 'Deleted successfully' };
  }

  // Get models with tiers by product/bundle
  static async getAllPriceByProductIdModel(action_id, action_type) {
    return await PricingModel.findAll({
      where: { action_id, action_type },
      include: [PricingTier]
    });
  }
}


module.exports = PriceService;
