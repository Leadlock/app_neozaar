const xlsx = require('xlsx');
const pool = require('../config/database'); // Add this import for database connection
const { PAGINATION } = require('../config/common.constant');
const commonConstant = require('../config/common.constant.js');
const SkuGeneratorService = require('../services/common/skuGenerator.service');

class ProductImportService {
  
  static async importProducts(fileBuffer, userId, action_type, action_for) {
    
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet);

    if (!rows.length) {
      throw new Error('No data found in uploaded file');
    }
    // 2️⃣ Header normalization map (maps Excel headers → DB keys)
    const headerMap = {
      'Product Name': 'product_name',
      'Short Description': 'short_description',
      'Long Description': 'long_description',
      'Key Features': 'key_features',
      'Primary Use Cases': 'primary_use_cases',
      'Industry': 'industry',
      'Target Audience': 'target_audience',
      'Category': 'category',
      'Cloud Provider': 'cloud_provider',
      'Pricing Model': 'pricing_model',
      'Regions Supported': 'regions_supported',
      'CTA Model': 'cta_model',
      'Technical Prerequisites': 'technical_prerequisites',
      'Product Logo URL': 'product_logo_url',
      'Screenshot URLs': 'screenshot_urls',
      'Brochure URL': 'brochure_url',
      'Demo Video URL': 'demo_video_url',
      'Customer Case Study URLs': 'customer_case_study_urls',
      'Terms of Use URL': 'terms_of_use_url',
      'OEM SKU': 'oem_sku',
      'Metering API': 'metering_api',
      'Starting Price': 'starting_price',
    };

    // Normalize headers for all rows
    const normalizedRows = rows.map((row) => {
      const normalized = {};
      for (const key in row) {
        const cleanKey = key.trim();
        const mappedKey = headerMap[cleanKey] || cleanKey.toLowerCase().replace(/\s+/g, '_');
        normalized[mappedKey] = row[key];
      }
      return normalized;
    });
    
    // 4️⃣ Insert data into DB
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      let skuOffset = 0;
      for (const row of normalizedRows) {
        const sku_id = await SkuGeneratorService.generateSku(skuOffset++);
        console.log(`Generated SKU ID: ${sku_id} for product: ${row.product_name}`);

        const {
          product_name,
          short_description,
          long_description,
          key_features,
          primary_use_cases,
          industry,
          target_audience,
          category,
          cloud_provider,
          pricing_model,
          regions_supported,
          cta_model,
          technical_prerequisites,
          product_logo_url,
          screenshot_urls,
          brochure_url,
          demo_video_url = null,
          customer_case_study_urls = null,
          terms_of_use_url,
          metering_api = null,
          oem_sku = null,
          starting_price = 0,
        } = row;
        await client.query(
          `
          INSERT INTO products (
            user_id, name, short_description, long_description,
            key_features, primary_use_cases, target_audience,
            category_subcategory, cloud_provider_support, regions_supported,
            cta_model, technical_prerequisites,
            pricing_model, sku_id, api_metering_endpoint, product_logo,
            screenshots, brochures, demo_video_link,
            customer_case_studies, terms_of_use_url,
            status, remark, is_import, industry, is_drapt, is_publish, is_approved, oem_sku, action_type, action_for, starting_price, solution_differentiator, risks_addressed
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            $8, $9, $10, $11, $12, $13,
            $14, $15, $16, $17, $18, $19,
            $20, $21, 'pending', NULL, TRUE, $22, true, false, false, $23, $24, $25, $26, NULL, NULL
          )
          `,
          [
            userId,
            product_name,
            short_description,
            long_description,
            this.parseArray(key_features),
            this.parseString(primary_use_cases),
            this.parseArray(target_audience),
            this.parseArray(category),
            this.parseArray(cloud_provider),
            this.parseArray(regions_supported),
            this.parseArray(cta_model),
            technical_prerequisites,
            pricing_model,
            sku_id,
            metering_api,
            product_logo_url,
            this.parseArray(screenshot_urls),
            this.parseArray(brochure_url),
            demo_video_url,
            this.parseArray(customer_case_study_urls),
            terms_of_use_url,
            this.parseArray(industry),
            oem_sku,
            action_type,
            action_for,
            starting_price,
          ]
        );
      }

      await client.query('COMMIT');
      console.log(`✅ Imported ${normalizedRows.length} products successfully.`);
      return { success: true, total: normalizedRows.length };
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('❌ Error during import:', err);
      throw err;
    } finally {
      client.release();
    }
  }


  static parseArray(value) {
    if (!value) return '{}';
    if (Array.isArray(value)) return `{${value.map((v) => v.trim()).join(',')}}`;

    const arr = String(value)
      .split(/[,;\n]+/)
      .map((v) => v.trim())
      .filter((v) => v.length > 0);

    return `{${arr.join(',')}}`; // ✅ PostgreSQL array format
  }


  static parseString(value) {
    return value ? String(value).trim() : null;
  }


}


module.exports = ProductImportService;
