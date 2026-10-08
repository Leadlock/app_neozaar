const { Op, literal } = require("sequelize");
const Brand = require("../models/brand");
const uploadToSFTP = require("../utils/azureStorage");
const pool = require("../config/database");
const Product = require("../models/product");

class BrandController {
  static async createBrand(req, res) {
    try {
      const { name } = req.body;

      if (!name) {
        return res.status(400).json({
          status: "fail",
          message: "Name is required",
        });
      }

      const existing = await Brand.findOne({ where: { name } });
      if (existing) {
        return res.status(400).json({
          status: "fail",
          message: "Brand already exists",
        });
      }

      let iconUrl = null;

      if (req.files?.icon) {
        iconUrl = await uploadToSFTP(req.files.icon[0]);
      }

      const brand = await Brand.create({
        name,
        icon: iconUrl,
        created_by: req.user?.id || 0,
      });

      return res.status(201).json({
        status: "success",
        data: brand,
      });
    } catch (error) {
      console.error("Error creating brand:", error);
      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }

  static async updateBrand(req, res) {
    const transaction = await Brand.sequelize.transaction();

    try {
      const { id } = req.params;
      const { name, description, status } = req.body;

      if (!id) {
        await transaction.rollback();
        return res.status(400).json({
          status: "fail",
          message: "Brand ID is required",
        });
      }

      const brand = await Brand.findByPk(id, { transaction });

      if (!brand) {
        await transaction.rollback();
        return res.status(404).json({
          status: "fail",
          message: "Brand not found",
        });
      }

      // Check if associated with any products
      const associatedProducts = await Product.findAll({
        where: { brand_name: brand.name },
        attributes: ["id", "name"],
        transaction,
      });

      if (associatedProducts.length > 0) {
        // Only block editing if trying to modify name, description, or status
        const nameChanged = name !== undefined && name !== brand.name;
        const descriptionChanged = description !== undefined && description !== brand.description;
        const statusChanged = status !== undefined && status !== brand.status;

        if (nameChanged || descriptionChanged || statusChanged) {
          await transaction.rollback();
          const productNames = associatedProducts.map((p) => p.name).join(", ");
          return res.status(400).json({
            status: "fail",
            message: `Cannot edit brand details (name, description, status) because it is associated with the following products: ${productNames}`,
            products: associatedProducts,
          });
        }
      }

      // duplicate check
      if (name && name !== brand.name) {
        const existing = await Brand.findOne({
          where: { name },
          transaction,
        });

        if (existing) {
          await transaction.rollback();
          return res.status(400).json({
            status: "fail",
            message: "Brand with this name already exists",
          });
        }
      }

      let iconUrl = brand.icon;

      if (req.files?.icon) {
        const newIcon = await uploadToSFTP(req.files.icon[0]);

        if (brand.icon) {
          try {
            await deleteFromSFTP(brand.icon);
          } catch (err) {
            console.warn("Failed to delete old icon:", err.message);
          }
        }

        iconUrl = newIcon;
      }

      await brand.update(
        {
          name: name || brand.name,
          description: description ?? brand.description,
          status: status ?? brand.status,
          icon: iconUrl,
          updated_by: req.user?.id || 0,
        },
        { transaction },
      );

      await transaction.commit();

      return res.status(200).json({
        status: "success",
        message: "Brand updated successfully",
        data: brand,
      });
    } catch (error) {
      await transaction.rollback();
      console.error("Error updating brand:", error);

      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }

  // static async getBrands(req, res) {
  //   try {
  //     const { page = 1, limit = 10 } = req.query;

  //     const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  //     const limitNum = Math.max(parseInt(limit, 10) || 10, 1);
  //     const offset = (pageNum - 1) * limitNum;

  //     const dataQuery = `
  //     SELECT
  //       id,
  //       name,
  //       icon,
  //       description,
  //       status
  //     FROM brand
  //     ORDER BY created_at DESC
  //     LIMIT $1 OFFSET $2
  //   `;

  //     const countQuery = `SELECT COUNT(*) FROM brand`;

  //     const [dataResult, countResult] = await Promise.all([
  //       pool.query(dataQuery, [limitNum, offset]),
  //       pool.query(countQuery),
  //     ]);

  //     const total = parseInt(countResult.rows[0].count, 10);
  //     const totalPages = Math.ceil(total / limitNum);

  //     // 👉 Pagination logic
  //     const hasNext = pageNum < totalPages;
  //     const hasPrev = pageNum > 1;

  //     const nextPage = hasNext ? pageNum + 1 : null;
  //     const prevPage = hasPrev ? pageNum - 1 : null;

  //     // 👉 Generate pages array like [1, 2, 3, "...", 10]
  //     const generatePages = () => {
  //       const pages = [];

  //       if (totalPages <= 5) {
  //         // show all pages if small
  //         for (let i = 1; i <= totalPages; i++) {
  //           pages.push(i);
  //         }
  //       } else {
  //         // always show first page
  //         pages.push(1);

  //         if (pageNum > 3) {
  //           pages.push("...");
  //         }

  //         // pages around current page
  //         for (
  //           let i = Math.max(2, pageNum - 1);
  //           i <= Math.min(totalPages - 1, pageNum + 1);
  //           i++
  //         ) {
  //           pages.push(i);
  //         }

  //         if (pageNum < totalPages - 2) {
  //           pages.push("...");
  //         }

  //         // always show last page
  //         pages.push(totalPages);
  //       }

  //       return pages;
  //     };

  //     return res.json({
  //       status: "success",
  //       data: {
  //         brands: dataResult.rows,
  //       },
  //       pagination: {
  //         total,
  //         page: pageNum,
  //         limit: limitNum,
  //         total_pages: totalPages,
  //         has_next: hasNext,
  //         has_prev: hasPrev,
  //         next_page: nextPage,
  //         prev_page: prevPage,
  //         pages: generatePages(),
  //       },
  //     });
  //   } catch (error) {
  //     console.error("Error in getBrands:", error);
  //     return res.status(500).json({
  //       status: "fail",
  //       message: "Internal server error",
  //     });
  //   }
  // }

  static async getBrands(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;

      const pageNum = Math.max(parseInt(page, 10) || 1, 1);
      const limitNum = Math.max(parseInt(limit, 10) || 10, 1);
      const offset = (pageNum - 1) * limitNum;

      const userId = req.user?.id;
      const roleId = req.user?.role_id;

      let dataQuery;
      let countQuery;
      let dataParams;
      let countParams;

      // ISV users can only see their own brands
      if (roleId === 2) {
        dataQuery = `
    SELECT
      id,
      name,
      icon,
      description,
      status
    FROM brand
    WHERE created_by = $1
    ORDER BY created_at DESC
    LIMIT $2 OFFSET $3
  `;

        countQuery = `
    SELECT COUNT(*)
    FROM brand
    WHERE created_by = $1
  `;

        dataParams = [userId, limitNum, offset];
        countParams = [userId];
      } else {
        dataQuery = `
    SELECT
      id,
      name,
      icon,
      description,
      status
    FROM brand
    ORDER BY created_at DESC
    LIMIT $1 OFFSET $2
  `;

        countQuery = `
    SELECT COUNT(*)
    FROM brand
  `;

        dataParams = [limitNum, offset];
        countParams = [];
      }

      const [dataResult, countResult] = await Promise.all([
        pool.query(dataQuery, dataParams),
        pool.query(countQuery, countParams),
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

          if (pageNum > 3) {
            pages.push("...");
          }

          for (
            let i = Math.max(2, pageNum - 1);
            i <= Math.min(totalPages - 1, pageNum + 1);
            i++
          ) {
            pages.push(i);
          }

          if (pageNum < totalPages - 2) {
            pages.push("...");
          }

          pages.push(totalPages);
        }

        return pages;
      };

      return res.json({
        status: "success",
        data: {
          brands: dataResult.rows,
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
      console.error("Error in getBrands:", error);

      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }

  static async deleteBrand(req, res) {
    const transaction = await Brand.sequelize.transaction();

    try {
      const { id } = req.params;

      if (!id) {
        await transaction.rollback();
        return res.status(400).json({
          status: "fail",
          message: "Brand ID is required",
        });
      }

      const brand = await Brand.findByPk(id, { transaction });

      if (!brand) {
        await transaction.rollback();
        return res.status(404).json({
          status: "fail",
          message: "Brand not found",
        });
      }

      // Check if associated with any products
      const associatedProducts = await Product.findAll({
        where: { brand_name: brand.name },
        attributes: ["id", "name"],
        transaction,
      });

      if (associatedProducts.length > 0) {
        await transaction.rollback();
        const productNames = associatedProducts.map((p) => p.name).join(", ");
        return res.status(400).json({
          status: "fail",
          message: `Cannot delete this brand because it is associated with the following products: ${productNames}`,
          products: associatedProducts,
        });
      }

      if (brand.icon) {
        try {
          await deleteFromSFTP(brand.icon);
        } catch (err) {
          console.warn("Failed to delete icon:", err.message);
        }
      }

      await brand.destroy({ transaction });

      await transaction.commit();

      return res.status(200).json({
        status: "success",
        message: "Brand deleted successfully",
      });
    } catch (error) {
      await transaction.rollback();
      console.error("Error deleting brand:", error);

      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }

  static async getBrandById(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          status: "fail",
          message: "Brand ID is required",
        });
      }

      const brand = await Brand.findByPk(id);

      if (!brand) {
        return res.status(404).json({
          status: "fail",
          message: "Brand not found",
        });
      }

      return res.status(200).json({
        status: "success",
        data: brand,
      });
    } catch (error) {
      console.error("Error in getBrandById:", error);
      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }

  static async getAllBrands(req, res) {
    try {
      const { page_type, sortBy, search, limit: reqLimit } = req.query;

      // 1. Where clause — always only active brands
      const where = { status: true };
      if (search) {
        where.name = {
          [Op.iLike]: `%${search}%`,
        };
      }

      // For the vendor page, only show brands that have at least one
      // published & approved product
      if (page_type === "vendor") {
        where[Op.and] = literal(
          `EXISTS (
            SELECT 1 FROM products
            WHERE products.brand_name = "brand"."name"
              AND products.is_publish = true
              AND products.is_approved = true
          )`
        );
      }

      // 2. Sorting
      let order = [["name", "ASC"]]; // default
      if (sortBy) {
        switch (sortBy.toLowerCase()) {
          case "recently_added":
          case "recently":
            order = [["created_at", "DESC"]];
            break;
          case "oldest":
          case "oldest_first":
            order = [["created_at", "ASC"]];
            break;
          case "a-z":
          case "az":
            order = [["name", "ASC"]];
            break;
          case "z-a":
          case "za":
            order = [["name", "DESC"]];
            break;
        }
      }

      // 3. Limit
      let limit = null;
      if (page_type === "home") {
        limit = 8;
      } else if (reqLimit) {
        const parsedLimit = parseInt(reqLimit, 10);
        if (!isNaN(parsedLimit) && parsedLimit > 0) {
          limit = parsedLimit;
        }
      }

      const brands = await Brand.findAll({
        where,
        attributes: ["id", "name", "icon", "status"],
        order,
        ...(limit ? { limit } : {}),
      });

      return res.status(200).json({
        status: "success",
        data: brands,
      });
    } catch (error) {
      console.error("Error in getAllBrands:", error);
      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }

}

module.exports = BrandController;
