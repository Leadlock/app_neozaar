const cron = require('node-cron');
const Brand = require('../models/brand');
const SeoModel = require('../models/SeoModel');
const SeoOpenAIService = require("../services/seoService/SeoOpenAIService.service");
const { Sequelize } = require('sequelize');

const seoService = new SeoOpenAIService();

cron.schedule('* * * * *', async () => {
  console.log('🚀 Brand SEO Cron Started');

  try {
    const brands = await Brand.findAll({
      where: {
        status: true,
        [Sequelize.Op.and]: Sequelize.literal(`
          NOT EXISTS (
            SELECT 1 FROM seo_pages sp
            WHERE sp.page_id = "brand"."id"
            AND sp.page_type = 'brand'
          )
        `)
      },
      limit: 50
    });

    console.log(`📦 New brands: ${brands.length}`);

    for (const brand of brands) {
      try {
        const seoData = await seoService.generateBrandSEO(brand);

        await seoService.saveSEO(brand.id, seoData);

      } catch (err) {
        console.error(`❌ Brand SEO error ${brand.id}`, err.message);
      }
    }

    console.log('✅ Brand SEO Cron Completed');

  } catch (err) {
    console.error('❌ Brand Cron Failed:', err);
  }
});
