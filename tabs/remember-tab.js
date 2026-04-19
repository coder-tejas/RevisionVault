// tabs/remember-tab.js - Remember tab functionality
window.RV = window.RV || {};

window.RV.rememberTab = {
  selectedRemCat: "DSA",

  getSelectedCategory() {
    return this.selectedRemCat;
  },

  setSelectedCategory(cat) {
    this.selectedRemCat = cat;
  },

  async save(userId) {
    const content = document.getElementById("memContent").value.trim();
    if (!content) return this.remToast("❌ Write something first.", true);
    const btn = document.getElementById("remSaveBtn");
    btn.disabled = true;
    btn.textContent = "Saving…";
    try {
      const res = await window.RV.api.saveMem(userId, content, this.selectedRemCat);
      const d = await res.json();
      if (!res.ok) return this.remToast("❌ " + (d.error || "Error"), true);
      this.remToast("✓ Saved! Spaced reminders set.");
      document.getElementById("memContent").value = "";
      window.RV.popup.refreshData();
    } catch {
      this.remToast("❌ Server not running.", true);
    } finally {
      btn.disabled = false;
      btn.textContent = "Save to Remember";
    }
  },

  remToast(msg, isError = false) {
    const el = document.getElementById("remToast");
    el.textContent = msg;
    el.className = "toast" + (isError ? " error" : "");
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.add("hidden"), 3000);
  }
};