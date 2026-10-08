const TargetSegments = require("../models/targetsegments");
const uploadToSFTP = require("../utils/azureStorage");
const pool = require("../config/database");
const Product = require("../models/product");
const { Op } = require("sequelize");

class TargetSegmentsController {
static async createTargetSegment(req, res) {
  try {
    // 🔍 Debug (remove later)
    console.log("BODY:", req.body);
    console.log("FILES:", req.files);

    // ✅ Safe extraction (handles edge cases)
    const name = req.body?.name?.toString().trim();

    if (!name) {
      return res.status(400).json({
        status: "fail",
        message: "Name is required",
      });
    }

    // 🔍 Check duplicate
    const existing = await TargetSegments.findOne({ where: { name } });
    if (existing) {
      return res.status(400).json({
        status: "fail",
        message: "Target segment already exists",
      });
    }

    let iconUrl = null;
    let logoUrl = null;

    // ✅ Upload icon
    if (req.files && req.files.icon && req.files.icon.length > 0) {
      iconUrl = await uploadToSFTP(req.files.icon[0]);
    }

    // ✅ Upload logo
    if (req.files && req.files.logo && req.files.logo.length > 0) {
      logoUrl = await uploadToSFTP(req.files.logo[0]);
    }

    // ✅ Create record
    const targetSegment = await TargetSegments.create({
      name,
      icon: iconUrl,
      logo: logoUrl,
    });

    return res.status(201).json({
      status: "success",
      data: targetSegment,
    });

  } catch (error) {
    console.error("Error creating target segment:", error);

    return res.status(500).json({
      status: "fail",
      message: "Internal server error",
    });
  }
}

  static async updateTargetSegment(req, res) {
    const transaction = await TargetSegments.sequelize.transaction();

    try {
      const { id } = req.params;
      const { name } = req.body;

      if (!id) {
        await transaction.rollback();
        return res.status(400).json({
          status: "fail",
          message: "Target segment ID is required",
        });
      }

      const targetSegment = await TargetSegments.findByPk(id, { transaction });

      if (!targetSegment) {
        await transaction.rollback();
        return res.status(404).json({
          status: "fail",
          message: "Target segment not found",
        });
      }

      // Check if associated with any products
      const associatedProducts = await Product.findAll({
        where: {
          target_segments: {
            [Op.overlap]: [targetSegment.name],
          },
        },
        attributes: ["id", "name"],
        transaction,
      });

      if (associatedProducts.length > 0) {
        const nameChanged = name !== undefined && name !== targetSegment.name;
        if (nameChanged) {
          await transaction.rollback();
          const productNames = associatedProducts.map((p) => p.name).join(", ");
          return res.status(400).json({
            status: "fail",
            message: `Cannot edit target segment name because it is associated with the following products`,
            products: associatedProducts,
          });
        }
      }

      if (name && name !== targetSegment.name) {
        const existing = await TargetSegments.findOne({
          where: { name },
          transaction,
        });

        if (existing) {
          await transaction.rollback();
          return res.status(400).json({
            status: "fail",
            message: "Target segment with this name already exists",
          });
        }
      }

      let iconUrl = targetSegment.icon;
      let logoUrl = targetSegment.logo;

      if (req.files?.icon) {
        const newIcon = await uploadToSFTP(req.files.icon[0]);

        // if (targetSegment.icon) await deleteFromSFTP(targetSegment.icon);

        iconUrl = newIcon;
      }

      if (req.files?.logo) {
        const newLogo = await uploadToSFTP(req.files.logo[0]);

        // if (targetSegment.logo) await deleteFromSFTP(targetSegment.logo);

        logoUrl = newLogo;
      }

      await targetSegment.update(
        {
          name: name || targetSegment.name,
          icon: iconUrl,
          logo: logoUrl,
        },
        { transaction },
      );

      await transaction.commit();

      return res.status(200).json({
        status: "success",
        message: "Target segment updated successfully",
        data: targetSegment,
      });
    } catch (error) {
      await transaction.rollback();
      console.error("Error updating target segment:", error);

      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }

  static async getTargetSegments(req, res) {
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
        FROM target_segments
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
      `;

      const countQuery = `SELECT COUNT(*) FROM target_segments`;

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
          target_segments: dataResult.rows,
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
      console.error("Error in getTargetSegments:", error);
      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }

  static async deleteTargetSegment(req, res) {
    const transaction = await TargetSegments.sequelize.transaction();

    try {
      const { id } = req.params;

      if (!id) {
        await transaction.rollback();
        return res.status(400).json({
          status: "fail",
          message: "Target segment ID is required",
        });
      }

      const targetSegment = await TargetSegments.findByPk(id, { transaction });

      if (!targetSegment) {
        await transaction.rollback();
        return res.status(404).json({
          status: "fail",
          message: "Target segment not found",
        });
      }

      // Check if associated with any products
      const associatedProducts = await Product.findAll({
        where: {
          target_segments: {
            [Op.overlap]: [targetSegment.name],
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
          message: `Cannot delete this target segment because it is associated with the following products`,
          products: associatedProducts,
        });
      }

      // if (targetSegment.icon) await deleteFromSFTP(targetSegment.icon);
      // if (targetSegment.logo) await deleteFromSFTP(targetSegment.logo);

      await targetSegment.destroy({ transaction });

      await transaction.commit();

      return res.status(200).json({
        status: "success",
        message: "Target segment deleted successfully",
      });
    } catch (error) {
      await transaction.rollback();
      console.error("Error deleting target segment:", error);

      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }
}

module.exports = TargetSegmentsController;
