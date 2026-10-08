const express = require("express");
const router = express.Router();
const CategoryController = require("../controllers/category.controller.js");
const verifyToken = require("../middlewares/auth");

router.post("/create", verifyToken, CategoryController.createCategory);
router.get("/get-all", verifyToken, CategoryController.getAllCategories);
router.get("/:id", verifyToken, CategoryController.getCategoryById);
router.post("/update/:id", verifyToken, CategoryController.updateCategory);
router.post("/delete/:id", verifyToken, CategoryController.deleteCategory);
router.post("/:id/feature", verifyToken, CategoryController.toggleCategoryFeature);

router.get("/get-all/associate", verifyToken, CategoryController.getAllCategoriesWithSubcategories);

module.exports = router;
