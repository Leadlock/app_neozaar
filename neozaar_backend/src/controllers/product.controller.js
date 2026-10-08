const pool = require("../config/database");
const uploadToSFTP = require("../utils/azureStorage"); // Your SFTP utility function
const { refreshNeoCatalog } = require("../ai/db/refreshCatalog");

// Get all products (Admin only)
const getAllProducts = async (req, res) => {
  try {
    const { q = "", published, type } = req.query;
    const onlyPublished = published === "true" || published === "1";

    const params = [`%${q}%`];
    let typeClause = "";
    if (type) {
      params.push(type);
      typeClause = `AND action_type = $${params.length}`;
    }

    const result = await pool.query(
      `
      SELECT
        id,
        name,
        product_logo
      FROM products
      WHERE LOWER(name)
      LIKE LOWER($1)
      ${typeClause}
      ${onlyPublished ? "AND is_publish = true AND is_approved = true" : ""}
      ORDER BY created_at DESC
      `,
      params,
    );

    res.json({
      status: "success",
      data: result.rows,
    });
  } catch (error) {
    console.error("Error in getAllProducts:", error);

    res.status(500).json({
      status: "fail",
      message: "Internal server error",
    });
  }
};
/**
 * Create a new product
 * Access: Admin and ISV only
 */
const createProduct = async (req, res) => {
  // Check role permissions
  if (!["SUPER_ADMIN", "ISV"].includes(req.user.role_type)) {
    return res.status(403).json({
      status: "fail",
      message: "Only Super Admin and ISV can create products",
      code: 403,
    });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const {
      user_id,
      product_ids,
      action_id,
      action_type,
      name,
      short_description = "",
      long_description = "",
      starting_price,
      license_type,
      demo_available = false,
      demo_person_email = null,
      launch_url = null,
      brand = null,
      category = null,
      has_private_offer = false,
      taxonomy_data,
      is_feature = false,
      target_audience,
      category_subcategory,
    } = req.body;
    const is_feature_bool = is_feature === true || is_feature === "true";
    // Handle product logo upload to Azure Blob via SFTP
    // The Angular dashboard sends the logo under the "product_logo" field.
    // We keep "image_url" and single-file uploads for backward compatibility.
    let image_url = null;
    const logoFile =
      req.files?.product_logo?.[0] ||
      req.files?.image_url?.[0] ||
      (!req.files ? req.file : null);
    if (logoFile) {
      try {
        image_url = await uploadToSFTP(logoFile);
      } catch (uploadError) {
        console.error("Error uploading image to Azure via SFTP:", uploadError);
        await client.query("ROLLBACK");
        return res.status(500).json({
          status: "fail",
          message: "Failed to upload image to Azure storage",
          error: uploadError.message,
        });
      }
    }

    // Handle sales collateral file upload to Azure Blob via SFTP
    let sales_enable_collateral = null;
    //  console.log('Sales collateral:', req.files?.sales_collateral);

    if (req.files && req.files.sales_collateral) {
      try {
        sales_enable_collateral = await uploadToSFTP(
          req.files?.sales_collateral?.[0],
        );
        console.log("Uploaded sales collateral URL:", sales_enable_collateral);
      } catch (uploadError) {
        console.error(
          "Error uploading sales collateral to Azure via SFTP:",
          uploadError,
        );
        await client.query("ROLLBACK");
        return res.status(500).json({
          status: "fail",
          message: "Failed to upload sales collateral to Azure storage",
          error: uploadError.message,
        });
      }
    }

    // SECURITY FIX: ISV users can ONLY create products for themselves
    // Don't allow user_id to be overridden by ISV users
    let actualUserId;
    if (req.user.role_type === "ISV") {
      actualUserId = req.user.id; // Force ISV to use their own ID

      // Log security violation if ISV tried to specify a different user_id
      if (user_id && user_id !== req.user.id) {
        const { logSecurityEvent } = require("../middlewares/productSecurity");
        logSecurityEvent("UNAUTHORIZED_USER_ID_ATTEMPT", req.user.id, {
          attemptedUserId: user_id,
          actualUserId: req.user.id,
        });
      }
    } else {
      // Admin can create products for any user
      actualUserId = user_id || req.user.id; // Default to admin's ID if not specified
    }

    // Basic validation
    if (
      !actualUserId ||
      !action_id ||
      !action_type ||
      !name ||
      !starting_price ||
      !license_type
    ) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        status: "fail",
        message: "Missing required fields",
      });
    }

    // Validate product_ids only for bundle type
    if (action_type === "bundle" && !product_ids) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        status: "fail",
        message: "product_ids are required for bundle type",
      });
    }

    // For product type, product_ids should not be provided
    if (action_type === "product" && product_ids) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        status: "fail",
        message: "product_ids should not be provided for product type",
      });
    }

    // ADDITIONAL SECURITY: For bundle products, ensure ISV can only bundle their own products
    if (
      action_type === "bundle" &&
      product_ids &&
      req.user.role_type === "ISV"
    ) {
      const {
        validateProductOwnership,
      } = require("../middlewares/productSecurity");

      let productIdsArray;
      try {
        productIdsArray =
          typeof product_ids === "string"
            ? JSON.parse(product_ids)
            : product_ids;
      } catch (err) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          status: "fail",
          message: "Invalid product_ids format",
        });
      }

      const isOwner = await validateProductOwnership(
        productIdsArray,
        req.user.id,
        client,
      );
      if (!isOwner) {
        await client.query("ROLLBACK");
        return res.status(403).json({
          status: "fail",
          message: "ISV can only bundle their own products",
          code: 403,
        });
      }
    }
    const normalizeAudience = (input) => {
      if (Array.isArray(input)) return input;

      if (typeof input === "string") {
        try {
          const parsed = JSON.parse(input);
          return Array.isArray(parsed) ? parsed : [input];
        } catch {
          return [input];
        }
      }

      return [];
    };
    const formattedAudience = normalizeAudience(target_audience);

    const normalizeCategory = (input) => {
      if (Array.isArray(input)) return input;

      if (typeof input === "string") {
        try {
          const parsed = JSON.parse(input);
          return Array.isArray(parsed) ? parsed : [input];
        } catch {
          return [input];
        }
      }

      return [];
    };
    const formattedCategory = normalizeCategory(category_subcategory);

    const productResult = await client.query(
      `INSERT INTO products (
                  user_id, product_ids, action_id, action_type, name, short_description, long_description, 
                  starting_price, license_type, demo_available, demo_person_email, 
                  launch_url, image_url, product_logo, brand, category, has_private_offer, sales_enable_collateral, is_drapt, is_publish, is_approved,is_feature,target_audience,category_subcategory
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
              RETURNING *`,
      [
        actualUserId,
        action_type === "bundle" ? product_ids : null,
        action_id,
        action_type,
        name,
        short_description,
        long_description,
        starting_price,
        license_type,
        demo_available,
        demo_person_email,
        launch_url,
        image_url, // Contains Azure Blob URL from SFTP upload
        image_url, // product_logo: same uploaded URL, kept in sync with image_url
        brand,
        category,
        has_private_offer,
        sales_enable_collateral, // Contains Azure Blob URL for sales collateral
        1,
        0,
        0,
        is_feature_bool,
        formattedAudience,
        formattedCategory,
      ],
    );

    const product = productResult.rows[0];

    // Handle taxonomy data if provided
    if (taxonomy_data) {
      let parsedTaxonomy;
      try {
        parsedTaxonomy =
          typeof taxonomy_data === "string"
            ? JSON.parse(taxonomy_data)
            : taxonomy_data;
      } catch (err) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          status: "fail",
          message: "Invalid JSON format for taxonomy_data",
        });
      }

      await client.query(
        "INSERT INTO taxonomy_products (product_id, value) VALUES ($1, $2)",
        [product.id, parsedTaxonomy],
      );
    }

    await client.query("COMMIT");

    res.status(201).json({
      status: "success",
      message: "Product created successfully",
      data: product,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error in createProduct:", error);
    res.status(500).json({
      status: "fail",
      message: "Internal server error",
      error: error.message,
    });
  } finally {
    client.release();
  }
};

/**
 * Update a product
 * Access: Admin and ISV only (ISV can only update their own products)
 */
const updateProduct = async (req, res) => {
  if (!["SUPER_ADMIN", "ISV"].includes(req.user.role_type)) {
    return res.status(403).json({
      status: "fail",
      message: "Only Admin and ISV can update products",
      code: 403,
    });
  }

  const client = await pool.connect();
  const { taxonomy_data, ...updateData } = req.body;

  try {
    await client.query("BEGIN");
    const { id } = req.params;

    const {
      name,
      short_description,
      starting_price,
      license_type,
      demo_available,
      demo_person_email,
      launch_url,
      brand,
      category,
      has_private_offer,
      is_feature,
    } = updateData;
    const isFeatureBool =
      is_feature == null ? null : String(is_feature) === "true";

    // Check if product exists and get current data
    const productCheck = await client.query(
      "SELECT * FROM products WHERE id = $1",
      [id],
    );
    if (productCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        status: "fail",
        message: "Product not found",
      });
    }

    const product = productCheck.rows[0];

    // Security check: ISV can only update their own products
    if (req.user.role_type === "ISV" && product.user_id !== req.user.id) {
      await client.query("ROLLBACK");
      return res.status(403).json({
        status: "fail",
        message: "You can only update your own products",
        code: 403,
      });
    }

    // Handle product logo upload to Azure Blob via SFTP
    // The Angular dashboard sends the logo under the "product_logo" field.
    // Keep "image_url" and single-file uploads for backward compatibility.
    let image_url = product.image_url; // Keep existing image URL by default
    const logoFile =
      req.files?.product_logo?.[0] ||
      req.files?.image_url?.[0] ||
      (!req.files ? req.file : null);
    if (logoFile) {
      try {
        image_url = await uploadToSFTP(logoFile);
        console.log("Product logo updated successfully to:", image_url);
      } catch (uploadError) {
        console.error("Error uploading image to Azure via SFTP:", uploadError);
        await client.query("ROLLBACK");
        return res.status(500).json({
          status: "fail",
          message: "Failed to upload image to Azure storage",
          error: uploadError.message,
        });
      }
    }

    // Handle sales collateral file upload to Azure Blob via SFTP
    let sales_enable_collateral = product.sales_enable_collateral; // Keep existing URL by default
    if (req.files && req.files.sales_collateral) {
      try {
        sales_enable_collateral = await uploadToSFTP(
          req.files?.sales_collateral?.[0],
        );
        //  console.log('Sales collateral updated successfully to:', sales_enable_collateral);
      } catch (uploadError) {
        console.error(
          "Error uploading sales collateral to Azure via SFTP:",
          uploadError,
        );
        await client.query("ROLLBACK");
        return res.status(500).json({
          status: "fail",
          message: "Failed to upload sales collateral to Azure storage",
          error: uploadError.message,
        });
      }
    }

    const productResult = await client.query(
      `UPDATE products SET 
                name = COALESCE($1, name), 
                short_description = COALESCE($2, short_description), 
                starting_price = COALESCE($3, starting_price), 
                license_type = COALESCE($4, license_type),
                demo_available = COALESCE($5, demo_available), 
                demo_person_email = COALESCE($6, demo_person_email), 
                launch_url = COALESCE($7, launch_url),
                image_url = COALESCE($8, image_url), 
                product_logo = COALESCE($9, product_logo),
                brand = COALESCE($10, brand), 
                category = COALESCE($11, category),
                has_private_offer = COALESCE($12, has_private_offer),
                sales_enable_collateral = COALESCE($13, sales_enable_collateral),
                is_feature = COALESCE($14, is_feature)
            WHERE id = $15 RETURNING *`,
      [
        name,
        short_description,
        starting_price,
        license_type,
        demo_available,
        demo_person_email,
        launch_url,
        image_url, // Contains Azure Blob URL from SFTP upload or existing URL
        image_url, // product_logo: kept in sync with image_url
        brand,
        category,
        has_private_offer,
        sales_enable_collateral, // Contains Azure Blob URL for sales collateral or existing URL
        isFeatureBool,
        id,
      ],
    );

    // Handle taxonomy data if provided
    if (taxonomy_data) {
      let parsedTaxonomy;
      try {
        parsedTaxonomy =
          typeof taxonomy_data === "string"
            ? JSON.parse(taxonomy_data)
            : taxonomy_data;
      } catch (err) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          status: "fail",
          message: "Invalid JSON format for taxonomy_data",
        });
      }

      const taxonomyCheck = await client.query(
        "SELECT * FROM taxonomy_products WHERE product_id = $1",
        [id],
      );

      if (taxonomyCheck.rows.length > 0) {
        await client.query(
          "UPDATE taxonomy_products SET value = $1 WHERE product_id = $2",
          [parsedTaxonomy, id],
        );
      } else {
        await client.query(
          "INSERT INTO taxonomy_products (product_id, value) VALUES ($1, $2)",
          [id, parsedTaxonomy],
        );
      }
    }

    // Get the updated product data for bundle products
    const updatedProduct = await client.query(
      `SELECT * FROM products WHERE id = $1`,
      [id],
    );
    const productData = updatedProduct.rows[0];

    let bundleProducts = [];

    // Fetch bundle products if this is a bundle
    if (productData.action_type === "bundle" && productData.product_ids) {
      let ids = [];

      // Parse product_ids properly
      if (Array.isArray(productData.product_ids)) {
        ids = productData.product_ids
          .map((id) => parseInt(id))
          .filter((id) => !isNaN(id));
      } else if (typeof productData.product_ids === "string") {
        try {
          // Try JSON parse first
          ids = JSON.parse(productData.product_ids);
          if (!Array.isArray(ids)) {
            ids = [];
          }
        } catch (err) {
          // If JSON parse fails, try PostgreSQL array format
          const cleanStr = productData.product_ids.replace(/^\{|\}$/g, "");
          if (cleanStr) {
            ids = cleanStr
              .split(",")
              .map((id) => parseInt(id.trim()))
              .filter((id) => !isNaN(id));
          }
        }
      }

      // Fetch bundle products if we have valid IDs
      if (ids.length > 0) {
        const placeholders = ids.map((_, i) => `$${i + 1}`).join(", ");
        const result = await client.query(
          `SELECT id, name, category, image_url FROM products WHERE id IN (${placeholders})`,
          ids,
        );

        bundleProducts = result.rows;
      }
    }

    await client.query("COMMIT");

    res.status(200).json({
      status: "success",
      message: "Product updated successfully",
      data: {
        ...productResult.rows[0],
        bundle_products: bundleProducts,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error in updateProduct:", error);
    res.status(500).json({
      status: "fail",
      message: "Internal server error",
      error: error.message,
    });
  } finally {
    client.release();
  }
};

/**
 * Get paginated list of products with optional type, search, and category filters
 * Access: Admin gets all products, ISV gets only their own products
 */
const getProducts = async (req, res) => {
  // Check role permissions
  if (!["SUPER_ADMIN", "ISV", "CLIENT"].includes(req.user.role_type)) {
    return res.status(403).json({
      status: "fail",
      message: "Access denied. Only Admin and ISV can view products dashboard",
      code: 403,
    });
  }

  try {
    const { type, search, category, page = 1, limit = 10 } = req.query;
    const parsedLimit = parseInt(limit);
    const parsedPage = parseInt(page);
    const offset = (parsedPage - 1) * parsedLimit;

    let query = "SELECT * FROM products";
    const queryParams = [];
    let paramCount = 1;
    const conditions = [];

    // Add user filter for ISV users
    if (req.user.role_type === "ISV") {
      conditions.push(`user_id = $${paramCount}`);
      queryParams.push(req.user.id);
      paramCount++;
    }

    // Add type filter
    if (type) {
      const normalizedType = type.endsWith('s') ? type.slice(0, -1) : type;
      conditions.push(`action_type = $${paramCount}`);
      queryParams.push(normalizedType);
      paramCount++;
    }

    // Add category filter
    if (category) {
      conditions.push(`category && ARRAY[$${paramCount}]`);
      queryParams.push(category);
      paramCount++;
    }

    // Add search filter (search in name, brand, and description)
    if (search) {
      const keywords = search.trim().split(/\s+/);
      const searchConditions = [];

      for (const word of keywords) {
        const pattern = `%${word}%`;

        searchConditions.push(
          `(name ILIKE $${paramCount} OR brand ILIKE $${paramCount + 1} OR description ILIKE $${paramCount + 2})`,
        );
        queryParams.push(pattern, pattern, pattern);
        paramCount += 3;
      }

      if (searchConditions.length > 0) {
        conditions.push(`(${searchConditions.join(" OR ")})`);
      }
    }

    // Add WHERE clause if we have conditions
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    queryParams.push(parsedLimit, offset);

    const result = await pool.query(query, queryParams);

    // Count query with same filters
    let countQuery = "SELECT COUNT(*) FROM products";
    const countParams = [];
    let countParamCount = 1;
    const countConditions = [];

    // Add user filter for ISV users
    if (req.user.role_type === "ISV") {
      countConditions.push(`user_id = $${countParamCount}`);
      countParams.push(req.user.id);
      countParamCount++;
    }

    // Add type filter
    if (type) {
      const normalizedType = type.endsWith('s') ? type.slice(0, -1) : type;
      countConditions.push(`action_type = $${countParamCount}`);
      countParams.push(normalizedType);
      countParamCount++;
    }

    // Add category filter
    if (category) {
      countConditions.push(`category && ARRAY[$${countParamCount}]`);
      countParams.push(category);
      countParamCount++;
    }

    // Add search filter for count query
    if (search) {
      const keywords = search.trim().split(/\s+/);
      const searchConditions = [];

      for (const word of keywords) {
        const pattern = `%${word}%`;

        searchConditions.push(
          `(name ILIKE $${countParamCount} OR brand ILIKE $${countParamCount + 1} OR description ILIKE $${countParamCount + 2})`,
        );
        countParams.push(pattern, pattern, pattern);
        countParamCount += 3;
      }

      if (searchConditions.length > 0) {
        countConditions.push(`(${searchConditions.join(" OR ")})`);
      }
    }

    // Add WHERE clause if we have conditions
    if (countConditions.length > 0) {
      countQuery += ` WHERE ${countConditions.join(" AND ")}`;
    }

    const countResult = await pool.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalCount / parsedLimit);

    res.json({
      status: "success",
      data: {
        products: result.rows,
        pagination: Array.from({ length: totalPages }, (_, i) => i + 1),
        current_page: parsedPage,
        total_pages: totalPages,
        total_items: totalCount,
      },
    });
  } catch (error) {
    console.error("Error in getProducts:", error);
    res.status(500).json({ status: "fail", message: "Internal server error" });
  }
};

/**
 * Get a product by ID with taxonomy data
 * Access: Admin can get any product, ISV can only get their own products
 */
const getProductById = async (req, res) => {
  // this code will give only admin and isv access to get product by id
  // if (!['ADMIN', 'ISV'].includes(req.user.role_type)) {
  //     return res.status(403).json({
  //         status: 'fail',
  //         message: 'Access denied. Only Admin and ISV can view product details',
  //         code: 403
  //     });
  // }

  try {
    const { id } = req.params;

    let query = `
            SELECT p.*, t.value AS taxonomy
            FROM products p
            LEFT JOIN taxonomy_products t ON p.id = t.product_id
            WHERE p.id = $1
        `;
    const queryParams = [id];

    if (req.user.role_type === "ISV") {
      query += ` AND p.user_id = $2`;
      queryParams.push(req.user.id);
    }

    const result = await pool.query(query, queryParams);

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: "fail",
        message: "Product not found or access denied",
      });
    }

    const productData = result.rows[0];
    let bundleProducts = [];

    // Bundle Logic Starts Here
    if (productData.action_type === "bundle" && productData.product_ids) {
      let ids = [];

      if (Array.isArray(productData.product_ids)) {
        ids = productData.product_ids
          .map((id) => parseInt(id))
          .filter((id) => !isNaN(id));
      } else if (typeof productData.product_ids === "string") {
        try {
          ids = JSON.parse(productData.product_ids);
          if (!Array.isArray(ids)) ids = [];
        } catch (err) {
          const cleanStr = productData.product_ids.replace(/^\{|\}$/g, "");
          if (cleanStr) {
            ids = cleanStr
              .split(",")
              .map((id) => parseInt(id.trim()))
              .filter((id) => !isNaN(id));
          }
        }
      }

      if (ids.length > 0) {
        const placeholders = ids.map((_, i) => `$${i + 1}`).join(", ");
        const result = await pool.query(
          `SELECT id, name, category, image_url FROM products WHERE id IN (${placeholders})`,
          ids,
        );
        bundleProducts = result.rows;
      }
    }

    res.json({
      status: "success",
      data: {
        ...productData,
        bundleProducts: bundleProducts.length > 0 ? bundleProducts : undefined,
      },
    });
  } catch (error) {
    console.error("Error in getProductById:", error);
    res.status(500).json({ status: "fail", message: "Internal server error" });
  }
};

/**
 * Get marketplace products (public access)
 * Access: All authenticated users can view marketplace
 * Only shows products that are both published and approved
 */
const getMarketplaceProducts = async (req, res) => {
  const { search, category, type } = req.query;

  try {
    let baseQuery = `
            SELECT 
                p.id,
                p.user_id,
                p.name AS title,
                p.action_type,
                p.description,
                p.image_url,
                p.product_logo,
                cd.brand_logo AS vendor_logo,
                p.category,
                p.starting_price,
                p.has_private_offer
            FROM products p
            LEFT JOIN company_detail cd
                ON cd.action_id = p.user_id AND cd.action_type = 'ISV'
            WHERE p.is_publish = true AND p.is_approved = true
        `;
    const values = [];
    let index = 1;

    // Filter: type
    if (type) {
      baseQuery += ` AND p.action_type = $${index}`;
      values.push(type);
      index++;
    }

    // Filter: category
    if (category) {
      baseQuery += ` AND p.category ILIKE $${index}`;
      values.push(category);
      index++;
    }

    // Search prioritization: name → brand → description
    if (search) {
      const keywords = search.trim().split(/\s+/);
      const titleConditions = [];
      const brandConditions = [];
      const descConditions = [];

      for (const word of keywords) {
        const pattern = `%${word}%`;

        titleConditions.push(`p.name ILIKE $${index}`);
        values.push(pattern);
        index++;

        brandConditions.push(`p.brand ILIKE $${index}`);
        values.push(pattern);
        index++;

        descConditions.push(`p.description ILIKE $${index}`);
        values.push(pattern);
        index++;
      }

      baseQuery += `
                AND (
                    (${titleConditions.join(" OR ")})
                    OR (${brandConditions.join(" OR ")})
                    OR (${descConditions.join(" OR ")})
                )
            `;
    }

    const result = await pool.query(baseQuery, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: "fail",
        message: "No products found for the given filters",
      });
    }

    return res.status(200).json({
      status: "success",
      data: result.rows,
    });
  } catch (error) {
    console.error("Error in getMarketplaceProducts:", error.message);
    return res.status(500).json({
      status: "fail",
      message: "Internal server error",
    });
  }
};

/**
 * Update product status (approval/publish)
 * Access: Admin can update both approval and is_publish
 *         ISV can only update is_publish if product is already approved
 */
const updateProductStatus = async (req, res) => {
  const { id } = req.params;
  const { is_publish, approval } = req.body;
  const role = req.user.role_type;
  const userId = req.user.id;

  // Check role permissions
  if (!["SUPER_ADMIN", "ISV"].includes(role)) {
    return res.status(403).json({
      status: "fail",
      message: "Only ISV or Admin can update publish/approval",
      code: 403,
    });
  }

  try {
    let productQuery = "SELECT * FROM products WHERE id = $1";
    const productParams = [id];

    // ISV can only update their own products
    if (role === "ISV") {
      productQuery += " AND user_id = $2";
      productParams.push(req.user.id);
    }

    const productRes = await pool.query(productQuery, productParams);
    const product = productRes.rows[0];

    if (!product) {
      return res.status(404).json({
        status: "fail",
        message: "Product not found or access denied",
        code: 404,
      });
    }

    const updates = [];
    const values = [];
    let index = 1;

    // Admin can update both
    if (role === "SUPER_ADMIN") {
      if (typeof approval === "boolean") {
        updates.push(`is_approved = $${index++}`);
        values.push(approval);
        updates.push(`approved_by = $${index++}`);
        values.push(userId);
      }
      if (typeof is_publish === "boolean") {
        updates.push(`is_publish = $${index++}`);
        values.push(is_publish);
        updates.push(`published_by = $${index++}`);
        values.push(userId);
        if (!is_publish) {
          updates.push(`is_feature = $${index++}`);
          values.push(false);
        }
      }
    }

    // ISV can only update is_publish, and only if already approved
    else if (role === "ISV") {
      if (typeof approval === "boolean") {
        return res.status(403).json({
          status: "fail",
          message: "ISV cannot approve products",
          code: 403,
        });
      }
      if (typeof is_publish === "boolean") {
        if (!product.approval) {
          return res.status(400).json({
            status: "fail",
            message: "Product must be approved by admin before publishing",
            code: 400,
          });
        }
        updates.push(`is_publish = $${index++}`);
        values.push(is_publish);
        updates.push(`published_by = $${index++}`);
        values.push(userId);
        if (!is_publish) {
          updates.push(`is_feature = $${index++}`);
          values.push(false);
        }
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({
        status: "fail",
        message: "No valid fields to update",
        code: 400,
      });
    }

    values.push(id);

    const result = await pool.query(
      `UPDATE products SET ${updates.join(", ")} WHERE id = $${index} RETURNING *`,
      values,
    );

    // Keep Neo's in-memory catalog in sync with publish/approval changes.
    refreshNeoCatalog(`product ${id} status updated`);

    res.json({
      status: "success",
      message: "Product status updated successfully",
      data: result.rows[0],
      code: 200,
    });
  } catch (err) {
    console.error("Error updating status:", err);
    res.status(500).json({
      status: "fail",
      message: "Internal server error",
      code: 500,
    });
  }
};

/**
 * Update product private offer status
 * Access: Admin + their owner can update private offer status
 */
const updatePrivateOffer = async (req, res) => {
  const { id } = req.params;
  const { has_private_offer } = req.body;

  if (typeof has_private_offer !== "boolean") {
    return res.status(400).json({
      status: "fail",
      message: "has_private_offer must be a boolean value",
      code: 400,
    });
  }

  try {
    const productRes = await pool.query(
      "SELECT * FROM products WHERE id = $1",
      [id],
    );
    const product = productRes.rows[0];

    if (!product) {
      return res.status(404).json({
        status: "fail",
        message: "Product not found",
        code: 404,
      });
    }

    const isAdmin = req.user.role_id === 4;
    const isOwner = req.user.id === product.user_id;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        status: "fail",
        message: "Only Admin or product owner can update private offer status",
        code: 403,
      });
    }

    const result = await pool.query(
      "UPDATE products SET has_private_offer = $1 WHERE id = $2 RETURNING *",
      [has_private_offer, id],
    );

    return res.status(200).json({
      status: "success",
      message: "Private offer status updated successfully",
      data: result.rows[0],
      code: 200,
    });
  } catch (err) {
    console.error("Error updating private offer:", err);
    return res.status(500).json({
      status: "fail",
      message: "Internal server error",
      code: 500,
    });
  }
};

/**
 * Update product general status
 * Access: Only Admin can update general status
 */
const updateGeneralStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  // Only Admin can update general status
  if (req.user.role_id !== 4 ) {
    return res.status(403).json({
      status: "fail",
      message: "Only Admin can update general status",
      code: 403,
    });
  }

  try {
    const productRes = await pool.query(
      "SELECT * FROM products WHERE id = $1",
      [id],
    );
    const product = productRes.rows[0];

    if (!product) {
      return res.status(404).json({
        status: "fail",
        message: "Product not found",
        code: 404,
      });
    }

    if (typeof status !== "boolean") {
      return res.status(400).json({
        status: "fail",
        message: "status must be a boolean value",
        code: 400,
      });
    }

    const result = await pool.query(
      "UPDATE products SET status = $1 WHERE id = $2 RETURNING *",
      [status, id],
    );

    res.json({
      status: "success",
      message: "General status updated successfully",
      data: result.rows[0],
      code: 200,
    });
  } catch (err) {
    console.error("Error updating general status:", err);
    res.status(500).json({
      status: "fail",
      message: "Internal server error",
      code: 500,
    });
  }
};

module.exports = {
  createProduct,
  updateProduct,
  getProducts,
  getProductById,
  getMarketplaceProducts,
  updateProductStatus,
  updatePrivateOffer,
  updateGeneralStatus,
  getAllProducts,
};
