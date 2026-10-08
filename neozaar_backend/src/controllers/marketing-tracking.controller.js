const tracking = require("../services/marketing/tracking.service");
const identity = require("../services/marketing/identity.service");

function fail(res, error, fallback) {
  if (error.statusCode) return res.status(error.statusCode).json({ status: "fail", message: error.message });
  console.error(`${fallback}:`, error?.message || error);
  return res.status(500).json({ status: "fail", message: fallback });
}

async function ingest(req, res) {
  try {
    const result = await tracking.track(req.body, req.marketingIngestionSource);
    return res.status(result.duplicate ? 200 : 202).json({
      status: "success",
      data: result.event,
      duplicate: result.duplicate,
    });
  } catch (error) { return fail(res, error, "Failed to ingest marketing event"); }
}

async function identify(req, res) {
  try {
    return res.json({ status: "success", data: await identity.resolveIdentity(req.body) });
  } catch (error) { return fail(res, error, "Failed to resolve marketing identity"); }
}

module.exports = { ingest, identify };
