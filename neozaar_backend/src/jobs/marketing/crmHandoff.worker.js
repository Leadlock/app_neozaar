const handoff=require("../../services/marketing/crmHandoff.service");const health=require("../../services/marketing/health.service");
let stopping=false;process.on("SIGTERM",()=>{stopping=true;});process.on("SIGINT",()=>{stopping=true;});
async function run(){while(!stopping){try{health.heartbeat("crmHandoff.worker");const result=await handoff.processNext();if(!result)await new Promise(r=>setTimeout(r,2000));}catch(e){console.error("Marketing CRM handoff worker error:",e.message);await new Promise(r=>setTimeout(r,5000));}}}
if(require.main===module)run();module.exports={run};
