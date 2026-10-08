const test=require('node:test'),assert=require('node:assert/strict');
const {renderBlocks}=require('../src/controllers/marketing-content.controller');
test('landing page renderer escapes headings and removes executable HTML',()=>{const html=renderBlocks([{type:'hero',heading:'<Hello>',text:'Safe'},{type:'text',heading:'Body',html:'<p onclick="bad()">Hi</p><script>alert(1)</script>'}]);assert.match(html,/&lt;Hello&gt;/);assert.doesNotMatch(html,/onclick|script|alert\(1\)/i);assert.match(html,/<p>Hi<\/p>/);});
test('asset block always uses the tracked download route',()=>{const html=renderBlocks([{type:'asset',assetId:42,label:'Get guide'}]);assert.match(html,/assets\/42\/download/);assert.match(html,/Get guide/);});
