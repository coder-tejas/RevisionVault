// tabs/review-chips.js
window.RV = window.RV || {};

window.RV.reviewChips = {
  render(id) {
    const c = document.getElementById(id);
    if (!c) return;
    c.innerHTML = "";
    const today = new Date();
    window.RV.CONSTANTS.INTERVALS.forEach(d => {
      const dt = new Date(today);
      dt.setDate(dt.getDate() + d);
      const chip = document.createElement("span");
      chip.className = "rp-chip";
      chip.textContent = `+${d}d`;
      chip.title = dt.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
      c.appendChild(chip);
    });
  }
};