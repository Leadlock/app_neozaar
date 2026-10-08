const HeroWideBanner = require("../models/heroWideBanner");
const uploadToSFTP = require("../utils/azureStorage");
const pool = require("../config/database");

class HeroWideBannerController {
  static async createHeroWideBanner(req, res) {
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

      const heroWideBanner = await HeroWideBanner.create({
        title,
        label: label || null,
        link: link || null,
        banner: bannerUrl,
        mobile_banner: mobileBannerUrl,
        is_feature:
          is_feature === "true" || is_feature === true || is_feature === "1",
        created_at: new Date(),
        updated_at: new Date(),
      });

      return res.status(201).json({
        status: "success",
        data: heroWideBanner,
      });
    } catch (error) {
      console.error("Error creating Hero Wide Banner:", error);
      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }

  static async getHeroWideBanner(req, res) {
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
        FROM hero_wide_banner
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
      `;

      const countQuery = `SELECT COUNT(*) FROM hero_wide_banner`;

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
      console.error("Error fetching Hero Wide Banner:", error);
      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }

  static async getHeroWideBannerById(req, res) {
    try {
      const { id } = req.params;
      const heroWideBanner = await HeroWideBanner.findByPk(id);

      if (!heroWideBanner) {
        return res.status(404).json({
          status: "fail",
          message: "Hero Wide Banner not found",
        });
      }

      return res.status(200).json({
        status: "success",
        data: heroWideBanner,
      });
    } catch (error) {
      console.error("Error fetching Hero Wide Banner:", error);
      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }

  static async updateHeroWideBanner(req, res) {
    const transaction = await HeroWideBanner.sequelize.transaction();

    try {
      const { id } = req.params;
      const { title, label, link, is_feature } = req.body;

      const heroWideBanner = await HeroWideBanner.findByPk(id, { transaction });

      if (!heroWideBanner) {
        await transaction.rollback();
        return res.status(404).json({
          status: "fail",
          message: "Hero Wide Banner not found",
        });
      }

      let bannerUrl = heroWideBanner.banner;
      if (req.files?.banner) {
        bannerUrl = await uploadToSFTP(req.files.banner[0]);
      }

      let mobileBannerUrl = heroWideBanner.mobile_banner;
      if (req.files?.mobile_banner) {
        mobileBannerUrl = await uploadToSFTP(req.files.mobile_banner[0]);
      }

      await heroWideBanner.update(
        {
          title: title || heroWideBanner.title,
          label: label ?? heroWideBanner.label,
          link: link ?? heroWideBanner.link,
          banner: bannerUrl,
          mobile_banner: mobileBannerUrl,
          is_feature:
            is_feature !== undefined
              ? is_feature === "true" ||
                is_feature === true ||
                is_feature === "1"
              : heroWideBanner.is_feature,
          updated_at: new Date(),
        },
        { transaction },
      );

      await transaction.commit();

      return res.status(200).json({
        status: "success",
        message: "Hero Wide Banner updated successfully",
        data: heroWideBanner,
      });
    } catch (error) {
      await transaction.rollback();
      console.error("Error updating Hero Wide Banner:", error);
      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }

  static async deleteHeroWideBanner(req, res) {
    const transaction = await HeroWideBanner.sequelize.transaction();

    try {
      const { id } = req.params;
      const heroWideBanner = await HeroWideBanner.findByPk(id, { transaction });

      if (!heroWideBanner) {
        await transaction.rollback();
        return res.status(404).json({
          status: "fail",
          message: "Hero Wide Banner not found",
        });
      }

      await heroWideBanner.destroy({ transaction });
      await transaction.commit();

      return res.status(200).json({
        status: "success",
        message: "Hero Wide Banner deleted successfully",
      });
    } catch (error) {
      await transaction.rollback();
      console.error("Error deleting Hero Wide Banner:", error);
      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }

  static async toggleFeature(req, res) {
    try {
      const { id } = req.params;
      const { is_feature } = req.body;

      const item = await HeroWideBanner.findByPk(id);
      if (!item) {
        return res
          .status(404)
          .json({ status: "fail", message: "Hero Wide Banner not found" });
      }

      let newValue;
      if (is_feature !== undefined) {
        newValue =
          is_feature === true ||
          is_feature === "true" ||
          is_feature === "1" ||
          is_feature === 1;
      } else {
        newValue = !item.is_feature;
      }

      await item.update({ is_feature: newValue, updated_at: new Date() });

      return res.status(200).json({
        status: "success",
        message: "Feature status updated",
        data: { id: item.id, is_feature: newValue },
      });
    } catch (error) {
      console.error("Error toggling feature:", error);
      return res
        .status(500)
        .json({ status: "fail", message: "Internal server error" });
    }
  }

  // ✅ Public API - No Authentication Required
  static async getHomepageHeroWideBanner(req, res) {
    try {
      const heroWideBanner = await HeroWideBanner.findAll({
        where: { is_feature: true },
        order: [["created_at", "DESC"]],
      });

      return res.status(200).json({
        status: "success",
        data: heroWideBanner,
      });
    } catch (error) {
      console.error("Error fetching homepage Hero Wide Banner:", error);
      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }
}

module.exports = HeroWideBannerController;
