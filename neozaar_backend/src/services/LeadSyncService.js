const Product = require("../models/product");
const User = require("../models/User");
const CrmApiService = require("./crmApi/crmApi.service");

async function syncLeadToCRM(data) {
  try {
    console.log("Preparing CRM lead with data:", data);

    const user = await User.findByPk(data.userId);
    if (!user?.email) return;

    let product = null;
    if (data.entityType === 'product' && data.entityId) {
      product = await Product.findByPk(data.entityId);
    }

    const crmPayload = {
      product_id: product?.id || null,
      leadType: "Website Visitor",
      name: user.name || user.email,
      email: user.email,
      phone: user.phone || null,
      title: `Interested in ${product?.name || 'your product'}`,
      lead_address: "",
      lead_city: "",
      lead_state: "",
      lead_country: "",
      lead_postalcode: "",
      status: "New",
      source: data.utm?.utm_source || "Website",
      opportunity_amount: 0,
      description: JSON.stringify({
        eventType: data.eventType,
        pageUrl: data.pageUrl,
        utm: data.utm,
        metadata: data.metadata || {}
      })
    };

   let result =  await CrmApiService.createLead(crmPayload);
    console.log("CRM Sync Success", result);

  } catch (error) {
    console.error("CRM Sync Failed:", error.message);
  }
}

module.exports = syncLeadToCRM;
