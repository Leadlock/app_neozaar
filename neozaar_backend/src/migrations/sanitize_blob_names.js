/**
 * Sanitize existing broken blob URLs.
 *
 * Some listings were saved with an Azure blob whose NAME contains characters that
 * make the public URL malformed — non-ASCII bytes (mojibake from a "–" / curly
 * quote in the original filename), a raw "&", spaces, "%", "#", "?". Azure then
 * returns HTTP 400/404 for that URL, so the image is broken in campaign emails,
 * Zoho, and anywhere the raw URL is embedded.
 *
 * The blob CONTENT is fine — only the name is bad. This script does a server-side
 * "Copy Blob" to a clean name (no image download/re-upload), then repoints the
 * DB columns. Blobs that genuinely don't exist on Azure are reported so you can
 * re-upload just those by hand.
 *
 * Safe to re-run (idempotent): a clean name that already exists is reused, a URL
 * that's already clean is skipped.
 *
 *   node src/migrations/sanitize_blob_names.js               # dry run, no changes
 *   node src/migrations/sanitize_blob_names.js --execute     # copy blobs + update DB
 *   node src/migrations/sanitize_blob_names.js --execute --delete-old   # also remove the old blobs
 *
 * Self-contained apart from src/config/database (env: DB_USER/DB_HOST/DB_NAME/...)
 * and axios. Azure container + SAS token are inlined below (same values as
 * src/utils/azureStorage.js), overridable via AZURE_BLOB_CONTAINER_URL /
 * AZURE_BLOB_SAS_TOKEN.
 */

const pool = require("../config/database");
const axiosMod = require("axios");
const axios = axiosMod.default || axiosMod;

const DRY_RUN = !process.argv.includes("--execute");
const DELETE_OLD = process.argv.includes("--delete-old");

// Keep in sync with src/utils/azureStorage.js. SAS token expires 2026-12-27.
const AZURE_CONTAINER_URL =
  process.env.AZURE_BLOB_CONTAINER_URL ||
  "https://neoblob.blob.core.windows.net/neoblobcontainer";
const AZURE_SAS_TOKEN =
  process.env.AZURE_BLOB_SAS_TOKEN ||
  "sv=2026-02-06&ss=bfqt&srt=sco&sp=rwdlacupiytfx&se=2026-12-27T14:24:47Z&st=2026-07-27T06:09:47Z&spr=https&sig=kTH3f4f4DPB%2FYYiQyfft2pQFDIXrX4n2xhW%2BKi6squI%3D";

const CONTAINER_PREFIX = `${AZURE_CONTAINER_URL}/`;

// Columns that hold uploaded blob URLs. Scalars are a single URL string; arrays
// are text[] of URL strings.
const SCALAR_COLUMNS = [
  { table: "products", id: "id", col: "product_logo" },
  { table: "products", id: "id", col: "image_url" },
];
const ARRAY_COLUMNS = [
  { table: "products", id: "id", col: "screenshots" },
  { table: "products", id: "id", col: "brochures" },
  { table: "products", id: "id", col: "customer_case_studies" },
  { table: "products", id: "id", col: "sla_documents" },
];

// ── name handling ────────────────────────────────────────────────────────────

// A blob name is "safe" if the whole thing is already URL-clean. Note "_" IS
// allowed — we only rewrite names that would actually break the URL, so the
// thousands of existing "Foo_Bar_Baz.png" blobs are left completely untouched.
const SAFE_NAME = /^[A-Za-z0-9._-]+$/;

function needsFix(blobName) {
  return !SAFE_NAME.test(blobName);
}

// Produce a URL-safe name, preserving the "<timestamp>_<rand>_" prefix and the
// extension, and keeping "_" as a word separator. Only the URL-hostile chars are
// collapsed away.
function cleanName(blobName) {
  const m = blobName.match(/^(\d+_\d+_)([\s\S]+)$/);
  const prefix = m ? m[1] : "";
  const rest = m ? m[2] : blobName;

  const dot = rest.lastIndexOf(".");
  let base = dot > 0 ? rest.slice(0, dot) : rest;
  let ext = dot > 0 ? rest.slice(dot + 1) : "";

  base = base
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")      // strip combining accents, keep the letter
    .replace(/[^A-Za-z0-9._-]+/g, "_")    // mojibake, &, spaces, other scripts -> "_"
    .replace(/[._-]{2,}/g, "_")           // collapse mixed runs of separators
    .replace(/^[._-]+|[._-]+$/g, "");
  ext = ext
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9]+/g, "")
    .toLowerCase()
    .slice(0, 12);

  if (!base) base = "file";
  return prefix + base + (ext ? `.${ext}` : "");
}

function isNeoblobUrl(url) {
  return typeof url === "string" && url.startsWith(CONTAINER_PREFIX);
}

function blobNameFromUrl(url) {
  // Stored value has no query string; everything after the container prefix is
  // the (single-segment) blob name, exactly as it lives in the DB string.
  return url.slice(CONTAINER_PREFIX.length);
}

// ── Azure operations ─────────────────────────────────────────────────────────

// Address a blob by its EXACT name. The DB string holds the raw name (literal
// "&", literal non-ASCII chars); percent-encode every reserved/again-non-ASCII
// char so Azure decodes it back to that same name.
function encodeBlobName(name) {
  return encodeURIComponent(name).replace(/%2F/gi, "/");
}

function blobRequestUrl(name) {
  return `${CONTAINER_PREFIX}${encodeBlobName(name)}?${AZURE_SAS_TOKEN}`;
}

// Returns the request-URL form that actually resolves (200) for this stored
// name, or null if the blob can't be found either way.
async function resolveExistingBlob(rawName) {
  const candidates = [rawName];
  // If the stored name looks already-percent-encoded, also try the decoded form.
  if (/%[0-9A-Fa-f]{2}/.test(rawName)) {
    try {
      candidates.push(decodeURIComponent(rawName));
    } catch (_) {
      /* malformed % sequence — ignore */
    }
  }
  for (const name of candidates) {
    try {
      const res = await axios.head(blobRequestUrl(name), {
        validateStatus: () => true,
      });
      if (res.status === 200) return name;
    } catch (_) {
      /* network error — treat as not found, fall through */
    }
  }
  return null;
}

async function blobExists(name) {
  try {
    const res = await axios.head(blobRequestUrl(name), {
      validateStatus: () => true,
    });
    return res.status === 200;
  } catch (_) {
    return false;
  }
}

async function copyBlob(sourceName, destName) {
  const res = await axios.put(`${CONTAINER_PREFIX}${encodeBlobName(destName)}?${AZURE_SAS_TOKEN}`, null, {
    headers: {
      "x-ms-copy-source": `${CONTAINER_PREFIX}${encodeBlobName(sourceName)}?${AZURE_SAS_TOKEN}`,
      "x-ms-requires-sync": "true", // small same-account blobs copy synchronously
    },
    validateStatus: () => true,
  });
  if (res.status !== 202 && res.status !== 201) {
    throw new Error(`copy failed ${res.status}: ${String(res.data).slice(0, 200)}`);
  }
  const copyStatus = res.headers["x-ms-copy-status"];
  if (copyStatus && copyStatus !== "success") {
    throw new Error(`copy not synchronous (x-ms-copy-status=${copyStatus})`);
  }
}

async function deleteBlob(name) {
  const res = await axios.delete(blobRequestUrl(name), { validateStatus: () => true });
  if (res.status !== 202 && res.status !== 200 && res.status !== 404) {
    throw new Error(`delete failed ${res.status}`);
  }
}

// ── planning ─────────────────────────────────────────────────────────────────

// url -> { action: 'rename'|'skip-clean'|'missing', newUrl?, sourceName? }
// Cached so a blob shared by two rows is only probed once.
const plans = new Map();

async function planUrl(rawUrl) {
  const url = typeof rawUrl === "string" ? rawUrl.trim() : rawUrl;
  if (plans.has(url)) return plans.get(url);

  let plan;
  if (!isNeoblobUrl(url)) {
    plan = { action: "skip-foreign" };
  } else {
    const rawName = blobNameFromUrl(url);
    if (!needsFix(rawName)) {
      plan = { action: "skip-clean" };
    } else {
      const newName = cleanName(rawName);
      const newUrl = `${CONTAINER_PREFIX}${newName}`;
      const sourceForm = await resolveExistingBlob(rawName);
      if (!sourceForm && !(await blobExists(newName))) {
        plan = { action: "missing" };
      } else {
        plan = { action: "rename", newUrl, newName, sourceForm, rawName };
      }
    }
  }
  plans.set(url, plan);
  return plan;
}

// ── DB scan ──────────────────────────────────────────────────────────────────

async function scanScalar({ table, id, col }) {
  const { rows } = await pool.query(
    `SELECT ${id} AS id, ${col} AS val FROM ${table}
     WHERE ${col} LIKE '%${CONTAINER_PREFIX}%'`
  );
  const updates = []; // { id, newVal }
  const missing = []; // { id, url }
  for (const row of rows) {
    const plan = await planUrl(row.val);
    if (plan.action === "rename") updates.push({ id: row.id, newVal: plan.newUrl, oldVal: row.val });
    else if (plan.action === "missing") missing.push({ id: row.id, url: row.val });
  }
  return { table, col, updates, missing, scanned: rows.length };
}

async function scanArray({ table, id, col }) {
  const { rows } = await pool.query(
    `SELECT ${id} AS id, ${col} AS val FROM ${table}
     WHERE array_to_string(${col}, ',') LIKE '%${CONTAINER_PREFIX}%'`
  );
  const updates = []; // { id, newArr }
  const missing = []; // { id, url }
  for (const row of rows) {
    const arr = Array.isArray(row.val) ? row.val : [];
    const newArr = [];
    let changed = false;
    for (const url of arr) {
      const plan = await planUrl(url);
      if (plan.action === "rename") {
        newArr.push(plan.newUrl);
        changed = true;
      } else {
        newArr.push(url);
        if (plan.action === "missing") missing.push({ id: row.id, url });
      }
    }
    if (changed) updates.push({ id: row.id, newArr, oldArr: arr });
  }
  return { table, col, updates, missing, scanned: rows.length };
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${"=".repeat(64)}`);
  console.log(`  BLOB NAME SANITIZE — ${DRY_RUN ? "DRY RUN (no changes)" : "EXECUTING"}` +
    (DELETE_OLD ? "  [+delete old blobs]" : ""));
  console.log(`  container: ${AZURE_CONTAINER_URL}`);
  console.log(`${"=".repeat(64)}\n`);

  const results = [];
  for (const c of SCALAR_COLUMNS) results.push(await scanScalar(c));
  for (const c of ARRAY_COLUMNS) results.push(await scanArray(c));

  const renamePlans = [...plans.values()].filter((p) => p.action === "rename");
  const missingPlans = [...plans.values()].filter((p) => p.action === "missing");
  const totalRowUpdates = results.reduce((n, r) => n + r.updates.length, 0);

  for (const r of results) {
    if (r.scanned === 0) continue;
    console.log(
      `  ${r.table}.${r.col}: ${r.scanned} rows w/ neoblob URLs, ` +
      `${r.updates.length} to repoint, ${r.missing.length} pointing at a missing blob`
    );
  }
  console.log(
    `\n  ${renamePlans.length} distinct blob(s) to copy to a clean name` +
    `  →  ${totalRowUpdates} DB row update(s)`
  );

  // blobs referenced by the DB that don't exist on Azure at all
  const missingUrls = new Set();
  for (const r of results) for (const m of r.missing) missingUrls.add(`${r.table} #${m.id}  ${m.url}`);
  if (missingUrls.size) {
    console.log(`\n  ⚠ ${missingUrls.size} URL(s) have NO blob on Azure — re-upload these by hand:`);
    for (const line of [...missingUrls].slice(0, 50)) console.log(`      ${line}`);
    if (missingUrls.size > 50) console.log(`      … and ${missingUrls.size - 50} more`);
  }

  if (renamePlans.length) {
    console.log(`\n  sample renames:`);
    for (const p of renamePlans.slice(0, 8)) {
      console.log(`      ${decodeURIComponent(p.rawName)}`);
      console.log(`   →  ${p.newName}`);
    }
  }

  if (DRY_RUN) {
    console.log(`\n  DRY RUN complete. Re-run with --execute to apply.\n`);
    await pool.end();
    return;
  }

  // 1) server-side copy every bad blob to its clean name (non-destructive)
  console.log(`\n  copying blobs…`);
  let copied = 0;
  let reused = 0;
  const copyFailed = [];
  for (const p of renamePlans) {
    try {
      if (await blobExists(p.newName)) {
        reused++;
        continue;
      }
      if (!p.sourceForm) {
        copyFailed.push(`${p.rawName} (source vanished)`);
        continue;
      }
      await copyBlob(p.sourceForm, p.newName);
      copied++;
    } catch (err) {
      copyFailed.push(`${p.rawName} — ${err.message}`);
    }
  }
  console.log(`    ${copied} copied, ${reused} already existed`);
  if (copyFailed.length) {
    console.log(`    ⚠ ${copyFailed.length} copy failure(s):`);
    for (const f of copyFailed) console.log(`        ${f}`);
    console.log(`\n  Aborting before DB changes — fix the copy failures and re-run.\n`);
    await pool.end();
    process.exit(1);
  }

  // 2) repoint the DB in one transaction
  console.log(`\n  updating DB…`);
  const client = await pool.connect();
  let applied = 0;
  try {
    await client.query("BEGIN");
    for (const r of results) {
      for (const u of r.updates) {
        if ("newVal" in u) {
          await client.query(`UPDATE ${r.table} SET ${r.col} = $1 WHERE id = $2`, [u.newVal, u.id]);
        } else {
          await client.query(`UPDATE ${r.table} SET ${r.col} = $1 WHERE id = $2`, [u.newArr, u.id]);
        }
        applied++;
      }
    }
    await client.query("COMMIT");
    console.log(`    ${applied} row(s) updated, committed.`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(`    ROLLED BACK: ${err.message}`);
    client.release();
    await pool.end();
    process.exit(1);
  }
  client.release();

  // 3) optionally delete the old blobs (only after the DB no longer points at them)
  if (DELETE_OLD) {
    console.log(`\n  deleting old blobs…`);
    let deleted = 0;
    for (const p of renamePlans) {
      try {
        if (p.sourceForm) {
          await deleteBlob(p.sourceForm);
          deleted++;
        }
      } catch (err) {
        console.log(`    ⚠ could not delete ${p.rawName}: ${err.message}`);
      }
    }
    console.log(`    ${deleted} old blob(s) deleted.`);
  } else {
    console.log(`\n  (old blobs left in place — re-run with --delete-old to remove them)`);
  }

  console.log(`\n  Done.\n`);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
