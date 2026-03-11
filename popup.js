// ReviewLens — popup.js
// Handles API key management with status-first, key-as-enhancement UX.

'use strict';

const keyInput       = document.getElementById('gemini-key');
const saveBtn        = document.getElementById('save-btn');
const clearBtn       = document.getElementById('clear-btn');
const changeBtn      = document.getElementById('change-btn');
const statusEl       = document.getElementById('rl-status');
const badgeEl        = document.getElementById('rl-badge');
const statusDot      = document.getElementById('rl-status-dot');
const statusText     = document.getElementById('rl-status-text');
const statusSub      = document.getElementById('rl-status-sub');
const keyMasked      = document.getElementById('rl-key-masked');
const enhanceSection = document.getElementById('rl-enhance-section');
const aiActiveSection = document.getElementById('rl-ai-active-section');
const enhanceToggle  = document.getElementById('rl-enhance-toggle');
const enhancePanel   = document.getElementById('rl-enhance-panel');
const enhanceArrow   = document.getElementById('rl-enhance-arrow');

// AI feature checkboxes
const featConcerns = document.getElementById('rl-feat-concerns');
const featBuy      = document.getElementById('rl-feat-buy');

// ── On open: reflect current key state ───────────────────────────────────────
chrome.storage.local.get('geminiKey', ({ geminiKey }) => {
  if (geminiKey) {
    showActiveState(geminiKey);
  } else {
    showInactiveState();
  }
});

// ── Toggle expand/collapse ───────────────────────────────────────────────────
enhanceToggle.addEventListener('click', () => {
  const isOpen = enhancePanel.classList.contains('open');
  if (isOpen) {
    enhancePanel.classList.remove('open');
    enhanceArrow.classList.remove('open');
  } else {
    enhancePanel.classList.add('open');
    enhanceArrow.classList.add('open');
    // Focus input after animation
    setTimeout(() => keyInput.focus(), 300);
  }
});

// ── Save key ─────────────────────────────────────────────────────────────────
saveBtn.addEventListener('click', () => {
  const key = keyInput.value.trim();
  setStatus('', '');

  if (!key) {
    setStatus('Enter a key first.', 'err');
    return;
  }
  if (!key.startsWith('AIza')) {
    setStatus('Gemini keys start with "AIza\u2026"', 'err');
    return;
  }

  chrome.storage.local.set({ geminiKey: key }, () => {
    keyInput.value = '';
    showActiveState(key);
  });
});

// ── Clear key ────────────────────────────────────────────────────────────────
clearBtn.addEventListener('click', () => {
  chrome.storage.local.remove('geminiKey', () => {
    showInactiveState();
  });
});

// ── Change key (re-open the enhance panel) ───────────────────────────────────
changeBtn.addEventListener('click', () => {
  showInactiveState();
  // Auto-expand the panel
  enhancePanel.classList.add('open');
  enhanceArrow.classList.add('open');
  setTimeout(() => keyInput.focus(), 300);
});

// ── State: AI key active ─────────────────────────────────────────────────────
function showActiveState(key) {
  // Badge
  badgeEl.textContent = 'AI Enhanced';
  badgeEl.className   = 'rl-badge rl-badge-enhanced';

  // Status hero
  statusDot.className = 'rl-status-dot rl-status-dot-indigo';
  statusText.textContent = 'AI-enhanced analysis';
  statusSub.textContent  = 'Local + Gemini AI on every Amazon page';

  // Show AI active section, hide enhance toggle
  enhanceSection.classList.add('hidden');
  aiActiveSection.classList.remove('hidden');
  keyMasked.textContent = key.slice(0, 8) + '\u2022'.repeat(8);

  // Enable AI feature checkmarks
  setFeatureActive(featConcerns, true);
  setFeatureActive(featBuy, true);
}

// ── State: no key (local only) ───────────────────────────────────────────────
function showInactiveState() {
  // Badge
  badgeEl.textContent = 'Ready';
  badgeEl.className   = 'rl-badge rl-badge-ready';

  // Status hero
  statusDot.className = 'rl-status-dot rl-status-dot-green';
  statusText.textContent = 'Extension active';
  statusSub.textContent  = 'Open any Amazon product page to see analysis';

  // Show enhance toggle, hide AI active section
  enhanceSection.classList.remove('hidden');
  aiActiveSection.classList.add('hidden');

  // Collapse the panel
  enhancePanel.classList.remove('open');
  enhanceArrow.classList.remove('open');

  // Dim AI features
  setFeatureActive(featConcerns, false);
  setFeatureActive(featBuy, false);

  // Clear status
  setStatus('', '');
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function setFeatureActive(featEl, active) {
  const icon  = featEl.querySelector('.rl-feat-icon');
  const label = featEl.querySelector('.rl-feat-label');
  if (active) {
    icon.className = 'rl-feat-icon rl-feat-on';
    icon.innerHTML = '&#x2713;';
    label.classList.remove('rl-feat-label-dim');
  } else {
    icon.className = 'rl-feat-icon rl-feat-off';
    icon.innerHTML = '&mdash;';
    label.classList.add('rl-feat-label-dim');
  }
}

function setStatus(msg, type) {
  statusEl.textContent = msg;
  statusEl.className   = type || '';
}
