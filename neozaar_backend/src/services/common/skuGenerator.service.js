const xlsx = require('xlsx');
const pool = require('../../config/database');
const { PAGINATION } = require('../../config/common.constant');
const commonConstant = require('../../config/common.constant.js');
const Product = require('../../models/product');
const { Op } = require('sequelize');

class SkuGeneratorService {
  
    static async generateSku(nextSKU = 0) {
        try {
            const prefix = 'NEO';
            const year = new Date().getFullYear();
            const lastProduct = await Product.findOne({
                where: { sku_id: { [Op.like]: `${prefix}-${year}-%` } },
                order: [['id', 'DESC']]
            });
            let nextCode = 1001; 
            if (lastProduct) {
                const match = lastProduct.sku_id.match(/-(\d+)$/);
                if (match) nextCode = parseInt(match[1]) + 1 + nextSKU;
            }
            console.log(`Generated ${nextSKU} SKU: ${prefix}-${year}-${nextCode}`);
            return `${prefix}-${year}-${nextCode}`;
        } catch (error) {
            throw new Error('Error generating SKU: ' + error.message);
        }
    }

}


module.exports = SkuGeneratorService;
