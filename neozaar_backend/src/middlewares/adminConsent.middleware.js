const consentService = require("../services/consent.service");

module.exports = async (req, res, next) => {
    const userId = req.body.userId;
    if (!userId) return next();

    const hasConsent = await consentService.hasAnalyticsConsent(userId);
    if (!hasConsent) return res.status(204).end();

    next();
};
