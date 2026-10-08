const fs=require('fs'),path=require('path'),pool=require('../config/database');
(async()=>{try{await pool.query(fs.readFileSync(path.join(__dirname,'054_marketing_consent.sql'),'utf8'));console.log('Marketing migration 054 complete');}catch(e){console.error(e);process.exitCode=1;}finally{await pool.end();}})();
