const SeoModel = require('../../models/SeoModel/SeoModel');
const { Op, Sequelize } = require('sequelize');
const commonConstant = require('../../config/common.constant.js');


class SeoService {

    static async findOne(whereCondition) {
        return await SeoModel.findOne({ where: whereCondition });
    }
    
    static async getSeoDataById(seoId) {
        try {
            return await SeoModel.findById(seoId);
        } catch (error) {
            throw new Error('Error fetching SEO data by ID: ' + error.message);
        }   
    }

    static async createSeoData(seoData) {
        try {
            const seoEntry = new SeoModel(seoData);
            return await seoEntry.save();
        } catch (error) {
            throw new Error('Error creating SEO data: ' + error.message);
        }
    }

    static async updateSeoData(seoId, seoData) {
        try {
            
            await SeoModel.update(seoData, {
                where: { id: seoId }
            });
            const updated = await SeoModel.findByPk(seoId);
            return updated;

        } catch (error) {
            throw new Error('Error updating SEO data: ' + error.message);
        }
    }

    static  async deleteSeoData(seoId) {
        try {
            const deleted = await SeoModel.destroy({
                where: { id: seoId }
            });
            return deleted;

        } catch (error) {
            throw new Error('Error deleting SEO data: ' + error.message);
        }   
    }

    static async getSeoDataByPageUrl(identifier) {
        try {
            const isId = /^[0-9]+$/.test(identifier);
            if (isId) {
                return await SeoModel.findByPk(identifier);
            }
            return await SeoModel.findOne({
                where: {
                    [Op.or]: [
                        { page_url: identifier },
                        { page_name: identifier }
                    ]
                }
            });
        } catch (error) {
            throw new Error('Error fetching SEO data by page URL: ' + error.message);
        }
    }  

    static async getSeoPages({ page = 1, limit = 10, search = "" }) {
    try {
        // Pagination
        page = parseInt(page, 10);
        limit = parseInt(limit, 10);
        const offset = (page - 1) * limit;

        const whereCondition = {};

        // Search logic
        if (search && search.trim()) {
        search = search.trim();

        const orConditions = [
            { page_name: { [Op.iLike]: `%${search}%` } },
            { page_url: { [Op.iLike]: `%${search}%` } },
            { meta_title: { [Op.iLike]: `%${search}%` } }
        ];

        // ✅ EQUAL TO search for BIGINT page_id
        if (!isNaN(search)) {
            orConditions.push({ page_id: Number(search) });
        }

        whereCondition[Op.or] = orConditions;
        }

        // Query
        const { rows: seoList, count: totalSeo } = await SeoModel.findAndCountAll({
        where: whereCondition,
        limit,
        offset,
        order: [['id', 'DESC']]
        });

        // Pagination response
        const pagination = commonConstant.PAGINATION.build({total: totalSeo, page, limit});

        return {
            data: seoList,
            pagination,
        };

    } catch (error) {
        console.error('getSeoPages error:', error);
        throw new Error('Error fetching SEO pages: ' + error.message);
    }
    }
        
    
}

module.exports = SeoService;
