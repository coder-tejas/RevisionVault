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
      if (rating === 0 && ds < todayFull) rating = 1;
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
        if (rating <= 3) cls += " wasted";
      }
      el.className = cls;
      if (rating > 0 && rating <= 3) {
        el.innerHTML = d + '<span class="cal-x">✕</span>';
      }
      const titleText = count > 0 ? `${count} item${count > 1 ? "s" : ""}` : "";
      const ratingText = rating > 0 ? ` | ${rating}★` : "";
      el.title = titleText + ratingText;
      if (count > 0) el.addEventListener("click", () => this.loadDayDetail(ds, el));
      else el.addEventListener("click", () => this.showRateOption(ds));
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
    cellEl.classList.add("selected");
    const container = document.getElementById("calDayDetail");
    container.innerHTML = `<div class="cal-detail-date">${window.RV.utils.fmtDate(dateStr)}</div><div class="empty-state" style="padding:10px"><p>Loading…</p></div>`;
    try {
      const all = await window.RV.api.getItemsByDate(window.RV.popup.userId, dateStr);
      container.innerHTML = `<div class="cal-detail-date">${window.RV.utils.fmtDate(dateStr)} — ${all.length} item${all.length !== 1 ? "s" : ""}</div>`;
      if (all.length === 0) {
        container.innerHTML += `<div class="empty-state" style="padding:10px"><p>Nothing saved.</p></div>`;
        return;
      }
      all.forEach(item => {
        const el = document.createElement("div");
        el.className = "cal-detail-item";
        if (item._type === "mem") {
          el.innerHTML = `<div class="cal-detail-cat">${window.RV.utils.catBadge(item.category)}</div><div class="cal-detail-body"><span class="type-tag type-mem" style="margin-bottom:2px;display:inline-block">📝 note</span><span class="cal-detail-note">${window.RV.utils.esc(item.content.slice(0, 80))}${item.content.length > 80 ? "…" : ""}</span></div>`;
        } else {
          el.innerHTML = `<div class="cal-detail-cat">${window.RV.utils.catBadge(item.category)}</div><div class="cal-detail-body"><a class="cal-detail-url" href="${window.RV.utils.esc(item.url)}" target="_blank">${window.RV.utils.shortUrl(item.url, 36)}</a>${item.note ? `<span class="cal-detail-note">"${window.RV.utils.esc(item.note)}"</span>` : ""}</div>`;
        }
        container.appendChild(el);
      });
    } catch {
      container.innerHTML += `<div class="empty-state" style="padding:8px"><p>❌ Error loading.</p></div>`;
    }
  }
};