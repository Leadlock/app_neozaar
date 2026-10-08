const express = require("express");
const router = express.Router();

const SubCategoryController = require("../controllers/subcategory.controller.js");
const verifyToken = require("../middlewares/auth");


router.post("/create", verifyToken, SubCategoryController.create);
router.get("/get-all", verifyToken, SubCategoryController.getAll);
router.get("/:id", verifyToken, SubCategoryController.getById);
router.post("/update/:id", verifyToken, SubCategoryController.update);
router.post("/delete/:id", verifyToken, SubCategoryController.delete);

module.exports = router;
