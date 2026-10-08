const consentService = require("../services/consent.service");

exports.save = async (req, res) => {
    await consentService.saveConsent(req.body.userId, req.body.consentGiven);
    res.json({ success: true });
};
