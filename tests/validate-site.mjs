import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const notes = [];

const assert = (condition, message) => {
  if (!condition) failures.push(message);
  else notes.push(`PASS: ${message}`);
};

const read = relative => fs.readFileSync(path.join(root, relative), "utf8");
const exists = relative => fs.existsSync(path.join(root, relative));

const pagePath = "countries/sao-tome-and-principe.html";
const page = read(pagePath);
const css = read("css/country.css");
const countryJs = read("js/country.js");
const debugJs = read("js/page-debug.js");

console.log("[WorldDoctorTest] validating Sao Tome and Principe page");

assert(page.includes('<body data-country-code="ST"'), "dedicated page identifies country code ST");
assert(page.includes("サントメ・プリンシペ博士"), "dedicated heading exists as static HTML");
assert(page.includes('id="overview"'), "overview section exists");
assert(page.includes('id="progress"'), "progress section exists");
assert(page.includes('id="prologue"'), "prologue section exists");
assert(page.includes('id="chapters"'), "chapter section exists");
assert(page.includes('id="exam"'), "exam section exists");
assert(page.includes(".reveal { opacity: 1 !important; transform: none !important; }"), "critical fail-open CSS keeps content visible without JavaScript");
assert(page.includes("../js/page-debug.js"), "dedicated page loads the debug logger before runtime code");
assert(page.indexOf("../js/page-debug.js") < page.indexOf("../js/country.js"), "debug logger executes before country runtime");
assert(debugJs.includes("render.check"), "runtime debug log includes render self-test");
assert(debugJs.includes("window.error"), "runtime debug log captures browser errors");
assert(debugJs.includes("bootstrap.started"), "runtime debug log records bootstrap start");
assert(page.includes('meta name="world-doctor-build"'), "page exposes a build identifier");
assert(!page.includes("../data/countries-"), "dedicated page does not depend on shared country-data files");

const assetRegex = /(?:src|href)="([^"?#]+)(?:[?#][^"]*)?"/g;
const assets = [...page.matchAll(assetRegex)]
  .map(match => match[1])
  .filter(value => value.startsWith("../"));
for (const asset of assets) {
  const resolved = path.normalize(path.join(path.dirname(pagePath), asset));
  assert(exists(resolved), `referenced asset exists: ${resolved}`);
}

const scripts = [
  "data/countries-1.js",
  "data/countries-2.js",
  "data/countries-3a.js",
  "data/countries-3b.js",
  "data/countries-4a.js",
  "data/countries-4b.js",
  "js/country.js",
  "js/page-debug.js"
];

for (const script of scripts) {
  try {
    new vm.Script(read(script), { filename: script });
    assert(true, `JavaScript syntax is valid: ${script}`);
  } catch (error) {
    failures.push(`JavaScript syntax error in ${script}: ${error.message}`);
  }
}

for (const inline of [...page.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(match => match[1]).filter(Boolean)) {
  try {
    new vm.Script(inline, { filename: `${pagePath}:inline` });
    assert(true, "inline script syntax is valid");
  } catch (error) {
    failures.push(`inline script syntax error: ${error.message}`);
  }
}

const sandbox = { window: {} };
vm.createContext(sandbox);
for (const dataFile of scripts.filter(file => file.startsWith("data/"))) {
  vm.runInContext(read(dataFile), sandbox, { filename: dataFile });
}
const countries = sandbox.window.COUNTRIES || [];
assert(countries.length === 195, `country dataset contains 195 entries (actual: ${countries.length})`);
const saoTome = countries.find(country => country.code === "ST");
assert(Boolean(saoTome), "country dataset contains ST");
assert(saoTome?.slug === "sao-tome-and-principe", "ST slug matches dedicated HTML filename");

const missingPages = countries
  .map(country => `countries/${country.slug}.html`)
  .filter(relative => !exists(relative));
assert(missingPages.length === 0, `all country HTML files exist (missing: ${missingPages.length})`);
if (missingPages.length) console.error("[WorldDoctorTest] missing pages", missingPages);

assert(!css.includes("display:none!important"), "country CSS does not globally force the page to display:none");
assert(countryJs.includes("staticCountry"), "country runtime has static-data fallback");
assert(countryJs.includes("Array.isArray(window.COUNTRIES)"), "country runtime guards optional shared data");

console.log(notes.join("\n"));

if (failures.length) {
  console.error("\n[WorldDoctorTest] FAILED");
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exit(1);
}

console.log(`\n[WorldDoctorTest] OK: ${notes.length} checks passed`);
console.log("[WorldDoctorTest] Fail-open scenario confirmed: static content and critical CSS do not depend on shared data or runtime animation initialization.");
