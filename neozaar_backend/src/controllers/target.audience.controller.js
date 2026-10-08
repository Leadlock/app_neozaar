const TargetAudience = require("../models/targetaudience");
const uploadToSFTP = require("../utils/azureStorage");
const pool = require("../config/database");
const Product = require("../models/product");
const { Op } = require("sequelize");

class TargetAudienceController {
  static async createTargetAudience(req, res) {
    try {
      const { name } = req.body;

      if (!name) {
        return res.status(400).json({
          status: "fail",
          message: "Name is required",
        });
      }
      const existing = await TargetAudience.findOne({ where: { name } });
      if (existing) {
        return res.status(400).json({
          status: "fail",
          message: "Target audience already exists",
        });
      }
      const audience = await TargetAudience.create({
        name,
      });
      return res.status(201).json({
        status: "success",
        data: audience,
      });
    } catch (error) {
      console.error("Error creating target audience:", error);
      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }

  static async updateTargetAudience(req, res) {
    const transaction = await TargetAudience.sequelize.transaction();

    try {
      const { id } = req.params;
      const { name } = req.body;
      if (!id) {
        await transaction.rollback();
        return res.status(400).json({
          status: "fail",
          message: "Audience ID is required",
        });
      }

      const audience = await TargetAudience.findByPk(id, { transaction });

      if (!audience) {
        await transaction.rollback();
        return res.status(404).json({
          status: "fail",
          message: "Target audience not found",
        });
      }

      // Check if associated with any products
      const associatedProducts = await Product.findAll({
        where: {
          target_audience: {
            [Op.overlap]: [audience.name],
          },
        },
        attributes: ["id", "name"],
        transaction,
      });

      if (associatedProducts.length > 0) {
        const nameChanged = name !== undefined && name !== audience.name;
        if (nameChanged) {
          await transaction.rollback();
          const productNames = associatedProducts.map((p) => p.name).join(", ");
          return res.status(400).json({
            status: "fail",
            message: `Cannot edit target audience name because it is associated with the following products`,
            products: associatedProducts,
          });
        }
      }

      if (name && name !== audience.name) {
        const existing = await TargetAudience.findOne({
          where: { name },
          transaction,
        });

        if (existing) {
          await transaction.rollback();
          return res.status(400).json({
            status: "fail",
            message: "Target audience with this name already exists",
          });
        }
      }

      await audience.update(
        {
          name: name || audience.name,
        },
        { transaction },
      );

      await transaction.commit();

      return res.status(200).json({
        status: "success",
        message: "Target audience updated successfully",
        data: audience,
      });
    } catch (error) {
      await transaction.rollback();
      console.error("Error updating target audience:", error);
      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }

  static async getTargetAudiences(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;

      const pageNum = Math.max(parseInt(page, 10) || 1, 1);
      const limitNum = Math.max(parseInt(limit, 10) || 10, 1);
      const offset = (pageNum - 1) * limitNum;

      const dataQuery = `
      SELECT 
        id,
        name,
        created_at,
        updated_at
      FROM target_audience
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;

      const countQuery = `SELECT COUNT(*) FROM target_audience`;

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
          audiences: dataResult.rows,
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
      console.error("Error in getTargetAudiences:", error);
      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }

  static async deleteTargetAudience(req, res) {
    const transaction = await TargetAudience.sequelize.transaction();

    try {
      const { id } = req.params;

      if (!id) {
        await transaction.rollback();
        return res.status(400).json({
          status: "fail",
          message: "Audience ID is required",
        });
      }

      const audience = await TargetAudience.findByPk(id, { transaction });

      if (!audience) {
        await transaction.rollback();
        return res.status(404).json({
          status: "fail",
          message: "Target audience not found",
        });
      }

      // Check if associated with any products
      const associatedProducts = await Product.findAll({
        where: {
          target_audience: {
            [Op.overlap]: [audience.name],
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
          message: `Cannot delete this target audience because it is associated with the following products`,
          products: associatedProducts,
        });
      }
      await audience.destroy({ transaction });

      await transaction.commit();

      return res.status(200).json({
        status: "success",
        message: "Target audience deleted successfully",
      });
    } catch (error) {
      await transaction.rollback();
      console.error("Error deleting target audience:", error);

      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }

  static async getTargetAudienceById(req, res) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({
          status: "fail",
          message: "Audience ID is required",
        });
      }
      const audience = await TargetAudience.findByPk(id);

      if (!audience) {
        return res.status(404).json({
          status: "fail",
          message: "Target audience not found",
        });
      }

      return res.status(200).json({
        status: "success",
        data: audience,
      });
    } catch (error) {
      console.error("Error fetching target audience:", error);

      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }

  static async getAllTargetAudiences(req, res) {
    try {
      const query = `
      SELECT 
        id,
        name,
        created_at,
        updated_at
      FROM target_audience
      ORDER BY created_at DESC
    `;

      const result = await pool.query(query);

      return res.status(200).json({
        status: "success",
        data: {
          audiences: result.rows,
        },
      });
    } catch (error) {
      console.error("Error in getAllTargetAudiences:", error);
      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }
}

module.exports = TargetAudienceController;
