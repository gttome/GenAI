/* Phase 1: standalone, dependency-free, source-grounded skills portfolio. */
(function () {
"use strict";
const data=window.SKILLS_DATA;
if(!data||!Array.isArray(data.domains)){document.body.textContent="Source catalog is unavailable.";return;}
const all=data.domains.flatMap(function(d){return d.skills.map(function(s){return Object.assign({domain:d.number,domainTitle:d.title},s);});});
const byId=new Map(all.map(function(s){return [s.id,s];}));
const priority=new Map(data.priorities.map(function(p){return [p.id,p.rank];}));
const colors=["#2475b7","#8059ae","#0f8e95","#4287bd","#8567b1","#b98d2c","#129ba2","#c56767","#a66996","#ac9036","#496d9d","#178d85","#8668b8"];
const $=function(id){return document.getElementById(id);};
function node(tag,cls,content){let x=document.createElement(tag);if(cls)x.className=cls;if(content!==undefined)x.textContent=content;return x;}
function makeOption(value,label){let x=document.createElement("option");x.value=value;x.textContent=label;return x;}
function pretty(id){let s=byId.get(id);return s?id+" · "+s.title:id;}
function download(filename,content,type){
 let url=URL.createObjectURL(new Blob([content],{type:type}));
 let link=document.createElement("a");link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();setTimeout(function(){URL.revokeObjectURL(url);},1000);
}
function setTab(tab,writeHash){
 document.querySelectorAll(".tab").forEach(function(b){let yes=b.dataset.tab===tab;b.classList.toggle("active",yes);if(yes){b.setAttribute("aria-current","page");}else{b.removeAttribute("aria-current");}});
 ["studio","map","readiness"].forEach(function(name){$("pane-"+name).hidden=name!==tab;});
 if(writeHash&&location.hash!=="#"+tab)history.replaceState(null,"","#"+tab);
}
document.querySelectorAll(".tab").forEach(function(b){b.addEventListener("click",function(){setTab(b.dataset.tab,true);});});
let initial=location.hash.replace("#","");
setTab(["studio","map","readiness"].includes(initial)?initial:"studio",false);
window.addEventListener("hashchange",function(){let tab=location.hash.replace("#","");if(["studio","map","readiness"].includes(tab))setTab(tab,false);});

/* Solution Studio: intended sequences, not executed toolchains. */
let selectedSteps=[],activeWorkflow=data.workflows[0];
data.workflows.forEach(function(w){$("recipeSelect").appendChild(makeOption(w.id,w.title));});
$("addSkillSelect").appendChild(makeOption("","Choose from 101 proposed skills"));
all.forEach(function(s){$("addSkillSelect").appendChild(makeOption(s.id,pretty(s.id)));});
function loadWorkflow(){
 let id=$("recipeSelect").value;
 activeWorkflow=data.workflows.find(function(w){return w.id===id;})||data.workflows[0];
 selectedSteps=activeWorkflow.skillIds.slice();
 $("goalInput").value=activeWorkflow.deliverable;
 renderSteps();
}
function moveStep(i,delta){let j=i+delta;if(j<0||j>=selectedSteps.length)return;let p=selectedSteps[i];selectedSteps[i]=selectedSteps[j];selectedSteps[j]=p;renderSteps();}
function removeStep(i){selectedSteps.splice(i,1);renderSteps();}
function stepButton(text,title,fn,disabled){
 let b=node("button","icon-button",text);b.type="button";b.title=title;b.setAttribute("aria-label",title);b.disabled=!!disabled;b.addEventListener("click",fn);return b;
}
function renderSteps(){
 let root=$("studioSteps");root.replaceChildren();
 selectedSteps.forEach(function(id,i){
 let s=byId.get(id);if(!s)return;
 let row=node("article","step-item");
 row.appendChild(node("span","step-number",String(i+1).padStart(2,"0")));
 let content=node("div","step-content"),h=node("h4","",id+" · "+s.title);content.appendChild(h);
 content.appendChild(node("p","",s.outcome));
 content.appendChild(node("p","acceptance","Acceptance: "+s.acceptance));
 let status=node("span","pill",s.status==="DOCUMENTED_ONLY"?"DOCUMENTED PROPOSAL":"PROPOSED ONLY");content.appendChild(status);
 row.appendChild(content);
 let controls=node("div","step-actions");
 controls.appendChild(stepButton("↑","Move "+id+" earlier",function(){moveStep(i,-1);},i===0));
 controls.appendChild(stepButton("↓","Move "+id+" later",function(){moveStep(i,1);},i===selectedSteps.length-1));
 controls.appendChild(stepButton("×","Remove "+id+" from blueprint",function(){removeStep(i);},false));
 row.appendChild(controls);root.appendChild(row);
 });
 if(!selectedSteps.length){root.appendChild(node("p","empty","Your blueprint is empty. Choose a template or add skills from the catalog."));}
 $("studioCount").textContent=selectedSteps.length+" selected skill"+(selectedSteps.length===1?"":"s")+" · "+(selectedSteps.some(function(id){return id==="S-11";})?"Includes one documented-only proposal":"All selected skills are proposal candidates");
 $("deliverable").textContent=($("goalInput").value.trim()||activeWorkflow.deliverable);
 $("acceptanceNotes").textContent=activeWorkflow.checks;
}
$("recipeSelect").value=activeWorkflow.id;
$("loadRecipe").addEventListener("click",loadWorkflow);
$("resetStudio").addEventListener("click",loadWorkflow);
$("goalInput").addEventListener("input",function(){$("deliverable").textContent=$("goalInput").value.trim()||activeWorkflow.deliverable;});
$("addSkillButton").addEventListener("click",function(){
 let id=$("addSkillSelect").value;if(!byId.has(id))return;
 if(!selectedSteps.includes(id))selectedSteps.push(id);
 renderSteps();$("addSkillSelect").value="";
});
function blueprint(){
 return {schema:"skills-portfolio-blueprint/1",createdAt:new Date().toISOString(),source:data.source,proposalOnly:true,authorizedForExecution:false,templateId:activeWorkflow.id,title:activeWorkflow.title,intendedResult:$("goalInput").value.trim()||activeWorkflow.deliverable,acceptanceNotes:activeWorkflow.checks,relationshipCaveat:"Curated sequence is illustrative; not verified prerequisites or an installed workflow.",steps:selectedSteps.map(function(id,i){let s=byId.get(id);return {sequence:i+1,id:id,title:s.title,domain:s.domain,proposedStatus:s.status,outcome:s.outcome,acceptance:s.acceptance};})};
}
function blueprintMarkdown(b){
 let lines=["# Proposed solution blueprint","","**Source:** "+b.source.title+", v"+b.source.version+" ("+b.source.date+")",
 "**Status:** illustrative only; no execution, installation, publication, or approval is implied.",
 "","## Intended result","",b.intendedResult,"","## Selected skill plan",""];
 b.steps.forEach(function(s){lines.push("### "+s.sequence+". "+s.id+" — "+s.title,"","- Domain: "+s.domain,"- Status: "+s.proposedStatus.replace("_"," "),"- Proposed output: "+s.outcome,"- Acceptance condition: "+s.acceptance,"");});
 lines.push("## Quality boundaries","",b.acceptanceNotes,"","## Governance","",
 "- This blueprint is not an automated skill or a validated dependency graph.",
 "- Obtain separate authorization before implementing, deploying, publishing or invoking any skill.",
 "- Retest outputs against actual evidence and preserve project-specific constraints.","");
 return lines.join("\n");
}
$("exportMarkdown").addEventListener("click",function(){download("skills-solution-blueprint.md",blueprintMarkdown(blueprint()),"text/markdown;charset=utf-8");});
$("exportJson").addEventListener("click",function(){download("skills-solution-blueprint.json",JSON.stringify(blueprint(),null,2)+"\n","application/json;charset=utf-8");});
loadWorkflow();

/* Source-labeled relationship explorer. */
$("mapDomain").appendChild(makeOption("0","All 13 domains"));
$("readinessDomain").appendChild(makeOption("0","All domains"));
data.domains.forEach(function(d){
 $("mapDomain").appendChild(makeOption(String(d.number),"D"+String(d.number).padStart(2,"0")+" · "+d.title));
 $("readinessDomain").appendChild(makeOption(String(d.number),"Domain "+d.number+" · "+d.title));
});
all.forEach(function(s){$("mapSkill").appendChild(makeOption(s.id,pretty(s.id)));});
let focusId="S-15";$("mapSkill").value=focusId;
const svgNS="http://www.w3.org/2000/svg",svg=$("network"),cx=480,cy=360;
function svgEl(tag,attrs){
 let e=document.createElementNS(svgNS,tag);
 Object.keys(attrs||{}).forEach(function(k){e.setAttribute(k,String(attrs[k]));});return e;
}
const coords=new Map();
data.domains.forEach(function(d,j){
 let main=(-Math.PI/2)+j*2*Math.PI/13, delta=(2*Math.PI/13)*.69;
 d.skills.forEach(function(s,i){
 let band=i%4,row=Math.floor(i/4);
 let theta=main+(band-1.5)*delta/4;
 let radius=174+row*47;
 coords.set(s.id,{x:cx+Math.cos(theta)*radius*1.31,y:cy+Math.sin(theta)*radius,domain:d.number});
 });
});
function sourceConnections(kind){
 const maps=kind==="shared"?data.relationships:data.workflows;
 const out=[];
 maps.forEach(function(group){
 let seq=group.skillIds;
 if(kind==="shared"){for(let i=1;i<seq.length;i++)out.push({a:seq[0],b:seq[i],group:group});}
 else{for(let i=1;i<seq.length;i++)out.push({a:seq[i-1],b:seq[i],group:group});}
 });
 return out;
}
function relationsForFocus(kind){
 let groups=kind==="shared"?data.relationships:data.workflows;
 return groups.filter(function(g){return g.skillIds.includes(focusId);}).map(function(g){
 let index=g.skillIds.indexOf(focusId);
 let linked=kind==="shared"?g.skillIds.filter(function(id){return id!==focusId;}):g.skillIds.filter(function(id,j){return Math.abs(j-index)===1;});
 return {name:kind==="shared"?g.name:g.title,explanation:kind==="shared"?g.method:"Adjacent steps in one illustrative workflow; not verified prerequisites.",linked:linked,group:g};
 });
}
function renderMap(){
 const mode=$("mapKind").value,domain=Number($("mapDomain").value),zoom=Number($("mapZoom").value)/100;
 $("zoomValue").textContent=Math.round(zoom*100)+"%";
 const w=960/zoom,h=720/zoom;svg.setAttribute("viewBox",(cx-w/2)+" "+(cy-h/2)+" "+w+" "+h);
 const groups=relationsForFocus(mode);
 let linkedIds=new Set(groups.flatMap(function(g){return g.linked;}));
 let visibleIds=new Set(all.filter(function(s){return domain===0||s.domain===domain;}).map(function(s){return s.id;}));
 visibleIds.add(focusId);linkedIds.forEach(function(id){visibleIds.add(id);});
 svg.replaceChildren();
 [160,240,318].forEach(function(r){
 let ring=svgEl("ellipse",{cx:cx,cy:cy,rx:r*1.29,ry:r,fill:"none",stroke:"#cfdee8","stroke-width":"1","stroke-dasharray":"3 9"});svg.appendChild(ring);
 });
 const edges=sourceConnections(mode);groups.forEach(function(group){group.linked.forEach(function(id){edges.push({a:focusId,b:id,group:group.group});});});const drawn=new Set();
 edges.forEach(function(e){
 if(!visibleIds.has(e.a)||!visibleIds.has(e.b))return;
 let key=e.a+"-"+e.b;
 if(drawn.has(key))return;drawn.add(key);
 let a=coords.get(e.a),b=coords.get(e.b);
 let hot=e.a===focusId||e.b===focusId||(linkedIds.has(e.a)&&linkedIds.has(e.b)&&mode==="shared");
 svg.appendChild(svgEl("line",{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:hot?"#d39f40":"#adc6d7","stroke-width":hot?3:1.3,"stroke-opacity":hot?.79:.17}));
 });
 data.domains.forEach(function(d,j){
 let angle=-Math.PI/2+j*2*Math.PI/13;
 let text=svgEl("text",{x:cx+Math.cos(angle)*438,y:cy+Math.sin(angle)*325,"font-size":"13","font-weight":"750",fill:"#486a82","text-anchor":"middle"});text.textContent="D"+String(d.number).padStart(2,"0");svg.appendChild(text);
 });
 all.forEach(function(s){
 if(!visibleIds.has(s.id))return;
 let p=coords.get(s.id),on=s.id===focusId,linked=linkedIds.has(s.id);
 let g=svgEl("g",{"data-id":s.id,role:"button",tabindex:"0","aria-label":"Select "+s.id+": "+s.title,style:"cursor:pointer"});
 let c=svgEl("circle",{cx:p.x,cy:p.y,r:on?14:(linked?10:6.6),fill:on?"#087e83":(linked?"#d09c3a":colors[s.domain-1]),"fill-opacity":on||linked?1:.58,stroke:"#fff","stroke-width":on?3:1.8});
 g.appendChild(c);
 let tip=svgEl("title");tip.textContent=s.id+" · "+s.title;g.appendChild(tip);
 if(on||linked){
 let t=svgEl("text",{x:p.x+12,y:p.y-12,"font-size":on?15:12,"font-weight":on?900:650,fill:"#193f5d"});t.textContent=s.id;g.appendChild(t);
 }
 g.addEventListener("click",function(){focusId=s.id;$("mapSkill").value=focusId;renderMap();});
 g.addEventListener("keydown",function(evt){if(evt.key==="Enter"||evt.key===" "){evt.preventDefault();focusId=s.id;$("mapSkill").value=focusId;renderMap();}});
 svg.appendChild(g);
 });
 const s=byId.get(focusId);
 $("focusTitle").textContent=s.id+" — "+s.title;
 $("focusDomain").textContent="Domain "+s.domain+" · "+s.domainTitle+" · "+(s.status==="DOCUMENTED_ONLY"?"Documented proposal":"Proposed only");
 $("focusOutcome").textContent=s.outcome;
 $("focusAcceptance").textContent=s.acceptance;
 let connections=$("mapConnections");connections.replaceChildren();
 if(!groups.length)connections.appendChild(node("p","small","No "+(mode==="shared"?"shared-method":"illustrative sequence")+" relationships for this skill in the source-backed map."));
 groups.forEach(function(group){
 let box=node("div","relation-group");
 box.appendChild(node("strong","",group.name));
 box.appendChild(node("p","",group.explanation));
 group.linked.forEach(function(id){
 let btn=node("button","",id+" · "+byId.get(id).title);btn.type="button";
 btn.addEventListener("click",function(){focusId=id;$("mapSkill").value=id;renderMap();});
 box.appendChild(btn);
 });
 connections.appendChild(box);
 });
}
$("mapSkill").addEventListener("change",function(){focusId=$("mapSkill").value;renderMap();});
$("mapDomain").addEventListener("change",renderMap);
$("mapKind").addEventListener("change",renderMap);
$("mapZoom").addEventListener("input",renderMap);
renderMap();

/* Evidence readiness, explicitly limited to catalog-supplied statuses. */
const readinessStatuses=[
 ["PROPOSED","Proposed only",100],
 ["DOCUMENTED_ONLY","Documented proposal",1],
 ["TESTED","Tested as skill",0],
 ["IMPLEMENTED","Implemented as skill",0],
 ["VERIFIED","Independently verified",0]
];
readinessStatuses.forEach(function(e){
 let box=node("div","metric-box");box.appendChild(node("strong","",String(e[2])));box.appendChild(node("span","",e[1]));$("readinessMetrics").appendChild(box);
});
data.domains.forEach(function(d){
 let wrap=node("div","domain-bar"),row=node("div","domain-bar-top");
 row.appendChild(node("span","",String(d.number).padStart(2,"0")+" · "+d.title));
 row.appendChild(node("strong","",String(d.count)));
 wrap.appendChild(row);let track=node("div","track"),fill=node("div","fill");fill.style.width=(d.count/18*100)+"%";track.appendChild(fill);wrap.appendChild(track);$("domainBars").appendChild(wrap);
});
let lastFiltered=all;
function renderReadiness(){
 const query=$("readinessQuery").value.trim().toLowerCase(), domain=Number($("readinessDomain").value), status=$("readinessStatus").value;
 let filtered=all.filter(function(s){
 return (domain===0||s.domain===domain)&&(status==="all"||s.status===status)&&
 (!query||[s.id,s.title,s.outcome,s.acceptance,s.domainTitle].join(" ").toLowerCase().includes(query));
 });
 lastFiltered=filtered;
 $("readinessCount").textContent=filtered.length+" of 101 source candidates shown";
 let tbody=$("readinessRows");tbody.replaceChildren();
 filtered.forEach(function(s){
 let tr=node("tr");
 tr.appendChild(node("td","",s.id));
 let name=node("td");name.appendChild(node("strong","",s.title));name.appendChild(node("div","small","Domain "+s.domain));tr.appendChild(name);
 let state=node("td"),pill=node("span","status-label"+(s.status==="DOCUMENTED_ONLY"?" documented":""),s.status==="DOCUMENTED_ONLY"?"DOCUMENTED ONLY":"PROPOSED");state.appendChild(pill);tr.appendChild(state);
 tr.appendChild(node("td","",s.status==="DOCUMENTED_ONLY"?"Catalog documents a separate proposal; no skill test evidence.":"Catalog entry only; no test or implementation evidence."));
 tbody.appendChild(tr);
 });
 if(!filtered.length){let tr=node("tr"),td=node("td","", "No records match this filter; the source has no candidates in this status.");td.colSpan=4;tr.appendChild(td);tbody.appendChild(tr);}
}
["readinessQuery","readinessDomain","readinessStatus"].forEach(function(id){$(id).addEventListener(id==="readinessQuery"?"input":"change",renderReadiness);});
function csv(v){return '"'+String(v).replace(/"/g,'""')+'"';}
$("downloadCsv").addEventListener("click",function(){
 let rows=[["ID","Skill title","Domain","Catalog status","Evidence statement","Source"]];
 lastFiltered.forEach(function(s){rows.push([s.id,s.title,"Domain "+s.domain,s.status,s.status==="DOCUMENTED_ONLY"?"Documented proposal per catalog; not tested":"Candidate documented in catalog only","Skills_Catalog_101.md v1.1 (2026-10-15)"]);});
 download("skills-readiness-snapshot.csv",rows.map(function(cols){return cols.map(csv).join(",");}).join("\r\n")+"\r\n","text/csv;charset=utf-8");
});
renderReadiness();
})();
