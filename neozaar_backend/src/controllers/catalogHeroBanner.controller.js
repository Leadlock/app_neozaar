const CatalogHeroBanner = require("../models/catalogHeroBanner");
const uploadToSFTP = require("../utils/azureStorage");
const pool = require("../config/database");

const VALID_TYPES = ["product", "service", "solution"];

class CatalogHeroBannerController {
  static async createCatalogHeroBanner(req, res) {
    try {
      const { title, label, link, catalog_type, is_feature } = req.body;

      if (!title) {
        return res.status(400).json({ status: "fail", message: "Title is required" });
      }
      if (!VALID_TYPES.includes(catalog_type)) {
        return res.status(400).json({
          status: "fail",
          message: `catalog_type must be one of: ${VALID_TYPES.join(", ")}`,
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

      const catalogHeroBanner = await CatalogHeroBanner.create({
        title,
        catalog_type,
        label: label || null,
        link: link || null,
        banner: bannerUrl,
        mobile_banner: mobileBannerUrl,
        is_feature:
          is_feature === "true" || is_feature === true || is_feature === "1",
        created_at: new Date(),
        updated_at: new Date(),
      });

      return res.status(201).json({ status: "success", data: catalogHeroBanner });
    } catch (error) {
      console.error("Error creating Catalog Hero Banner:", error);
      return res.status(500).json({ status: "fail", message: "Internal server error" });
    }
  }

  static async getCatalogHeroBanner(req, res) {
    try {
      const { page = 1, limit = 10, catalog_type } = req.query;

      const pageNum = Math.max(parseInt(page, 10) || 1, 1);
      const limitNum = Math.max(parseInt(limit, 10) || 10, 1);
      const offset = (pageNum - 1) * limitNum;

      const whereType = catalog_type && VALID_TYPES.includes(catalog_type) ? catalog_type : null;

      const dataQuery = `
        SELECT id, catalog_type, banner, mobile_banner, label, link, title, is_feature, created_at, updated_at
        FROM catalog_hero_banner
        ${whereType ? "WHERE catalog_type = $3" : ""}
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
      `;
      const countQuery = `SELECT COUNT(*) FROM catalog_hero_banner ${whereType ? "WHERE catalog_type = $1" : ""}`;

      const dataParams = whereType ? [limitNum, offset, whereType] : [limitNum, offset];
      const countParams = whereType ? [whereType] : [];

      const [dataResult, countResult] = await Promise.all([
        pool.query(dataQuery, dataParams),
        pool.query(countQuery, countParams),
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
      console.error("Error fetching Catalog Hero Banner:", error);
      return res.status(500).json({ status: "fail", message: "Internal server error" });
    }
  }

  static async getCatalogHeroBannerById(req, res) {
    try {
      const { id } = req.params;
      const catalogHeroBanner = await CatalogHeroBanner.findByPk(id);

      if (!catalogHeroBanner) {
        return res.status(404).json({ status: "fail", message: "Catalog Hero Banner not found" });
      }

      return res.status(200).json({ status: "success", data: catalogHeroBanner });
    } catch (error) {
      console.error("Error fetching Catalog Hero Banner:", error);
      return res.status(500).json({ status: "fail", message: "Internal server error" });
    }
  }

  static async updateCatalogHeroBanner(req, res) {
    const transaction = await CatalogHeroBanner.sequelize.transaction();

    try {
      const { id } = req.params;
      const { title, label, link, catalog_type, is_feature } = req.body;

      const catalogHeroBanner = await CatalogHeroBanner.findByPk(id, { transaction });

      if (!catalogHeroBanner) {
        await transaction.rollback();
        return res.status(404).json({ status: "fail", message: "Catalog Hero Banner not found" });
      }

      if (catalog_type !== undefined && !VALID_TYPES.includes(catalog_type)) {
        await transaction.rollback();
        return res.status(400).json({
          status: "fail",
          message: `catalog_type must be one of: ${VALID_TYPES.join(", ")}`,
        });
      }

      let bannerUrl = catalogHeroBanner.banner;
      if (req.files?.banner) {
        bannerUrl = await uploadToSFTP(req.files.banner[0]);
      }

      let mobileBannerUrl = catalogHeroBanner.mobile_banner;
      if (req.files?.mobile_banner) {
        mobileBannerUrl = await uploadToSFTP(req.files.mobile_banner[0]);
      }

      await catalogHeroBanner.update(
        {
          title: title || catalogHeroBanner.title,
          catalog_type: catalog_type || catalogHeroBanner.catalog_type,
          label: label ?? catalogHeroBanner.label,
          link: link ?? catalogHeroBanner.link,
          banner: bannerUrl,
          mobile_banner: mobileBannerUrl,
          is_feature:
            is_feature !== undefined
              ? is_feature === "true" || is_feature === true || is_feature === "1"
              : catalogHeroBanner.is_feature,
          updated_at: new Date(),
        },
        { transaction },
      );

      await transaction.commit();

      return res.status(200).json({
        status: "success",
        message: "Catalog Hero Banner updated successfully",
        data: catalogHeroBanner,
      });
    } catch (error) {
      await transaction.rollback();
      console.error("Error updating Catalog Hero Banner:", error);
      return res.status(500).json({ status: "fail", message: "Internal server error" });
    }
  }

  static async deleteCatalogHeroBanner(req, res) {
    const transaction = await CatalogHeroBanner.sequelize.transaction();

    try {
      const { id } = req.params;
      const catalogHeroBanner = await CatalogHeroBanner.findByPk(id, { transaction });

      if (!catalogHeroBanner) {
        await transaction.rollback();
        return res.status(404).json({ status: "fail", message: "Catalog Hero Banner not found" });
      }

      await catalogHeroBanner.destroy({ transaction });
      await transaction.commit();

      return res.status(200).json({ status: "success", message: "Catalog Hero Banner deleted successfully" });
    } catch (error) {
      await transaction.rollback();
      console.error("Error deleting Catalog Hero Banner:", error);
      return res.status(500).json({ status: "fail", message: "Internal server error" });
    }
  }

  static async toggleFeature(req, res) {
    try {
      const { id } = req.params;
      const { is_feature } = req.body;

      const item = await CatalogHeroBanner.findByPk(id);
      if (!item) {
        return res.status(404).json({ status: "fail", message: "Catalog Hero Banner not found" });
      }

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
        data: { id: item.id, is_feature: newValue },
      });
    } catch (error) {
      console.error("Error toggling feature:", error);
      return res.status(500).json({ status: "fail", message: "Internal server error" });
    }
  }

  // ✅ Public API - No Authentication Required
  // Featured banners for one catalog (product | service | solution), newest first.
  static async getMarketplaceCatalogHeroBanner(req, res) {
    try {
      const { catalogType } = req.params;
      if (!VALID_TYPES.includes(catalogType)) {
        return res.status(400).json({ status: "fail", message: "Invalid catalog type" });
      }

      const banners = await CatalogHeroBanner.findAll({
        where: { catalog_type: catalogType, is_feature: true },
        order: [["created_at", "DESC"]],
      });

      return res.status(200).json({ status: "success", data: banners });
    } catch (error) {
      console.error("Error fetching marketplace Catalog Hero Banner:", error);
      return res.status(500).json({ status: "fail", message: "Internal server error" });
    }
  }
}

module.exports = CatalogHeroBannerController;
