const fs=require('fs'),path=require('path'),pool=require('../config/database');
(async()=>{try{await pool.query(fs.readFileSync(path.join(__dirname,'055_marketing_lead_scoring.sql'),'utf8'));console.log('Marketing migration 055 complete');}catch(e){console.error(e);process.exitCode=1;}finally{await pool.end();}})();
