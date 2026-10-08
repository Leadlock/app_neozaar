const HeroCarousel = require("../models/heroCarousel");
const uploadToSFTP = require("../utils/azureStorage");
const pool = require("../config/database");

class HeroCarouselController {
  static async createHeroCarousel(req, res) {
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

      const heroCarousel = await HeroCarousel.create({
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
        data: heroCarousel,
      });
    } catch (error) {
      console.error("Error creating Hero Carousel:", error);
      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }

  static async getHeroCarousel(req, res) {
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
        FROM hero_carousel
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
      `;

      const countQuery = `SELECT COUNT(*) FROM hero_carousel`;

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
      console.error("Error fetching Hero Carousel:", error);
      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }

  static async getHeroCarouselById(req, res) {
    try {
      const { id } = req.params;
      const heroCarousel = await HeroCarousel.findByPk(id);

      if (!heroCarousel) {
        return res.status(404).json({
          status: "fail",
          message: "Hero Carousel not found",
        });
      }

      return res.status(200).json({
        status: "success",
        data: heroCarousel,
      });
    } catch (error) {
      console.error("Error fetching Hero Carousel:", error);
      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }

  static async updateHeroCarousel(req, res) {
    const transaction = await HeroCarousel.sequelize.transaction();

    try {
      const { id } = req.params;
      const { title, label, link, is_feature } = req.body;

      const heroCarousel = await HeroCarousel.findByPk(id, { transaction });

      if (!heroCarousel) {
        await transaction.rollback();
        return res.status(404).json({
          status: "fail",
          message: "Hero Carousel not found",
        });
      }

      let bannerUrl = heroCarousel.banner;
      if (req.files?.banner) {
        bannerUrl = await uploadToSFTP(req.files.banner[0]);
      }

      let mobileBannerUrl = heroCarousel.mobile_banner;
      if (req.files?.mobile_banner) {
        mobileBannerUrl = await uploadToSFTP(req.files.mobile_banner[0]);
      }

      await heroCarousel.update(
        {
          title: title || heroCarousel.title,
          label: label ?? heroCarousel.label,
          link: link ?? heroCarousel.link,
          banner: bannerUrl,
          mobile_banner: mobileBannerUrl,
          is_feature:
            is_feature !== undefined
              ? is_feature === "true" ||
                is_feature === true ||
                is_feature === "1"
              : heroCarousel.is_feature,
          updated_at: new Date(),
        },
        { transaction },
      );

      await transaction.commit();

      return res.status(200).json({
        status: "success",
        message: "Hero Carousel updated successfully",
        data: heroCarousel,
      });
    } catch (error) {
      await transaction.rollback();
      console.error("Error updating Hero Carousel:", error);
      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }

  static async deleteHeroCarousel(req, res) {
    const transaction = await HeroCarousel.sequelize.transaction();

    try {
      const { id } = req.params;
      const heroCarousel = await HeroCarousel.findByPk(id, { transaction });

      if (!heroCarousel) {
        await transaction.rollback();
        return res.status(404).json({
          status: "fail",
          message: "Hero Carousel not found",
        });
      }

      await heroCarousel.destroy({ transaction });
      await transaction.commit();

      return res.status(200).json({
        status: "success",
        message: "Hero Carousel deleted successfully",
      });
    } catch (error) {
      await transaction.rollback();
      console.error("Error deleting Hero Carousel:", error);
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

      const item = await HeroCarousel.findByPk(id);
      if (!item) {
        return res
          .status(404)
          .json({ status: "fail", message: "Hero Carousel not found" });
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
  static async getHomepageHeroCarousel(req, res) {
    try {
      const heroCarousel = await HeroCarousel.findAll({
        where: { is_feature: true },
        order: [["created_at", "DESC"]],
      });

      return res.status(200).json({
        status: "success",
        data: heroCarousel,
      });
    } catch (error) {
      console.error("Error fetching homepage Hero Carousel:", error);
      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }
}

module.exports = HeroCarouselController;
