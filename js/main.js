(() => {
  "use strict";

  const STORAGE_KEY = "worldDoctorProgress";
  const countries = Array.isArray(window.COUNTRIES) ? window.COUNTRIES : [];
  const grid = document.getElementById("country-grid");
  const searchInput = document.getElementById("country-search");
  const filterButtons = [...document.querySelectorAll(".filter-button")];
  const resultCount = document.getElementById("result-count");
  const emptyState = document.getElementById("empty-state");
  const resetButton = document.getElementById("reset-filters");
  const progressCount = document.getElementById("progress-count");
  const progressFill = document.getElementById("progress-fill");
  const progressTrack = document.querySelector(".progress-track");
  const progressMessage = document.getElementById("progress-message");
  let activeContinent = "すべて";

  const SEARCH_ALIASES = {
    JP: ["にほん", "にっぽん"],
    CN: ["ちゅうごく"],
    KR: ["かんこく", "だいかんみんこく", "こりあ"],
    KP: ["きたちょうせん", "ちょうせん"],
    US: ["あめりか", "べいこく", "usa"],
    GB: ["いぎりす", "えいこく", "uk"],
    AE: ["あらぶしゅちょうこくれんぽう", "uae"],
    RU: ["ろしあ"],
    VA: ["ばちかん"],
    PS: ["ぱれすちな"],
    CZ: ["ちぇこ"],
    CI: ["こーとじぼわーる"],
    CD: ["こんごみんしゅきょうわこく"],
    CG: ["こんごきょうわこく"]
  };

  const readProgress = () => {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return value && typeof value === "object" ? value : {};
    } catch {
      return {};
    }
  };

  const toHiragana = value => String(value || "")
    .replace(/[ァ-ヶ]/g, character => String.fromCharCode(character.charCodeAt(0) - 0x60))
    .replace(/ヷ/g, "わ")
    .replace(/ヸ/g, "ゐ")
    .replace(/ヹ/g, "ゑ")
    .replace(/ヺ/g, "を");

  const normalize = value => toHiragana(String(value || "").normalize("NFKC"))
    .toLocaleLowerCase("ja")
    .replace(/[\s・･'’`.,，。()（）\-‐‑–—_/]/g, "");

  const escapeHtml = value => String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  const stateLabel = (country, state) => {
    if (state === "completed") return "🎓 博士認定済み";
    if (state === "learning") return "📘 学習中";
    if (country.status === "available") return "✨ コース公開中";
    return "🧭 準備中";
  };

  const updateOverallProgress = () => {
    const progress = readProgress();
    const completed = countries.filter(country => progress[country.code] === "completed").length;
    const percent = countries.length ? completed / countries.length * 100 : 0;
    progressCount.textContent = `${completed} / ${countries.length || 195}か国`;
    progressFill.style.width = `${percent}%`;
    progressTrack.setAttribute("aria-valuenow", String(completed));
    progressMessage.textContent = completed === 0
      ? "最初の一か国を選んで、冒険を始めよう。"
      : completed === countries.length
        ? "地球博士誕生！ 世界195か国を制覇しました。"
        : `あと${countries.length - completed}か国。自分のペースで世界を広げよう。`;
  };

  const countrySearchText = country => normalize([
    country.nameJa,
    country.nameEn,
    country.code,
    country.continent,
    ...(SEARCH_ALIASES[country.code] || [])
  ].join(" "));

  const bindFlagImages = () => {
    grid.querySelectorAll(".flag-image").forEach(image => {
      const frame = image.closest(".flag-frame");
      const markLoaded = () => {
        frame?.classList.remove("is-error");
        frame?.classList.add("is-loaded");
      };
      const markFailed = () => {
        frame?.classList.remove("is-loaded");
        frame?.classList.add("is-error");
        image.hidden = true;
      };
      image.addEventListener("load", markLoaded, { once: true });
      image.addEventListener("error", markFailed, { once: true });
      if (image.complete) {
        if (image.naturalWidth > 0) markLoaded();
        else markFailed();
      }
    });
  };

  const render = () => {
    const query = normalize(searchInput.value);
    const progress = readProgress();
    const filtered = countries.filter(country => {
      const matchesContinent = activeContinent === "すべて" || country.continent === activeContinent;
      return matchesContinent && (!query || countrySearchText(country).includes(query));
    });

    grid.innerHTML = filtered.map((country, index) => {
      const state = progress[country.code] || "not-started";
      const label = stateLabel(country, state);
      const code = escapeHtml(country.code);
      const nameJa = escapeHtml(country.nameJa);
      const nameEn = escapeHtml(country.nameEn);
      const continent = escapeHtml(country.continent);
      const slug = escapeHtml(country.slug);
      const imageCode = country.code.toLowerCase();
      const priority = index < 10 ? "high" : "auto";

      return `
        <a class="country-card" href="countries/${slug}.html"
           data-state="${state}" data-course-status="${country.status}"
           aria-label="${nameJa}博士コースを開く"
           style="animation-delay:${Math.min(index, 24) * 24}ms">
          <span class="country-card-top">
            <span class="continent-chip">${continent}</span>
            <span class="country-code-chip">${code}</span>
          </span>
          <span class="flag-frame" aria-hidden="true">
            <span class="flag-fallback">${code}</span>
            <img class="flag-image"
                 src="https://flagcdn.com/w160/${imageCode}.png"
                 srcset="https://flagcdn.com/w320/${imageCode}.png 2x"
                 alt=""
                 width="96" height="64"
                 loading="${index < 10 ? "eager" : "lazy"}"
                 fetchpriority="${priority}"
                 decoding="async">
          </span>
          <span class="country-copy">
            <span class="country-name">${nameJa}</span>
            <span class="country-en" lang="en">${nameEn}</span>
          </span>
          <span class="country-card-footer">
            <span class="status-badge">${label}</span>
            <span class="card-arrow" aria-hidden="true">→</span>
          </span>
        </a>`;
    }).join("");

    resultCount.textContent = `${filtered.length}か国を表示中`;
    emptyState.hidden = filtered.length !== 0;
    grid.hidden = filtered.length === 0;
    bindFlagImages();
    bindPageTransitions();
  };

  const bindPageTransitions = () => {
    grid.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", event => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        document.body.classList.add("page-leaving");
        window.setTimeout(() => { window.location.href = link.href; }, 150);
      }, { once: true });
    });
  };

  filterButtons.forEach(button => {
    button.addEventListener("click", () => {
      activeContinent = button.dataset.continent;
      filterButtons.forEach(item => {
        const active = item === button;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-pressed", String(active));
      });
      render();
    });
  });

  searchInput.addEventListener("input", render);
  resetButton.addEventListener("click", () => {
    searchInput.value = "";
    activeContinent = "すべて";
    filterButtons.forEach(button => {
      const active = button.dataset.continent === "すべて";
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    render();
    searchInput.focus();
  });

  document.addEventListener("keydown", event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      searchInput.focus();
      searchInput.select();
    }
    if (event.key === "Escape" && document.activeElement === searchInput && searchInput.value) {
      searchInput.value = "";
      render();
    }
  });

  const observer = "IntersectionObserver" in window
    ? new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12 })
    : null;

  document.querySelectorAll(".reveal").forEach(element => {
    if (observer) observer.observe(element);
    else element.classList.add("is-visible");
  });

  window.addEventListener("pageshow", () => {
    document.body.classList.remove("page-leaving");
    updateOverallProgress();
    render();
  });

  updateOverallProgress();
  render();
})();