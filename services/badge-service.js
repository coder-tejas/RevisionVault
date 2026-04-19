// services/badge-service.js
window.RV = window.RV || {};

window.RV.badgeService = {
  updateBadge() {
    chrome.runtime.sendMessage({ type: "REFRESH_BADGE" });
  }
};