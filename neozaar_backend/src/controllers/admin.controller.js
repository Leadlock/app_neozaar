const analyticsService = require("../services/analytics.service");
const { toCSV } = require("../utils/csv.util");

exports.overview = async (req, res) => {
    const data = await analyticsService.overview(req.query.from, req.query.to);
    res.json(data);
};

exports.dailyActivity = async (req, res) => {
    const data = await analyticsService.dailyActivity(req.query.from, req.query.to);
    res.json(data);
};

exports.topProducts = async (req, res) => {
    const data = await analyticsService.topProducts(req.query.limit || 10);
    res.json(data);
};

// 🔹 PRODUCT FUNNEL
exports.productFunnel = async (req, res) => {
    const data = await analyticsService.productFunnel(req.params.id);
    res.json(data);
};

// 🔹 USER ACTIVITY TIMELINE
exports.userActivity = async (req, res) => {
    const data = await analyticsService.userTimeline(req.params.id);
    res.json(data);
};

// 🔹 UTM SOURCE REPORT
exports.utmSources = async (req, res) => {
    const data = await analyticsService.utmSources();
    res.json(data);
};

// 🔹 UTM CAMPAIGN PERFORMANCE
exports.utmCampaigns = async (req, res) => {
    const data = await analyticsService.utmCampaigns();
    res.json(data);
};

// 🔹 EXPORT CSV
exports.exportCSV = async (req, res) => {
    const rows = await analyticsService.exportCSV(req.query.from, req.query.to);
    const csv = toCSV(rows);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=analytics.csv");
    res.send(csv);
};

// 🔹 GDPR DELETE USER DATA
exports.deleteUser = async (req, res) => {
    await analyticsService.deleteUser(req.params.id);
    res.json({ success: true });
};
