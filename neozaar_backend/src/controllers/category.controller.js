const { Category, SubCategory } = require("../models/Category/index");
const Product = require("../models/product");
const { Op } = require("sequelize");


class CategoryController {
  // ✅ CREATE
  static async createCategory(req, res) {
    try {
      const { name } = req.body;

      if (!name) {
        return res.status(400).json({
          status: "fail",
          message: "Category name is required",
        });
      }

      const category = await Category.create({ name });

      return res.json({
        status: "success",
        data: category,
      });
    } catch (error) {
      console.error("Error in createCategory:", error);
      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }

  // ✅ READ ALL
  static async getAllCategories(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;

      const pageNum = Math.max(parseInt(page, 10) || 1, 1);
      const limitNum = Math.max(parseInt(limit, 10) || 10, 1);
      const offset = (pageNum - 1) * limitNum;

      // 👉 Fetch data + count together
      const { count, rows } = await Category.findAndCountAll({
        order: [["id", "ASC"]],
        limit: limitNum,
        offset: offset,
      });

      const total = count;
      const totalPages = Math.ceil(total / limitNum);

      // 👉 Pagination flags
      const hasNext = pageNum < totalPages;
      const hasPrev = pageNum > 1;

      const nextPage = hasNext ? pageNum + 1 : null;
      const prevPage = hasPrev ? pageNum - 1 : null;

      // 👉 Pages generator
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
          categories: rows,
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
      console.error("Error in getAllCategories:", error);
      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }

  // ✅ READ ONE
  static async getCategoryById(req, res) {
    try {
      const { id } = req.params;

      const category = await Category.findByPk(id);

      if (!category) {
        return res.status(404).json({
          status: "fail",
          message: "Category not found",
        });
      }

      return res.json({
        status: "success",
        data: category,
      });
    } catch (error) {
      console.error("Error in getCategoryById:", error);
      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }

  // ✅ UPDATE
  static async updateCategory(req, res) {
    try {
      const { id } = req.params;
      const { name } = req.body;

      const category = await Category.findByPk(id);

      if (!category) {
        return res.status(404).json({
          status: "fail",
          message: "Category not found",
        });
      }

      const oldName = category.name;

      await category.update({ name });

      // Cascade name change to all associated products
      const associatedProducts = await Product.findAll({
        where: { category: { [Op.overlap]: [oldName] } },
      });

      for (const product of associatedProducts) {
        const updatedCategories = product.category.map((c) =>
          c === oldName ? name : c
        );
        await product.update({ category: updatedCategories });
      }

      return res.json({
        status: "success",
        data: category,
      });
    } catch (error) {
      console.error("Error in updateCategory:", error);
      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }

  // ✅ DELETE
  static async deleteCategory(req, res) {
    try {
      const { id } = req.params;

      const category = await Category.findByPk(id);

      if (!category) {
        return res.status(404).json({
          status: "fail",
          message: "Category not found",
        });
      }

      // Check if associated with any products
      const associatedProducts = await Product.findAll({
        where: {
          category: {
            [Op.overlap]: [category.name],
          },
        },
        attributes: ["id", "name"],
      });

      if (associatedProducts.length > 0) {
        const productNames = associatedProducts.map((p) => p.name).join(", ");
        return res.status(400).json({
          status: "fail",
          message: `Cannot delete this category because it is associated with the following products`,
          products: associatedProducts,
        });
      }

      await category.destroy();

      return res.json({
        status: "success",
        message: "Category deleted successfully",
      });
    } catch (error) {
      console.error("Error in deleteCategory:", error);
      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }

  // ✅ TOGGLE / SET FEATURED (controls visibility in the home page "Explore by Category" section)
  static async toggleCategoryFeature(req, res) {
    try {
      const { id } = req.params;
      let { is_feature } = req.body;

      const category = await Category.findByPk(id);

      if (!category) {
        return res.status(404).json({
          status: "fail",
          message: "Category not found",
        });
      }

      if (is_feature === undefined) {
        is_feature = !category.is_feature;
      } else if (typeof is_feature === "string") {
        is_feature = is_feature.toLowerCase().trim() === "true";
      } else {
        is_feature = Boolean(is_feature);
      }

      await category.update({ is_feature });

      return res.json({
        status: "success",
        data: category,
      });
    } catch (error) {
      console.error("Error in toggleCategoryFeature:", error);
      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }

  // ✅ GET ALL CATEGORIES WITH SUBCATEGORIES
  static async getAllCategoriesWithSubcategories(req, res) {
    try {
      const categories = await Category.findAll({
        include: [
          {
            model: SubCategory,
            as: "subcategories",
          },
        ],
        order: [["id", "ASC"]],
      });

      return res.json({
        status: "success",
        data: categories,
      });
    } catch (error) {
      console.error("Error in getAllCategoriesWithSubcategories:", error);
      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }

}

module.exports = CategoryController;
