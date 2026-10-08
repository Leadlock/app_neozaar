const os=require("os");const {v4:uuid}=require("uuid");
const repository=require("../../../repositories/marketing/marketing.repository");
const tagging=require("../tagging.service");const adapters=require("./adapters");
const TERMINAL=new Set(["COMPLETED","FAILED","CANCELLED","SKIPPED"]);const MAX_STEPS=100;

async function enqueue(client,executionId,availableAt=new Date(),suffix="run"){
  await client.query(`INSERT INTO marketing_jobs(job_type,payload,idempotency_key,available_at)
    VALUES('automation_execution',$1,$2,$3) ON CONFLICT(idempotency_key) DO NOTHING`,
  [JSON.stringify({executionId}),`${executionId}:${suffix}`,availableAt]);
}
async function dispatchEvent(event){
  if(!event?.marketing_contact_id)return[];const {rows}=await repository.pool.query(`SELECT * FROM marketing_automations
    WHERE status='active' AND trigger_type IN('event',$1) ORDER BY id`,[String(event.event_type||"").toLowerCase()]);
  const ids=[];for(const automation of rows){const expected=automation.trigger_config?.eventType;
    if(expected&&expected!==event.event_type)continue;const id=uuid(),key=`event:${automation.id}:${event.id}:${event.marketing_contact_id}`;
    const c=await repository.pool.connect();try{await c.query("BEGIN");const inserted=await c.query(`INSERT INTO marketing_automation_executions
      (id,automation_id,marketing_contact_id,trigger_event_id,idempotency_key,current_node,status,context)
      VALUES($1,$2,$3,$4,$5,$6,'QUEUED',$7) ON CONFLICT(idempotency_key) DO NOTHING RETURNING id`,
    [id,automation.id,event.marketing_contact_id,event.id,key,automation.definition?.start||automation.definition?.nodes?.[0]?.id||null,JSON.stringify({event})]);
    if(inserted.rows[0]){await enqueue(c,id);ids.push(id);}await c.query("COMMIT");}catch(e){await c.query("ROLLBACK").catch(()=>{});throw e;}finally{c.release();}}
  const waiting=await repository.pool.query(`SELECT id,current_node,step_count FROM marketing_automation_executions
    WHERE status='WAITING' AND marketing_contact_id=$1 AND context->>'waitingFor'=$2`,[event.marketing_contact_id,event.event_type]);
  for(const row of waiting.rows){const c=await repository.pool.connect();try{await c.query("BEGIN");await c.query(`UPDATE marketing_automation_executions SET status='QUEUED',context=context-'waitingFor',updated_at=NOW() WHERE id=$1`,[row.id]);await enqueue(c,row.id,new Date(),`event:${event.id}:${row.step_count}`);await c.query("COMMIT");}catch(e){await c.query("ROLLBACK").catch(()=>{});throw e;}finally{c.release();}}
  return ids;
}

async function startExecution(client,automationId,contactId,key,context={}){const ar=await client.query("SELECT definition FROM marketing_automations WHERE id=$1 AND status='active'",[automationId]);if(!ar.rows[0])return null;const id=uuid();const inserted=await client.query(`INSERT INTO marketing_automation_executions(id,automation_id,marketing_contact_id,idempotency_key,current_node,status,context)
 VALUES($1,$2,$3,$4,$5,'QUEUED',$6) ON CONFLICT(idempotency_key) DO NOTHING RETURNING id`,[id,automationId,contactId,key,ar.rows[0].definition?.start||ar.rows[0].definition?.nodes?.[0]?.id||null,JSON.stringify(context)]);if(inserted.rows[0])await enqueue(client,id);return inserted.rows[0]?.id||null;}

async function condition(client,contactId,node,context){const c=node.config||{};
  if(c.kind==="event")return context.event?.event_type===c.eventType;
  if(c.kind==="tag")return Boolean((await client.query("SELECT 1 FROM marketing_contact_tags WHERE marketing_contact_id=$1 AND tag_id=$2",[contactId,c.tagId])).rows[0]);
  if(c.kind==="segment")return Boolean((await client.query("SELECT 1 FROM marketing_segment_members WHERE marketing_contact_id=$1 AND segment_id=$2",[contactId,c.segmentId])).rows[0]);
  const {rows}=await client.query("SELECT marketing_score,lifecycle_stage,email_consent,do_not_contact FROM marketing_contacts WHERE id=$1",[contactId]);const contact=rows[0]||{};
  if(c.kind==="suppression")return Boolean(contact.do_not_contact);
  if(c.kind==="consent")return Boolean(contact[`${c.channel||"email"}_consent`])&&!contact.do_not_contact;
  const actual=c.kind==="score"?Number(contact.marketing_score):contact[c.field||"lifecycle_stage"];
  return {eq:()=>actual===c.value,neq:()=>actual!==c.value,gt:()=>actual>c.value,gte:()=>actual>=c.value,lt:()=>actual<c.value,lte:()=>actual<=c.value}[c.op||"eq"]?.()||false;
}

async function action(client,execution,node){const c=node.config||{},contactId=execution.marketing_contact_id;
  if(node.type==="trigger")return{status:"COMPLETED"};
  if(node.type==="action"){if(!c.actionType)throw new Error("Action node requires config.actionType");node={...node,type:c.actionType};}
  const key=c.idempotencyKey||node.type;const prior=await client.query(`SELECT result FROM marketing_action_deduplication WHERE execution_id=$1 AND node_id=$2 AND action_key=$3`,[execution.id,node.id,key]);if(prior.rows[0])return prior.rows[0].result;
  let result={status:"COMPLETED"};
  if(node.type==="add_tag")result.changed=await tagging.applyTag(client,contactId,c.tagId,"automation");
  else if(node.type==="remove_tag")result.changed=await tagging.removeTag(client,contactId,c.tagId,"automation");
  else if(node.type==="update_field"){const allowed={first_source:"first_source",last_source:"last_source",last_campaign:"last_campaign"};if(!allowed[c.field])throw new Error("Unsupported Marketing field");await client.query(`UPDATE marketing_contacts SET ${allowed[c.field]}=$1,updated_at=NOW() WHERE id=$2`,[c.value,contactId]);}
  else if(node.type==="lifecycle"){if(!["visitor","subscriber","lead","mql","sql","customer"].includes(c.stage))throw new Error("Invalid lifecycle stage");await client.query("UPDATE marketing_contacts SET lifecycle_stage=$1,updated_at=NOW() WHERE id=$2",[c.stage,contactId]);}
  else if(node.type==="adjust_score"){await client.query(`INSERT INTO marketing_score_ledger(marketing_contact_id,model_id,score_delta,reason) VALUES($1,$2,$3,'automation')`,[contactId,c.modelId,c.delta]);await client.query(`INSERT INTO marketing_contact_scores(marketing_contact_id,model_id,score) VALUES($1,$2,$3) ON CONFLICT(marketing_contact_id,model_id) DO UPDATE SET score=marketing_contact_scores.score+EXCLUDED.score,updated_at=NOW()`,[contactId,c.modelId,c.delta]);}
  else if(node.type==="add_segment"){await client.query(`INSERT INTO marketing_segment_members(segment_id,marketing_contact_id,membership_reason) VALUES($1,$2,$3) ON CONFLICT DO NOTHING`,[c.segmentId,contactId,JSON.stringify({source:"automation"})]);}
  else if(node.type==="remove_segment"){await client.query("DELETE FROM marketing_segment_members WHERE segment_id=$1 AND marketing_contact_id=$2",[c.segmentId,contactId]);}
  else if(node.type==="start_automation")result={executionId:await startExecution(client,c.automationId,contactId,`parent:${execution.id}:${node.id}`,{parentExecutionId:execution.id})};
  else if(node.type==="stop_automation"){const stopped=await client.query(`UPDATE marketing_automation_executions SET status='CANCELLED',completed_at=NOW() WHERE automation_id=$1 AND marketing_contact_id=$2 AND status IN('QUEUED','RUNNING','WAITING') AND id<>$3 RETURNING id`,[c.automationId,contactId,execution.id]);result={cancelled:stopped.rows.length};}
  else {const map={send_email:"sendEmail",send_whatsapp:"sendWhatsApp",send_sms:"sendSms",add_campaign:"campaign",remove_campaign:"campaign",create_crm_activity:"crmActivity",create_crm_task:"crmTask",crm_handoff:"crmHandoff",notification:"notification",webhook:"webhook"};if(!map[node.type])throw new Error(`Unsupported action: ${node.type}`);
    if(["send_email","send_whatsapp","send_sms"].includes(node.type)){const channel={send_email:'email',send_whatsapp:'whatsapp',send_sms:'sms'}[node.type];const allowed=await condition(client,contactId,{config:{kind:"consent",channel}},execution.context);if(!allowed)result={status:"SKIPPED",reason:"suppressed_or_no_consent"};else result=await adapters[map[node.type]]({contactId,config:c,executionId:execution.id,actionType:node.type});}
    else result=await adapters[map[node.type]]({contactId,config:c,executionId:execution.id,actionType:node.type});}
  await client.query(`INSERT INTO marketing_action_deduplication(execution_id,node_id,action_key,result) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING`,[execution.id,node.id,key,JSON.stringify(result)]);return result;
}

async function execute(executionId){const client=await repository.pool.connect();try{await client.query("BEGIN");const exr=await client.query("SELECT * FROM marketing_automation_executions WHERE id=$1 FOR UPDATE",[executionId]);let ex=exr.rows[0];if(!ex||TERMINAL.has(ex.status)){await client.query("COMMIT");return ex;}
  const ar=await client.query("SELECT * FROM marketing_automations WHERE id=$1",[ex.automation_id]);const automation=ar.rows[0];if(!automation||automation.status!=="active"){await client.query("UPDATE marketing_automation_executions SET status='SKIPPED',completed_at=NOW() WHERE id=$1",[executionId]);await client.query("COMMIT");return;}
  await client.query("UPDATE marketing_automation_executions SET status='RUNNING',started_at=COALESCE(started_at,NOW()),updated_at=NOW() WHERE id=$1",[executionId]);const nodes=new Map((automation.definition?.nodes||[]).map(n=>[n.id,n]));let current=ex.current_node;
  while(current){ex.step_count+=1;if(ex.step_count>MAX_STEPS)throw new Error("Automation loop protection limit exceeded");const node=nodes.get(current);if(!node)throw new Error(`Automation node not found: ${current}`);await client.query(`INSERT INTO marketing_automation_logs(execution_id,node_id,level,event) VALUES($1,$2,'INFO','NODE_STARTED')`,[executionId,node.id]);
    if(node.type==="wait"){const next=node.next||null;if(node.config?.untilEvent){await client.query(`UPDATE marketing_automation_executions SET status='WAITING',current_node=$1,step_count=$2,context=jsonb_set(context,'{waitingFor}',to_jsonb($3::text)),updated_at=NOW() WHERE id=$4`,[next,ex.step_count,node.config.untilEvent,executionId]);}else{const ms=cappedDelay(node.config||{});await client.query(`UPDATE marketing_automation_executions SET status='WAITING',current_node=$1,step_count=$2,updated_at=NOW() WHERE id=$3`,[next,ex.step_count,executionId]);await enqueue(client,executionId,new Date(Date.now()+ms),`wait:${node.id}:${ex.step_count}`);}await client.query("COMMIT");return;}
    if(node.type==="branch"||node.type==="condition")current=(await condition(client,ex.marketing_contact_id,node,ex.context))?node.onTrue:node.onFalse;
    else if(node.type==="stop"){current=null;}
    else {await action(client,ex,node);current=node.next||null;}
    await client.query("UPDATE marketing_automation_executions SET current_node=$1,step_count=$2,updated_at=NOW() WHERE id=$3",[current,ex.step_count,executionId]);}
  await client.query("UPDATE marketing_automation_executions SET status='COMPLETED',completed_at=NOW(),updated_at=NOW() WHERE id=$1",[executionId]);await client.query("COMMIT");
 }catch(e){await client.query("ROLLBACK").catch(()=>{});throw e;}finally{client.release();}}
function cappedDelay(c){if(c.untilDate)return Math.max(0,new Date(c.untilDate).getTime()-Date.now());const unit={minutes:60000,hours:3600000,days:86400000}[c.unit]||60000;return Math.min(Number(c.value||1)*unit,365*86400000);}

async function processNext(owner=`${os.hostname()}:${process.pid}`){const c=await repository.pool.connect();let job;try{await c.query("BEGIN");const r=await c.query(`SELECT * FROM marketing_jobs WHERE job_type='automation_execution' AND status='QUEUED' AND available_at<=NOW() ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 1`);job=r.rows[0];if(!job){await c.query("COMMIT");return null;}await c.query("UPDATE marketing_jobs SET status='RUNNING',leased_at=NOW(),lease_owner=$1,attempts=attempts+1 WHERE id=$2",[owner,job.id]);await c.query("COMMIT");}catch(e){await c.query("ROLLBACK").catch(()=>{});throw e;}finally{c.release();}
  try{await execute(job.payload.executionId);await repository.pool.query("UPDATE marketing_jobs SET status='COMPLETED',updated_at=NOW() WHERE id=$1",[job.id]);return{jobId:job.id,status:"COMPLETED"};}
  catch(e){const attempts=Number(job.attempts)+1,failed=attempts>=job.max_attempts,error=String(e.message).slice(0,500);await repository.pool.query(`UPDATE marketing_jobs SET status=$1,last_error=$2,available_at=NOW()+($3::int*INTERVAL '1 second'),updated_at=NOW() WHERE id=$4`,[failed?"FAILED":"QUEUED",error,Math.min(3600,2**attempts*30),job.id]);await repository.pool.query(`UPDATE marketing_automation_executions SET status=$1,retry_count=retry_count+1,last_error=$2,updated_at=NOW() WHERE id=$3`,[failed?"FAILED":"QUEUED",error,job.payload.executionId]);await repository.pool.query(`INSERT INTO marketing_automation_logs(execution_id,level,event,details) VALUES($1,'ERROR','EXECUTION_FAILED',$2)`,[job.payload.executionId,JSON.stringify({retrying:!failed,attempt:attempts,error})]).catch(()=>{});return{jobId:job.id,status:failed?"FAILED":"QUEUED"};}}

async function cancel(id){const r=await repository.pool.query(`UPDATE marketing_automation_executions SET status='CANCELLED',completed_at=NOW(),updated_at=NOW() WHERE id=$1 AND status NOT IN('COMPLETED','FAILED','CANCELLED','SKIPPED') RETURNING *`,[id]);await repository.pool.query(`UPDATE marketing_jobs SET status='CANCELLED' WHERE payload->>'executionId'=$1 AND status='QUEUED'`,[id]);return r.rows[0]||null;}
const SCHEDULED_SEGMENT_LIMIT=5000; // same reasoning as email's SEGMENT_SEND_LIMIT — bounds one dispatch cycle's work. Not a pagination cursor: a segment larger than this always has its "extra" members skipped on every run, not just the first — logged so it's visible, not silently wrong.
const DEFAULT_RECURRING_MINUTES=1440; // once a day — the old code effectively fired every single minute forever (dispatchScheduled runs every 60s with no throttle of its own); nothing about "scheduled" should default to that.

// trigger_config shape: { contactId } (single, back-compat) or { segmentId }
// (run for every member), plus optional { schedule: { type: 'once' } } to
// run exactly once (the automation is paused afterwards) or
// { schedule: { type: 'recurring', intervalMinutes } } (defaults to daily
// if omitted). Bookkept via marketing_automations.next_run_at, the same
// "available_at" convention marketing_jobs already uses.
async function dispatchScheduled(){
  const bucket=new Date();bucket.setSeconds(0,0);
  const{rows}=await repository.pool.query("SELECT id,trigger_config FROM marketing_automations WHERE status='active' AND trigger_type='scheduled' AND (next_run_at IS NULL OR next_run_at<=NOW())");
  const ids=[];
  for(const a of rows){
    let contactIds=[];
    if(a.trigger_config?.segmentId){
      const members=await repository.pool.query("SELECT marketing_contact_id FROM marketing_segment_members WHERE segment_id=$1 ORDER BY marketing_contact_id LIMIT $2",[a.trigger_config.segmentId,SCHEDULED_SEGMENT_LIMIT+1]);
      if(members.rows.length>SCHEDULED_SEGMENT_LIMIT)console.error(`Marketing scheduled automation ${a.id}: segment ${a.trigger_config.segmentId} exceeds the ${SCHEDULED_SEGMENT_LIMIT}-member dispatch cap — extra members are skipped every run, not just this one.`);
      contactIds=members.rows.slice(0,SCHEDULED_SEGMENT_LIMIT).map(r=>r.marketing_contact_id);
    } else if(a.trigger_config?.contactId){
      contactIds=[a.trigger_config.contactId];
    } else { continue; }

    for(const contactId of contactIds){
      const c=await repository.pool.connect();
      try{
        await c.query("BEGIN");
        const id=await startExecution(c,a.id,contactId,`scheduled:${a.id}:${contactId}:${bucket.toISOString()}`,{scheduledAt:bucket.toISOString()});
        await c.query("COMMIT");
        if(id)ids.push(id);
      }catch(e){await c.query("ROLLBACK").catch(()=>{});throw e;}
      finally{c.release();}
    }

    const schedule=a.trigger_config?.schedule;
    if(schedule?.type==="once")await repository.pool.query("UPDATE marketing_automations SET status='paused',next_run_at=NULL,updated_at=NOW() WHERE id=$1",[a.id]);
    else{
      const minutes=Number(schedule?.intervalMinutes)>0?Number(schedule.intervalMinutes):DEFAULT_RECURRING_MINUTES;
      await repository.pool.query("UPDATE marketing_automations SET next_run_at=NOW()+($2::int*INTERVAL '1 minute'),updated_at=NOW() WHERE id=$1",[a.id,minutes]);
    }
  }
  return ids;
}
module.exports={dispatchEvent,dispatchScheduled,startExecution,execute,processNext,cancel,condition,cappedDelay,action};
