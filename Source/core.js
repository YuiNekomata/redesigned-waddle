/* Offline Skyrim SE plugin reader. No plugin files are modified. */
(function(root){
'use strict';
const profiles={
 'Review / no tags':[],
 'Full coverage':['AND_CoversAll'],
 'Half naked outfit':['SLA_ArmorHalfNaked'],
 'Nearly naked outfit':['AND_NearlyNaked','SLA_ArmorHalfNaked','EroticArmor'],
 'Bikini outfit':['SLA_ArmorHalfNakedBikini','EroticArmor'],
 'Bra / bikini top':['AND_Bra','SLA_Brabikini','SLA_ArmorPartTop'],
 'Underwear':['AND_Underwear','SLA_PantiesNormal','SLA_ArmorPartBottom'],
 'Thong':['AND_Thong','SLA_ThongGstring','SLA_ArmorPartBottom'],
 'Nipple pasties':['AND_NipplePasties','SLA_PastiesNipple'],
 'Crotch pasties':['AND_VaginaPasties','SLA_PastiesCrotch'],
 'Mini skirt':['AND_Miniskirt','SLA_MiniSkirt'],
 'Micro skirt':['AND_Microskirt','SLA_MicroSkirt'],
 'Hotpants':['AND_Hotpants','SLA_MicroHotpants'],
 'Armor top':['AND_ArmorTop','SLA_ArmorPartTop'],
 'Armor bottom':['AND_ArmorBottom','SLA_ArmorPartBottom'],
 'Transparent bra':['AND_BraT','SLA_Brabikini','SLA_ArmorTransparent','SLA_ArmorPartTop'],
 'Transparent underwear':['AND_UnderwearT','SLA_ArmorTransparent','SLA_ArmorPartBottom'],
 'Heels':['SLA_BootsHeels'],
};
function suggest(name){
 const n=name.replace(/([a-z])([A-Z])/g,'$1 $2').toLowerCase();
 const rules=[[/nipple.*past|past.*nipple/,'Nipple pasties'],[/crotch.*past|vagina.*past/,'Crotch pasties'],[/\b(thong|g[ -]?string)\b/,'Thong'],[/\b(micro ?skirt)\b/,'Micro skirt'],[/\b(mini ?skirt)\b/,'Mini skirt'],[/\bhot ?pants\b/,'Hotpants'],[/\b(bra|bikini top)\b/,'Bra / bikini top'],[/\b(panties|panty|underwear|briefs)\b/,'Underwear'],[/\b(heels|stilettos)\b/,'Heels']];
 for(const [re,p] of rules) if(re.test(n)){
   if(/transparent|sheer|see[ -]?through/.test(n)){
     if(p==='Bra / bikini top')return 'Transparent bra';
     if(p==='Underwear')return 'Transparent underwear';
   }
   return p;
 }
 return 'Review / no tags';
}
const deviceProfiles={
 'No DD preset':[],
 'Collar':['zad_DeviousCollar'],
 'Harness':['zad_DeviousHarness'],
 'Corset':['zad_DeviousCorset'],
 'Chastity belt':['zad_DeviousBelt'],
 'Chastity bra':['zad_DeviousBra'],
 'Arm cuffs':['zad_DeviousArmCuffs'],
 'Leg cuffs':['zad_DeviousLegCuffs'],
 'Ankle shackles':['zad_DeviousAnkleShackles'],
 'Front cuffs':['zad_DeviousHeavyBondage','zad_DeviousCuffsFront'],
 'Armbinder':['zad_DeviousHeavyBondage','zad_DeviousArmbinder'],
 'Elbow armbinder':['zad_DeviousHeavyBondage','zad_DeviousArmbinderElbow'],
 'Elbow tie':['zad_DeviousHeavyBondage','zad_DeviousElbowTie'],
 'Yoke':['zad_DeviousHeavyBondage','zad_DeviousYoke'],
 'Straitjacket':['zad_DeviousHeavyBondage','zad_DeviousStraitJacket'],
 'Gag':['zad_DeviousGag'],
 'Panel gag':['zad_DeviousGag','zad_DeviousGagPanel'],
 'Ring gag':['zad_DeviousGag','zad_DeviousGagRing'],
 'Bit gag':['zad_DeviousGag','zad_DeviousGagBit'],
 'Inflatable gag':['zad_DeviousGag','zad_DeviousGagInflatable'],
 'Blindfold':['zad_DeviousBlindfold'],
 'Hood':['zad_DeviousHood'],
 'Gloves':['zad_DeviousGloves'],
 'Bondage mittens':['zad_DeviousBondageMittens'],
 'Boots':['zad_DeviousBoots'],
 'Suit':['zad_DeviousSuit'],
 'Hobble skirt':['zad_DeviousHobbleSkirt'],
 'Relaxed hobble skirt':['zad_DeviousHobbleSkirt','zad_DeviousHobbleSkirtRelaxed'],
 'Pet suit':['zad_DeviousHeavyBondage','zad_DeviousPetSuit'],
 'Vaginal plug':['zad_DeviousPlug','zad_DeviousPlugVaginal'],
 'Anal plug':['zad_DeviousPlug','zad_DeviousPlugAnal'],
 'Nipple piercings':['zad_DeviousPiercingsNipple'],
 'Vaginal piercings':['zad_DeviousPiercingsVaginal'],
 'Clamps':['zad_DeviousClamps'],
};
const coverageKeywords=[...new Set([...Object.values(profiles).flat(),
 'AND_ArmorTopT','AND_ArmorBottomT','AND_ArmorTop_NoCover','AND_ArmorBottom_NoCover',
 'AND_Bra_NoCover','AND_Underwear_NoCover','AND_Thong_NoCover',
 'SLA_ThongCString','SLA_ThongLowleg','SLA_ThongT','SLA_PantsNormal','SLA_FullSkirt','SLA_ShowgirlSkirt',
 'SLA_ArmorPretty','SLA_ArmorCurtain','SLA_ArmorLewdLeotard'])].sort();
const deviceKeywords=[...new Set(Object.values(deviceProfiles).flat())].sort();
function slotCategories(row){
 const categories=new Set(),name=(row.name+' '+(row.editor||'')).replace(/([a-z])([A-Z])/g,'$1 $2').toLowerCase();
 const map={30:['head'],31:['head'],32:['upper','body','torso'],33:['hands'],34:['wrists'],35:['neck'],37:['feet'],38:['legs'],41:['head'],42:[/choker|collar/.test(name)?'neck':'head'],43:['ears'],44:['mouth'],45:['neck'],46:['restraint'],48:['upper','anal'],49:['lower'],50:['genitalAdornment'],51:['nippleAdornment'],52:['lower'],53:['legs'],54:['vaginal'],55:['eyes'],56:['upper'],57:['lower'],58:['torso'],59:['wrists'],60:['head']};
 for(const slot of row.slots||[])for(const category of map[slot]||[])categories.add(category);
 // Item names help with outfits that put familiar pieces in custom slots.
 for(const [pattern,category] of [[/choker|collar/,'neck'],[/\b(gag)\b/,'mouth'],[/blindfold/,'eyes'],[/\b(hood|helmet)\b/,'head'],[/\b(boots|heels|stilettos)\b/,'feet'],[/\b(gloves|mittens|gauntlets)\b/,'hands'],[/\b(bra|top)\b/,'upper'],[/\b(panties|panty|underwear|thong|bottom|skirt|pants)\b/,'lower'],[/\b(corset|harness)\b/,'torso'],[/earrings/,'ears']])if(pattern.test(name))categories.add(category);
 return categories;
}
function keywordRelevant(row,keyword){
 const c=slotCategories(row),upper=c.has('upper'),lower=c.has('lower'),body=c.has('body');
 if(/^AND_(CoversAll|NearlyNaked)$/.test(keyword))return body;
 if(/^AND_(ArmorTop|Bra|NipplePasties)/.test(keyword)||/^SLA_(ArmorPartTop|Brabikini|PastiesNipple)$/.test(keyword))return upper||c.has('nippleAdornment');
 if(/^AND_(ArmorBottom|Underwear|Thong|VaginaPasties|Hotpants|Miniskirt|Microskirt)/.test(keyword)||/^SLA_(ArmorPartBottom|PantiesNormal|PantsNormal|Thong.*|PastiesCrotch|MicroHotpants|FullSkirt|MiniSkirt|MicroSkirt|ShowgirlSkirt)$/.test(keyword))return lower;
 if(keyword==='SLA_BootsHeels')return c.has('feet');
 if(keyword==='EroticArmor'||/^SLA_Armor/.test(keyword))return upper||lower||body||c.has('torso');
 const dd={
  zad_DeviousCollar:['neck'],zad_DeviousHarness:['torso','upper','lower'],zad_DeviousCorset:['torso','upper'],zad_DeviousBelt:['lower'],zad_DeviousBra:['upper'],
  zad_DeviousArmCuffs:['wrists','hands'],zad_DeviousLegCuffs:['legs'],zad_DeviousAnkleShackles:['legs','feet'],
  zad_DeviousHeavyBondage:['restraint','body'],zad_DeviousCuffsFront:['restraint','wrists'],zad_DeviousArmbinder:['restraint'],zad_DeviousArmbinderElbow:['restraint'],zad_DeviousElbowTie:['restraint'],zad_DeviousYoke:['restraint'],zad_DeviousStraitJacket:['restraint','body'],
  zad_DeviousBlindfold:['eyes'],zad_DeviousHood:['head'],zad_DeviousGloves:['hands'],zad_DeviousBondageMittens:['hands'],zad_DeviousBoots:['feet'],zad_DeviousSuit:['body'],zad_DeviousPetSuit:['body'],zad_DeviousHobbleSkirt:['body','lower'],zad_DeviousHobbleSkirtRelaxed:['body','lower'],
  zad_DeviousPlug:['anal','vaginal'],zad_DeviousPlugAnal:['anal'],zad_DeviousPlugVaginal:['vaginal'],zad_DeviousPiercingsNipple:['nippleAdornment','upper'],zad_DeviousPiercingsVaginal:['genitalAdornment'],zad_DeviousClamps:['nippleAdornment','upper']
 };
 if(/^zad_DeviousGag/.test(keyword))return c.has('mouth');
 return (dd[keyword]||[]).some(category=>c.has(category));
}
function setKeyword(row,keyword,enabled){
 if(!/^\w+$/.test(keyword))throw Error('Invalid keyword EditorID');
 row.tags=enabled?[...new Set([...row.tags,keyword])]:row.tags.filter(t=>t!==keyword);
 if(!enabled&&row.slotSuggestedTags){row.slotSuggestedTags=row.slotSuggestedTags.filter(t=>t!==keyword);row.slotGuess=!!row.slotSuggestedTags.length;}
}
function setCoverageProfile(row,profile){
 if(!Object.hasOwn(profiles,profile))throw Error('Unknown coverage preset');
 const previous=new Set(profiles[row.profile]||[]);
 row.tags=[...new Set([...row.tags.filter(t=>!previous.has(t)),...profiles[profile]])];
 row.profile=profile;row.slotGuess=false;
}
function setDeviceProfile(row,profile){
 if(!Object.hasOwn(deviceProfiles,profile))throw Error('Unknown DD preset');
 const previous=new Set(deviceProfiles[row.ddProfile]||[]);
 row.tags=[...new Set([...row.tags.filter(t=>!previous.has(t)),...deviceProfiles[profile]])];
 row.ddProfile=profile;
}
const text=(b)=>{
 // Modern translated plugins may contain UTF-8; older plugins use Windows-1252.
 let value;try{value=new TextDecoder('utf-8',{fatal:true}).decode(b);}
 catch{value=new TextDecoder('windows-1252').decode(b);}
 return value.replace(/\0.*$/s,'');
};
function subs(b){
 const v=new DataView(b.buffer,b.byteOffset,b.byteLength),out=[];let p=0,extended=null;
 while(p<b.length){
  if(p+6>b.length)throw Error('Truncated subrecord');
  const sig=String.fromCharCode(...b.subarray(p,p+4));let n=v.getUint16(p+4,true);p+=6;
  if(sig==='XXXX'){if(n!==4||p+4>b.length)throw Error('Invalid extended subrecord');extended=v.getUint32(p,true);p+=4;continue;}
  if(extended!==null){n=extended;extended=null;}
  if(p+n>b.length)throw Error('Subrecord exceeds record');out.push([sig,b.subarray(p,p+n)]);p+=n;
 }
 return out;
}
async function parse(buffer,filename){
 if(!/\.(esp|esm|esl)$/i.test(filename)||/[|~,\r\n]/.test(filename))throw Error('Choose an ESP, ESM or ESL with a KID-compatible filename.');
 const b=new Uint8Array(buffer),v=new DataView(buffer);const sig=p=>String.fromCharCode(...b.subarray(p,p+4));
 if(b.length<24||sig(0)!=='TES4')throw Error('Not a Skyrim plugin (missing TES4 header).');
 const headerEnd=24+v.getUint32(4,true);if(headerEnd>b.length)throw Error('Truncated TES4 header');
 const masters=subs(b.subarray(24,headerEnd)).filter(s=>s[0]==='MAST').map(s=>text(s[1]));
 const localized=!!(v.getUint32(8,true)&0x80),rows=[],addons=new Map();let deleted=0;
 async function walk(start,end,depth=0){
  if(depth>32)throw Error('Too many nested groups');
  let p=start;while(p<end){
   if(p+24>end)throw Error('Truncated record header');
   const type=sig(p),size=v.getUint32(p+4,true);
   if(type==='GRUP'){if(size<24||p+size>end)throw Error('Invalid group size');await walk(p+24,p+size,depth+1);p+=size;continue;}
   const stop=p+24+size;if(stop>end)throw Error('Record exceeds group boundary');
   const flags=v.getUint32(p+8,true),form=v.getUint32(p+12,true);
   if((type==='ARMO'||type==='ARMA')&&!(flags&0x20)){
    let data=b.subarray(p+24,stop);
    if(flags&0x40000){
     if(data.length<4)throw Error('Truncated compressed armor');
     const expected=new DataView(data.buffer,data.byteOffset,4).getUint32(0,true);
     if(expected>64*1024*1024)throw Error('Armor record exceeds 64 MB safety limit');
     if(typeof DecompressionStream==='undefined')throw Error('Compressed plugins need a current Edge or Chrome browser.');
     data=new Uint8Array(await new Response(new Blob([data.subarray(4)]).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer());
     if(data.length!==expected)throw Error('Compressed record size mismatch');
    }
    let editor='',name='',mask=0;const models={},refs=[];for(const [s,d]of subs(data)){
     if(s==='EDID')editor=text(d);if(s==='FULL'&&!localized)name=text(d);
     if((s==='BOD2'||s==='BODT')&&d.length>=4)mask=new DataView(d.buffer,d.byteOffset,4).getUint32(0,true);
     if(/^MOD[2345]$/.test(s))models[s]=text(d);
     if(type==='ARMO'&&s==='MODL'&&d.length===4)refs.push(new DataView(d.buffer,d.byteOffset,4).getUint32(0,true));
    }
    if(type==='ARMA'){addons.set(form,{models});p=stop;continue;}
    const index=form>>>24;if(index>masters.length)throw Error('Invalid master index in armor '+form.toString(16));
    const owner=index<masters.length?masters[index]:filename;
    const slots=Array.from({length:32},(_,i)=>i).filter(i=>(mask>>>i)&1).map(i=>i+30);
    let profile=suggest(name||editor);
    if(profile==='Review / no tags'&&editor)profile=suggest(editor);
    rows.push({name:name||editor||'(unnamed armor)',editor,slots,owner,id:form&0xffffff,profile,tags:[...profiles[profile]],selected:false,localized,models,addonRefs:refs});
   }else if(type==='ARMO')deleted++;
   p=stop;
  }
 }
 await walk(headerEnd,b.length);
 for(const row of rows){
  row.previewModels=[];
  for(const ref of row.addonRefs){const a=addons.get(ref);if(a){for(const key of ['MOD3','MOD2'])if(a.models[key])row.previewModels.push({path:a.models[key],kind:key==='MOD3'?'Female worn model':'Male worn model'});}}
  for(const key of ['MOD4','MOD2'])if(row.models[key])row.previewModels.push({path:row.models[key],kind:'Inventory model (fallback)'});
 }
 return {filename,rows,masters,localized,deleted};
}
function suggestSlots(row){
 // Opt-in assumptions only. Slots describe attachment, not visible coverage.
 const slots=new Set(row.slots);
 if(slots.has(32))return 'Half naked outfit';
 const top=slots.has(48)||slots.has(56),bottom=slots.has(49)||slots.has(52);
 if(top&&!bottom)return 'Armor top';
 if(bottom&&!top)return 'Armor bottom';
 return 'Review / no tags';
}
function applySlotSuggestions(plugin){
 let changed=0;
 for(const row of plugin.rows){
  const profile=suggestSlots(row);
  if(profile==='Review / no tags')continue;
  const added=profiles[profile].filter(t=>!row.tags.includes(t));
  if(!added.length)continue;
  row.tags=[...new Set([...row.tags,...added])];row.slotSuggestedTags=[...new Set([...(row.slotSuggestedTags||[]),...added])];row.slotGuess=true;changed++;
 }
 return changed;
}
function generate(plugin,and=true,sla=true,dd=true){
 const lines=['; Generated by KID Clothing Creator','; Source: '+plugin.filename,'; Review name-based suggestions against the actual outfit.','; Requires Keyword Item Distributor and the mods that consume these keywords.',''];
 let count=0;
 for(const r of plugin.rows){
  const tags=[...new Set(r.tags)].filter(t=>(and&&t.startsWith('AND_'))||(sla&&(t.startsWith('SLA_')||t==='EroticArmor'))||(dd&&/^zad_/i.test(t)));
  if(!tags.length)continue;
  if(tags.some(t=>!/^\w+$/.test(t)))throw Error('Keywords must be EditorIDs (letters, numbers, underscores).');
  if(/[|~,\r\n]/.test(r.owner))throw Error('Unsupported delimiter in target plugin name');
  lines.push('; '+r.name.replace(/[\r\n]/g,' '));
  if(r.slotGuess&&(!r.slotSuggestedTags||r.slotSuggestedTags.some(t=>tags.includes(t))))lines.push('; Slot-based assumption: verify actual coverage.');
  for(const t of tags){lines.push(`Keyword = ${t}|Armor|0x${r.id.toString(16).toUpperCase()}~${r.owner}`);count++;}
  lines.push('');
 }
 return {text:lines.join('\r\n'),count,filename:'AND_'+plugin.filename.replace(/\.(esp|esm|esl)$/i,'')+'_KID.ini'};
}
function zipFile(filename,content){
 if(!filename||/[\\/\0]/.test(filename))throw Error('ZIP entry must be a filename at the archive root');
 const name=new TextEncoder().encode(filename),data=new TextEncoder().encode(content);
 if(name.length>65535||data.length>0xffffffff)throw Error('ZIP entry exceeds standard ZIP limits');
 let crc=0xffffffff;for(const byte of data){crc^=byte;for(let j=0;j<8;j++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}crc=(crc^0xffffffff)>>>0;
 const centralOffset=30+name.length+data.length,centralSize=46+name.length;
 const bytes=new Uint8Array(centralOffset+centralSize+22),v=new DataView(bytes.buffer);
 // Stored UTF-8 entry; no compression dependency or network service required.
 v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint16(12,0x21,true);
 v.setUint32(14,crc,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,name.length,true);
 bytes.set(name,30);bytes.set(data,30+name.length);
 const c=centralOffset;v.setUint32(c,0x02014b50,true);v.setUint16(c+4,20,true);v.setUint16(c+6,20,true);v.setUint16(c+8,0x800,true);v.setUint16(c+14,0x21,true);
 v.setUint32(c+16,crc,true);v.setUint32(c+20,data.length,true);v.setUint32(c+24,data.length,true);v.setUint16(c+28,name.length,true);bytes.set(name,c+46);
 const e=c+centralSize;v.setUint32(e,0x06054b50,true);v.setUint16(e+8,1,true);v.setUint16(e+10,1,true);v.setUint32(e+12,centralSize,true);v.setUint32(e+16,centralOffset,true);
 return bytes;
}
async function readZip(buffer,includeAssets=false){
 const bytes=new Uint8Array(buffer),v=new DataView(buffer),limit=256*1024*1024;
 let end=-1;
 for(let p=bytes.length-22;p>=Math.max(0,bytes.length-65557);p--){
  if(v.getUint32(p,true)===0x06054b50&&p+22+v.getUint16(p+20,true)===bytes.length){end=p;break;}
 }
 if(end<0)throw Error('Invalid ZIP: end directory not found.');
 const count=v.getUint16(end+10,true),size=v.getUint32(end+12,true),offset=v.getUint32(end+16,true);
 if(v.getUint16(end+4,true)||v.getUint16(end+6,true)||v.getUint16(end+8,true)!==count)throw Error('Split ZIP archives are not supported.');
 if(count===65535||size===0xffffffff||offset===0xffffffff)throw Error('ZIP64 archives are not supported. Use a regular ZIP or choose its extracted plugins.');
 if(offset+size>end)throw Error('Invalid ZIP directory bounds.');
 const result=[];let p=offset,total=0;
 for(let i=0;i<count;i++){
  if(p+46>offset+size||v.getUint32(p,true)!==0x02014b50)throw Error('Invalid ZIP directory entry.');
  const flags=v.getUint16(p+8,true),method=v.getUint16(p+10,true),crc=v.getUint32(p+16,true),compressed=v.getUint32(p+20,true),uncompressed=v.getUint32(p+24,true);
  const n=v.getUint16(p+28,true),extra=v.getUint16(p+30,true),comment=v.getUint16(p+32,true),disk=v.getUint16(p+34,true),local=v.getUint32(p+42,true);
  if(p+46+n+extra+comment>offset+size)throw Error('Truncated ZIP filename.');
  const path=new TextDecoder('utf-8').decode(bytes.subarray(p+46,p+46+n));p+=46+n+extra+comment;
  if(!(includeAssets?/\.(esp|esm|esl|nif|dds)$/i:/\.(esp|esm|esl)$/i).test(path))continue;
  if(disk||local===0xffffffff||compressed===0xffffffff||uncompressed===0xffffffff)throw Error('ZIP64 or split plugin entry is not supported.');
  if(flags&1)throw Error('Password-protected plugin entries are not supported.');
  if(method!==0&&method!==8)throw Error('ZIP compression method '+method+' is not supported. Use a standard ZIP.');
  if(uncompressed>limit||(total+=uncompressed)>512*1024*1024||result.length>=256)throw Error('ZIP plugin extraction limit exceeded (256 MB per plugin, 512 MB total, 256 plugins).');
  if(local+30>offset||v.getUint32(local,true)!==0x04034b50)throw Error('Invalid ZIP local header.');
  const start=local+30+v.getUint16(local+26,true)+v.getUint16(local+28,true);
  if(start+compressed>offset)throw Error('ZIP plugin data exceeds archive bounds.');
  let data=bytes.subarray(start,start+compressed);
  if(method===8){
   let stream;try{stream=new DecompressionStream('deflate-raw');}catch{throw Error('ZIP support needs a current Edge or Chrome browser.');}
   const reader=new Blob([data]).stream().pipeThrough(stream).getReader(),chunks=[];let length=0;
   try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>uncompressed){await reader.cancel();throw Error('ZIP entry exceeds its declared size.');}chunks.push(value);}}finally{reader.releaseLock();}
   data=new Uint8Array(length);let at=0;for(const c of chunks){data.set(c,at);at+=c.length;}
  }
  if(data.length!==uncompressed)throw Error('ZIP plugin size mismatch.');
  let check=0xffffffff;for(const byte of data){check^=byte;for(let j=0;j<8;j++)check=(check>>>1)^((check&1)?0xedb88320:0);}
  if(((check^0xffffffff)>>>0)!==crc)throw Error('ZIP plugin checksum mismatch.');
  const copy=data.slice();result.push({name:path.split(/[\\/]/).pop(),path,size:copy.length,arrayBuffer:async()=>copy.buffer});
 }
 return result;
}
root.KID={profiles,deviceProfiles,coverageKeywords,deviceKeywords,slotCategories,keywordRelevant,setKeyword,setCoverageProfile,setDeviceProfile,suggest,suggestSlots,applySlotSuggestions,parse,generate,zipFile,readZip};
})(typeof module!=='undefined'?module.exports:globalThis);
