// tabs/calendar-tab.js - Calendar heatmap
window.RV = window.RV || {};

window.RV.calendarTab = {
  calYear: null,
  calMonth: null,
  activityMap: {},
  ratingsMap: {},

  async init() {
    const now = new Date();
    this.calYear = now.getFullYear();
    this.calMonth = now.getMonth();
    this.setupCalNav();
    await this.loadActivityMap();
    await this.loadRatings();
    this.render();
  },

  setupCalNav() {
    document.getElementById("calPrev").addEventListener("click", () => {
      this.calMonth--;
      if (this.calMonth < 0) { this.calMonth = 11; this.calYear--; }
      Promise.all([this.loadActivityMap(), this.loadRatings()]).then(() => this.render());
    });
    document.getElementById("calNext").addEventListener("click", () => {
      this.calMonth++;
      if (this.calMonth > 11) { this.calMonth = 0; this.calYear++; }
      Promise.all([this.loadActivityMap(), this.loadRatings()]).then(() => this.render());
    });
  },

  async loadActivityMap() {
    try {
      this.activityMap = await window.RV.api.getActivityMap(window.RV.popup.userId);
    } catch {
      this.activityMap = {};
    }
  },

  async loadRatings() {
    try {
      const monthPrefix = `${this.calYear}-${String(this.calMonth + 1).padStart(2, "0")}`;
      this.ratingsMap = await window.RV.api.getRatings(window.RV.popup.userId, monthPrefix);
    } catch {
      this.ratingsMap = {};
    }
  },

  render() {
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    document.getElementById("calMonthLabel").textContent = `${months[this.calMonth]} ${this.calYear}`;
    const grid = document.getElementById("calGrid");
    grid.innerHTML = "";
    ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].forEach(d => {
      const el = document.createElement("div");
      el.className = "cal-day-name";
      el.textContent = d;
      grid.appendChild(el);
    });
    const firstDay = new Date(this.calYear, this.calMonth, 1).getDay();
    const daysInMonth = new Date(this.calYear, this.calMonth + 1, 0).getDate();
    const todayFull = window.RV.utils.todayStr();
    const monthPrefix = `${this.calYear}-${String(this.calMonth + 1).padStart(2, "0")}`;
    for (let i = 0; i < firstDay; i++) {
      const el = document.createElement("div");
      el.className = "cal-cell empty";
      grid.appendChild(el);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${monthPrefix}-${String(d).padStart(2, "0")}`;
      const count = this.activityMap[ds] || 0;
      let rating = this.ratingsMap[ds] || 0;
      const startDate = "2026-04-12";
      if (rating === 0 && ds < todayFull && ds >= startDate) rating = 1;
      const el = document.createElement("div");
      el.textContent = d;
      let cls = "cal-cell";
      if (ds === todayFull) cls += " today";
      if (count > 0) cls += " has-data";
      if (count >= 1 && count <= 2) cls += " heat-1";
      else if (count >= 3 && count <= 5) cls += " heat-2";
      else if (count > 5) cls += " heat-3";
      if (rating > 0) {
        cls += ` rating-${rating}`;
        if (rating <= 2) cls += " wasted";
      }
      el.className = cls;
      if (rating > 0 && rating <= 2) {
        el.innerHTML = d + '<span class="cal-x">✕</span>';
      }
      const titleText = count > 0 ? `${count} item${count > 1 ? "s" : ""}` : "";
      const ratingText = rating > 0 ? ` | ${rating}★` : "";
      el.title = titleText + ratingText;

      // All past days and today are clickable — show full day detail
      if (ds <= todayFull) {
        el.style.cursor = "pointer";
        el.addEventListener("click", () => this.loadDayDetail(ds, el));
      }
      grid.appendChild(el);
    }
  },

  async showRateOption(dateStr) {
    const container = document.getElementById("calDayDetail");
    container.innerHTML = `<div class="cal-detail-date">${window.RV.utils.fmtDate(dateStr)}</div><div class="rating-picker"><p style="margin:0 0 8px">Rate this day:</p><div class="star-row">${[1,2,3,4,5].map(n => `<button class="star-btn" data-rating="${n}" data-date="${dateStr}">★</button>`).join("")}</div></div>`;
    container.querySelectorAll(".star-btn").forEach(btn => {
      btn.addEventListener("click", async e => {
        const rating = parseInt(e.target.dataset.rating);
        const date = e.target.dataset.date;
        await window.RV.api.saveRating(window.RV.popup.userId, date, rating);
        await this.loadRatings();
        this.render();
      });
    });
  },

  async loadDayDetail(dateStr, cellEl) {
    document.querySelectorAll(".cal-cell.selected").forEach(c => c.classList.remove("selected"));
    if (cellEl) cellEl.classList.add("selected");
    const container = document.getElementById("calDayDetail");
    const userId = window.RV.popup.userId;
    const todayFull = window.RV.utils.todayStr();
    const isPast = dateStr < todayFull;

    container.innerHTML = `<div class="cal-detail-date">${window.RV.utils.fmtDate(dateStr)}</div><div class="empty-state" style="padding:10px"><p>Loading…</p></div>`;

    try {
      // Fetch saved items (what was studied on this day) + todos for this day in parallel
      const [savedItems, todos] = await Promise.all([
        window.RV.api.getItemsByDate(userId, dateStr),
        window.RV.api.getTodos(userId, dateStr)
      ]);

      // For past days, also fetch which items were scheduled for review on that day
      let reviewItems = [];
      if (isPast) {
        try {
          reviewItems = await this._getItemsDueOnDate(userId, dateStr);
        } catch { /* ignore */ }
      }

      container.innerHTML = `<div class="cal-detail-date">${window.RV.utils.fmtDate(dateStr)}</div>`;

      // ── SAVED (studied) items section ──
      if (savedItems.length > 0) {
        const savedHdr = document.createElement("div");
        savedHdr.className = "cal-section-hdr";
        savedHdr.textContent = `📚 Saved (${savedItems.length})`;
        container.appendChild(savedHdr);
        savedItems.forEach(item => {
          const el = document.createElement("div");
          el.className = "cal-detail-item";
          if (item._type === "mem") {
            el.innerHTML = `<div class="cal-detail-cat">${window.RV.utils.catBadge(item.category)}</div><div class="cal-detail-body"><span class="type-tag type-mem" style="margin-bottom:2px;display:inline-block">📝 note</span><span class="cal-detail-note">${window.RV.utils.esc(item.content.slice(0, 80))}${item.content.length > 80 ? "…" : ""}</span></div>`;
          } else {
            el.innerHTML = `<div class="cal-detail-cat">${window.RV.utils.catBadge(item.category)}</div><div class="cal-detail-body"><a class="cal-detail-url" href="${window.RV.utils.esc(item.url)}" target="_blank">${window.RV.utils.shortUrl(item.url, 36)}</a>${item.note ? `<span class="cal-detail-note">"${window.RV.utils.esc(item.note)}"</span>` : ""}</div>`;
          }
          container.appendChild(el);
        });
      }

      // ── REVIEW items due on this day (for past days) ──
      if (isPast && reviewItems.length > 0) {
        const revHdr = document.createElement("div");
        revHdr.className = "cal-section-hdr cal-section-hdr-review";
        revHdr.textContent = `🔁 Revisions Due (${reviewItems.length})`;
        container.appendChild(revHdr);
        reviewItems.forEach(item => {
          const el = document.createElement("div");
          // Find which interval was due on this date
          const idx = (item.nextReviewDates || []).indexOf(dateStr);
          const wasDone = idx >= 0 && (item.completedIntervals || []).includes(idx);
          el.className = `cal-detail-item cal-review-item${wasDone ? " cal-review-done" : " cal-review-missed"}`;
          const statusIcon = wasDone ? `<span class="cal-rev-status done" title="Completed">✓</span>` : `<span class="cal-rev-status missed" title="Missed">✗</span>`;
          if (item._type === "mem") {
            el.innerHTML = `<div class="cal-detail-cat">${window.RV.utils.catBadge(item.category)}</div><div class="cal-detail-body"><span class="type-tag type-mem" style="margin-bottom:2px;display:inline-block">📝 note</span><span class="cal-detail-note">${window.RV.utils.esc(item.content.slice(0, 60))}${item.content.length > 60 ? "…" : ""}</span></div>${statusIcon}`;
          } else {
            el.innerHTML = `<div class="cal-detail-cat">${window.RV.utils.catBadge(item.category)}</div><div class="cal-detail-body"><a class="cal-detail-url" href="${window.RV.utils.esc(item.url)}" target="_blank">${window.RV.utils.shortUrl(item.url, 28)}</a>${item.note ? `<span class="cal-detail-note">"${window.RV.utils.esc(item.note)}"</span>` : ""}</div>${statusIcon}`;
          }
          container.appendChild(el);
        });
      }

      // ── TODOS section ──
      if (todos.length > 0) {
        const todoHdr = document.createElement("div");
        todoHdr.className = "cal-section-hdr cal-section-hdr-todo";
        todoHdr.textContent = `✅ Tasks (${todos.length})`;
        container.appendChild(todoHdr);
        todos.forEach(todo => {
          const el = document.createElement("div");
          el.className = `cal-detail-todo${todo.done ? " cal-todo-done" : " cal-todo-pending"}`;
          el.innerHTML = `<span class="cal-todo-check">${todo.done ? "✓" : "○"}</span><span class="cal-todo-text">${window.RV.utils.esc(todo.text)}</span>`;
          container.appendChild(el);
        });
      }

      // Empty state if nothing at all
      if (savedItems.length === 0 && todos.length === 0 && reviewItems.length === 0) {
        container.innerHTML += `<div class="empty-state" style="padding:10px"><p>Nothing on this day.</p></div>`;
      }

    } catch (e) {
      container.innerHTML += `<div class="empty-state" style="padding:8px"><p>❌ Error loading.</p></div>`;
    }
  },

  // Fetch all items that had a review scheduled on a specific date
  async _getItemsDueOnDate(userId, dateStr) {
    try {
      const [ir, mr] = await Promise.all([
        fetch(`http://localhost:3001/api/items/${userId}/due-on/${dateStr}`),
        fetch(`http://localhost:3001/api/mems/${userId}/due-on/${dateStr}`)
      ]);
      const items = ((await ir.json()).items || []).map(i => ({ ...i, _type: "url" }));
      const mems = ((await mr.json()).mems || []).map(m => ({ ...m, _type: "mem" }));
      return [...items, ...mems];
    } catch {
      return [];
    }
  }
};