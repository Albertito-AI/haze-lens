import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseSceneShare,createSceneBundle} from './vendor/gods-eye-view/src/director/sharing/bundle.js';
import {decodePackGeoJSON} from './vendor/gods-eye-view/src/director/packs/geojson.js';
import {normaliseSnapshot,fetchSnapshot,sha256} from './core.mjs';
const read=async path=>JSON.parse(await readFile(new URL(path,import.meta.url),'utf8'));
const snapshot=await read('./data/nea-snapshot.json');
const data=normaliseSnapshot(snapshot);
assert.equal(data.regions.length,5);
assert.equal(data.observations.length,10);
const text=await readFile(new URL('./dist/Haze_Lens.gevbundle.json',import.meta.url),'utf8');
const parsed=await parseSceneShare(text);
assert.equal(parsed.project.version,6);
assert.equal(parsed.project.scenes.length,2);
assert.equal(parsed.assets.size,2);
const allowedUrls=new Set((await read('./sources.json')).sources.map(s=>s.url));
for(const scene of parsed.project.scenes){
 const featuresByPack=new Map(scene.dataPacks.map(pack=>[pack.id,new Set(decodePackGeoJSON(parsed.assets.get(pack.source.path).bytes).map(f=>f.id))]));
 for(const shot of scene.shots){
  assert.deepEqual(shot.layers,{},'Pack must not activate paid or live provider layers');
  for(const interaction of shot.interactions){
   assert(featuresByPack.get(interaction.target.packId).has(interaction.target.featureId));
   assert.equal(interaction.action.type,'card');
   assert(allowedUrls.has(interaction.action.url));
  }
 }
}
const singapore=parsed.project.scenes[0];
for(const r of data.regions){
 const card=singapore.shots.find(s=>s.id==='sg-'+r.name).interactions[0].action.text;
 assert(card.includes(r.pm25_timestamp)&&card.includes(r.psi_timestamp));
 assert(card.includes('not a continuous live feed'));
 assert(card.includes(r.pm25===null?'unavailable':r.pm25+' micrograms per cubic metre'));
 assert(card.includes(r.psi===null?'unavailable':r.psi+' (index)'));
}
const roundTrip=await parseSceneShare(await createSceneBundle(parsed.project,async p=>parsed.assets.get(p.source.path)));
const semantic=p=>{
 const copy=structuredClone(p);
 for(const scene of copy.scenes) for(const pack of scene.dataPacks) pack.source.path='content-sha256/'+pack.sha256;
 return copy;
};
assert.deepEqual(semantic(roundTrip.project),semantic(parsed.project));
for(const scene of roundTrip.project.scenes) for(const pack of scene.dataPacks) assert.equal(sha256(roundTrip.assets.get(pack.source.path).bytes),pack.sha256);
const tampered=JSON.parse(text);tampered.assets[0].sha256='0'.repeat(64);
await assert.rejects(()=>parseSceneShare(JSON.stringify(tampered)),/integrity mismatch/);
const missing=structuredClone(snapshot);delete missing.sources[0].response.data.items[0].readings.pm25_one_hourly.north;
assert.equal(normaliseSnapshot(missing).regions.find(r=>r.name==='north').pm25,null);
const negative=structuredClone(snapshot);negative.sources[0].response.data.items[0].readings.pm25_one_hourly.north=-1;
assert.throws(()=>normaliseSnapshot(negative),/invalid north reading/);
const invalid=structuredClone(snapshot);invalid.sources[0].response.data.items[0].timestamp='unknown';
assert.throws(()=>normaliseSnapshot(invalid),/timestamp with timezone/);
const stale=normaliseSnapshot(snapshot,{now:new Date(Date.parse(data.pm25_timestamp)+3*3600000)});
assert(stale.regions.every(r=>r.freshness==='older-than-two-hours-at-build'));
const fakeFetch=async url=>new Response(JSON.stringify(snapshot.sources.find(s=>s.url===url).response),{headers:{'content-type':'application/json'}});
const refreshed=await fetchSnapshot({fetchImpl:fakeFetch,now:()=>new Date(snapshot.captured_at)});
assert.equal(normaliseSnapshot(refreshed).regions[0].pm25,data.regions[0].pm25);
await assert.rejects(()=>fetchSnapshot({fetchImpl:async()=>new Response('rate limited',{status:429})}),/HTTP 429/);
const ledger=await read('./dist/evidence-ledger.json');
assert.deepEqual(ledger.observations,data.observations);
for(const field of ['institutional_events','legal_assessments','comparisons']) assert.equal(ledger[field].length,0);
const provenance=await read('./dist/provenance.json');
assert.equal(provenance.bundle_sha256,sha256(text));
console.log('PASS: source parsing, missing/invalid/stale data, mocked refresh success/HTTP failure, scene schema, geometry, action targets, measurement cards, hashes, semantic round-trip, tamper rejection and evidence ledger.');
console.log('Not tested: complete globe rendering, browser clicks or direct live refresh from this runtime.');

