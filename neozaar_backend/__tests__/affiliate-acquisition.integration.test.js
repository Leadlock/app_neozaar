// Real PostgreSQL SQL on connection-local temporary tables. No application rows
// or sequences are changed; email delivery and unrelated external services are stubbed.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const pool = require('../src/config/database');

test('both affiliate acquisition flows through existing CRM verification', async t => {
  const client = await pool.connect();
  const db = { query: (...a) => client.query(...a), connect: async () => ({ query: (...a) => client.query(...a), release() {} }) };
  const cache = new Map();
  const emails = [];
  let mailAccepted = true;
  function load(relative) {
    const file = path.resolve(__dirname, '..', relative);
    if (cache.has(file)) return cache.get(file);
    const module = { exports: {} };
    const originalRequire = createRequire(file);
    vm.runInNewContext(fs.readFileSync(file, 'utf8'), {
      module, exports: module.exports, Buffer, URLSearchParams, setTimeout,
      process: { env: { FRONTEND_URL: 'http://localhost:3000/', BACKEND_URL: 'http://localhost:5000/api/', JWT_SECRET: 'test-only' } },
      console: { log() {}, warn() {}, error() {} },
      require(name) {
        if (name.endsWith('/config/database')) return db;
        if (name.endsWith('/utils/sendEmailAzure')) return async (...args) => { emails.push(args); return mailAccepted; };
        if (name.endsWith('/config/common.constant')) return { VARIABLE: { SUCCESS: 'success' } };
        if (name === './audit.helper') return { auditLog: async () => {} };
        if (name.includes('affiliate.') || name === './lifecycle.engine') return load(path.relative(path.resolve(__dirname, '..'), originalRequire.resolve(name)));
        if (file.endsWith('user.services.js')) return {};
        return originalRequire(name);
      },
    }, { filename: file });
    cache.set(file, module.exports);
    return module.exports;
  }
  function response() { return { code: 200, status(n) { this.code=n; return this; }, json(b) { this.body=b; return this; }, set() { return this; }, type() { return this; }, send(b) { this.body=b; return this; } }; }
  async function invoke(handler, { body={}, query={}, params={}, id=1, role='AGENT', scope=id }={}) {
    const res=response();
    await handler({body,query,params,user:{id,role_type:role},affiliateScopeId:scope,ip:'127.0.0.1',get:()=>''},res);
    return res;
  }
  try {
    await client.query(`CREATE TEMP TABLE users (id integer PRIMARY KEY,name text,email text,mobile text,role_type text,ref_code text,is_active boolean DEFAULT TRUE,is_email_verified boolean DEFAULT FALSE,verification_token text,updated_at timestamp);
      CREATE TEMP TABLE company_detail (action_id integer,action_type text,company_name text);
      CREATE TEMP TABLE products (id integer PRIMARY KEY,name text,action_type text,slug text,category text[],is_publish boolean DEFAULT TRUE,deleted_at timestamp);
      CREATE TEMP TABLE categories (id integer PRIMARY KEY,name text);
      CREATE TEMP TABLE seller_assignments (seller_id integer,item_type text,item_id integer,allowed_types text[]);
      INSERT INTO users(id,name,email,role_type,ref_code) VALUES (1,'Affiliate A','a@example.test','AGENT','affiliate-a'),(2,'Affiliate B','b@example.test','AGENT','affiliate-b'),(10,'Manager','manager@example.test','A_MANAGER','manager');
      INSERT INTO products VALUES (1,'Product','product','test-product',ARRAY['Cloud'],TRUE,NULL),(2,'Service','service','test-service',ARRAY['Cloud'],TRUE,NULL),(3,'Unassigned','solution','unassigned',ARRAY['Other'],TRUE,NULL);
      INSERT INTO categories VALUES (1,'Cloud');
      INSERT INTO seller_assignments VALUES (1,'category',1,ARRAY['product','service']);`);
    const tables=['crm_leads','crm_contacts','crm_accounts','crm_opportunities','crm_lead_score_history','crm_audit_logs','crm_opportunity_stage_history','crm_opportunity_products','crm_stage_aging_thresholds','crm_notifications','crm_activities','crm_sales_orders',
      'affiliate_assignments','affiliate_links','affiliate_link_clicks','affiliate_tokens','affiliate_attributions','affiliate_contacts','affiliate_campaigns','affiliate_campaign_sends','affiliate_audit_log','affiliate_attribution_config'];
    for (const table of tables) {
      const exists=await client.query('SELECT to_regclass($1) AS name',['public.'+table]);
      if(!exists.rows[0].name) continue;
      await client.query(`CREATE TEMP TABLE ${table} (LIKE public.${table} INCLUDING DEFAULTS INCLUDING GENERATED INCLUDING CONSTRAINTS)`);
      const cols=await client.query(`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 AND column_name='id'`,[table]);
      if(cols.rows.length) {
        await client.query(`CREATE TEMP SEQUENCE test_${table}_seq; ALTER TABLE ${table} ALTER COLUMN id SET DEFAULT nextval('test_${table}_seq'); ALTER TABLE ${table} ADD PRIMARY KEY(id)`);
      }
    }
    await client.query(`ALTER TABLE affiliate_tokens ADD PRIMARY KEY(token);
      ALTER TABLE affiliate_campaign_sends ADD UNIQUE(campaign_id,contact_id);
      CREATE UNIQUE INDEX test_crm_email ON crm_leads(email_normalized) WHERE is_deleted=FALSE AND email_normalized IS NOT NULL AND email_normalized<>'';
      INSERT INTO affiliate_attribution_config(rule,token_ttl_days,allow_reassign) VALUES ('first_wins',7,FALSE);`);
    const mgmt=load('src/controllers/affiliate/affiliate.management.controller.js');
    const campaign=load('src/controllers/affiliate/affiliate.campaigns.controller.js');
    const contacts=load('src/controllers/affiliate/affiliate.database.controller.js');
    const reg=load('src/services/affiliate/affiliate.registration.service.js');
    const attribution=load('src/services/affiliate/affiliate.attribution.service.js');
    const userService=load('src/services/user.services.js');
    const reporting=load('src/controllers/affiliate/affiliate.customers.controller.js');
    const dashboard=load('src/controllers/affiliate/affiliate.reporting.controller.js');
    const router=load('src/routes/affiliate/affiliate.public.routes.js');
    const route=p=>router.stack.find(l=>l.route?.path===p).route.stack.at(-1).handle;
    async function user(id,email) {
      await client.query(`INSERT INTO users(id,name,email,role_type,is_active,verification_token) VALUES ($1,'Customer',$2,'CLIENT',FALSE,'verify')`,[id,email]);
      return {id,email};
    }
    async function verify(u) { return userService.verifyEmailAndCompleteRegistration(u.email,'verify'); }
    let link, customer, leadId, campaignId, sendToken;
    await t.test('assigned category items generate links; unassigned items are rejected',async()=>{
      for(const catalog_id of [1,2]) {
        const r=await invoke(mgmt.createLink,{params:{id:1},body:{catalog_id,destination_path:'https://attacker.example'}});
        assert.equal(r.code,201,r.body.message); assert.match(r.body.data.destination_path,/^\/(product|service)\/\d+$/);
        link=r.body.data;
      }
      assert.equal((await invoke(mgmt.createLink,{params:{id:1},body:{catalog_id:3}})).code,403);
    });
    await t.test('anonymous click creates no customer; signup persists pending attribution; verification uses existing scoring',async()=>{
      const click=await invoke(route('/track/:slug'),{params:{slug:link.slug}});
      assert.equal(click.code,200,click.body.message);
      assert.equal((await client.query('SELECT COUNT(*)::int AS n FROM crm_leads')).rows[0].n,0);
      customer=await user(100,'customer@example.test');
      assert.equal((await reg.captureRegistration(customer,click.body.data.aff_token)).action,'pending');
      assert.equal((await client.query('SELECT COUNT(*)::int AS n FROM crm_leads')).rows[0].n,0);
      const pending=await invoke(reporting.getAffiliateRegistrations);
      assert.equal(pending.code,200,pending.body.message);
      assert.equal(pending.body.total,1);
      assert.equal(pending.body.data[0].user_id,customer.id);
      assert.equal(pending.body.data[0].catalog_name,'Service');
      assert.equal(pending.body.data[0].registration_status,'Awaiting verification');
      assert.equal((await invoke(reporting.getAffiliateRegistrations,{id:2,query:{affiliate_id:1}})).body.total,0);
      assert.equal((await invoke(reporting.getAffiliateRegistrations,{id:10,role:'A_MANAGER',scope:null})).body.total,1);
      assert.equal((await invoke(reporting.getAffiliateRegistrations,{query:{search:'unmatched'}})).body.total,0);
      const before=await invoke(dashboard.getAffiliateDashboard);
      assert.equal(before.code,200,before.body.message);
      assert.equal(before.body.data.customers.pending_verification,1);
      assert.equal(before.body.data.customers.total,0);
      assert.equal(before.body.data.links.total_clicks,1);
      assert.equal(before.body.data.links.clicks_7_days,1);
      assert.equal(before.body.data.links.unique_visitors,1);
      assert.equal(before.body.data.links.registrations,1);
      assert.equal(before.body.data.links.verified_customers,0);
      assert.equal(before.body.data.links.click_to_registration_rate,100);
      assert.equal(before.body.data.links.active,2);
      await verify(customer);
      assert.equal((await invoke(reporting.getAffiliateRegistrations)).body.total,0);
      const visible=await invoke(reporting.getAffiliateCustomers);
      assert.equal(visible.code,200,visible.body.message);
      assert.equal(visible.body.total,1);
      assert.equal(visible.body.data[0].email,customer.email);
      assert.equal(visible.body.data[0].score,1);
      const after=await invoke(dashboard.getAffiliateDashboard);
      assert.equal(after.body.data.customers.pending_verification,0);
      assert.equal(after.body.data.customers.total,1);
      assert.equal(after.body.data.links.verified_customers,1);
      const lead=(await client.query('SELECT * FROM crm_leads WHERE email=$1',[customer.email])).rows[0];
      leadId=lead.id; assert.equal(lead.affiliate_id,1); assert.equal(lead.score,1);
      const attr=(await client.query("SELECT * FROM affiliate_attributions WHERE user_id=100 AND status='active'")).rows[0];
      assert.equal(attr.affiliate_link_id,link.id); assert.equal(attr.metadata.catalog_id,2);
      assert.equal((await attribution.resolveAffiliateFromToken(click.body.data.aff_token)),null);
      assert.equal((await reg.completeRegistration(customer,leadId)).action,'unchanged');
    });
    await t.test('normal verification remains unattributed and scores once',async()=>{
      const u=await user(101,'normal@example.test'); await verify(u);
      const lead=(await client.query('SELECT affiliate_id,score FROM crm_leads WHERE email=$1',[u.email])).rows[0];
      assert.equal(lead.affiliate_id,null); assert.equal(lead.score,1);
    });
    await t.test('contact import creates prospects only; campaign sends trackable email and records actual acceptance',async()=>{
      const before=(await client.query('SELECT COUNT(*)::int AS n FROM crm_leads')).rows[0].n;
      const r=await invoke(contacts.importContacts,{body:{contacts:[{name:'Campaign customer',email:'campaign@example.test',phone:'0012345'}]}});
      assert.equal(r.body.data.imported,1,JSON.stringify(r.body));
      assert.equal((await client.query('SELECT COUNT(*)::int AS n FROM crm_leads')).rows[0].n,before);
      const created=await invoke(campaign.createCampaign,{body:{name:'Test campaign',subject:'Test',body_html:'Hello [name]'}});
      assert.equal(created.code,201,created.body.message); campaignId=created.body.data.id;
      const sent=await invoke(campaign.sendCampaign,{params:{id:campaignId}});
      assert.equal(sent.body.data.sent_count,1,JSON.stringify(sent.body));
      assert.equal(emails.length,1); assert.match(emails[0][2],/Hello Campaign customer/);
      assert.match(emails[0][2],/localhost:3000\/go\/affiliate-track\?campaign=/);
      sendToken=(await client.query('SELECT token_id FROM affiliate_campaign_sends WHERE campaign_id=$1',[campaignId])).rows[0].token_id;
      assert.equal((await invoke(campaign.sendCampaign,{params:{id:campaignId}})).code,409);
    });
    await t.test('campaign click and verified registration update recipient and campaign counts without duplicating scores',async()=>{
      const clicked=await invoke(route('/track-click'),{query:{token:sendToken,url:'https://attacker.example'}});
      assert.equal(clicked.body.data.redirect_url,'/auth/register');
      const u=await user(102,'campaign@example.test');
      await reg.captureRegistration(u,clicked.body.data.aff_token); await verify(u);
      const sent=(await client.query('SELECT * FROM affiliate_campaign_sends WHERE campaign_id=$1',[campaignId])).rows[0];
      assert.equal(sent.clicked,true); assert.equal(sent.registered,true);
      const camp=(await client.query('SELECT clicked_count,registered_count FROM affiliate_campaigns WHERE id=$1',[campaignId])).rows[0];
      assert.equal(camp.clicked_count,1); assert.equal(camp.registered_count,1);
      const lead=(await client.query('SELECT affiliate_id,score FROM crm_leads WHERE email=$1',[u.email])).rows[0];
      assert.equal(lead.affiliate_id,1); assert.equal(lead.score,1);
    });
    await t.test('existing CRM customer remains intact, conflicts are visible, explicit reassignment requires a reason',async()=>{
      await client.query("INSERT INTO crm_leads(name,email,company,affiliate_id,score) VALUES ('Existing CRM','existing@example.test','Original Company',1,82)");
      const u=await user(103,'existing@example.test');
      const token=await attribution.createAttributionToken({affiliateId:2});
      await reg.captureRegistration(u,token); await verify(u);
      const lead=(await client.query('SELECT * FROM crm_leads WHERE email=$1',[u.email])).rows[0];
      assert.equal(lead.name,'Existing CRM'); assert.equal(lead.company,'Original Company'); assert.equal(lead.affiliate_id,1);
      assert.equal((await client.query("SELECT status FROM affiliate_attributions WHERE user_id=103")).rows[0].status,'conflict');
      await assert.rejects(reg.reassignCustomer({leadId:lead.id,affiliateId:2,previousAffiliateId:1,actorId:10,reason:''}));
      await reg.reassignCustomer({leadId:lead.id,affiliateId:2,previousAffiliateId:1,actorId:10,reason:'Manager approved correction'});
      assert.equal((await client.query('SELECT affiliate_id FROM crm_leads WHERE id=$1',[lead.id])).rows[0].affiliate_id,2);
      assert.equal((await client.query("SELECT COUNT(*)::int AS n FROM affiliate_audit_log WHERE action='customer_reassigned'")).rows[0].n,1);
    });
    await t.test('manual and marketplace opportunities inherit persisted attribution; stage updates retain it',async()=>{
      const opportunities=load('src/controllers/crm/opportunities.controller.js');
      const lifecycle=load('src/controllers/crm/lifecycle.engine.js');
      const created=await invoke(opportunities.createOpportunity,{id:10,role:'M_SELLER',body:{name:'Manual test',lead_id:leadId,affiliate_id:2}});
      assert.equal(created.code,201,created.body.message);
      assert.equal(created.body.data.affiliate_id,1);
      const updated=await invoke(opportunities.updateOpportunity,{id:10,role:'M_SELLER',params:{id:created.body.data.id},body:{notes:'Follow-up remains attached'}});
      assert.equal(updated.code,200,updated.body.message);
      assert.equal(updated.body.data.affiliate_id,1);
      const rejected=await invoke(opportunities.updateOpportunity,{id:10,role:'M_SELLER',params:{id:created.body.data.id},body:{affiliate_id:2}});
      assert.equal(rejected.code,409);
      const lead=(await client.query('SELECT * FROM crm_leads WHERE id=$1',[leadId])).rows[0];
      const id=await lifecycle.createProductOpportunity({leadId,ownerId:10,affiliateId:2,productName:'Tracked Product',productId:1,leadSource:'Demo Request',conversionSource:'direct_cta',lead});
      const opp=(await client.query('SELECT * FROM crm_opportunities WHERE id=$1',[id])).rows[0];
      assert.equal(opp.affiliate_id,1);
      await lifecycle.changeOpportunityStage(id,'Qualification',10,'Test progression',true);
      assert.equal((await client.query('SELECT affiliate_id FROM crm_opportunities WHERE id=$1',[id])).rows[0].affiliate_id,1);
      await lifecycle.updateCustomerScore(leadId,'catalog_engagement',2,customer.id,false);
      const progress=await invoke(reporting.getAffiliateOpportunities);
      assert.equal(progress.body.data.find(row=>row.id===id).stage,'Qualification');
      assert.equal(progress.body.data.find(row=>row.id===id).customer_score,3);
      const customerProgress=await invoke(reporting.getAffiliateCustomers);
      assert.equal(customerProgress.body.data.find(row=>row.id===leadId).latest_activity,'catalog_engagement');
    });
    await t.test('middleware ignores affiliate ID tampering and blocks legacy unscoped CRM access',async()=>{
      const middleware=load('src/middlewares/affiliate.middleware.js');
      const guard=load('src/middlewares/affiliate-crm.middleware.js');
      const req={user:{id:2,role_type:'AGENT'},query:{affiliate_id:1},params:{}};
      await middleware.resolveAffiliateScope(req,response(),()=>{});
      assert.equal(req.affiliateScopeId,2);
      const res=response(); let passed=false;
      middleware.assertOwnAffiliate({...req,params:{id:1}},res,()=>{passed=true;});
      assert.equal(res.code,403); assert.equal(passed,false);
      for(const [method,url] of [['GET','/scoring/history/'+leadId],['POST','/scoring/event'],['GET','/invoices']]) {
        const denied=response(); await guard({...req,method,path:url},denied,()=>assert.fail('Cross-affiliate access passed'));
        assert.equal(denied.code,403);
      }
      let ownPassed=false;
      await guard({user:{id:1,role_type:'AGENT'},method:'GET',path:'/scoring/history/'+leadId},response(),()=>{ownPassed=true;});
      assert.equal(ownPassed,true);
    });
    await t.test('affiliate isolation applies to customers, scores, campaigns, database, and opportunities',async()=>{
      for(const method of ['getAffiliateCustomers','getAffiliateCustomerScores','getAffiliateOpportunities']) {
        const r=await invoke(reporting[method],{id:2,scope:2,query:{affiliate_id:1}});
        assert.equal(r.code,200,r.body.message);
        assert.ok(r.body.data.every(row=>row.email === 'existing@example.test'), method);
      }
      assert.equal((await invoke(campaign.getCampaignById,{params:{id:campaignId},id:2})).code,404);
      assert.equal((await invoke(campaign.sendCampaign,{params:{id:campaignId},id:2})).code,404);
      const database=await invoke(contacts.getContacts,{id:2}); assert.equal(database.code,200,JSON.stringify(database.body)); assert.equal(database.body.data.length,0);
      assert.ok((await invoke(reporting.getAffiliateCustomers,{id:10,role:'A_MANAGER',scope:null})).body.data.length>=3);
    });
    await t.test('legacy anonymous attribution, expired tokens, and inactive affiliates cannot claim customers',async()=>{
      assert.equal((await invoke(route('/register-attribution'),{body:{email:customer.email,user_id:customer.id,utm_source:'affiliate-b'}})).code,410);
      const token=await attribution.createAttributionToken({affiliateId:2});
      await client.query("UPDATE affiliate_tokens SET expires_at=NOW()-INTERVAL '1 second' WHERE token=$1",[token]);
      assert.equal(await attribution.resolveAffiliateFromToken(token),null);
      await client.query('UPDATE users SET is_active=FALSE WHERE id=2');
      const inactive=await attribution.createAttributionToken({affiliateId:2});
      assert.equal(await attribution.resolveAffiliateFromToken(inactive),null);
    });
    await t.test('provider failure is reported and never counted as sent',async()=>{
      mailAccepted=false;
      const created=await invoke(campaign.createCampaign,{body:{name:'Failure test',subject:'Test'}});
      const r=await invoke(campaign.sendCampaign,{params:{id:created.body.data.id}});
      assert.equal(r.body.data.sent_count,0); assert.equal(r.body.data.failed_count,1);
      assert.equal((await client.query('SELECT status FROM affiliate_campaigns WHERE id=$1',[created.body.data.id])).rows[0].status,'failed');
    });
  } finally { client.release(true); await pool.end(); }
});
