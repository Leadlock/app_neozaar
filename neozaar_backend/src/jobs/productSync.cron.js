const cron = require('node-cron');
const Product = require('../models/product');
const CrmApiService = require('../services/crmApi/crmApi.service');
const { Sequelize } = require('sequelize');

let lastId = 0;
// Back-off: skip cron ticks after a CRM connectivity failure
// Reset to 0 each time the cron succeeds or after the cooldown expires.
let crmBackoffUntil = 0;
const CRM_BACKOFF_MS = 5 * 60 * 1000; // 5 minutes

cron.schedule('* * * * *', async () => {

  // Skip this tick if we are in the back-off window
  if (Date.now() < crmBackoffUntil) {
    return;
  }

  try {
    const products = await Product.findAll({
      where: {
        is_approved: true,
        is_publish: true,
        id: {
          [Sequelize.Op.gt]: lastId
        }
      },
      limit: 10,
      order: [['id', 'ASC']]
    });

    if (products.length === 0) {
      lastId = 0; // reset cursor
      return;
    }

    for (const data of products) {
      try {
        let url = `https://neozaar.com/service/${data.id}`;

        if (data.action_type === 'product') {
          url = `https://neozaar.com/product/${data.id}`;
        } else if (data.action_type === 'solution') {
          url = `https://neozaar.com/solution/${data.id}`;
        }

        const crmProductData = {
          name: data.name,
          status: 1,
          category: data.category || "Neozaar",
          brand: data.brand_name || "Neozaar",
          price: data.starting_price || 0,
          tax: "IGST",
          client_product_id: data.id,
          weight: "0",
          URL: url,
          sku: data.sku_id,
          hsn_code: "NEO-" + data.id,
          description: data.long_description,
        };

        const result = await CrmApiService.createProduct(crmProductData);

        // createProduct returns a structured result — check if it was a CRM auth/network failure
        if (!result.success && result.message === 'CRM authentication failed') {
          console.warn('⚠️  CRM unreachable — pausing product sync for 5 minutes');
          crmBackoffUntil = Date.now() + CRM_BACKOFF_MS;
          return; // abort this tick entirely
        }

        lastId = data.id; // move cursor

      } catch (err) {
        console.error(`❌ Product CRM error ${data.id}`, err.message);
      }
    }

    console.log('✅ Product CRM Cron Completed');

  } catch (err) {
    console.error('❌ Product CRM Cron Failed:', err.message);
  }
});




// cron.schedule('* * * * *', async () => {
//   console.log('🚀 Product CRM Cron Started');

//   try {
//     const products = await Product.findAll({
//       where: {
//         is_approved: true,
//         is_publish: true,
//       },
//       limit: 10
//     });

//     for (const data of products) {
//       try {

//         let url = `https://neozaar.com/service/${data.id}`;
//         if(data.action_type == 'product'){
//             url = `https://neozaar.com/product/${data.id}`;
//         } else if(data.action_type == 'solution'){
//             url = `https://neozaar.com/solution/${data.id}`;
//         }else if(data.action_type == 'service'){
//             url = `https://neozaar.com/service/${data.id}`;
//         }
        
//         let crmProductData = {
//             name: data.name,
//             status: 1,
//             category: data.category || "Neozaar",
//             brand: data.brand_name || "Neozaar",
//             price: data.starting_price || 0,
//             tax: "IGST",
//             client_product_id: data.id,
//             weight: "0",
//             URL: url,
//             sku: data.sku_id,
//             hsn_code: "NEO-" + data.id,
//             description: data.long_description,
//         };

//         CrmApiService.createProduct(crmProductData)
//             .then((res) =>
//             console.log("CRM Sync Success while creating product:", res),
//             )
//             .catch((err) =>
//             console.error("CRM Sync Failed while creating product:", err),
//             );


//       } catch (err) {
//         console.error(`❌ Product CRM error ${data.id}`, err);
//       }
//     }

//     console.log('✅ Product CRM Cron Completed');

//   } catch (err) {
//     console.error('❌ Product CRM Cron Failed:', err);
//   }
// });
