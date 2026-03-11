// ReviewLens — scraper.js
// Amazon review scraping with stratified sampling, multiple fallback selectors,
// and data validation. No global state — all metadata stored on the Scraper object.

'use strict';

window.RL = window.RL || {};

window.RL.Scraper = {
  // Private state — not on window globals
  _starRating: null,
  _totalRatings: null,
  _starDist: null,

  // ── Getters for metadata ───────────────────────────────────────────────────
  get starRating()   { return this._starRating; },
  get totalRatings() { return this._totalRatings; },
  get starDist()     { return this._starDist; },

  // ── Extract ASIN from URL ──────────────────────────────────────────────────
  extractASIN() {
    const m = window.location.pathname.match(/\/dp\/([A-Z0-9]{10})/);
    return m ? m[1] : null;
  },

  // ── Scrape reviews visible on the product page ─────────────────────────────
  scrapePageReviews() {
    const reviews = [];

    // Primary selectors
    document.querySelectorAll('[data-hook="review"]').forEach(node => {
      const bodyEl = node.querySelector(
        '[data-hook="review-body"] span:not(.cr-original-review-content)'
      );
      if (!bodyEl) return;
      const text = bodyEl.innerText.trim().replace(/\n+/g, ' ');
      if (text.length < 15) return;

      const starEl = node.querySelector(
        '[data-hook="review-star-rating"] .a-icon-alt, ' +
        '[data-hook="review-star-rating-container"] .a-icon-alt'
      );
      const stars = starEl ? parseFloat(starEl.textContent) || 0 : 0;
      reviews.push({ text, stars, wordCount: text.split(/\s+/).filter(Boolean).length });
    });

    // Fallback: looser selector
    if (reviews.length === 0) {
      document.querySelectorAll('span[data-hook="review-body"]').forEach(node => {
        const text = node.innerText.trim().replace(/\n+/g, ' ');
        if (text.length < 15) return;
        reviews.push({ text, stars: 0, wordCount: text.split(/\s+/).filter(Boolean).length });
      });
    }

    // Scrape metadata alongside reviews
    this._scrapeMetadata();

    return reviews;
  },

  // ── Scrape star rating, total count, distribution ──────────────────────────
  _scrapeMetadata() {
    // Official star rating — try multiple selectors
    const ratingSelectors = [
      'span[data-hook="rating-out-of-five"] .a-icon-alt',
      '#acrPopover .a-icon-alt',
      '[data-hook="acr-average-stars-rating-text"]',
      '#averageCustomerReviews .a-icon-alt',
    ];
    for (const sel of ratingSelectors) {
      const el = document.querySelector(sel);
      if (el) {
        // Use textContent — .a-icon-alt elements are visually hidden via CSS clip,
        // and innerText skips clipped/hidden content in some browsers.
        const val = parseFloat(el.textContent);
        if (val > 0 && val <= 5) { this._starRating = val; break; }
      }
    }

    // Total ratings count
    const totalSelectors = [
      '#acrCustomerReviewText',
      '[data-hook="total-review-count"]',
      '[data-hook="total-reviews-count"]',
      '#acrCustomerReviewLink',
    ];
    for (const sel of totalSelectors) {
      const el = document.querySelector(sel);
      if (el) {
        const m = (el.textContent || '').replace(/,/g, '').match(/(\d+)/);
        if (m) { this._totalRatings = parseInt(m[1]); break; }
      }
    }

    // Star distribution histogram
    this._starDist = this._scrapeStarDistribution();
  },

  // ── Scrape star histogram — three methods with validation ──────────────────
  _scrapeStarDistribution() {
    const dist = {};

    // Method 1: Table rows (most common layout)
    const rows = document.querySelectorAll(
      '#histogramTable tr, ' +
      '.a-histogram-table tr, ' +
      '[data-hook="rating-histogram"] tr, ' +
      '#cm_cr_dp_d_rating_histogram tr'
    );
    rows.forEach(row => {
      const cells = row.querySelectorAll('td, th');
      if (cells.length < 2) return;
      const starMatch = cells[0].textContent.trim().match(/(\d)\s*star/i);
      const pctText = cells[cells.length - 1].textContent.trim().replace(/[^0-9]/g, '');
      if (starMatch && pctText) {
        const pct = parseInt(pctText);
        if (!isNaN(pct) && pct >= 0 && pct <= 100) dist[starMatch[1]] = pct;
      }
    });

    // Method 2: aria-label attributes
    if (Object.keys(dist).length < 3) {
      document.querySelectorAll('[aria-label*="percent"], [aria-label*="star"]').forEach(el => {
        const txt = el.getAttribute('aria-label') || '';
        const m = txt.match(/(\d+)\s*percent.*?(\d)\s*star/i)
               || txt.match(/(\d)\s*star.*?(\d+)\s*percent/i);
        if (m) {
          const pct = parseInt(m[1] || m[2]);
          const star = m[2] || m[1];
          if (pct >= 0 && pct <= 100) dist[star] = pct;
        }
      });
    }

    // Method 3: histogram bar widths / meter values
    if (Object.keys(dist).length < 3) {
      const bars = document.querySelectorAll(
        '.a-meter[aria-label], [data-hook="histogram-cell"] .a-meter'
      );
      bars.forEach((bar, i) => {
        if (i > 4) return;
        const star = String(5 - i);
        const width = bar.style?.width || bar.getAttribute('aria-valuenow');
        if (width) {
          const pct = parseInt(String(width).replace(/[^0-9]/g, ''));
          if (!isNaN(pct) && pct >= 0 && pct <= 100) dist[star] = pct;
        }
      });
    }

    // Validation: must have at least 3 star levels
    if (Object.keys(dist).length < 3) return null;

    // Sanity check: sum should be roughly 100 (allow 85-115 for rounding)
    const sum = Object.values(dist).reduce((a, b) => a + b, 0);
    if (sum < 85 || sum > 115) return null;

    return dist;
  },

  // ── Parse reviews from fetched HTML ────────────────────────────────────────
  _parseReviewsFromHTML(html) {
    try {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const reviews = [];
      doc.querySelectorAll('[data-hook="review"]').forEach(node => {
        const bodyEl = node.querySelector('[data-hook="review-body"] span');
        if (!bodyEl) return;
        const text = bodyEl.textContent.trim().replace(/\n+/g, ' ');
        if (text.length < 15) return;
        const starEl = node.querySelector('[data-hook="review-star-rating"] .a-icon-alt');
        const stars = starEl ? parseFloat(starEl.textContent) || 0 : 0;
        reviews.push({ text, stars, wordCount: text.split(/\s+/).filter(Boolean).length });
      });
      return reviews;
    } catch (_) { return []; }
  },

  // ── Fetch a review page via background service worker ──────────────────────
  _fetchReviewPage(url) {
    return new Promise(resolve => {
      chrome.runtime.sendMessage({ action: 'fetchPage', url }, resp => {
        if (chrome.runtime.lastError || !resp || !resp.success) { resolve([]); return; }
        resolve(this._parseReviewsFromHTML(resp.html));
      });
    });
  },

  // ── Stratified multi-star scrape (4 pages per star level = up to 200 reviews)
  async fetchMoreReviews(asin) {
    if (!asin) return [];
    const domain = window.location.hostname;
    const starFilters = ['five_star', 'four_star', 'three_star', 'two_star', 'one_star'];

    // Fetch 4 pages per star level = 20 parallel requests
    const requests = [];
    for (const filter of starFilters) {
      for (let page = 1; page <= 4; page++) {
        requests.push(
          this._fetchReviewPage(
            `https://${domain}/product-reviews/${asin}/?filterByStar=${filter}&pageNumber=${page}`
          )
        );
      }
    }

    const pages = await Promise.all(requests);
    const all = [];
    pages.forEach(page => all.push(...page));
    return all;
  },

  // ── Scrape product metadata for comparison ──────────────────────────────────
  scrapeProductMeta() {
    let name = '';
    const nameEl = document.getElementById('productTitle') || document.querySelector('#title span');
    if (nameEl) name = nameEl.textContent.trim();

    let image = '';
    const imgEl = document.getElementById('landingImage') || document.querySelector('#imgBlkFront');
    if (imgEl) image = imgEl.src || imgEl.dataset.oldHires || '';

    let price = '';
    const priceSelectors = [
      '.a-price .a-offscreen',
      '#priceblock_ourprice',
      '#priceblock_dealprice',
      'span.a-price-whole',
      '[data-hook="deal-price"]',
    ];
    for (const sel of priceSelectors) {
      const el = document.querySelector(sel);
      if (el && el.textContent.trim()) {
        price = el.textContent.trim();
        break;
      }
    }

    return { name, image, price, url: window.location.href };
  },

  // ── Deduplicate and merge reviews ──────────────────────────────────────────
  mergeReviews(pageReviews, extraReviews, maxCount) {
    maxCount = maxCount || 80;
    const seen = new Set(pageReviews.map(r => r.text.slice(0, 80)));
    const merged = [
      ...pageReviews,
      ...extraReviews.filter(r => !seen.has(r.text.slice(0, 80)))
    ];
    return merged.slice(0, maxCount);
  },
};
