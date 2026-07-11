(() => {
  "use strict";

  const PREFIX = "[WorldDoctorDebug]";
  const startedAt = performance.now();
  const entries = [];
  let lastReport = null;

  const serialize = value => {
    if (value instanceof Error) {
      return { name: value.name, message: value.message, stack: value.stack || "" };
    }
    if (value && typeof value === "object") {
      try {
        return JSON.parse(JSON.stringify(value));
      } catch {
        return String(value);
      }
    }
    return value;
  };

  const write = (level, event, details = {}) => {
    const entry = {
      atMs: Math.round((performance.now() - startedAt) * 10) / 10,
      level,
      event,
      details: serialize(details)
    };
    entries.push(entry);
    const method = level === "error" ? "error" : level === "warn" ? "warn" : "log";
    console[method](`${PREFIX} ${event}`, entry);
    return entry;
  };

  const debugApi = {
    entries,
    log: (event, details) => write("info", event, details),
    warn: (event, details) => write("warn", event, details),
    error: (event, details) => write("error", event, details),
    getReport: () => lastReport,
    print: () => console.table(entries)
  };
  window.WORLD_DOCTOR_DEBUG = debugApi;

  window.addEventListener("error", event => {
    write("error", "window-error", {
      message: event.message,
      filename: event.filename,
      line: event.lineno,
      column: event.colno,
      error: serialize(event.error)
    });
  });

  window.addEventListener("unhandledrejection", event => {
    write("error", "unhandled-rejection", { reason: serialize(event.reason) });
  });

  const assetSnapshot = () => ({
    scripts: [...document.scripts].map(script => ({
      src: script.src || "inline",
      defer: script.defer,
      async: script.async
    })),
    stylesheets: [...document.querySelectorAll('link[rel="stylesheet"]')].map(link => ({
      href: link.href,
      sheetLoaded: Boolean(link.sheet)
    }))
  });

  const renderPanel = report => {
    const params = new URLSearchParams(location.search);
    const debugEnabled = params.get("debug") === "1" || localStorage.getItem("worldDoctorDebug") === "1";
    if (!debugEnabled && report.ok) return;

    document.getElementById("world-doctor-debug-panel")?.remove();
    const panel = document.createElement("aside");
    panel.id = "world-doctor-debug-panel";
    panel.setAttribute("aria-live", "polite");
    panel.style.cssText = [
      "position:fixed", "z-index:99999", "right:10px", "bottom:10px",
      "width:min(430px,calc(100vw - 20px))", "max-height:55vh", "overflow:auto",
      "padding:12px 14px", `background:${report.ok ? "#ecfdf5" : "#fff1f2"}`,
      `border:2px solid ${report.ok ? "#22c55e" : "#ef4444"}`,
      "border-radius:14px", "box-shadow:0 16px 45px rgba(15,23,42,.25)",
      "font:12px/1.55 ui-monospace,SFMono-Regular,Consolas,monospace", "color:#172033"
    ].join(";");

    const summary = document.createElement("div");
    summary.innerHTML = `<strong>${report.ok ? "✅ 表示テスト正常" : "❌ 表示テスト異常"}</strong><br>${report.reason} / ${report.page}`;
    const pre = document.createElement("pre");
    pre.style.cssText = "white-space:pre-wrap;margin:8px 0 0";
    pre.textContent = JSON.stringify(report, null, 2);
    const close = document.createElement("button");
    close.type = "button";
    close.textContent = "閉じる";
    close.style.cssText = "margin-top:8px;min-height:36px;padding:5px 12px;border:1px solid #94a3b8;border-radius:8px;background:white;cursor:pointer";
    close.addEventListener("click", () => panel.remove());
    panel.append(summary, pre, close);
    document.body.appendChild(panel);
  };

  const inspect = reason => {
    const requiredSelectors = [
      ".topbar", ".country-hero", ".hero-content", "h1",
      "#overview", "#progress", "#prologue", "#chapters", "#exam"
    ];
    const missing = requiredSelectors.filter(selector => !document.querySelector(selector));
    const hero = document.querySelector(".hero-content");
    const heroStyle = hero ? getComputedStyle(hero) : null;
    const heroRect = hero ? hero.getBoundingClientRect() : null;
    const bodyStyle = getComputedStyle(document.body);
    const bodyText = document.body.innerText.trim();

    const checks = {
      requiredElements: missing.length === 0,
      heroDisplayed: Boolean(heroStyle && heroStyle.display !== "none" && heroStyle.visibility !== "hidden"),
      heroOpaque: Boolean(heroStyle && Number.parseFloat(heroStyle.opacity || "1") > 0.05),
      heroHasSize: Boolean(heroRect && heroRect.width > 100 && heroRect.height > 100),
      pageHasHeight: document.documentElement.scrollHeight > 700,
      pageHasText: bodyText.length > 200,
      cssLoaded: [...document.querySelectorAll('link[rel="stylesheet"]')].every(link => Boolean(link.sheet))
    };

    const ok = Object.values(checks).every(Boolean);
    lastReport = {
      ok,
      reason,
      page: location.pathname,
      title: document.title,
      readyState: document.readyState,
      viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
      body: {
        scrollHeight: document.documentElement.scrollHeight,
        display: bodyStyle.display,
        visibility: bodyStyle.visibility,
        textLength: bodyText.length
      },
      hero: heroStyle && heroRect ? {
        display: heroStyle.display,
        visibility: heroStyle.visibility,
        opacity: heroStyle.opacity,
        width: Math.round(heroRect.width),
        height: Math.round(heroRect.height)
      } : null,
      missing,
      checks,
      assets: assetSnapshot(),
      errors: entries.filter(entry => entry.level === "error")
    };

    write(ok ? "info" : "error", "display-self-test", lastReport);
    try {
      sessionStorage.setItem("worldDoctorLastDebugReport", JSON.stringify(lastReport));
    } catch {
      write("warn", "session-storage-unavailable");
    }
    document.documentElement.dataset.worldDoctorHealth = ok ? "ok" : "error";
    renderPanel(lastReport);
    return lastReport;
  };

  write("info", "debug-bootstrap", {
    href: location.href,
    userAgent: navigator.userAgent,
    readyState: document.readyState
  });

  document.addEventListener("DOMContentLoaded", () => {
    write("info", "dom-content-loaded", assetSnapshot());
    window.setTimeout(() => inspect("dom-content-loaded+250ms"), 250);
  });

  window.addEventListener("load", () => {
    write("info", "window-load", assetSnapshot());
    window.setTimeout(() => inspect("window-load+350ms"), 350);
  });

  window.setTimeout(() => inspect("watchdog-2500ms"), 2500);
})();
