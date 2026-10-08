const PriceService = require('../services/pricing.service');
const commonConstant = require('../config/common.constant.js');
const pool = require('../config/database');


class PriceController {

// Create Pricing Model
  static async createPricing(req, res) {
    try {
      if (!Array.isArray(req.body)) {
        return res.status(400).json({
          [commonConstant.VARIABLE.STATUS] : commonConstant.VARIABLE.ERROR,
          [commonConstant.VARIABLE.CODE]: commonConstant.STATUS_CODES.BAD_REQUEST,
          [commonConstant.VARIABLE.MESSAGE]: 'Request body must be an array of pricing models',
          [commonConstant.VARIABLE.DATA]: null
        });
      }

      const model = await PriceService.createPricingModel(req.body);
      if(model === false){
        return  res.status(404).json({
          [commonConstant.VARIABLE.STATUS] : commonConstant.VARIABLE.ERROR,
          [commonConstant.VARIABLE.CODE]: commonConstant.STATUS_CODES.NOT_FOUND,
          [commonConstant.VARIABLE.MESSAGE]: "Related product or bundle not found",
          [commonConstant.VARIABLE.DATA]: null
        });
      }
      res.status(200).json({
        [commonConstant.VARIABLE.STATUS] : commonConstant.VARIABLE.SUCCESS,
        [commonConstant.VARIABLE.CODE]: commonConstant.STATUS_CODES.SUCCESS,
        [commonConstant.VARIABLE.MESSAGE]: "Price created successfull",
        [commonConstant.VARIABLE.DATA]: model
      });
    } catch (err) {
      res.status(500).json({
        [commonConstant.VARIABLE.STATUS] : commonConstant.VARIABLE.ERROR,
        [commonConstant.VARIABLE.CODE]: commonConstant.STATUS_CODES.SERVER_ERROR,
        [commonConstant.VARIABLE.MESSAGE]: err.message,
        [commonConstant.VARIABLE.DATA]: null
      });
    }
  }

  // Update Pricing Model
  static async updatePricing(req, res) {
    try {
      const { id } = req.params;
      const model = await PriceService.updatePricingModel(id, req.body);
      res.status(200).json({
        [commonConstant.VARIABLE.STATUS] : commonConstant.VARIABLE.SUCCESS,
        [commonConstant.VARIABLE.CODE]: commonConstant.STATUS_CODES.SUCCESS,
        [commonConstant.VARIABLE.MESSAGE]: "Price updated successfull",
        [commonConstant.VARIABLE.DATA]: model
      });
    } catch (err) {
      res.status(404).json({
        [commonConstant.VARIABLE.STATUS] : commonConstant.VARIABLE.ERROR,
        [commonConstant.VARIABLE.CODE]: commonConstant.STATUS_CODES.SERVER_ERROR,
        [commonConstant.VARIABLE.MESSAGE]: err.message,
        [commonConstant.VARIABLE.DATA]: null
      });
    }
  }

  // Delete Pricing Model
  static async deletePrice(req, res) {
    try {
      const { id } = req.params;
      const result = await PriceService.deletePricingModel(id);
      res.status(200).json({
        [commonConstant.VARIABLE.STATUS] : commonConstant.VARIABLE.SUCCESS,
        [commonConstant.VARIABLE.CODE]: commonConstant.STATUS_CODES.SUCCESS,
        [commonConstant.VARIABLE.MESSAGE]: "Price deleted successfull",
        [commonConstant.VARIABLE.DATA]: null
      });
    } catch (err) {
      res.status(404).json({
       [commonConstant.VARIABLE.STATUS] : commonConstant.VARIABLE.ERROR,
        [commonConstant.VARIABLE.CODE]: commonConstant.STATUS_CODES.SERVER_ERROR,
        [commonConstant.VARIABLE.MESSAGE]: err.message,
        [commonConstant.VARIABLE.DATA]: null
      });
    }
  }

  // Get all pricing models by product or bundle
  static async getAllPriceByProductId(req, res) {
    try {
      const { action_id, action_type } = req.body; 
      const models = await PriceService.getAllPriceByProductIdModel(action_id, action_type);
      res.status(200).json({
        [commonConstant.VARIABLE.STATUS] : commonConstant.VARIABLE.SUCCESS,
        [commonConstant.VARIABLE.CODE]: commonConstant.STATUS_CODES.SUCCESS,
        [commonConstant.VARIABLE.MESSAGE]: "Price retrieved successfull",
        [commonConstant.VARIABLE.DATA]: models
      });
    } catch (err) {
      res.status(500).json({
       [commonConstant.VARIABLE.STATUS] : commonConstant.VARIABLE.ERROR,
        [commonConstant.VARIABLE.CODE]: commonConstant.STATUS_CODES.SERVER_ERROR,
        [commonConstant.VARIABLE.MESSAGE]: err.message,
        [commonConstant.VARIABLE.DATA]: null
      });
    }
  }

}

module.exports = PriceController;
