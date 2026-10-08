const catalogService = require("../services/catalog.service");
const commonConstant = require("../config/common.constant.js");
const catalogValidationRules = require("../validations/catalog.validation");
const uploadToSFTP = require("../utils/azureStorage");
const DataTransformer = require("../utils/dataTransformer");
const pool = require("../config/database");
const ProductImportService = require("../services/productImport.service");
const { newProductUploadedBYIsv } = require("../config/mail");
const ProductOtherDetails = require("../models/Product/productOtherDetails");
const emailService = require("../config/mail");
const Product = require("../models/product");
const User = require("../models/User");

class CatalogController {
  // Create catalog item (product or bundle)
  static async createCatalog(req, res) {
    try {
      //TODO:: Uncommented once validation is fixed
      // const validationErrors = await catalogValidationRules.create(req.body, req.files);
      // if (validationErrors.length > 0) {
      //   return res.status(commonConstant.STATUS_CODES.BAD_REQUEST).json({
      //     status: commonConstant.VARIABLE.FAIL,
      //     message: commonConstant.MESSAGES.VALIDATION_ERROR,
      //     errors: validationErrors,
      //   });
      // }

      const userId = req.user.id;
      const { type } = req.params; // Get type from params instead of body
      const { action_type, service_solution_details } = req.body;
      console.log(
        "Creating catalog of type:",
        type,
        "action_type:",
        action_type,
      );
      // Handle file uploads
      const uploadedFiles = await CatalogController.handleFileUploads(
        req.files,
        type,
      );

      let catalogData;
      if (type === "product") {
        catalogData = await CatalogController.prepareProductData(
          req.body,
          userId,
          uploadedFiles,
        );
      } else if (type === "bundle") {
        catalogData = await CatalogController.prepareBundleData(
          req.body,
          userId,
          uploadedFiles,
        );
      } else {
        return res.status(commonConstant.STATUS_CODES.BAD_REQUEST).json({
          status: commonConstant.VARIABLE.FAIL,
          message: 'Invalid type. Must be "product" or "bundle"',
        });
      }
      console.log(
        "Prepared catalog data:",
        action_type,
        service_solution_details,
      );

      let extraDataForServiceSolution = {};

      if (action_type === "service" || action_type === "solution") {
        if (service_solution_details) {
          const parsed = JSON.parse(service_solution_details);

          // ✅ Convert coverage array → JSON string (for DB TEXT column)
          if (parsed.coverage) {
            parsed.coverage = Array.isArray(parsed.coverage)
              ? JSON.stringify(parsed.coverage)
              : parsed.coverage;
          }

          extraDataForServiceSolution = parsed;
        }
      }
      const newCatalogData = {
        ...catalogData,
        is_drapt: true,
        is_publish: false,
        is_approved: false,
        status: "pending",
        approved_by: null,
      };
      const newCatalog = await catalogService.createCatalog(
        newCatalogData,
        type,
        extraDataForServiceSolution,
      );

      if (
        req.user.role_type === "ISV" &&
        (action_type === "product" || action_type === "bundle")
      ) {
        // Send email notification to admin
        const productUrl = `${commonConstant.VARIABLE.APP_BASE_URL}/app/products/view/${newCatalog.id}`;
        await newProductUploadedBYIsv(
          productUrl,
          "info@neozaar.com",
          req.user.name,
          newCatalog.name,
        );
      }

      return res.status(commonConstant.STATUS_CODES.CREATED).json({
        status: commonConstant.VARIABLE.SUCCESS,
        message: commonConstant.MESSAGES.SUCCESS,
        data: newCatalog,
      });
    } catch (error) {
      console.error("Error in createCatalog:", error);
      return res.status(commonConstant.STATUS_CODES.SERVER_ERROR).json({
        status: commonConstant.VARIABLE.FAIL,
        message: commonConstant.MESSAGES.ERROR,
        error: error.message,
      });
    }
  }

  // Update catalog item by ID
  static async updateCatalog(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      const type = req.params.type; // Get type from params
      const { action_type, service_solution_details } = req.body;
      console.log(`📝 updateCatalog called - type: ${type}, id: ${id}, action_type: ${action_type}`);
      if (isNaN(id)) {
        return res.status(commonConstant.STATUS_CODES.BAD_REQUEST).json({
          status: commonConstant.VARIABLE.FAIL,
          message: "Invalid catalog id.",
        });
      }

      // Validate type
      if (!["product", "bundle"].includes(type)) {
        return res.status(commonConstant.STATUS_CODES.BAD_REQUEST).json({
          status: commonConstant.VARIABLE.FAIL,
          message: 'Invalid catalog type. Must be "product" or "bundle".',
        });
      }

      const userId = req.user.id;

      // Check if catalog exists
      const existingCatalog = await catalogService.getCatalogById(id, type);
      if (!existingCatalog) {
        return res.status(commonConstant.STATUS_CODES.NOT_FOUND).json({
          status: commonConstant.VARIABLE.FAIL,
          message: "Catalog not found",
        });
      }

      // ✅ Validation
      //TODO:: Uncommented once validation is fixed
      // const validationErrors = await catalogValidationRules.update(req.body, req.files, type);
      // if (validationErrors.length > 0) {
      //   return res.status(commonConstant.STATUS_CODES.BAD_REQUEST).json({
      //     status: commonConstant.VARIABLE.FAIL,
      //     message: commonConstant.MESSAGES.VALIDATION_ERROR,
      //     errors: validationErrors,
      //   });
      // }

      // ✅ File uploads
      const uploadedFiles = await CatalogController.handleFileUploads(
        req.files,
        type,
      );

      let newData;
      if (type === "product") {
        newData = await CatalogController.prepareProductData(
          req.body,
          userId,
          uploadedFiles,
          true,
          existingCatalog,
        );
      } else if (type === "bundle") {
        newData = await CatalogController.prepareBundleData(
          req.body,
          userId,
          uploadedFiles,
          true,
          existingCatalog,
        );
      }

      // ✅ 🔥 FIXED LOGIC FOR service_solution_details
      let extraDataForServiceSolution = {};

      if (action_type === "service" || action_type === "solution") {
        if (service_solution_details) {
          const parsed = JSON.parse(service_solution_details);

          // ✅ Convert coverage array → JSON string (DB safe)
          if (parsed.coverage) {
            parsed.coverage = Array.isArray(parsed.coverage)
              ? JSON.stringify(parsed.coverage)
              : parsed.coverage;
          }

          extraDataForServiceSolution = parsed;
        }
      }

      // Only include fields that are not undefined
      const updateData = {};
      for (const key in newData) {
        if (newData[key] !== undefined) {
          updateData[key] = newData[key];
        }
      }

      const updatedCatalog = await catalogService.updateCatalog(
        id,
        updateData,
        type,
        extraDataForServiceSolution,
      );

      return res.status(commonConstant.STATUS_CODES.SUCCESS).json({
        status: commonConstant.VARIABLE.SUCCESS,
        message: commonConstant.MESSAGES.SUCCESS,
        data: updatedCatalog,
      });
    } catch (error) {
      console.error("Error in updateCatalog:", error.message);
      console.error("Error stack:", error.stack);
      return res.status(commonConstant.STATUS_CODES.SERVER_ERROR).json({
        status: commonConstant.VARIABLE.FAIL,
        message: commonConstant.MESSAGES.ERROR,
        error: error.message,
      });
    }
  }

  // Get paginated catalog list
  static async getCatalogs(req, res) {
    try {
      const { page = 1, limit = 10, type } = req.query;
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);

      // role-based filters
      let filters = {};

      if (
        req.user.role_type === "ISV" ||
        req.user.role_type === "SUPPORT_PARTNER"
      ) {
        // only their own products/bundles
        filters.user_id = req.user.id;
      }
      // if Admin => no filters (sees all)

      const result = await catalogService.getCatalogs({
        page: pageNum,
        limit: limitNum,
        type,
        filters,
      });

      return res.status(commonConstant.STATUS_CODES.SUCCESS).json({
        status: commonConstant.VARIABLE.SUCCESS,
        message: commonConstant.MESSAGES.SUCCESS,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error("Error in getCatalogs:", error);
      return res.status(commonConstant.STATUS_CODES.SERVER_ERROR).json({
        status: commonConstant.VARIABLE.FAIL,
        message: commonConstant.MESSAGES.ERROR,
        error: error.message,
      });
    }
  }

  static async deleteCatalog(req, res) {
    try {
      const { id, type } = req.params;
      const catalogId = parseInt(id, 10);

      if (!id || isNaN(catalogId)) {
        return res.status(commonConstant.STATUS_CODES.BAD_REQUEST).json({
          status: commonConstant.VARIABLE.FAIL,
          message: "Invalid catalog id",
        });
      }
      if (!["product", "bundle"].includes(type)) {
        return res.status(commonConstant.STATUS_CODES.BAD_REQUEST).json({
          status: commonConstant.VARIABLE.FAIL,
          message: 'Type must be "product" or "bundle"',
        });
      }
      const result = await catalogService.deleteCatalog(
        catalogId,
        type,
        req.user,
      );

      return res.status(commonConstant.STATUS_CODES.SUCCESS).json({
        status: commonConstant.VARIABLE.SUCCESS,
        message: result.message,
      });
    } catch (error) {
      console.error("Error in deleteCatalog:", error);
      let statusCode = commonConstant.STATUS_CODES.SERVER_ERROR;
      if (error.message.includes("not found")) {
        statusCode = commonConstant.STATUS_CODES.NOT_FOUND;
      } else if (error.message.includes("Not authorized")) {
        statusCode = commonConstant.STATUS_CODES.FORBIDDEN;
      } else if (error.message.includes("Invalid type")) {
        statusCode = commonConstant.STATUS_CODES.BAD_REQUEST;
      }

      return res.status(statusCode).json({
        status: commonConstant.VARIABLE.FAIL,
        message: error.message,
      });
    }
  }

  // Fixed getCatalogById method in CatalogController
  // static async getCatalogById(req, res) {
  //   try {
  //     const { id, type } = req.params;

  //     // Validate ID
  //     const catalogId = parseInt(id, 10);
  //     if (!id || isNaN(catalogId)) {
  //       return res.status(commonConstant.STATUS_CODES.BAD_REQUEST).json({
  //         status: commonConstant.VARIABLE.FAIL,
  //         message: "Invalid catalog id.",
  //       });
  //     }

  //     // Validate type
  //     if (!type || !["product", "bundle"].includes(type)) {
  //       return res.status(commonConstant.STATUS_CODES.BAD_REQUEST).json({
  //         status: commonConstant.VARIABLE.FAIL,
  //         message: 'Type is required. Must be "product" or "bundle"',
  //       });
  //     }

  //     // Fetch catalog item
  //     let catalogItem = await catalogService.getCatalogById(catalogId, type);

  //     if (!catalogItem) {
  //       return res.status(commonConstant.STATUS_CODES.NOT_FOUND).json({
  //         status: commonConstant.VARIABLE.FAIL,
  //         message: `${type.charAt(0).toUpperCase() + type.slice(1)} not found`,
  //       });
  //     }
  //     console.log(catalogItem.id);

  //     const productOtherDetails = await ProductOtherDetails.findOne({
  //       where: { product_id: catalogItem.id },
  //     });

  //     catalogItem.extraDataForServiceSolution = productOtherDetails;

  //     // --- Role-based access control ---
  //     if (req.user.role_type === "ADMIN") {
  //       // Admin can view everything
  //     } else if (["ISV", "SUPPORT_PARTNER"].includes(req.user.role_type)) {
  //       // Convert both IDs to numbers for proper comparison
  //       const catalogUserId = parseInt(catalogItem.user_id);
  //       const currentUserId = parseInt(req.user.id);

  //       // ISV/Support partners can only view their own items
  //       if (catalogUserId !== currentUserId) {
  //         return res.status(commonConstant.STATUS_CODES.FORBIDDEN).json({
  //           status: commonConstant.VARIABLE.FAIL,
  //           message: `Not authorized to view this catalog item. Item belongs to user ${catalogUserId}, current user is ${currentUserId}`,
  //         });
  //       }
  //     } else {
  //       // CLIENT, ISV_SELLER cannot view details
  //       return res.status(commonConstant.STATUS_CODES.FORBIDDEN).json({
  //         status: commonConstant.VARIABLE.FAIL,
  //         message: "Not authorized to view this catalog item",
  //       });
  //     }

  //     return res.status(commonConstant.STATUS_CODES.SUCCESS).json({
  //       status: commonConstant.VARIABLE.SUCCESS,
  //       message: commonConstant.MESSAGES.SUCCESS,
  //       data: catalogItem,
  //     });
  //   } catch (error) {
  //     console.error("Error in getCatalogById:", error);
  //     return res.status(commonConstant.STATUS_CODES.SERVER_ERROR).json({
  //       status: commonConstant.VARIABLE.FAIL,
  //       message: commonConstant.MESSAGES.ERROR,
  //       error: error.message,
  //     });
  //   }
  // }

  static async getCatalogById(req, res) {
    try {
      const { id, type } = req.params;

      // Validate ID
      const catalogId = parseInt(id, 10);
      if (!id || isNaN(catalogId)) {
        return res.status(commonConstant.STATUS_CODES.BAD_REQUEST).json({
          status: commonConstant.VARIABLE.FAIL,
          message: "Invalid catalog id.",
        });
      }

      // Validate type
      if (!type || !["product", "bundle"].includes(type)) {
        return res.status(commonConstant.STATUS_CODES.BAD_REQUEST).json({
          status: commonConstant.VARIABLE.FAIL,
          message: 'Type is required. Must be "product" or "bundle"',
        });
      }

      // Fetch catalog item
      let catalogItem = await catalogService.getCatalogById(catalogId, type);

      if (!catalogItem) {
        return res.status(commonConstant.STATUS_CODES.NOT_FOUND).json({
          status: commonConstant.VARIABLE.FAIL,
          message: `${type.charAt(0).toUpperCase() + type.slice(1)} not found`,
        });
      }

      // Defensive: a failure fetching the optional "other details" row should
      // not turn the whole request into a 500 — the core catalog item is enough.
      let productOtherDetails = null;
      try {
        productOtherDetails = await ProductOtherDetails.findOne({
          where: { product_id: catalogItem.id },
        });
      } catch (otherErr) {
        console.error(
          "getCatalogById: failed to load ProductOtherDetails for",
          catalogItem.id,
          otherErr.message,
        );
      }

      // 🔥 Helper function
      const parseArrayField = (value) => {
        if (!value) return [];

        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return value.split(",").map((i) => i.trim());
        }
      };

      /* ---------------- FIX extraDataForServiceSolution ---------------- */
      let extraDataForServiceSolution = productOtherDetails;

      if (extraDataForServiceSolution) {
        extraDataForServiceSolution = extraDataForServiceSolution.toJSON
          ? extraDataForServiceSolution.toJSON()
          : extraDataForServiceSolution;

        // ✅ coverage fix
        extraDataForServiceSolution.coverage = parseArrayField(
          extraDataForServiceSolution.coverage,
        );
      }

      catalogItem.extraDataForServiceSolution = extraDataForServiceSolution;

      /* ---------------- OPTIONAL FIXES (Highly Recommended) ---------------- */

      // ✅ key_features
      if (
        catalogItem.key_features &&
        typeof catalogItem.key_features === "string"
      ) {
        catalogItem.key_features = parseArrayField(catalogItem.key_features);
      }

      // ✅ pricing_model
      if (
        catalogItem.pricing_model &&
        typeof catalogItem.pricing_model === "string"
      ) {
        try {
          catalogItem.pricing_model = JSON.parse(catalogItem.pricing_model);
        } catch {
          catalogItem.pricing_model = catalogItem.pricing_model.replace(
            /"/g,
            "",
          );
        }
      }

      /* ---------------- Role-based access ---------------- */
      // Defensive: verifyToken should always populate req.user, but guard against
      // a missing/partial user object so it returns 401 instead of a 500.
      const user = req.user || {};
      if (!user.id && !user.role_id && !user.role_type) {
        return res.status(commonConstant.STATUS_CODES.UNAUTHORIZED).json({
          status: commonConstant.VARIABLE.FAIL,
          message: "Authentication required.",
        });
      }

      if (
        user.role_id === 4 ||
        user.role_id === 3 ||
        user.role_id === 5 ||
        user.role_id === 12 // MARKETING — scoped to Marketing + Catalog
      ) {
        // Admin / Marketing can view everything
      } else if (["ISV", "SUPPORT_PARTNER"].includes(user.role_type)) {
        const catalogUserId = parseInt(catalogItem.user_id);
        const currentUserId = parseInt(user.id);

        if (catalogUserId !== currentUserId) {
          return res.status(commonConstant.STATUS_CODES.FORBIDDEN).json({
            status: commonConstant.VARIABLE.FAIL,
            message: `Not authorized to view this catalog item. Item belongs to user ${catalogUserId}, current user is ${currentUserId}`,
          });
        }
      } else {
        return res.status(commonConstant.STATUS_CODES.FORBIDDEN).json({
          status: commonConstant.VARIABLE.FAIL,
          message: "Not authorized to view this catalog item",
        });
      }

      return res.status(commonConstant.STATUS_CODES.SUCCESS).json({
        status: commonConstant.VARIABLE.SUCCESS,
        message: commonConstant.MESSAGES.SUCCESS,
        data: catalogItem,
      });
    } catch (error) {
      console.error("Error in getCatalogById:", error);
      return res.status(commonConstant.STATUS_CODES.SERVER_ERROR).json({
        status: commonConstant.VARIABLE.FAIL,
        message: commonConstant.MESSAGES.ERROR,
        error: error.message,
      });
    }
  }

  //getCatalogBySlug
  static async getCatalogBySlug(req, res) {
    try {
      const { type, slug } = req.params;
      if (!slug) {
        return res.status(commonConstant.STATUS_CODES.BAD_REQUEST).json({
          status: commonConstant.VARIABLE.FAIL,
          message: "Slug is required.",
        });
      }
      const catalogItem = await catalogService.getCatalogBySlug(type, slug);
      if (!catalogItem) {
        return res.status(commonConstant.STATUS_CODES.NOT_FOUND).json({
          status: commonConstant.VARIABLE.FAIL,
          message: `Catalog item with slug "${slug}" not found.`,
        });
      }
      return res.status(commonConstant.STATUS_CODES.SUCCESS).json({
        status: commonConstant.VARIABLE.SUCCESS,
        message: commonConstant.MESSAGES.SUCCESS,
        data: catalogItem,
      });
    } catch (error) {
      console.error("Error in getCatalogBySlug:", error);
      return res.status(commonConstant.STATUS_CODES.SERVER_ERROR).json({
        status: commonConstant.VARIABLE.FAIL,
        message: commonConstant.MESSAGES.ERROR,
        error: error.message,
      });
    }
  }

  // Get marketplace listings with search and filtering
  static async getMarketplaceProducts_withoutslug(req, res) {
    const {
      search = "",
      category,
      cloud_provider,
      action_type = "product",
      action_for = "customer",
      page = 1,
      limit = 10,
    } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;

    try {
      const values = [];
      let index = 1;
      let whereConditions = [];
      if (
        req.user.role_type == "ISV" ||
        req.user.role_type == "SUPPORT_PARTNER"
      ) {
        return res.status(403).json({
          status: "fail",
          message: "Not authorized to access marketplace products",
        });
      }

      // Enhanced search - search in all relevant fields including arrays
      if (search) {
        whereConditions.push(`(
                    LOWER(name) LIKE $${index} OR 
                    LOWER(short_description) LIKE $${index} OR 
                    LOWER(long_description) LIKE $${index} OR
                    EXISTS (
                        SELECT 1 FROM unnest(category_subcategory) AS cat 
                        WHERE LOWER(cat) LIKE $${index}
                    ) OR
                    EXISTS (
                        SELECT 1 FROM unnest(cloud_provider_support) AS cloud 
                        WHERE LOWER(cloud) LIKE $${index}
                    ) OR
                    EXISTS (
                        SELECT 1 FROM unnest(target_audience) AS audience 
                        WHERE LOWER(audience) LIKE $${index}
                    )
                )`);
        values.push(`%${search.toLowerCase()}%`);
        index++;
      }

      // Category filter
      if (category) {
        whereConditions.push(
          `EXISTS (SELECT 1 FROM unnest(category_subcategory) AS cat WHERE LOWER(cat) LIKE $${index})`,
        );
        values.push(`%${category.toLowerCase()}%`);
        index++;
      }

      // Cloud provider filter
      if (cloud_provider) {
        whereConditions.push(
          `EXISTS ( SELECT 1 FROM unnest(cloud_provider_support) AS cloud  WHERE LOWER(cloud) LIKE $${index} )`,
        );
        values.push(`%${cloud_provider.toLowerCase()}%`);
        index++;
      }

      if (action_type) {
        whereConditions.push(`action_type = $${index}`);
        values.push(action_type);
        index++;
      }
      if (action_for.toLowerCase() === "all") {
        whereConditions.push(`action_for IN ('ISV', 'customer', 'both')`);
        index++;
      } else {
        whereConditions.push(`action_for = $${index}`);
        values.push(action_for);
        index++;
      }
      const baseConditions = [
        "is_publish = true",
        "is_approved = true",
        "is_drapt = false",
      ];
      const whereClause = ` WHERE ${baseConditions.concat(whereConditions).join(" AND ")} `;

      const productQuery = `
                SELECT 
                    id,
                    'product' AS item_type,
                    name AS title,
                    short_description AS description,
                    starting_price AS starting_price,
                    product_logo AS image_url,
                    array_to_string(category_subcategory, ', ') AS category,
                    array_to_string(cloud_provider_support, ', ') AS cloud_providers,
                    pricing_model AS pricing_info,
                    free_trial_available AS has_offer,
                    array_to_string(target_audience, ', ') AS target_audience,
                    cta_model
                FROM products 
                ${whereClause} 
                ORDER BY name ASC
                LIMIT $${index} OFFSET $${index + 1}
            `;
      values.push(limitNum, offset);

      // Count query for pagination
      const countQuery = `SELECT COUNT(*) as total FROM products ${whereClause}`;
      const countParams = values.slice(0, -2);

      const [dataResult, countResult] = await Promise.all([
        pool.query(productQuery, values),
        pool.query(countQuery, countParams),
      ]);

      const total = parseInt(countResult.rows[0].total, 10);

      return res.status(200).json({
        status: "success",
        message: "Products fetched successfully",
        data: dataResult.rows,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      console.error("Error in getMarketplaceProducts:", error.message);
      return res.status(500).json({
        status: "error",
        message: "Failed to fetch products",
        error: error.message,
      });
    }
  }

  static async getMarketplaceProducts(req, res) {
    const {
      search = "",
      category,
      brand_name,
      cloud_provider,
      action_type = "product",
      action_for = "customer",
      page = 1,
      limit = 10,
    } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;

    try {
      const values = [];
      let index = 1;
      const whereConditions = [];

      /* ---------------- Base Conditions ---------------- */
      const baseConditions = [
        "p.is_publish = true",
        "p.is_approved = true",
        "p.is_drapt = false",
      ];

      /* ---------------- Search ---------------- */
      // OR LOWER(p.short_description) LIKE $${index}
      // OR LOWER(p.long_description) LIKE $${index}
      if (search) {
        whereConditions.push(`
          (
            LOWER(p.name) LIKE $${index}
            OR LOWER(p.brand_name) LIKE $${index}
            OR EXISTS (
              SELECT 1 FROM unnest(p.category_subcategory) cat
              WHERE LOWER(cat) LIKE $${index}
            )
            OR EXISTS (
              SELECT 1 FROM unnest(p.cloud_provider_support) cloud
              WHERE LOWER(cloud) LIKE $${index}
            )
            OR EXISTS (
              SELECT 1 FROM unnest(p.target_audience) audience
              WHERE LOWER(audience) LIKE $${index}
            )
          )
        `);
        values.push(`%${search.toLowerCase()}%`);
        index++;
      }

      /* ---------------- Category Filter ---------------- */
      if (category) {
        const categories = category
          .split(",")
          .map((c) => c.trim().toLowerCase());
        const categoryConditions = categories.map((cat) => {
          values.push(`%${cat}%`);
          return `
            EXISTS (
              SELECT 1 FROM unnest(p.industry) cat
              WHERE LOWER(cat) LIKE $${index++}
            )
          `;
        });
        whereConditions.push(`(${categoryConditions.join(" OR ")})`);
      }
      /*--- Brand Name Filter---*/
      if (brand_name) {
        const normalizedBrand = brand_name
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "");

        whereConditions.push(`
        REGEXP_REPLACE(LOWER(TRIM(p.brand_name)), '[^a-z0-9]', '', 'g') IN (
          SELECT REGEXP_REPLACE(LOWER(TRIM(brand_name)), '[^a-z0-9]', '', 'g')
          FROM products
          WHERE REGEXP_REPLACE(LOWER(TRIM(brand_name)), '[^a-z0-9]', '', 'g')
          LIKE $${index}
    )
  `);

        values.push(`%${normalizedBrand}%`);
        index++;
      }
      /* ---------------- Cloud Provider Filter ---------------- */
      if (cloud_provider) {
        whereConditions.push(`
          EXISTS (
            SELECT 1 FROM unnest(p.cloud_provider_support) cloud
            WHERE LOWER(cloud) LIKE $${index}
          )
        `);
        values.push(`%${cloud_provider.toLowerCase()}%`);
        index++;
      }

      /* ---------------- Action Type ---------------- */
      if (req.query.action_type && action_type.toLowerCase() !== "all") {
        whereConditions.push(`p.action_type = $${index}`);
        values.push(action_type);
        index++;
      }

      /* ---------------- Action For ---------------- */
      if (req.query.action_for) {
        if (action_for.toLowerCase() === "all") {
          whereConditions.push(`p.action_for IN ('ISV', 'customer', 'both')`);
        } else if (action_for.toLowerCase() === "both") {
          whereConditions.push(`p.action_for IN ('customer', 'both')`);
        } else {
          whereConditions.push(`p.action_for = $${index}`);
          values.push(action_for);
          index++;
        }
      }

      /* ---------------- WHERE Clause ---------------- */
      const whereClause = `
        WHERE ${baseConditions.concat(whereConditions).join(" AND ")}
      `;

      /* ---------------- Main Query ---------------- */
      const productQuery = `
        SELECT
          p.id,
          p.name AS title,
          p.short_description AS description,
          p.starting_price,
          p.brand_name,
          p.product_logo AS image_url,
          p.action_type as product_type,
          array_to_string(p.category_subcategory, ', ') AS category,
          array_to_string(p.cloud_provider_support, ', ') AS cloud_providers,
          p.pricing_model AS pricing_info,
          p.free_trial_available AS has_offer,
          array_to_string(p.target_audience, ', ') AS target_audience,
          array_to_string(p.industry, ', ') AS industry,
          array_to_string(p.target_segments, ', ') AS target_segments,
          p.cta_model,
          sd.page_url AS slug
        FROM products p LEFT JOIN seo_pages sd ON sd.page_id = p.id
        ${whereClause}
        ORDER BY p.name ASC
        LIMIT $${index} OFFSET $${index + 1}
      `;

      values.push(limitNum, offset);

      /* ---------------- Count Query ---------------- */
      const countQuery = `
        SELECT COUNT(*) AS total
        FROM products p
        ${whereClause}
      `;

      const countParams = values.slice(0, -2);

      /* ---------------- Execute Queries ---------------- */
      const [dataResult, countResult] = await Promise.all([
        pool.query(productQuery, values),
        pool.query(countQuery, countParams),
      ]);

      const total = parseInt(countResult.rows[0].total, 10);

      return res.status(200).json({
        status: "success",
        message: "Products fetched successfully",
        data: dataResult.rows,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      console.error("Error in getMarketplaceProducts:", error);
      return res.status(500).json({
        status: "error",
        message: "Failed to fetch products",
        error: error.message,
      });
    }
  }

  // 2. Product Details + Recommendations (Combined API)
  static async getProductDetails_withoutSlug(req, res) {
    const { id } = req.params;

    try {
      // Get full product details
      const productQuery = `
                SELECT 
                    p.*,
                    u.name as vendor_name,
                    u.email as vendor_email,
                    cd.company_name,
                    cd.website_url,
                    cd.brand_logo as company_logo
                FROM products p
                LEFT JOIN users u ON p.user_id = u.id
                LEFT JOIN company_detail cd ON u.id = cd.action_id AND cd.action_type = 'USER'
                WHERE p.id = $1 AND p.is_publish = true AND p.is_approved = true AND p.is_drapt = false`;

      const productResult = await pool.query(productQuery, [id]);

      if (productResult.rows.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "Product not found",
        });
      }

      const product = productResult.rows[0];

      // Get smart recommendations in same query
      const recommendationsQuery = `SELECT 
              id, name, short_description, product_logo, pricing_model, starting_price, brand_name,
              array_to_string(category_subcategory, ', ') as category, free_trial_available,
              CASE 
                  WHEN category_subcategory && $2::text[] THEN 'Similar Category'
                  WHEN cloud_provider_support && $3::text[] THEN 'Same Cloud Provider'
                  WHEN target_audience && $4::text[] THEN 'Similar Target Audience'
                  ELSE 'Top Rated' 
              END as recommendation_reason
          FROM products WHERE id != $1 AND is_publish = true AND is_approved = true AND is_drapt = false
            AND (
              category_subcategory && $2::text[] OR 
              cloud_provider_support && $3::text[] OR 
              target_audience && $4::text[]
            )
          ORDER BY 
              CASE 
                  WHEN category_subcategory && $2::text[] THEN 1
                  WHEN cloud_provider_support && $3::text[] THEN 2
                  WHEN target_audience && $4::text[] THEN 3
                  ELSE 4
              END,
              created_at DESC LIMIT 6`;

      const recommendationsResult = await pool.query(recommendationsQuery, [
        product.id,
        product.category_subcategory || [],
        product.cloud_provider_support || [],
        product.target_audience || [],
      ]);

      return res.status(200).json({
        status: "success",
        message: "Product details fetched successfully",
        data: {
          product: product,
          recommendations: recommendationsResult.rows,
        },
      });
    } catch (error) {
      console.error("Error in getProductDetails:", error.message);
      return res.status(500).json({
        status: "error",
        message: "Failed to fetch product details",
        error: error.message,
      });
    }
  }

  static async getProductDetails(req, res) {
    const { id } = req.params; // can be numeric ID or slug

    try {
      const isNumericId = /^\d+$/.test(id);

      /* ---------------- Product Query ---------------- */
      const productQuery = `
        SELECT
          p.*,
          u.name AS vendor_name,
          u.email AS vendor_email,
          cd.company_name,
          cd.website_url,
          cd.brand_logo AS company_logo,
          sd.page_url AS slug
        FROM products p
        LEFT JOIN users u 
          ON p.user_id = u.id
        LEFT JOIN company_detail cd 
          ON u.id = cd.action_id 
          AND cd.action_type = 'USER'
        LEFT JOIN seo_pages sd
          ON sd.page_id = p.id
        WHERE
          ${isNumericId ? "p.id = $1" : "sd.page_url = $1"}
          AND p.is_publish = true
          AND p.is_approved = true
          AND p.is_drapt = false
        LIMIT 1
      `;

      const productResult = await pool.query(productQuery, [id]);

      if (productResult.rows.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "Product not found",
        });
      }

      let product = productResult.rows[0];

      const productOtherDetails = await ProductOtherDetails.findOne({
        where: { product_id: product.id },
      });

      let extraDataForServiceSolution = productOtherDetails;

      if (extraDataForServiceSolution) {
        // Sequelize object → plain JSON
        extraDataForServiceSolution = extraDataForServiceSolution.toJSON
          ? extraDataForServiceSolution.toJSON()
          : extraDataForServiceSolution;

        // 🔥 FIX: Convert coverage string → array
        if (extraDataForServiceSolution.coverage) {
          try {
            // Case 1: JSON string (BEST case)
            if (extraDataForServiceSolution.coverage.startsWith("[")) {
              extraDataForServiceSolution.coverage = JSON.parse(
                extraDataForServiceSolution.coverage,
              );
            } else {
              // Case 2: Comma-separated string (fallback)
              extraDataForServiceSolution.coverage =
                extraDataForServiceSolution.coverage
                  .split(",")
                  .map((item) => item.trim());
            }
          } catch (err) {
            extraDataForServiceSolution.coverage = [];
          }
        }
      }

      product.extraDataForServiceSolution = extraDataForServiceSolution;

      /* ---------------- Recommendations ---------------- */
      const recommendationsQuery = `
        SELECT 
          p.id,
          p.name,
          p.short_description,
          p.product_logo,
          p.pricing_model,
          p.brand_name,
          p.starting_price,
          array_to_string(p.category_subcategory, ', ') AS category,
          p.free_trial_available,
          sd.page_url AS slug,
          p.action_type,
          CASE 
            WHEN p.category_subcategory && $2::text[] THEN 'Similar Category'
            WHEN p.cloud_provider_support && $3::text[] THEN 'Same Cloud Provider'
            WHEN p.target_audience && $4::text[] THEN 'Similar Target Audience'
            ELSE 'Top Rated'
          END AS recommendation_reason
        FROM products p
        LEFT JOIN seo_pages sd
          ON sd.page_id = p.id
        WHERE 
          p.id != $1
          AND p.action_type = $5
          AND p.is_publish = true
          AND p.is_approved = true
          AND p.is_drapt = false
          AND (
            p.category_subcategory && $2::text[]
            OR p.cloud_provider_support && $3::text[]
            OR p.target_audience && $4::text[]
          )
        ORDER BY
          CASE 
            WHEN p.category_subcategory && $2::text[] THEN 1
            WHEN p.cloud_provider_support && $3::text[] THEN 2
            WHEN p.target_audience && $4::text[] THEN 3
            ELSE 4
          END,
          p.created_at DESC
        LIMIT 6
      `;

      const recommendationsResult = await pool.query(recommendationsQuery, [
        product.id,
        product.category_subcategory || [],
        product.cloud_provider_support || [],
        product.target_audience || [],
        product.action_type,
      ]);

      /* ---------------- Linked Solutions (reverse lookup, product/service only) ---------------- */
      let linkedSolutions = [];

      if (["product", "service"].includes(product.action_type)) {
        const linkColumn =
          product.action_type === "product"
            ? "select_isv_products"
            : "select_spectrum_partner_services";

        const linkedSolutionsQuery = `
          SELECT
            p.id, p.name, p.brand_name, p.product_logo, p.action_type,
            p.select_isv_products, p.select_spectrum_partner_services,
            sd.page_url AS slug
          FROM products p
          LEFT JOIN seo_pages sd ON sd.page_id = p.id
          WHERE p.action_type = 'solution'
            AND p.is_publish = true
            AND p.is_approved = true
            AND p.is_drapt = false
            AND $1 = ANY(p.${linkColumn})
        `;

        const linkedSolutionsResult = await pool.query(linkedSolutionsQuery, [
          product.id,
        ]);
        linkedSolutions = linkedSolutionsResult.rows;
      }

      /* ---------------- Response ---------------- */
      return res.status(200).json({
        status: "success",
        message: "Product details fetched successfully",
        data: {
          product,
          recommendations: recommendationsResult.rows,
          linked_solutions: linkedSolutions,
        },
      });
    } catch (error) {
      console.error("Error in getProductDetails:", error);
      return res.status(500).json({
        status: "error",
        message: "Failed to fetch product details",
        error: error.message,
      });
    }
  }

  static async getMarketplaceBundles(req, res) {
    const { search = "", page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;

    try {
      const searchTerm = `%${search.toLowerCase()}%`;

      const bundleQuery = `
      SELECT 
        id,
        'bundle' AS item_type,
        name AS title,
        short_description AS description,
        bundle_logo AS image_url,
        '' AS category,
        bundle_pricing_model AS pricing_info,
        free_assessment_poc AS has_offer
      FROM bundles
      WHERE is_publish = true
        AND is_drapt = false
        AND (LOWER(name) LIKE $1 OR LOWER(short_description) LIKE $1 OR LOWER(detailed_description) LIKE $1)
      ORDER BY name ASC
      LIMIT $2 OFFSET $3
    `;

      const countQuery = `
      SELECT COUNT(*) as total
      FROM bundles
      WHERE is_publish = true
        AND is_drapt = false
        AND (LOWER(name) LIKE $1 OR LOWER(short_description) LIKE $1 OR LOWER(detailed_description) LIKE $1)
    `;

      const [dataResult, countResult] = await Promise.all([
        pool.query(bundleQuery, [searchTerm, limitNum, offset]),
        pool.query(countQuery, [searchTerm]),
      ]);

      const total = parseInt(countResult.rows[0].total, 10);

      return res.status(commonConstant.STATUS_CODES.SUCCESS).json({
        status: commonConstant.VARIABLE.SUCCESS,
        message: commonConstant.MESSAGES.SUCCESS,
        data: dataResult.rows,
        // 🔧 unified pagination
        pagination: commonConstant.PAGINATION.build({
          total,
          page: pageNum,
          limit: limitNum,
        }),
      });
    } catch (error) {
      console.error("Error in getMarketplaceBundles:", error.message);
      return res.status(commonConstant.STATUS_CODES.SERVER_ERROR).json({
        status: commonConstant.VARIABLE.FAIL,
        message: commonConstant.MESSAGES.ERROR,
        error: error.message,
      });
    }
  }

  static async getProducts(req, res) {
    try {
      // Auto-detect action_type from route path (/services, /solutions, /products)
      const routePath = req.route.path; // e.g. "/services", "/solutions", "/products"
      let defaultActionType = "product";
      if (routePath === "/services") defaultActionType = "service";
      else if (routePath === "/solutions") defaultActionType = "solution";

      const {
        page = commonConstant.PAGINATION.DEFAULT_PAGE,
        limit = commonConstant.PAGINATION.DEFAULT_LIMIT,
        search = "",
        status = "",
        aws_services = "",
        azure_services = "",
        cloud_provider = "",
        category = "",
        action_type = defaultActionType,
        action_for = "all",
        filter = {},
      } = req.query;

      let parsedFilter = filter;

      if (typeof parsedFilter === "string") {
        try {
          parsedFilter = JSON.parse(parsedFilter);
        } catch (err) {
          parsedFilter = {};
        }
      }

      const filters = { ...parsedFilter };

      const pageNum = parseInt(page, 10);
      const limitNum = Math.min(
        parseInt(limit, 10),
        commonConstant.PAGINATION.MAX_LIMIT,
      );
      const currentUser = req.user;

      // 🔧 Clean and validate filters - only pass non-empty values
      // Query params fill in filters only if not already set by the JSON filter
      if (search.trim()) filters.search = search.trim();
      if (status.trim()) filters.status = status.trim();
      if (aws_services.trim()) filters.aws_services = aws_services.trim();
      if (azure_services.trim()) filters.azure_services = azure_services.trim();
      if (cloud_provider.trim()) filters.cloud_provider = cloud_provider.trim();
      if (category.trim()) filters.category = category.trim();
      if (!filters.action_type && action_type.trim()) filters.action_type = action_type.trim();
      if (!filters.action_for && action_for.trim()) filters.action_for = action_for.trim();

      const brand = req.query.brand || '';
      if (brand.trim()) filters.brand = brand.trim();

      const is_feature = req.query.is_feature;
      if (is_feature !== undefined && is_feature !== '') filters.is_feature = is_feature;

      const result = await catalogService.getProducts(
        currentUser,
        pageNum,
        limitNum,
        filters,
      );

      return res.status(commonConstant.STATUS_CODES.SUCCESS).json({
        status: commonConstant.VARIABLE.SUCCESS,
        message: commonConstant.MESSAGES.SUCCESS,
        data: result.products,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error("Error in getProducts:", error);
      const status = error.status || commonConstant.STATUS_CODES.SERVER_ERROR;
      const message =
        error.status === 401 ? error.message : commonConstant.MESSAGES.ERROR;

      return res.status(status).json({
        status: commonConstant.VARIABLE.FAIL,
        message,
        error: error.message,
      });
    }
  }

  static async getBundles(req, res) {
    try {
      const {
        page = commonConstant.PAGINATION.DEFAULT_PAGE,
        limit = commonConstant.PAGINATION.DEFAULT_LIMIT,
        search = "",
        status = "",
        cloud_provider = "",
        supported_regions = "",
      } = req.query;

      const pageNum = parseInt(page, 10);
      const limitNum = Math.min(
        parseInt(limit, 10),
        commonConstant.PAGINATION.MAX_LIMIT,
      );
      const currentUser = req.user;

      // 🔧 Clean and validate filters - only pass non-empty values
      const filters = {};
      if (search.trim()) filters.search = search.trim();
      if (status.trim()) filters.status = status.trim();
      if (cloud_provider.trim()) filters.cloud_provider = cloud_provider.trim();
      if (supported_regions.trim())
        filters.supported_regions = supported_regions.trim();

      const result = await catalogService.getBundles(
        currentUser,
        pageNum,
        limitNum,
        filters,
      );

      return res.status(commonConstant.STATUS_CODES.SUCCESS).json({
        status: commonConstant.VARIABLE.SUCCESS,
        message: commonConstant.MESSAGES.SUCCESS,
        data: result.bundles,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error("Error in getBundles:", error);
      const status = error.status || commonConstant.STATUS_CODES.SERVER_ERROR;
      const message =
        error.status === 401 ? error.message : commonConstant.MESSAGES.ERROR;

      return res.status(status).json({
        status: commonConstant.VARIABLE.FAIL,
        message,
        error: error.message,
      });
    }
  }
  // Helper method to handle file uploads
  static async handleFileUploads(files, type) {
    const uploadedFiles = {};

    if (!files) return uploadedFiles;

    try {
      if (type === "product") {
        // Single file uploads
        if (files["product_logo"]) {
          uploadedFiles["product_logo"] = await uploadToSFTP(
            files["product_logo"][0],
          );
        }
        if (files["sla_documents"]) {
          uploadedFiles["sla_documents"] = await Promise.all(
            files["sla_documents"].map((file) => uploadToSFTP(file)),
          );
        }
        // Multiple file uploads
        if (files["screenshots"]) {
          uploadedFiles["screenshots"] = await Promise.all(
            files["screenshots"].map((file) => uploadToSFTP(file)),
          );
        }
        if (files["brochures"]) {
          uploadedFiles["brochures"] = await Promise.all(
            files["brochures"].map((file) => uploadToSFTP(file)),
          );
        }
        if (files["customer_case_studies"]) {
          uploadedFiles["customer_case_studies"] = await Promise.all(
            files["customer_case_studies"].map((file) => uploadToSFTP(file)),
          );
        }
      } else if (type === "bundle") {
        // Single file uploads
        if (files["bundle_logo"]) {
          uploadedFiles["bundle_logo"] = await uploadToSFTP(
            files["bundle_logo"][0],
          );
        }
        // Multiple file uploads
        if (files["datasheets"]) {
          uploadedFiles["datasheets"] = await Promise.all(
            files["datasheets"].map((file) => uploadToSFTP(file)),
          );
        }
        if (files["case_studies"]) {
          uploadedFiles["case_studies"] = await Promise.all(
            files["case_studies"].map((file) => uploadToSFTP(file)),
          );
        }
      }
    } catch (error) {
      console.error("Error uploading files:", error);
      throw new Error("File upload failed");
    }

    return uploadedFiles;
  }

  // Helper method to prepare product data
  static async prepareProductData(
    body,
    userId,
    uploadedFiles,
    isUpdate = false,
    existingData = null,
  ) {
    const {
      name,
      short_description,
      long_description,
      key_features,
      primary_use_cases,
      target_audience,
      cloud_provider_support,
      regions_supported,
      cta_model,
      technical_prerequisites,
      pricing_model,
      billing_dimension,
      license_model,
      free_trial_available,
      sku_id,
      api_metering_endpoint,
      demo_video_link,
      privacy_policy_url,
      compliance_certifications,
      export_control_info,
      accept_marketplace_terms,
      consent_data_privacy_policy,
      industry,
      target_segments,
      oem_sku,
      action_type,
      action_for,
      starting_price,
      solution_differentiator,
      terms_of_use_url,
      risks_addressed,
      brand_name,
      is_feature,
      category,
      category_subcategory,
      customer_challenges,
      use_cases,
      primary_business_outcome,
      slug,
      select_isv_products,
      select_spectrum_partner_services,
      tags,
    } = body;

    const productData = {};

    // Only set user_id if not updating or if it's provided
    if (!isUpdate) {
      productData.user_id = userId;
      productData.type = "product";
      productData.created_at = new Date();
    }

    productData.updated_at = new Date();

    // Helper function to set field only if provided or if creating new record
    const setField = (field, value, transformer = null) => {
      if (!isUpdate || value !== undefined) {
        if (transformer && value !== undefined) {
          productData[field] = transformer(value);
        } else if (value !== undefined) {
          productData[field] = value;
        } else if (!isUpdate) {
          // For new records, set required fields that might be missing
          productData[field] = null;
        }
      }
    };

    // Set all fields conditionally
    setField("name", name);
    setField("short_description", short_description);
    setField("long_description", long_description);
    setField("key_features", key_features);
    setField("primary_use_cases", primary_use_cases);

    // Array fields with transformation
    setField("target_audience", target_audience, (val) =>
      DataTransformer.prepareArrayForPostgres(
        DataTransformer.jsonStringToArray(val),
      ),
    );

    setField("cloud_provider_support", cloud_provider_support, (val) =>
      DataTransformer.prepareArrayForPostgres(
        DataTransformer.jsonStringToArray(val),
      ),
    );
    setField("regions_supported", regions_supported, (val) =>
      DataTransformer.prepareArrayForPostgres(
        DataTransformer.jsonStringToArray(val),
      ),
    );
    setField("cta_model", cta_model, (val) =>
      DataTransformer.prepareArrayForPostgres(
        DataTransformer.jsonStringToArray(val),
      ),
    );
    setField("compliance_certifications", compliance_certifications, (val) =>
      DataTransformer.prepareArrayForPostgres(
        DataTransformer.jsonStringToArray(val),
      ),
    );
    setField("industry", industry, (val) =>
      DataTransformer.prepareArrayForPostgres(
        DataTransformer.jsonStringToArray(val),
      ),
    );
    // Free-form searchable tags (product / service / solution). Same array
    // handling as the other list fields. On update this is undefined-guarded,
    // so it is only written when the caller actually sends tags.
    setField("tags", tags, (val) =>
      DataTransformer.prepareArrayForPostgres(
        DataTransformer.jsonStringToArray(val),
      ),
    );
    setField("category", category, (val) =>
      DataTransformer.prepareArrayForPostgres(
        DataTransformer.jsonStringToArray(val),
      ),
    );

    setField("category_subcategory", category_subcategory, (val) =>
      DataTransformer.prepareArrayForPostgres(
        DataTransformer.jsonStringToArray(val),
      ),
    );

    // Solution-specific fields
    setField("customer_challenges", customer_challenges, (val) =>
      DataTransformer.prepareArrayForPostgres(
        DataTransformer.jsonStringToArray(val),
      ),
    );
    setField("use_cases", use_cases, (val) =>
      DataTransformer.prepareArrayForPostgres(
        DataTransformer.jsonStringToArray(val),
      ),
    );
    setField("primary_business_outcome", primary_business_outcome, (val) =>
      DataTransformer.prepareArrayForPostgres(
        DataTransformer.jsonStringToArray(val),
      ),
    );
    setField("select_isv_products", select_isv_products, (val) =>
      val ? DataTransformer.prepareArrayForPostgres(
        DataTransformer.jsonStringToArray(val).map(Number),
      ) : [],
    );
    setField("select_spectrum_partner_services", select_spectrum_partner_services, (val) =>
      val ? DataTransformer.prepareArrayForPostgres(
        DataTransformer.jsonStringToArray(val).map(Number),
      ) : [],
    );

    // Auto-generate slug from name on create, or use provided slug
    if (slug) {
      setField("slug", slug);
    } else if (!isUpdate && name) {
      const base = name.toLowerCase().trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
      productData.slug = `${base}-${Date.now()}`;
    }

    setField("target_segments", target_segments, (val) =>
      DataTransformer.prepareArrayForPostgres(
        DataTransformer.jsonStringToArray(val),
      ),
    );

    // Regular fields
    setField("terms_of_use_url", terms_of_use_url);
    setField("technical_prerequisites", technical_prerequisites);
    setField("pricing_model", pricing_model);
    setField("billing_dimension", billing_dimension);
    setField("license_model", license_model);
    setField("sku_id", sku_id);
    setField("oem_sku", oem_sku);
    setField("api_metering_endpoint", api_metering_endpoint);
    setField("demo_video_link", demo_video_link);
    setField("privacy_policy_url", privacy_policy_url);
    setField("export_control_info", export_control_info);
    setField("starting_price", starting_price);
    setField("action_type", action_type);
    setField("action_for", action_for || 'customer');
    setField("solution_differentiator", solution_differentiator);
    setField("risks_addressed", risks_addressed);
    setField(
      "brand_name",
      brand_name == null ? null : brand_name.trim().replaceAll("\\s+", " "),
    );
    // Boolean fields
    setField(
      "free_trial_available",
      free_trial_available,
      (val) => val === "true" || val === true,
    );
    setField(
      "accept_marketplace_terms",
      accept_marketplace_terms,
      (val) => val === "true" || val === true,
    );
    setField(
      "consent_data_privacy_policy",
      consent_data_privacy_policy,
      (val) => val === "true" || val === true,
    );

    setField("is_feature", is_feature, (val) => {
      if (typeof val === "boolean") return val;
      if (typeof val === "string") {
        return ["true", "1", "on"].includes(val.toLowerCase());
      }
      return false;
    });
    if (uploadedFiles.sla_documents && uploadedFiles.sla_documents.length > 0) {
      productData.sla_documents = uploadedFiles.sla_documents;
    }

    // Handle uploaded files - only update if new files are provided
    if (uploadedFiles.product_logo)
      productData.product_logo = uploadedFiles.product_logo;
    if (uploadedFiles.screenshots && uploadedFiles.screenshots.length > 0) {
      // New files uploaded — combine with any existing URLs the frontend kept
      let existingScreenshots = [];
      try {
        existingScreenshots = body.existing_screenshots ? JSON.parse(body.existing_screenshots) : [];
      } catch (e) { existingScreenshots = []; }
      productData.screenshots = [...existingScreenshots, ...uploadedFiles.screenshots];
    } else if (isUpdate && body.existing_screenshots !== undefined) {
      // No new files, but frontend sent the existing list (may be empty if user cleared all)
      try {
        productData.screenshots = JSON.parse(body.existing_screenshots);
      } catch (e) { productData.screenshots = []; }
    }
    if (uploadedFiles.brochures && uploadedFiles.brochures.length > 0) {
      // New files uploaded - combine with any existing URLs the frontend kept
      let existingBrochures = [];
      try {
        existingBrochures = body.existing_brochures ? JSON.parse(body.existing_brochures) : [];
      } catch (e) { existingBrochures = []; }
      productData.brochures = [...existingBrochures, ...uploadedFiles.brochures];
    } else if (isUpdate && body.existing_brochures !== undefined) {
      // No new files, but frontend sent the existing list (may be empty if user cleared all)
      try {
        productData.brochures = JSON.parse(body.existing_brochures);
      } catch (e) { productData.brochures = []; }
    }
    if (
      uploadedFiles.customer_case_studies &&
      uploadedFiles.customer_case_studies.length > 0
    ) {
      // New files uploaded - combine with any existing URLs the frontend kept
      let existingCaseStudies = [];
      try {
        existingCaseStudies = body.existing_customer_case_studies ? JSON.parse(body.existing_customer_case_studies) : [];
      } catch (e) { existingCaseStudies = []; }
      productData.customer_case_studies = [...existingCaseStudies, ...uploadedFiles.customer_case_studies];
    } else if (isUpdate && body.existing_customer_case_studies !== undefined) {
      // No new files, but frontend sent the existing list (may be empty if user cleared all)
      try {
        productData.customer_case_studies = JSON.parse(body.existing_customer_case_studies);
      } catch (e) { productData.customer_case_studies = []; }
    }

    return productData;
  }

  // Helper method to prepare bundle data
  static async prepareBundleData(
    body,
    userId,
    uploadedFiles,
    isUpdate = false,
    existingData = null,
  ) {
    const {
      name,
      bundle_type,
      short_description,
      detailed_description,
      primary_business_outcome,
      target_customer_segments,
      licensing_model,
      delivery_mode,
      workload_types,
      supported_regions,
      bundle_pricing_model,
      indicative_price_range,
      free_assessment_poc,
      engagement_duration,
      cloud_provider_focus,
      demo_video_url,
      accept_bundle_listing_terms,
      consent_data_privacy_policy,
      external_support_required,
      select_isv_products,
      product_role_in_bundle,
      select_spectrum_partner_services,
      service_role_in_bundle,
      spectrum_partners,
    } = body;

    const bundleData = {};

    // Only set user_id if not updating or if it's provided
    if (!isUpdate) {
      bundleData.user_id = userId;
      bundleData.type = "bundle";
      bundleData.created_at = new Date();
    }

    bundleData.updated_at = new Date();

    // Helper function to set field only if provided or if creating new record
    const setField = (field, value, transformer = null) => {
      if (!isUpdate || value !== undefined) {
        if (transformer && value !== undefined) {
          bundleData[field] = transformer(value);
        } else if (value !== undefined) {
          bundleData[field] = value;
        } else if (!isUpdate) {
          bundleData[field] = null;
        }
      }
    };

    // Set all fields conditionally
    setField("name", name);
    setField("bundle_type", bundle_type || (isUpdate ? undefined : 'standard'));
    setField("short_description", short_description);
    setField("detailed_description", detailed_description);
    setField("target_customer_segments", target_customer_segments);
    setField("licensing_model", licensing_model);
    setField("delivery_mode", delivery_mode);
    setField("workload_types", workload_types);
    setField("bundle_pricing_model", bundle_pricing_model);
    setField("indicative_price_range", indicative_price_range);
    setField("engagement_duration", engagement_duration);
    setField("demo_video_url", demo_video_url);
    setField("product_role_in_bundle", product_role_in_bundle);
    setField("service_role_in_bundle", service_role_in_bundle);

    // Array fields with transformation
    setField("primary_business_outcome", primary_business_outcome, (val) =>
      DataTransformer.prepareArrayForPostgres(
        DataTransformer.jsonStringToArray(val),
      ),
    );
    setField("supported_regions", supported_regions, (val) =>
      DataTransformer.prepareArrayForPostgres(
        DataTransformer.jsonStringToArray(val),
      ),
    );
    setField("cloud_provider_focus", cloud_provider_focus, (val) =>
      DataTransformer.prepareArrayForPostgres(
        DataTransformer.jsonStringToArray(val),
      ),
    );
    setField("select_isv_products", select_isv_products, (val) =>
      val
        ? DataTransformer.prepareArrayForPostgres(
          DataTransformer.jsonStringToArray(val).map(Number),
        )
        : [],
    );
    setField(
      "select_spectrum_partner_services",
      select_spectrum_partner_services,
      (val) =>
        val
          ? DataTransformer.prepareArrayForPostgres(
            DataTransformer.jsonStringToArray(val),
          )
          : [],
    );
    setField("spectrum_partners", spectrum_partners, (val) =>
      val
        ? DataTransformer.prepareArrayForPostgres(
          DataTransformer.jsonStringToArray(val),
        )
        : [],
    );

    // Boolean fields
    setField(
      "free_assessment_poc",
      free_assessment_poc,
      (val) => val === "true" || val === true,
    );
    setField(
      "accept_bundle_listing_terms",
      accept_bundle_listing_terms,
      (val) => val === "true" || val === true,
    );
    setField(
      "consent_data_privacy_policy",
      consent_data_privacy_policy,
      (val) => val === "true" || val === true,
    );
    setField(
      "external_support_required",
      external_support_required,
      (val) => val === "true" || val === true,
    );

    // Handle uploaded files - only update if new files are provided
    if (uploadedFiles.bundle_logo)
      bundleData.bundle_logo = uploadedFiles.bundle_logo;
    if (uploadedFiles.datasheets && uploadedFiles.datasheets.length > 0) {
      bundleData.datasheets = uploadedFiles.datasheets;
    }
    if (uploadedFiles.case_studies && uploadedFiles.case_studies.length > 0) {
      bundleData.case_studies = uploadedFiles.case_studies;
    }

    return bundleData;
  }

  static async setCatalogDraftStatus(req, res) {
    try {
      const { catelogId } = req.params;
      const { is_drapt, type, status } = req.body;
      let catelog;
      if (type == "product") {
        catelog = await catalogService.updateProductDraftStatus(
          catelogId,
          is_drapt,
          status,
        );
      } else {
        catelog = await catalogService.updateBundleDraftStatus(
          catelogId,
          is_drapt,
        );
      }
      return res.status(200).json({
        status: commonConstant.VARIABLE.SUCCESS,
        message: "Draft status updated",
        catelog,
      });
    } catch (error) {
      return res
        .status(400)
        .json({ status: commonConstant.VARIABLE.FAIL, message: error.message });
    }
  }

  // Update ONLY the tags of a product/service/solution. This is a dedicated
  // endpoint so tag edits never run through the normal update path (which
  // force-resets publish/draft/approval status). Publish status is preserved:
  // a published item stays published, a draft stays a draft.
  static async updateCatalogTags(req, res) {
    try {
      const { catelogId } = req.params;
      const { tags } = req.body;

      const catelog = await catalogService.updateProductTags(catelogId, tags);

      return res.status(200).json({
        status: commonConstant.VARIABLE.SUCCESS,
        message: "Tags updated",
        data: { id: catelog.id, tags: catelog.tags },
      });
    } catch (error) {
      return res
        .status(400)
        .json({ status: commonConstant.VARIABLE.FAIL, message: error.message });
    }
  }

  // static async publishCatalog(req, res) {
  //   try {
  //     const { catelogId } = req.params;
  //     const { publish, type, status, remark } = req.body;
  //     const userId = req.user?.id || null;
  //     let catelog;
  //     if (type == "product") {
  //       catelog = await catalogService.publishProduct(
  //         catelogId,
  //         publish,
  //         userId,
  //         status,
  //         remark,
  //       );
  //     } else {
  //       catelog = await catalogService.publishBundle(
  //         catelogId,
  //         publish,
  //         userId,
  //       );
  //     }
  //     return res.status(200).json({
  //       status: commonConstant.VARIABLE.SUCCESS,
  //       message: publish ? "Catelog published" : "Catelog unpublished",
  //       catelog,
  //     });
  //   } catch (error) {
  //     return res
  //       .status(400)
  //       .json({ status: commonConstant.VARIABLE.FAIL, message: error.message });
  //   }
  // }

  // static async approveCatalog(req, res) {
  //   try {
  //     const { catelogId } = req.params;
  //     const { approve, type, status, remark } = req.body;
  //     const userId = req.user?.id || null;
  //     if (req.user.role_type != commonConstant.roleType.admin) {
  //       return res.status(500).json({
  //         status: commonConstant.VARIABLE.FAIL,
  //         message: "Only Admin can approve the products",
  //         code: commonConstant.STATUS_CODES.SERVER_ERROR,
  //       });
  //     }
  //     let catalog;
  //     if (type === "product") {
  //       catalog = await catalogService.approveProduct(
  //         catelogId,
  //         approve,
  //         userId,
  //         status,
  //         remark,
  //       );
  //     } else {
  //       catalog = await catalogService.approveBundle(
  //         catelogId,
  //         approve,
  //         userId,
  //       );
  //     }

  //     return res.status(200).json({
  //       status: commonConstant.VARIABLE.SUCCESS,
  //       message: approve ? "Product approved" : "Catalog unapproved",
  //       catalog,
  //     });
  //   } catch (error) {
  //     return res.status(400).json({
  //       status: commonConstant.VARIABLE.FAIL,
  //       message: error.message,
  //     });
  //   }
  // }

  static async publishCatalog(req, res) {
    try {
      const { catelogId } = req.params;
      const { publish, type, status, remark } = req.body;
      const userId = req.user?.id || null;
      let catelog;
      // ✅ PRODUCT
      if (type == "product") {
        catelog = await catalogService.publishProduct(
          catelogId,
          publish,
          userId,
          status,
          remark,
        );
        // ✅ Fetch Product
        const product = await Product.findByPk(catelogId);
        const user = await User.findByPk(product.user_id);
        if (publish && user?.email) {
          await emailService.sendProductPublishEmail(
            user.email,
            user.name,
            product.name,
          );
        }
      }
      // ✅ BUNDLE
      else if (type == "bundle") {
        catelog = await catalogService.publishBundle(
          catelogId,
          publish,
          userId,
        );
      }
      // ❌ INVALID TYPE
      else {
        return res.status(400).json({
          status: commonConstant.VARIABLE.FAIL,
          message: "Invalid catalog type",
        });
      }
      return res.status(200).json({
        status: commonConstant.VARIABLE.SUCCESS,
        message: publish ? "Catelog published" : "Catelog unpublished",
        catelog,
      });
    } catch (error) {
      console.error(error);
      return res.status(400).json({
        status: commonConstant.VARIABLE.FAIL,
        message: error.message,
      });
    }
  }

  static async approveCatalog(req, res) {
    try {
      const { catelogId } = req.params;
      const { approve, type, status, remark } = req.body;
      const userId = req.user?.id || null;
      // ✅ Admin Check
      const allowedRoles = [
        commonConstant.roleType.superadmin,
        commonConstant.roleType.admin,
        commonConstant.roleType.marketing,
      ];

      if (!allowedRoles.includes(req.user.role_type)) {
        return res.status(403).json({
          status: commonConstant.VARIABLE.FAIL,
          message: "Only Admin, Super Admin or Marketing can approve products",
          code: commonConstant.STATUS_CODES.FORBIDDEN,
        });
      }
      let catalog;
      // ✅ PRODUCT
      if (type === "product") {
        // ✅ Approve Product
        catalog = await catalogService.approveProduct(
          catelogId,
          approve,
          userId,
          status,
          remark,
        );
        // ✅ Fetch Product
        const product = await Product.findByPk(catelogId);
        // ✅ Fetch User manually
        const user = await User.findByPk(product.user_id);
        // ✅ Send Mail
        if (approve && user?.email) {
          await emailService.sendProductApprovalEmail(
            user.email,
            user.name,
            product.name,
          );
        }
      }
      // ✅ BUNDLE
      else if (type === "bundle") {
        catalog = await catalogService.approveBundle(
          catelogId,
          approve,
          userId,
        );
      }
      // ❌ INVALID TYPE
      else {
        return res.status(400).json({
          status: commonConstant.VARIABLE.FAIL,
          message: "Invalid catalog type",
        });
      }
      return res.status(200).json({
        status: commonConstant.VARIABLE.SUCCESS,
        message: approve ? "Product approved" : "Catalog unapproved",
        catalog,
      });
    } catch (error) {
      console.error(error);
      return res.status(400).json({
        status: commonConstant.VARIABLE.FAIL,
        message: error.message,
      });
    }
  }

  static async bulkProductUpload(req, res) {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, message: "No file uploaded" });
      }
      const result = await ProductImportService.importProducts(
        req.file.buffer,
        req.user.id,
        req.body.action_type,
        req.body.action_for,
      );

      res.status(200).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.MESSAGES.SUCCESS,
        [commonConstant.VARIABLE.MESSAGE]: "Products imported successfully",
        [commonConstant.VARIABLE.DATA]: { total: result.total },
      });
    } catch (error) {
      console.error("Import error:", error);
      res.status(500).json({
        [commonConstant.VARIABLE.STATUS]: commonConstant.VARIABLE.FAIL,
        [commonConstant.VARIABLE.MESSAGE]: error.message,
      });
    }
  }

  static async generateAndSaveSEOForExitingCatalog(req, res) {
    try {
      catalogService.generateAndSaveSEOForExitingCatalog(req);
      return res.status(200).json({
        status: commonConstant.VARIABLE.SUCCESS,
        message: "SEO generated and saved for existing catalogs",
      });
    } catch (error) {
      return res
        .status(400)
        .json({ status: commonConstant.VARIABLE.FAIL, message: error.message });
    }
  }

  static async getTopFeaturedServices(req, res) {
    try {
      const { segment_limit = 4, product_limit = 4 } = req.query;

      const parsedSegmentLimit = parseInt(segment_limit, 10) || 4;
      const parsedProductLimit = parseInt(product_limit, 10) || 4;

      const query = `
        WITH ranked AS (
          SELECT 
            cat AS target_category,
            p.id,
            p.name,
            p.image_url,
            p.product_logo,
            p.sku_id,
            p.brand_name,
            p.action_type,
            p.category,
            p.subcategory,
            ROW_NUMBER() OVER (
              PARTITION BY cat 
              ORDER BY p.created_at DESC
            ) AS rn
          FROM products p
          CROSS JOIN UNNEST(p.category) AS cat
          WHERE p.is_feature = true AND p.is_publish = true AND p.is_approved = true AND p.is_drapt = false
          AND p.deleted_at IS NULL
          AND LOWER(p.action_type) = 'service'
        )
        SELECT 
          target_category,
          COUNT(*) AS total_count,
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', id,
              'name', name,
              'image_url', image_url,
              'product_logo', product_logo,
              'sku_id', sku_id,
              'action_type', action_type,
              'brand_name', brand_name,
              'category', category,
              'subcategory', subcategory
            )
          ) FILTER (WHERE rn <= $1) AS products
        FROM ranked
        GROUP BY target_category
        ORDER BY total_count DESC
        LIMIT $2
      `;

      const result = await pool.query(query, [
        parsedProductLimit,
        parsedSegmentLimit,
      ]);

      if (!result.rows.length) {
        return res.json({
          status: "success",
          data: { categories: [] },
        });
      }

      const formatted = result.rows.map((row) => ({
        category: row.target_category,
        products: row.products || [],
        count: Math.max(0, row.total_count - (row.products?.length || 0)),
      }));

      return res.json({
        status: "success",
        data: formatted,
      });
    } catch (error) {
      console.error("Error in getTopFeaturedServices:", error);
      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }

  static async getFeaturedVendors(req, res) {
    try {
      const { limit = 12 } = req.query;
      const parsedLimit = parseInt(limit, 10);
      const vendorQuery = `
      SELECT *
      FROM (
        SELECT DISTINCT ON (LOWER(TRIM(brand_name)))
          id,
          name,
          TRIM(brand_name) AS brand_name,
          image_url,
          product_logo,
          created_at
        FROM products
        WHERE 
          is_feature = true 
          AND is_publish = true 
          AND is_approved = true 
          AND is_drapt = false 
          AND brand_name IS NOT NULL 
          AND TRIM(brand_name) != ''
        ORDER BY LOWER(TRIM(brand_name)), created_at DESC
      ) sub
    `;

      const vendorResult = await pool.query(vendorQuery);
      const vendors = vendorResult.rows;
      if (!vendors || vendors.length === 0) {
        return res.json({
          status: "success",
          data: {
            vendors: [],
            count: 0,
          },
        });
      }
      const topVendors = vendors.slice(0, parsedLimit);
      const remainingCount =
        vendors.length > parsedLimit ? vendors.length - parsedLimit : 0;
      return res.json({
        status: "success",
        data: {
          vendors: topVendors,
          count: remainingCount,
        },
      });
    } catch (error) {
      console.error("Error in getFeaturedVendors:", error);
      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }

  static async getIndustry(req, res) {
    try {
      const { limit = 20 } = req.query;
      const parsedLimit = parseInt(limit, 10);

      const query = `
      SELECT 
        id,
        name,
        icon,
        logo
      FROM industry
      ORDER BY created_at DESC
      LIMIT $1
    `;

      const result = await pool.query(query, [parsedLimit]);

      return res.json({
        status: "success",
        data: {
          industry: result.rows,
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

  static async getAllIndustry(req, res) {
    try {
      const query = `
      SELECT 
        id,
        name,
        icon,
        logo
      FROM industry
      ORDER BY created_at DESC
    `;

      const result = await pool.query(query);

      return res.json({
        status: "success",
        data: {
          industry: result.rows,
        },
      });
    } catch (error) {
      console.error("Error in getAllIndustry:", error);
      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }

  static async getTargetSegments(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;

      const pageNum = Math.max(parseInt(page, 10), 1);
      const limitNum = Math.max(parseInt(limit, 10), 1);
      const offset = (pageNum - 1) * limitNum;

      const dataQuery = `
      SELECT id, name, icon, logo
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

      return res.json({
        status: "success",
        data: {
          targetSegments: dataResult.rows,
        },
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          total_pages: totalPages,
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

  static async getAllTargetSegments(req, res) {
    try {
      const query = `
      SELECT 
        id,
        name,
        icon,
        logo
      FROM target_segments
      ORDER BY created_at DESC
    `;

      const result = await pool.query(query);

      return res.json({
        status: "success",
        data: {
          targetSegments: result.rows,
        },
      });
    } catch (error) {
      console.error("Error in getAllTargetSegments:", error);
      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }

  static async getAllVendors(req, res) {
    try {
      const { search = "" } = req.query;

      const values = [];
      let index = 1;

      // =========================
      // 🔧 Base Conditions
      // =========================
      let conditions = [
        `brand_name IS NOT NULL`,
        `brand_name != ''`,
        `is_publish = true`,
        `is_approved = true`,
        `is_drapt = false`,
      ];

      // =========================
      // 🔍 Search (normalized)
      // =========================
      if (search) {
        const normalizedSearch = search.toLowerCase().replace(/[^a-z0-9]/g, "");

        conditions.push(`
          REGEXP_REPLACE(LOWER(TRIM(brand_name)), '[^a-z0-9]', '', 'g')
          LIKE $${index}
        `);

        values.push(`%${normalizedSearch}%`);
        index++;
      }

      const whereClause = `WHERE ${conditions.join(" AND ")}`;

      // =========================
      // 🚀 UNIQUE VENDOR QUERY
      // =========================
      const vendorQuery = `
        WITH ranked_vendors AS (
          SELECT
            id,
            name,
            brand_name,
            image_url,
            product_logo,
            is_feature,
            created_at,

            -- 🔥 Normalize brand
            REGEXP_REPLACE(LOWER(TRIM(brand_name)), '[^a-z0-9]', '', 'g') AS normalized_brand,

            -- 🔥 Rank latest per brand
            ROW_NUMBER() OVER (
              PARTITION BY REGEXP_REPLACE(LOWER(TRIM(brand_name)), '[^a-z0-9]', '', 'g')
              ORDER BY created_at DESC
            ) as rn

          FROM products
          ${whereClause}
        )

        SELECT
          id,
          name,
          brand_name,
          image_url,
          product_logo,
          is_feature,
          created_at
        FROM ranked_vendors
        WHERE rn = 1   -- ✅ only 1 per brand
        ORDER BY is_feature DESC, created_at DESC
      `;

      const result = await pool.query(vendorQuery, values);

      return res.json({
        status: "success",
        data: {
          vendors: result.rows,
        },
      });
    } catch (error) {
      console.error("Error in getAllVendors:", error);
      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }

  static async getFeaturedSolutions(req, res) {
    try {
      const query = `
      SELECT
        p.id,
        p.name,
        p.image_url,
        p.product_logo,
        p.sku_id,
        p.brand_name,
        p.short_description
      FROM products p
      WHERE p.is_feature = true  AND p.is_publish = true AND p.is_approved = true AND p.is_drapt = false
      AND p.deleted_at IS NULL
      AND LOWER(p.action_type) = 'solution'
      ORDER BY p.created_at DESC
    `;

      const result = await pool.query(query);

      return res.json({
        status: "success",
        data: {
          solutions: result.rows || [],
          count: result.rowCount,
        },
      });
    } catch (error) {
      console.error("Error in getFeaturedSolutions:", error);
      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }

  static async getFeaturedProducts(req, res) {
    try {
      const query = `
        SELECT
          p.id, p.name, p.image_url, p.product_logo,
          p.sku_id, p.brand_name, p.short_description, p.category
        FROM products p
        WHERE p.is_feature = true AND p.is_publish = true AND p.is_approved = true
          AND p.is_drapt = false AND p.deleted_at IS NULL
          AND LOWER(p.action_type) = 'product'
        ORDER BY p.created_at DESC
      `;
      const result = await pool.query(query);
      return res.json({ status: "success", data: { products: result.rows || [], count: result.rowCount } });
    } catch (error) {
      console.error("Error in getFeaturedProducts:", error);
      return res.status(500).json({ status: "fail", message: "Internal server error" });
    }
  }

  static async getFeaturedServices(req, res) {
    try {
      const query = `
        SELECT
          p.id, p.name, p.image_url, p.product_logo,
          p.sku_id, p.brand_name, p.short_description, p.category
        FROM products p
        WHERE p.is_feature = true AND p.is_publish = true AND p.is_approved = true
          AND p.is_drapt = false AND p.deleted_at IS NULL
          AND LOWER(p.action_type) = 'service'
        ORDER BY p.created_at DESC
      `;
      const result = await pool.query(query);
      return res.json({ status: "success", data: { services: result.rows || [], count: result.rowCount } });
    } catch (error) {
      console.error("Error in getFeaturedServices:", error);
      return res.status(500).json({ status: "fail", message: "Internal server error" });
    }
  }

  static async updateProductFeature(req, res) {
    try {
      const { id } = req.params;
      let { is_feature } = req.body;

      // Validate ID
      if (!id) {
        return res.status(400).json({
          status: "fail",
          message: "Product ID is required",
        });
      }

      let query;
      let values;

      // Case 1: If value is provided (checkbox / dropdown)
      if (is_feature !== undefined) {
        // Normalize value safely
        if (typeof is_feature === "string") {
          const val = is_feature.toLowerCase().trim();

          if (val === "true" || val === "1") {
            is_feature = true;
          } else if (val === "false" || val === "0") {
            is_feature = false;
          } else {
            return res.status(400).json({
              status: "fail",
              message: "Invalid value for is_feature",
            });
          }
        } else {
          is_feature = Boolean(is_feature);
        }

        query = `
        UPDATE products
        SET is_feature = $1
        WHERE id = $2
        RETURNING id, name, is_feature
      `;
        values = [is_feature, id];
      } else {
        // Case 2: Toggle (no value sent)
        query = `
        UPDATE products
        SET is_feature = NOT is_feature
        WHERE id = $1
        RETURNING id, name, is_feature
      `;
        values = [id];
      }

      const result = await pool.query(query, values);

      // If product not found
      if (result.rowCount === 0) {
        return res.status(404).json({
          status: "fail",
          message: "Product not found",
        });
      }

      return res.json({
        status: "success",
        message: "Product feature updated successfully",
        data: result.rows[0],
      });
    } catch (error) {
      console.error("Error in updateProductFeature:", error);
      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }

  static async getBrandProducts(req, res) {
    try {
      const {
        search = "",
        category,
        brand_name,
        cloud_provider,
        action_type = "product",
        action_for = "customer",
        page = 1,
        limit = 10,
      } = req.query;

      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const offset = (pageNum - 1) * limitNum;

      const values = [];
      let index = 1;
      const whereConditions = [];

      /* ---------------- Base Conditions ---------------- */
      const baseConditions = [
        "p.is_publish = true",
        "p.is_approved = true",
        "p.is_drapt = false",
      ];

      /* ---------------- Search ---------------- */
      if (search) {
        whereConditions.push(`
        (
          LOWER(p.name) LIKE $${index}
          OR LOWER(p.brand_name) LIKE $${index}
          OR EXISTS (
            SELECT 1 FROM unnest(p.category) cat
            WHERE LOWER(cat) LIKE $${index}
          )
          OR EXISTS (
            SELECT 1 FROM unnest(p.cloud_provider_support) cloud
            WHERE LOWER(cloud) LIKE $${index}
          )
          OR EXISTS (
            SELECT 1 FROM unnest(p.target_audience) audience
            WHERE LOWER(audience) LIKE $${index}
          )
        )
      `);
        values.push(`%${search.toLowerCase()}%`);
        index++;
      }

      /* ---------------- Category Filter ---------------- */
      let selectedCategories = [];

      if (category) {
        const categories = category
          .split(",")
          .map((c) => c.toLowerCase().replace(/[^a-z0-9]/g, ""));

        const categoryConditions = categories.map((cat) => {
          values.push(`%${cat}%`);
          return `
      EXISTS (
        SELECT 1 
        FROM unnest(p.category) AS cat_arr
        WHERE REGEXP_REPLACE(LOWER(cat_arr), '[^a-z0-9]', '', 'g') LIKE $${index++}
      )
    `;
        });

        whereConditions.push(`(${categoryConditions.join(" OR ")})`);

        // Prepare response categories (like Industry)
        selectedCategories = categories.map((name, i) => ({
          id: i + 1,
          name,
        }));
      }

      /* ---------------- Brand Filter ---------------- */
      if (brand_name) {
        const normalizedBrand = brand_name
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "");

        whereConditions.push(`
        REGEXP_REPLACE(LOWER(TRIM(p.brand_name)), '[^a-z0-9]', '', 'g') LIKE $${index}
      `);

        values.push(`%${normalizedBrand}%`);
        index++;
      }

      /* ---------------- Cloud Provider ---------------- */
      if (cloud_provider) {
        whereConditions.push(`
        EXISTS (
          SELECT 1 FROM unnest(p.cloud_provider_support) cloud
          WHERE LOWER(cloud) LIKE $${index}
        )
      `);
        values.push(`%${cloud_provider.toLowerCase()}%`);
        index++;
      }

      /* ---------------- Action Type ---------------- */
      if (req.query.action_type && action_type.toLowerCase() !== "all") {
        whereConditions.push(`p.action_type = $${index}`);
        values.push(action_type);
        index++;
      }

      /* ---------------- Action For ---------------- */
      if (req.query.action_for) {
        if (action_for.toLowerCase() === "all") {
          whereConditions.push(`p.action_for IN ('ISV', 'customer', 'both')`);
        } else if (action_for.toLowerCase() === "both") {
          whereConditions.push(`p.action_for IN ('customer', 'both')`);
        } else {
          whereConditions.push(`p.action_for = $${index}`);
          values.push(action_for);
          index++;
        }
      }

      /* ---------------- WHERE Clause ---------------- */
      const whereClause = `
      WHERE ${baseConditions.concat(whereConditions).join(" AND ")}
    `;

      /* ---------------- MAIN QUERY ---------------- */
      const productQuery = `
      SELECT
        p.id,
        p.name AS title,
        p.short_description AS description,
        p.starting_price,
        p.brand_name,
        p.product_logo AS image_url,
        p.action_type AS product_type,
        array_to_string(p.category, ', ') AS category,
        array_to_string(p.subcategory, ', ') AS subcategory,
        array_to_string(p.cloud_provider_support, ', ') AS cloud_providers,
        p.pricing_model AS pricing_info,
        p.free_trial_available AS has_offer,
        array_to_string(p.target_audience, ', ') AS target_audience,
        p.cta_model,
        sd.page_url AS slug
      FROM products p
      LEFT JOIN seo_pages sd ON sd.page_id = p.id
      ${whereClause}
      ORDER BY p.name ASC
      LIMIT $${index} OFFSET $${index + 1}
    `;

      values.push(limitNum, offset);

      /* ---------------- COUNT QUERY ---------------- */
      const countQuery = `
      SELECT COUNT(DISTINCT p.id) AS total
      FROM products p
      ${whereClause}
    `;

      const countParams = values.slice(0, -2);

      /* ---------------- EXECUTE ---------------- */
      const [dataResult, countResult] = await Promise.all([
        pool.query(productQuery, values),
        pool.query(countQuery, countParams),
      ]);

      const total = parseInt(countResult.rows[0].total, 10);

      /* ---------------- FINAL RESPONSE ---------------- */
      let responseData;

      if (category) {
        responseData = {
          categories: selectedCategories,
          products: dataResult.rows,
        };
      } else if (brand_name && dataResult.rows.length > 0) {
        responseData = {
          brand_name: dataResult.rows[0].brand_name,
          products: dataResult.rows,
        };
      } else {
        responseData = {
          products: dataResult.rows,
        };
      }

      return res.status(200).json({
        status: "success",
        message: "Products fetched successfully",
        data: responseData,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      console.error("Error in getProductsByCategory:", error);
      return res.status(500).json({
        status: "error",
        message: "Failed to fetch products",
        error: error.message,
      });
    }
  }

  // static async getPublishedCatalogsByType(req, res) {
  //   try {
  //     const filters = req.query;

  //     const {
  //       category,
  //       subcategory,
  //       industry,
  //       target_segments,
  //       brand,
  //       cta_model,
  //       search,
  //       action_for,
  //       action_type,
  //       target_audience,
  //       cloud_provider_support,
  //       regions_supported,
  //       pricing_model,
  //       is_feature,
  //       page = 1,
  //       limit = 20,
  //     } = filters;

  //     const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  //     const limitNum = Math.max(parseInt(limit, 10) || 20, 1);
  //     const offset = (pageNum - 1) * limitNum;

  //     let conditions = [];
  //     let values = [];
  //     let index = 1;

  //     // =========================
  //     // 🔧 Helpers
  //     // =========================
  //     const toArray = (val) => {
  //       if (!val) return null;
  //       return Array.isArray(val) ? val : [val];
  //     };

  //     const addCondition = (sql, val) => {
  //       conditions.push(sql.replace("?", `$${index++}`));
  //       values.push(val);
  //     };

  //     const addArrayCondition = (column, val) => {
  //       const arr = toArray(val);
  //       if (arr) {
  //         conditions.push(`${column} && $${index++}::text[]`);
  //         values.push(arr);
  //       }
  //     };

  //     // =========================
  //     // ✅ Base Conditions
  //     // =========================
  //     conditions.push(`is_publish = true`);
  //     conditions.push(`is_approved = true`);
  //     conditions.push(`is_drapt = false`);

  //     // =========================
  //     // ✅ Scalar Filters
  //     // =========================
  //     if (action_type && action_type !== "all") {
  //       addCondition(`LOWER(action_type) = ?`, action_type.toLowerCase());
  //     }
  //     if (action_for) addCondition(`action_for = ?`, action_for);
  //     if (pricing_model) addCondition(`pricing_model = ?`, pricing_model);

  //     if (is_feature !== undefined) {
  //       addCondition(
  //         `is_feature = ?`,
  //         is_feature === "true" || is_feature === true,
  //       );
  //     }

  //     if (brand) {
  //       addCondition(`brand_name ILIKE ?`, `%${brand}%`);
  //     }

  //     // =========================
  //     // ✅ ARRAY Filters
  //     // =========================
  //     addArrayCondition("category", category);
  //     addArrayCondition("category_subcategory", subcategory);
  //     addArrayCondition("industry", industry);
  //     addArrayCondition("cta_model", cta_model);
  //     addArrayCondition("target_audience", target_audience);
  //     addArrayCondition("cloud_provider_support", cloud_provider_support);
  //     addArrayCondition("regions_supported", regions_supported);
  //     addArrayCondition("target_segments", target_segments);
  //     // =========================
  //     // 🔍 Search
  //     // =========================
  //     if (search) {
  //       conditions.push(`(
  //         name ILIKE $${index} OR 
  //         short_description ILIKE $${index} OR 
  //         long_description ILIKE $${index}
  //       )`);
  //       values.push(`%${search}%`);
  //       index++;
  //     }

  //     // let whereClause = conditions.length
  //     //   ? `WHERE ${conditions.join(" AND ")}`
  //     //   : "";

  //     // For service & solution catalogs
  //     if (
  //       action_type &&
  //       ["service", "solution"].includes(action_type.toLowerCase())
  //     ) {
  //       conditions.push(`LOWER(action_for) IN ('customer', 'both', 'isv')`);
  //     }

  //     let whereClause = conditions.length
  //       ? `WHERE ${conditions.join(" AND ")}`
  //       : "";

  //     const filterWhereClause = whereClause
  //       .replace(/\bis_publish\b/g, "p.is_publish")
  //       .replace(/\bis_approved\b/g, "p.is_approved")
  //       .replace(/\bis_drapt\b/g, "p.is_drapt")
  //       .replace(/\baction_type\b/g, "p.action_type")
  //       .replace(/\baction_for\b/g, "p.action_for")
  //       .replace(/\bpricing_model\b/g, "p.pricing_model")
  //       .replace(/\bis_feature\b/g, "p.is_feature")
  //       .replace(/\bbrand_name\b/g, "p.brand_name")
  //       .replace(/\bcategory\b/g, "p.category")
  //       .replace(/\bcategory_subcategory\b/g, "p.category_subcategory")
  //       .replace(/\bindustry\b/g, "p.industry")
  //       .replace(/\bcta_model\b/g, "p.cta_model")
  //       .replace(/\btarget_audience\b/g, "p.target_audience")
  //       .replace(/\bcloud_provider_support\b/g, "p.cloud_provider_support")
  //       .replace(/\bregions_supported\b/g, "p.regions_supported")
  //       .replace(/\btarget_segments\b/g, "p.target_segments")
  //       .replace(/\bname\b/g, "p.name")
  //       .replace(/\bshort_description\b/g, "p.short_description")
  //       .replace(/\blong_description\b/g, "p.long_description");

  //     console.log(filterWhereClause);
  //     // =========================
  //     // 🔥 MAIN DATA QUERY
  //     // =========================
  //     const dataQuery = `
  //       SELECT *
  //       FROM products
  //       ${whereClause}
  //       ORDER BY created_at DESC
  //       LIMIT $${index++}
  //       OFFSET $${index++}
  //     `;

  //     const dataValues = [...values, limitNum, offset];
  //     const countQuery = `
  //     SELECT COUNT(*) FROM products
  //     ${whereClause}
  //   `;
  //     // =========================
  //     // 🔥 FILTER QUERY (FIXED USING LATERAL)
  //     // =========================
  //     const filterQuery = `
  //          SELECT
  //             -- Brands
  //             (
  //               SELECT jsonb_agg(
  //                 jsonb_build_object(
  //                   'id', id,
  //                   'name', name,
  //                   'icon', icon
  //                 )
  //               )
  //               FROM (
  //                 SELECT DISTINCT ON (
  //                   LOWER(regexp_replace(name, '\s*-\s*', '-', 'g'))
  //                 )
  //                   id, name, icon
  //                 FROM brand
  //                 WHERE status = true
  //                 ORDER BY 
  //                   LOWER(regexp_replace(name, '\s*-\s*', '-', 'g')),
  //                   id
  //               ) b
  //             ) AS brands,

  //             -- Categories
  //             (
  //               SELECT jsonb_agg(
  //                 jsonb_build_object(
  //                   'id', id,
  //                   'name', name
  //                 )
  //               )
  //               FROM (
  //                 SELECT DISTINCT ON (
  //                   LOWER(regexp_replace(name, '\s*-\s*', '-', 'g'))
  //                 )
  //                   id, name
  //                 FROM categories
  //                 ORDER BY 
  //                   LOWER(regexp_replace(name, '\s*-\s*', '-', 'g')),
  //                   id
  //               ) c
  //             ) AS categories,

  //             -- Subcategories
  //             (
  //               SELECT jsonb_agg(
  //                 jsonb_build_object(
  //                   'id', id,
  //                   'name', name,
  //                   'category_name', category_name
  //                 )
  //               )
  //               FROM (
  //                 SELECT DISTINCT ON (
  //                   LOWER(regexp_replace(name, '[\s-]+', '', 'g'))
  //                 )
  //                   id,
  //                   name,
  //                   category_name
  //                 FROM sub_categories
  //                 ORDER BY 
  //                   LOWER(regexp_replace(name, '[\s-]+', '', 'g')),
  //                   id
  //               ) s
  //             ) AS subcategories,

  //             -- Industries
  //             (
  //               SELECT jsonb_agg(
  //                 jsonb_build_object(
  //                   'id', id,
  //                   'name', name
  //                 )
  //               )
  //               FROM (
  //                 SELECT DISTINCT ON (
  //                   LOWER(regexp_replace(name, '\s*-\s*', '-', 'g'))
  //                 )
  //                   id, name
  //                 FROM industry
  //                 ORDER BY 
  //                   LOWER(regexp_replace(name, '\s*-\s*', '-', 'g')),
  //                   id
  //               ) t
  //             ) AS industry,

  //             -- Target Segments
  //              (
  //               SELECT jsonb_agg(
  //                 jsonb_build_object(
  //                   'id', id,
  //                   'name', name
  //                 )
  //               )
  //               FROM (
  //                 SELECT DISTINCT ON (
  //                   LOWER(regexp_replace(name, '\s*-\s*', '-', 'g'))
  //                 )
  //                   id, name
  //                 FROM target_segments
  //                 ORDER BY 
  //                   LOWER(regexp_replace(name, '\s*-\s*', '-', 'g')),
  //                   id
  //               ) t
  //             ) AS target_segments,

  //             -- Target Audience
  //             (
  //               SELECT jsonb_agg(
  //                 jsonb_build_object(
  //                   'id', id,
  //                   'name', name
  //                 )
  //               )
  //               FROM (
  //                 SELECT DISTINCT ON (
  //                   LOWER(regexp_replace(name, '\s*-\s*', '-', 'g'))
  //                 )
  //                   id, name
  //                 FROM target_audience
  //                 ORDER BY 
  //                   LOWER(regexp_replace(name, '\s*-\s*', '-', 'g')),
  //                   id
  //               ) ta
  //             ) AS target_audience,

  //             -- Cloud Providers
  //             (
  //               SELECT jsonb_agg(jsonb_build_object('name', cp, 'count', count))
  //               FROM (
  //                 SELECT cp, COUNT(*) as count
  //                 FROM products p
  //                 CROSS JOIN LATERAL unnest(p.cloud_provider_support) AS cp
  //                 ${filterWhereClause}
  //                 GROUP BY cp
  //               ) z
  //             ) AS cloud_provider_support,

  //             -- Regions
  //             (
  //               SELECT jsonb_agg(jsonb_build_object('name', r, 'count', count))
  //               FROM (
  //                 SELECT r, COUNT(*) as count
  //                 FROM products p
  //                 CROSS JOIN LATERAL unnest(p.regions_supported) AS r
  //                 ${filterWhereClause}  
  //                 GROUP BY r
  //               ) r1
  //             ) AS regions_supported
  //         `;
  //     console.log("WHERE CLAUSE:");
  //     console.log(whereClause);

  //     console.log("FILTER WHERE CLAUSE:");
  //     console.log(filterWhereClause);

  //     console.log("VALUES:");
  //     console.log(values);

  //     // =========================
  //     // 🚀 Execute Queries
  //     // =========================
  //     const [dataResult, filterResult, countResult] = await Promise.all([
  //       pool.query(dataQuery, dataValues),
  //       pool.query(filterQuery, values),
  //       pool.query(countQuery, values),
  //     ]);
  //     console.log("TOTAL:", countResult.rows[0].count);
  //     console.log("ROWS:", dataResult.rowCount);
  //     console.log("DATA VALUES:", dataValues);
  //     console.log("DATA QUERY:", dataQuery);
  //     //pagination calculations
  //     const total = parseInt(countResult.rows[0].count, 10);
  //     const totalPages = Math.ceil(total / limitNum);

  //     const hasNext = pageNum < totalPages;
  //     const hasPrev = pageNum > 1;

  //     const nextPage = hasNext ? pageNum + 1 : null;
  //     const prevPage = hasPrev ? pageNum - 1 : null;

  //     const generatePages = () => {
  //       const pages = [];

  //       if (totalPages <= 5) {
  //         for (let i = 1; i <= totalPages; i++) pages.push(i);
  //       } else {
  //         pages.push(1);

  //         if (pageNum > 3) pages.push("...");

  //         for (
  //           let i = Math.max(2, pageNum - 1);
  //           i <= Math.min(totalPages - 1, pageNum + 1);
  //           i++
  //         ) {
  //           if (!pages.includes(i)) pages.push(i);
  //         }

  //         if (pageNum < totalPages - 2) pages.push("...");

  //         if (!pages.includes(totalPages)) pages.push(totalPages);
  //       }

  //       return pages;
  //     };
  //     return res.json({
  //       success: true,
  //       count: dataResult.rowCount,
  //       data: dataResult.rows,
  //       filters: filterResult.rows[0],
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
  //     console.error("Error fetching catalogs:", error);
  //     return res.status(500).json({
  //       success: false,
  //       message: "Failed to load catalogs",
  //     });
  //   }
  // }

  static async getPublishedCatalogsByType(req, res) {
    try {
      const filters = req.query;

      const {
        category,
        subcategory,
        industry,
        target_segments,
        brand,
        cta_model,
        search,
        action_for,
        action_type,
        target_audience,
        cloud_provider_support,
        regions_supported,
        pricing_model,
        is_feature,
        has_private_offer,
        page = 1,
        limit = 20,
      } = filters;

      const pageNum = Math.max(parseInt(page, 10) || 1, 1);
      const limitNum = Math.max(parseInt(limit, 10) || 20, 1);
      const offset = (pageNum - 1) * limitNum;

      let conditions = [];
      let values = [];
      let index = 1;

      // =========================
      // 🔧 Helpers
      // =========================
      const toArray = (val) => {
        if (!val) return null;
        return Array.isArray(val) ? val : [val];
      };

      const addCondition = (sql, val) => {
        conditions.push(sql.replace("?", `$${index++}`));
        values.push(val);
      };

      const addArrayCondition = (column, val) => {
        const arr = toArray(val);
        if (arr) {
          conditions.push(`${column} && $${index++}::text[]`);
          values.push(arr);
        }
      };

      // =========================
      // ✅ Base Conditions
      // =========================
      conditions.push(`is_publish = true`);
      conditions.push(`is_approved = true`);
      conditions.push(`is_drapt = false`);
      conditions.push(`deleted_at IS NULL`);

      // =========================
      // ✅ Scalar Filters
      // =========================
      if (action_type && action_type !== "all") {
        addCondition(`LOWER(action_type) = ?`, action_type.toLowerCase());
      }
      if (action_for) addCondition(`action_for = ?`, action_for);
      if (pricing_model) addCondition(`pricing_model = ?`, pricing_model);

      if (is_feature !== undefined) {
        addCondition(
          `is_feature = ?`,
          is_feature === "true" || is_feature === true,
        );
      }

      if (has_private_offer !== undefined) {
        addCondition(
          `has_private_offer = ?`,
          has_private_offer === "true" || has_private_offer === true,
        );
      }

      if (brand) {
        addCondition(`brand_name ILIKE ?`, brand);
      }

      // =========================
      // ✅ ARRAY Filters
      // =========================
      addArrayCondition("category", category);
      addArrayCondition("category_subcategory", subcategory);
      addArrayCondition("industry", industry);
      addArrayCondition("cta_model", cta_model);
      addArrayCondition("target_audience", target_audience);
      addArrayCondition("cloud_provider_support", cloud_provider_support);
      addArrayCondition("regions_supported", regions_supported);
      addArrayCondition("target_segments", target_segments);
      // =========================
      // 🔍 Search
      // =========================
      if (search) {
        conditions.push(`(
          name ILIKE $${index} OR
          brand_name ILIKE $${index} OR
          EXISTS (SELECT 1 FROM unnest(tags) tg WHERE tg ILIKE $${index})
        )`);
        values.push(`%${search}%`);
        index++;
      }

      // let whereClause = conditions.length
      //   ? `WHERE ${conditions.join(" AND ")}`
      //   : "";

      // For service & solution catalogs
      if (
        action_type &&
        ["service", "solution"].includes(action_type.toLowerCase())
      ) {
        conditions.push(`LOWER(action_for) IN ('customer', 'both', 'isv')`);
      }

      let whereClause = conditions.length
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

      const prefixColumn = (col) => `p.${col}`;
      const applyPrefixes = (clause) =>
        clause
          .replace(/\bis_publish\b/g, "p.is_publish")
          .replace(/\bis_approved\b/g, "p.is_approved")
          .replace(/\bis_drapt\b/g, "p.is_drapt")
          .replace(/\bdeleted_at\b/g, "p.deleted_at")
          .replace(/\baction_type\b/g, "p.action_type")
          .replace(/\baction_for\b/g, "p.action_for")
          .replace(/\bpricing_model\b/g, "p.pricing_model")
          .replace(/\bis_feature\b/g, "p.is_feature")
          .replace(/\bhas_private_offer\b/g, "p.has_private_offer")
          .replace(/\bbrand_name\b/g, "p.brand_name")
          .replace(/\bcategory\b/g, "p.category")
          .replace(/\bcategory_subcategory\b/g, "p.category_subcategory")
          .replace(/\bindustry\b/g, "p.industry")
          .replace(/\bcta_model\b/g, "p.cta_model")
          .replace(/\btarget_audience\b/g, "p.target_audience")
          .replace(/\bcloud_provider_support\b/g, "p.cloud_provider_support")
          .replace(/\bregions_supported\b/g, "p.regions_supported")
          .replace(/\btarget_segments\b/g, "p.target_segments")
          .replace(/\bname\b/g, "p.name")
          .replace(/\bshort_description\b/g, "p.short_description")
          .replace(/\blong_description\b/g, "p.long_description")
          .replace(/\btags\b/g, "p.tags");

      // Full where clause with all filters (used for data + count queries)
      const filterWhereClause = applyPrefixes(whereClause);

      // =========================
      // 🔥 MAIN DATA QUERY
      // =========================
      const dataQuery = `
        SELECT *
        FROM products
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${index++}
        OFFSET $${index++}
      `;

      const dataValues = [...values, limitNum, offset];
      const countQuery = `
      SELECT COUNT(*) FROM products
      ${whereClause}
    `;

      // =========================
      // 🔥 FILTER QUERY
      // Build a "base" where clause that excludes category & subcategory
      // conditions so that the category/subcategory lists in the sidebar
      // remain stable regardless of which category or subcategory is selected.
      // =========================

      // Rebuild conditions without category / category_subcategory filters
      // so the sidebar always shows all available categories/subcategories
      // for the current action_type / brand / etc.
      const baseConditions = [];
      let baseValues = [];
      let baseIndex = 1;

      const addBaseCondition = (sql, val) => {
        baseConditions.push(sql.replace("?", `$${baseIndex++}`));
        baseValues.push(val);
      };
      const addBaseArrayCondition = (column, val) => {
        const arr = toArray(val);
        if (arr) {
          baseConditions.push(`${column} && $${baseIndex++}::text[]`);
          baseValues.push(arr);
        }
      };

      // Always-on base conditions
      baseConditions.push(`is_publish = true`);
      baseConditions.push(`is_approved = true`);
      baseConditions.push(`is_drapt = false`);
      baseConditions.push(`deleted_at IS NULL`);

      // Scalar filters (no category / subcategory here)
      if (action_type && action_type !== "all") {
        addBaseCondition(`LOWER(action_type) = ?`, action_type.toLowerCase());
      }
      if (action_for) addBaseCondition(`action_for = ?`, action_for);
      if (pricing_model) addBaseCondition(`pricing_model = ?`, pricing_model);
      if (is_feature !== undefined) {
        addBaseCondition(`is_feature = ?`, is_feature === "true" || is_feature === true);
      }
      if (has_private_offer !== undefined) {
        addBaseCondition(`has_private_offer = ?`, has_private_offer === "true" || has_private_offer === true);
      }
      if (brand) addBaseCondition(`brand_name ILIKE ?`, brand);

      // Array filters except category / subcategory
      addBaseArrayCondition("industry", industry);
      addBaseArrayCondition("cta_model", cta_model);
      addBaseArrayCondition("target_audience", target_audience);
      addBaseArrayCondition("cloud_provider_support", cloud_provider_support);
      addBaseArrayCondition("regions_supported", regions_supported);
      addBaseArrayCondition("target_segments", target_segments);

      if (search) {
        baseConditions.push(`(name ILIKE $${baseIndex} OR brand_name ILIKE $${baseIndex} OR EXISTS (SELECT 1 FROM unnest(tags) tg WHERE tg ILIKE $${baseIndex}))`);
        baseValues.push(`%${search}%`);
        baseIndex++;
      }
      if (action_type && ["service", "solution"].includes(action_type.toLowerCase())) {
        baseConditions.push(`LOWER(action_for) IN ('customer', 'both', 'isv')`);
      }

      const baseWhereClause = baseConditions.length
        ? `WHERE ${baseConditions.join(" AND ")}`
        : "";
      const baseFilterWhereClause = applyPrefixes(baseWhereClause);

      // filterQueryValues uses baseValues (not values) so category/subcategory
      // conditions don't restrict what appears in the sidebar lists.
      let filterQueryValues = [...baseValues];

      // Subcategories: always populated.
      // When a category is selected, scope to that category; otherwise show all.
      const selectedCategories = toArray(category);
      let subcategoriesQuery;
      if (selectedCategories && selectedCategories.length > 0) {
        filterQueryValues.push(selectedCategories);
        const paramIndex = filterQueryValues.length;
        subcategoriesQuery = `
          (
            SELECT jsonb_agg(
              jsonb_build_object('id', id, 'name', name, 'category_name', category_name)
            )
            FROM (
              SELECT DISTINCT ON (LOWER(regexp_replace(s.name, '[\\s-]+', '', 'g')))
                s.id, s.name, s.category_name
              FROM sub_categories s
              JOIN filtered_products p ON EXISTS (
                SELECT 1 FROM unnest(p.category_subcategory) sub
                WHERE LOWER(TRIM(sub)) = LOWER(TRIM(s.name))
              )
              WHERE LOWER(s.category_name) = ANY(SELECT LOWER(c) FROM unnest($${paramIndex}::text[]) AS t(c))
              ORDER BY LOWER(regexp_replace(s.name, '[\\s-]+', '', 'g')), s.id
            ) s
          ) AS subcategories
        `;
      } else {
        // No category selected: show all subcategories present in the result set
        subcategoriesQuery = `
          (
            SELECT jsonb_agg(
              jsonb_build_object('id', id, 'name', name, 'category_name', category_name)
            )
            FROM (
              SELECT DISTINCT ON (LOWER(regexp_replace(s.name, '[\\s-]+', '', 'g')))
                s.id, s.name, s.category_name
              FROM sub_categories s
              JOIN filtered_products p ON EXISTS (
                SELECT 1 FROM unnest(p.category_subcategory) sub
                WHERE LOWER(TRIM(sub)) = LOWER(TRIM(s.name))
              )
              ORDER BY LOWER(regexp_replace(s.name, '[\\s-]+', '', 'g')), s.id
            ) s
          ) AS subcategories
        `;
      }

      const filterQuery = `
           WITH filtered_products AS (
             SELECT * FROM products p
             ${baseFilterWhereClause}
           )
           SELECT
              -- Brands
              (
                SELECT jsonb_agg(
                  jsonb_build_object(
                    'id', id,
                    'name', name,
                    'icon', icon
                  )
                )
                FROM (
                  SELECT DISTINCT ON (
                    LOWER(regexp_replace(b.name, '\\s*-\\s*', '-', 'g'))
                  )
                    b.id, b.name, b.icon
                  FROM brand b
                  JOIN filtered_products p ON LOWER(TRIM(p.brand_name)) = LOWER(TRIM(b.name))
                  WHERE b.status = true
                  ORDER BY 
                    LOWER(regexp_replace(b.name, '\\s*-\\s*', '-', 'g')),
                    b.id
                ) b
              ) AS brands,

              -- Categories
              (
                SELECT jsonb_agg(
                  jsonb_build_object(
                    'id', id,
                    'name', name
                  )
                )
                FROM (
                  SELECT DISTINCT ON (
                    LOWER(regexp_replace(c.name, '\\s*-\\s*', '-', 'g'))
                  )
                    c.id, c.name
                  FROM categories c
                  JOIN filtered_products p ON EXISTS (
                    SELECT 1 FROM unnest(p.category) cat 
                    WHERE LOWER(TRIM(cat)) = LOWER(TRIM(c.name))
                  )
                  ORDER BY 
                    LOWER(regexp_replace(c.name, '\\s*-\\s*', '-', 'g')),
                    c.id
                ) c
              ) AS categories,

              -- Subcategories
              ${subcategoriesQuery},

              -- Industries
              (
                SELECT jsonb_agg(
                  jsonb_build_object(
                    'id', id,
                    'name', name
                  )
                )
                FROM (
                  SELECT DISTINCT ON (
                    LOWER(regexp_replace(i.name, '\\s*-\\s*', '-', 'g'))
                  )
                    i.id, i.name
                  FROM industry i
                  JOIN filtered_products p ON EXISTS (
                    SELECT 1 FROM unnest(p.industry) ind 
                    WHERE LOWER(TRIM(ind)) = LOWER(TRIM(i.name))
                  )
                  ORDER BY 
                    LOWER(regexp_replace(i.name, '\\s*-\\s*', '-', 'g')),
                    i.id
                ) t
              ) AS industry,

              -- Target Segments
               (
                SELECT jsonb_agg(
                  jsonb_build_object(
                    'id', id,
                    'name', name
                  )
                )
                FROM (
                  SELECT DISTINCT ON (
                    LOWER(regexp_replace(ts_master.name, '\\s*-\\s*', '-', 'g'))
                  )
                    ts_master.id, ts_master.name
                  FROM target_segments ts_master
                  JOIN filtered_products p ON EXISTS (
                    SELECT 1 FROM unnest(p.target_segments) ts 
                    WHERE LOWER(TRIM(ts)) = LOWER(TRIM(ts_master.name))
                  )
                  ORDER BY 
                    LOWER(regexp_replace(ts_master.name, '\\s*-\\s*', '-', 'g')),
                    ts_master.id
                ) t
              ) AS target_segments,

              -- Target Audience
              (
                SELECT jsonb_agg(
                  jsonb_build_object(
                    'id', id,
                    'name', name
                  )
                )
                FROM (
                  SELECT DISTINCT ON (
                    LOWER(regexp_replace(ta_master.name, '\\s*-\\s*', '-', 'g'))
                  )
                    ta_master.id, ta_master.name
                  FROM target_audience ta_master
                  JOIN filtered_products p ON EXISTS (
                    SELECT 1 FROM unnest(p.target_audience) ta_val 
                    WHERE LOWER(TRIM(ta_val)) = LOWER(TRIM(ta_master.name))
                  )
                  ORDER BY 
                    LOWER(regexp_replace(ta_master.name, '\\s*-\\s*', '-', 'g')),
                    ta_master.id
                ) ta
              ) AS target_audience,

              -- Cloud Providers
              (
                SELECT jsonb_agg(jsonb_build_object('name', cp, 'count', count))
                FROM (
                  SELECT cp, COUNT(*) as count
                  FROM filtered_products p
                  CROSS JOIN LATERAL unnest(p.cloud_provider_support) AS cp
                  GROUP BY cp
                ) z
              ) AS cloud_provider_support,

              -- Regions
              (
                SELECT jsonb_agg(jsonb_build_object('name', r, 'count', count))
                FROM (
                  SELECT r, COUNT(*) as count
                  FROM filtered_products p
                  CROSS JOIN LATERAL unnest(p.regions_supported) AS r
                  GROUP BY r
                ) r1
              ) AS regions_supported
          `;
      // console.log("WHERE CLAUSE:");
      // console.log(whereClause);

      // console.log("FILTER WHERE CLAUSE:");
      // console.log(filterWhereClause);

      // console.log("VALUES:");
      // console.log(values);

      // =========================
      // 🚀 Execute Queries
      // =========================
      const [dataResult, filterResult, countResult] = await Promise.all([
        pool.query(dataQuery, dataValues),
        pool.query(filterQuery, filterQueryValues),
        pool.query(countQuery, values),
      ]);
      // console.log("TOTAL:", countResult.rows[0].count);
      // console.log("ROWS:", dataResult.rowCount);
      // console.log("DATA VALUES:", dataValues);
      // console.log("DATA QUERY:", dataQuery);
      //pagination calculations
      const total = parseInt(countResult.rows[0].count, 10);
      const totalPages = Math.ceil(total / limitNum);

      const hasNext = pageNum < totalPages;
      const hasPrev = pageNum > 1;

      const nextPage = hasNext ? pageNum + 1 : null;
      const prevPage = hasPrev ? pageNum - 1 : null;

      const generatePages = () => {
        const pages = [];

        if (totalPages <= 5) {
          for (let i = 1; i <= totalPages; i++) pages.push(i);
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
        success: true,
        count: dataResult.rowCount,
        data: dataResult.rows,
        filters: filterResult.rows[0],
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
      console.error("Error fetching catalogs:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to load catalogs",
      });
    }
  }

  static async getTopFeaturedProducts(req, res) {
    try {
      const { segment_limit = 4, product_limit = 5 } = req.query;

      const parsedSegmentLimit = parseInt(segment_limit, 10) || 4;
      const parsedProductLimit = parseInt(product_limit, 10) || 5;

      const query = `
        WITH unique_products AS (
          -- ✅ Step 1: remove duplicates globally (by SKU)
          SELECT DISTINCT ON (p.sku_id)
            p.id,
            p.name,
            p.image_url,
            p.product_logo,
            p.sku_id,
            TRIM(p.brand_name) AS brand_name,
            p.action_type,
            p.category,
            p.subcategory,
            p.created_at,
            p.is_feature,

            -- ✅ pick first category
            p.category[1] AS main_category

          FROM products p
          WHERE 
            p.is_publish = true
            AND p.is_approved = true
            AND p.is_drapt = false
            AND p.deleted_at IS NULL
            AND LOWER(p.action_type) = 'product'

            -- ✅ 🚀 FIX: remove null/empty categories
            AND p.category IS NOT NULL
            AND array_length(p.category, 1) > 0
            AND TRIM(p.category[1]) <> ''

          -- ✅ keep latest version of same product
          ORDER BY p.sku_id, p.created_at DESC
        ),

        ranked AS (
          SELECT *,
            ROW_NUMBER() OVER (
              PARTITION BY main_category
              ORDER BY 
                is_feature DESC,
                created_at DESC
            ) AS rn
          FROM unique_products
        ),

        limited_products AS (
          SELECT *
          FROM ranked
          WHERE rn <= $1
        ),

        category_counts AS (
          SELECT cat AS main_category, COUNT(*) AS real_total_count
          FROM products p, unnest(p.category) AS cat
          WHERE 
            p.is_publish = true
            AND p.is_approved = true
            AND p.is_drapt = false
            AND p.deleted_at IS NULL
            AND LOWER(p.action_type) = 'product'
          GROUP BY cat
        ),

        grouped AS (
          SELECT 
            lp.main_category,
            cc.real_total_count AS total_count,
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'id', lp.id,
                'name', lp.name,
                'image_url', lp.image_url,
                'product_logo', lp.product_logo,
                'sku_id', lp.sku_id,
                'brand_name', lp.brand_name,
                'action_type', lp.action_type,
                'category', lp.category,
                'subcategory', lp.subcategory
              )
              ORDER BY lp.is_feature DESC, lp.created_at DESC
            ) AS products
          FROM limited_products lp
          JOIN category_counts cc ON cc.main_category = lp.main_category
          GROUP BY lp.main_category, cc.real_total_count
        )

        SELECT *
        FROM grouped
        ORDER BY total_count DESC
        LIMIT $2;
      `;

      const result = await pool.query(query, [
        parsedProductLimit, // products per category
        parsedSegmentLimit, // number of categories
      ]);

      if (!result.rows.length) {
        return res.json({
          status: "success",
          data: [],
        });
      }

      const formatted = result.rows.map((row) => ({
        category: row.main_category,
        products: row.products || [],
        count: Number(row.total_count),
      }));

      return res.json({
        status: "success",
        data: formatted,
      });
    } catch (error) {
      console.error("Error in getTopFeaturedProducts:", error);
      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }

  static async getCategoryShowcase(req, res) {
    try {
      // Only categories the admin has explicitly marked as featured
      // (categories.is_feature) show up here, each populated with its
      // published items — products first, then services, then solutions,
      // is_feature items first within each type.
      const query = `
        WITH unique_products AS (
          -- remove duplicates globally (by SKU), across all catalog types
          SELECT DISTINCT ON (p.sku_id)
            p.id,
            p.name,
            p.image_url,
            p.product_logo,
            p.sku_id,
            TRIM(p.brand_name) AS brand_name,
            p.action_type,
            p.category,
            p.subcategory,
            p.short_description,
            p.created_at,
            p.is_feature,
            CASE LOWER(p.action_type)
              WHEN 'product' THEN 0
              WHEN 'service' THEN 1
              WHEN 'solution' THEN 2
              ELSE 3
            END AS type_priority
          FROM products p
          WHERE
            p.is_publish = true
            AND p.is_approved = true
            AND p.is_drapt = false
            AND p.deleted_at IS NULL
            AND p.category IS NOT NULL
            AND array_length(p.category, 1) > 0
          ORDER BY p.sku_id, p.created_at DESC
        )

        SELECT
          c.id AS category_id,
          c.name AS category,
          COALESCE((
            SELECT JSON_AGG(
              JSON_BUILD_OBJECT(
                'id', up.id,
                'name', up.name,
                'image_url', up.image_url,
                'product_logo', up.product_logo,
                'sku_id', up.sku_id,
                'brand_name', up.brand_name,
                'action_type', up.action_type,
                'category', up.category,
                'subcategory', up.subcategory,
                'short_description', up.short_description,
                'is_feature', up.is_feature
              )
              ORDER BY up.type_priority ASC, up.is_feature DESC, up.created_at DESC
            )
            FROM (
              SELECT *
              FROM unique_products up2
              WHERE up2.category && ARRAY[c.name]::text[]
              ORDER BY up2.type_priority ASC, up2.is_feature DESC, up2.created_at DESC
            ) up
          ), '[]'::json) AS items
        FROM categories c
        WHERE c.is_feature = true
        ORDER BY c.name ASC;
      `;

      const result = await pool.query(query);

      const formatted = result.rows
        .map((row) => ({
          category_id: row.category_id,
          category: row.category,
          items: row.items || [],
        }))
        .filter((group) => group.items.length > 0);

      return res.json({
        status: "success",
        data: formatted,
      });
    } catch (error) {
      console.error("Error in getCategoryShowcase:", error);
      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }

  static async getAllValidBrands(req, res) {
    try {
      const { brand_name = "" } = req.query;

      let query = `
      SELECT 
        id,
        TRIM(name) AS name,
        icon,
        description,
        status
      FROM brand
      WHERE 1=1
    `;

      const values = [];

      // 🔍 Search filter
      if (brand_name.trim()) {
        values.push(`%${brand_name.trim()}%`);
        query += ` AND TRIM(name) ILIKE $${values.length}`;
      }

      // ✅ Final ordering
      query += ` ORDER BY created_at DESC`;

      const result = await pool.query(query, values);

      if (!result.rows.length) {
        return res.json({
          status: "success",
          data: { brands: [] },
        });
      }

      const formatted = result.rows.map((row) => ({
        id: row.id,
        brand_name: row.name, // ✅ correct field
      }));

      return res.json({
        status: "success",
        data: { brands: formatted },
      });
    } catch (error) {
      console.error("Error in getAllValidBrands:", error);
      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }

  static async getProductsByCTA(req, res) {
    try {
      let { page = 1, limit = 10, cta } = req.query;

      const cleanValue = (val) => {
        if (typeof val !== "string") return val;
        return val.replace(/^["']+|["']+$/g, "").trim();
      };

      const toArray = (val) => {
        if (Array.isArray(val)) return val.map(cleanValue);
        return [cleanValue(val)];
      };

      page = parseInt(page);
      limit = parseInt(limit);
      const offset = (page - 1) * limit;

      let conditions = [];
      let values = [];

      if (cta) {
        const arr = toArray(cta);
        values.push(arr);

        conditions.push(`
        EXISTS (
          SELECT 1
          FROM unnest(cta_model) AS c
          WHERE regexp_replace(lower(c), '[^a-z0-9]', '', 'g')
            LIKE ANY (
              SELECT '%' || regexp_replace(lower(x), '[^a-z0-9]', '', 'g') || '%'
              FROM unnest($${values.length}::text[]) AS x
            )
        )
      `);
      }

      const whereClause = conditions.length
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

      const paginatedValues = [...values, limit, offset];

      const productQuery = `
      SELECT *
      FROM products
      ${whereClause}
      LIMIT $${values.length + 1}
      OFFSET $${values.length + 2}
    `;

      const countQuery = `
      SELECT COUNT(*)
      FROM products
      ${whereClause}
    `;

      const [productResult, countResult] = await Promise.all([
        pool.query(productQuery, paginatedValues),
        pool.query(countQuery, values),
      ]);

      const products = productResult.rows;
      const total = parseInt(countResult.rows[0].count);

      return res.json({
        status: "success",
        data: {
          products,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        status: "fail",
        message: "Internal server error",
      });
    }
  }

  static async syncCatalogsToCRM(req, res) {
    try {
      const { page = 1, limit = 10, type } = req.query;
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);

      let filters = {};

      if (
        req.user.role_type === "ISV" ||
        req.user.role_type === "SUPPORT_PARTNER"
      ) {
        filters.user_id = req.user.id;
      }

      // Fetch catalogs
      const result = await catalogService.getCatalogs({
        page: pageNum,
        limit: limitNum,
        type,
        filters,
      });

      // 👉 Call service method for syncing
      await catalogService.syncCatalogsToCRM(result.data);

      return res.status(commonConstant.STATUS_CODES.SUCCESS).json({
        status: commonConstant.VARIABLE.SUCCESS,
        message: "Catalogs synced to CRM successfully",
      });
    } catch (error) {
      console.error("Error in syncCatalogsToCRM:", error);
      return res.status(commonConstant.STATUS_CODES.SERVER_ERROR).json({
        status: commonConstant.VARIABLE.FAIL,
        message: commonConstant.MESSAGES.ERROR,
        error: error.message,
      });
    }
  }
}

module.exports = CatalogController;
