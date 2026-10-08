// controllers/leadController.js
const leadService = require('../services/leadService.service');
const commonConstant = require('../config/common.constant.js');
const SubcribeService = require('../services/subscribeService.service');


class SubcribeController {

  async createSibscribe(req, res) {
    try {
        const subcribe = await SubcribeService.createSibscribe(req.body);
        return res.status(commonConstant.STATUS_CODES.SUCCESS).json({ status: commonConstant.VARIABLE.STATUS, subcribe });
    } catch (error) {
        return res.status(commonConstant.STATUS_CODES.BAD_REQUEST).json({ status: commonConstant.VARIABLE.FAIL, message: error.message });
    }
  }

}

module.exports = new SubcribeController();
