const analyticsService = require("../services/analytics.service");

exports.track = async (req, res) => {
    await analyticsService.trackEvent(req.body);
    res.json({ success: true });
};
