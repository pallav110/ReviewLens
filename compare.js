// ReviewLens — compare.js
// Product comparison storage: save, load, remove products for side-by-side comparison.
// Uses chrome.storage.local under the key 'rl_compare'. Max 10 products.

'use strict';

window.RL = window.RL || {};

window.RL.Compare = {

  MAX_PRODUCTS: 10,
  STORAGE_KEY: 'rl_compare',

  // ── Save a product to comparison list ──────────────────────────────────────
  async save(product) {
    const list = await this.getAll();

    // Prevent duplicates by ASIN
    if (list.some(p => p.asin === product.asin)) {
      return { success: false, reason: 'already_saved' };
    }

    if (list.length >= this.MAX_PRODUCTS) {
      return { success: false, reason: 'limit_reached' };
    }

    list.push({
      asin:        product.asin,
      name:        product.name || 'Unknown product',
      image:       product.image || '',
      price:       product.price || '',
      url:         product.url || '',
      rating:      product.rating != null ? product.rating : null,
      totalRatings: product.totalRatings != null ? product.totalRatings : null,
      trustScore:  product.trustScore != null ? product.trustScore : null,
      verdict:     product.verdict || '',
      concerns:    (product.concerns || []).slice(0, 5),
      praises:     (product.praises || []).slice(0, 5),
      goodFor:     (product.goodFor || []).slice(0, 5),
      avoidIf:     (product.avoidIf || []).slice(0, 5),
      emotionalPulse: product.emotionalPulse || null,
      specs:       product.specs || {},
      savedAt:     Date.now()
    });

    await this._persist(list);
    return { success: true, count: list.length };
  },

  // ── Remove a product by ASIN ───────────────────────────────────────────────
  async remove(asin) {
    let list = await this.getAll();
    list = list.filter(p => p.asin !== asin);
    await this._persist(list);
    return list.length;
  },

  // ── Get all saved products ─────────────────────────────────────────────────
  getAll() {
    return new Promise(resolve => {
      chrome.storage.local.get(this.STORAGE_KEY, data => {
        resolve(data[this.STORAGE_KEY] || []);
      });
    });
  },

  // ── Check if a specific ASIN is saved ──────────────────────────────────────
  async isSaved(asin) {
    const list = await this.getAll();
    return list.some(p => p.asin === asin);
  },

  // ── Clear all saved products ───────────────────────────────────────────────
  clearAll() {
    return new Promise(resolve => {
      chrome.storage.local.remove(this.STORAGE_KEY, resolve);
    });
  },

  // ── Count saved products ───────────────────────────────────────────────────
  async count() {
    const list = await this.getAll();
    return list.length;
  },

  // ── Persist to storage ─────────────────────────────────────────────────────
  _persist(list) {
    return new Promise(resolve => {
      chrome.storage.local.set({ [this.STORAGE_KEY]: list }, resolve);
    });
  }
};
