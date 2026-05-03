// popup.js — RevisionVault v4 (modular)
(function() {
  window.RV = window.RV || {};
  window.RV.popup = {
    userId: null,
    allCategories: [],

    async init() {
      await this.loadConstants();
      this.userId = await window.RV.api.getUserId();
      await window.RV.api.checkServer();
      await window.RV.addTab.loadCurrentUrl();
      await this.loadCategories();
      this.setupTabs();
      this.setupSaveBtn();
      this.setupRememberTab();
      this.setupNewCatRow();
      window.RV.reviewChips.render("reviewChips");
      window.RV.reviewChips.render("remReviewChips");
      window.RV.utils.setTodayDate();
      await window.RV.calendarTab.init();
      await Promise.all([
        window.RV.calendarTab.loadActivityMap(),
        window.RV.todayTab.renderWithRating(this.userId),
        window.RV.streakService.loadStreak(this.userId)
      ]);
      window.RV.calendarTab.render();
    },

    async loadConstants() {
      const script = document.createElement("script");
      script.src = "lib/constants.js";
      document.head.appendChild(script);
      await new Promise(r => script.onload = r);
      
      ["utils.js", "api.js", "services/badge-service.js", "services/streak-service.js", "services/category-service.js", "tabs/review-chips.js", "tabs/add-tab.js", "tabs/remember-tab.js", "tabs/today-tab.js", "tabs/calendar-tab.js", "tabs/vault-tab.js", "tabs/analytics-tab.js"].forEach(f => {
        const s = document.createElement("script");
        s.src = f;
        document.head.appendChild(s);
      });
      await new Promise(r => setTimeout(r, 100));
    },

    async loadCategories() {
      const d = await window.RV.api.fetchCategories(this.userId);
      this.allCategories = d.all || window.RV.CONSTANTS.DEFAULT_CATS;
      this.renderCatGrid("addCatGrid", "add");
      this.renderCatGrid("remCatGrid", "rem");
      this.renderVaultFilters();
    },

    renderCatGrid(gridId, mode) {
      const grid = document.getElementById(gridId);
      if (!grid) return;
      grid.innerHTML = "";
      const selected = mode === "add" ? window.RV.addTab.getSelectedCategory() : window.RV.rememberTab.getSelectedCategory();
      this.allCategories.forEach(cat => {
        const isCustom = !window.RV.CONSTANTS.DEFAULT_CATS.includes(cat);
        const btn = document.createElement("button");
        btn.className = `cat-btn${cat === selected ? " active" : ""}${isCustom ? " custom-cat" : ""}`;
        btn.dataset.cat = cat;
        btn.textContent = cat.length > 10 ? cat.slice(0, 9) + "…" : cat;
        btn.title = cat;
        btn.addEventListener("click", () => {
          grid.querySelectorAll(".cat-btn").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          if (mode === "add") window.RV.addTab.setSelectedCategory(cat);
          else window.RV.rememberTab.setSelectedCategory(cat);
        });
        if (isCustom) {
          const del = document.createElement("button");
          del.className = "cat-del";
          del.textContent = "✕";
          del.title = "Remove";
          del.addEventListener("click", async e => {
            e.stopPropagation();
            if (confirm(`Remove "${cat}"?`)) {
              await window.RV.categoryService.removeCategory(this.userId, cat);
              window.RV.addTab.setSelectedCategory("DSA");
              window.RV.rememberTab.setSelectedCategory("DSA");
              await this.loadCategories();
            }
          });
          btn.appendChild(del);
        }
        grid.appendChild(btn);
      });
    },

    renderVaultFilters() {
      const c = document.getElementById("vaultFilters");
      c.innerHTML = "";
      const currentFilter = window.RV.vaultTab.getVaultFilter();
      ["all", ...this.allCategories].forEach(f => {
        const btn = document.createElement("button");
        btn.className = `filter-btn${f === currentFilter ? " active" : ""}`;
        btn.dataset.filter = f;
        btn.textContent = f === "all" ? "All" : (f.length > 7 ? f.slice(0, 6) + "…" : f);
        btn.title = f;
        btn.addEventListener("click", () => {
          document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          window.RV.vaultTab.setVaultFilter(f);
          window.RV.vaultTab.render(this.userId);
        });
        c.appendChild(btn);
      });
    },

    setupTabs() {
      document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
          document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
          btn.classList.add("active");
          document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
          if (btn.dataset.tab === "today") window.RV.todayTab.renderWithRating(this.userId);
          if (btn.dataset.tab === "vault") window.RV.vaultTab.render(this.userId);
          if (btn.dataset.tab === "calendar") window.RV.calendarTab.loadActivityMap().then(() => window.RV.calendarTab.render());
          if (btn.dataset.tab === "analytics") window.RV.analyticsTab.render(this.userId);
        });
      });
    },

    setupSaveBtn() {
      document.getElementById("saveBtn").addEventListener("click", () => window.RV.addTab.save(this.userId));
    },

    setupRememberTab() {
      document.getElementById("remSaveBtn").addEventListener("click", () => window.RV.rememberTab.save(this.userId));
    },

    setupNewCatRow() {
      const input = document.getElementById("addNewCatInput");
      const btn = document.getElementById("addNewCatBtn");
      const doAdd = async () => {
        const name = input.value.trim();
        if (!name) return;
        const result = await window.RV.categoryService.addCategory(this.userId, name);
        if (!result.success) this.toast(result.error || "Error", true);
        else {
          input.value = "";
          window.RV.addTab.setSelectedCategory(name);
          await this.loadCategories();
        }
      };
      btn.addEventListener("click", doAdd);
      input.addEventListener("keydown", e => { if (e.key === "Enter") doAdd(); });
    },

    toast(msg, isError = false) {
      const el = document.getElementById("toast");
      el.textContent = msg;
      el.className = "toast" + (isError ? " error" : "");
      clearTimeout(el._t);
      el._t = setTimeout(() => el.classList.add("hidden"), 3000);
    },

    refreshData() {
      window.RV.calendarTab.loadActivityMap().then(() => window.RV.calendarTab.render());
      window.RV.streakService.loadStreak(this.userId);
      window.RV.badgeService.updateBadge();
    }
  };

  document.addEventListener("DOMContentLoaded", () => window.RV.popup.init());
})();