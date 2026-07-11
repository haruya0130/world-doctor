import fs from "node:fs";
import { chromium } from "playwright";

const baseUrl = process.env.TEST_BASE_URL || "http://127.0.0.1:4173";
const target = `${baseUrl}/countries/sao-tome-and-principe.html?debug=1`;
const outputDir = "test-results";
fs.mkdirSync(outputDir, { recursive: true });

const runScenario = async ({ name, blockCountryData = false }) => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });

  if (blockCountryData) {
    await context.route("**/data/countries-*.js*", route => route.abort("failed"));
  }

  const page = await context.newPage();
  const consoleEntries = [];
  const pageErrors = [];
  const requestFailures = [];

  page.on("console", message => {
    consoleEntries.push({ type: message.type(), text: message.text() });
  });
  page.on("pageerror", error => pageErrors.push(error.message));
  page.on("requestfailed", request => {
    requestFailures.push({ url: request.url(), error: request.failure()?.errorText || "unknown" });
  });

  const response = await page.goto(target, { waitUntil: "networkidle", timeout: 30000 });
  if (!response || !response.ok()) {
    throw new Error(`${name}: page response was not OK (${response?.status() || "no response"})`);
  }

  await page.waitForSelector("h1", { state: "visible", timeout: 10000 });
  await page.waitForTimeout(700);

  const report = await page.evaluate(() => {
    const hero = document.querySelector(".hero-content");
    const heading = document.querySelector("h1");
    const heroStyle = hero ? getComputedStyle(hero) : null;
    const heroRect = hero?.getBoundingClientRect();
    const headingRect = heading?.getBoundingClientRect();
    const required = ["overview", "progress", "prologue", "chapters", "exam"];

    return {
      title: document.title,
      heading: heading?.textContent?.trim() || "",
      renderStatus: document.documentElement.dataset.renderStatus || "missing",
      bodyHeight: document.documentElement.scrollHeight,
      bodyWidth: document.documentElement.scrollWidth,
      viewportWidth: innerWidth,
      hero: heroStyle && heroRect ? {
        display: heroStyle.display,
        visibility: heroStyle.visibility,
        opacity: Number(heroStyle.opacity),
        width: Math.round(heroRect.width),
        height: Math.round(heroRect.height)
      } : null,
      headingBox: headingRect ? {
        width: Math.round(headingRect.width),
        height: Math.round(headingRect.height)
      } : null,
      sections: Object.fromEntries(required.map(id => [id, Boolean(document.getElementById(id))])),
      debug: window.__WORLD_DOCTOR_DEBUG__ || null
    };
  });

  const failures = [];
  if (!report.heading.includes("サントメ・プリンシペ博士")) failures.push("heading text is incorrect");
  if (!report.hero || report.hero.opacity <= 0.05) failures.push("hero is transparent");
  if (!report.hero || report.hero.display === "none" || report.hero.visibility === "hidden") failures.push("hero is hidden");
  if (!report.hero || report.hero.width < 200 || report.hero.height < 200) failures.push("hero has no usable size");
  if (!report.headingBox || report.headingBox.width < 100 || report.headingBox.height < 20) failures.push("heading has no usable box");
  if (report.bodyHeight < 1200) failures.push(`page is unexpectedly short (${report.bodyHeight}px)`);
  if (report.bodyWidth > report.viewportWidth + 2) failures.push(`horizontal overflow detected (${report.bodyWidth} > ${report.viewportWidth})`);
  if (Object.values(report.sections).some(value => !value)) failures.push("one or more required sections are missing");
  if (report.renderStatus !== "ok") failures.push(`runtime render self-test is ${report.renderStatus}`);

  const unexpectedErrors = pageErrors.filter(error => !blockCountryData || !/countries-/i.test(error));
  if (unexpectedErrors.length) failures.push(`page errors: ${unexpectedErrors.join(" | ")}`);

  const screenshotPath = `${outputDir}/${name}.png`;
  await page.screenshot({ path: screenshotPath, fullPage: true });

  const result = {
    name,
    blockCountryData,
    ok: failures.length === 0,
    failures,
    report,
    pageErrors,
    requestFailures,
    consoleEntries: consoleEntries.filter(entry => entry.text.includes("WorldDoctor")),
    screenshotPath
  };

  fs.writeFileSync(`${outputDir}/${name}.json`, JSON.stringify(result, null, 2));
  console.log(`[WorldDoctorBrowserTest] ${name}: ${result.ok ? "PASS" : "FAIL"}`);
  console.log(JSON.stringify(result, null, 2));

  await browser.close();
  if (!result.ok) throw new Error(`${name}: ${failures.join("; ")}`);
};

await runScenario({ name: "sao-tome-normal" });
await runScenario({ name: "sao-tome-data-blocked", blockCountryData: true });
console.log("[WorldDoctorBrowserTest] all browser scenarios passed");
