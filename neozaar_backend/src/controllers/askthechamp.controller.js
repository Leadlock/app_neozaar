const AskTheChamp = require("../models/askthechamp");
const uploadToSFTP = require("../utils/azureStorage");
const pool = require("../config/database");
const { Op } = require("sequelize");

class AskTheChampController {
  static async createAskTheChamp(req, res) {
    try {
      const { title, label, link, is_feature } = req.body;

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

      let mobileBannerUrl = null;
      if (req.files?.mobile_banner) {
        mobileBannerUrl = await uploadToSFTP(req.files.mobile_banner[0]);
      }
      const askTheChamp = await AskTheChamp.create({
        title,
        label: label || null,
        link: link || null,
        banner: bannerUrl,
        mobile_banner: mobileBannerUrl,
        is_feature: is_feature === "true" || is_feature === true || is_feature === "1",
        created_at: new Date(),
        updated_at: new Date(),
      });

      return res.status(201).json({
        status: "success",
        data: askTheChamp,
      });
    } catch (error) {
      console.error("Error creating Ask The Champ:", error);

      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }

  static async getAskTheChamp(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;

      const pageNum = Math.max(parseInt(page, 10) || 1, 1);
      const limitNum = Math.max(parseInt(limit, 10) || 10, 1);

      const offset = (pageNum - 1) * limitNum;

      const dataQuery = `
        SELECT 
          id,
          banner,
          mobile_banner,
          label,
          link,
          title,
          is_feature,
          created_at,
          updated_at
        FROM ask_the_champ
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
      `;

      const countQuery = `
        SELECT COUNT(*) FROM ask_the_champ
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
      console.error("Error fetching Ask The Champ:", error);

      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }

  static async getAskTheChampById(req, res) {
    try {
      const { id } = req.params;

      const askTheChamp = await AskTheChamp.findByPk(id);

      if (!askTheChamp) {
        return res.status(404).json({
          status: "fail",
          message: "Ask The Champ not found",
        });
      }

      return res.status(200).json({
        status: "success",
        data: askTheChamp,
      });
    } catch (error) {
      console.error("Error fetching Ask The Champ:", error);

      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }

  static async updateAskTheChamp(req, res) {
    const transaction = await AskTheChamp.sequelize.transaction();

    try {
      const { id } = req.params;
      const { title, label, link, is_feature } = req.body;

      const askTheChamp = await AskTheChamp.findByPk(id, {
        transaction,
      });

      if (!askTheChamp) {
        await transaction.rollback();

        return res.status(404).json({
          status: "fail",
          message: "Ask The Champ not found",
        });
      }

      let bannerUrl = askTheChamp.banner;

      // ✅ Upload new banner
      if (req.files?.banner) {
        bannerUrl = await uploadToSFTP(req.files.banner[0]);
      }

      let mobileBannerUrl = askTheChamp.mobile_banner;
      // ✅ Upload new mobile banner
      if (req.files?.mobile_banner) {
        mobileBannerUrl = await uploadToSFTP(req.files.mobile_banner[0]);
      }

      await askTheChamp.update(
        {
          title: title || askTheChamp.title,
          label: label ?? askTheChamp.label,
          link: link ?? askTheChamp.link,
          banner: bannerUrl,
          mobile_banner: mobileBannerUrl,
          is_feature: is_feature !== undefined ? (is_feature === "true" || is_feature === true || is_feature === "1") : askTheChamp.is_feature,
          updated_at: new Date(),
        },
        { transaction },
      );

      await transaction.commit();

      return res.status(200).json({
        status: "success",
        message: "Ask The Champ updated successfully",
        data: askTheChamp,
      });
    } catch (error) {
      await transaction.rollback();

      console.error("Error updating Ask The Champ:", error);

      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }

  static async deleteAskTheChamp(req, res) {
    const transaction = await AskTheChamp.sequelize.transaction();

    try {
      const { id } = req.params;

      const askTheChamp = await AskTheChamp.findByPk(id, {
        transaction,
      });

      if (!askTheChamp) {
        await transaction.rollback();

        return res.status(404).json({
          status: "fail",
          message: "Ask The Champ not found",
        });
      }

      await askTheChamp.destroy({ transaction });

      await transaction.commit();

      return res.status(200).json({
        status: "success",
        message: "Ask The Champ deleted successfully",
      });
    } catch (error) {
      await transaction.rollback();

      console.error("Error deleting Ask The Champ:", error);

      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }

  // ✅ Toggle featured status
  static async toggleFeature(req, res) {
    try {
      const { id } = req.params;
      const { is_feature } = req.body;

      const item = await AskTheChamp.findByPk(id);
      if (!item) {
        return res.status(404).json({ status: "fail", message: "Ask The Champ not found" });
      }

      // Determine new value: use provided value or toggle existing
      let newValue;
      if (is_feature !== undefined) {
        newValue = is_feature === true || is_feature === "true" || is_feature === "1" || is_feature === 1;
      } else {
        newValue = !item.is_feature;
      }

      await item.update({ is_feature: newValue, updated_at: new Date() });

      return res.status(200).json({
        status: "success",
        message: "Feature status updated",
        data: { id: item.id, is_feature: newValue }
      });
    } catch (error) {
      console.error("Error toggling feature:", error);
      return res.status(500).json({ status: "fail", message: "Internal server error" });
    }
  }

  // ✅ Public API - No Authentication Required
  static async getHomepageAskTheChamp(req, res) {
    try {
      const askTheChamp = await AskTheChamp.findAll({
        where: { is_feature: true },
        order: [["created_at", "DESC"]],
      });

      return res.status(200).json({
        status: "success",
        data: askTheChamp,
      });
    } catch (error) {
      console.error("Error fetching homepage Ask The Champ:", error);

      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }
}

module.exports = AskTheChampController;
