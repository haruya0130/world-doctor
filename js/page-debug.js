(() => {
  "use strict";

  const BUILD = document.querySelector('meta[name="world-doctor-build"]')?.content || "unknown";
  const startedAt = performance.now();
  const logs = [];
  let lastReport = null;

  const safe = value => {
    if (value instanceof Error) return { name: value.name, message: value.message, stack: value.stack || "" };
    try { return JSON.parse(JSON.stringify(value)); } catch { return String(value); }
  };

  const log = (level, event, data = {}) => {
    const item = {
      ms: Math.round((performance.now() - startedAt) * 10) / 10,
      level,
      event,
      data: safe(data)
    };
    logs.push(item);
    window.__WORLD_DOCTOR_DEBUG__ = { build: BUILD, logs, report: lastReport };
    const method = level === "error" ? "error" : level === "warn" ? "warn" : "info";
    console[method](`[WorldDoctor:${BUILD}] ${event}`, item.data);
    try { sessionStorage.setItem("worldDoctorDebugLast", JSON.stringify(window.__WORLD_DOCTOR_DEBUG__)); } catch {}
    renderPanel();
  };

  const debugEnabled = () => {
    try {
      return new URLSearchParams(location.search).get("debug") === "1" || localStorage.getItem("worldDoctorDebug") === "1";
    } catch {
      return new URLSearchParams(location.search).get("debug") === "1";
    }
  };

  const renderPanel = () => {
    if (!document.body || (!debugEnabled() && lastReport?.ok !== false)) return;
    let panel = document.getElementById("wd-debug-panel");
    if (!panel) {
      panel = document.createElement("aside");
      panel.id = "wd-debug-panel";
      panel.setAttribute("role", "status");
      panel.setAttribute("aria-live", "polite");
      panel.style.cssText = [
        "position:fixed", "right:10px", "bottom:10px", "z-index:99999",
        "width:min(460px,calc(100vw - 20px))", "max-height:55vh", "overflow:auto",
        "padding:12px", "color:#d9f7e8", "background:rgba(8,25,40,.96)",
        "border:1px solid #4cc38a", "border-radius:12px", "box-shadow:0 12px 35px rgba(0,0,0,.35)",
        "font:12px/1.55 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace",
        "white-space:pre-wrap"
      ].join(";");
      document.body.appendChild(panel);
    }
    panel.textContent = [
      `World Doctor Debug | ${BUILD}`,
      lastReport ? `render=${lastReport.ok ? "OK" : "ERROR"}` : "render=checking",
      ...logs.slice(-18).map(item => `${item.ms}ms [${item.level}] ${item.event} ${JSON.stringify(item.data)}`)
    ].join("\n");
  };

  const inspect = reason => {
    const required = [".topbar", ".country-hero", ".hero-content", "h1", "#overview", "#progress", "#prologue", "#chapters", "#exam"];
    const missing = required.filter(selector => !document.querySelector(selector));
    const hero = document.querySelector(".hero-content");
    const heading = document.querySelector("h1");
    const heroStyle = hero ? getComputedStyle(hero) : null;
    const heroRect = hero?.getBoundingClientRect();
    const headingRect = heading?.getBoundingClientRect();
    const bodyText = document.body?.innerText?.trim() || "";
    const cssLinks = [...document.querySelectorAll('link[rel="stylesheet"]')];

    const checks = {
      requiredElements: missing.length === 0,
      heroDisplayed: Boolean(heroStyle && heroStyle.display !== "none" && heroStyle.visibility !== "hidden"),
      heroOpaque: Boolean(heroStyle && Number(heroStyle.opacity || "1") > 0.05),
      heroHasSize: Boolean(heroRect && heroRect.width > 150 && heroRect.height > 150),
      headingHasSize: Boolean(headingRect && headingRect.width > 80 && headingRect.height > 20),
      pageHasHeight: document.documentElement.scrollHeight > 1000,
      pageHasText: bodyText.length > 300,
      cssLoaded: cssLinks.length > 0 && cssLinks.every(link => Boolean(link.sheet))
    };

    const ok = Object.values(checks).every(Boolean);
    lastReport = {
      ok,
      reason,
      build: BUILD,
      readyState: document.readyState,
      path: location.pathname,
      title: document.title,
      viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
      missing,
      checks,
      hero: heroStyle && heroRect ? {
        display: heroStyle.display,
        visibility: heroStyle.visibility,
        opacity: heroStyle.opacity,
        width: Math.round(heroRect.width),
        height: Math.round(heroRect.height)
      } : null,
      heading: headingRect ? { width: Math.round(headingRect.width), height: Math.round(headingRect.height) } : null,
      bodyHeight: document.documentElement.scrollHeight,
      textLength: bodyText.length,
      assets: {
        scripts: [...document.scripts].map(script => script.src || "inline"),
        styles: cssLinks.map(link => ({ href: link.href, loaded: Boolean(link.sheet) }))
      },
      errors: logs.filter(item => item.level === "error")
    };
    window.__WORLD_DOCTOR_DEBUG__ = { build: BUILD, logs, report: lastReport };
    document.documentElement.dataset.renderStatus = ok ? "ok" : "error";
    log(ok ? "info" : "error", "render.check", lastReport);
    return lastReport;
  };

  window.addEventListener("error", event => {
    log("error", "window.error", {
      message: event.message,
      source: event.filename,
      line: event.lineno,
      column: event.colno,
      error: safe(event.error)
    });
  });

  window.addEventListener("unhandledrejection", event => {
    log("error", "promise.unhandled", { reason: safe(event.reason) });
  });

  document.addEventListener("DOMContentLoaded", () => {
    log("info", "dom.ready", { readyState: document.readyState });
    setTimeout(() => inspect("dom+800ms"), 800);
  });

  window.addEventListener("load", () => {
    const resources = performance.getEntriesByType("resource")
      .filter(item => /country\.css|country\.js|page-debug\.js/.test(item.name))
      .map(item => ({ name: item.name.split("/").pop(), duration: Math.round(item.duration), bytes: item.transferSize || 0 }));
    log("info", "window.load", { resources, readyState: document.readyState });
    setTimeout(() => inspect("load+1200ms"), 1200);
  });

  setTimeout(() => inspect("watchdog+3000ms"), 3000);
  log("info", "bootstrap.started", { url: location.href, userAgent: navigator.userAgent });
})();
