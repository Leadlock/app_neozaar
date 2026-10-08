
const Bundle = require('../models/bundle');
const Product = require('../models/product');
// const Service = require('../models/Service');

class ActionService {
  static async getActionDetail(action_type, action_id) {
    if (!action_type || !action_id) {
      throw new Error('action_type and action_id are required');
    }
    let result;
    switch (action_type) {
      case 'product':
        result = await Product.findByPk(action_id);
        result.action_type = 'product';
        break;
      // case 'bundle':
      //   result = await Bundle.findByPk(action_id);
      //   result.action_type = 'bundle';
      //   break;
      case 'service':
        result = await Product.findByPk(action_id);
        result.action_type = 'service';
        break;
      case 'solution':
        result = await Product.findByPk(action_id);
        result.action_type = 'solution';
        break;
      default:
        throw new Error(`Unknown action_type: ${action_type}`);
    }

    if (!result) {
      throw new Error(`No record found for ${action_type} with ID ${action_id}`);
    }

    return result;
  }
}

module.exports = ActionService;
