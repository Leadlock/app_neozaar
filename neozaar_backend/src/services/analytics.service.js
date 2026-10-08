const repo = require("../repositories/analytics.repository");
const utmService = require("./utm.service");
const CrmApiService = require('./crmApi/crmApi.service');
const Product = require("../models/product");

class AnalyticsService {

    static async trackEvent(payload) {
        await repo.insertEvent(payload);
        await utmService.assignLeadSource(payload.userId, payload.utm);

        // let crmLeadData = AnalyticsService.prepareCrmLead(payload);
        AnalyticsService.createLeadCRM(payload);

    }

    static async prepareCrmLead(data) {
        console.log("Preparing CRM lead with data:", data);
        if (!data?.user?.email) return null;

        let product = null;
        if (data.entityId) {
            product = await Product.findByPk(data.entityId);
        }
        let user = await repo.getUserDetails(data.userId);
        data.user = user;
        return {
            product_id: product ? product.id : null,
            leadType: data.leadType || 'Website Visitor',
            name: data.user.name || data.user.email,
            email: data.user.email,
            phone: data.user.phone || null,
            title: `Interested in ${product?.name || 'your product'}`,
            lead_address: '',
            lead_city: '',
            lead_state: '',
            lead_country: '',
            lead_postalcode: '',
            status: 'New',
            source: data.utm?.utm_source || 'Website',
            opportunity_amount: 0,
            description: JSON.stringify({
            eventType: data.eventType,
            pageUrl: data.pageUrl,
            utm: data.utm || {},
            remark: data.message || data.remark || ''
            })
        };
    }


    static async overview(from, to) {
        const { rows } = await repo.getOverview(from, to);
        return rows[0];
    }

    static async dailyActivity(from, to) {
        const { rows } = await repo.getDailyActivity(from, to);
        return rows;
    }

    static async topProducts(limit) {
        const { rows } = await repo.getTopProducts(limit);
        return rows;
    }

    static async productFunnel(productId) {
        const { rows } = await repo.getProductFunnel(productId);
        return { product_id: productId, ...rows[0] };
    }

    static async userTimeline(userId) {
        const { rows } = await repo.getUserActivity(userId);
        return rows;
    }

    static async utmSources() {
        const { rows } = await repo.getUtmSources();
        return rows;
    }

    static async utmCampaigns() {
        const { rows } = await repo.getUtmCampaigns();
        return rows;
    }

    static async exportCSV(from, to) {
        const { rows } = await repo.exportEvents(from, to);
        return rows;
    }

    static async deleteUser(userId) {
        await repo.deleteUserData(userId);
        return true;
    }

    static async createLeadCRM(data){   
        console.log("Syncing lead to CRM:", data); 
        console.log("Preparing CRM lead with data:", data);
        if (!data?.user?.email) return null;

        let product = null;
        if (data.entityId) {
            product = await Product.findByPk(data.entityId);
        }
        let user = await repo.getUserDetails(data.userId);
        data.user = user;
        readyData = {
            product_id: product ? product.id : null,
            leadType: data.leadType || 'Website Visitor',
            name: data.user.name || data.user.email,
            email: data.user.email,
            phone: data.user.phone || null,
            title: `Interested in ${product?.name || 'your product'}`,
            lead_address: '',
            lead_city: '',
            lead_state: '',
            lead_country: '',
            lead_postalcode: '',
            status: 'New',
            source: data.utm?.utm_source || 'Website',
            opportunity_amount: 0,
            description: JSON.stringify({
            eventType: data.eventType,
            pageUrl: data.pageUrl,
            utm: data.utm || {},
            remark: data.message || data.remark || ''
            })
        };

        CrmApiService.createLead(readyData)
        .then(res => console.log("CRM Sync Success while creating lead:", res))
        .catch(err => console.error("CRM Sync Failed while creating lead:", err));

    }
}

module.exports = AnalyticsService;
