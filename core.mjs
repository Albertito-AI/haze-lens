import {createHash} from 'node:crypto';
export const ENDPOINTS=Object.freeze({
 pm25:'https://api-open.data.gov.sg/v2/real-time/api/pm25',
 psi:'https://api-open.data.gov.sg/v2/real-time/api/psi'
});
export const REGION_NAMES=['north','south','east','west','central'];
export const sha256=value=>createHash('sha256').update(typeof value==='string'||value instanceof Uint8Array?value:JSON.stringify(value)).digest('hex');
function instant(value,label){
 if(typeof value!=='string'||!/(?:Z|[+-]\d{2}:\d{2})$/.test(value)||!Number.isFinite(Date.parse(value))) throw Error(label+' must be an ISO timestamp with timezone');
 return Date.parse(value);
}
function latest(response,kind,capturedMs){
 if(response?.code!==0||!response.data||!Array.isArray(response.data.items)||!response.data.items.length) throw Error(kind+': unavailable or unsuccessful response');
 const items=response.data.items.map(item=>({item,time:instant(item.timestamp,kind+' observation time')}));
 items.sort((a,b)=>b.time-a.time);
 const {item,time}=items[0];
 if(time>capturedMs+5*60*1000) throw Error(kind+': observation is unexpectedly in the future');
 const updated=instant(item.updatedTimestamp,kind+' update time');
 if(updated>capturedMs+5*60*1000) throw Error(kind+': update is unexpectedly in the future');
 const field=kind==='pm25'?'pm25_one_hourly':'psi_twenty_four_hourly';
 const values=item.readings?.[field];
 if(!values||typeof values!=='object'||Array.isArray(values)) throw Error(kind+': required readings missing');
 let available=0;
 for(const region of REGION_NAMES){
  const value=values[region];
  if(value===undefined||value===null) continue;
  if(typeof value!=='number'||!Number.isFinite(value)||value<0) throw Error(kind+': invalid '+region+' reading');
  available++;
 }
 if(!available) throw Error(kind+': all regional readings unavailable');
 return {item,field,values,time};
}
export function normaliseSnapshot(snapshot,{now=new Date()}={}){
 const capturedMs=instant(snapshot?.captured_at,'capture time');
 const nowMs=Number(now);
 if(!Number.isFinite(nowMs)) throw Error('Invalid reference time');
 if(!Array.isArray(snapshot.sources)) throw Error('Source captures missing');
 const sourceByKind=new Map(snapshot.sources.map(s=>[s.kind,s]));
 if(sourceByKind.size!==2||snapshot.sources.length!==2) throw Error('Expected one PM2.5 source and one PSI source');
 for(const kind of ['pm25','psi']) if(sourceByKind.get(kind)?.url!==ENDPOINTS[kind]) throw Error('Unexpected source endpoint');
 const pm=latest(sourceByKind.get('pm25').response,'pm25',capturedMs);
 const psi=latest(sourceByKind.get('psi').response,'psi',capturedMs);
 const metadata=sourceByKind.get('pm25').response.data.regionMetadata;
 if(!Array.isArray(metadata)) throw Error('Regional location metadata missing');
 const locations=new Map(metadata.map(r=>[String(r.name).toLowerCase(),r.labelLocation]));
 const regions=REGION_NAMES.map(name=>{
  const loc=locations.get(name);
  if(!loc||!Number.isFinite(loc.latitude)||!Number.isFinite(loc.longitude)||Math.abs(loc.latitude)>90||Math.abs(loc.longitude)>180) throw Error('Invalid regional label location for '+name);
  return {name,latitude:loc.latitude,longitude:loc.longitude,
   pm25:pm.values[name]??null,psi:psi.values[name]??null,
   pm25_timestamp:pm.item.timestamp,psi_timestamp:psi.item.timestamp,
   pm25_updated:pm.item.updatedTimestamp,psi_updated:psi.item.updatedTimestamp,
   freshness:nowMs-Math.min(pm.time,psi.time)>120*60000?'older-than-two-hours-at-build':'within-two-hours-at-build'};
 });
 const observations=[];
 for(const r of regions) for(const [kind,source] of [['pm25',pm],['psi',psi]]) observations.push({
  id:kind+'-'+r.name+'-'+source.item.timestamp,region:r.name,jurisdiction:'Singapore',
  metric:kind==='pm25'?'PM2.5':'PSI',value:r[kind],availability:r[kind]===null?'unavailable':'reported',
  unit:kind==='pm25'?'micrograms per cubic metre':'index',averaging_period:kind==='pm25'?'1 hour':'24 hours',
  observed_at:source.item.timestamp,provider_updated_at:source.item.updatedTimestamp,captured_at:snapshot.captured_at,
  source_url:ENDPOINTS[kind],source_pinpoint:'data.items[latest timestamp].readings.'+source.field+'.'+r.name,
  source_json_sha256:sha256(sourceByKind.get(kind).response),location_role:'Regional label location supplied by NEA via data.gov.sg; not a monitoring station',
  latitude:r.latitude,longitude:r.longitude,retrieval_method:snapshot.retrieval_method,causal_attribution:'Not established'
 });
 return {regions,observations,pm25_timestamp:pm.item.timestamp,psi_timestamp:psi.item.timestamp,captured_at:snapshot.captured_at};
}
export async function fetchSnapshot({fetchImpl=globalThis.fetch,now=()=>new Date()}={}){
 const sources=await Promise.all(Object.entries(ENDPOINTS).map(async([kind,url])=>{
  const response=await fetchImpl(url,{headers:{Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(20000)});
  if(!response.ok) throw Error(kind+': HTTP '+response.status+'; previous snapshot retained');
  const declared=Number(response.headers.get('content-length'));
  if(declared>2*1024*1024) throw Error(kind+': oversized response');
  const text=await response.text();
  if(new TextEncoder().encode(text).length>2*1024*1024) throw Error(kind+': oversized response');
  return {kind,url,response:JSON.parse(text)};
 }));
 const snapshot={captured_at:now().toISOString(),retrieval_method:'Direct HTTPS API retrieval; response JSON parsed and canonicalised. Capture time is recorded after both requests complete.',sources};
 normaliseSnapshot(snapshot,{now:now()});
 return snapshot;
}
