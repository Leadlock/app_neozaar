/**
 * AWS Marketplace listing assets — S3 upload.
 *
 * AWS Marketplace requires listing media (product logo, etc.) to be hosted in
 * Amazon S3; it rejects URLs on any other host with INVALID_MEDIA. NeoZaar's own
 * assets live on Azure Blob, so an admin-uploaded logo is normalised to a
 * compliant PNG and mirrored into a dedicated S3 bucket, and that S3 URL is what
 * goes into the Catalog API change set.
 *
 * Env:
 *   AWS_MP_ASSETS_BUCKET   — bucket name (required for uploads)
 *   AWS_MP_ASSETS_REGION   — bucket region (default: AWS_MP_REGION or us-east-1)
 *   AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY — shared with the Catalog API client;
 *     the IAM policy also grants s3:PutObject/GetObject/DeleteObject on this bucket.
 */

const crypto = require('crypto');
const sharp = require('sharp');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const REGION = process.env.AWS_MP_ASSETS_REGION || process.env.AWS_MP_REGION || 'us-east-1';
const BUCKET = process.env.AWS_MP_ASSETS_BUCKET || null;

// AWS Marketplace product-logo bounds: PNG, roughly square, 110–640 px per side.
const LOGO_BOX = 512;

let _s3 = null;
function s3() {
  if (_s3) return _s3;
  _s3 = new S3Client({
    region: REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
  return _s3;
}

function assetsConfigured() {
  return !!(BUCKET && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
}

function publicUrl(key) {
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
}

// Key belongs to this bucket? (guards deleteAsset against arbitrary URLs)
function keyFromUrl(url) {
  const prefix = `https://${BUCKET}.s3.${REGION}.amazonaws.com/`;
  return url && url.startsWith(prefix) ? url.slice(prefix.length) : null;
}

/**
 * Normalise an uploaded image into an AWS-Marketplace-compliant logo PNG:
 * PNG, fits within 512×512 (so 110–640 bounds always hold), aspect preserved,
 * transparency kept.
 */
async function processLogo(buffer) {
  let meta;
  try {
    meta = await sharp(buffer, { failOn: 'none' }).metadata();
  } catch {
    throw Object.assign(new Error('Uploaded file is not a readable image.'), { status: 400 });
  }
  if (!meta.width || !meta.height) {
    throw Object.assign(new Error('Could not read image dimensions.'), { status: 400 });
  }

  return sharp(buffer, { failOn: 'none' })
    .resize(LOGO_BOX, LOGO_BOX, { fit: 'inside', withoutEnlargement: false })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/**
 * Upload a logo for a request. Returns { key, url }.
 */
async function uploadLogo({ buffer, requestId }) {
  if (!assetsConfigured()) {
    throw Object.assign(
      new Error('S3 assets bucket is not configured on the server. Set AWS_MP_ASSETS_BUCKET.'),
      { status: 503 }
    );
  }
  const png = await processLogo(buffer);
  const key = `marketplace-logos/req-${requestId}/${crypto.randomUUID()}.png`;

  await s3().send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: png,
      ContentType: 'image/png',
      CacheControl: 'public, max-age=31536000',
    })
  );

  return { key, url: publicUrl(key) };
}

/**
 * Best-effort delete of a previously uploaded asset (used when replacing a logo).
 * Only touches objects in our own bucket; silently ignores anything else.
 */
async function deleteAsset(url) {
  if (!assetsConfigured()) return;
  const key = keyFromUrl(url);
  if (!key) return;
  try {
    await s3().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch {
    /* non-fatal */
  }
}

module.exports = {
  bucket: BUCKET,
  region: REGION,
  assetsConfigured,
  uploadLogo,
  deleteAsset,
  publicUrl,
};
