const Bundle = require("../models/bundle");
const ActionService = require("./action.service");
const { sendLeadNotification } = require("../utils/email");
const sequelize = require("../config/sequelize");
const SubcribeModel = require("../models/Subscribe/subscribe");
const emailService = require("../config/mail");
class SubcribeService {
  async createSibscribe(data) {
    const { email, source } = data;
    const existing = await SubcribeModel.findOne({ where: { email: email } });
    if (existing) {
      throw new Error("Email already subscribed");
    }
    const subcribe = await SubcribeModel.create({ email, source });
    try {
      await emailService.sendSubscriptionConfirmationEmail(email);
    } catch (err) {
      console.error("Subscription email failed:", err);
    }
    return subcribe;
  }
}

module.exports = new SubcribeService();
