const test=require('node:test');
const assert=require('node:assert/strict');
const Module=require('node:module');

const calls=[];
const db={query:async(sql,params=[])=>{calls.push({sql,params});if(sql.includes('INSERT INTO marketing_channel_templates'))return{rows:[{id:1,channel:params[0],name:params[1]}]};if(sql.includes('marketing_channel_policies'))return{rows:[{channel:params[0],daily_limit:params[1]}]};return{rows:[]};}};
const original=Module._load;
Module._load=function(request,parent,isMain){if(request.endsWith('config/database'))return db;return original(request,parent,isMain);};
const channels=require('../src/services/marketing/channels.service');
const journeys=require('../src/services/marketing/journey-attribution.service');
Module._load=original;

test('multichannel templates reject unsupported channels',async()=>{
  await assert.rejects(()=>channels.saveTemplate({channel:'push',name:'X',content:'Hello'},1),/Channel must be/);
});

test('multichannel templates require message content',async()=>{
  await assert.rejects(()=>channels.saveTemplate({channel:'sms',name:'X',content:''},1),/content is required/);
});

test('channel policy rejects unsafe daily limits',async()=>{
  await assert.rejects(()=>channels.savePolicy('sms',{dailyLimit:101}),/0 to 100/);
});

test('valid channel policy is persisted with structured settings',async()=>{
  const row=await channels.savePolicy('whatsapp',{dailyLimit:3,quietStart:'21:00',quietEnd:'08:00',timezone:'Asia/Kolkata'});
  assert.equal(row.daily_limit,3);
  assert.equal(calls.at(-1).params[4],'Asia/Kolkata');
});

test('attribution models allocate complete credit',()=>{
  for(const model of ['first_touch','last_touch','linear','position_based']){
    const credits=journeys.attributionCredits(4,model);
    assert.ok(Math.abs(credits.reduce((a,b)=>a+b,0)-1)<0.00001,model);
  }
});

test('migration 060 contains queue timezone repair and operational indexes',()=>{
  const fs=require('fs'),path=require('path');
  const sql=fs.readFileSync(path.join(__dirname,'../src/migrations/060_marketing_channels_experiments_operations.sql'),'utf8');
  assert.match(sql,/available_at TYPE TIMESTAMPTZ/);
  assert.match(sql,/idx_mkt_outbound_audit_channel_created/);
  assert.match(sql,/idx_mkt_experiment_events_experiment_time/);
});
