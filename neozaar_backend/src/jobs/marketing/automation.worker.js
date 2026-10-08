require("dotenv").config();const engine=require("../../services/marketing/automation/automation.service");const health=require("../../services/marketing/health.service");
let stopping=false;process.on("SIGTERM",()=>{stopping=true;});process.on("SIGINT",()=>{stopping=true;});
async function run(){let lastSchedule=0;while(!stopping){try{health.heartbeat("automation.worker");if(Date.now()-lastSchedule>60000){await engine.dispatchScheduled();lastSchedule=Date.now();}const result=await engine.processNext();if(!result)await new Promise(r=>setTimeout(r,1000));}catch(e){console.error("Marketing automation worker error:",e.message);await new Promise(r=>setTimeout(r,5000));}}process.exit(0);}
if(require.main===module)run();module.exports={run};
