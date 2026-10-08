/**
 * Schedules the WhatsApp transcript retention sweep — daily at 03:30 server
 * time, plus once ~1 min after boot so a long-down server catches up.
 * Sweep logic lives in ./waMessageRetention.js.
 */
const cron = require('node-cron');
const { sweep } = require('./waMessageRetention');

cron.schedule('30 3 * * *', sweep);
setTimeout(sweep, 60_000);
