import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const folder = dirname(dirname(fileURLToPath(import.meta.url)));
const c = JSON.parse(readFileSync(join(folder, "catalog.json"), "utf8"));
const ids = c.domains.flatMap(d => d.skills.map(s => s.id));
const skillById = new Map(c.domains.flatMap(d => d.skills.map(s => [s.id, s])));
const expectedCounts = [10,8,12,12,6,7,7,6,5,5,5,7,11];

test("original source inventory is intact", () => {
 assert.equal(c.source.version, "1.1");
 assert.equal(c.source.date, "2026-10-15");
 assert.equal(c.domains.length, 13);
 assert.deepEqual(c.domains.map(d => d.count), expectedCounts);
 assert.equal(ids.length, 101);
 assert.equal(new Set(ids).size, 101);
 for(let i=1;i<=101;i++) assert.ok(ids.includes("S-"+String(i).padStart(2,"0")));
 for(const d of c.domains) {
  assert.equal(d.count,d.skills.length);
  for(const s of d.skills) {
   assert.ok(s.title && s.outcome && s.acceptance, s.id);
   assert.equal(s.evidence, "catalog-v1.1");
  }
 }
});
test("original HTML5 18-skill family is split without renumbering", () => {
 assert.deepEqual(c.domains[11].skills.map(s=>s.id),Array.from({length:7},(_,i)=>"S-"+(84+i)));
 assert.deepEqual(c.domains[12].skills.map(s=>s.id),Array.from({length:11},(_,i)=>"S-"+(91+i)));
});
test("correct ranked Top 12 priorities", () => {
 assert.deepEqual(c.priorities.map(p=>p.rank),Array.from({length:12},(_,i)=>i+1));
 assert.deepEqual(c.priorities.map(p=>p.id),["S-11","S-15","S-07","S-19","S-23","S-30","S-31","S-40","S-42","S-55","S-44","S-79"]);
 for(const p of c.priorities)assert.equal(skillById.get(p.id).title,p.title);
});
test("all candidates remain proposal-only", () => {
 assert.equal(ids.filter(id=>skillById.get(id).status==="DOCUMENTED_ONLY").length,1);
 assert.equal(skillById.get("S-11").status,"DOCUMENTED_ONLY");
 assert.equal(ids.filter(id=>skillById.get(id).status==="PROPOSED").length,100);
 assert.ok(!ids.some(id=>["TESTED","IMPLEMENTED","VERIFIED","ACTIVE"].includes(skillById.get(id).status)));
});
test("relationships and illustrative workflows have no missing or duplicate skill references", () => {
 assert.equal(c.relationships.length,8);
 assert.equal(c.workflows.length,6);
 for(const entry of [...c.relationships,...c.workflows]) {
  assert.ok(entry.skillIds.length>=2);
  assert.equal(new Set(entry.skillIds).size,entry.skillIds.length,entry.id);
  entry.skillIds.forEach(id=>assert.ok(skillById.has(id),entry.id+" "+id));
 }
 assert.ok(c.relationships.every(r=>r.isPrerequisite===false));
 assert.ok(c.workflows.every(w=>w.isVerifiedDependencyChain===false));
});
test("offline browser bundle references source-controlled data and no external APIs", () => {
 const html=readFileSync(join(folder,"index.html"),"utf8");
 const js=readFileSync(join(folder,"app.js"),"utf8");
 assert.ok(html.includes('src="data.js"'));
 assert.ok(html.includes('src="app.js"'));
 assert.ok(html.includes('href="styles.css"'));
 assert.ok(!html.includes("http://") && !html.includes("https://"));
 assert.ok(!/\bfetch\s*\(|XMLHttpRequest|WebSocket/.test(js));
 assert.ok(js.includes("skills-solution-blueprint.md"));
 assert.ok(js.includes("skills-readiness-snapshot.csv"));
});
