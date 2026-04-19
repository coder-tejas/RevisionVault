// tabs/add-tab.js - Add tab functionality
window.RV = window.RV || {};

window.RV.addTab = {
  selectedAddCat: "DSA",
  currentUrl: "",

  async loadCurrentUrl() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url) {
        this.currentUrl = tab.url;
        document.getElementById("currentUrl").textContent = window.RV.utils.shortUrl(this.currentUrl, 50);
      }
    } catch {
      document.getElementById("currentUrl").textContent = "Cannot read tab URL";
    }
  },

  getSelectedCategory() {
    return this.selectedAddCat;
  },

  setSelectedCategory(cat) {
    this.selectedAddCat = cat;
  },

  getCurrentUrl() {
    return this.currentUrl;
  },

  async save(userId) {
    if (!this.currentUrl || this.currentUrl.startsWith("chrome://")) {
      window.RV.popup.toast("❌ Can't save this page.", true);
      return;
    }
    const note = document.getElementById("noteInput").value.trim();
    const btn = document.getElementById("saveBtn");
    btn.disabled = true;
    btn.textContent = "Saving…";
    try {
      const res = await window.RV.api.saveItem(userId, this.currentUrl, this.selectedAddCat, note);
      const d = await res.json();
      if (res.status === 409) return window.RV.popup.toast("⚠️ Already saved today!", true);
      if (!res.ok) return window.RV.popup.toast("❌ " + (d.error || "Error"), true);
      window.RV.popup.toast("✓ Saved! Reminders set.");
      document.getElementById("noteInput").value = "";
      window.RV.popup.refreshData();
    } catch {
      window.RV.popup.toast("❌ Server not running.", true);
    } finally {
      btn.disabled = false;
      btn.textContent = "Save to Vault";
    }
  }
};