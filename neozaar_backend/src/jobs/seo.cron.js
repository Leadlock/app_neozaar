const cron = require('node-cron');
const ProductModel = require('../models/product');
const { Op, Sequelize } = require('sequelize');
const pool = require("../config/database");
const SeoOpenAIService = require("../services/seoService/SeoOpenAIService.service");

const seoService = new SeoOpenAIService();

// ⏰ Runs every 1 hour
cron.schedule('* * * * *', async () => {
  console.log('🚀 SEO Cron Started');

  try {
    const products = await ProductModel.findAll({
      where: {
        is_publish: true,
        is_approved: true,
        is_drapt: false,
        id: {
          [Op.notIn]: Sequelize.literal(`(
            SELECT page_id FROM seo_pages
          )`)
        }
      },
      limit: 100
    });

    console.log(`📦 New products for SEO: ${products.length}`);

    for (const product of products) {
      try {
        const seoData = await seoService.generateSEO({
          name: product.name,
          description: product.short_description,
          page_type: 'product',
          category: product.category,
          subcategory: product.subcategory,
          brand_name: product.brand_name,
          price: product.starting_price
        });

        await seoService.saveSEO(product.id, seoData);

      } catch (err) {
        console.error(`❌ Error product ${product.id}`, err.message);
      }
    }

    console.log('✅ SEO Cron Completed');

  } catch (err) {
    console.error('❌ Cron Failed:', err);
  }
});
