const fs=require('fs'),path=require('path'),pool=require('../config/database');
(async()=>{try{await pool.query(fs.readFileSync(path.join(__dirname,'057_marketing_crm_handoff_retry.sql'),'utf8'));console.log('Marketing migration 057 complete');}catch(e){console.error(e);process.exitCode=1;}finally{await pool.end();}})();
