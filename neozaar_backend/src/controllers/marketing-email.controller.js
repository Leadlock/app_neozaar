const pool=require("../config/database"),email=require("../services/marketing/email.service"),consent=require("../services/marketing/consent.service");const pixel=Buffer.from("R0lGODlhAQABAAAAACw=","base64");const fail=(res,e,m)=>res.status(e.statusCode||500).json({status:'fail',message:e.statusCode?e.message:m});
const confirmPage=(title,message)=>`<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:40px;text-align:center;"><div style="background:#fff;max-width:480px;margin:0 auto;padding:30px;border-radius:10px;"><h2 style="color:#333;">${title}</h2><p style="color:#555;">${message}</p></div></body></html>`;
async function list(req,res){try{return res.json({status:'success',data:await email.listTemplates()});}catch(e){return fail(res,e,'Failed to fetch templates');}}
async function create(req,res){try{return res.json({status:'success',data:await email.saveTemplate(req.body,req.user.id)});}catch(e){return fail(res,e,'Failed to save template');}}
async function update(req,res){try{return res.json({status:'success',data:await email.saveTemplate(req.body,req.user.id,req.params.id)});}catch(e){return fail(res,e,'Failed to save template');}}
async function send(req,res){try{return res.status(202).json({status:'success',data:await email.queueSend(req.body)});}catch(e){return fail(res,e,'Failed to queue email');}}
async function testSend(req,res){try{return res.status(202).json({status:'success',data:await email.queueTest({...req.body,templateId:req.params.id})});}catch(e){return fail(res,e,'Failed to queue test email');}}
async function validateTemplate(req,res){try{return res.json({status:'success',data:email.validateTemplateContent(req.body)});}catch(e){return fail(res,e,'Failed to validate email');}}
async function versions(req,res){try{return res.json({status:'success',data:await email.listTemplateVersions(req.params.id)});}catch(e){return fail(res,e,'Failed to fetch version history');}}
async function analytics(req,res){try{return res.json({status:'success',data:await email.getAnalytics(req.query.templateId||null)});}catch(e){return fail(res,e,'Failed to fetch email analytics');}}
async function message(token){return(await pool.query("SELECT * FROM marketing_email_messages WHERE tracking_token=$1",[token])).rows[0];}
async function open(req,res){const m=await message(req.params.token);if(m)await email.recordDelivery(m,'OPENED',{}).catch(()=>{});res.type('gif').send(pixel);}
async function click(req,res){try{const url=new URL(req.query.url);if(!['http:','https:'].includes(url.protocol))throw new Error();const m=await message(req.params.token);if(m)await email.recordDelivery(m,'CLICKED',{url:url.toString()});return res.redirect(302,url.toString());}catch{return res.status(400).send('Invalid link');}}
// GET only shows a confirmation page — it must not have the side effect
// itself. Mail clients and security scanners routinely pre-fetch links in
// emails; if a GET unsubscribed people, those visits would silently
// unsubscribe contacts who never clicked anything.
async function unsubscribeConfirm(req,res){
  const m=await message(req.params.token);
  if(!m)return res.status(404).send(confirmPage('Link not found','This unsubscribe link is invalid or has already been used.'));
  return res.status(200).send(`<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:40px;text-align:center;"><div style="background:#fff;max-width:480px;margin:0 auto;padding:30px;border-radius:10px;"><h2 style="color:#333;">Unsubscribe from NeoZaar emails?</h2><p style="color:#555;">You can also manage individual topics instead of unsubscribing entirely.</p><form method="POST" action="/api/marketing/email/unsubscribe/${req.params.token}"><button type="submit" style="background:#111;color:#fff;border:none;padding:12px 24px;border-radius:6px;font-size:14px;cursor:pointer;">Yes, unsubscribe me</button></form></div></body></html>`);
}
// POST is the actual action — used by the confirmation form above, and by
// RFC 8058 one-click List-Unsubscribe-Post from compliant mail clients,
// which by design send this without any human confirmation step.
async function unsubscribe(req,res){const m=await message(req.params.token);if(!m)return res.status(404).json({status:'fail',message:'Link not found'});await pool.query("UPDATE marketing_contacts SET do_not_contact=TRUE,unsubscribed_at=NOW() WHERE id=$1",[m.marketing_contact_id]);await email.recordDelivery(m,'UNSUBSCRIBED',{});
  if(req.accepts(['json','html'])==='html')return res.status(200).send(confirmPage('Unsubscribed',"You won't receive any more marketing emails from NeoZaar."));
  return res.json({status:'success',message:'Unsubscribed'});}
async function providerEvent(req,res){const m=await message(req.params.token);if(!m)return res.status(404).json({status:'fail'});const metadata={...(req.body.metadata||{}),providerEventId:req.body.providerEventId||req.body.metadata?.providerEventId};const recorded=await email.recordDelivery(m,String(req.body.eventType).toUpperCase(),metadata);if(recorded&&m.marketing_contact_id&&['BOUNCED','COMPLAINT'].includes(String(req.body.eventType).toUpperCase()))await pool.query("UPDATE marketing_contacts SET do_not_contact=TRUE WHERE id=$1",[m.marketing_contact_id]);return res.json({status:'success',duplicate:!recorded});}
async function confirm(req,res){
  try {
    await consent.confirmEmail(req.params.token);
    return res.status(200).send(confirmPage('Subscription confirmed', "You're all set — you'll now receive emails from NeoZaar. You can change this anytime from the preferences link in any email."));
  } catch (e) {
    const status = e.statusCode || 500;
    const message = e.statusCode ? e.message : 'Something went wrong confirming your subscription.';
    return res.status(status).send(confirmPage(status === 410 ? 'Link expired' : 'Confirmation failed', message));
  }
}
const senderProfiles=require("../services/marketing/senderProfiles.service");
const subscriptionTypes=require("../services/marketing/subscriptionTypes.service");
const listSenders=async(req,res)=>{try{return res.json({status:'success',data:await senderProfiles.list()});}catch(e){return fail(res,e,'Failed to fetch sender profiles');}};
const createSender=async(req,res)=>{try{return res.json({status:'success',data:await senderProfiles.create(req.body)});}catch(e){return fail(res,e,'Failed to save sender profile');}};
const updateSender=async(req,res)=>{try{return res.json({status:'success',data:await senderProfiles.update(req.params.id,req.body)});}catch(e){return fail(res,e,'Failed to save sender profile');}};
const deleteSender=async(req,res)=>{try{return res.json({status:'success',data:await senderProfiles.remove(req.params.id)});}catch(e){return fail(res,e,'Failed to delete sender profile');}};
const listSubscriptionTypes=async(req,res)=>{try{return res.json({status:'success',data:await subscriptionTypes.list()});}catch(e){return fail(res,e,'Failed to fetch subscription types');}};
const createSubscriptionType=async(req,res)=>{try{return res.json({status:'success',data:await subscriptionTypes.create(req.body)});}catch(e){return fail(res,e,'Failed to save subscription type');}};
const updateSubscriptionType=async(req,res)=>{try{return res.json({status:'success',data:await subscriptionTypes.update(req.params.id,req.body)});}catch(e){return fail(res,e,'Failed to save subscription type');}};
const deleteSubscriptionType=async(req,res)=>{try{return res.json({status:'success',data:await subscriptionTypes.remove(req.params.id)});}catch(e){return fail(res,e,'Failed to delete subscription type');}};
module.exports={list,create,update,send,testSend,validateTemplate,versions,analytics,open,click,unsubscribe,unsubscribeConfirm,providerEvent,confirm,
  listSenders,createSender,updateSender,deleteSender,listSubscriptionTypes,createSubscriptionType,updateSubscriptionType,deleteSubscriptionType};
