const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { NextResponse } = require('next/server');

function handler(fetch) {
  const source=fs.readFileSync(path.join(__dirname,'../app/go/affiliate-track/route.js'),'utf8')
    .replace("import { NextResponse } from 'next/server';",'')
    .replace('export async function GET','async function GET');
  const context={NextResponse,fetch,URL,console,process:{env:{NEXT_PUBLIC_API_BASE:'http://backend.test/api/'}},exports:{}};
  vm.runInNewContext(source+'\nexports.GET=GET;',context);
  return context.exports.GET;
}
const req=(query,token)=>({url:'https://marketplace.test/go/affiliate-track?'+query,cookies:{get:()=>token ? {value:token} : undefined}});
const reply=data=>({ok:true,json:async()=>data});

test('catalog tracking stores first-party token and removes it from landing URL',async()=>{
  const get=handler(async url=>{assert.match(url,/affiliate\/track\/product-link$/);return reply({data:{aff_token:'opaque-first',redirect_url:'/product/test?aff_token=opaque-first&utm_source=first'}});});
  const res=await get(req('slug=product-link'));
  assert.equal(res.cookies.get('aff_token').value,'opaque-first');
  assert.equal(res.headers.get('location'),'/product/test?utm_source=first');
  assert.match(res.headers.get('set-cookie'),/Secure/); assert.match(res.headers.get('set-cookie'),/SameSite=lax/i);
});
test('campaign tracking uses the same durable cookie through browsing and registration',async()=>{
  const get=handler(async url=>{assert.match(url,/track-click\?token=opaque-send$/);return reply({data:{aff_token:'campaign-visitor',redirect_url:'/auth/register'}});});
  const res=await get(req('campaign=opaque-send'));
  assert.equal(res.cookies.get('aff_token').value,'campaign-visitor');
  assert.equal(res.headers.get('location'),'/auth/register');
  assert.equal(res.cookies.get('aff_token').path,'/');
});
test('a later affiliate never replaces a still-valid first affiliate',async()=>{
  const get=handler(async url=>url.includes('token-status') ? reply({valid:true}) : reply({data:{aff_token:'second',redirect_url:'/service/test'}}));
  const res=await get(req('slug=second','first'));
  assert.equal(res.cookies.get('aff_token'),undefined);
  assert.equal(res.cookies.get('stored_utm_params'),undefined);
});
test('expired or consumed first token can be replaced',async()=>{
  const get=handler(async url=>url.includes('token-status') ? reply({valid:false}) : reply({data:{aff_token:'fresh',redirect_url:'/'}}));
  const res=await get(req('slug=fresh','expired'));
  assert.equal(res.cookies.get('aff_token').value,'fresh');
});
test('tracking cannot redirect to another origin',async()=>{
  const get=handler(async()=>reply({data:{aff_token:'secret',redirect_url:'https://external.test/'}}));
  const res=await get(req('slug=bad'));
  assert.equal(res.status,502); assert.equal(res.headers.get('location'),null); assert.equal(res.cookies.get('aff_token'),undefined);
});

test('backend authentication and availability failures do not silently redirect home',async()=>{
  for(const status of [401,403,500]) {
    const get=handler(async()=>({ok:false,status}));
    const res=await get(req('slug=valid-link'));
    assert.equal(res.status,502);
    assert.equal(res.headers.get('location'),null);
    assert.match(await res.text(),/retry/i);
  }
});
test('missing links show an unavailable message',async()=>{
  const res=await handler(async()=>({ok:false,status:404}))(req('slug=missing'));
  assert.equal(res.status,404);
  assert.equal(res.headers.get('cache-control'),'no-store');
});

test('all catalog page types track views, meaningful scrolls, and one brochure event', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const root = path.resolve(__dirname, '..');
  const hook = fs.readFileSync(path.join(root, 'app/lib/useCatalogEngagement.js'), 'utf8');
  assert.match(hook, /eventType:\s*["']PRODUCT_VIEW["']/);
  assert.match(hook, /eventType:\s*["']CATALOG_SCROLL["']/);
  assert.match(hook, /window\.scrollY\s*\/\s*available\s*<\s*0\.5/);
  for (const [file, type] of [
    ['app/product/CustomSlider.js', 'product'],
    ['app/service/CustomSliderservice.js', 'service'],
    ['app/solution/CustomSlidersolution.js', 'solution'],
  ]) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    assert.match(source, new RegExp(`useCatalogEngagement\\(productDetails\\?\\.product\\?\\.id, ["']${type}["']\\)`));
    assert.match(source, /eventType:\s*["']BROCHURE_DOWNLOAD["']/);
    assert.doesNotMatch(source, /fireCrm(?:Scoring)?Event\(["']brochure_download["']\)/);
  }
});

test('signed-in catalog tracking persists analytics consent and posts to /api/track', async () => {
  const calls = [];
  const axios = { post: async (...args) => { calls.push(args); return { data: { success: true } }; } };
  const source = fs.readFileSync(path.join(__dirname, '../app/lib/track.js'), 'utf8')
    .replace('import axios from "axios";', '')
    .replace('export const trackEvent', 'const trackEvent');
  const storage = new Map([
    ['token', 'customer-jwt'],
    ['cookie-consent', JSON.stringify({ analytics: true })],
  ]);
  const context = {
    axios,
    window: {},
    localStorage: { getItem: key => storage.get(key) || null },
    process: { env: { NEXT_PUBLIC_ANALYTICS_URL: 'http://localhost:5000/api' } },
    Promise,
    exports: {},
  };
  vm.runInNewContext(source + '\nexports.trackEvent=trackEvent;', context);
  await context.exports.trackEvent({ eventType: 'BROCHURE_DOWNLOAD', entityId: 7 });
  assert.equal(calls[0][0], 'http://localhost:5000/api/consent');
  assert.equal(calls[0][1].consentGiven, true);
  assert.equal(calls[1][0], 'http://localhost:5000/api/track');
  assert.equal(calls[1][1].eventType, 'BROCHURE_DOWNLOAD');
  assert.equal(calls[1][2].headers.Authorization, 'Bearer customer-jwt');
});

test('catalog tracking does not collect engagement without analytics consent', async () => {
  let posted = false;
  const source = fs.readFileSync(path.join(__dirname, '../app/lib/track.js'), 'utf8')
    .replace('import axios from "axios";', '')
    .replace('export const trackEvent', 'const trackEvent');
  const context = {
    axios: { post: async () => { posted = true; } }, window: {},
    localStorage: { getItem: key => key === 'token' ? 'customer-jwt' : JSON.stringify({ analytics: false }) },
    process: { env: { NEXT_PUBLIC_ANALYTICS_URL: 'http://localhost:5000/api' } }, Promise, exports: {},
  };
  vm.runInNewContext(source + '\nexports.trackEvent=trackEvent;', context);
  await context.exports.trackEvent({ eventType: 'BROCHURE_DOWNLOAD' });
  assert.equal(posted, false);
});
