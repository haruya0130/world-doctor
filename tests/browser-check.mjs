import fs from "node:fs";
import { chromium } from "playwright";

const baseUrl = process.env.TEST_BASE_URL || "http://127.0.0.1:4173";
const target = `${baseUrl}/countries/sao-tome-and-principe.html?debug=1`;
const outputDir = "test-results";
fs.mkdirSync(outputDir, { recursive: true });

const writeText = (name, lines) => {
  const file = `${outputDir}/${name}.txt`;
  fs.writeFileSync(file, lines.join("\n"));
  console.log(fs.readFileSync(file, "utf8"));
};

const runScenario = async ({ name, blockRuntime = false }) => {
  let browser;
  let page;
  const consoleEntries = [];
  const pageErrors = [];
  const requestFailures = [];

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });

    if (blockRuntime) {
      await context.route("**/js/country.js*", route => route.abort("failed"));
    }

    page = await context.newPage();
    page.on("console", message => consoleEntries.push({ type: message.type(), text: message.text() }));
    page.on("pageerror", error => pageErrors.push(error.message));
    page.on("requestfailed", request => {
      requestFailures.push({ url: request.url(), error: request.failure()?.errorText || "unknown" });
    });

    const response = await page.goto(target, { waitUntil: "networkidle", timeout: 30000 });
    if (!response || !response.ok()) {
      throw new Error(`${name}: page response was not OK (${response?.status() || "no response"})`);
    }

    await page.waitForSelector("h1", { state: "visible", timeout: 10000 });
    let renderStatusWaitTimedOut = false;
    try {
      await page.waitForFunction(() => Boolean(document.documentElement.dataset.renderStatus), null, { timeout: 7000 });
    } catch {
      renderStatusWaitTimedOut = true;
    }
    await page.waitForTimeout(500);

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
        htmlPreview: document.documentElement.outerHTML.slice(0, 1200),
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
    if (renderStatusWaitTimedOut) failures.push("runtime render status was not produced within 7 seconds");

    const unexpectedErrors = pageErrors.filter(error => {
      if (!blockRuntime) return true;
      return !/country\.js/i.test(error);
    });
    if (unexpectedErrors.length) failures.push(`page errors: ${unexpectedErrors.join(" | ")}`);

    const screenshotPath = `${outputDir}/${name}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });

    const result = {
      name,
      blockRuntime,
      ok: failures.length === 0,
      failures,
      renderStatusWaitTimedOut,
      report,
      pageErrors,
      requestFailures,
      consoleEntries: consoleEntries.filter(entry => entry.text.includes("WorldDoctor")),
      screenshotPath
    };

    fs.writeFileSync(`${outputDir}/${name}.json`, JSON.stringify(result, null, 2));
    writeText(name, [
      `${name}: ${result.ok ? "PASS" : "FAIL"}`,
      `failures=${failures.join(" | ") || "none"}`,
      `renderStatus=${report.renderStatus}`,
      `hero=${JSON.stringify(report.hero)}`,
      `body=${report.bodyWidth}x${report.bodyHeight} viewport=${report.viewportWidth}`,
      `pageErrors=${JSON.stringify(pageErrors)}`,
      `requestFailures=${JSON.stringify(requestFailures)}`
    ]);

    if (!result.ok) throw new Error(`${name}: ${failures.join("; ")}`);
    return result;
  } catch (error) {
    const fatal = {
      name,
      blockRuntime,
      fatal: true,
      error: { name: error.name, message: error.message, stack: error.stack || "" },
      pageErrors,
      requestFailures,
      consoleEntries
    };

    if (page) {
      try {
        fatal.url = page.url();
        fatal.title = await page.title();
        fatal.htmlPreview = await page.evaluate(() => document.documentElement.outerHTML.slice(0, 1800));
        fatal.bodyTextPreview = await page.evaluate(() => document.body?.innerText?.slice(0, 1000) || "");
        await page.screenshot({ path: `${outputDir}/${name}-fatal.png`, fullPage: true });
      } catch (captureError) {
        fatal.captureError = captureError.message;
      }
    }

    fs.writeFileSync(`${outputDir}/${name}-fatal.json`, JSON.stringify(fatal, null, 2));
    writeText(`${name}-fatal`, [
      `${name}: FATAL`,
      `error=${error.name}: ${error.message}`,
      `url=${fatal.url || "unavailable"}`,
      `title=${fatal.title || "unavailable"}`,
      `bodyTextPreview=${JSON.stringify(fatal.bodyTextPreview || "")}`,
      `pageErrors=${JSON.stringify(pageErrors)}`,
      `requestFailures=${JSON.stringify(requestFailures)}`,
      `console=${JSON.stringify(consoleEntries.slice(-12))}`
    ]);
    throw error;
  } finally {
    await browser?.close().catch(() => {});
  }
};

await runScenario({ name: "sao-tome-normal" });
await runScenario({ name: "sao-tome-runtime-blocked", blockRuntime: true });
console.log("[WorldDoctorBrowserTest] all browser scenarios passed");
