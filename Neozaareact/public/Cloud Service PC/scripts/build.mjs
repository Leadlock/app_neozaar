import {copyFile,mkdir,readFile,readdir,rm,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..'),dist=resolve(root,'dist');
const [indexHtml,scopeCss,scopeJs,proposalJs,proposalTemplate,adminHtml,adminCss,adminExtraCss,adminJs,catalogText,presentationText,supportText,landingZoneText,cloudManagedText,runtime,hosting]=await Promise.all([
  readFile(resolve(root,'app/index.html'),'utf8'),readFile(resolve(root,'app/scope.css'),'utf8'),readFile(resolve(root,'app/scope.js'),'utf8'),readFile(resolve(root,'app/proposal.js'),'utf8'),readFile(resolve(root,'app/proposal-template.docx')),readFile(resolve(root,'app/admin.html'),'utf8'),readFile(resolve(root,'app/admin.css'),'utf8'),readFile(resolve(root,'app/admin-extra.css'),'utf8'),readFile(resolve(root,'app/admin.js'),'utf8'),readFile(resolve(root,'data/catalog-default.json'),'utf8'),readFile(resolve(root,'data/catalog-presentation.json'),'utf8'),readFile(resolve(root,'data/managed-support-packages.json'),'utf8'),readFile(resolve(root,'data/landing-zone-packages.json'),'utf8'),readFile(resolve(root,'data/cloud-managed-operations.json'),'utf8'),readFile(resolve(root,'worker/runtime.js'),'utf8'),readFile(resolve(root,'.openai/hosting.json'),'utf8')
]);
const baseCatalog=JSON.parse(catalogText),presentation=JSON.parse(presentationText),supportPackages=JSON.parse(supportText),landingZonePackages=JSON.parse(landingZoneText),cloudManagedOperations=JSON.parse(cloudManagedText);
function calculatorFamily(row){
  const id=row.id;
  if(/^NE0-013-(00[1-5]|00[9]|01[0-9]|020)$/.test(id))return 'Office 365';
  if(id.startsWith('NE0-019-')||id.startsWith('NE0-020-')||id==='NE0-013-008')return 'Modern Workplace';
  if(id.startsWith('NE0-017-'))return 'Tenant to Tenant';
  if(id.startsWith('NE0-023-')||id==='NE0-016-027')return 'Landing Zone Implementation';
  if(id.startsWith('NE0-008-'))return 'Advisory Services';
  if(/^NE0-(009|010|011|012|014|015|021)-/.test(id)||/^NE0-013-00[67]$/.test(id))return 'Cloud Implementation Services';
  if(/^NE0-016-00[1-4]$/.test(id))return 'Cloud Support';
  if(id.startsWith('NE0-016-'))return 'Managed IT & Security';
  if(/^NE0-(001|002|003|004|005|006|007|018)-/.test(id))return 'Cloud Managed Operations';
  throw new Error(`Unmapped default catalogue SKU: ${id}`);
}
const catalog=[...baseCatalog.filter(row=>!row.id.startsWith('NE0-016-')&&!/^NE0-(001|002|003)-/.test(row.id)),...cloudManagedOperations,...supportPackages,...landingZonePackages].map(row=>({...row,family:calculatorFamily(row),...(presentation[row.id]||{})}));
if(!Array.isArray(catalog)||catalog.length!==151)throw new Error('Expected 151 merged catalogue rows');
await rm(dist,{recursive:true,force:true});await mkdir(resolve(dist,'server'),{recursive:true});await mkdir(resolve(dist,'.openai/drizzle'),{recursive:true});
const generated=`const ASSETS=${JSON.stringify({indexHtml,scopeCss,scopeJs,proposalJs,adminHtml,adminCss,adminExtraCss,adminJs})};\nconst PROPOSAL_TEMPLATE_BASE64=${JSON.stringify(proposalTemplate.toString('base64'))};\nconst DEFAULT_CATALOG=${JSON.stringify(catalog)};\n${runtime}`;
await writeFile(resolve(dist,'server/index.js'),generated);await writeFile(resolve(dist,'.openai/hosting.json'),hosting);for(const file of(await readdir(resolve(root,'drizzle'))).filter(name=>name.endsWith('.sql')))await copyFile(resolve(root,'drizzle',file),resolve(dist,'.openai/drizzle',file));console.log(`Built Worker with ${catalog.length} catalogue SKUs`);
