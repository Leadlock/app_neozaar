const SubCategory = require("../models/SubCategory.js");
const Category = require("../models/categories.js");
const Product = require("../models/product.js");
const { Op } = require("sequelize");

class SubCategoryController {
  // ✅ CREATE
  static async create(req, res) {
    try {
      const { category_id, name } = req.body;

      if (!category_id || !name) {
        return res.status(400).json({
          status: "fail",
          message: "category_id and name are required",
        });
      }

      const category = await Category.findByPk(category_id);
      if (!category) {
        return res.status(400).json({
          status: "fail",
          message: "Invalid category_id",
        });
      }

      const sub = await SubCategory.create({
        category_id,
        name,
        category_name: category.name,
      });

      return res.json({
        status: "success",
        data: sub,
      });
    } catch (error) {
      console.error("Error in create SubCategory:", error);
      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }

  // ✅ GET ALL
  static async getAll(req, res) {
    try {
      let { page, limit } = req.query;

      const pageNum = Math.max(parseInt(page) || 1, 1);
      const limitNum = Math.max(parseInt(limit) || 10, 1);
      const offset = (pageNum - 1) * limitNum;

      const { count, rows } = await SubCategory.findAndCountAll({
        include: [
          {
            model: Category,
            as: "category",
            attributes: ["id", "name"],
          },
        ],
        order: [["id", "ASC"]],
        limit: limitNum,
        offset: offset,
      });

      const total = count;
      const totalPages = Math.ceil(total / limitNum);

      // 👉 flags
      const hasNext = pageNum < totalPages;
      const hasPrev = pageNum > 1;

      const nextPage = hasNext ? pageNum + 1 : null;
      const prevPage = hasPrev ? pageNum - 1 : null;

      // 👉 pages generator
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
            pages.push(i);
          }

          if (pageNum < totalPages - 2) pages.push("...");

          pages.push(totalPages);
        }

        return pages;
      };

      return res.json({
        status: "success",
        data: {
          subcategories: rows,
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
      console.error("Error in getAll SubCategory:", error);
      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }

  // ✅ GET ONE
  static async getById(req, res) {
    try {
      const { id } = req.params;

      const data = await SubCategory.findByPk(id, {
        include: [
          {
            model: Category,
            as: "category",
            attributes: ["id", "name"],
          },
        ],
      });

      if (!data) {
        return res.status(404).json({
          status: "fail",
          message: "SubCategory not found",
        });
      }

      return res.json({
        status: "success",
        data,
      });
    } catch (error) {
      console.error("Error in getById SubCategory:", error);
      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }

  // ✅ UPDATE
  static async update(req, res) {
    try {
      const { id } = req.params;
      const { category_id, name } = req.body;

      const sub = await SubCategory.findByPk(id);

      if (!sub) {
        return res.status(404).json({
          status: "fail",
          message: "SubCategory not found",
        });
      }

      const oldName = sub.name;
      const newName = name || sub.name;
      const nameChanged = newName !== oldName;

      let category_name = sub.category_name;

      // If category_id changes → update category_name too
      if (category_id) {
        const category = await Category.findByPk(category_id);
        if (!category) {
          return res.status(400).json({
            status: "fail",
            message: "Invalid category_id",
          });
        }
        category_name = category.name;
      }

      await sub.update({
        category_id: category_id || sub.category_id,
        name: newName,
        category_name,
      });

      // Cascade name change to associated products if name changed
      if (nameChanged) {
        const associatedProducts = await Product.findAll({
          where: {
            [Op.or]: [
              { category_subcategory: { [Op.overlap]: [oldName] } },
              { subcategory: { [Op.overlap]: [oldName] } },
            ],
          },
        });

        for (const product of associatedProducts) {
          const updates = {};
          if (product.category_subcategory?.includes(oldName)) {
            updates.category_subcategory = product.category_subcategory.map(
              (c) => (c === oldName ? newName : c)
            );
          }
          if (product.subcategory?.includes(oldName)) {
            updates.subcategory = product.subcategory.map(
              (c) => (c === oldName ? newName : c)
            );
          }
          if (Object.keys(updates).length) await product.update(updates);
        }
      }

      return res.json({
        status: "success",
        data: sub,
      });
    } catch (error) {
      console.error("Error in update SubCategory:", error);
      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }

  // ✅ DELETE
  static async delete(req, res) {
    try {
      const { id } = req.params;

      const sub = await SubCategory.findByPk(id);

      if (!sub) {
        return res.status(404).json({
          status: "fail",
          message: "SubCategory not found",
        });
      }

      // Check if associated with any active (non-deleted) products
      // Match by both subcategory name AND parent category name to avoid false positives
      // when multiple subcategories share the same name under different parent categories
      const allMatchingProducts = await Product.findAll({
        where: {
          deleted_at: null,
          [Op.or]: [
            { category_subcategory: { [Op.overlap]: [sub.name] } },
            { subcategory: { [Op.overlap]: [sub.name] } },
          ],
        },
        attributes: ["id", "name", "category", "category_subcategory", "subcategory"],
      });

      const associatedProducts = sub.category_name
        ? allMatchingProducts.filter((p) => {
            const cats = p.category || [];
            return cats.includes(sub.category_name);
          })
        : allMatchingProducts;

      if (associatedProducts.length > 0) {
        const productNames = associatedProducts.map((p) => p.name).join(", ");
        return res.status(400).json({
          status: "fail",
          message: `Cannot delete this subcategory because it is associated with the following products`,
          products: associatedProducts,
        });
      }

      await sub.destroy();

      return res.json({
        status: "success",
        message: "Deleted successfully",
      });
    } catch (error) {
      console.error("Error in delete SubCategory:", error);
      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }
}

module.exports = SubCategoryController;
