const preferences = require("../services/marketing/preferences.service");
const fail = (res, e, m) => res.status(e.statusCode || 500).json({ status: "fail", message: e.statusCode ? e.message : m });

async function get(req, res) {
  try { return res.json({ status: "success", data: await preferences.getByToken(req.params.token) }); }
  catch (e) { return fail(res, e, "Failed to load preferences"); }
}

async function update(req, res) {
  try { return res.json({ status: "success", data: await preferences.updateByToken(req.params.token, req.body) }); }
  catch (e) { return fail(res, e, "Failed to update preferences"); }
}

module.exports = { get, update };
