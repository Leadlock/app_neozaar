/**
 * Image URL Migration Script
 * Matches old neozaarassets URLs to new neoblob URLs by filename
 * Only updates image columns - no other data is touched
 */
const { Pool } = require(require('path').join(__dirname, 'neozaar_backend/node_modules/pg'));
const axiosMod = require(require('path').join(__dirname, 'neozaar_backend/node_modules/axios'));
const axios = axiosMod.default || axiosMod;

const pool = new Pool({
  user: 'devuser', host: 'localhost', database: 'proddb', password: 'NeoDevTeam', port: 5432,
});

const OLD_DOMAIN = 'neozaarassets.blob.core.windows.net/assets/assets/';
const NEW_BASE = 'https://neoblob.blob.core.windows.net/neoblobcontainer/';

// Fetch all blobs from new storage
async function getNewBlobIndex() {
  console.log('📦 Fetching blob index from new storage...');
  const url = 'https://neoblob.blob.core.windows.net/neoblobcontainer?restype=container&comp=list&maxresults=5000';
  const res = await axios.get(url);
  const blobNames = [];
  const matches = res.data.match(/<Name>(.*?)<\/Name>/g) || [];
  for (const m of matches) {
    blobNames.push(m.replace('<Name>', '').replace('</Name>', ''));
  }
  console.log(`  Found ${blobNames.length} blobs in new storage`);
  return blobNames;
}

// Extract the "original" filename from a URL (strip timestamp_random_ prefix)
function extractOriginalName(url) {
  const filename = url.split('/').pop();
  // Remove leading timestamp_random_ pattern: 1785147079188_401_
  const match = filename.match(/^\d+_\d+_(.+)$/);
  return match ? match[1] : filename;
}

// Build a lookup: originalName -> full new blob name
function buildLookup(blobNames) {
  const lookup = {};
  for (const name of blobNames) {
    const original = extractOriginalName(name);
    if (!lookup[original]) lookup[original] = [];
    lookup[original].push(name);
  }
  return lookup;
}

// Find new URL for an old URL
function findNewUrl(oldUrl, lookup) {
  const originalName = extractOriginalName(oldUrl);
  const candidates = lookup[originalName];
  if (candidates && candidates.length > 0) {
    // Use the most recent (highest timestamp) version
    const sorted = candidates.sort((a, b) => {
      const tsA = parseInt(a.split('_')[0]) || 0;
      const tsB = parseInt(b.split('_')[0]) || 0;
      return tsB - tsA;
    });
    return NEW_BASE + sorted[0];
  }
  return null;
}

// Process a single text column
async function processColumn(tableName, idCol, urlCol, lookup, dryRun = true) {
  const result = await pool.query(
    `SELECT ${idCol}, ${urlCol} FROM ${tableName} WHERE ${urlCol} LIKE '%neozaarassets%'`
  );
  
  const updates = [];
  const unmatched = [];
  
  for (const row of result.rows) {
    const oldUrl = row[urlCol];
    const newUrl = findNewUrl(oldUrl, lookup);
    if (newUrl) {
      updates.push({ id: row[idCol], oldUrl, newUrl });
    } else {
      unmatched.push({ id: row[idCol], oldUrl, originalName: extractOriginalName(oldUrl) });
    }
  }
  
  return { tableName, column: urlCol, updates, unmatched, total: result.rows.length };
}

// Process array columns (text[])
async function processArrayColumn(tableName, idCol, arrayCol, lookup, dryRun = true) {
  const result = await pool.query(
    `SELECT ${idCol}, ${arrayCol} FROM ${tableName} WHERE array_to_string(${arrayCol}, '') LIKE '%neozaarassets%'`
  );
  
  const updates = [];
  const unmatched = [];
  
  for (const row of result.rows) {
    const arr = row[arrayCol] || [];
    const newArr = [];
    let hasChange = false;
    let rowUnmatched = [];
    
    for (const url of arr) {
      if (url.includes('neozaarassets')) {
        const newUrl = findNewUrl(url, lookup);
        if (newUrl) {
          newArr.push(newUrl);
          hasChange = true;
        } else {
          newArr.push(url); // keep old if no match
          rowUnmatched.push(extractOriginalName(url));
        }
      } else {
        newArr.push(url);
      }
    }
    
    if (hasChange) {
      updates.push({ id: row[idCol], newArray: newArr });
    }
    if (rowUnmatched.length > 0) {
      unmatched.push({ id: row[idCol], files: rowUnmatched });
    }
  }
  
  return { tableName, column: arrayCol, updates, unmatched, total: result.rows.length };
}

async function main() {
  const DRY_RUN = process.argv.includes('--execute') ? false : true;
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  IMAGE URL MIGRATION - ${DRY_RUN ? '🔍 DRY RUN' : '🚀 EXECUTING'}`);
  console.log(`${'='.repeat(60)}\n`);
  
  const blobNames = await getNewBlobIndex();
  const lookup = buildLookup(blobNames);
  console.log(`  Built lookup with ${Object.keys(lookup).length} unique original filenames\n`);
  
  // Define all image columns to process
  const textColumns = [
    { table: 'products', id: 'id', col: 'product_logo' },
    { table: 'products', id: 'id', col: 'image_url' },
    { table: 'products', id: 'id', col: 'sales_enable_collateral' },
    { table: 'advertisment', id: 'id', col: 'image' },
    { table: 'ask_the_champ', id: 'id', col: 'banner' },
    { table: 'ask_the_champ', id: 'id', col: 'mobile_banner' },
    { table: 'brand', id: 'id', col: 'icon' },
    { table: 'home_master', id: 'id', col: 'banner' },
    { table: 'industry', id: 'id', col: 'icon' },
    { table: 'industry', id: 'id', col: 'logo' },
    { table: 'target_segments', id: 'id', col: 'icon' },
    { table: 'target_segments', id: 'id', col: 'logo' },
    { table: 'company_detail', id: 'id', col: 'brand_logo' },
    { table: 'seo_pages', id: 'id', col: 'og_image' },
    { table: 'bundles', id: 'id', col: 'bundle_logo' },
  ];
  
  const arrayColumns = [
    { table: 'products', id: 'id', col: 'screenshots' },
    { table: 'products', id: 'id', col: 'brochures' },
    { table: 'products', id: 'id', col: 'customer_case_studies' },
    { table: 'products', id: 'id', col: 'sla_documents' },
  ];
  
  let totalUpdates = 0;
  let totalUnmatched = 0;
  const allResults = [];
  
  // Process text columns
  for (const { table, id, col } of textColumns) {
    const result = await processColumn(table, id, col, lookup, DRY_RUN);
    allResults.push(result);
    totalUpdates += result.updates.length;
    totalUnmatched += result.unmatched.length;
    
    if (result.total > 0) {
      console.log(`📋 ${table}.${col}: ${result.updates.length}/${result.total} matched, ${result.unmatched.length} unmatched`);
    }
  }
  
  // Process array columns
  for (const { table, id, col } of arrayColumns) {
    const result = await processArrayColumn(table, id, col, lookup, DRY_RUN);
    allResults.push(result);
    totalUpdates += result.updates.length;
    totalUnmatched += result.unmatched.length;
    
    if (result.total > 0) {
      console.log(`📋 ${table}.${col}[]: ${result.updates.length}/${result.total} rows matched, ${result.unmatched.length} unmatched`);
    }
  }
  
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  SUMMARY: ${totalUpdates} rows to update, ${totalUnmatched} unmatched`);
  console.log(`${'─'.repeat(60)}\n`);
  
  if (DRY_RUN) {
    // Show sample updates
    console.log('📝 SAMPLE UPDATES (first 5):');
    let shown = 0;
    for (const r of allResults) {
      for (const u of r.updates.slice(0, 2)) {
        if (shown >= 5) break;
        console.log(`  ${r.tableName}.${r.column} [id=${u.id}]`);
        console.log(`    OLD: ${u.oldUrl ? u.oldUrl.substring(0, 80) + '...' : 'array'}`);
        console.log(`    NEW: ${u.newUrl ? u.newUrl.substring(0, 80) + '...' : 'array update'}`);
        shown++;
      }
    }
    
    // Show unmatched
    if (totalUnmatched > 0) {
      console.log(`\n⚠️  UNMATCHED FILES (sample):`);
      let ushown = 0;
      for (const r of allResults) {
        for (const u of r.unmatched.slice(0, 5)) {
          if (ushown >= 10) break;
          console.log(`  ${r.tableName}.${r.column} [id=${u.id}]: ${u.originalName || u.files?.join(', ')}`);
          ushown++;
        }
      }
    }
    
    console.log(`\n✅ DRY RUN COMPLETE. Run with --execute to apply changes.`);
  } else {
    // EXECUTE
    console.log('🚀 Executing migration in transaction...');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      let applied = 0;
      
      for (const r of allResults) {
        if (r.updates.length === 0) continue;
        
        for (const u of r.updates) {
          if (u.newUrl) {
            // Text column
            await client.query(
              `UPDATE ${r.tableName} SET ${r.column} = $1 WHERE id = $2`,
              [u.newUrl, u.id]
            );
          } else if (u.newArray) {
            // Array column
            await client.query(
              `UPDATE ${r.tableName} SET ${r.column} = $1 WHERE id = $2`,
              [u.newArray, u.id]
            );
          }
          applied++;
        }
      }
      
      await client.query('COMMIT');
      console.log(`\n✅ MIGRATION COMPLETE: ${applied} rows updated successfully.`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`\n❌ MIGRATION ROLLED BACK: ${err.message}`);
    } finally {
      client.release();
    }
  }
  
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
