const crypto = require("crypto");

function safeEqual(left, right) {
  if (!left || !right) return false;
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function classifyTrackingSource(req, res, next) {
  const supplied = req.get("x-marketing-key");
  const serverKey = process.env.MARKETING_TRACKING_SERVER_KEY;
  const publicKey = process.env.MARKETING_TRACKING_PUBLIC_KEY;
  if (!supplied) req.marketingIngestionSource = "browser";
  else if (safeEqual(supplied, serverKey)) req.marketingIngestionSource = "server";
  else if (safeEqual(supplied, publicKey)) req.marketingIngestionSource = "browser";
  else return res.status(401).json({ status: "fail", message: "Invalid marketing tracking key" });
  return next();
}
function requireServerTrackingKey(req,res,next){const configured=process.env.MARKETING_TRACKING_SERVER_KEY;if(!configured)return res.status(503).json({status:'fail',message:'Provider webhooks are not configured'});if(!safeEqual(req.get('x-marketing-key'),configured))return res.status(401).json({status:'fail',message:'Invalid marketing tracking key'});return next();}

module.exports = { classifyTrackingSource,requireServerTrackingKey,safeEqual };
