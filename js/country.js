(() => {
  "use strict";
  const STORAGE_KEY = "worldDoctorProgress";
  const body = document.body;
  const pathSlug = decodeURIComponent(location.pathname.split("/").pop() || "").replace(/\.html$/i, "");
  const code = body.dataset.countryCode || (COUNTRIES.find(item => item.slug === pathSlug) || {}).code;
  const country = COUNTRIES.find(item => item.code === code);
  if (!country) return;

  const renderGenericPage = country => {
    document.body.innerHTML = `
      <header class="topbar">
        <a class="brand" href="../index.html" aria-label="世界博士トップへ戻る">🌍 <span>世界博士</span></a>
        <div class="country-nav-title" data-country-name>${country.nameJa}</div>
        <button id="menu-button" class="menu-button" type="button" aria-expanded="false" aria-controls="nav-menu" aria-label="メニューを開く">☰</button>
        <nav id="nav-menu" class="nav-menu" aria-label="国ページのナビゲーション">
          <a href="#overview">基本情報</a>
          <a href="#chapters">章一覧</a>
          <a href="#progress">学習進捗</a>
          <a href="../index.html">世界地図へ戻る</a>
        </nav>
      </header>
      <main>
        <section class="country-hero">
          <div class="hero-content reveal">
            <div class="flag-orb" aria-label="${country.nameJa}の国旗と国コード">
              <div><div class="flag-emoji" data-country-flag aria-hidden="true"></div><div class="flag-code" data-country-code>${country.code}</div></div>
            </div>
            <p class="eyebrow">WORLD DOCTOR COURSE</p>
            <h1 data-country-name>${country.nameJa}</h1>
            <p class="country-en" lang="en" data-country-en>${country.nameEn}</p>
            <p class="hero-copy">この国の地理・歴史・文化・暮らしを、物語を読みながら学ぶ博士コースです。</p>
            <div class="hero-actions">
              <a id="start-course" class="primary-button" href="#chapters">博士コースをのぞく</a>
              <a class="secondary-button" href="../index.html">← 世界地図へ戻る</a>
            </div>
          </div>
        </section>
        <div class="content-wrap">
          <section id="overview" class="panel reveal" aria-labelledby="overview-heading">
            <h2 id="overview-heading">基本情報</h2>
            <div class="basic-grid">
              <div class="info-card"><strong>国名</strong><span data-country-name>${country.nameJa}</span></div>
              <div class="info-card"><strong>英語名</strong><span lang="en" data-country-en>${country.nameEn}</span></div>
              <div class="info-card"><strong>国コード</strong><span data-country-code>${country.code}</span></div>
              <div class="info-card"><strong>地域</strong><span data-country-continent>${country.continent}</span></div>
            </div>
          </section>
          <section id="chapters" class="panel coming-soon reveal" aria-labelledby="chapters-heading">
            <div>
              <div class="coming-icon" aria-hidden="true">🧳</div>
              <h2 id="chapters-heading">この国の博士コースは準備中です</h2>
              <p>入口はもう完成しています。<br>地理・歴史・文化の物語を、順番に追加していきます。</p>
              <div class="world-map-ghost" aria-hidden="true">🗺️</div>
              <div class="hero-actions">
                <a class="primary-button" href="../index.html">別の国を探す</a>
                <a class="secondary-button" href="../index.html">世界博士トップへ戻る</a>
              </div>
            </div>
          </section>
          <section id="progress" class="panel progress-panel reveal" aria-labelledby="progress-heading">
            <div class="progress-row">
              <div><h2 id="progress-heading">学習進捗</h2><p>現在の状態：<strong id="country-progress-label">未挑戦</strong></p></div>
              <span aria-hidden="true">🎓</span>
            </div>
            <div id="country-progress-track" class="progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
              <div id="country-progress-fill" class="progress-fill"></div>
            </div>
            <div class="progress-actions">
              <button class="small-button" type="button" data-set-progress="learning">学習中にする</button>
              <button class="small-button complete" type="button" data-set-progress="completed">博士認定にする</button>
              <button class="small-button" type="button" data-set-progress="not-started">進捗をリセット</button>
            </div>
          </section>
        </div>
      </main>
      <footer class="site-footer"><p>🌍 世界博士 — 次の国へ、知識の旅を続けよう。</p></footer>`;
  };

  if (body.dataset.template === "generic") renderGenericPage(country);

  const readProgress = () => {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return value && typeof value === "object" ? value : {};
    } catch {
      return {};
    }
  };
  const saveProgress = progress => localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  const flagEmoji = value => [...value].map(char => String.fromCodePoint(127397 + char.charCodeAt(0))).join("");

  const setText = (selector, value) => {
    document.querySelectorAll(selector).forEach(element => { element.textContent = value; });
  };

  setText("[data-country-name]", country.nameJa);
  setText("[data-country-en]", country.nameEn);
  setText("[data-country-code]", country.code);
  setText("[data-country-continent]", country.continent);
  setText("[data-country-flag]", flagEmoji(country.code));
  document.title = `${country.nameJa}博士コース | 世界博士`;

  const progressLabel = document.getElementById("country-progress-label");
  const progressFill = document.getElementById("country-progress-fill");
  const progressTrack = document.getElementById("country-progress-track");

  const renderProgress = () => {
    const state = readProgress()[code] || "not-started";
    const values = { "not-started": 0, learning: 45, completed: 100 };
    const labels = { "not-started": "未挑戦", learning: "学習中", completed: "博士認定済み" };
    if (progressLabel) progressLabel.textContent = labels[state];
    if (progressFill) progressFill.style.width = `${values[state]}%`;
    if (progressTrack) progressTrack.setAttribute("aria-valuenow", String(values[state]));
    body.dataset.progressState = state;
  };

  const updateState = state => {
    const progress = readProgress();
    progress[code] = state;
    saveProgress(progress);
    renderProgress();
    if (state === "completed") launchConfetti();
  };

  const startButton = document.getElementById("start-course");
  if (startButton) {
    startButton.addEventListener("click", event => {
      if (startButton.tagName === "A" && startButton.getAttribute("href")?.startsWith("#")) event.preventDefault();
      const current = readProgress()[code] || "not-started";
      if (current === "not-started") updateState("learning");
      const target = document.querySelector(startButton.getAttribute("href") || "#chapters");
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  document.querySelectorAll("[data-set-progress]").forEach(button => {
    button.addEventListener("click", () => updateState(button.dataset.setProgress));
  });

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
      if (detail.open && (readProgress()[code] || "not-started") === "not-started") updateState("learning");
    });
  });

  const observer = "IntersectionObserver" in window
    ? new IntersectionObserver(entries => entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      }), { threshold: .12 })
    : null;
  document.querySelectorAll(".reveal").forEach(element => {
    if (observer) observer.observe(element);
    else element.classList.add("is-visible");
  });

  document.querySelectorAll("a[href]").forEach(link => {
    link.addEventListener("click", event => {
      const href = link.getAttribute("href") || "";
      if (href.startsWith("#") || href.startsWith("mailto:") || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
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
      piece.style.animationDelay = `${Math.random() * .8}s`;
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
})();
