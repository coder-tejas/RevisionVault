// tabs/analytics-tab.js - Analytics dashboard
window.RV = window.RV || {};

window.RV.analyticsTab = {
  async render(userId) {
    const container = document.getElementById("analyticsScroll");
    container.innerHTML = `<div class="empty-state"><div class="ei">⏳</div><p>Crunching your data…</p></div>`;
    try {
      const d = await window.RV.api.getAnalytics(userId);
      if (!d.ok || d.empty) {
        container.innerHTML = `<div class="empty-state"><div class="ei">📊</div><p>Save some items first<br/>to see analytics.</p></div>`;
        return;
      }
      container.innerHTML = "";

      const streakD = await window.RV.api.getStreak(userId);

      const cards = document.createElement("div");
      cards.className = "stat-cards";
      const statDefs = [
        { val: d.totalItems, label: "Total Saved", cls: "stat-accent" },
        { val: streakD.streak + "d", label: "Current Streak", cls: "stat-amber" },
        { val: streakD.longest + "d", label: "Longest Streak", cls: "stat-purple" },
        { val: d.urlCount, label: "Links", cls: "stat-blue" },
        { val: d.notesCount, label: "Notes", cls: "stat-pink" },
        { val: streakD.totalDays, label: "Active Days", cls: "stat-accent" },
      ];
      statDefs.forEach(s => {
        cards.innerHTML += `<div class="stat-card"><div class="stat-value ${s.cls}">${s.val}</div><div class="stat-label">${s.label}</div></div>`;
      });
      container.appendChild(cards);

      container.appendChild(this.makeCatChart(d));
      container.appendChild(this.makeVelocityChart(d));
      container.appendChild(this.makeIntervalGrid(d));
      container.appendChild(this.makeJumpGauge(d));
      container.appendChild(this.makeDowChart(d));
      container.appendChild(this.makeTimeline(d));

      if (d.neglected && d.neglected.rate < 60) {
        container.appendChild(this.makeNeglectAlert(d));
      }
    } catch (e) {
      container.innerHTML = `<div class="empty-state"><div class="ei">❌</div><p>Server offline or error.<br/>${e.message}</p></div>`;
    }
  },

  makeSection(title) {
    const section = document.createElement("div");
    section.className = "an-section";
    const h = document.createElement("div");
    h.className = "an-title";
    h.textContent = title;
    section.appendChild(h);
    return section;
  },

  makeCatChart(d) {
    const catSection = this.makeSection("Topic Distribution");
    const maxCat = Math.max(...Object.values(d.catCount), 1);
    const barChart = document.createElement("div");
    barChart.className = "bar-chart";
    Object.entries(d.catCount).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
      const color = window.RV.CONSTANTS.CAT_COLORS[cat] || "#9ca3af";
      const pct = Math.round((count / maxCat) * 100);
      barChart.innerHTML += `<div class="bar-row"><span class="bar-label" title="${window.RV.utils.esc(cat)}">${window.RV.utils.esc(cat.length > 10 ? cat.slice(0, 9) + "…" : cat)}</span><div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${color}"></div></div><span class="bar-val">${count}</span></div>`;
    });
    catSection.appendChild(barChart);
    return catSection;
  },

  makeVelocityChart(d) {
    const velSection = this.makeSection("Weekly Velocity (Last 10 Weeks)");
    const velWrap = document.createElement("div");
    velWrap.className = "line-chart-wrap";
    const W = 330, H = 70, pad = 8;
    const vals = d.weeklyVelocity.map(w => w.count);
    const maxVal = Math.max(...vals, 1);
    const pts = vals.map((v, i) => ({ x: pad + (i / (vals.length - 1)) * (W - pad * 2), y: H - pad - (v / maxVal) * (H - pad * 2), v }));
    const polyline = pts.map(p => `${p.x},${p.y}`).join(" ");
    const area = `${pts[0].x},${H} ` + pts.map(p => `${p.x},${p.y}`).join(" ") + ` ${pts[pts.length - 1].x},${H}`;
    const weekLabels = d.weeklyVelocity.map((w, i) => `<text x="${pad + (i / (vals.length - 1)) * (W - pad * 2)}" y="${H + 12}" text-anchor="middle" font-size="8" fill="#52526a">${w.week}</text>`).join("");
    const dotMarkers = pts.map(p => `<circle cx="${p.x}" cy="${p.y}" r="3" fill="#00ffa3"/>${p.v > 0 ? `<text x="${p.x}" y="${p.y - 6}" text-anchor="middle" font-size="8" fill="#7878a0">${p.v}</text>` : ""}`).join("");
    velWrap.innerHTML = `<svg viewBox="0 0 ${W} ${H + 18}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="vg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#00ffa3" stop-opacity=".25"/><stop offset="100%" stop-color="#00ffa3" stop-opacity="0"/></linearGradient></defs><polygon points="${area}" fill="url(#vg)"/><polyline points="${polyline}" fill="none" stroke="#00ffa3" stroke-width="1.5" stroke-linejoin="round"/>${dotMarkers}${weekLabels}</svg>`;
    velSection.appendChild(velWrap);
    return velSection;
  },

  makeIntervalGrid(d) {
    const intSection = this.makeSection("Review Completion by Interval");
    const intGrid = document.createElement("div");
    intGrid.className = "interval-grid";
    d.intervalStats.forEach(s => {
      const rate = s.rate !== null ? s.rate : null;
      const color = rate === null ? "#52526a" : rate >= 70 ? "#00ffa3" : rate >= 40 ? "#f59e0b" : "#ef4444";
      const display = rate !== null ? rate + "%" : "—";
      intGrid.innerHTML += `<div class="interval-card"><div class="interval-label">${s.label}</div><div class="interval-rate" style="color:${color}">${display}</div><div class="interval-sub">${s.completed}/${s.eligible}</div><div class="interval-bar"><div class="interval-bar-fill" style="width:${rate || 0}%;background:${color}"></div></div></div>`;
    });
    intSection.appendChild(intGrid);
    return intSection;
  },

  makeJumpGauge(d) {
    const jumpSection = this.makeSection("Focus vs Topic-Jumping (Last 30 Days)");
    const jumpEl = document.createElement("div");
    jumpEl.className = "jump-gauge";
    const score = d.jumpScore;
    const jumpColor = score < 30 ? "#00ffa3" : score < 60 ? "#f59e0b" : "#ef4444";
    const jumpDesc = score < 30 ? "High focus — you stick to topics well." : score < 60 ? "Moderate jumping." : "Heavy topic switching.";
    jumpEl.innerHTML = `<div class="jump-score-big" style="color:${jumpColor}">${score}%</div><div class="jump-info"><div class="jump-info-title">${score < 30 ? "Deep Focus" : score < 60 ? "Mixed" : "Topic Hopper"}</div><div class="jump-info-desc">${jumpDesc}</div></div>`;
    jumpSection.appendChild(jumpEl);
    return jumpSection;
  },

  makeDowChart(d) {
    const dowSection = this.makeSection(`Best Study Day: ${d.bestDay}`);
    const dowWrap = document.createElement("div");
    dowWrap.className = "dow-chart";
    const maxDow = Math.max(...d.dayOfWeekCount, 1);
    d.dayOfWeekCount.forEach((count, i) => {
      const pct = Math.max((count / maxDow) * 100, 4);
      const isBest = count === maxDow && count > 0;
      dowWrap.innerHTML += `<div class="dow-bar-wrap"><div class="dow-bar${isBest ? " best" : ""}" style="height:${pct}%;background:${isBest ? "var(--accent)" : "var(--s3)"}"></div><div class="dow-label">${d.dayNames[i]}</div></div>`;
    });
    dowSection.appendChild(dowWrap);
    return dowSection;
  },

  makeTimeline(d) {
    const tlSection = this.makeSection("Activity Per Topic (Last 14 Days)");
    const tlWrap = document.createElement("div");
    tlWrap.className = "cat-timeline";
    const tlCats = d.categoryTimeline.filter(ct => ct.days.some(day => day.count > 0));
    if (tlCats.length === 0) {
      tlWrap.innerHTML = `<div style="font-size:10px;color:var(--muted);text-align:center;padding:8px">No activity in last 14 days.</div>`;
    } else {
      tlCats.forEach(ct => {
        const color = window.RV.CONSTANTS.CAT_COLORS[ct.cat] || "#9ca3af";
        const maxC = Math.max(...ct.days.map(d => d.count), 1);
        const cells = ct.days.map(day => {
          const alpha = day.count > 0 ? 0.2 + (day.count / maxC) * 0.8 : 0;
          const bg = day.count > 0 ? `${color}${Math.round(alpha * 255).toString(16).padStart(2, "0")}` : "var(--s3)";
          return `<div class="cat-tl-cell" style="background:${bg}" title="${day.date}: ${day.count}"></div>`;
        }).join("");
        tlWrap.innerHTML += `<div class="cat-tl-row"><span class="cat-tl-label" title="${window.RV.utils.esc(ct.cat)}">${window.RV.utils.esc(ct.cat.length > 9 ? ct.cat.slice(0, 8) + "…" : ct.cat)}</span><div class="cat-tl-cells">${cells}</div></div>`;
      });
    }
    tlSection.appendChild(tlWrap);
    return tlSection;
  },

  makeNeglectAlert(d) {
    const neglSection = this.makeSection("Needs Attention");
    const alert = document.createElement("div");
    alert.className = "neglect-alert";
    alert.innerHTML = `<div class="neglect-icon">😴</div><div class="neglect-text"><div class="neglect-title">${window.RV.utils.esc(d.neglected.cat)} — ${d.neglected.rate}% completion</div><div class="neglect-desc">You're saving but not reviewing. Schedule a session.</div></div>`;
    neglSection.appendChild(alert);
    return neglSection;
  }
};