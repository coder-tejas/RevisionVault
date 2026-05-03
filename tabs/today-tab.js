// tabs/today-tab.js - Today's due items
window.RV = window.RV || {};

window.RV.todayTab = {
  async render(userId) {
    const container = document.getElementById("dueList");
    container.innerHTML = `<div class="empty-state"><div class="ei">⏳</div><p>Loading…</p></div>`;
    try {
      const today = window.RV.utils.todayStr();
      const all = await window.RV.api.getItemsDueToday(userId);
      all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      container.innerHTML = "";
      if (all.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="ei">🎯</div><p>Nothing due today.<br/>Go build something!</p></div>`;
        document.getElementById("dueBadge").textContent = "";
        return;
      }
      let pending = 0;
      all.forEach(item => {
        const idx = item.nextReviewDates.indexOf(today);
        const isDone = (item.completedIntervals || []).includes(idx);
        if (!isDone) pending++;
        const isMem = item._type === "mem";
        const card = document.createElement("div");
        card.className = `${isMem ? "mem-card" : "due-card"}${isDone ? " done" : ""}`;
        if (isMem) {
          const isLong = item.content.length > 160;
          card.innerHTML = `
            <div class="dc-top">${window.RV.utils.catBadge(item.category)}<span class="type-tag type-mem">📝 note</span></div>
            <div class="mem-content${isLong ? "" : " expanded"}" id="mc-${item._id}">${window.RV.utils.esc(item.content)}</div>
            ${isLong ? `<button class="mem-expand" data-id="${item._id}">▼ Show more</button>` : ""}
            <div class="dc-meta">
              <span class="dc-interval">Review <strong>+${window.RV.CONSTANTS.INTERVALS[idx]}d</strong> from ${window.RV.utils.fmtShort(item.savedDate)}</span>
              <button class="done-btn" data-id="${item._id}" data-idx="${idx}" data-type="mem">${isDone ? "✓ Done" : "Mark Done"}</button>
            </div>`;
          const exp = card.querySelector(".mem-expand");
          if (exp) exp.addEventListener("click", () => {
            const mc = document.getElementById(`mc-${item._id}`);
            mc.classList.toggle("expanded");
            exp.textContent = mc.classList.contains("expanded") ? "▲ Less" : "▼ Show more";
          });
        } else {
          card.innerHTML = `
            <div class="dc-top">${window.RV.utils.catBadge(item.category)}<span class="type-tag type-url">🔗</span><a class="dc-url" href="${window.RV.utils.esc(item.url)}" target="_blank">${window.RV.utils.shortUrl(item.url, 28)}</a></div>
            ${item.note ? `<div class="dc-note">"${window.RV.utils.esc(item.note)}"</div>` : ""}
            <div class="dc-meta">
              <span class="dc-interval">Review <strong>+${window.RV.CONSTANTS.INTERVALS[idx]}d</strong> from ${window.RV.utils.fmtShort(item.savedDate)}</span>
              <button class="done-btn" data-id="${item._id}" data-idx="${idx}" data-type="url">${isDone ? "✓ Done" : "Mark Done"}</button>
            </div>`;
        }
        card.querySelector(".done-btn").addEventListener("click", async e => {
          await window.RV.api.markComplete(e.target.dataset.id, parseInt(e.target.dataset.idx), e.target.dataset.type);
          this.render(userId);
        });
        container.appendChild(card);
      });
      document.getElementById("dueBadge").textContent = pending > 0 ? String(pending) : "";
      window.RV.badgeService.updateBadge();
    } catch {
      container.innerHTML = `<div class="empty-state"><div class="ei">❌</div><p>Server offline.<br/><code>node index.js</code></p></div>`;
    }
  },

  async renderWithRating(userId) {
    const todayHdr = document.querySelector(".today-hdr");
    if (!todayHdr) return;
    
    const existingWidget = document.getElementById("ratingWidget");
    if (existingWidget) existingWidget.remove();
    
    const today = window.RV.utils.todayStr();
    const month = today.slice(0, 7);
    const ratings = await window.RV.api.getRatings(userId, month);
    const currentRating = ratings[today] || 0;
    const starsHtml = [1,2,3,4,5].map(n => {
      const active = n <= currentRating ? " active" : "";
      return `<button class="star-btn${active}" data-rating="${n}">★</button>`;
    }).join("");
    const ratingWidget = document.createElement("div");
    ratingWidget.className = "rating-widget";
    ratingWidget.id = "ratingWidget";
    ratingWidget.innerHTML = `<div class="rating-label">Rate today:</div><div class="star-row">${starsHtml}</div>`;
    todayHdr.parentNode.insertBefore(ratingWidget, todayHdr);
    ratingWidget.querySelectorAll(".star-btn").forEach(btn => {
      btn.addEventListener("click", async e => {
        const rating = parseInt(e.target.dataset.rating);
        await window.RV.api.saveRating(userId, today, rating);
        this.renderWithRating(userId);
        if (window.RV.calendarTab?.loadRatings) {
          await window.RV.calendarTab.loadRatings();
          window.RV.calendarTab.render();
        }
      });
    });
    await this.render(userId);
  }
};