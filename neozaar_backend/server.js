/**
 * Server startup script for NeoZaar Backend
 */

require('dotenv').config();
const app = require('./src/app');
require('./src/jobs/seo.cron');
require('./src/jobs/brandSeo.cron');
require('./src/jobs/productSync.cron');
require('./src/jobs/waMessageRetention.cron');

// Marketing background workers. Unlike the crons above, each of these
// exports a long-running `run()` loop guarded by `require.main === module`
// (so it can also be run standalone), so it must be invoked explicitly here.
// They poll the marketing_jobs queue and process/retry their own failures
// internally, so a rejection here would only mean an unexpected crash —
// log it rather than letting it become an unhandled rejection.
require('./src/jobs/marketing/automation.worker').run()
  .catch((error) => console.error('Marketing automation worker crashed:', error));
require('./src/jobs/marketing/email.worker').run()
  .catch((error) => console.error('Marketing email worker crashed:', error));
require('./src/jobs/marketing/retention.worker').run()
  .catch((error) => console.error('Marketing retention worker crashed:', error));
require('./src/jobs/marketing/crmHandoff.worker').run()
  .catch((error) => console.error('Marketing CRM handoff worker crashed:', error));
// Schedules itself on require (node-cron), like seo.cron.js etc. above —
// not a long-running loop, so no explicit invocation needed.
require('./src/jobs/marketing/nightly.cron');

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});