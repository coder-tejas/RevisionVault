// services/category-service.js
window.RV = window.RV || {};

window.RV.categoryService = {
  allCategories: [],

  async loadCategories(userId) {
    try {
      const d = await window.RV.api.fetchCategories(userId);
      this.allCategories = d.all || window.RV.CONSTANTS.DEFAULT_CATS;
    } catch {
      this.allCategories = [...window.RV.CONSTANTS.DEFAULT_CATS];
    }
    return this.allCategories;
  },

  getCategories() {
    return this.allCategories;
  },

  async addCategory(userId, name) {
    try {
      const d = await window.RV.api.createCategory(userId, name);
      if (d.error) return { success: false, error: d.error };
      return { success: true };
    } catch {
      return { success: false, error: "Server error" };
    }
  },

  async removeCategory(userId, name) {
    await window.RV.api.deleteCategory(userId, name);
  }
};