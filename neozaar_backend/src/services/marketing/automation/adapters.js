const axios=require('axios');
const pool=require('../../../config/database');
const channels=require('../channels.service');
const WEBHOOK_TIMEOUT_MS=8000;
// email.service.js -> event-ingestion.service.js -> automation.service.js ->
// this file -> email.service.js is a real require cycle. A top-level
// `require('../email.service')` here landed whichever side loads second
// with a stale, incomplete exports object (confirmed live: email.service.js
// recording a successful send crashed with "ingestion.ingestEvent is not a
// function" because of this exact cycle). Requiring it lazily, inside the
// function that actually needs it, sidesteps the cycle entirely — by the
// time this runs, module loading has long finished and require() just
// returns the normal cached, fully-built export.
module.exports={
  async sendEmail({contactId,config}){const email=require('../email.service');return email.queueSend({templateId:config.templateId,contactIds:[contactId],senderProfileId:config.senderProfileId,sendType:'automation',subscriptionCode:config.subscriptionCode});},
  async sendWhatsApp({contactId,config}){return channels.sendWhatsApp({contactId,templateId:config.templateId,variables:config.variables});},
  async sendSms({contactId,config}){return channels.sendSms({contactId,templateId:config.templateId,provider:config.provider,variables:config.variables});},
  // No dedicated "campaign" entity exists in the marketing schema — by
  // decision, add_campaign/remove_campaign is just another way to reach
  // the same segment-membership mechanism add_segment/remove_segment
  // already use directly as automation.service.js node types.
  async campaign({contactId,config,actionType}){
    if(!config?.segmentId)throw new Error('Campaign action requires config.segmentId');
    if(actionType==='remove_campaign'){
      await pool.query("DELETE FROM marketing_segment_members WHERE segment_id=$1 AND marketing_contact_id=$2",[config.segmentId,contactId]);
      return{status:'COMPLETED',action:'removed',segmentId:config.segmentId};
    }
    await pool.query(`INSERT INTO marketing_segment_members(segment_id,marketing_contact_id,membership_reason) VALUES($1,$2,$3) ON CONFLICT DO NOTHING`,[config.segmentId,contactId,JSON.stringify({source:'automation_campaign_action'})]);
    return{status:'COMPLETED',action:'added',segmentId:config.segmentId};
  },
  async crmActivity(args){return channels.requestCrmHandoff({contactId:args.contactId,type:'activity',payload:args.config,idempotencyKey:`${args.executionId}:activity`});},
  async crmTask(args){return channels.requestCrmHandoff({contactId:args.contactId,type:'task',payload:args.config,idempotencyKey:`${args.executionId}:task`});},
  async crmHandoff(args){return channels.requestCrmHandoff({contactId:args.contactId,type:args.config.type||'lead_handoff',payload:args.config,idempotencyKey:`${args.executionId}:handoff`});},
  // Notifies internal staff (crm_notifications, keyed to a platform users.id)
  // — NOT the marketing contact themselves; that's what send_email/
  // send_whatsapp/send_sms are for. Defaults to the contact's CRM owner
  // when config.userId isn't given explicitly.
  async notification({contactId,config}){
    let userId=config.userId||null;
    if(!userId){
      const owner=(await pool.query(`SELECT cc.owner_id FROM marketing_contacts mc JOIN crm_contacts cc ON cc.id=mc.crm_contact_id WHERE mc.id=$1`,[contactId])).rows[0];
      userId=owner?.owner_id||null;
    }
    if(!userId)return{status:'SKIPPED',reason:'no_target_user'};
    const {createNotification}=require('../../../controllers/crm/lifecycle.engine');
    await createNotification(userId,config.type||'marketing_automation',config.title||'Marketing automation',config.message||'',config.entityType||'marketing_contact',config.entityId||contactId);
    return{status:'COMPLETED',userId};
  },
  // Calls an admin-configured URL with contact + trigger context. Failures
  // throw (rather than being swallowed) so the existing automation
  // execution retry/backoff mechanism in automation.service.js applies —
  // same as any other action node failing.
  async webhook({contactId,config,executionId}){
    if(!config?.url||!/^https?:\/\//i.test(config.url))throw new Error('Webhook action requires a valid http(s) config.url');
    const contact=(await pool.query(`SELECT mc.id,mc.email,mc.phone,mc.lifecycle_stage,mc.marketing_score FROM marketing_contacts mc WHERE mc.id=$1`,[contactId])).rows[0];
    const payload={contact,executionId,firedAt:new Date().toISOString(),...(config.payload||{})};
    const response=await axios.request({
      url:config.url,method:(config.method||'POST').toUpperCase(),
      headers:{'Content-Type':'application/json',...(config.headers||{})},
      data:payload,timeout:WEBHOOK_TIMEOUT_MS,validateStatus:(status)=>status>=200&&status<300,
    });
    return{status:'COMPLETED',httpStatus:response.status};
  }
};
