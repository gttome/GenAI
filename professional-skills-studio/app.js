/* Professional Skills Studio · Phase 1 · source-derived, offline-only application */
(()=>{
'use strict';
const data=window.PHASE1_DATA;
if(!data){document.body.textContent='The offline catalog data was not loaded.';return;}
const $=(id)=>document.getElementById(id),skills=data.skills,byId=new Map(skills.map(s=>[s.id,s])),priority=new Map(data.priorities.map(p=>[p.id,p.rank]));
const colors=['#2374b3','#8768ae','#119296','#3b83bd','#8868ac','#b88c32','#1ca1a5','#d46c79','#a66b98','#9e8e4a','#536eab','#249084','#9873b9'];
function el(tag,cls,txt){let x=document.createElement(tag);if(cls)x.className=cls;if(txt!==undefined)x.textContent=txt;return x}
function option(value,text){let x=el('option','',text);x.value=value;return x}
function skillLabel(s){return `${s.id} · ${s.name}`}
function fileSave(name,content,type){const u=URL.createObjectURL(new Blob([content],{type}));let a=el('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1500)}
function section(name,saveHash=true){for(let s of ['studio','map','readiness','catalog','gallery']){$(s).hidden=s!==name}for(let b of document.querySelectorAll('.nav-button')){b.classList.toggle('active',b.dataset.section===name);if(b.dataset.section===name)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')}if(saveHash&&location.hash!==`#${name}`)history.replaceState(null,'',`#${name}`)}
for(let b of document.querySelectorAll('.nav-button'))b.addEventListener('click',()=>section(b.dataset.section));
window.addEventListener('hashchange',()=>{let n=location.hash.slice(1);if(['studio','map','readiness','catalog','gallery'].includes(n))section(n,false)});
section(['studio','map','readiness','catalog','gallery'].includes(location.hash.slice(1))?location.hash.slice(1):'gallery',false);

/* 01. Solution studio: editable plans. */
let recipe=data.workflows[0],chosen=[];
for(let w of data.workflows)$('recipe').appendChild(option(w.id,w.title));
$('newSkill').appendChild(option('','Choose one of 101 candidate skills'));
for(let s of skills)$('newSkill').appendChild(option(s.id,skillLabel(s)));
function loadRecipe(){recipe=data.workflows.find(w=>w.id===$('recipe').value)||data.workflows[0];chosen=[...recipe.skillIds];$('goal').value=recipe.outcome;renderPlan()}
function reorder(i,delta){let j=i+delta;if(j<0||j>=chosen.length)return;[chosen[i],chosen[j]]=[chosen[j],chosen[i]];renderPlan()}
function iconButton(text,label,handler,disabled=false){let b=el('button','icon-btn',text);b.type='button';b.title=label;b.setAttribute('aria-label',label);b.disabled=disabled;b.addEventListener('click',handler);return b}
function renderPlan(){let root=$('steps');root.replaceChildren();for(let [i,id] of chosen.entries()){
 const s=byId.get(id),row=el('article','step'),n=el('span','step-num',String(i+1).padStart(2,'0')),body=el('div','step-body');body.appendChild(el('h4','',skillLabel(s)));body.appendChild(el('p','',s.outcome));body.appendChild(el('p','accepted','Acceptance: '+s.acceptance));body.appendChild(el('span',s.status==='DOCUMENTED_ONLY'?'chip gold':'chip',s.status==='DOCUMENTED_ONLY'?'DOCUMENTED PROPOSAL':'PROPOSED'));row.append(n,body);
 const actions=el('div','actions');actions.append(iconButton('↑','Move '+id+' up',()=>reorder(i,-1),i===0),iconButton('↓','Move '+id+' down',()=>reorder(i,1),i===chosen.length-1),iconButton('×','Remove '+id,()=>{chosen.splice(i,1);renderPlan()}));row.appendChild(actions);root.appendChild(row)
 }if(!chosen.length)root.appendChild(el('div','empty','No skills yet. Load a reference workflow or add a skill.'));
 $('stepCount').textContent=chosen.length+' selected skills · '+(chosen.includes('S-11')?'includes documented-only proposal S-11':'planning candidates only');$('resultText').textContent=$('goal').value.trim()||recipe.outcome;$('checksText').textContent=recipe.acceptance;
}
$('recipe').value=recipe.id;$('loadRecipe').onclick=loadRecipe;$('resetPlan').onclick=loadRecipe;
$('goal').addEventListener('input',()=>{$('resultText').textContent=$('goal').value.trim()||recipe.outcome});
$('addSkill').onclick=()=>{let id=$('newSkill').value;if(byId.has(id)&&!chosen.includes(id))chosen.push(id);$('newSkill').value='';renderPlan()};
function blueprint(){return {schema:'skills-portfolio-phase1-blueprint/1.0',generatedAt:new Date().toISOString(),source:data.source,status:'PROPOSED_ONLY',authorizedForExecution:false,workflowTemplate:recipe.id,workflowTitle:recipe.title,intendedResult:$('goal').value.trim()||recipe.outcome,acceptance:recipe.acceptance,dependencyNote:'Illustrative workflow sequence: not verified prerequisites or running skill implementations.',steps:chosen.map((id,i)=>{let s=byId.get(id);return {order:i+1,id,title:s.name,domain:s.domain,status:s.status,outcome:s.outcome,acceptance:s.acceptance}})}}
function markdown(b){return [`# ${b.workflowTitle}`,'','**Status:** Planning blueprint only · Not authorized for execution',`**Source:** ${b.source.title} v${b.source.version}, ${b.source.date}`,'','## Intended result','',b.intendedResult,'','## Candidate skills','',...b.steps.flatMap(s=>[`### ${s.order}. ${s.id} — ${s.title}`,'',`- Domain: ${s.domain}`,`- Proposed output: ${s.outcome}`,`- Acceptance: ${s.acceptance}`,`- Status: ${s.status}`,'']),'## Quality and safety conditions','',b.acceptance,'','**Important:** Sequences are illustrative, not validated prerequisites. This blueprint does not install or execute any skill, mutate a repository or authorize publication.',''].join('\n')}
$('saveMd').onclick=()=>fileSave('proposed-skills-blueprint.md',markdown(blueprint()),'text/markdown;charset=utf-8');$('saveJson').onclick=()=>fileSave('proposed-skills-blueprint.json',JSON.stringify(blueprint(),null,2)+'\n','application/json;charset=utf-8');
loadRecipe();

/* 02. Relationship graph. Eight reusable-method groups are grounded in the source; six sequences are illustrative. */
for(let s of skills)$('focus').appendChild(option(s.id,skillLabel(s)));
for(let key of ['scope','filterDomain','catalogDomain']){$(key).appendChild(option('0','All 13 domains'));for(let d of data.domains)$(key).appendChild(option(String(d.number),`D${String(d.number).padStart(2,'0')} · ${d.title}`))}
let focusId='S-15';$('focus').value=focusId;
const graph=$('graph'),NS='http://www.w3.org/2000/svg',xy=new Map();
function svg(tag,props={}){let o=document.createElementNS(NS,tag);for(let [k,v] of Object.entries(props))o.setAttribute(k,String(v));return o}
/* Place all skills in 13 radial sectors, with 101 keyboard-selectable nodes. */
for(let [j,d] of data.domains.entries()){const angle=-Math.PI/2+(j+.05)*2*Math.PI/13;for(let [i,s] of d.skills.entries()){
 const spread=(i-(d.skills.length-1)/2)*(.58*2*Math.PI/13)/Math.max(5,d.skills.length/1.5),r=205+(i%3)*50,phi=angle+spread;xy.set(s.id,{x:500+Math.cos(phi)*r*1.26,y:370+Math.sin(phi)*r,domain:d.number})}}
function groups(){return $('linkType').value==='shared'?data.shared:data.workflows}
function relatedGroups(){return groups().filter(g=>g.skillIds.includes(focusId))}
function selectFocus(id){focusId=id;$('focus').value=id;renderGraph()}
function renderGraph(){let current=byId.get(focusId),grp=relatedGroups(),connected=new Set(grp.flatMap(g=>g.skillIds.filter(id=>id!==focusId))),scope=Number($('scope').value),shown=new Set(skills.filter(s=>!scope||s.domain===scope).map(s=>s.id));shown.add(focusId);for(let id of connected)shown.add(id);
 let z=Number($('zoom').value)/100;$('zoomOut').textContent=Math.round(z*100)+'%';let W=1000/z,H=740/z;graph.setAttribute('viewBox',`${500-W/2} ${370-H/2} ${W} ${H}`);graph.replaceChildren();
 for(let r of [180,260,345])graph.appendChild(svg('ellipse',{cx:500,cy:370,rx:r*1.25,ry:r,fill:'none',stroke:'#d6e3ec','stroke-width':1,'stroke-dasharray':'3 9'}));
 let edges=[],mode=$('linkType').value;
 for(let g of groups()){let seq=g.skillIds;if(mode==='shared'){for(let i=1;i<seq.length;i++)edges.push([seq[0],seq[i]])}else{for(let i=1;i<seq.length;i++)edges.push([seq[i-1],seq[i]])}}
 let recorded=new Set();for(let [a,b] of edges){if(!shown.has(a)||!shown.has(b))continue;let key=a+'-'+b;if(recorded.has(key))continue;recorded.add(key);let p=xy.get(a),q=xy.get(b),lit=(a===focusId||b===focusId);graph.appendChild(svg('line',{x1:p.x,y1:p.y,x2:q.x,y2:q.y,stroke:lit?'#db9c31':'#aabfcf','stroke-width':lit?3:1.3,opacity:lit?.92:.28}))}
 for(let [i,d] of data.domains.entries()){let a=-Math.PI/2+(i+.05)*2*Math.PI/13,t=svg('text',{x:500+Math.cos(a)*480,y:370+Math.sin(a)*353,'text-anchor':'middle','font-size':13,'font-weight':800,fill:'#53728a'});t.textContent=`D${String(d.number).padStart(2,'0')}`;graph.appendChild(t)}
 for(let s of skills){if(!shown.has(s.id))continue;let p=xy.get(s.id),on=s.id===focusId,related=connected.has(s.id),g=svg('g',{tabindex:'0',role:'button','aria-label':'Select '+skillLabel(s),style:'cursor:pointer'}),circle=svg('circle',{cx:p.x,cy:p.y,r:on?14:related?10:7,fill:on?'#009791':related?'#c99031':colors[s.domain-1],stroke:'white','stroke-width':2,opacity:on||related?1:.74});g.appendChild(circle);
 let tip=svg('title');tip.textContent=skillLabel(s);g.appendChild(tip);if(on||related){let t=svg('text',{x:p.x+12,y:p.y-13,'font-size':on?15:12,'font-weight':on?900:680,fill:'#163f60'});t.textContent=s.id;g.appendChild(t)}
 g.onclick=()=>selectFocus(s.id);g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectFocus(s.id)}});graph.appendChild(g)}
 $('focusedTitle').textContent=skillLabel(current);$('focusedDomain').textContent=`Domain ${current.domain} · ${current.domainTitle} · ${current.status==='DOCUMENTED_ONLY'?'Documented proposal':'Proposed'}`;$('focusedOutcome').textContent=current.outcome;$('focusedGate').textContent=current.acceptance;
 let list=$('related');list.replaceChildren();if(!grp.length)list.appendChild(el('div','hint','No connections of this type are listed for this skill.'));
 for(let g of grp){let panel=el('div','relbox');panel.appendChild(el('strong','',g.title));panel.appendChild(el('p','',mode==='shared'?g.explanation:'Illustrative workflow sequence: not a verified prerequisite graph.'));
 let i=g.skillIds.indexOf(focusId),neighbors=mode==='shared'?g.skillIds.filter(id=>id!==focusId):g.skillIds.filter((id,k)=>Math.abs(k-i)===1);
 for(let id of neighbors){let button=el('button','',`${id} · ${byId.get(id).name}`);button.type='button';button.onclick=()=>selectFocus(id);panel.appendChild(button)}list.appendChild(panel)}
}
$('focus').onchange=()=>selectFocus($('focus').value);for(let id of ['scope','linkType','zoom'])$(id).addEventListener(id==='zoom'?'input':'change',renderGraph);renderGraph();

/* 03. Readiness ledger: no fabricated live status. */
for(let [name,value] of [['Proposed only',100],['Documented proposal',1],['Tested as skill',0],['Implemented',0],['Verified independently',0]]){let card=el('div','metric-card');card.append(el('b','',String(value)),el('span','',name));$('statusMetrics').appendChild(card)}
for(let d of data.domains){let w=el('div','barbox'),head=el('div','barhead');head.append(el('span','',String(d.number).padStart(2,'0')+' · '+d.title),el('strong','',String(d.count)));let track=el('div','track'),fill=el('div','fill');fill.style.width=(100*d.count/18)+'%';track.appendChild(fill);w.append(head,track);$('bars').appendChild(w)}
let filtered=skills;
function renderRecords(){const q=$('q').value.toLowerCase().trim(),domain=Number($('filterDomain').value),status=$('filterStatus').value;
 filtered=skills.filter(s=>(!domain||s.domain===domain)&&(status==='all'||s.status===status)&&(!q||[s.id,s.name,s.outcome,s.acceptance,s.domainTitle].join(' ').toLowerCase().includes(q)));
 $('resultsNum').textContent=`${filtered.length} of 101 catalog entries shown`;
 let tbody=$('records');tbody.replaceChildren();for(let s of filtered){let row=el('tr');row.appendChild(el('td','',s.id));let title=el('td');title.append(el('strong','',s.name),el('div','hint',`Domain ${s.domain}`));row.appendChild(title);let statusCell=el('td');statusCell.appendChild(el('span','state'+(s.status==='DOCUMENTED_ONLY'?' documented':''),s.status==='DOCUMENTED_ONLY'?'DOCUMENTED ONLY':'PROPOSED'));row.appendChild(statusCell);row.appendChild(el('td','',s.status==='DOCUMENTED_ONLY'?'Existing written proposal; no test/activation evidence.':'Candidate catalog entry; no runtime test evidence.'));tbody.appendChild(row)}if(!filtered.length){let tr=el('tr'),td=el('td','','No matching candidates for this filter.');td.colSpan=4;tr.appendChild(td);tbody.appendChild(tr)}}
for(let id of ['q','filterDomain','filterStatus'])$(id).addEventListener(id==='q'?'input':'change',renderRecords);
function csv(x){return '"'+String(x).replace(/"/g,'""')+'"'}
$('downloadCsv').onclick=()=>{let lines=[['ID','Title','Domain','Status','Evidence statement','Source']];for(let s of filtered)lines.push([s.id,s.name,s.domain,s.status,s.status==='DOCUMENTED_ONLY'?'Written proposal only, no skill execution evidence':'Candidate catalog record only','Skills_Catalog_101.md v1.1 2026-10-15']);fileSave('101-skills-readiness.csv',lines.map(r=>r.map(csv).join(',')).join('\r\n')+'\r\n','text/csv;charset=utf-8')};renderRecords();

/* 04. Full skill catalog, not a separate source. */
function renderCatalog(){const q=$('catalogQuery').value.trim().toLowerCase(),domain=Number($('catalogDomain').value),top=$('topOnly').checked;
 let arr=skills.filter(s=>(!domain||s.domain===domain)&&(!top||priority.has(s.id))&&(!q||[s.name,s.id,s.outcome,s.acceptance,s.domainTitle].join(' ').toLowerCase().includes(q)));$('catalogCount').textContent=`Showing ${arr.length} of 101 proposed skills`;
 let root=$('cards');root.replaceChildren();if(!arr.length)root.appendChild(el('p','empty','No skills match these filters.'));
 for(let s of arr){let card=el('article','skill-card'),head=el('div');head.appendChild(el('span','skill-id',s.id));if(priority.has(s.id))head.appendChild(el('span','priority-tag',` TOP ${priority.get(s.id)}`));card.appendChild(head);card.appendChild(el('h3','',s.name));card.appendChild(el('p','domainline',`Domain ${s.domain} · ${s.domainTitle}`));card.appendChild(el('p','',s.outcome));let details=el('details'),summary=el('summary','','Acceptance condition');details.appendChild(summary);details.appendChild(el('p','',s.acceptance));card.appendChild(details);
 let actions=el('div','inline'),status=el('span','state'+(s.status==='DOCUMENTED_ONLY'?' documented':''),s.status==='DOCUMENTED_ONLY'?'DOCUMENTED PROPOSAL':'PROPOSED');actions.appendChild(status);let btn=el('button','add-btn','+ Add to Studio');btn.type='button';btn.onclick=()=>{if(!chosen.includes(s.id))chosen.push(s.id);renderPlan();section('studio');window.scrollTo({top:0,behavior:'smooth'})};actions.appendChild(btn);card.appendChild(actions);root.appendChild(card)}}
for(let id of ['catalogQuery','catalogDomain','topOnly'])$(id).addEventListener(id==='catalogQuery'?'input':'change',renderCatalog);renderCatalog();


/* 05. Newly drawn source-grounded visual infographics (zero paid APIs). */
const gallery=Array.isArray(window.SKILLS_GALLERY)?window.SKILLS_GALLERY:[];
const galleryById=new Map(gallery.map((g,i)=>[g.id,{...g,index:i}]));
let visibleGallery=gallery.slice(),currentGalleryIndex=0,zoomFactor=1,zoomMode='fit';
const imgDialog=$('imageViewer'),imgView=$('viewerImage'),imgArea=$('viewerScroll');
const blobUrls=new Map();
function originalUrl(item){
  if(!item)return '#';
  const embedded=window.SKILLS_GALLERY_FILES;
  if(!embedded||!embedded[item.id])return item.src;
  if(blobUrls.has(item.id))return blobUrls.get(item.id);
  const raw=embedded[item.id];
  // Convert in moderate-size chunks to avoid large intermediate binary strings.
  const parts=[];
  for(let pos=0;pos<raw.length;pos+=65536){const chunk=atob(raw.slice(pos,pos+65536));const bytes=new Uint8Array(chunk.length);for(let i=0;i<chunk.length;i++)bytes[i]=chunk.charCodeAt(i);parts.push(bytes)}
  const url=URL.createObjectURL(new Blob(parts,{type:'image/png'}));blobUrls.set(item.id,url);return url;
}
function galleryCard(item){
  const card=el('article','gallery-card');
  const preview=el('button','gallery-preview');preview.type='button';preview.setAttribute('aria-label','View full-size '+item.title);
  const img=el('img');img.src=item.thumb;img.loading='lazy';img.decoding='async';img.alt='Preview of '+item.title;preview.appendChild(img);
  preview.appendChild(el('span','gallery-type'+(item.category==='Executive'?' executive':''),item.category==='Domain'?`DOMAIN ${item.number}`:'EXECUTIVE GRAPHIC'));
  preview.addEventListener('click',()=>openGallery(item.id));card.appendChild(preview);
  const body=el('div','gallery-card-body');body.appendChild(el('h3','',item.title));
  const meta=el('div','gallery-card-meta');meta.appendChild(el('span','',`${item.width.toLocaleString()} × ${item.height.toLocaleString()} px`));
  if(item.ids)meta.appendChild(el('span','',item.ids));
  body.appendChild(meta);card.appendChild(body);
  const actions=el('div','gallery-actions'),open=el('button','btn outline','View full size');open.type='button';open.addEventListener('click',()=>openGallery(item.id));actions.appendChild(open);
  const dl=el('button','btn primary','Download PNG');dl.type='button';dl.addEventListener('click',()=>downloadGallery(item));actions.appendChild(dl);
  card.appendChild(actions);return card;
}
function renderGallery(){
 const which=$('galleryFilter').value,query=$('gallerySearch').value.trim().toLowerCase();
 visibleGallery=gallery.filter(g=>(which==='all'||g.category===which)&&(!query||[g.title,g.number,g.ids,g.category].join(' ').toLowerCase().includes(query)));
 $('galleryCount').textContent=`${visibleGallery.length} of ${gallery.length} graphics`;
 const root=$('galleryCards');root.replaceChildren();
 for(const item of visibleGallery)root.appendChild(galleryCard(item));
 if(!visibleGallery.length)root.appendChild(el('p','empty','No graphics match your search. Clear the search or switch collections.'));
}
function currentItem(){return visibleGallery[currentGalleryIndex]||gallery[0]}
function downloadGallery(item){
 const link=document.createElement('a');link.download=item.file;link.href=originalUrl(item);document.body.appendChild(link);link.click();link.remove();
}
function applyZoom(){
 const item=currentItem();if(!item)return;
 const limitW=Math.max(160,imgArea.clientWidth-30),limitH=Math.max(160,imgArea.clientHeight-30);
 const fit=Math.min(limitW/item.width,limitH/item.height,1);
 const effective=zoomMode==='actual'?1:fit*zoomFactor;
 imgView.style.width=Math.round(item.width*effective)+'px';
 imgView.style.height=Math.round(item.height*effective)+'px';
 $('viewerZoom').textContent=zoomMode==='actual'?'100%':zoomFactor===1?'Fit':`${Math.round(zoomFactor*100)}% fit`;
}
function showGallery(index){
 if(!visibleGallery.length)return;
 currentGalleryIndex=(index+visibleGallery.length)%visibleGallery.length;const item=currentItem();
 const url=originalUrl(item);imgView.src=url;imgView.alt='Full-resolution '+item.title;
 $('viewerTitle').textContent=item.title;
 $('viewerCounter').textContent=`IMAGE ${currentGalleryIndex+1} OF ${visibleGallery.length} · ${item.category.toUpperCase()}`;
 $('viewerMeta').textContent=`Original PNG · ${item.width.toLocaleString()} × ${item.height.toLocaleString()} pixels${item.ids?' · '+item.ids:''}`;
 for(const id of ['viewerDownload','viewerOriginal'])$(id).href=url;
 $('viewerDownload').download=item.file;
 zoomMode='fit';zoomFactor=1;
 imgArea.scrollTo(0,0);requestAnimationFrame(applyZoom);
}
function openGallery(id){
 const match=visibleGallery.findIndex(item=>item.id===id);
 if(match<0)return;
 showGallery(match);
 if(!imgDialog.open)imgDialog.showModal();
 requestAnimationFrame(applyZoom);
}
function navigateGallery(delta){showGallery(currentGalleryIndex+delta)}
function zoomGallery(multiplier){
 const item=currentItem();if(!item)return;
 if(zoomMode==='actual'){
  const fit=Math.min((imgArea.clientWidth-30)/item.width,(imgArea.clientHeight-30)/item.height,1);
  zoomFactor=Math.max(1,1/fit)*multiplier;zoomMode='fit';
 }else zoomFactor=Math.max(.6,Math.min(6,zoomFactor*multiplier));
 applyZoom();
}
$('galleryFilter').addEventListener('change',renderGallery);$('gallerySearch').addEventListener('input',renderGallery);
$('viewerClose').addEventListener('click',()=>imgDialog.close());
$('viewerPrevious').addEventListener('click',()=>navigateGallery(-1));$('viewerNext').addEventListener('click',()=>navigateGallery(1));
$('viewerFit').addEventListener('click',()=>{zoomMode='fit';zoomFactor=1;applyZoom()});
$('viewerActual').addEventListener('click',()=>{zoomMode='actual';zoomFactor=1;applyZoom()});
$('viewerMinus').addEventListener('click',()=>zoomGallery(.75));$('viewerPlus').addEventListener('click',()=>zoomGallery(1.4));
imgDialog.addEventListener('click',(e)=>{if(e.target===imgDialog)imgDialog.close()});
document.addEventListener('keydown',e=>{
 if(!imgDialog.open)return;
 const t=e.target;if(t&&['INPUT','TEXTAREA','SELECT'].includes(t.tagName))return;
 if(e.key==='ArrowLeft'){e.preventDefault();navigateGallery(-1)}
 else if(e.key==='ArrowRight'){e.preventDefault();navigateGallery(1)}
 else if(e.key==='+'||e.key==='='){e.preventDefault();zoomGallery(1.4)}
 else if(e.key==='-'){e.preventDefault();zoomGallery(.75)}
 else if(e.key==='0'){e.preventDefault();zoomMode='fit';zoomFactor=1;applyZoom()}
});
window.addEventListener('resize',()=>{if(imgDialog.open)applyZoom()});
window.addEventListener('pagehide',()=>{for(const url of blobUrls.values())URL.revokeObjectURL(url);blobUrls.clear()});
renderGallery();

})();
