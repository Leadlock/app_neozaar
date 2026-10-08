const seoService = require('../../services/seoService/seo.service');
const commonConstant = require('../../config/common.constant.js');
const uploadToSFTP = require('../../utils/azureStorage');
const DataTransformer = require('../../utils/dataTransformer');
const pool = require('../../config/database');


class SeoController {
  
    static async getSeoDataByPageUrl(req, res) {
        try {
            const { pageUrl } = req.params;
            const seoData = await seoService.getSeoDataByPageUrl(pageUrl);
            if (!seoData) {
                return res.status(404).json({[commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL, [commonConstant.VARIABLE.MESSAGE]: 'SEO data not found for the given page URL' });
            }
            res.status(200).json({
                [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.SUCCESS,
                [commonConstant.VARIABLE.DATA]: seoData,
                [commonConstant.VARIABLE.MESSAGE]: 'SEO data fetched successfully'
            });
        } catch (error) {
            res.status(500).json({
                [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.ERROR,
                [commonConstant.VARIABLE.MESSAGE]: 'Error fetching SEO data: ' + error.message
            });
        }
    }

    static async createSeoData(req, res) {
        try {
            const seoData = req.body;
            const whereCondition = {};
            if (seoData.page_id) {
                whereCondition.page_id = seoData.page_id;
            } else {
                whereCondition.page_name = seoData.page_name;
                whereCondition.page_url = seoData.page_url;
            }
            const existingRecord = await seoService.findOne(whereCondition);
            let result;

            if (existingRecord) {
                result = await seoService.updateSeoData(existingRecord.id, seoData);
                return res.status(200).json({
                    [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.SUCCESS,
                    [commonConstant.VARIABLE.MESSAGE]: 'SEO data updated successfully',
                    [commonConstant.VARIABLE.DATA]: result
                });
            }
            result = await seoService.createSeoData(seoData);
            return res.status(201).json({
                [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.SUCCESS,
                [commonConstant.VARIABLE.MESSAGE]: 'SEO data created successfully',
                [commonConstant.VARIABLE.DATA]: result
            });

        } catch (error) {
            return res.status(500).json({
                [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.ERROR,
                [commonConstant.VARIABLE.MESSAGE]: 'Error creating SEO data: ' + error.message
            });
        }
    }


    static async updateSeoData(req, res) {
        try {
            const { seoId } = req.params;
            const seoData = req.body;
            const updatedSeoData = await seoService.updateSeoData(seoId, seoData);
            if (!updatedSeoData) {
                return res.status(404).json({ message: 'SEO data not found for the given ID' });
            }
            res.status(200).json({
                [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.SUCCESS,
                [commonConstant.VARIABLE.MESSAGE]: 'SEO data updated successfully',
                [commonConstant.VARIABLE.DATA]: updatedSeoData
            });
        } catch (error) {
            res.status(500).json({
                [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.ERROR,
                [commonConstant.VARIABLE.MESSAGE]: 'Error updating SEO data: ' + error.message
            });
        }
    }

    static async deleteSeoData(req, res) {
        try {
            const { seoId } = req.params;
            const deletedSeoData = await seoService.deleteSeoData(seoId);
            if (!deletedSeoData) {
                return res.status(404).json({ 
                    [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
                    [commonConstant.VARIABLE.MESSAGE]: 'SEO data not found for the given ID'
                 });
            }
            res.status(200).json({
                [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.SUCCESS,
                [commonConstant.VARIABLE.MESSAGE]: 'SEO data deleted successfully',
                [commonConstant.VARIABLE.DATA]: deletedSeoData
            });
        } catch (error) {
            res.status(500).json({
                [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.ERROR,
                [commonConstant.VARIABLE.MESSAGE]: 'Error deleting SEO data: ' + error.message
            });
        }
    }  
    
    static async getSeoPages(req, res) {
        try {
            const { page, limit, search } = req.query;
            const seoPages = await seoService.getSeoPages({
                page: parseInt(page) || commonConstant.PAGINATION.DEFAULT_PAGE,
                limit: parseInt(limit) || commonConstant.PAGINATION.DEFAULT_LIMIT,
                search: search || ""
            });
            res.status(200).json({
                [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.SUCCESS,
                [commonConstant.VARIABLE.DATA]: seoPages,
                [commonConstant.VARIABLE.MESSAGE]: 'SEO pages fetched successfully'
            });
        } catch (error) {
            res.status(500).json({
                [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.ERROR,
                [commonConstant.VARIABLE.MESSAGE]: 'Error fetching SEO pages: ' + error.message
            });
        }
    }




}

module.exports = SeoController;
