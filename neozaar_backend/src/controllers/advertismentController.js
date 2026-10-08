const Advertisment = require("../models/advertisment");
const uploadToSFTP = require("../utils/azureStorage");
const pool = require("../config/database");
const { Op } = require("sequelize");
const Product = require("../models/product");

class AdvertismentController {

  static async getAdsForPage(req, res) {
    try {
      const {
        page = "homepage",
        product_id,
        category_name: requestedCategory,
      } = req.query;

      // ==========================
      // HOMEPAGE
      // ==========================
      if (page === "homepage") {
        const ads = await Advertisment.findAll({
          where: {
            page_type: "homepage",
            is_feature: true,
          },
          order: [["created_at", "DESC"]],
        });

        return res.status(200).json({
          status: "success",
          data: ads,
        });
      }

      // ==========================
      // PRODUCT PAGE
      // ==========================
      if (page === "product") {
        let categories = [];

        // Get product categories
        if (product_id) {
          const product = await Product.findByPk(product_id, {
            attributes: ["id", "category"],
          });

          console.log("Product:", product?.toJSON());

          if (product?.category) {
            categories = Array.isArray(product.category)
              ? product.category
              : String(product.category)
                  .split(",")
                  .map((c) => c.trim())
                  .filter(Boolean);
          }
        }

        // Fallback to query parameter
        if (!categories.length && requestedCategory) {
          categories = String(requestedCategory)
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean);
        }

        console.log("Requested Categories:", categories);

        const findBestAd = async (position) => {
          // ==========================
          // 1. Product Specific Ad
          // ==========================
          if (product_id) {
            const productAd = await Advertisment.findOne({
              where: {
                page_type: "product",
                ads_position: position,
                product_id: Number(product_id),
              },
              order: [["created_at", "DESC"]],
            });

            if (productAd) {
              console.log(`${position} Product Ad Found`, productAd.id);
              return productAd;
            }
          }

          // ==========================
          // 2. Category Specific Ad
          // ==========================
          if (categories.length) {
            const categoryAds = await Advertisment.findAll({
              where: {
                page_type: "product",
                ads_position: position,
              },
              order: [["created_at", "DESC"]],
            });

            console.log(
              `${position} Category Ads`,
              categoryAds.map((a) => ({
                id: a.id,
                category_name: a.category_name,
              })),
            );

            const categoryAd = categoryAds.find((ad) => {
              if (!ad.category_name) {
                return false;
              }

              const adCategory = String(ad.category_name).trim().toLowerCase();

              return categories.some(
                (reqCat) => adCategory === String(reqCat).trim().toLowerCase(),
              );
            });

            if (categoryAd) {
              console.log(`${position} Category Ad Found`, categoryAd.id);
              return categoryAd;
            }
          }

          // ==========================
          // 3. Global Ad
          // ==========================
          const globalAd = await Advertisment.findOne({
            where: {
              page_type: "product",
              ads_position: position,
              ads_type: "all",
            },
            order: [["created_at", "DESC"]],
          });

          // console.log(`${position} Global Ad:`, globalAd?.id);

          return globalAd || null;
        };

        const [leftAd, rightAd] = await Promise.all([
          findBestAd("left"),
          findBestAd("right"),
        ]);

        return res.status(200).json({
          status: "success",
          data: {
            left: leftAd,
            right: rightAd,
          },
        });
      }

      return res.status(400).json({
        status: "fail",
        message: "Invalid page type",
      });
    } catch (error) {
      console.error("Error fetching ads:", error);

      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }


  static async getAdsForPage(req, res) {
    try {
      const {
        page = "homepage",
        product_id,
        category_name: requestedCategory,
      } = req.query;

      // ==========================
      // HOMEPAGE
      // ==========================
      if (page === "homepage") {
        const ads = await Advertisment.findAll({
          where: {
            page_type: "homepage",
            is_feature: true,
          },
          order: [["created_at", "DESC"]],
        });

        return res.status(200).json({
          status: "success",
          data: ads,
        });
      }

      // ==========================
      // PRODUCT PAGE
      // ==========================
      if (page === "product") {
        let categories = [];

        // --------------------------
        // Product Categories
        // --------------------------
        if (product_id) {
          const product = await Product.findByPk(product_id, {
            attributes: ["id", "category"],
          });

          // console.log("Product:", product?.toJSON());

          if (product?.category) {
            const productCategories = Array.isArray(product.category)
              ? product.category
              : String(product.category)
                  .split(",")
                  .map((c) => c.trim())
                  .filter(Boolean);

            categories.push(...productCategories);
          }
        }

        // --------------------------
        // Request Categories
        // --------------------------
        if (requestedCategory) {
          const requestCategories = String(requestedCategory)
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean);

          categories.push(...requestCategories);
        }

        // Remove duplicates
        categories = [...new Set(categories)];

        // console.log("Final Categories:", categories);

        const findBestAd = async (position) => {
          // ==========================
          // 1. Product Ad
          // ==========================
          if (product_id) {
            const productAd = await Advertisment.findOne({
              where: {
                page_type: "product",
                ads_position: position,
                product_id: Number(product_id),
              },
              order: [["created_at", "DESC"]],
            });

            if (productAd) {
              console.log(`${position}: Product Ad`, productAd.id);
              return productAd;
            }
          }

          // ==========================
          // 2. Category Ad
          // ==========================
          if (categories.length) {
            const categoryAds = await Advertisment.findAll({
              where: {
                page_type: "product",
                ads_position: position,
              },
              order: [["created_at", "DESC"]],
            });

            const categoryAd = categoryAds.find((ad) => {
              if (!ad.category_name) {
                return false;
              }

              const adCategory = String(ad.category_name).trim().toLowerCase();

              return categories.some(
                (cat) => adCategory === String(cat).trim().toLowerCase(),
              );
            });

            if (categoryAd) {
              console.log(`${position}: Category Ad`, categoryAd.id);
              return categoryAd;
            }
          }

          // ==========================
          // 3. Global Ad
          // ==========================
          const globalAd = await Advertisment.findOne({
            where: {
              page_type: "product",
              ads_position: position,
              category_name: null,
              product_id: null,
            },
            order: [["created_at", "DESC"]],
          });

          if (globalAd) {
            console.log(`${position}: Global Ad`, globalAd.id);
          }

          return globalAd || null;
        };

        const [leftAd, rightAd] = await Promise.all([
          findBestAd("left"),
          findBestAd("right"),
        ]);

        return res.status(200).json({
          status: "success",
          data: {
            left: leftAd,
            right: rightAd,
          },
        });
      }

      return res.status(400).json({
        status: "fail",
        message: "Invalid page type",
      });
    } catch (error) {
      console.error("Error fetching ads:", error);

      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }

  static async createAdvertisment(req, res) {
    try {
      const {
        title,
        subtitle,
        label,
        link,
        is_feature,
        page_type,
        ads_type,
        ads_position,
        product_id,
        category_name,
        from_date,
        to_date,
      } = req.body;

      if (!title) {
        return res.status(400).json({
          status: "fail",
          message: "Title is required",
        });
      }

      let imageUrl = null;
      if (req.files?.image) {
        imageUrl = await uploadToSFTP(req.files.image[0]);
      }

      let mobileBannerUrl = null;
      if (req.files?.mobile_banner) {
        mobileBannerUrl = await uploadToSFTP(req.files.mobile_banner[0]);
      }

      const advertisment = await Advertisment.create({
        title,
        subtitle: subtitle || null,
        label: label || null,
        link: link || null,
        image: imageUrl,
        mobile_banner: mobileBannerUrl,
        is_feature: is_feature || false,
        page_type: page_type || "homepage", // ✅ added here
        ads_type: ads_type || null,
        ads_position: ads_position || null,
        product_id: product_id || null,
        category_name: category_name || null, // ✅ added here
        from_date: from_date || null,
        to_date: to_date || null,
        created_at: new Date(),
        updated_at: new Date(),
      });

      return res.status(201).json({
        status: "success",
        data: advertisment,
      });
    } catch (error) {
      console.error("Error creating advertisment:", error);
      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }

  static async updateAdvertisment(req, res) {
    const transaction = await Advertisment.sequelize.transaction();

    try {
      const { id } = req.params;

      const {
        title,
        subtitle,
        label,
        link,
        is_feature,
        page_type,
        ads_type,
        ads_position,
        product_id,
        category_name,
        from_date,
        to_date,
      } = req.body;

      // Validate ID
      if (!id) {
        await transaction.rollback();

        return res.status(400).json({
          status: "fail",
          message: "Advertisment ID is required",
        });
      }

      // Find Advertisement
      const advertisment = await Advertisment.findByPk(id, {
        transaction,
      });

      if (!advertisment) {
        await transaction.rollback();

        return res.status(404).json({
          status: "fail",
          message: "Advertisment not found",
        });
      }

      // Check duplicate title
      if (title && title !== advertisment.title) {
        const existing = await Advertisment.findOne({
          where: {
            title,
            id: {
              [Op.ne]: id,
            },
          },
          transaction,
        });

        if (existing) {
          await transaction.rollback();

          return res.status(400).json({
            status: "fail",
            message: "Advertisment with this title already exists",
          });
        }
      }

      // Normalize is_feature
      let parsedIsFeature = advertisment.is_feature;

      if (is_feature !== undefined) {
        if (
          is_feature === true ||
          is_feature === "true" ||
          is_feature === 1 ||
          is_feature === "1"
        ) {
          parsedIsFeature = true;
        } else if (
          is_feature === false ||
          is_feature === "false" ||
          is_feature === 0 ||
          is_feature === "0"
        ) {
          parsedIsFeature = false;
        }
      }

      // Handle image upload
      let imageUrl = advertisment.image;

      if (req.files?.image?.[0]) {
        const newImage = await uploadToSFTP(req.files.image[0]);

        if (advertisment.image) {
          try {
            await deleteFromSFTP(advertisment.image);
          } catch (err) {
            console.warn("Failed to delete old image:", err.message);
          }
        }

        imageUrl = newImage;
      }

      // Handle mobile banner upload
      let mobileBannerUrl = advertisment.mobile_banner;
      if (req.files?.mobile_banner?.[0]) {
        mobileBannerUrl = await uploadToSFTP(req.files.mobile_banner[0]);
      }

      // Normalize product_id
      let normalizedProductId = advertisment.product_id;

      if (
        product_id === "" ||
        product_id === null ||
        product_id === undefined ||
        product_id === "null"
      ) {
        normalizedProductId = null;
      } else {
        const parsedProductId = parseInt(product_id, 10);

        if (isNaN(parsedProductId)) {
          await transaction.rollback();

          return res.status(400).json({
            status: "fail",
            message: "Invalid product_id",
          });
        }

        normalizedProductId = parsedProductId;
      }

      // Normalize ads_type
      const normalizedAdsType =
        ads_type === "" ||
        ads_type === null ||
        ads_type === undefined ||
        ads_type === "null"
          ? null
          : ads_type;

      // Normalize ads_position
      const normalizedAdsPosition =
        ads_position === "" ||
        ads_position === null ||
        ads_position === undefined ||
        ads_position === "null"
          ? null
          : ads_position;
      // Update Advertisement
      await advertisment.update(
        {
          title: title || advertisment.title,
          subtitle: subtitle ?? advertisment.subtitle,
          label: label ?? advertisment.label,
          link: link ?? advertisment.link,
          is_feature: parsedIsFeature,
          category_name: category_name || null, // ✅ added here
          page_type:
            page_type === "" ||
            page_type === null ||
            page_type === undefined ||
            page_type === "null"
              ? null
              : page_type,

          ads_type: normalizedAdsType,
          ads_position: normalizedAdsPosition,
          product_id: normalizedProductId,
          from_date:
            from_date === "" ||
            from_date === null ||
            from_date === undefined ||
            from_date === "null"
              ? null
              : from_date,

          to_date:
            to_date === "" ||
            to_date === null ||
            to_date === undefined ||
            to_date === "null"
              ? null
              : to_date,
          image: imageUrl,
          mobile_banner: mobileBannerUrl,
          updated_at: new Date(),
        },
        {
          transaction,
        },
      );

      await transaction.commit();

      return res.status(200).json({
        status: "success",
        message: "Advertisment updated successfully",
        data: advertisment,
      });
    } catch (error) {
      await transaction.rollback();

      console.error("Error updating advertisment:", error);

      return res.status(500).json({
        status: "fail",
        message: error.message || "Internal server error",
      });
    }
  }

  static async getAdvertisments(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const pageNum = Math.max(parseInt(page, 10) || 1, 1);
      const limitNum = Math.max(parseInt(limit, 10) || 10, 1);
      const offset = (pageNum - 1) * limitNum;

      const dataQuery = `
      SELECT
        id,
        title,
        subtitle,
        image,
        mobile_banner,
        label,
        link,
        is_feature,
        created_at,
        updated_at,
        page_type,
        ads_type,
        ads_position,
        product_id,
        category_name,
        from_date,
        to_date
      FROM advertisment
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;

      const countQuery = `SELECT COUNT(*) FROM advertisment`;

      const [dataResult, countResult] = await Promise.all([
        pool.query(dataQuery, [limitNum, offset]),
        pool.query(countQuery),
      ]);

      const total = parseInt(countResult.rows[0].count, 10);
      const totalPages = Math.ceil(total / limitNum);
      const hasNext = pageNum < totalPages;
      const hasPrev = pageNum > 1;
      const nextPage = hasNext ? pageNum + 1 : null;
      const prevPage = hasPrev ? pageNum - 1 : null;

      const generatePages = () => {
        const pages = [];
        if (totalPages <= 5) {
          for (let i = 1; i <= totalPages; i++) {
            pages.push(i);
          }
        } else {
          pages.push(1);

          if (pageNum > 3) pages.push("...");

          for (
            let i = Math.max(2, pageNum - 1);
            i <= Math.min(totalPages - 1, pageNum + 1);
            i++
          ) {
            if (!pages.includes(i)) pages.push(i);
          }

          if (pageNum < totalPages - 2) pages.push("...");

          if (!pages.includes(totalPages)) pages.push(totalPages);
        }

        return pages;
      };

      return res.json({
        status: "success",
        data: {
          advertisments: dataResult.rows,
        },
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          total_pages: totalPages,
          has_next: hasNext,
          has_prev: hasPrev,
          next_page: nextPage,
          prev_page: prevPage,
          pages: generatePages(),
        },
      });
    } catch (error) {
      console.error("Error in getAdvertisments:", error);
      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }

  static async deleteAdvertisment(req, res) {
    const transaction = await Advertisment.sequelize.transaction();
    try {
      const { id } = req.params;
      if (!id) {
        await transaction.rollback();
        return res.status(400).json({
          status: "fail",
          message: "Advertisment ID is required",
        });
      }

      const advertisment = await Advertisment.findByPk(id, { transaction });

      if (!advertisment) {
        await transaction.rollback();
        return res.status(404).json({
          status: "fail",
          message: "Advertisment not found",
        });
      }

      if (advertisment.image) {
        try {
          await deleteFromSFTP(advertisment.image);
        } catch (err) {
          console.warn("Failed to delete image:", err.message);
        }
      }

      await advertisment.destroy({ transaction });

      await transaction.commit();

      return res.status(200).json({
        status: "success",
        message: "Advertisment deleted successfully",
      });
    } catch (error) {
      await transaction.rollback();
      console.error("Error deleting advertisment:", error);

      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }

  static async getAdvertismentById(req, res) {
    try {
      const { id } = req.params;
      // 🔍 Validate ID
      if (!id) {
        return res.status(400).json({
          status: "fail",
          message: "Advertisment ID is required",
        });
      }

      // 🔍 Find advertisment
      const advertisment = await Advertisment.findByPk(id);

      if (!advertisment) {
        return res.status(404).json({
          status: "fail",
          message: "Advertisment not found",
        });
      }

      return res.status(200).json({
        status: "success",
        data: advertisment,
      });
    } catch (error) {
      console.error("Error fetching advertisment:", error);

      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }
}

module.exports = AdvertismentController;
