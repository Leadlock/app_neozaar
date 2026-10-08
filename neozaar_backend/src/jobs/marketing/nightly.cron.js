// Marketing nightly maintenance: score decay and dynamic segment refresh.
// Both already existed as callable functions (scoring.runDecay(),
// segmentation.refresh(segmentId)) but were only ever reachable by an
// admin manually hitting an endpoint — nothing ran them on a schedule.
const cron = require("node-cron");
const pool = require("../../config/database");
const scoring = require("../../services/marketing/scoring.service");
const segmentation = require("../../services/marketing/segmentation.service");

async function runNightlyMaintenance() {
  try {
    const decay = await scoring.runDecay();
    console.log(`Marketing nightly: score decay adjusted ${decay.contactsChanged} contact(s).`);
  } catch (error) {
    console.error("Marketing nightly: score decay failed:", error.message);
  }

  try {
    const { rows } = await pool.query("SELECT id FROM marketing_segments WHERE is_dynamic = TRUE");
    let refreshed = 0;
    for (const segment of rows) {
      try {
        await segmentation.refresh(segment.id);
        refreshed++;
      } catch (error) {
        console.error(`Marketing nightly: segment ${segment.id} refresh failed:`, error.message);
      }
    }
    console.log(`Marketing nightly: refreshed ${refreshed}/${rows.length} dynamic segment(s).`);
  } catch (error) {
    console.error("Marketing nightly: segment refresh sweep failed:", error.message);
  }
}

// 02:00 server time — after most same-day activity, before a normal
// business day starts.
cron.schedule("0 2 * * *", runNightlyMaintenance);

module.exports = { runNightlyMaintenance };
