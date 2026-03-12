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
      const stars = starEl ? parseFloat(starEl.textContent.replace(',', '.')) || 0 : 0;
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
        // Replace comma decimal separator for non-US locales (e.g., Amazon.de "4,3 von 5")
        const val = parseFloat(el.textContent.replace(',', '.'));
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
        // Pattern A: "61 percent of reviews have 5 stars"
        const m1 = txt.match(/(\d+)\s*percent.*?(\d)\s*star/i);
        // Pattern B: "5 star reviews represent 61 percent"
        const m2 = txt.match(/(\d)\s*star.*?(\d+)\s*percent/i);
        if (m1) {
          const pct = parseInt(m1[1]);
          if (pct >= 0 && pct <= 100) dist[m1[2]] = pct;
        } else if (m2) {
          const pct = parseInt(m2[2]);
          if (pct >= 0 && pct <= 100) dist[m2[1]] = pct;
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
        const stars = starEl ? parseFloat(starEl.textContent.replace(',', '.')) || 0 : 0;
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

  // ── Stratified multi-star scrape (4 pages per star level, throttled) ─────────
  async fetchMoreReviews(asin) {
    if (!asin) return [];
    const domain = window.location.hostname;
    const starFilters = ['five_star', 'four_star', 'three_star', 'two_star', 'one_star'];

    // Build all URLs
    const urls = [];
    for (const filter of starFilters) {
      for (let page = 1; page <= 4; page++) {
        urls.push(`https://${domain}/product-reviews/${asin}/?filterByStar=${filter}&pageNumber=${page}`);
      }
    }

    // Fetch in batches of 5 with 300ms delay between batches to avoid bot detection
    const BATCH = 5;
    const all = [];
    for (let i = 0; i < urls.length; i += BATCH) {
      if (i > 0) await new Promise(r => setTimeout(r, 300));
      const batch = urls.slice(i, i + BATCH);
      const pages = await Promise.all(batch.map(url => this._fetchReviewPage(url)));
      pages.forEach(page => all.push(...page));
    }
    return all;
  },

  // ── Scrape product specifications from tech details tables ─────────────────
  scrapeProductSpecs() {
    const specs = {};

    // Method 1: prodDetTable (most electronics, appliances)
    const tables = document.querySelectorAll(
      '#productDetails_techSpec_section_1 .prodDetTable, ' +
      '#technicalSpecifications_section_1 .prodDetTable, ' +
      '#productDetails_detailBullets_sections1 .prodDetTable, ' +
      '.prodDetTable'
    );
    tables.forEach(table => {
      table.querySelectorAll('tr').forEach(row => {
        const th = row.querySelector('th');
        const td = row.querySelector('td');
        if (th && td) {
          const key = th.textContent.trim().replace(/\s+/g, ' ');
          const val = td.textContent.trim().replace(/\s+/g, ' ');
          if (key && val && val !== '‎') specs[key] = val;
        }
      });
    });

    // Method 2: detailBullets list format (books, simpler listings)
    if (Object.keys(specs).length === 0) {
      const bullets = document.querySelectorAll('#detailBullets_feature_div .a-list-item');
      bullets.forEach(li => {
        const spans = li.querySelectorAll('span');
        if (spans.length >= 2) {
          const key = spans[0].textContent.trim().replace(/[\s:]+$/g, '').replace(/\s+/g, ' ');
          const val = spans[1].textContent.trim().replace(/\s+/g, ' ');
          if (key && val && val !== '‎' && !key.startsWith('Customer')) specs[key] = val;
        }
      });
    }

    // Method 3: #poExpander (some Amazon.in pages use this for specs)
    if (Object.keys(specs).length === 0) {
      document.querySelectorAll('#poExpander .a-spacing-small, #poExpander tr').forEach(row => {
        const cols = row.querySelectorAll('td, span.a-text-bold, span.po-break-word');
        if (cols.length >= 2) {
          const key = cols[0].textContent.trim().replace(/\s+/g, ' ');
          const val = cols[1].textContent.trim().replace(/\s+/g, ' ');
          if (key && val) specs[key] = val;
        }
      });
    }

    // Method 4: Product overview / feature bullets (#productOverview_feature_div)
    if (Object.keys(specs).length < 3) {
      document.querySelectorAll('#productOverview_feature_div tr').forEach(row => {
        const label = row.querySelector('td.a-span3, td:first-child');
        const value = row.querySelector('td.a-span9, td:last-child');
        if (label && value && label !== value) {
          const key = label.textContent.trim().replace(/\s+/g, ' ');
          const val = value.textContent.trim().replace(/\s+/g, ' ');
          if (key && val && !specs[key]) specs[key] = val;
        }
      });
    }

    // Filter out noise keys (regulatory info, contact details, legalese)
    const noiseKeys = [
      'asin', 'date first available', 'best sellers rank', 'customer reviews',
      'is discontinued', 'manufacturer', 'importer', 'packer', 'warranty',
      'contact information', 'registered office', 'item model number',
      'item part number', 'country of origin', 'unit count',
      'included components', 'box contents', 'whats in the box',
      'what\'s in the box'
    ];
    const filtered = {};
    for (const [k, v] of Object.entries(specs)) {
      const lower = k.toLowerCase();
      if (noiseKeys.some(n => lower.includes(n))) continue;
      // Skip excessively long values (likely addresses or legal text)
      if (v.length > 120) continue;
      filtered[k] = v;
    }

    return filtered;
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
    // Target selling price, excluding MRP/strikethrough prices
    // Amazon marks MRP with .a-text-price or data-a-strike="true"
    const priceContainers = [
      '#corePriceDisplay_desktop_feature_div',
      '#apex_desktop_newAccordionRow',
      '#apex_desktop',
      '#corePrice_desktop',
    ];
    for (const container of priceContainers) {
      const wrap = document.querySelector(container);
      if (!wrap) continue;
      // Find selling price: .a-price that is NOT strikethrough
      const priceEl = wrap.querySelector('.a-price:not(.a-text-price):not([data-a-strike="true"]) .a-offscreen');
      if (priceEl && priceEl.textContent.trim()) {
        price = priceEl.textContent.trim();
        break;
      }
    }
    // Fallbacks for older Amazon layouts
    if (!price) {
      const fallbacks = ['#priceblock_dealprice', '#priceblock_ourprice', '#price_inside_buybox'];
      for (const sel of fallbacks) {
        const el = document.querySelector(sel);
        if (el && el.textContent.trim()) { price = el.textContent.trim(); break; }
      }
    }

    return { name, image, price, url: window.location.href };
  },

  // ── Deduplicate and merge reviews ──────────────────────────────────────────
  mergeReviews(pageReviews, extraReviews, maxCount) {
    maxCount = maxCount || 80;
    const seen = new Set();
    const merged = [];
    // Deduplicate ALL reviews (page + extra) using first 80 chars as fingerprint
    for (const r of [...pageReviews, ...extraReviews]) {
      const key = r.text.slice(0, 80);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(r);
    }
    return merged.slice(0, maxCount);
  },
};
