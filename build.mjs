import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createSceneBundle} from './vendor/gods-eye-view/src/director/sharing/bundle.js';
import {normaliseSnapshot,sha256} from './core.mjs';
const read=async path=>JSON.parse(await readFile(new URL(path,import.meta.url),'utf8'));
const snapshot=await read('./data/nea-snapshot.json');
const data=normaliseSnapshot(snapshot);
const stops=await read('./stops.json');
const {sources}=await read('./sources.json');
const sourceById=new Map(sources.map(s=>[s.id,s]));
const titleCase=s=>s[0].toUpperCase()+s.slice(1);
const bytesOf=value=>new TextEncoder().encode(JSON.stringify(value,null,2)+'\n');
const researchGeometry={type:'FeatureCollection',features:stops.map(s=>({
 type:'Feature',id:s.id,properties:{name:s.title,role:'Approximate research viewpoint; not an observation',height_note:'Artificial display height'},
 geometry:{type:'Point',coordinates:[s.featureLon,s.featureLat,5000]}
}))};
const readingsGeometry={type:'FeatureCollection',features:data.regions.map(r=>({
 type:'Feature',id:'sg-'+r.name,properties:{name:titleCase(r.name),location_role:'Provider regional label location, not a monitoring station',pm25_one_hourly:r.pm25,psi_twenty_four_hourly:r.psi,pm25_timestamp:r.pm25_timestamp,psi_timestamp:r.psi_timestamp,display_height_note:'Artificial 1200 metre display offset; not a measured altitude'},
 geometry:{type:'Point',coordinates:[r.longitude,r.latitude,1200]}
}))};
const pack=(id,path,attribution)=>({id,version:1,format:'geojson',source:{adapter:'assets',path},attribution,placement:{altitudeReference:'ellipsoid'}});
const readingText=r=>[
 titleCase(r.name)+' Singapore. DATED SNAPSHOT, not a continuous live feed.',
 '1-hour PM2.5: '+(r.pm25===null?'unavailable':r.pm25+' micrograms per cubic metre')+'. Observation: '+r.pm25_timestamp+'. Provider update: '+r.pm25_updated+'.',
 '24-hour PSI: '+(r.psi===null?'unavailable':r.psi+' (index)')+'. Observation: '+r.psi_timestamp+'. Provider update: '+r.psi_updated+'.',
 'Capture recorded: '+data.captured_at+'. Freshness at build: '+r.freshness+'. The two-hour label is a display rule, not a health threshold.',
 'This pin is NEA regional label metadata, not a monitoring station. Display height is artificial.',
 'These measurements do not establish transboundary origin, responsibility or breach. Consult the official source for current readings and advice.'
].join('\n\n');
const readingAction=r=>({id:'sg-'+r.name+'-readings',label:titleCase(r.name)+' readings and official source',target:{packId:'singapore-readings',featureId:'sg-'+r.name},action:{type:'card',text:readingText(r),url:'https://www.haze.gov.sg/'}});
const shot=(id,title,lat,lon,alt,ids,interactions)=>({id,title,durationSec:5,holdSec:10,camera:{lat,lon,alt,altitudeReference:'ellipsoid',heading:0,pitch:-90,roll:0},visual:{style:'normal'},layers:{},dataPackIds:ids,interactions});
const singapore={
 id:'singapore-air-quality-snapshot',title:'Singapore air quality | Snapshot '+data.pm25_timestamp,
 dataPacks:[pack('singapore-readings','haze-lens/singapore-readings.geojson',{
  text:'Contains NEA PM2.5 and PSI information and regional label locations from data.gov.sg, accessed 15 November 2026 for the initial snapshot. Each card records observation and capture times. Independent prototype; no agency endorsement.',
  license:'Singapore Open Data Licence version 1.0. https://data.gov.sg/open-data-licence',
  url:'https://data.gov.sg/open-data-licence'
 })],
 shots:[
 shot('sg-overview','01 | Five regions: click a pin to inspect dated readings',1.35735,103.82,125000,['singapore-readings'],data.regions.map(readingAction)),
 ...data.regions.map(r=>shot('sg-'+r.name,titleCase(r.name)+' | PM2.5 '+(r.pm25??'unavailable')+' | PSI '+(r.psi??'unavailable')+' | snapshot',r.latitude,r.longitude,22000,['singapore-readings'],[readingAction(r)]))
 ]
};
const research={
 id:'asean-haze-research-starter',title:'ASEAN haze | Evidence and response research',
 dataPacks:[pack('research-viewpoints','haze-lens/research-viewpoints.geojson',{
  text:'Authored research viewpoints and notes prepared for Albert Tan. External links identify official sources; no third-party imagery or fire detections are included in this pack.',
  license:'Research prototype for personal research and teaching. Linked material retains its own terms.'
 })],
 shots:stops.map(s=>shot(s.id,s.title,s.lat,s.lon,s.alt,['research-viewpoints'],[{id:s.id+'-source',label:'Research prompt and official source',target:{packId:'research-viewpoints',featureId:s.id},action:{type:'card',text:s.text,url:sourceById.get(s.source).url}}]))
};
const project={version:6,createdAt:data.captured_at,scenes:[singapore,research]};
const assets=new Map([
 ['haze-lens/singapore-readings.geojson',{bytes:bytesOf(readingsGeometry),mimeType:'application/geo+json'}],
 ['haze-lens/research-viewpoints.geojson',{bytes:bytesOf(researchGeometry),mimeType:'application/geo+json'}]
]);
const bundle=await createSceneBundle(project,async p=>assets.get(p.source.path));
await mkdir(new URL('./dist/',import.meta.url),{recursive:true});
const save=(path,content)=>writeFile(new URL('./dist/'+path,import.meta.url),content);
await save('Haze_Lens.gevbundle.json',JSON.stringify(JSON.parse(bundle),null,2)+'\n');
await save('singapore-readings.geojson',bytesOf(readingsGeometry));
await save('research-viewpoints.geojson',bytesOf(researchGeometry));
const template=await read('./research-ledger.template.json');
await save('evidence-ledger.json',JSON.stringify({...template,status:'Ten regional measurement records derived from the captured official responses. Institutional and legal records remain empty.',observations:data.observations},null,2)+'\n');
await save('provenance.json',JSON.stringify({
 upstream:await read('./UPSTREAM.json'),captured_at:data.captured_at,retrieval_method:snapshot.retrieval_method,
 note:'Hashes identify canonicalised response JSON in data/nea-snapshot.json, not original HTTP response bytes.',
 sources:snapshot.sources.map(s=>({kind:s.kind,url:s.url,json_sha256:sha256(s.response)})),
 bundle_sha256:sha256(JSON.stringify(JSON.parse(bundle),null,2)+'\n')
},null,2)+'\n');
const lines=['# Haze Lens: captured Singapore readings','',
 'PM2.5 observation: '+data.pm25_timestamp+'. PSI observation: '+data.psi_timestamp+'.',
 'Capture recorded: '+data.captured_at+'. This table is a snapshot, not a live feed.','',
 '| Region | 1-hour PM2.5 (micrograms/m3) | 24-hour PSI (index) |','| --- | ---: | ---: |',
 ...data.regions.map(r=>'| '+titleCase(r.name)+' | '+(r.pm25??'unavailable')+' | '+(r.psi??'unavailable')+' |'),'',
 'Source: National Environment Agency via [data.gov.sg](https://data.gov.sg/). Reused under the [Singapore Open Data Licence](https://data.gov.sg/open-data-licence).',
 'Current readings and official advice: [NEA haze portal](https://www.haze.gov.sg/).',
 'Source attribution, causation and legal responsibility have not been established.',''];
await save('SNAPSHOT.md',lines.join('\n'));
console.log('Built Haze Lens: 2 scenes, 10 shots, 9 map points, 10 measurement records. No paid provider layers activated.');

