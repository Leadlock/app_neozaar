const pool = require('../../config/database');
const identity = require('./identity.service');
const ingestion = require('./event-ingestion.service');
const consent = require('./consent.service');
function clean(value) { return typeof value === 'string' ? value.trim().replace(/[<>]/g, '') : value; }
async function list() { return (await pool.query(`SELECT f.*,v.field_schema,v.hidden_fields,v.consent_config,v.success_message,v.redirect_url,v.campaign_id FROM marketing_forms f LEFT JOIN marketing_form_versions v ON v.form_id=f.id AND v.version=f.current_version ORDER BY f.updated_at DESC`)).rows; }
async function save(input,userId,id){const client=await pool.connect();try{await client.query('BEGIN');let form;if(id)form=(await client.query(`UPDATE marketing_forms SET name=$1,slug=$2,form_type=$3,status=$4,current_version=current_version+1,updated_at=NOW() WHERE id=$5 RETURNING *`,[input.name,input.slug,input.formType,input.status||'draft',id])).rows[0];else form=(await client.query(`INSERT INTO marketing_forms(name,slug,form_type,status,created_by) VALUES($1,$2,$3,$4,$5) RETURNING *`,[input.name,input.slug,input.formType,input.status||'draft',userId])).rows[0];if(!form)throw Object.assign(new Error('Form not found'),{statusCode:404});const version=(await client.query(`INSERT INTO marketing_form_versions(form_id,version,field_schema,hidden_fields,consent_config,success_message,redirect_url,campaign_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,[form.id,form.current_version,JSON.stringify(input.fields||[]),JSON.stringify(input.hiddenFields||{}),JSON.stringify(input.consent||{}),input.successMessage||null,input.redirectUrl||null,input.campaignId||null])).rows[0];await client.query('COMMIT');return{...form,version};}catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}finally{client.release();}}
async function getPublished(slug){const{rows}=await pool.query(`SELECT f.*,v.field_schema,v.hidden_fields,v.consent_config,v.success_message,v.redirect_url,v.campaign_id,v.id version_id FROM marketing_forms f JOIN marketing_form_versions v ON v.form_id=f.id AND v.version=f.current_version WHERE f.slug=$1 AND f.status='published'`,[slug]);if(!rows[0])throw Object.assign(new Error('Form not found'),{statusCode:404});return rows[0];}
async function submit(slug,input){if(input._website)throw Object.assign(new Error('Submission rejected'),{statusCode:400});const form=await getPublished(slug);if(form.consent_config?.required&&!input.consent?.accepted)throw Object.assign(new Error('Consent is required'),{statusCode:400});const data={};for(const field of form.field_schema){const value=clean(input.data?.[field.name]);if(field.required&&(value===undefined||value===''))throw Object.assign(new Error(`${field.label||field.name} is required`),{statusCode:400});if(field.type==='email'&&value&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))throw Object.assign(new Error('Invalid email'),{statusCode:400});data[field.name]=value;}const resolvedEmail=data.email||data.business_email;const resolved=await identity.resolveIdentity({anonymousId:input.visitorId,email:resolvedEmail,phone:data.phone});const submission=(await pool.query(`INSERT INTO marketing_form_submissions(form_version_id,marketing_contact_id,visitor_id,session_id,data,utm,consent) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id`,[form.version_id,resolved.marketingContactId,input.visitorId||null,input.sessionId||null,JSON.stringify({...data,...form.hidden_fields}),JSON.stringify(input.utm||{}),JSON.stringify(input.consent||{})])).rows[0];
  // A checked consent checkbox is itself the explicit, unambiguous opt-in
  // act — it does not need re-confirming. "doubleOptIn" (email only) is an
  // extra deliverability/anti-abuse step some forms may opt into: it holds
  // off granting consent until the address is confirmed via emailed link.
  if (input.consent?.accepted) {
    const requestedChannels = (form.consent_config?.channels?.length ? form.consent_config.channels : ['email'])
      .filter((channel) => (channel === 'email' ? Boolean(resolvedEmail) : Boolean(data.phone)));
    const source = { formId: form.id, submissionId: submission.id, formVersionId: form.version_id };
    for (const channel of requestedChannels) {
      if (channel === 'email' && form.consent_config?.doubleOptIn) {
        await consent.requestEmailConfirmation(resolved.marketingContactId, 'form', source).catch((error) => {
          if (error.statusCode === 502) { console.error('Marketing double opt-in email failed to send:', error.message); return; }
          throw error;
        });
      } else {
        await consent.grantConsent(resolved.marketingContactId, channel, 'form', source);
      }
    }
    // Auto-subscribe to the topics this form declares (e.g. a newsletter
    // signup form subscribing to 'newsletters'). Writing the subscription
    // row is safe even under double opt-in — queueSend already requires
    // email_consent to be true separately, so nothing sends until the
    // address is actually confirmed.
    if (form.consent_config?.subscriptionCodes?.length) {
      const types = (await pool.query(`SELECT id, code FROM marketing_subscription_types WHERE code = ANY($1)`, [form.consent_config.subscriptionCodes])).rows;
      for (const type of types) {
        await pool.query(
          `INSERT INTO marketing_subscriptions (marketing_contact_id, subscription_type_id, status, updated_at)
           VALUES ($1,$2,'subscribed',NOW())
           ON CONFLICT (marketing_contact_id, subscription_type_id) DO UPDATE SET status='subscribed', updated_at=NOW()`,
          [resolved.marketingContactId, type.id],
        );
      }
    }
  }
  await ingestion.ingestEvent({marketingContactId:resolved.marketingContactId,anonymousId:input.visitorId,eventType:'FORM_SUBMIT',refType:'form',refId:form.id,channel:'web',metadata:{submissionId:submission.id,campaignId:form.campaign_id},utmSource:input.utm?.source,utmCampaign:input.utm?.campaign,ingestionSource:'form'});return{successMessage:form.success_message,redirectUrl:form.redirect_url};}
module.exports={clean,list,save,getPublished,submit};
