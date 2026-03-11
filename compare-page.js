// ReviewLens — compare-page.js
// Renders the comparison grid on compare.html. Reads from chrome.storage.local.

'use strict';

const STORAGE_KEY = 'rl_compare';
const container   = document.getElementById('rl-cmp-container');
const countEl     = document.getElementById('rl-cmp-count');
const clearBtn    = document.getElementById('rl-cmp-clear');

// ── Escape HTML ──────────────────────────────────────────────────────────────
function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Trust score color ────────────────────────────────────────────────────────
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

  // Find best trust score for highlighting
  const bestScore = Math.max(...products.map(p => p.trustScore || 0));

  container.innerHTML = '<div class="rl-cmp-grid">' +
    products.map(p => renderColumn(p, bestScore)).join('') +
    '</div>';

  // Animate bars after render
  requestAnimationFrame(() => {
    container.querySelectorAll('[data-bar-width]').forEach(bar => {
      bar.style.width = bar.dataset.barWidth;
    });
  });

  // Remove buttons
  container.querySelectorAll('.rl-cmp-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const asin = btn.dataset.asin;
      chrome.storage.local.get(STORAGE_KEY, data => {
        const list = (data[STORAGE_KEY] || []).filter(p => p.asin !== asin);
        chrome.storage.local.set({ [STORAGE_KEY]: list }, load);
      });
    });
  });
}

function renderColumn(p, bestScore) {
  const score = p.trustScore || 0;
  const color = trustColor(score);
  const label = trustLabel(score);
  const verdict = (p.verdict || 'unknown').toLowerCase();
  const isBest = products => score === bestScore && bestScore > 0;

  const imageHtml = p.image
    ? `<img class="rl-cmp-img" src="${esc(p.image)}" alt="">`
    : `<div class="rl-cmp-img-placeholder">&#x1F4E6;</div>`;

  const pulseHtml = p.emotionalPulse ? `
    <div class="rl-cmp-pulse">
      <div class="rl-cmp-section-title">Emotional Pulse</div>
      ${renderBar('Positive', p.emotionalPulse.positive, 'pos')}
      ${renderBar('Neutral', p.emotionalPulse.neutral, 'neu')}
      ${renderBar('Negative', p.emotionalPulse.negative, 'neg')}
    </div>` : '';

  const specsHtml = renderSpecsSection(p.specs);
  const concernsHtml = renderListSection('Recurring Concerns', p.concerns, 'concerns');
  const praisesHtml  = renderListSection('What People Love', p.praises, 'praises');
  const goodForHtml  = renderListSection('Good For', p.goodFor, 'good-for');
  const avoidIfHtml  = renderListSection('Avoid If', p.avoidIf, 'avoid-if');

  const bestBadge = score === bestScore && bestScore > 0
    ? '<div class="rl-cmp-best-badge">Best Pick</div>'
    : '';
  const bestClass = score === bestScore && bestScore > 0 ? ' rl-cmp-best' : '';

  return `
    <div class="rl-cmp-col${bestClass}">
      ${bestBadge}
      <div class="rl-cmp-product-header">
        ${imageHtml}
        <div class="rl-cmp-name">
          ${p.url ? `<a href="${esc(p.url)}" target="_blank">${esc(p.name)}</a>` : esc(p.name)}
        </div>
        ${p.price ? `<div class="rl-cmp-price">${esc(p.price)}</div>` : ''}
      </div>

      <div class="rl-cmp-trust">
        <div class="rl-cmp-trust-score" style="color:${color}">${score}</div>
        <div class="rl-cmp-trust-label" style="color:${color}">${label}</div>
        <div class="rl-cmp-rating-row">
          <span class="rl-cmp-star">&#9733;</span>
          <span>${p.rating ? p.rating.toFixed(1) : '—'}</span>
          ${p.totalRatings ? `<span class="rl-cmp-total-ratings">(${p.totalRatings.toLocaleString()})</span>` : ''}
        </div>
        <div class="rl-cmp-verdict rl-cmp-verdict-${verdict}">${esc(verdict)}</div>
      </div>

      ${specsHtml}
      ${pulseHtml}
      ${concernsHtml}
      ${praisesHtml}
      ${goodForHtml}
      ${avoidIfHtml}

      <div class="rl-cmp-remove-wrap">
        <button class="rl-cmp-remove" data-asin="${esc(p.asin)}">Remove from comparison</button>
      </div>
    </div>`;
}

function renderBar(label, value, type) {
  return `
    <div class="rl-cmp-bar-row">
      <div class="rl-cmp-bar-label">
        <span>${label}</span>
        <span class="rl-cmp-bar-pct">${value || 0}%</span>
      </div>
      <div class="rl-cmp-bar-track">
        <div class="rl-cmp-bar rl-cmp-bar-${type}" style="width:0%" data-bar-width="${value || 0}%"></div>
      </div>
    </div>`;
}

function renderSpecsSection(specs) {
  if (!specs || Object.keys(specs).length === 0) return '';
  const entries = Object.entries(specs);
  const items = entries.map(([k, v]) =>
    `<li><span class="rl-cmp-spec-key">${esc(k)}</span><span class="rl-cmp-spec-val">${esc(v)}</span></li>`
  ).join('');

  return `
    <div class="rl-cmp-list-section">
      <div class="rl-cmp-section-title">Specifications</div>
      <ul class="rl-cmp-specs-list">${items}</ul>
    </div>`;
}

function renderListSection(title, items, type) {
  if (!items || items.length === 0) return '';
  const listItems = items.map(item => {
    const text = typeof item === 'string' ? item : (item.phrase || item);
    return `<li>${esc(text)}</li>`;
  }).join('');

  return `
    <div class="rl-cmp-list-section">
      <div class="rl-cmp-section-title">${title}</div>
      <ul class="rl-cmp-list rl-cmp-${type}">${listItems}</ul>
    </div>`;
}

// ── Clear all ────────────────────────────────────────────────────────────────
clearBtn.addEventListener('click', () => {
  if (confirm('Remove all products from comparison?')) {
    chrome.storage.local.remove(STORAGE_KEY, load);
  }
});

// ── Init ─────────────────────────────────────────────────────────────────────
load();

// Listen for storage changes (if user removes from another tab)
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes[STORAGE_KEY]) {
    load();
  }
});
