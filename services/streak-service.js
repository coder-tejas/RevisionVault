// services/streak-service.js
window.RV = window.RV || {};

window.RV.streakService = {
  async loadStreak(userId) {
    try {
      const d = await window.RV.api.getStreak(userId);
      document.getElementById("streakNum").textContent = d.streak || 0;
    } catch {
      document.getElementById("streakNum").textContent = "–";
    }
  }
};