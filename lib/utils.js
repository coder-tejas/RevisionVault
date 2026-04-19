// lib/utils.js - Utility functions
window.RV = window.RV || {};

window.RV.utils = {
  todayStr() {
    return new Date().toISOString().split("T")[0];
  },

  fmtDate(str) {
    if (!str) return "";
    return new Date(str + "T00:00:00").toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  },

  fmtShort(str) {
    if (!str) return "";
    return new Date(str + "T00:00:00").toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short"
    });
  },

  shortUrl(url, max) {
    try {
      const u = new URL(url);
      const s = u.hostname + u.pathname.replace(/\/$/, "");
      return s.length > max ? s.slice(0, max) + "…" : s;
    } catch {
      return url.length > max ? url.slice(0, max) + "…" : url;
    }
  },

  esc(str) {
    const d = document.createElement("div");
    d.appendChild(document.createTextNode(str || ""));
    return d.innerHTML;
  },

  catBadge(cat) {
    const cls = "cbadge-" + (cat || "Other").replace(/\s+/g, "-");
    const l = (cat || "Other").length > 8 ? (cat || "Other").slice(0, 7) + "…" : (cat || "Other");
    return `<span class="cbadge ${cls}" title="${this.esc(cat)}">${l}</span>`;
  },

  setTodayDate() {
    document.getElementById("todayDate").textContent = this.fmtDate(this.todayStr());
  }
};