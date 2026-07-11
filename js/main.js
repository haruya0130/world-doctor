(() => {
  "use strict";
  const STORAGE_KEY = "worldDoctorProgress";
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

  const readProgress = () => {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return value && typeof value === "object" ? value : {};
    } catch {
      return {};
    }
  };

  const normalize = value => String(value || "")
    .normalize("NFKC").toLocaleLowerCase("ja")
    .replace(/\s+/g, "");

  const flagEmoji = code => [...code].map(char =>
    String.fromCodePoint(127397 + char.charCodeAt(0))
  ).join("");

  const stateLabel = (country, state) => {
    if (state === "completed") return "🎓 博士認定済み";
    if (state === "learning") return "📘 学習中";
    if (country.status === "available") return "✨ コース公開中";
    return "🧭 準備中";
  };

  const updateOverallProgress = () => {
    const progress = readProgress();
    const completed = COUNTRIES.filter(country => progress[country.code] === "completed").length;
    const percent = completed / COUNTRIES.length * 100;
    progressCount.textContent = `${completed} / ${COUNTRIES.length}か国`;
    progressFill.style.width = `${percent}%`;
    progressTrack.setAttribute("aria-valuenow", String(completed));
    progressMessage.textContent = completed === 0
      ? "最初の一か国を選んで、冒険を始めよう。"
      : completed === COUNTRIES.length
        ? "地球博士誕生！ 世界195か国を制覇しました。"
        : `あと${COUNTRIES.length - completed}か国。自分のペースで世界を広げよう。`;
  };

  const render = () => {
    const query = normalize(searchInput.value);
    const progress = readProgress();
    const filtered = COUNTRIES.filter(country => {
      const matchesContinent = activeContinent === "すべて" || country.continent === activeContinent;
      const haystack = normalize(`${country.nameJa}${country.nameEn}${country.code}`);
      return matchesContinent && (!query || haystack.includes(query));
    });

    grid.innerHTML = filtered.map((country, index) => {
      const state = progress[country.code] || "not-started";
      const label = stateLabel(country, state);
      return `
        <a class="country-card" href="countries/${country.slug}.html"
           data-state="${state}" aria-label="${country.nameJa}博士コースを開く"
           style="animation-delay:${Math.min(index, 30) * 25}ms">
          <span class="flag-stack" aria-hidden="true">
            <span class="flag-emoji">${flagEmoji(country.code)}</span>
            <span class="flag-code">${country.code}</span>
          </span>
          <span class="country-name">${country.nameJa}</span>
          <span class="country-en" lang="en">${country.nameEn}</span>
          <span class="status-badge">${label}</span>
        </a>`;
    }).join("");

    resultCount.textContent = `${filtered.length}か国を表示中`;
    emptyState.hidden = filtered.length !== 0;
    grid.hidden = filtered.length === 0;
    bindPageTransitions();
  };

  const bindPageTransitions = () => {
    grid.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", event => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        document.body.classList.add("page-leaving");
        window.setTimeout(() => { window.location.href = link.href; }, 170);
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

  const observer = "IntersectionObserver" in window
    ? new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: .12 })
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
