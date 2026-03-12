// ReviewLens — cache.js
// ASIN-based result caching with 24-hour TTL to avoid redundant API calls.
// Cached results are stored in chrome.storage.local, surviving tab closes.

'use strict';

window.RL = window.RL || {};

window.RL.Cache = {
  TTL: 24 * 60 * 60 * 1000, // 24 hours
  MAX_ENTRIES: 50,
  PREFIX: 'rl_cache_',

  async get(asin) {
    if (!asin) return null;
    const key = this.PREFIX + asin;
    const data = await chrome.storage.local.get(key);
    const entry = data[key];
    if (!entry) return null;
    if (Date.now() - entry.ts > this.TTL) {
      await chrome.storage.local.remove(key);
      return null;
    }
    return entry.result;
  },

  async set(asin, result) {
    if (!asin || !result) return;
    const key = this.PREFIX + asin;
    await chrome.storage.local.set({
      [key]: { result, ts: Date.now() }
    });
    // Await cleanup to prevent concurrent cleanups racing on rapid set() calls
    await this._cleanup();
  },

  async _cleanup() {
    const all = await chrome.storage.local.get(null);
    const cacheKeys = Object.keys(all)
      .filter(k => k.startsWith(this.PREFIX))
      .map(k => ({ key: k, ts: all[k].ts || 0 }))
      .sort((a, b) => b.ts - a.ts);

    const toRemove = [];
    cacheKeys.forEach((entry, i) => {
      if (i >= this.MAX_ENTRIES || Date.now() - entry.ts > this.TTL) {
        toRemove.push(entry.key);
      }
    });
    if (toRemove.length > 0) {
      await chrome.storage.local.remove(toRemove);
    }
  },

  async clear() {
    const all = await chrome.storage.local.get(null);
    const cacheKeys = Object.keys(all).filter(k => k.startsWith(this.PREFIX));
    if (cacheKeys.length > 0) {
      await chrome.storage.local.remove(cacheKeys);
    }
  }
};
