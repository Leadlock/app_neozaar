const Homemaster = require("../models/homemaster");
const uploadToSFTP = require("../utils/azureStorage");
const pool = require("../config/database");
const { Op } = require("sequelize");

class HomemasterController {
  static async createHomemaster(req, res) {
    try {
      const {
        title, color_title, subtitle, label, link, is_feature,
        title_color_type, title_color, title_color_end, title_color_direction,
        color_title_color_type, color_title_color, color_title_color_end, color_title_color_direction,
        subtitle_color_type, subtitle_color, subtitle_color_end, subtitle_color_direction,
      } = req.body;
      if (!title) {
        return res.status(400).json({
          status: "fail",
          message: "Title is required",
        });
      }
      let bannerUrl = null;
      if (req.files?.banner) {
        bannerUrl = await uploadToSFTP(req.files.banner[0]);
      }
      const homemaster = await Homemaster.create({
        title,
        color_title: color_title || null,
        subtitle: subtitle || null,
        label: label || null,
        link: link || null,
        banner: bannerUrl,
        is_feature: is_feature || null,
        title_color_type: title_color_type || 'solid',
        title_color: title_color || '#ffffff',
        title_color_end: title_color_end || null,
        title_color_direction: title_color_direction || 'to right',
        color_title_color_type: color_title_color_type || 'solid',
        color_title_color: color_title_color || '#F97316',
        color_title_color_end: color_title_color_end || null,
        color_title_color_direction: color_title_color_direction || 'to right',
        subtitle_color_type: subtitle_color_type || 'solid',
        subtitle_color: subtitle_color || '#d1d5db',
        subtitle_color_end: subtitle_color_end || null,
        subtitle_color_direction: subtitle_color_direction || 'to right',
        created_at: new Date(),
        updated_at: new Date(),
      });
      res.status(201).json({
        status: "success",
        data: homemaster,
      });
    } catch (error) {
      console.error("Error creating homemaster:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to create homemaster",
      });
    }
  }

  static async getHomemaster(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;

      const pageNum = Math.max(parseInt(page, 10) || 1, 1);
      const limitNum = Math.max(parseInt(limit, 10) || 10, 1);

      const offset = (pageNum - 1) * limitNum;

      const dataQuery = `
      SELECT
        id,
        title,
        color_title,
        subtitle,
        banner,
        label,
        link,
        is_feature,
        title_color_type,
        title_color,
        title_color_end,
        title_color_direction,
        color_title_color_type,
        color_title_color,
        color_title_color_end,
        color_title_color_direction,
        subtitle_color_type,
        subtitle_color,
        subtitle_color_end,
        subtitle_color_direction,
        created_at,
        updated_at
      FROM home_master
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;

      const countQuery = `
      SELECT COUNT(*) FROM home_master
    `;

      const [dataResult, countResult] = await Promise.all([
        pool.query(dataQuery, [limitNum, offset]),
        pool.query(countQuery),
      ]);

      const total = parseInt(countResult.rows[0].count, 10);

      return res.status(200).json({
        status: "success",
        data: dataResult.rows,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          total_pages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      console.error("Error fetching Home Master:", error);

      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }

  static async updateHomemaster(req, res) {
    try {
      const { id } = req.params;
      const {
        title, color_title, subtitle, label, link, is_feature,
        title_color_type, title_color, title_color_end, title_color_direction,
        color_title_color_type, color_title_color, color_title_color_end, color_title_color_direction,
        subtitle_color_type, subtitle_color, subtitle_color_end, subtitle_color_direction,
      } = req.body;
      const homemaster = await Homemaster.findByPk(id);
      if (!homemaster) {
        return res.status(404).json({
          status: "fail",
          message: "Homemaster not found",
        });
      }
      let bannerUrl = homemaster.banner;
      if (req.files?.banner) {
        bannerUrl = await uploadToSFTP(req.files.banner[0]);
      }
      await homemaster.update({
        title: title || homemaster.title,
        color_title: color_title !== undefined ? color_title : homemaster.color_title,
        subtitle: subtitle !== undefined ? subtitle : homemaster.subtitle,
        label: label !== undefined ? label : homemaster.label,
        link: link !== undefined ? link : homemaster.link,
        is_feature: is_feature !== undefined ? is_feature : homemaster.is_feature,
        banner: bannerUrl,
        title_color_type: title_color_type || homemaster.title_color_type,
        title_color: title_color || homemaster.title_color,
        title_color_end: title_color_end !== undefined ? title_color_end : homemaster.title_color_end,
        title_color_direction: title_color_direction || homemaster.title_color_direction,
        color_title_color_type: color_title_color_type || homemaster.color_title_color_type,
        color_title_color: color_title_color || homemaster.color_title_color,
        color_title_color_end: color_title_color_end !== undefined ? color_title_color_end : homemaster.color_title_color_end,
        color_title_color_direction: color_title_color_direction || homemaster.color_title_color_direction,
        subtitle_color_type: subtitle_color_type || homemaster.subtitle_color_type,
        subtitle_color: subtitle_color || homemaster.subtitle_color,
        subtitle_color_end: subtitle_color_end !== undefined ? subtitle_color_end : homemaster.subtitle_color_end,
        subtitle_color_direction: subtitle_color_direction || homemaster.subtitle_color_direction,
        updated_at: new Date(),
      });
      res.status(200).json({
        status: "success",
        data: homemaster,
      });
    } catch (error) {
      console.error("Error updating homemaster:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to update homemaster",
      });
    }
  }

  static async getHomemasterById(req, res) {
    try {
      const { id } = req.params;
      const askTheChamp = await Homemaster.findByPk(id);
      if (!askTheChamp) {
        return res.status(404).json({
          status: "fail",
          message: "Homemaster not found",
        });
      }
      res.status(200).json({
        status: "success",
        data: askTheChamp,
      });
    } catch (error) {
      console.error("Error fetching homemaster by ID:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to fetch homemaster",
      });
    }
  }

  static async deleteHomemaster(req, res) {
    try {
      const { id } = req.params;
      const homemaster = await Homemaster.findByPk(id);
      if (!homemaster) {
        return res.status(404).json({
          status: "fail",
          message: "Homemaster not found",
        });
      }
      await homemaster.destroy();
      res.status(200).json({
        status: "success",
        message: "Homemaster deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting homemaster:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to delete homemaster",
      });
    }
  }

  // ✅ Public API - No Authentication Required
  static async getPublicHomemaster(req, res) {
    try {
      const homemaster = await Homemaster.findOne({
        order: [["created_at", "DESC"]],
      });
      res.status(200).json({
        status: "success",
        data: homemaster,
      });
    } catch (error) {
      console.error("Error fetching public homemaster:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to fetch homemaster",
      });
    }
  }
}

module.exports = HomemasterController;
