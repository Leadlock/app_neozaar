/* eslint-disable no-useless-catch */
// const Product = require('../models/product');
const Bundle = require("../models/bundle");
const pool = require("../config/database"); // Add this import for database connection
const { PAGINATION } = require("../config/common.constant");
const commonConstant = require("../config/common.constant.js");
const SkuGeneratorService = require("../services/common/skuGenerator.service");
const SeoOpenAIService = require("../services/seoService/SeoOpenAIService.service");
const CrmApiService = require("./crmApi/crmApi.service");
// const SeoModel = require('../models/SeoModel/SeoModel');
const { Product, SeoModel } = require("../models/SeoModel/index");
const { Op } = require("sequelize");
const ProductOtherDetails = require("../models/Product/productOtherDetails");
const { refreshNeoCatalog } = require("../ai/db/refreshCatalog");

class CatalogService {
  // Create catalog item (product or bundle)
  static async createCatalog(data, type, extraDataForServiceSolution = {}) {
    try {
      let catalogItem;
      if (type === "product") {
        //sku generation
        const sku_id = await SkuGeneratorService.generateSku();
        data.sku_id = sku_id;
        catalogItem = await Product.create(data);
        await catalogItem.save();
        if (data.action_type === "service" || data.action_type === "solution") {
          extraDataForServiceSolution.product_id = catalogItem.id;
          const result = await ProductOtherDetails.create(
            extraDataForServiceSolution,
          );
          await result.save();
          catalogItem.setDataValue("extraDataForServiceSolution", result);
        }
      } else if (type === "bundle") {
        catalogItem = await Bundle.create(data);
      } else {
        throw new Error('Invalid type. Must be "product" or "bundle"');
      }

      (async () => {
        try {
          const seoService = new SeoOpenAIService();
          const seo = await seoService.generateSEO(data);
          await seoService.saveSEO(catalogItem.id, seo);
          console.log("SEO generated and saved for catalog:", catalogItem.id);
        } catch (err) {
          console.error("Background SEO generation failed:", err);
        }
      })();

      return catalogItem;
    } catch (error) {
      throw error;
    }
  }

  static async generateAndSaveSEOForExitingCatalog(req) {
    try {
      // Fetch catalog items that lack SEO
      const catalogItems = await Product.findAll({
        include: [
          {
            model: SeoModel,
            as: "seo",
            attributes: [],
            required: false, // LEFT JOIN
          },
        ],
        where: {
          "$seo.id$": {
            [Op.is]: null, // SEO does NOT exist
          },
        },
        subQuery: false,
      });
      for (const item of catalogItems) {
        const seoService = new SeoOpenAIService();
        item.description = item.long_description;
        item.page_type = item.action_type;
        item.price = item.starting_price;
        const seo = await seoService.generateSEO(item.toJSON());
        await seoService.saveSEO(item.id, seo);
        console.log("SEO generated and saved for catalog:", item.id);
      }

      return { success: true, message: "SEO generation process completed." };
    } catch (err) {
      console.error("Background SEO generation failed:", err);
    }
  }

  // Update catalog item by ID
  static async updateCatalog(id, data, type, extraDataForServiceSolution = {}) {
    try {
      let catalogItem;
      data.is_approved = false; // Reset approval on update
      data.is_publish = false; // Reset publish on update
      data.is_drapt = true; // Set draft on update
      data.status = "Pending";
      if (type === "product") {
        catalogItem = await Product.findByPk(id);
        if (!catalogItem) {
          throw new Error("Product not found");
        }
        await catalogItem.update(data);
        if (data.action_type === "service" || data.action_type === "solution") {
          extraDataForServiceSolution.product_id = catalogItem.id;
          const result = await ProductOtherDetails.findOne({
            where: { product_id: id },
          });
          if (result) {
            await result.update(extraDataForServiceSolution);
          } else {
            await ProductOtherDetails.create(extraDataForServiceSolution);
          }
          catalogItem.setDataValue("extraDataForServiceSolution", result || extraDataForServiceSolution);
        }
      } else if (type === "bundle") {
        catalogItem = await Bundle.findByPk(id);
        if (!catalogItem) {
          throw new Error("Bundle not found");
        }
        await catalogItem.update(data);
      } else {
        throw new Error('Invalid type. Must be "product" or "bundle"');
      }
      return catalogItem;
    } catch (error) {
      throw error;
    }
  }

  // Get catalog items with pagination & optional filters
  static async getCatalogs({ page = 1, limit = 10, type, filters = {} }) {
    try {
      const offset = (page - 1) * limit;
      let result;

      if (type === "product") {
        const { rows, count } = await Product.findAndCountAll({
          where: filters,
          limit,
          offset,
          order: [["created_at", "DESC"]],
          include: [
            {
              model: SeoModel,
              as: "seo",
              attributes: ["page_url"],
              required: false, // LEFT JOIN (product without SEO still returned)
            },
          ],
        });

        const transformedRows = rows.map((item) => {
          const itemData = item.toJSON();
          return this.transformProductForResponse(itemData);
        });

        result = {
          data: transformedRows,
          pagination: PAGINATION.build({ total: count, page, limit }),
        };
      } else if (type === "bundle") {
        const { rows, count } = await Bundle.findAndCountAll({
          where: filters,
          limit,
          offset,
          order: [["created_at", "DESC"]],
        });

        const transformedRows = await Promise.all(
          rows.map(async (item) => {
            const itemData = item.toJSON();
            return await this.transformBundleForResponse(itemData);
          }),
        );

        result = {
          data: transformedRows,
          pagination: PAGINATION.build({ total: count, page, limit }),
        };
      } else {
        // Get both products and bundles
        const [productsResult, bundlesResult] = await Promise.all([
          Product.findAndCountAll({
            where: filters,
            limit: Math.ceil(limit / 2),
            offset: Math.ceil(offset / 2),
            order: [["created_at", "DESC"]],
            include: [
              {
                model: SeoModel,
                as: "seo",
                attributes: ["page_url"],
                required: false, // LEFT JOIN (product without SEO still returned)
              },
            ],
          }),
          Bundle.findAndCountAll({
            where: filters,
            limit: Math.floor(limit / 2),
            offset: Math.floor(offset / 2),
            order: [["created_at", "DESC"]],
          }),
        ]);

        const transformedProducts = productsResult.rows.map((item) => {
          const itemData = item.toJSON();
          return {
            ...this.transformProductForResponse(itemData),
            type: "product",
          };
        });

        const transformedBundles = await Promise.all(
          bundlesResult.rows.map(async (item) => {
            const itemData = item.toJSON();
            return {
              ...(await this.transformBundleForResponse(itemData)),
              type: "bundle",
            };
          }),
        );

        const allItems = [...transformedProducts, ...transformedBundles].sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at),
        );

        const total = productsResult.count + bundlesResult.count;

        result = {
          data: allItems,
          pagination: PAGINATION.build({ total, page, limit }),
        };
      }

      return result;
    } catch (error) {
      throw error;
    }
  }

  static async deleteCatalog(id, type, currentUser) {
    try {
      let catalogItem;

      if (type === "product") {
        catalogItem = await Product.findOne({ where: { id }, paranoid: false });
        if (!catalogItem) throw new Error("Product not found");
      } else if (type === "bundle") {
        catalogItem = await Bundle.findOne({ where: { id }, paranoid: false });
        if (!catalogItem) throw new Error("Bundle not found");
      } else {
        throw new Error('Invalid type. Must be "product" or "bundle"');
      }
      if (["CLIENT", "ISV_SELLER"].includes(currentUser.role_type)) {
        throw new Error("Not authorized to delete");
      }
      const catalogUserId = parseInt(catalogItem.user_id);
      const currentUserId = parseInt(currentUser.id);

      if (["ISV", "SUPPORT_PARTNER"].includes(currentUser.role_type)) {
        if (catalogUserId !== currentUserId) {
          throw new Error(
            `Not authorized to delete this item. Item belongs to user ${catalogUserId}, current user is ${currentUserId}`,
          );
        }
      }
      await catalogItem.destroy();
      return { success: true, message: `${type} deleted successfully` };
    } catch (error) {
      throw error;
    }
  }

  // Fixed getCatalogById method in CatalogService
  static async getCatalogById(id, type) {
    try {
      let catalogItem;

      if (type === "product") {
        catalogItem = await Product.findByPk(id);
        if (catalogItem) {
          const itemData = catalogItem.toJSON();
          return this.transformProductForResponse(itemData);
        }
      } else if (type === "bundle") {
        catalogItem = await Bundle.findByPk(id);
        if (catalogItem) {
          const itemData = catalogItem.toJSON();
          return await this.transformBundleForResponse(itemData);
        }
      } else {
        throw new Error('Invalid type. Must be "product" or "bundle"');
      }

      return null; // Return null instead of undefined catalogItem
    } catch (error) {
      throw error;
    }
  }

  // getCatalogBySlug
  static async getCatalogBySlug(type, slug) {
    try {
      let catalogItem;

      if (type === "product") {
        // Normalize slug → page_url
        const pageUrl = slug.startsWith("/") ? slug : `/catalog/${slug}`;

        catalogItem = await Product.findOne({
          include: [
            {
              model: SeoModel,
              as: "seo", // ✅ REQUIRED alias
              where: { page_url: pageUrl },
              required: false, // ✅ LEFT JOIN (important)
            },
          ],
        });
        if (!catalogItem) return null;
        const itemData = catalogItem.toJSON();
        return {
          ...this.transformProductForResponse(itemData),
          seo: itemData.seo || null,
        };
      }

      // -----------------------------
      // Bundle logic (unchanged)
      // -----------------------------
      if (type === "bundle") {
        catalogItem = await Bundle.findOne({
          where: { slug },
        });

        if (!catalogItem) return null;

        const itemData = catalogItem.toJSON();
        return this.transformBundleForResponse(itemData);
      }

      throw new Error('Invalid type. Must be "product" or "bundle"');
    } catch (error) {
      throw error;
    }
  }

  // Transform product data for response (convert PostgreSQL arrays to JS arrays)
  static transformProductForResponse(productData) {
    const transformed = { ...productData };

    // Transform array fields
    const arrayFields = [
      "target_audience",
      "target_segment",
      "category_subcategory",
      "cloud_provider_support",
      "sla_documents",
      "regions_supported",
      "screenshots",
      "brochures",
      "customer_case_studies",
      "compliance_certifications",
    ];

    arrayFields.forEach((field) => {
      if (transformed[field]) {
        transformed[field] = Array.isArray(transformed[field])
          ? transformed[field]
          : [transformed[field]];
      } else {
        transformed[field] = [];
      }
    });

    return transformed;
  }

  // Transform bundle data for response (convert PostgreSQL arrays to JS arrays)
  static async transformBundleForResponse(bundleData) {
    const transformed = { ...bundleData };

    // Array fields that should always be arrays in the response
    const arrayFields = [
      "primary_business_outcome",
      "supported_regions",
      "cloud_provider_focus",
      "datasheets",
      "case_studies",
      "select_isv_products", // BIGINT[]
      "select_spectrum_partner_services", // BIGINT[]
      "spectrum_partners", // BIGINT[]
    ];

    arrayFields.forEach((field) => {
      if (transformed[field]) {
        if (!Array.isArray(transformed[field])) {
          // If DB returns comma-separated string or single value, normalize to array
          transformed[field] = String(transformed[field]).includes(",")
            ? String(transformed[field])
                .split(",")
                .map((v) => v.trim())
            : [transformed[field]];
        }
      } else {
        transformed[field] = [];
      }
    });

    // Convert BIGINT string IDs to actual numbers for ALL ID arrays
    const idArrayFields = [
      "select_isv_products",
      "select_spectrum_partner_services",
      "spectrum_partners",
    ];

    idArrayFields.forEach((field) => {
      if (transformed[field] && transformed[field].length > 0) {
        transformed[field] = transformed[field].map((id) => Number(id));
      }
    });

    // Fetch product details for select_isv_products
    if (
      transformed.select_isv_products &&
      transformed.select_isv_products.length > 0
    ) {
      try {
        const productIds = transformed.select_isv_products;
        const placeholders = productIds
          .map((_, index) => `$${index + 1}`)
          .join(",");

        const query = `
        SELECT id, name, product_logo, long_description, short_description, action_type, brand_name, starting_price, pricing_model, category_subcategory, cloud_provider_support, target_audience, is_approved, is_publish, status
        FROM products 
        WHERE id IN (${placeholders})
      `;

        const result = await pool.query(query, productIds);
        transformed.isv_products_details = result.rows;
      } catch (error) {
        console.error("Error fetching product details for bundle:", error);
        transformed.isv_products_details = [];
      }
    } else {
      transformed.isv_products_details = [];
    }

    // Fetch service details for select_spectrum_partner_services
    if (
      transformed.select_spectrum_partner_services &&
      transformed.select_spectrum_partner_services.length > 0
    ) {
      try {
        const serviceIds = transformed.select_spectrum_partner_services;
        const placeholders = serviceIds
          .map((_, index) => `$${index + 1}`)
          .join(",");

        const query = `
        SELECT id, name, product_logo, long_description, short_description, action_type, brand_name, starting_price, pricing_model, category_subcategory, cloud_provider_support, target_audience, is_approved, is_publish, status
        FROM products 
        WHERE id IN (${placeholders})
      `;

        const result = await pool.query(query, serviceIds);
        transformed.services_details = result.rows;
      } catch (error) {
        console.error("Error fetching service details for bundle:", error);
        transformed.services_details = [];
      }
    } else {
      transformed.services_details = [];
    }

    // String fields - fallback to null
    const stringFields = ["product_role_in_bundle", "service_role_in_bundle"];
    stringFields.forEach((field) => {
      if (!transformed[field]) transformed[field] = null;
    });

    return transformed;
  }

  static _buildProductWhereClause(currentUser, filters = {}) {
    const conditions = [];
    const values = [];
    const countValues = [];
    let idx = 1;

    // Exclude soft-deleted records
    conditions.push(`p.deleted_at IS NULL`);

    // 🔐 Restrict non-admin users to their own records (only for product / solution).
    // Exception: an explicit published-only request is public-facing catalog data
    // (e.g. the CRM Catalog page), so any authenticated user may list it.
    const adminRoles = ['SUPER_ADMIN', 'ADMIN', 'ROLE_MANAGER', 'MARKETING'];
    const publishedOnly =
      typeof filters.status === "string" &&
      filters.status.toLowerCase() === "published";
    if (
      !adminRoles.includes(currentUser.role_type) &&
      !publishedOnly &&
      (filters.action_type === "product" || filters.action_type === "solution")
    ) {
      conditions.push(`p.user_id = $${idx}`);
      values.push(currentUser.id);
      countValues.push(currentUser.id);
      idx++;
    }

    // 🔍 Search filter
    if (filters.search) {
      const term = `%${filters.search}%`;
      conditions.push(`
        (
          p.name ILIKE $${idx} OR 
          p.short_description ILIKE $${idx} OR 
          p.long_description ILIKE $${idx} OR
          p.key_features ILIKE $${idx} OR
          p.primary_use_cases ILIKE $${idx} OR
          p.pricing_model ILIKE $${idx} OR
          EXISTS (SELECT 1 FROM unnest(p.target_audience) ta WHERE ta ILIKE $${idx}) OR
          EXISTS (SELECT 1 FROM unnest(p.category) cs WHERE cs ILIKE $${idx}) OR
          EXISTS (SELECT 1 FROM unnest(p.cloud_provider_support) cps WHERE cps ILIKE $${idx}) OR
          EXISTS (SELECT 1 FROM unnest(p.tags) tg WHERE tg ILIKE $${idx})
        )
      `);
      values.push(term);
      countValues.push(term);
      idx++;
    }

    // 👤 Owner filter
    if (filters.user_id) {
      conditions.push(`p.user_id = $${idx}`);
      values.push(filters.user_id);
      countValues.push(filters.user_id);
      idx++;
    }

    // 🔄 Action type
    if (filters.action_type) {
      conditions.push(`p.action_type = $${idx}`);
      values.push(filters.action_type);
      countValues.push(filters.action_type);
      idx++;

      // 🔒 ISV visibility rules
      if (
        currentUser.role_type === "ISV" &&
        ["service"].includes(filters.action_type)
      ) {
        conditions.push(`p.is_approved = true`);
        conditions.push(`p.is_publish = true`);
      }
    }

    // 🎯 Action for (FIXED)
    // if (filters.action_for && typeof filters.action_for === "string") {
    //   const actionFor = filters.action_for.toLowerCase();
    //   if (actionFor === "all") {
    //     //no condition
    //   } else if (
    //     filters.action_for.toLowerCase() === "all" &&
    //     currentUser.role_type === "ISV"
    //   ) {
    //     conditions.push(`p.action_for IN ('ISV', 'both')`);
    //   } else {
    //     conditions.push(`p.action_for = $${idx}`);
    //     values.push(filters.action_for);
    //     countValues.push(filters.action_for);
    //     idx++;
    //   }
    // }

    // 🎯 Action for
    if (filters.action_for && typeof filters.action_for === "string") {
      const actionFor = filters.action_for.trim().toLowerCase();

      if (actionFor === "all") {
        // no condition
      } else if (actionFor === "customer") {
        conditions.push(`p.action_for = $${idx}`);
        values.push("customer");
        countValues.push("customer");
        idx++;
      } else if (actionFor === "isv") {
        conditions.push(`p.action_for = $${idx}`);
        values.push("ISV");
        countValues.push("ISV");
        idx++;
      } else if (actionFor === "both") {
        conditions.push(`p.action_for = $${idx}`);
        values.push("both");
        countValues.push("both");
        idx++;
      }
    }

    // 📌 Status filter
    const statusMap = {
      approved: "p.is_approved = true AND p.is_publish = false",
      rejected:
        "p.is_approved = false AND p.is_drapt = true AND p.status = 'Rejected'",
      published: "p.is_publish = true AND p.is_approved = true",
      unpublished: "(p.is_publish = false OR p.is_publish IS NULL)",
      draft: "(p.is_drapt = true OR p.is_drapt IS NULL)",
      inactive:
        "(p.is_drapt = false AND p.is_publish = false AND p.is_approved = false)",
    };

    if (filters.status && statusMap[filters.status.toLowerCase()]) {
      conditions.push(statusMap[filters.status.toLowerCase()]);
    }

    // 🧩 Brand filter
    if (filters.brand) {
      conditions.push(`p.brand_name ILIKE $${idx}`);
      values.push(`%${filters.brand}%`);
      countValues.push(`%${filters.brand}%`);
      idx++;
    }

    // ⭐ Featured filter
    if (filters.is_feature === true || filters.is_feature === 'true') {
      conditions.push(`p.is_feature = true`);
    }

    // 🧩 Array filters
    const arrayFilters = {
      category: "p.category",
      cloud_provider: "p.cloud_provider_support",
    };

    Object.entries(arrayFilters).forEach(([key, column]) => {
      if (filters[key]) {
        conditions.push(
          `EXISTS (SELECT 1 FROM unnest(${column}) x WHERE x ILIKE $${idx})`,
        );
        const value = `%${filters[key]}%`;
        values.push(value);
        countValues.push(value);
        idx++;
      }
    });

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    return { whereClause, values, countValues };
  }

  static _buildBundleWhereClause(currentUser, filters = {}) {
    const conditions = [];
    const values = [];
    const countValues = [];
    let paramIndex = 1;

    // Role-based access control
    if (currentUser.role_id === 4 || currentUser.role_id === 12) {
      // Admin / Marketing (role_id 12) can see all bundles
    } else if (["ISV", "SUPPORT_PARTNER"].includes(currentUser.role_type)) {
      conditions.push(`b.user_id = $${paramIndex}`);
      values.push(currentUser.id);
      countValues.push(currentUser.id);
      paramIndex++;
    } else {
      throw new Error("Unauthorized access to bundles");
    }

    // 🔍 Partial Search filter - Fixed array searching with proper ILIKE
    // 🔍 Partial Search filter - Fixed array searching with proper ILIKE
    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      conditions.push(`(
    b.name ILIKE $${paramIndex} OR 
    b.short_description ILIKE $${paramIndex} OR 
    b.detailed_description ILIKE $${paramIndex} OR
    b.bundle_type ILIKE $${paramIndex} OR
    b.workload_types ILIKE $${paramIndex} OR
    b.target_customer_segments ILIKE $${paramIndex} OR  -- FIXED (not array)
    EXISTS (SELECT 1 FROM unnest(b.primary_business_outcome) AS pbo(item) WHERE pbo.item ILIKE $${paramIndex}) OR
    EXISTS (SELECT 1 FROM unnest(b.cloud_provider_focus) AS cpf(item) WHERE cpf.item ILIKE $${paramIndex})
  )`);
      values.push(searchTerm);
      countValues.push(searchTerm);
      paramIndex++;
    }

    // Status filter - Fixed to handle NULL values properly
    if (filters.status) {
      switch (filters.status.toLowerCase()) {
        case "approved":
          conditions.push(`b.is_approved = true`);
          break;
        case "rejected":
          conditions.push(`b.is_approved = false`);
          break;
        case "published":
          conditions.push(`b.is_publish = true`);
          break;
        case "unpublished":
          conditions.push(`(b.is_publish = false OR b.is_publish IS NULL)`);
          break;
        case "draft":
          conditions.push(`(b.is_draft = true OR b.is_draft IS NULL)`);
          break;
      }
    }

    // Cloud provider filter - Fixed to handle partial matches
    if (filters.cloud_provider) {
      conditions.push(
        `EXISTS (SELECT 1 FROM unnest(b.cloud_provider_focus) AS cpf(item) WHERE cpf.item ILIKE $${paramIndex})`,
      );
      values.push(`%${filters.cloud_provider}%`);
      countValues.push(`%${filters.cloud_provider}%`);
      paramIndex++;
    }

    // Supported regions filter - Fixed to handle partial matches
    if (filters.supported_regions) {
      conditions.push(
        `EXISTS (SELECT 1 FROM unnest(b.supported_regions) AS sr(item) WHERE sr.item ILIKE $${paramIndex})`,
      );
      values.push(`%${filters.supported_regions}%`);
      countValues.push(`%${filters.supported_regions}%`);
      paramIndex++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    return { whereClause, values, countValues };
  }

  static async getProducts(currentUser, page = 1, limit = 10, filters = {}) {
    try {
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const offset = (pageNum - 1) * limitNum;

      const { whereClause, values, countValues } =
        this._buildProductWhereClause(currentUser, filters);
      let query = "";

      if (currentUser.role_type == "ISV" && filters.action_type == "service") {
        query = `
        SELECT 
          p.*
        FROM products p
        ${whereClause}
        ORDER BY p.created_at DESC
        LIMIT $${values.length + 1} OFFSET $${values.length + 2}
      `;
      } else if (
        currentUser.role_type == "ISV" &&
        filters.action_type == "solution"
      ) {
        query = `
        SELECT 
          p.*,
          u.role_type,
          u.name AS owner_name
        FROM products p
        JOIN users u ON p.user_id = u.id
        ${whereClause}
        ORDER BY p.created_at DESC
        LIMIT $${values.length + 1} OFFSET $${values.length + 2}
      `;
      } else {
        query = `
            SELECT 
              p.*,
              u.role_type,
              u.name AS owner_name
            FROM products p
            LEFT JOIN users u ON p.user_id = u.id
            ${whereClause}
            ORDER BY p.created_at DESC
            LIMIT $${values.length + 1} OFFSET $${values.length + 2}
          `;
      }
      const countQuery = ` SELECT COUNT(*) AS total FROM products p LEFT JOIN users u ON p.user_id = u.id
        ${whereClause}`;

      const queryValues = [...values, limitNum, offset];

      const [result, countResult] = await Promise.all([
        pool.query(query, queryValues),
        pool.query(countQuery, countValues),
      ]);

      const total = parseInt(countResult.rows[0].total, 10);

      console.log("total:", total);
      console.log("rows returned:", result.rows.length);
      console.log("page:", pageNum);
      console.log("limit:", limitNum);
      console.log("filters:", filters);

      console.log("QUERY:", query);
      console.log("QUERY VALUES:", queryValues);

      console.log("COUNT QUERY:", countQuery);
      console.log("COUNT VALUES:", countValues);

      console.log("total:", total);
      console.log("rows returned:", result.rows.length);
      return {
        products: result.rows,
        pagination: commonConstant.PAGINATION.build({
          total,
          page: pageNum,
          limit: limitNum,
        }),
      };
    } catch (error) {
      console.error(" Error in getProducts:", error);
      throw error;
    }
  }

  // CatalogService.js
  static async getIsvUserCreatedProducts(userId, page = 1, limit = 10) {
    try {
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const offset = (pageNum - 1) * limitNum;
      const { rows: products, count: total } = await Product.findAndCountAll({
        where: { user_id: userId },
        order: [["created_at", "DESC"]],
        limit: limitNum,
        offset,
      });
      const totalPages = Math.ceil(total / limitNum);
      const nextPage = pageNum < totalPages ? pageNum + 1 : null;
      const prevPage = pageNum > 1 ? pageNum - 1 : null;

      // Build page array for UI (optional)
      const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

      return {
        products,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          current_page: pageNum,
          next_page: nextPage,
          prev_page: prevPage,
          pages,
        },
      };
    } catch (error) {
      console.error("Error in getIsvUserCreatedProducts:", error);
      throw error;
    }
  }

  // ✅ FIXED: Main getBundles method with better error handling
  static async getBundles(currentUser, page = 1, limit = 10, filters = {}) {
    try {
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const offset = (pageNum - 1) * limitNum;

      // Build WHERE conditions based on user role and filters
      const { whereClause, values, countValues } = this._buildBundleWhereClause(
        currentUser,
        filters,
      );

      const query = `
      SELECT 
        b.*,
        u.role_type,
        u.name AS owner_name
      FROM bundles b
      JOIN users u ON b.user_id = u.id
      ${whereClause}
      ORDER BY b.created_at DESC
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `;

      const countQuery = `
      SELECT COUNT(*) AS total
      FROM bundles b
      JOIN users u ON b.user_id = u.id
      ${whereClause}
    `;

      // Clone values for pagination parameters
      const queryValues = [...values, limitNum, offset];

      const [result, countResult] = await Promise.all([
        pool.query(query, queryValues),
        pool.query(countQuery, countValues),
      ]);

      const total = parseInt(countResult.rows[0].total, 10);

      return {
        bundles: result.rows,
        pagination: commonConstant.PAGINATION.build({
          total,
          page: pageNum,
          limit: limitNum,
        }),
      };
    } catch (error) {
      console.error(" Error in getBundles:", error);
      throw error;
    }
  }
  static async updateProductDraftStatus(productId, isDrapt, status) {
    const product = await Product.findByPk(productId);
    if (!product) {
      throw new Error("Product not found");
    }
    product.is_drapt = isDrapt;
    product.status = status;
    await product.save();
    return product;
  }

  // Update ONLY the tags of a product/service/solution. Intentionally does NOT
  // touch is_publish / is_drapt / is_approved / status, so tagging a published
  // item keeps it published and tagging a draft keeps it a draft.
  static async updateProductTags(productId, tags) {
    const product = await Product.findByPk(productId);
    if (!product) {
      throw new Error("Product not found");
    }
    // Normalise: accept an array, a JSON string, or a comma-separated string.
    let list = tags;
    if (typeof list === "string") {
      const trimmed = list.trim();
      try {
        list = trimmed ? JSON.parse(trimmed) : [];
      } catch (_) {
        list = trimmed ? trimmed.split(",") : [];
      }
    }
    if (!Array.isArray(list)) {
      list = list == null ? [] : [list];
    }
    // Clean up: strings only, trimmed, no empties, de-duplicated.
    const cleaned = [
      ...new Set(
        list
          .map((t) => (t == null ? "" : String(t).trim()))
          .filter((t) => t.length > 0),
      ),
    ];
    product.tags = cleaned;
    await product.save();
    // Keep the Neo catalog search index in sync with the new tags.
    try {
      refreshNeoCatalog(`product ${productId} tags updated`);
    } catch (_) {
      /* non-fatal */
    }
    return product;
  }

  static async publishProduct(productId, publish, userId, status, remark) {
    const product = await Product.findByPk(productId);
    if (!product) {
      throw new Error("Product not found");
    }
    if (product.is_drapt == true && publish == true) {
      product.is_drapt = false;
    }
    product.status = status;
    product.is_publish = publish;
    product.published_by = publish ? userId : null;
    product.remark = remark;
    if (!publish) {
      product.is_feature = false;
    }
    if (status == "Unpublished" && product.remark.trim() == "") {
      throw new Error(
        `Remark is compulsory when Unpublished a product. ${product.remark}`,
      );
    }
    await product.save();
    refreshNeoCatalog(`product ${productId} ${publish ? "published" : "unpublished"}`);
    return product;
  }

  static async approveProduct(productId, approve, userId, status, remark = "") {
    const product = await Product.findByPk(productId);
    if (!product) {
      throw new Error("Product not found");
    }
    if (product.is_drapt && approve) {
      product.is_drapt = false;
    }
    if (approve == false && status == "Rejected") {
      if (!remark || remark.trim() === "") {
        throw new Error("Remark is compulsory when rejecting a product.");
      }
      product.remark = remark;
    }
    product.status = status;
    product.is_approved = approve;
    product.approved_by = approve ? userId : null;

    await product.save();
    refreshNeoCatalog(`product ${productId} ${approve ? "approved" : "unapproved"}`);
    return product;
  }

  static async updateBundleDraftStatus(bundleId, isDrapt) {
    const bundle = await Bundle.findByPk(bundleId);
    if (!bundle) {
      throw new Error("Bundle not found");
    }
    bundle.is_drapt = isDrapt;
    await bundle.save();
    return bundle;
  }
  static async publishBundle(bundleId, publish, userId) {
    const bundle = await Bundle.findByPk(bundleId);
    if (!bundle) {
      throw new Error("Bundle not found");
    }
    if (bundle.is_drapt == true && publish == true) {
      bundle.is_drapt = false;
    }
    bundle.is_publish = publish;
    bundle.published_by = publish ? userId : null;
    await bundle.save();
    return bundle;
  }
  static async approveBundle(bundleId, approve, userId) {
    const bundle = await Bundle.findByPk(bundleId);
    if (!bundle) {
      throw new Error("Bundle not found");
    }
    if (bundle.is_drapt == true && approve == true) {
      bundle.is_drapt = false;
    }
    bundle.is_approved = approve;
    bundle.approved_by = approve ? userId : null;
    await bundle.save();
    return bundle;
  }

  static async syncCatalogsToCRM(catalogs) {
    try {
      for (const item of catalogs) {
        const crmProductData = {
          name: item.name,
          status: 1,
          category: item.category_subcategory || "Neozaar",
          brand: item.brand || "Neozaar",
          price: item.starting_price || 0,
          tax: "IGST",
          client_product_id: item.id,
          weight: "0",
          URL: "https://neozaar.com/service/" + item.id,
          sku: item.sku_id,
          hsn_code: "NEO-" + item.id,
          description: item.long_description,
        };

        try {
          await CrmApiService.createProduct(crmProductData);
          console.log("CRM Sync Success:", item.id);
        } catch (err) {
          console.error("CRM Sync Failed:", item.id, err);
        }
      }
    } catch (error) {
      console.error("Error in catalogService.syncCatalogsToCRM:", error);
      throw error;
    }
  }
}

module.exports = CatalogService;
