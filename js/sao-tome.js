(() => {
  "use strict";

  const STORAGE_KEY = "worldDoctorProgress";
  const COUNTRY_CODE = "ST";
  const body = document.body;
  const debugLog = (event, data = {}) => {
    console.info(`[WorldDoctor:SaoTome] ${event}`, data);
  };

  const readProgress = () => {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return value && typeof value === "object" ? value : {};
    } catch {
      return {};
    }
  };

  const saveProgress = progress => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
      debugLog("storage.unavailable");
    }
  };

  const progressLabel = document.getElementById("country-progress-label");
  const progressFill = document.getElementById("country-progress-fill");
  const progressTrack = document.getElementById("country-progress-track");

  const renderProgress = () => {
    const state = readProgress()[COUNTRY_CODE] || "not-started";
    const values = { "not-started": 0, learning: 45, completed: 100 };
    const labels = { "not-started": "未挑戦", learning: "学習中", completed: "博士認定済み" };
    const value = values[state] ?? 0;

    if (progressLabel) progressLabel.textContent = labels[state] || labels["not-started"];
    if (progressFill) progressFill.style.width = `${value}%`;
    if (progressTrack) progressTrack.setAttribute("aria-valuenow", String(value));
    body.dataset.progressState = state;
    debugLog("progress.render", { state, value });
  };

  const updateState = state => {
    const progress = readProgress();
    progress[COUNTRY_CODE] = state;
    saveProgress(progress);
    renderProgress();
    if (state === "completed") launchConfetti();
  };

  document.querySelectorAll("[data-set-progress]").forEach(button => {
    button.addEventListener("click", () => updateState(button.dataset.setProgress));
  });

  const startButton = document.getElementById("start-course");
  if (startButton) {
    startButton.addEventListener("click", event => {
      event.preventDefault();
      if ((readProgress()[COUNTRY_CODE] || "not-started") === "not-started") {
        updateState("learning");
      }
      document.querySelector(startButton.getAttribute("href") || "#prologue")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  const menuButton = document.getElementById("menu-button");
  const navMenu = document.getElementById("nav-menu");
  if (menuButton && navMenu) {
    menuButton.addEventListener("click", () => {
      const open = navMenu.classList.toggle("is-open");
      menuButton.setAttribute("aria-expanded", String(open));
    });
    navMenu.querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
      navMenu.classList.remove("is-open");
      menuButton.setAttribute("aria-expanded", "false");
    }));
  }

  document.querySelectorAll("details.chapter").forEach(detail => {
    detail.addEventListener("toggle", () => {
      if (detail.open && (readProgress()[COUNTRY_CODE] || "not-started") === "not-started") {
        updateState("learning");
      }
    });
  });

  const revealElements = [...document.querySelectorAll(".reveal")];
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });

    revealElements.forEach(element => {
      element.classList.add("reveal-pending");
      observer.observe(element);
    });
  } else {
    revealElements.forEach(element => element.classList.add("is-visible"));
  }

  document.querySelectorAll("a[href]").forEach(link => {
    link.addEventListener("click", event => {
      const href = link.getAttribute("href") || "";
      if (href.startsWith("#") || href.startsWith("mailto:") ||
          event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      body.classList.add("page-leaving");
      window.setTimeout(() => { window.location.href = link.href; }, 160);
    });
  });

  function launchConfetti() {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const layer = document.createElement("div");
    layer.className = "confetti";
    const colors = ["#2575e6", "#28a66a", "#f4b942", "#ef6f6c", "#9b72cf"];
    for (let index = 0; index < 55; index += 1) {
      const piece = document.createElement("span");
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.background = colors[index % colors.length];
      piece.style.animationDelay = `${Math.random() * 0.8}s`;
      piece.style.animationDuration = `${2.2 + Math.random() * 1.8}s`;
      layer.appendChild(piece);
    }
    document.body.appendChild(layer);
    window.setTimeout(() => layer.remove(), 4500);
  }

  window.addEventListener("pageshow", () => {
    body.classList.remove("page-leaving");
    renderProgress();
  });

  renderProgress();
  debugLog("runtime.ready", {
    heading: document.querySelector("h1")?.textContent?.trim() || "",
    sections: document.querySelectorAll("main section").length
  });
})();
