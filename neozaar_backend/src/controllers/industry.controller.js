const Industry = require("../models/industry");
const uploadToSFTP = require("../utils/azureStorage");
const pool = require("../config/database");
const Product = require("../models/product");
const { Op } = require("sequelize");

class IndustryController {
  static async createIndustry(req, res) {
    try {
      const { name } = req.body;

      if (!name) {
        return res.status(400).json({
          status: "fail",
          message: "Name is required",
        });
      }

      const existing = await Industry.findOne({ where: { name } });
      if (existing) {
        return res.status(400).json({
          status: "fail",
          message: "Industry already exists",
        });
      }

      let iconUrl = null;
      let logoUrl = null;

      // ✅ Upload files
      if (req.files?.icon) {
        iconUrl = await uploadToSFTP(req.files.icon[0]);
      }

      if (req.files?.logo) {
        logoUrl = await uploadToSFTP(req.files.logo[0]);
      }

      const industry = await Industry.create({
        name,
        icon: iconUrl,
        logo: logoUrl,
      });

      return res.status(201).json({
        status: "success",
        data: industry,
      });
    } catch (error) {
      console.error("Error creating industry:", error);
      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }

  static async updateIndustry(req, res) {
    const transaction = await Industry.sequelize.transaction();

    try {
      const { id } = req.params;
      const { name } = req.body;

      // 🔍 Validate ID
      if (!id) {
        await transaction.rollback();
        return res.status(400).json({
          status: "fail",
          message: "Industry ID is required",
        });
      }

      // 🔍 Find existing industry
      const industry = await Industry.findByPk(id, { transaction });

      if (!industry) {
        await transaction.rollback();
        return res.status(404).json({
          status: "fail",
          message: "Industry not found",
        });
      }

      // Check if associated with any products
      const associatedProducts = await Product.findAll({
        where: {
          industry: {
            [Op.overlap]: [industry.name],
          },
        },
        attributes: ["id", "name"],
        transaction,
      });

      if (associatedProducts.length > 0) {
        const nameChanged = name !== undefined && name !== industry.name;
        if (nameChanged) {
          await transaction.rollback();
          const productNames = associatedProducts.map((p) => p.name).join(", ");
          return res.status(400).json({
            status: "fail",
            message: `Cannot edit industry name because it is associated with the following products`,
            products: associatedProducts,
          });
        }
      }

      // 🏷️ Check duplicate name (only if changed)
      if (name && name !== industry.name) {
        const existing = await Industry.findOne({
          where: { name },
          transaction,
        });

        if (existing) {
          await transaction.rollback();
          return res.status(400).json({
            status: "fail",
            message: "Industry with this name already exists",
          });
        }
      }

      let iconUrl = industry.icon;
      let logoUrl = industry.logo;

      // 📂 Upload new icon
      if (req.files?.icon) {
        const newIcon = await uploadToSFTP(req.files.icon[0]);

        // ❗ Delete old icon (optional)
        if (industry.icon) {
          try {
            await deleteFromSFTP(industry.icon);
          } catch (err) {
            console.warn("Failed to delete old icon:", err.message);
          }
        }

        iconUrl = newIcon;
      }

      // 📂 Upload new logo
      if (req.files?.logo) {
        const newLogo = await uploadToSFTP(req.files.logo[0]);

        // ❗ Delete old logo (optional)
        if (industry.logo) {
          try {
            await deleteFromSFTP(industry.logo);
          } catch (err) {
            console.warn("Failed to delete old logo:", err.message);
          }
        }

        logoUrl = newLogo;
      }

      // ✏️ Update industry
      await industry.update(
        {
          name: name || industry.name,
          icon: iconUrl,
          logo: logoUrl,
        },
        { transaction },
      );

      // ✅ Commit transaction
      await transaction.commit();

      return res.status(200).json({
        status: "success",
        message: "Industry updated successfully",
        data: industry,
      });
    } catch (error) {
      // ❌ Rollback on error
      await transaction.rollback();

      console.error("Error updating industry:", error);

      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }

  static async getIndustry(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;

      const pageNum = Math.max(parseInt(page, 10) || 1, 1);
      const limitNum = Math.max(parseInt(limit, 10) || 10, 1);
      const offset = (pageNum - 1) * limitNum;

      const dataQuery = `
      SELECT 
        id,
        name,
        icon,
        logo
      FROM industry
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;

      const countQuery = `SELECT COUNT(*) FROM industry`;

      const [dataResult, countResult] = await Promise.all([
        pool.query(dataQuery, [limitNum, offset]),
        pool.query(countQuery),
      ]);

      const total = parseInt(countResult.rows[0].count, 10);
      const totalPages = Math.ceil(total / limitNum);

      // 👉 flags
      const hasNext = pageNum < totalPages;
      const hasPrev = pageNum > 1;

      const nextPage = hasNext ? pageNum + 1 : null;
      const prevPage = hasPrev ? pageNum - 1 : null;

      // 👉 pages generator (clean version - no duplicates)
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
          industries: dataResult.rows,
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
      console.error("Error in getIndustry:", error);
      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }

  static async deleteIndustry(req, res) {
    const transaction = await Industry.sequelize.transaction();

    try {
      const { id } = req.params;

      if (!id) {
        await transaction.rollback();
        return res.status(400).json({
          status: "fail",
          message: "Industry ID is required",
        });
      }

      const industry = await Industry.findByPk(id, { transaction });

      if (!industry) {
        await transaction.rollback();
        return res.status(404).json({
          status: "fail",
          message: "Industry not found",
        });
      }

      // Check if associated with any products
      const associatedProducts = await Product.findAll({
        where: {
          industry: {
            [Op.overlap]: [industry.name],
          },
        },
        attributes: ["id", "name"],
        transaction,
      });

      if (associatedProducts.length > 0) {
        await transaction.rollback();
        const productNames = associatedProducts.map((p) => p.name).join(", ");
        return res.status(400).json({
          status: "fail",
          message: `Cannot delete this industry because it is associated with the following products`,
          products: associatedProducts,
        });
      }

      if (industry.icon) {
        try {
          await deleteFromSFTP(industry.icon);
        } catch (err) {
          console.warn("Failed to delete icon:", err.message);
        }
      }

      if (industry.logo) {
        try {
          await deleteFromSFTP(industry.logo);
        } catch (err) {
          console.warn("Failed to delete logo:", err.message);
        }
      }

      await industry.destroy({ transaction });

      await transaction.commit();

      return res.status(200).json({
        status: "success",
        message: "Industry deleted successfully",
      });
    } catch (error) {
      await transaction.rollback();
      console.error("Error deleting industry:", error);

      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }
}

module.exports = IndustryController;
