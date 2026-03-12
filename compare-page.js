// ReviewLens — compare-page.js
// Renders the comparison table on compare.html. Reads from chrome.storage.local.

'use strict';

const STORAGE_KEY = 'rl_compare';
const container   = document.getElementById('rl-cmp-container');
const countEl     = document.getElementById('rl-cmp-count');
const clearBtn    = document.getElementById('rl-cmp-clear');

// ── Escape HTML ──────────────────────────────────────────────────────────────
function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ── Trust score helpers ──────────────────────────────────────────────────────
function trustColor(score) {
  if (score >= 75) return '#4ade80';
  if (score >= 55) return '#fbbf24';
  if (score >= 35) return '#fb923c';
  return '#f87171';
}
function trustLabel(score) {
  if (score >= 75) return 'High Trust';
  if (score >= 55) return 'Moderate';
  if (score >= 35) return 'Caution';
  return 'Low Trust';
}
function verdictClass(v) {
  return `rl-cmp-verdict-${(v || 'unknown').toLowerCase()}`;
}

// ── Spec normalization ───────────────────────────────────────────────────────
const NOISE_KEYS = [
  'asin', 'date first available', 'best sellers rank', 'customer reviews',
  'is discontinued', 'manufacturer', 'importer', 'packer', 'warranty',
  'contact information', 'registered office', 'item model number',
  'item part number', 'country of origin', 'unit count',
  'included components', 'box contents', 'whats in the box',
  "what's in the box", 'gps geotagging', 'item type name',
  'specific uses for product', 'human interface types',
  'wireless provider', 'form factor', 'sim card size',
  'camera description', 'camera flash type',
  'headphones jack', 'phone talk time',
  'effective video resolution', 'frame rate',
  'digital zoom', 'shooting modes'
];

const KEY_ALIASES = {
  'optical sensor resolution':                  'Rear Camera',
  'rear facing camera photo sensor resolution': 'Rear Camera',
  'front photo sensor resolution':              'Front Camera',
  'number of rear facing cameras':              'Rear Cameras',
  'number of front cameras':                    'Front Cameras',
  'battery power':                              'Battery (mAh)',
  'battery capacity':                           'Battery (mAh)',
  'maximum display resolution':                 'Display Resolution',
  'resolution':                                 'Display Resolution',
  'flash memory supported size maximum':        'Storage',
  'memory storage capacity':                    'Storage',
  'ram memory installed':                       'RAM',
  'screen size unit of measure':                'Screen Size',
  'item weight unit of measure':                'Weight',
  'item dimensions':                            'Dimensions',
  'display pixel density':                      'Pixel Density',
  'wireless network technology':                'Network Bands',
  'network connectivity technology':            'Connectivity',
  'sim card slot count':                        'SIM Slots',
  'supported satellite navigation system':      'Navigation',
  'water resistance level':                     'Water Resistance',
  'video capture resolution':                   'Video Resolution',
  'biometric security feature':                 'Biometrics',
  'product features':                           'Key Features',
  'connector type':                             'Port',
  'cellular technology':                        'Network',
  'processor speed':                            'CPU Speed',
  'processor series':                           'CPU',
  'model year':                                 'Model Year',
  'colour':                                     'Color',
  'color':                                      'Color',
  'brand name':                                 'Brand',
  'display type':                               'Display Type',
  'operating system':                           'OS',
  'refresh rate':                               'Refresh Rate',
  'battery description':                        'Battery Type',
  'battery average life':                       'Battery Life',
};

function isNoiseKey(key) {
  const lower = key.toLowerCase();
  return NOISE_KEYS.some(n => lower.includes(n));
}

function normalizeKey(key) {
  return KEY_ALIASES[key.toLowerCase()] || key;
}

function normalizeSpecs(specs) {
  if (!specs) return {};
  const out = {};
  for (const [k, v] of Object.entries(specs)) {
    if (isNoiseKey(k)) continue;
    if (v && v.length > 120) continue;
    const canon = normalizeKey(k);
    if (!out[canon]) out[canon] = v;
  }
  return out;
}

// ── Load and render ──────────────────────────────────────────────────────────
function load() {
  chrome.storage.local.get(STORAGE_KEY, data => {
    const products = data[STORAGE_KEY] || [];
    render(products);
  });
}

function render(products) {
  countEl.textContent = `${products.length} product${products.length !== 1 ? 's' : ''}`;

  if (products.length === 0) {
    container.innerHTML = `
      <div class="rl-cmp-empty">
        <div class="rl-cmp-empty-icon">&#x1F50D;</div>
        <div class="rl-cmp-empty-title">No products saved yet</div>
        <div class="rl-cmp-empty-text">
          Browse Amazon product pages with ReviewLens active, then click
          <strong>"Save to Compare"</strong> in the analysis sidebar to add products here.
        </div>
      </div>`;
    return;
  }

  if (products.length === 1) {
    renderSingleProduct(products[0]);
    return;
  }

  renderTable(products);
}

// ── Single product: card view ────────────────────────────────────────────────
function renderSingleProduct(p) {
  const score = p.trustScore || 0;
  const color = trustColor(score);
  const specs = normalizeSpecs(p.specs);

  const specsHtml = Object.keys(specs).length > 0
    ? Object.entries(specs).map(([k, v]) =>
        `<li><span class="rl-cmp-spec-key">${esc(k)}</span><span class="rl-cmp-spec-val">${esc(v)}</span></li>`
      ).join('')
    : '';

  container.innerHTML = `
    <div class="rl-cmp-single-hint">Add more products to see a side-by-side comparison table</div>
    <div class="rl-cmp-single">
      <div class="rl-cmp-single-header">
        ${p.image ? `<img class="rl-cmp-img" src="${esc(p.image)}" alt="">` : ''}
        <div>
          <div class="rl-cmp-single-name">${p.url ? `<a href="${esc(p.url)}" target="_blank">${esc(p.name)}</a>` : esc(p.name)}</div>
          ${p.price ? `<div class="rl-cmp-price">${esc(p.price)}</div>` : ''}
        </div>
      </div>
      <div class="rl-cmp-single-score" style="color:${color}">
        <span class="rl-cmp-single-score-num">${score}</span>
        <span class="rl-cmp-single-score-label">${trustLabel(score)}</span>
      </div>
      ${specsHtml ? `<ul class="rl-cmp-specs-list">${specsHtml}</ul>` : ''}
      <button class="rl-cmp-remove" data-asin="${esc(p.asin)}">Remove from comparison</button>
    </div>`;

  container.querySelector('.rl-cmp-remove').addEventListener('click', () => {
    chrome.storage.local.get(STORAGE_KEY, data => {
      const list = (data[STORAGE_KEY] || []).filter(x => x.asin !== p.asin);
      chrome.storage.local.set({ [STORAGE_KEY]: list }, load);
    });
  });
}

// ── Table view (2+ products) ─────────────────────────────────────────────────
function renderTable(products) {
  const bestScore = Math.max(...products.map(p => p.trustScore || 0));
  const colCount = products.length;

  // Normalize specs for each product
  const normalized = products.map(p => normalizeSpecs(p.specs));

  // Collect all unique spec keys in order of first appearance
  const specKeyOrder = [];
  const specKeySet = new Set();
  for (const specs of normalized) {
    for (const key of Object.keys(specs)) {
      if (!specKeySet.has(key)) {
        specKeySet.add(key);
        specKeyOrder.push(key);
      }
    }
  }

  // Sort: shared specs first (present in more products), then single-product
  specKeyOrder.sort((a, b) => {
    const countA = normalized.filter(s => s[a]).length;
    const countB = normalized.filter(s => s[b]).length;
    return countB - countA;
  });

  // Find where shared specs end
  const sharedCount = specKeyOrder.filter(k =>
    normalized.filter(s => s[k]).length > 1
  ).length;

  // Build HTML
  let html = `<table class="rl-cmp-table" style="--col-count:${colCount}">`;

  // ── Product header row ──
  html += `<thead><tr class="rl-cmp-row-header">`;
  html += `<th class="rl-cmp-label-cell"></th>`;
  for (const p of products) {
    const isBest = (p.trustScore || 0) === bestScore && bestScore > 0;
    html += `<th class="rl-cmp-product-cell${isBest ? ' rl-cmp-best' : ''}">
      ${isBest ? '<div class="rl-cmp-best-badge">Best Pick</div>' : ''}
      ${p.image ? `<img class="rl-cmp-img" src="${esc(p.image)}" alt="">` : '<div class="rl-cmp-img-placeholder">&#x1F4E6;</div>'}
      <div class="rl-cmp-name">${p.url ? `<a href="${esc(p.url)}" target="_blank">${esc(p.name)}</a>` : esc(p.name)}</div>
      <button class="rl-cmp-remove-sm" data-asin="${esc(p.asin)}" title="Remove">&times;</button>
    </th>`;
  }
  html += `</tr></thead><tbody>`;

  // ── Price row ──
  html += tableRow('Price', products.map(p => p.price
    ? `<span class="rl-cmp-price">${esc(p.price)}</span>` : '—'));

  // ── Trust score row ──
  html += tableRow('Trust Score', products.map(p => {
    const s = p.trustScore || 0;
    return `<span class="rl-cmp-trust-val" style="color:${trustColor(s)}">${s}</span>
            <span class="rl-cmp-trust-sub" style="color:${trustColor(s)}">${trustLabel(s)}</span>`;
  }));

  // ── Rating row ──
  html += tableRow('Rating', products.map(p => {
    const r = p.rating ? p.rating.toFixed(1) : '—';
    const t = p.totalRatings ? `<span class="rl-cmp-total-ratings">(${p.totalRatings.toLocaleString()})</span>` : '';
    return `<span class="rl-cmp-star">&#9733;</span> ${r} ${t}`;
  }));

  // ── Verdict row ──
  html += tableRow('Verdict', products.map(p => {
    const v = (p.verdict || 'unknown').toLowerCase();
    return `<span class="rl-cmp-verdict ${verdictClass(v)}">${esc(v)}</span>`;
  }));

  // ── Specifications section ──
  if (specKeyOrder.length > 0) {
    html += `<tr class="rl-cmp-section-divider"><td colspan="${colCount + 1}">Specifications</td></tr>`;

    // Show all shared specs, hide single-product specs behind toggle
    const VISIBLE = Math.max(sharedCount, 8);
    const hiddenCount = specKeyOrder.length - VISIBLE;
    let shownSingleLabel = false;

    specKeyOrder.forEach((key, i) => {
      const presentCount = normalized.filter(s => s[key]).length;
      const isHidden = i >= VISIBLE;

      // Add a sub-divider before single-product specs
      if (!shownSingleLabel && presentCount <= 1 && sharedCount > 0) {
        shownSingleLabel = true;
        html += `<tr class="rl-cmp-row rl-cmp-row-subdiv${isHidden ? ' rl-cmp-spec-hidden' : ''}">
          <td colspan="${colCount + 1}" class="rl-cmp-subdiv-cell">Only in one product</td>
        </tr>`;
      }

      html += `<tr class="rl-cmp-row rl-cmp-row-spec${isHidden ? ' rl-cmp-spec-hidden' : ''}">`;
      html += `<td class="rl-cmp-label-cell">${esc(key)}</td>`;
      for (let pi = 0; pi < products.length; pi++) {
        const val = normalized[pi][key];
        html += `<td class="rl-cmp-val-cell${val ? '' : ' rl-cmp-missing'}">${val ? esc(val) : '—'}</td>`;
      }
      html += `</tr>`;
    });

    if (hiddenCount > 0) {
      html += `<tr class="rl-cmp-row rl-cmp-toggle-row">
        <td colspan="${colCount + 1}">
          <button class="rl-cmp-specs-toggle" id="rl-spec-toggle">Show ${hiddenCount} more specs (single-product) &#x25BE;</button>
        </td>
      </tr>`;
    }
  }

  // ── Emotional Pulse section ──
  const hasPulse = products.some(p => p.emotionalPulse);
  if (hasPulse) {
    html += `<tr class="rl-cmp-section-divider"><td colspan="${colCount + 1}">Emotional Pulse</td></tr>`;
    for (const emotion of ['positive', 'neutral', 'negative']) {
      const barType = emotion === 'positive' ? 'pos' : emotion === 'neutral' ? 'neu' : 'neg';
      html += `<tr class="rl-cmp-row">`;
      html += `<td class="rl-cmp-label-cell">${emotion.charAt(0).toUpperCase() + emotion.slice(1)}</td>`;
      for (const p of products) {
        const val = p.emotionalPulse ? (p.emotionalPulse[emotion] || 0) : 0;
        html += `<td class="rl-cmp-val-cell">
          <div class="rl-cmp-bar-inline">
            <div class="rl-cmp-bar-track-sm"><div class="rl-cmp-bar rl-cmp-bar-${barType}" style="width:0%" data-bar-width="${val}%"></div></div>
            <span class="rl-cmp-bar-pct-sm">${val}%</span>
          </div>
        </td>`;
      }
      html += `</tr>`;
    }
  }

  // ── List sections (concerns, praises, good for, avoid if) ──
  const listSections = [
    { key: 'concerns', title: 'Recurring Concerns', icon: '\u2013', color: '#ef4444' },
    { key: 'praises',  title: 'What People Love',   icon: '+', color: '#22c55e' },
    { key: 'goodFor',  title: 'Good For',            icon: '\u2713', color: '#22c55e' },
    { key: 'avoidIf',  title: 'Avoid If',            icon: '\u2717', color: '#ef4444' },
  ];

  for (const sec of listSections) {
    const hasData = products.some(p => p[sec.key] && p[sec.key].length > 0);
    if (!hasData) continue;

    html += `<tr class="rl-cmp-section-divider"><td colspan="${colCount + 1}">${sec.title}</td></tr>`;
    html += `<tr class="rl-cmp-row">`;
    html += `<td class="rl-cmp-label-cell"></td>`;
    for (const p of products) {
      const items = p[sec.key] || [];
      if (items.length === 0) {
        html += `<td class="rl-cmp-val-cell rl-cmp-missing">\u2014</td>`;
      } else {
        const listHtml = items.map(item => {
          const text = typeof item === 'string' ? item : (item.phrase || item);
          return `<li><span style="color:${sec.color};font-weight:700;margin-right:4px">${sec.icon}</span>${esc(text)}</li>`;
        }).join('');
        html += `<td class="rl-cmp-val-cell"><ul class="rl-cmp-cell-list">${listHtml}</ul></td>`;
      }
    }
    html += `</tr>`;
  }

  html += `</tbody></table>`;
  container.innerHTML = html;

  // ── Animate bars ──
  requestAnimationFrame(() => {
    container.querySelectorAll('[data-bar-width]').forEach(bar => {
      bar.style.width = bar.dataset.barWidth;
    });
  });

  // ── Spec toggle ──
  const toggleBtn = document.getElementById('rl-spec-toggle');
  if (toggleBtn) {
    const hiddenRows = container.querySelectorAll('.rl-cmp-spec-hidden');
    toggleBtn.addEventListener('click', () => {
      const isExpanded = toggleBtn.dataset.expanded === '1';
      hiddenRows.forEach(row => row.classList.toggle('rl-cmp-spec-shown'));
      toggleBtn.dataset.expanded = isExpanded ? '0' : '1';
      toggleBtn.innerHTML = isExpanded
        ? `Show ${hiddenRows.length} more specs &#x25BE;`
        : `Show less &#x25B4;`;
    });
  }

  // ── Remove buttons ──
  container.querySelectorAll('.rl-cmp-remove-sm').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      const asin = btn.dataset.asin;
      chrome.storage.local.get(STORAGE_KEY, data => {
        const list = (data[STORAGE_KEY] || []).filter(p => p.asin !== asin);
        chrome.storage.local.set({ [STORAGE_KEY]: list }, load);
      });
    });
  });
}

// ── Table row helper ─────────────────────────────────────────────────────────
function tableRow(label, cells) {
  return `<tr class="rl-cmp-row">
    <td class="rl-cmp-label-cell">${label}</td>
    ${cells.map(c => `<td class="rl-cmp-val-cell">${c}</td>`).join('')}
  </tr>`;
}

// ── Clear all ────────────────────────────────────────────────────────────────
clearBtn.addEventListener('click', () => {
  if (confirm('Remove all products from comparison?')) {
    chrome.storage.local.remove(STORAGE_KEY, load);
  }
});

// ── Init ─────────────────────────────────────────────────────────────────────
load();

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes[STORAGE_KEY]) {
    load();
  }
});
