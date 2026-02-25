// ReviewLens — popup.js

'use strict';

const keyInput  = document.getElementById('gemini-key');
const saveBtn   = document.getElementById('save-btn');
const clearBtn  = document.getElementById('clear-btn');
const statusEl  = document.getElementById('rl-status');
const pillEl    = document.getElementById('rl-pill');
const keyStatus = document.getElementById('rl-key-status');
const keyMasked = document.getElementById('rl-key-masked');

// ── On open: reflect current key state ───────────────────────────────────────
chrome.storage.local.get('geminiKey', ({ geminiKey }) => {
  if (geminiKey) {
    showActiveState(geminiKey);
  } else {
    showInactiveState();
  }
});

// ── Save ─────────────────────────────────────────────────────────────────────
saveBtn.addEventListener('click', () => {
  const key = keyInput.value.trim();
  setStatus('', '');

  if (!key) {
    setStatus('Enter a key first.', 'err');
    return;
  }
  if (!key.startsWith('AIza')) {
    setStatus('Gemini keys start with "AIza…"', 'err');
    return;
  }

  chrome.storage.local.set({ geminiKey: key }, () => {
    showActiveState(key);
    keyInput.value = '';
    setStatus('Saved. Refresh the Amazon page.', 'ok');
  });
});

// ── Clear ─────────────────────────────────────────────────────────────────────
clearBtn.addEventListener('click', () => {
  chrome.storage.local.remove('geminiKey', () => {
    showInactiveState();
    keyInput.value = '';
    setStatus('Key removed.', '');
  });
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function showActiveState(key) {
  pillEl.textContent = 'Active';
  pillEl.className   = 'rl-pill rl-pill-active';
  keyMasked.textContent = key.slice(0, 8) + '\u2022'.repeat(8);
  keyStatus.style.display = 'flex';
  keyInput.placeholder = 'Paste new key to replace…';
}

function showInactiveState() {
  pillEl.textContent = 'No Key';
  pillEl.className   = 'rl-pill rl-pill-inactive';
  keyStatus.style.display = 'none';
  keyInput.placeholder = 'AIza…';
}

function setStatus(msg, type) {
  statusEl.textContent = msg;
  statusEl.className   = type || '';
}
