const fs = require('fs').promises;
const path = require('path');
const dotenv = require('dotenv');
const axios = require('axios').default || require('axios');
dotenv.config();

// Azure rejects (HTTP 400) blob URLs whose names carry raw non-ASCII bytes, and
// email clients / Zoho mangle names containing unescaped URL-significant chars
// (& ? # spaces ...). Uploads routinely arrive named like
// "Nova – AI Market & Campaign Intelligence.jpg" (en-dash + ampersand), and
// multer decodes the multipart filename as latin1 by default, turning any
// non-ASCII char into mojibake. Reduce whatever we get to a plain, URL-safe
// ASCII slug so the stored blob URL works everywhere it's embedded (marketplace
// pages, campaign emails, marketplace push payloads, ...).
// Azure Blob Storage config (Temporary — SAS token, not account key).
// Exported so one-off scripts (e.g. src/migrations/sanitize_blob_names.js) reuse
// the exact same container + credentials instead of copy-pasting them.
const AZURE_CONTAINER_URL =
  process.env.AZURE_BLOB_CONTAINER_URL ||
  'https://neoblob.blob.core.windows.net/neoblobcontainer';
const AZURE_SAS_TOKEN =
  process.env.AZURE_BLOB_SAS_TOKEN ||
  'sv=2026-02-06&ss=bfqt&srt=sco&sp=rwdlacupiytfx&se=2026-12-27T14:24:47Z&st=2026-07-27T06:09:47Z&spr=https&sig=kTH3f4f4DPB%2FYYiQyfft2pQFDIXrX4n2xhW%2BKi6squI%3D';

const sanitizeFilename = (originalname) => {
  const raw = path.basename(String(originalname || ''));
  const dot = raw.lastIndexOf('.');
  const rawBase = dot > 0 ? raw.slice(0, dot) : raw;
  const rawExt = dot > 0 ? raw.slice(dot + 1) : '';

  const slug = (s) =>
    s
      .normalize('NFKD')                     // "é" -> "e" + combining accent
      .replace(/[̀-ͯ]/g, '')       // drop the combining accents, keep the "e"
      .replace(/[^A-Za-z0-9]+/g, '-')        // mojibake, &, spaces, other scripts -> '-'
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');

  const base = slug(rawBase).slice(0, 120) || 'file';
  const ext = slug(rawExt).toLowerCase().slice(0, 12);

  return ext ? `${base}.${ext}` : base;
};

const uploadToSFTP = async (file) => {
  if (!file || !file.buffer) {
    throw new Error("No file buffer found");
  }

  const sasToken = AZURE_SAS_TOKEN;
  const containerUrl = AZURE_CONTAINER_URL;

  const safeFilename = sanitizeFilename(file.originalname);
  const uniqueSuffix = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  const filename = `${uniqueSuffix}_${safeFilename}`;
  const uploadUrl = `${containerUrl}/${filename}?${sasToken}`;

  try {
    await axios.put(uploadUrl, file.buffer, {
      headers: {
        'x-ms-blob-type': 'BlockBlob',
        'Content-Type': file.mimetype || 'application/octet-stream'
      }
    });

    return `${containerUrl}/${filename}`;
  } catch (err) {
    console.error("Azure Blob Upload Error:", err.response ? err.response.data : err.message);
    throw new Error("Failed to upload file to Azure Blob Storage");
  }
};

module.exports = uploadToSFTP;
module.exports.sanitizeFilename = sanitizeFilename;
module.exports.AZURE_CONTAINER_URL = AZURE_CONTAINER_URL;
module.exports.AZURE_SAS_TOKEN = AZURE_SAS_TOKEN;
