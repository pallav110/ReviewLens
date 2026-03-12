// ReviewLens — ui.js
// All UI concerns: CSS, HTML templates, rendering, animations, drag/resize.
// Uses Shadow DOM for full isolation from Amazon's page styles.
// Design: soft dark slate (#1e293b) with indigo (#6366f1) accent — matches popup.

'use strict';

window.RL = window.RL || {};

// ── Sidebar CSS ─────────────────────────────────────────────────────────────────
const SIDEBAR_CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :host {
    display: block;
    position: fixed;
    top: 80px;
    right: -340px;
    width: 320px;
    height: 420px;
    z-index: 2147483647;
    transition: right 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    font-size: 13px;
    color: #e2e8f0;
  }
  :host > div { height: 100%; overflow: hidden; }

  #rl-panel {
    width: 100%; height: 100%;
    background: #1e293b;
    border-radius: 16px;
    border: 1px solid rgba(99,102,241,0.2);
    box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 0 0.5px rgba(255,255,255,0.05) inset;
    display: flex; flex-direction: column;
    overflow: hidden;
    position: relative;
  }

  /* ── Header ── */
  #rl-header {
    display: flex; justify-content: space-between; align-items: center;
    padding: 12px 14px;
    background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
    border-radius: 15px 15px 0 0; flex-shrink: 0;
    cursor: grab; user-select: none;
    border-bottom: 1px solid rgba(0,0,0,0.15);
  }
  #rl-header:active { cursor: grabbing; }
  .rl-header-left { display: flex; align-items: center; gap: 9px; }
  .rl-header-mark {
    width: 24px; height: 24px; border-radius: 6px;
    background: rgba(255,255,255,0.2);
    display: flex; align-items: center; justify-content: center;
    font-size: 10px; font-weight: 900; color: #fff;
  }
  #rl-logo { font-weight: 800; font-size: 13px; letter-spacing: 0.2px; color: #fff; }
  #rl-logo span {
    display: block; font-weight: 400; font-size: 9px;
    opacity: 0.75; letter-spacing: 0.4px; text-transform: uppercase; margin-top: 1px;
  }
  #rl-close {
    background: rgba(255,255,255,0.15); border: none; color: rgba(255,255,255,0.85);
    width: 22px; height: 22px; border-radius: 6px; cursor: pointer;
    font-size: 11px; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.15s; flex-shrink: 0;
  }
  #rl-close:hover { background: rgba(255,255,255,0.25); }

  /* ── Scrollable content ── */
  #rl-content { flex: 1; min-height: 0; overflow-y: auto; scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.08) transparent; }
  #rl-content::-webkit-scrollbar { width: 4px; }
  #rl-content::-webkit-scrollbar-track { background: transparent; }
  #rl-content::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 4px; }

  /* ── Loading ── */
  #rl-loading {
    display: flex; flex-direction: column; align-items: center;
    padding: 40px 20px 30px; text-align: center;
  }
  .rl-spinner {
    width: 30px; height: 30px;
    border: 2.5px solid rgba(255,255,255,0.06);
    border-top-color: #818cf8;
    border-radius: 50%; animation: rl-spin 0.75s linear infinite; margin-bottom: 14px;
  }
  @keyframes rl-spin { to { transform: rotate(360deg); } }
  #rl-loading-text { font-weight: 600; font-size: 13px; color: #94a3b8; margin-bottom: 5px; }
  #rl-countdown    { font-size: 11px; color: #64748b; }

  /* ── Error ── */
  #rl-error { padding: 24px 18px; text-align: center; }
  #rl-error-icon { font-size: 28px; margin-bottom: 10px; }
  #rl-error-msg  { font-size: 12px; color: #94a3b8; line-height: 1.6; }
  #rl-error-action {
    display: inline-block; margin-top: 14px;
    padding: 7px 16px; border-radius: 8px;
    background: #6366f1; color: #fff;
    font-size: 12px; font-weight: 700; cursor: pointer;
    border: none; text-decoration: none;
  }
  #rl-error-action:hover { background: #4f46e5; }

  /* ── No-key state ── */
  #rl-nokey { padding: 24px 18px; text-align: center; }
  .rl-nokey-icon { font-size: 30px; margin-bottom: 12px; }
  .rl-nokey-title { font-size: 14px; font-weight: 700; color: #e2e8f0; margin-bottom: 8px; }
  .rl-nokey-text  { font-size: 12px; color: #94a3b8; line-height: 1.6; margin-bottom: 16px; }
  .rl-nokey-steps { text-align: left; margin: 0 0 16px; padding: 0 0 0 18px; }
  .rl-nokey-steps li { font-size: 11.5px; color: #94a3b8; line-height: 1.7; }
  .rl-nokey-steps a { color: #818cf8; text-decoration: none; }

  /* ── Glass card ── */
  .rl-card {
    margin: 10px 10px 0;
    padding: 12px 13px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 12px;
    animation: rl-fade-up 0.4s ease both;
  }
  @keyframes rl-fade-up {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  #rl-results .rl-card:nth-child(1) { animation-delay: 0.05s; }
  #rl-results .rl-card:nth-child(2) { animation-delay: 0.10s; }
  #rl-results .rl-card:nth-child(3) { animation-delay: 0.15s; }
  #rl-results .rl-card:nth-child(4) { animation-delay: 0.20s; }
  #rl-results .rl-card:nth-child(5) { animation-delay: 0.25s; }
  #rl-results .rl-card:nth-child(6) { animation-delay: 0.30s; }
  #rl-results .rl-card:nth-child(7) { animation-delay: 0.35s; }
  .rl-card-title {
    font-size: 9.5px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.9px;
    color: #64748b; margin-bottom: 10px;
  }

  /* ── Trust Score hero ── */
  #rl-trust-hero { padding: 14px 14px 12px; border-bottom: 1px solid rgba(255,255,255,0.05); flex-shrink: 0; }
  .rl-trust-top { display: flex; align-items: flex-end; gap: 10px; margin-bottom: 8px; }
  #rl-trust-number {
    font-size: 54px; font-weight: 900; line-height: 1;
    font-variant-numeric: tabular-nums;
    color: #4ade80;
    text-shadow: 0 0 30px rgba(74,222,128,0.3);
    transition: color 0.5s ease, text-shadow 0.5s ease;
  }
  .rl-trust-right { padding-bottom: 6px; }
  #rl-trust-label { font-size: 12px; font-weight: 700; color: #4ade80; transition: color 0.5s; }
  #rl-trust-sublabel { font-size: 10px; color: #64748b; margin-top: 2px; }
  .rl-trust-bar-track {
    background: rgba(255,255,255,0.06);
    border-radius: 4px; height: 4px; overflow: hidden; margin-bottom: 6px;
  }
  #rl-trust-bar-fill {
    height: 100%; border-radius: 4px; width: 0%;
    background: #4ade80;
    transition: width 1s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.5s;
    box-shadow: 0 0 8px currentColor;
  }
  .rl-trust-meta { display: flex; justify-content: space-between; font-size: 9.5px; color: #64748b; }
  #rl-confidence-badge {
    font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
    padding: 2px 8px; border-radius: 10px;
    background: rgba(99,102,241,0.1); color: #818cf8;
    border: 1px solid rgba(99,102,241,0.2);
  }
  #rl-score-source {
    font-size: 9px; color: #475569; margin-top: 4px;
    font-style: italic;
  }
  #rl-summary-text {
    font-size: 11.5px; color: #94a3b8; line-height: 1.55;
    margin-top: 8px; padding-top: 8px;
    border-top: 1px solid rgba(255,255,255,0.05);
    font-style: italic;
  }

  /* ── Rating Integrity ── */
  .rl-rating-row { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
  .rl-star-box { flex: 1; text-align: center; }
  .rl-star-value { font-size: 26px; font-weight: 800; color: #e2e8f0; }
  .rl-star-icon  { color: #fbbf24; font-size: 18px; }
  .rl-star-lbl   { font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: 0.4px; margin-top: 2px; }
  .rl-rating-vs  { font-size: 11px; font-weight: 700; color: #475569; }
  #rl-rating-verdict-row { display: flex; align-items: center; gap: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.06); }
  #rl-verdict-badge {
    padding: 3px 10px; border-radius: 20px;
    font-weight: 700; font-size: 11px; flex-shrink: 0;
  }
  .rl-verdict-accurate   { background: rgba(74,222,128,0.12);  color: #4ade80; border: 1px solid rgba(74,222,128,0.25); }
  .rl-verdict-inflated   { background: rgba(248,113,113,0.12); color: #f87171; border: 1px solid rgba(248,113,113,0.25); }
  .rl-verdict-deflated   { background: rgba(96,165,250,0.12);  color: #60a5fa; border: 1px solid rgba(96,165,250,0.25); }
  .rl-verdict-suspicious { background: rgba(167,139,250,0.12); color: #a78bfa; border: 1px solid rgba(167,139,250,0.25); }
  .rl-verdict-caution    { background: rgba(251,191,36,0.12);  color: #fbbf24; border: 1px solid rgba(251,191,36,0.25); }
  .rl-verdict-unknown    { background: rgba(255,255,255,0.06); color: #94a3b8; }
  #rl-verdict-explanation { font-size: 11px; color: #94a3b8; line-height: 1.5; }

  /* ── Emotional Pulse ── */
  .rl-bar-row   { margin-bottom: 7px; }
  .rl-bar-label { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px; color: #94a3b8; }
  .rl-bar-pct   { font-weight: 700; color: #e2e8f0; }
  .rl-bar-track { background: rgba(255,255,255,0.06); border-radius: 4px; height: 6px; overflow: hidden; }
  .rl-bar       { height: 100%; border-radius: 4px; width: 0%; transition: width 0.9s cubic-bezier(0.34,1.56,0.64,1); }
  .rl-bar-positive { background: linear-gradient(90deg, #059669, #34d399); }
  .rl-bar-neutral  { background: linear-gradient(90deg, #d97706, #fbbf24); }
  .rl-bar-negative { background: linear-gradient(90deg, #dc2626, #f87171); }
  #rl-review-count { font-size: 10px; color: #64748b; margin-bottom: 10px; }

  /* ── Phrase lists ── */
  .rl-phrase-list { list-style: none; padding: 0; }
  .rl-phrase-list li {
    display: flex; justify-content: space-between; align-items: center;
    padding: 5px 0; border-bottom: 1px solid rgba(255,255,255,0.04);
    font-size: 12px; line-height: 1.4;
  }
  .rl-phrase-list li:last-child { border-bottom: none; }
  .rl-phrase-text  { flex: 1; color: #cbd5e1; }
  .rl-phrase-count {
    font-size: 10px; color: #64748b; margin-left: 8px;
    white-space: nowrap; font-variant-numeric: tabular-nums;
  }
  .rl-complaints li::before { content: "\\2013"; color: #f87171; font-weight: 700; margin-right: 8px; flex-shrink: 0; }
  .rl-praises    li::before { content: "+"; color: #34d399; font-weight: 700; margin-right: 8px; flex-shrink: 0; }
  .rl-empty-msg  { font-size: 11px; color: #475569; font-style: italic; }

  /* ── Trust Signals ── */
  #rl-trust-list { list-style: none; padding: 0; }
  .rl-trust-flag {
    display: flex; align-items: flex-start; gap: 7px;
    padding: 5px 0; border-bottom: 1px solid rgba(255,255,255,0.04);
    font-size: 11px; color: #fca5a5; line-height: 1.5;
  }
  .rl-trust-flag:last-child { border-bottom: none; }
  .rl-trust-icon { flex-shrink: 0; font-size: 11px; }
  .rl-trust-clean { font-size: 11px; color: #34d399; padding: 2px 0; }

  /* ── Should You Buy ── */
  .rl-buy-row { display: flex; gap: 8px; }
  .rl-buy-col { flex: 1; }
  .rl-buy-head { font-size: 10px; font-weight: 700; margin-bottom: 7px; display: flex; align-items: center; gap: 4px; }
  .rl-buy-head-yes { color: #34d399; }
  .rl-buy-head-no  { color: #f87171; }
  .rl-buy-list { list-style: none; padding: 0; }
  .rl-buy-list li {
    font-size: 11px; color: #94a3b8; line-height: 1.4;
    padding: 2px 0; border-bottom: 1px solid rgba(255,255,255,0.03);
  }
  .rl-buy-list li:last-child { border-bottom: none; }
  .rl-buy-empty { font-size: 11px; color: #475569; font-style: italic; }

  /* ── Product Specs ── */
  #rl-specs-list { list-style: none; padding: 0; }
  #rl-specs-list li {
    display: flex; justify-content: space-between; align-items: flex-start;
    padding: 5px 0; border-bottom: 1px solid rgba(255,255,255,0.04);
    font-size: 11px; line-height: 1.4; gap: 8px;
  }
  #rl-specs-list li:last-child { border-bottom: none; }
  .rl-spec-key {
    color: #64748b; font-weight: 600;
    flex-shrink: 0; max-width: 40%;
  }
  .rl-spec-val {
    color: #cbd5e1; text-align: right;
    word-break: break-word;
  }
  .rl-specs-toggle {
    display: flex; align-items: center; justify-content: center; gap: 4px;
    margin-top: 8px; padding: 5px 0;
    font-size: 10px; font-weight: 600; color: #818cf8;
    cursor: pointer; background: none; border: none;
    font-family: inherit; transition: color 0.15s;
  }
  .rl-specs-toggle:hover { color: #a5b4fc; }
  .rl-spec-empty {
    color: #6b7280; font-style: italic; font-size: 11px;
    padding: 10px 0; text-align: center;
  }

  /* ── AI Enhancement CTA ── */
  .rl-ai-cta {
    margin: 10px 10px 0;
    padding: 12px 13px;
    background: rgba(99,102,241,0.06);
    border: 1px dashed rgba(99,102,241,0.25);
    border-radius: 12px;
    text-align: center;
    animation: rl-fade-up 0.4s ease both;
    animation-delay: 0.35s;
  }
  .rl-ai-cta-title { font-size: 11px; font-weight: 700; color: #818cf8; margin-bottom: 5px; }
  .rl-ai-cta-text  { font-size: 10.5px; color: #64748b; line-height: 1.5; }

  /* ── Footer ── */
  #rl-footer {
    padding: 7px 14px; text-align: center;
    font-size: 9.5px; color: #475569;
    border-top: 1px solid rgba(255,255,255,0.05); flex-shrink: 0;
    letter-spacing: 0.3px;
  }

  /* ── Resize handle ── */
  #rl-resize-handle {
    position: absolute; bottom: 0; right: 0;
    width: 18px; height: 18px;
    cursor: se-resize;
    border-radius: 0 0 15px 0;
    background:
      linear-gradient(135deg,
        transparent 30%, rgba(99,102,241,0.4) 30%, rgba(99,102,241,0.4) 36%, transparent 36%,
        transparent 50%, rgba(99,102,241,0.4) 50%, rgba(99,102,241,0.4) 56%, transparent 56%,
        transparent 70%, rgba(99,102,241,0.4) 70%, rgba(99,102,241,0.4) 76%, transparent 76%
      );
    z-index: 10;
  }
  #rl-resize-handle:hover { background:
    linear-gradient(135deg,
      transparent 30%, rgba(99,102,241,0.8) 30%, rgba(99,102,241,0.8) 36%, transparent 36%,
      transparent 50%, rgba(99,102,241,0.8) 50%, rgba(99,102,241,0.8) 56%, transparent 56%,
      transparent 70%, rgba(99,102,241,0.8) 70%, rgba(99,102,241,0.8) 76%, transparent 76%
    );
  }

  /* ── Compare Button ── */
  #rl-compare-btn {
    display: flex; align-items: center; justify-content: center; gap: 6px;
    margin: 10px 10px 0;
    padding: 10px 14px;
    background: linear-gradient(135deg, rgba(99,102,241,0.12), rgba(99,102,241,0.06));
    border: 1px solid rgba(99,102,241,0.25);
    border-radius: 10px;
    color: #818cf8;
    font-size: 12px; font-weight: 700;
    cursor: pointer; transition: all 0.2s;
    font-family: inherit;
    animation: rl-fade-up 0.4s ease both;
    animation-delay: 0.4s;
  }
  #rl-compare-btn:hover {
    background: linear-gradient(135deg, rgba(99,102,241,0.2), rgba(99,102,241,0.12));
    border-color: rgba(99,102,241,0.4);
  }
  #rl-compare-btn.rl-compare-saved {
    background: rgba(74,222,128,0.08);
    border-color: rgba(74,222,128,0.25);
    color: #4ade80;
    cursor: default;
  }
  .rl-compare-icon { font-size: 13px; }
  #rl-compare-count {
    font-size: 10px; color: #64748b;
    text-align: center;
    margin: 4px 10px 0;
    animation: rl-fade-up 0.4s ease both;
    animation-delay: 0.45s;
  }
  #rl-compare-count a {
    color: #818cf8; text-decoration: none; font-weight: 600;
    cursor: pointer;
  }
  #rl-compare-count a:hover { text-decoration: underline; }

  .hidden { display: none !important; }
`;

// ── Sidebar HTML ────────────────────────────────────────────────────────────────
const SIDEBAR_HTML = `
  <div id="rl-panel">
    <div id="rl-header">
      <div class="rl-header-left">
        <div class="rl-header-mark">RL</div>
        <div id="rl-logo">ReviewLens <span>Trust Analyzer</span></div>
      </div>
      <button id="rl-close" title="Close">&#x2715;</button>
    </div>

    <div id="rl-content">
      <!-- Loading -->
      <div id="rl-loading">
        <div class="rl-spinner"></div>
        <p id="rl-loading-text">Collecting reviews...</p>
        <p id="rl-countdown"></p>
      </div>

      <!-- No API key (shown only if local analysis also can't run) -->
      <div id="rl-nokey" class="hidden">
        <div class="rl-nokey-icon">&#x1F511;</div>
        <div class="rl-nokey-title">Gemini API Key Required</div>
        <p class="rl-nokey-text">ReviewLens uses Google Gemini AI for deep review analysis. It's free.</p>
        <ol class="rl-nokey-steps">
          <li>Go to <a href="https://aistudio.google.com/app/apikey" target="_blank">aistudio.google.com</a></li>
          <li>Click <strong>Create API Key</strong></li>
          <li>Click the ReviewLens icon in your toolbar</li>
          <li>Paste your key and save</li>
        </ol>
        <p class="rl-nokey-text" style="font-size:11px">Then refresh this Amazon page.</p>
      </div>

      <!-- Error -->
      <div id="rl-error" class="hidden">
        <div id="rl-error-icon">&#x26A0;&#xFE0F;</div>
        <p id="rl-error-msg">Something went wrong.</p>
      </div>

      <!-- Trust Score Hero -->
      <div id="rl-trust-hero" class="hidden">
        <div class="rl-card-title" style="margin-bottom:8px">Trust Score</div>
        <div class="rl-trust-top">
          <div id="rl-trust-number">0</div>
          <div class="rl-trust-right">
            <div id="rl-trust-label">&mdash;</div>
            <div id="rl-trust-sublabel">/&nbsp;100</div>
          </div>
        </div>
        <div class="rl-trust-bar-track">
          <div id="rl-trust-bar-fill"></div>
        </div>
        <div class="rl-trust-meta">
          <span id="rl-sample-note"></span>
          <span id="rl-confidence-badge"></span>
        </div>
        <div id="rl-score-source"></div>
        <div id="rl-summary-text"></div>
      </div>

      <!-- Results cards -->
      <div id="rl-results" class="hidden" style="padding-bottom:10px">

        <!-- Rating Integrity -->
        <div class="rl-card">
          <div class="rl-card-title">Are The Ratings Real?</div>
          <div class="rl-rating-row">
            <div class="rl-star-box">
              <div class="rl-star-value"><span id="rl-official-stars">&mdash;</span><span class="rl-star-icon">&#9733;</span></div>
              <div class="rl-star-lbl">Official</div>
            </div>
            <div class="rl-rating-vs">vs</div>
            <div class="rl-star-box">
              <div class="rl-star-value"><span id="rl-sentiment-stars">&mdash;</span><span class="rl-star-icon">&#9733;</span></div>
              <div class="rl-star-lbl">What Reviews Say</div>
            </div>
          </div>
          <div id="rl-rating-verdict-row">
            <div id="rl-verdict-badge">&mdash;</div>
            <p id="rl-verdict-explanation"></p>
          </div>
        </div>

        <!-- Trust Signals -->
        <div class="rl-card">
          <div class="rl-card-title">Trust Signals</div>
          <ul id="rl-trust-list"></ul>
        </div>

        <!-- Emotional Pulse -->
        <div class="rl-card">
          <div class="rl-card-title">Emotional Pulse</div>
          <p id="rl-review-count"></p>
          <div class="rl-bar-row">
            <div class="rl-bar-label"><span>Positive</span><span class="rl-bar-pct" id="rl-pos-pct">0%</span></div>
            <div class="rl-bar-track"><div id="rl-pos-bar" class="rl-bar rl-bar-positive"></div></div>
          </div>
          <div class="rl-bar-row">
            <div class="rl-bar-label"><span>Neutral</span><span class="rl-bar-pct" id="rl-neu-pct">0%</span></div>
            <div class="rl-bar-track"><div id="rl-neu-bar" class="rl-bar rl-bar-neutral"></div></div>
          </div>
          <div class="rl-bar-row" style="margin-bottom:0">
            <div class="rl-bar-label"><span>Negative</span><span class="rl-bar-pct" id="rl-neg-pct">0%</span></div>
            <div class="rl-bar-track"><div id="rl-neg-bar" class="rl-bar rl-bar-negative"></div></div>
          </div>
        </div>

        <!-- Recurring Concerns -->
        <div class="rl-card" id="rl-concerns-card">
          <div class="rl-card-title">Recurring Concerns</div>
          <ul id="rl-complaints-list" class="rl-phrase-list rl-complaints"></ul>
        </div>

        <!-- What People Love -->
        <div class="rl-card" id="rl-praises-card">
          <div class="rl-card-title">What People Love</div>
          <ul id="rl-praises-list" class="rl-phrase-list rl-praises"></ul>
        </div>

        <!-- Product Specs -->
        <div class="rl-card hidden" id="rl-specs-card">
          <div class="rl-card-title">Product Specifications</div>
          <ul id="rl-specs-list"></ul>
          <button class="rl-specs-toggle hidden" id="rl-specs-toggle">Show more &#x25BE;</button>
        </div>

        <!-- Should You Buy? -->
        <div class="rl-card" id="rl-buy-card">
          <div class="rl-card-title">Should You Buy?</div>
          <div class="rl-buy-row">
            <div class="rl-buy-col">
              <div class="rl-buy-head rl-buy-head-yes">&#x2705; Good for</div>
              <ul id="rl-buy-yes" class="rl-buy-list"></ul>
            </div>
            <div class="rl-buy-col">
              <div class="rl-buy-head rl-buy-head-no">&#x274C; Avoid if</div>
              <ul id="rl-buy-no" class="rl-buy-list"></ul>
            </div>
          </div>
        </div>

        <!-- Compare Button -->
        <button id="rl-compare-btn" class="hidden">
          <span class="rl-compare-icon">&#x2696;</span>
          <span id="rl-compare-btn-text">Save to Compare</span>
        </button>
        <div id="rl-compare-count" class="hidden"></div>

        <!-- AI Enhancement CTA (shown in local-only mode) -->
        <div id="rl-ai-cta" class="rl-ai-cta hidden">
          <div class="rl-ai-cta-title">&#x2728; Enhance with Gemini AI</div>
          <div class="rl-ai-cta-text">Add a free Gemini API key for deeper analysis: concerns, praises, and buyer recommendations.</div>
        </div>

      </div><!-- /#rl-results -->
    </div><!-- /#rl-content -->

    <div id="rl-footer">ReviewLens &bull; Local + AI &bull; Drag header &bull; Resize corner</div>
    <div id="rl-resize-handle" title="Drag to resize"></div>
  </div>
`;

// ── Inline Showcase CSS (Shadow DOM) ────────────────────────────────────────────
const SHOWCASE_CSS = `
  :host {
    display: block;
    margin: 0 0 20px 0;
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  }
  .rl-showcase {
    padding: 18px 20px;
    background: #1e293b;
    border-radius: 14px;
    border: 1px solid rgba(99,102,241,0.2);
    box-shadow: 0 4px 24px rgba(0,0,0,0.2);
    display: flex; align-items: center; gap: 16px;
    position: relative; overflow: hidden;
    color: #e2e8f0;
  }
  .rl-showcase::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 2px;
    background: linear-gradient(90deg, #6366f1, #818cf8);
  }
  .rl-sc-score-wrap {
    display: flex; flex-direction: column; align-items: center;
    flex-shrink: 0; width: 64px;
  }
  .rl-sc-score-num {
    font-size: 38px; font-weight: 900; line-height: 1;
    font-variant-numeric: tabular-nums;
  }
  .rl-sc-score-label {
    font-size: 9px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.5px; margin-top: 3px; opacity: 0.7;
  }
  .rl-sc-divider {
    width: 1px; height: 50px; background: rgba(255,255,255,0.08); flex-shrink: 0;
  }
  .rl-sc-body { flex: 1; min-width: 0; }
  .rl-sc-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
  .rl-sc-brand {
    font-size: 10px; font-weight: 800; letter-spacing: 0.5px;
    text-transform: uppercase; color: #818cf8;
  }
  .rl-sc-verdict {
    padding: 2px 9px; border-radius: 20px;
    font-size: 10px; font-weight: 700; text-transform: capitalize;
  }
  .rl-sc-verdict-accurate   { background: rgba(74,222,128,0.12);  color: #4ade80; border: 1px solid rgba(74,222,128,0.25); }
  .rl-sc-verdict-inflated   { background: rgba(248,113,113,0.12); color: #f87171; border: 1px solid rgba(248,113,113,0.25); }
  .rl-sc-verdict-deflated   { background: rgba(96,165,250,0.12);  color: #60a5fa; border: 1px solid rgba(96,165,250,0.25); }
  .rl-sc-verdict-suspicious { background: rgba(167,139,250,0.12); color: #a78bfa; border: 1px solid rgba(167,139,250,0.25); }
  .rl-sc-verdict-caution    { background: rgba(251,191,36,0.12);  color: #fbbf24; border: 1px solid rgba(251,191,36,0.25); }
  .rl-sc-summary {
    font-size: 12px; color: #94a3b8; line-height: 1.5;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .rl-sc-btn {
    flex-shrink: 0;
    padding: 8px 14px;
    background: linear-gradient(135deg, #6366f1, #4f46e5);
    color: #fff;
    border: none; border-radius: 8px;
    font-size: 12px; font-weight: 700;
    cursor: pointer; transition: all 0.2s; white-space: nowrap;
    font-family: inherit;
    box-shadow: 0 2px 8px rgba(99,102,241,0.3);
  }
  .rl-sc-btn:hover {
    background: linear-gradient(135deg, #4f46e5, #4338ca);
    box-shadow: 0 4px 12px rgba(99,102,241,0.4);
  }
`;

// ── Shadow DOM references ───────────────────────────────────────────────────────
let _shadow = null;
let _host   = null;
const sd = id => _shadow && _shadow.getElementById(id);

// ── Escape HTML ─────────────────────────────────────────────────────────────────
function esc(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ── Trust score color/label ─────────────────────────────────────────────────────
function trustScoreStyle(score) {
  if (score >= 75) return { color: '#4ade80', glow: 'rgba(74,222,128,0.3)',  label: 'High Trust' };
  if (score >= 55) return { color: '#fbbf24', glow: 'rgba(251,191,36,0.3)',  label: 'Moderate' };
  if (score >= 35) return { color: '#fb923c', glow: 'rgba(251,146,60,0.3)',  label: 'Caution' };
  return                  { color: '#f87171', glow: 'rgba(248,113,113,0.3)', label: 'Low Trust' };
}

// ── Count-up animation ──────────────────────────────────────────────────────────
function animateCountUp(id, target, duration) {
  const el = sd(id);
  if (!el) return;
  const start = performance.now();
  const tick = now => {
    const p = Math.min((now - start) / duration, 1);
    el.textContent = Math.round((1 - Math.pow(1 - p, 3)) * target);
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// ══════════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ══════════════════════════════════════════════════════════════════════════════════
window.RL.UI = {

  // ── Inject sidebar into page ─────────────────────────────────────────────────
  injectSidebar() {
    _host = document.createElement('div');
    _host.id = 'reviewlens-host';
    document.body.appendChild(_host);
    _shadow = _host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = SIDEBAR_CSS;
    _shadow.appendChild(style);

    const container = document.createElement('div');
    container.innerHTML = SIDEBAR_HTML;
    container.style.cssText = 'height: 100%; overflow: hidden;';
    _shadow.appendChild(container);

    Object.assign(_host.style, {
      position: 'fixed', right: '-340px', top: '80px',
      width: '320px', height: '420px',
      zIndex: '2147483647', transition: 'right 0.4s cubic-bezier(0.16,1,0.3,1)'
    });

    setTimeout(() => { _host.style.right = '12px'; }, 500);

    sd('rl-close').addEventListener('click', () => {
      const w = parseFloat(_host.style.width) || 320;
      _host.style.right = `${-(w + 40)}px`;
    });

    this._makeDraggable(_host);
    this._makeResizable(_host);
  },

  // ── Loading state ────────────────────────────────────────────────────────────
  showLoading(text) {
    sd('rl-loading').classList.remove('hidden');
    sd('rl-trust-hero').classList.add('hidden');
    sd('rl-results').classList.add('hidden');
    sd('rl-error').classList.add('hidden');
    sd('rl-nokey').classList.add('hidden');
    sd('rl-loading-text').textContent = text || 'Analyzing...';
    sd('rl-countdown').textContent = '';
  },

  // ── No key state ─────────────────────────────────────────────────────────────
  showNoKey() {
    sd('rl-loading').classList.add('hidden');
    sd('rl-trust-hero').classList.add('hidden');
    sd('rl-results').classList.add('hidden');
    sd('rl-error').classList.add('hidden');
    sd('rl-nokey').classList.remove('hidden');
  },

  // ── Error state ──────────────────────────────────────────────────────────────
  showError(message) {
    sd('rl-loading').classList.add('hidden');
    sd('rl-trust-hero').classList.add('hidden');
    sd('rl-results').classList.add('hidden');
    sd('rl-nokey').classList.add('hidden');
    sd('rl-error').classList.remove('hidden');
    sd('rl-error-msg').textContent = message;
  },

  // ── Rate limit countdown with auto-retry ─────────────────────────────────────
  showRateLimit(seconds, onDone) {
    sd('rl-error').classList.add('hidden');
    sd('rl-trust-hero').classList.add('hidden');
    sd('rl-results').classList.add('hidden');
    sd('rl-nokey').classList.add('hidden');
    sd('rl-loading').classList.remove('hidden');
    sd('rl-loading-text').textContent = 'Rate limit hit \u2014 auto-retrying...';

    let remaining = seconds;
    const countEl = sd('rl-countdown');
    countEl.textContent = `Waiting ${remaining}s for quota reset`;

    const t = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(t);
        countEl.textContent = 'Retrying now...';
        onDone();
      } else {
        countEl.textContent = `Waiting ${remaining}s for quota reset`;
      }
    }, 1000);
  },

  // ── Show full results (local + Gemini merged) ───────────────────────────────
  showResults(data, reviewCount, localSignals, scraper) {
    sd('rl-loading').classList.add('hidden');
    sd('rl-error').classList.add('hidden');
    sd('rl-nokey').classList.add('hidden');

    const trustScore = data.trust_score || 0;

    // Emotional Pulse: prefer local computation from star dist, fall back to Gemini
    const pulse = localSignals.emotionalPulse || {
      positive: data.positive_pct || 0,
      neutral: data.neutral_pct || 0,
      negative: Math.max(0, 100 - (data.positive_pct || 0) - (data.neutral_pct || 0))
    };

    // ── Trust Score hero ──
    sd('rl-trust-hero').classList.remove('hidden');
    const { color, label, glow } = trustScoreStyle(trustScore);
    const trustNumEl   = sd('rl-trust-number');
    const trustLabelEl = sd('rl-trust-label');
    const trustBarEl   = sd('rl-trust-bar-fill');

    trustNumEl.style.color      = color;
    trustNumEl.style.textShadow = `0 0 30px ${glow}`;
    trustLabelEl.textContent    = label;
    trustLabelEl.style.color    = color;
    trustBarEl.style.background = color;
    trustBarEl.style.boxShadow  = `0 0 8px ${glow}`;

    animateCountUp('rl-trust-number', trustScore, 900);
    requestAnimationFrame(() => { trustBarEl.style.width = `${trustScore}%`; });

    const confidence = data.confidence || (reviewCount >= 50 ? 'high' : reviewCount >= 25 ? 'medium' : 'low');
    const total = scraper.totalRatings || 0;
    if (total > 0 && reviewCount < total) {
      const pct = Math.round(reviewCount / total * 100);
      sd('rl-sample-note').textContent = `${reviewCount} of ${total.toLocaleString()} reviews analyzed (${pct}%)`;
    } else {
      sd('rl-sample-note').textContent = `${reviewCount} review${reviewCount !== 1 ? 's' : ''} analyzed`;
    }
    sd('rl-confidence-badge').textContent = `${confidence.charAt(0).toUpperCase() + confidence.slice(1)} confidence`;

    // Source badge
    const sourceEl = sd('rl-score-source');
    if (data._local) {
      sourceEl.textContent = `Score: ${Math.round(data._local.trustScore * 0.7)}pts local + ${Math.round((data._gemini_score || 75) * 0.3)}pts AI`;
    } else {
      sourceEl.textContent = 'Score: local statistical analysis';
    }

    if (data.summary) {
      sd('rl-summary-text').textContent = data.summary;
      sd('rl-summary-text').classList.remove('hidden');
    } else {
      sd('rl-summary-text').classList.add('hidden');
    }

    // ── Results cards ──
    sd('rl-results').classList.remove('hidden');

    // Rating Integrity
    sd('rl-official-stars').textContent  = scraper.starRating ? scraper.starRating.toFixed(1) : '\u2014';
    const sentStars = data.sentiment_stars || localSignals.textSentiment;
    sd('rl-sentiment-stars').textContent = sentStars ? parseFloat(sentStars).toFixed(1) : '\u2014';

    const verdict = (data.rating_verdict || localSignals.ratingVerdict || 'unknown').toLowerCase();
    const verdictLabel = verdict.charAt(0).toUpperCase() + verdict.slice(1);
    const badge = sd('rl-verdict-badge');
    badge.textContent = verdictLabel;
    badge.className   = `rl-verdict-${verdict}`;

    const official = scraper.starRating ? scraper.starRating.toFixed(1) : '?';
    const textStar = sentStars ? parseFloat(sentStars).toFixed(1) : null;
    const gapNote  = textStar ? ` (text: ${textStar}\u2605 vs official: ${official}\u2605)` : '';

    const explanations = {
      accurate:   `The ${official}\u2605 rating looks genuine \u2014 what people write matches the stars they give${gapNote}.`,
      inflated:   `People's actual complaints suggest this product is worse than the ${official}\u2605 rating shows${gapNote}.`,
      deflated:   `People actually like this more than the ${official}\u2605 rating suggests \u2014 the reviews are more positive than the stars${gapNote}.`,
      suspicious: `Big mismatch \u2014 people write negative things but give high stars${gapNote}. The rating may be manipulated.`,
      caution:    `The rating might be OK, but some review patterns look off${gapNote}. Scroll down for details.`,
      unknown:    'Not enough data to tell if the rating is trustworthy.'
    };
    sd('rl-verdict-explanation').textContent = explanations[verdict] || '';

    // Trust Signals
    const flags = Array.isArray(data.trust_flags) ? data.trust_flags : [];
    const tl = sd('rl-trust-list');
    tl.innerHTML = flags.length === 0
      ? '<li class="rl-trust-clean">&#x2713; No suspicious patterns detected</li>'
      : flags.map(f => `<li class="rl-trust-flag"><span class="rl-trust-icon">&#x26A0;</span><span>${esc(f)}</span></li>`).join('');

    // Emotional Pulse
    sd('rl-review-count').textContent = scraper.starDist
      ? `Based on all${scraper.totalRatings ? ' ' + scraper.totalRatings.toLocaleString() : ''} ratings`
      : `Estimated from ${reviewCount} sampled reviews`;
    sd('rl-pos-pct').textContent = `${pulse.positive}%`;
    sd('rl-neu-pct').textContent = `${pulse.neutral}%`;
    sd('rl-neg-pct').textContent = `${pulse.negative}%`;
    requestAnimationFrame(() => {
      sd('rl-pos-bar').style.width = `${pulse.positive}%`;
      sd('rl-neu-bar').style.width = `${pulse.neutral}%`;
      sd('rl-neg-bar').style.width = `${pulse.negative}%`;
    });

    // Concerns, Praises, Buy recommendations
    this._renderPhraseList('rl-complaints-list', data.top_concerns, 'No recurring concerns found.');
    this._renderPhraseList('rl-praises-list',    data.top_praises,  'No recurring praises found.');
    this._renderBuyList('rl-buy-yes', data.good_for,  'Not enough data');
    this._renderBuyList('rl-buy-no',  data.avoid_if,  'No concerns found');

    // Hide AI CTA since we have full results
    sd('rl-ai-cta').classList.add('hidden');

    // Hide Gemini-only sections if data is missing (local-only mode)
    const hasConcerns = data.top_concerns && data.top_concerns.length > 0;
    const hasPraises  = data.top_praises && data.top_praises.length > 0;
    const hasBuy      = (data.good_for && data.good_for.length > 0) || (data.avoid_if && data.avoid_if.length > 0);

    const concernsCard = sd('rl-concerns-card');
    const praisesCard  = sd('rl-praises-card');
    const buyCard      = sd('rl-buy-card');
    if (!hasConcerns && !data.top_concerns) concernsCard.classList.add('hidden');
    else concernsCard.classList.remove('hidden');
    if (!hasPraises && !data.top_praises) praisesCard.classList.add('hidden');
    else praisesCard.classList.remove('hidden');
    if (!hasBuy && !data.good_for) buyCard.classList.add('hidden');
    else buyCard.classList.remove('hidden');
  },

  // ── Show local-only results (no API key / Gemini failure) ────────────────────
  showLocalOnlyResults(localSignals, reviewCount, scraper) {
    const localData = {
      trust_score: localSignals.trustScore,
      trust_flags: localSignals.signals.map(s => s.detail),
      rating_verdict: localSignals.ratingVerdict,
      sentiment_stars: localSignals.textSentiment,
      positive_pct: localSignals.emotionalPulse ? localSignals.emotionalPulse.positive : null,
      neutral_pct: localSignals.emotionalPulse ? localSignals.emotionalPulse.neutral : null,
      negative_pct: localSignals.emotionalPulse ? localSignals.emotionalPulse.negative : null,
      confidence: reviewCount >= 50 ? 'high' : reviewCount >= 25 ? 'medium' : 'low',
      summary: null,
      top_concerns: null,
      top_praises: null,
      good_for: null,
      avoid_if: null,
    };

    this.showResults(localData, reviewCount, localSignals, scraper);
    sd('rl-ai-cta').classList.remove('hidden');
    sd('rl-score-source').textContent = 'Score: local statistical analysis only';
  },

  // ── Inline showcase card (above Amazon reviews section) ──────────────────────
  injectInlineShowcase(data, localSignals) {
    if (document.getElementById('reviewlens-showcase-host')) return;

    const anchor = document.querySelector(
      '#reviewsMedley, #customer-reviews, [data-hook="reviews:medley"], #reviews-medley'
    );
    if (!anchor) return;

    const host = document.createElement('div');
    host.id = 'reviewlens-showcase-host';
    anchor.parentNode.insertBefore(host, anchor);

    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = SHOWCASE_CSS;
    shadow.appendChild(style);

    const trustScore = data.trust_score || 0;
    const verdict    = (data.rating_verdict || localSignals.ratingVerdict || 'unknown').toLowerCase();
    const { color }  = trustScoreStyle(trustScore);

    const card = document.createElement('div');
    card.className = 'rl-showcase';
    card.innerHTML = `
      <div class="rl-sc-score-wrap">
        <div class="rl-sc-score-num" style="color:${color}">${trustScore}</div>
        <div class="rl-sc-score-label" style="color:${color}">Trust Score</div>
      </div>
      <div class="rl-sc-divider"></div>
      <div class="rl-sc-body">
        <div class="rl-sc-header">
          <span class="rl-sc-brand">ReviewLens</span>
          <span class="rl-sc-verdict rl-sc-verdict-${verdict}">${esc(verdict)}</span>
        </div>
        <div class="rl-sc-summary">${esc(data.summary || 'Analysis complete. See full panel for details.')}</div>
      </div>
      <button class="rl-sc-btn">Full Analysis &rarr;</button>
    `;
    shadow.appendChild(card);

    card.querySelector('.rl-sc-btn').addEventListener('click', () => {
      if (!_host) return;
      _host.style.right = '12px';
      // Flash the sidebar to draw attention if already visible
      _host.style.transition = 'none';
      _host.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.5)';
      requestAnimationFrame(() => {
        _host.style.transition = 'box-shadow 0.6s ease, right 0.4s cubic-bezier(0.16,1,0.3,1)';
        setTimeout(() => { _host.style.boxShadow = 'none'; }, 600);
      });
    });
  },

  // ── Set up compare button ───────────────────────────────────────────────────
  // ── Show product specifications ─────────────────────────────────────────────
  showSpecs(specs) {
    const card    = sd('rl-specs-card');
    const list    = sd('rl-specs-list');
    const toggle  = sd('rl-specs-toggle');
    if (!card || !list) return;

    const entries = Object.entries(specs);
    card.classList.remove('hidden');

    if (entries.length === 0) {
      list.innerHTML = '<li class="rl-spec-empty">Specs not available for this product</li>';
      if (toggle) toggle.classList.add('hidden');
      return;
    }

    // Show first 6 specs, rest behind "show more"
    const INITIAL = 6;
    const renderItems = (items) =>
      items.map(([k, v]) =>
        `<li><span class="rl-spec-key">${esc(k)}</span><span class="rl-spec-val">${esc(v)}</span></li>`
      ).join('');

    if (entries.length <= INITIAL) {
      list.innerHTML = renderItems(entries);
      if (toggle) toggle.classList.add('hidden');
    } else {
      list.innerHTML = renderItems(entries.slice(0, INITIAL));
      toggle.classList.remove('hidden');
      toggle.innerHTML = 'Show more &#x25BE;';

      // Replace node to clear any prior listeners
      const fresh = toggle.cloneNode(true);
      toggle.parentNode.replaceChild(fresh, toggle);

      let expanded = false;
      fresh.addEventListener('click', () => {
        expanded = !expanded;
        if (expanded) {
          list.innerHTML = renderItems(entries);
          fresh.innerHTML = 'Show less &#x25B4;';
        } else {
          list.innerHTML = renderItems(entries.slice(0, INITIAL));
          fresh.innerHTML = 'Show more &#x25BE;';
        }
      });
    }
  },

  async setupCompareButton(productData, CompareModule) {
    const btn       = sd('rl-compare-btn');
    const btnText   = sd('rl-compare-btn-text');
    const countLine = sd('rl-compare-count');
    if (!btn) return;

    const Compare = CompareModule;
    if (!Compare) { btn.classList.add('hidden'); return; }

    // Check if already saved BEFORE showing the button to avoid flash of wrong state
    const alreadySaved = await Compare.isSaved(productData.asin);
    if (alreadySaved) {
      btn.classList.add('rl-compare-saved');
      btnText.textContent = '\u2713 Saved to Compare';
    }

    btn.classList.remove('hidden');

    // Show count
    const count = await Compare.count();
    if (count > 0) {
      countLine.classList.remove('hidden');
      countLine.innerHTML = `${count} product${count !== 1 ? 's' : ''} saved \u2014 <a id="rl-open-compare">View Comparison</a>`;
      const openLink = sd('rl-open-compare');
      if (openLink) {
        openLink.addEventListener('click', () => {
          chrome.runtime.sendMessage({ action: 'openCompare' });
        });
      }
    }

    // Click handler (only if not already saved)
    if (!alreadySaved) {
      btn.addEventListener('click', async () => {
        const result = await Compare.save(productData);
        if (result.success) {
          btn.classList.add('rl-compare-saved');
          btnText.textContent = '\u2713 Saved to Compare';

          countLine.classList.remove('hidden');
          countLine.innerHTML = `${result.count} product${result.count !== 1 ? 's' : ''} saved \u2014 <a id="rl-open-compare">View Comparison</a>`;
          const openLink = sd('rl-open-compare');
          if (openLink) {
            openLink.addEventListener('click', () => {
              chrome.runtime.sendMessage({ action: 'openCompare' });
            });
          }
        } else if (result.reason === 'already_saved') {
          btn.classList.add('rl-compare-saved');
          btnText.textContent = '\u2713 Already Saved';
        } else if (result.reason === 'limit_reached') {
          btnText.textContent = 'Limit reached (10 max)';
          setTimeout(() => { btnText.textContent = 'Save to Compare'; }, 2000);
        }
      });
    }
  },

  // ── Private helpers ──────────────────────────────────────────────────────────
  _renderPhraseList(listId, items, emptyMsg) {
    const ul = sd(listId);
    if (!items || items.length === 0) {
      ul.innerHTML = `<li><span class="rl-empty-msg">${emptyMsg}</span></li>`;
      return;
    }
    ul.innerHTML = items.map(item =>
      `<li>
        <span class="rl-phrase-text">${esc(item.phrase || '')}</span>
        <span class="rl-phrase-count">${item.mentions || 0} mentions</span>
      </li>`
    ).join('');
  },

  _renderBuyList(listId, items, emptyMsg) {
    const ul = sd(listId);
    if (!items || items.length === 0) {
      ul.innerHTML = `<li class="rl-buy-empty">${emptyMsg}</li>`;
      return;
    }
    ul.innerHTML = items.map(t => `<li>${esc(String(t))}</li>`).join('');
  },

  _makeDraggable(host) {
    const header = sd('rl-header');
    if (!header) return;
    let dragging = false, startX, startY, startRight, startTop;

    header.addEventListener('mousedown', e => {
      if (e.button !== 0 || e.target.closest('#rl-close')) return;
      dragging = true;
      startX = e.clientX; startY = e.clientY;
      startRight = parseFloat(host.style.right) || 12;
      startTop   = parseFloat(host.style.top)   || 80;
      host.style.transition = 'none';
      e.preventDefault();
    });

    document.addEventListener('mousemove', e => {
      if (!dragging) return;
      host.style.right = `${Math.max(-260, startRight - (e.clientX - startX))}px`;
      host.style.top   = `${Math.max(0, Math.min(window.innerHeight - 80, startTop + (e.clientY - startY)))}px`;
    });

    document.addEventListener('mouseup', () => {
      if (!dragging) return;
      dragging = false;
      host.style.transition = 'right 0.4s cubic-bezier(0.16,1,0.3,1)';
    });
  },

  _makeResizable(host) {
    const handle = sd('rl-resize-handle');
    if (!handle) return;
    const MIN_W = 260, MIN_H = 280, MAX_W = 600, MAX_H = 800;
    let resizing = false, startX, startY, startW, startH;

    handle.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      resizing = true;
      startX = e.clientX; startY = e.clientY;
      startW = parseFloat(host.style.width)  || 320;
      startH = parseFloat(host.style.height) || 420;
      host.style.transition = 'none';
      e.preventDefault(); e.stopPropagation();
    });

    document.addEventListener('mousemove', e => {
      if (!resizing) return;
      host.style.width  = `${Math.max(MIN_W, Math.min(MAX_W, startW + (e.clientX - startX)))}px`;
      host.style.height = `${Math.max(MIN_H, Math.min(MAX_H, startH + (e.clientY - startY)))}px`;
    });

    document.addEventListener('mouseup', () => {
      if (!resizing) return;
      resizing = false;
      host.style.transition = 'right 0.4s cubic-bezier(0.16,1,0.3,1)';
    });
  }
};
