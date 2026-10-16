import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const folder = dirname(dirname(fileURLToPath(import.meta.url)));
const html = readFileSync(join(folder, "index.html"), "utf8");
const js = readFileSync(join(folder, "app.js"), "utf8");
const data = JSON.parse(readFileSync(join(folder, "catalog.json"), "utf8"));

// Deliberately small DOM implementation for OFFLINE functional tests.
// This is NOT a claim of cross-browser, pixel or accessibility certification.
class Element {
  constructor(tag) {
    this.tag = tag; this.children = []; this.events = {}; this.dataset = {};
    this.attributes = {}; this.style = {}; this.textContent = ""; this.value = "";
    this.hidden = false; this.disabled = false;
    this.classList = { add() {}, remove() {}, toggle() {} };
  }
  appendChild(child) {
    this.children.push(child);
    if (child.tag === "option" && !this.value) this.value = child.value;
    return child;
  }
  replaceChildren(...children) { this.children = children; }
  setAttribute(k,v) { this.attributes[k] = v; }
  removeAttribute(k) { delete this.attributes[k]; }
  addEventListener(name, cb) { this.events[name] = cb; }
  remove() {}
  click() { if(this.events.click) this.events.click(); }
}
function mount() {
  const elements = {};
  for(const match of html.matchAll(/id="([^"]+)"/g)) elements[match[1]] = new Element("div");
  // Browser <select> elements initialize from their first <option>, not an empty value.
  elements.readinessStatus.value = "all";
  elements.mapKind.value = "shared";
  elements.mapZoom.value = "100";
  elements.readinessDomain.value = "0";
  elements.mapDomain.value = "0";
  const tabs = ["studio","map","readiness"].map(tab => Object.assign(new Element("button"), {dataset:{tab}}));
  const doc = {
    body:new Element("body"),
    getElementById(id) { if(!elements[id]) throw Error("Missing HTML element: "+id); return elements[id]; },
    querySelectorAll(s) { return s === ".tab" ? tabs : []; },
    createElement(tag) { return new Element(tag); },
    createElementNS(_,tag) { return new Element(tag); }
  };
  const location = {hash:""};
  const history = {replaceState(_state,_unused,hash){location.hash=hash;}};
  let downloads = [];
  doc.createElement = tag => {
    const el = new Element(tag);
    if(tag === "a") el.click = () => {downloads.push(el.download);};
    return el;
  };
  const fakeURL = {createObjectURL(){return "blob:local";},revokeObjectURL(){}};
  const fakeBlob = function(parts){this.parts=parts;};
  new Function("document","window","location","history","URL","Blob","setTimeout",js)(
    doc, {SKILLS_DATA:data,addEventListener(){}},location,history,fakeURL,fakeBlob,fn=>fn()
  );
  function change(id,value,type="change") {
    elements[id].value=value;
    assert.equal(typeof elements[id].events[type],"function","Missing "+id+" "+type+" event listener");
    elements[id].events[type]();
  }
  return {el:elements,change,tabs,downloads};
}
test("three accessible sections initialize from a single 101-skill source", () => {
 const {el} = mount();
 assert.equal(el.studioSteps.children.length,data.workflows[0].skillIds.length);
 assert.equal(el.network.children.filter(x=>x.attributes["data-id"]).length,101);
 assert.equal(el.readinessRows.children.length,101);
 assert.deepEqual(el.readinessMetrics.children.map(x=>Number(x.children[0].textContent)),[100,1,0,0,0]);
 assert.equal(el.focusTitle.textContent,"S-15 — Visible Pixel Inspector");
});
test("Solution Studio composes, reorders, removes and exports local blueprints", () => {
 const {el,downloads} = mount();
 el.recipeSelect.value="W-2";el.loadRecipe.click();
 assert.equal(el.studioSteps.children.length,8);
 el.addSkillSelect.value="S-101";el.addSkillButton.click();
 assert.equal(el.studioSteps.children.length,9);
 el.studioSteps.children[0].children[2].children[1].click();
 assert.ok(el.studioSteps.children[0].children[1].children[0].textContent.startsWith("S-12"));
 el.studioSteps.children[0].children[2].children[2].click();
 assert.equal(el.studioSteps.children.length,8);
 el.exportMarkdown.click();el.exportJson.click();
 assert.deepEqual(downloads,["skills-solution-blueprint.md","skills-solution-blueprint.json"]);
});
test("map offers relationships and domain focus without external services", () => {
 const {el,change} = mount();
 change("mapSkill","S-11");
 assert.equal(el.focusTitle.textContent,"S-11 — Premium Mechanism Illustration");
 assert.ok(el.mapConnections.children.length>0);
 change("mapKind","workflow");
 assert.ok(el.mapConnections.children.length>0);
 change("mapZoom","130","input");
 assert.equal(el.zoomValue.textContent,"130%");
 change("mapDomain","13");
 assert.ok(el.network.children.filter(x=>x.attributes["data-id"]).length>=11);
});
test("readiness dashboard distinguishes proposed from documented and absence of evidence", () => {
 const {el,change,downloads} = mount();
 change("readinessStatus","DOCUMENTED_ONLY");
 assert.equal(el.readinessRows.children.length,1);
 assert.equal(el.readinessRows.children[0].children[0].textContent,"S-11");
 change("readinessStatus","TESTED");
 assert.match(el.readinessRows.children[0].children[0].textContent,/No records match/);
 change("readinessStatus","all");
 change("readinessDomain","13");
 assert.equal(el.readinessRows.children.length,11);
 change("readinessDomain","0");
 change("readinessQuery","pixel","input");
 assert.ok(el.readinessRows.children.length>0);
 el.downloadCsv.click();
 assert.ok(downloads.includes("skills-readiness-snapshot.csv"));
});
