// tabs/vault-tab.js - Vault browsing
window.RV = window.RV || {};

window.RV.vaultTab = {
  vaultFilter: "all",

  setVaultFilter(filter) {
    this.vaultFilter = filter;
  },

  getVaultFilter() {
    return this.vaultFilter;
  },

  async render(userId) {
    const container = document.getElementById("vaultList");
    container.innerHTML = `<div class="empty-state"><div class="ei">⏳</div><p>Loading…</p></div>`;
    try {
      let all = await window.RV.api.getAllItems(userId);
      all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      if (this.vaultFilter !== "all") all = all.filter(i => i.category === this.vaultFilter);
      container.innerHTML = "";
      if (all.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="ei">📦</div><p>Nothing here yet.</p></div>`;
        return;
      }
      const today = window.RV.utils.todayStr();
      all.forEach(item => {
        const done = (item.completedIntervals || []).length;
        const isMem = item._type === "mem";
        const dots = window.RV.CONSTANTS.INTERVALS.map((_, idx) => {
          const d = (item.completedIntervals || []).includes(idx);
          const c = item.nextReviewDates?.[idx] === today;
          return `<span class="pdot${d ? " done" : c ? " current" : ""}" title="+${window.RV.CONSTANTS.INTERVALS[idx]}d"></span>`;
        }).join("");
        const el = document.createElement("div");
        el.className = "vault-item";
        if (isMem) {
          el.innerHTML = `<div class="vi-top">${window.RV.utils.catBadge(item.category)}<span class="type-tag type-mem">📝</span><span class="vi-url" style="color:var(--dim);cursor:default;font-style:italic">${window.RV.utils.esc(item.content.slice(0, 26))}…</span><button class="vi-del" data-id="${item._id}" data-type="mem" title="Delete">✕</button></div><div class="vi-meta"><span class="vi-date">${window.RV.utils.fmtShort(item.savedDate)}</span><div class="progress-dots">${dots}</div><span class="vi-progress-text">${done}/4</span></div>`;
        } else {
          el.innerHTML = `<div class="vi-top">${window.RV.utils.catBadge(item.category)}<span class="type-tag type-url">🔗</span><a class="vi-url" href="${window.RV.utils.esc(item.url)}" target="_blank">${window.RV.utils.shortUrl(item.url, 22)}</a><button class="vi-del" data-id="${item._id}" data-type="url" title="Delete">✕</button></div>${item.note ? `<div class="vi-note">"${window.RV.utils.esc(item.note)}"</div>` : ""}<div class="vi-meta"><span class="vi-date">${window.RV.utils.fmtShort(item.savedDate)}</span><div class="progress-dots">${dots}</div><span class="vi-progress-text">${done}/4</span></div>`;
        }
        el.querySelector(".vi-del").addEventListener("click", async e => {
          if (confirm("Delete?")) {
            await window.RV.api.deleteItem(e.target.dataset.id, e.target.dataset.type);
            this.render(userId);
            window.RV.calendarTab.loadActivityMap().then(() => window.RV.calendarTab.render());
            window.RV.streakService.loadStreak(userId);
          }
        });
        container.appendChild(el);
      });
    } catch {
      container.innerHTML = `<div class="empty-state"><div class="ei">❌</div><p>Server offline.</p></div>`;
    }
  }
};