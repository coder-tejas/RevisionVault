// lib/api.js - API client functions
window.RV = window.RV || {};

const API = "http://localhost:3001";

window.RV.api = {
  async getUserId() {
    return new Promise(res => chrome.runtime.sendMessage({ type: "GET_USER_ID" }, r => res(r?.userId || "unknown")));
  },

  async checkServer() {
    const dot = document.getElementById("serverDot");
    try {
      const r = await fetch(`${API}/health`, { signal: AbortSignal.timeout(2000) });
      if (r.ok) { dot.classList.add("online"); return true; }
    } catch {}
    dot.classList.add("offline");
    return false;
  },

  async fetchCategories(userId) {
    const res = await fetch(`${API}/api/categories/${userId}`);
    return res.json();
  },

  async createCategory(userId, name) {
    const res = await fetch(`${API}/api/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, name })
    });
    return res.json();
  },

  async deleteCategory(userId, name) {
    await fetch(`${API}/api/categories/${userId}/${encodeURIComponent(name)}`, { method: "DELETE" });
  },

  async saveItem(userId, url, category, note) {
    const res = await fetch(`${API}/api/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, url, category, note })
    });
    return { status: res.status, json: () => res.json() };
  },

  async saveMem(userId, content, category) {
    const res = await fetch(`${API}/api/mems`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, content, category })
    });
    return { status: res.status, json: () => res.json() };
  },

  async getItemsDueToday(userId) {
    const [ir, mr] = await Promise.all([
      fetch(`${API}/api/items/${userId}/due-today`),
      fetch(`${API}/api/mems/${userId}/due-today`)
    ]);
    const items = ((await ir.json()).items || []).map(i => ({ ...i, _type: "url" }));
    const mems = ((await mr.json()).mems || []).map(m => ({ ...m, _type: "mem" }));
    return [...items, ...mems];
  },

  async getAllItems(userId) {
    const [ir, mr] = await Promise.all([
      fetch(`${API}/api/items/${userId}`),
      fetch(`${API}/api/mems/${userId}`)
    ]);
    const items = ((await ir.json()).items || []).map(i => ({ ...i, _type: "url" }));
    const mems = ((await mr.json()).mems || []).map(m => ({ ...m, _type: "mem" }));
    return [...items, ...mems];
  },

  async getActivityMap(userId) {
    const res = await fetch(`${API}/api/items/${userId}/activity`);
    return (await res.json()).activity || {};
  },

  async getStreak(userId) {
    const res = await fetch(`${API}/api/items/${userId}/streak`);
    return res.json();
  },

  async markComplete(id, intervalIdx, type) {
    await fetch(`${API}/api/${type === "mem" ? "mems" : "items"}/${id}/complete`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intervalIdx })
    });
  },

  async deleteItem(id, type) {
    await fetch(`${API}/api/${type === "mem" ? "mems" : "items"}/${id}`, { method: "DELETE" });
  },

  async getItemsByDate(userId, date) {
    const [ir, mr] = await Promise.all([
      fetch(`${API}/api/items/${userId}/by-date/${date}`),
      fetch(`${API}/api/mems/${userId}/by-date/${date}`)
    ]);
    const items = ((await ir.json()).items || []).map(i => ({ ...i, _type: "url" }));
    const mems = ((await mr.json()).mems || []).map(m => ({ ...m, _type: "mem" }));
    return [...items, ...mems];
  },

  async getAnalytics(userId) {
    const res = await fetch(`${API}/api/analytics/${userId}`);
    return res.json();
  }
};