// ReviewLens — content.js (Gemini Edition)
// Dark glass sidebar + inline showcase card above Amazon's review section.

'use strict';

// ── Sidebar CSS ───────────────────────────────────────────────────────────────
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
    color: #f0f0f4;
  }

  /* The wrapper div injected by JS must fill the host so height:100% resolves correctly */
  :host > div { height: 100%; overflow: hidden; }

  #rl-panel {
    width: 100%; height: 100%;
    background: #0c0e14;
    border-radius: 14px;
    border: 1px solid rgba(255, 107, 53, 0.25);
    box-shadow: 0 20px 60px rgba(0,0,0,0.7), 0 0 0 0.5px rgba(255,255,255,0.04) inset;
    display: flex; flex-direction: column;
    overflow: hidden;
    position: relative;
  }

  /* ── Header ── */
  #rl-header {
    display: flex; justify-content: space-between; align-items: center;
    padding: 11px 14px;
    background: linear-gradient(135deg, #FF6B35 0%, #e8521e 100%);
    border-radius: 13px 13px 0 0; flex-shrink: 0;
    cursor: grab; user-select: none;
    border-bottom: 1px solid rgba(0,0,0,0.2);
  }
  #rl-header:active { cursor: grabbing; }
  #rl-logo { font-weight: 800; font-size: 13px; letter-spacing: 0.2px; color: #fff; }
  #rl-logo span {
    display: block; font-weight: 400; font-size: 9.5px;
    opacity: 0.8; letter-spacing: 0.5px; text-transform: uppercase; margin-top: 1px;
  }
  #rl-close {
    background: rgba(0,0,0,0.2); border: none; color: rgba(255,255,255,0.9);
    width: 22px; height: 22px; border-radius: 50%; cursor: pointer;
    font-size: 11px; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.15s; flex-shrink: 0;
  }
  #rl-close:hover { background: rgba(0,0,0,0.35); }

  /* ── Scrollable content ── */
  #rl-content { flex: 1; min-height: 0; overflow-y: auto; scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.1) transparent; }
  #rl-content::-webkit-scrollbar { width: 4px; }
  #rl-content::-webkit-scrollbar-track { background: transparent; }
  #rl-content::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }

  /* ── Loading ── */
  #rl-loading {
    display: flex; flex-direction: column; align-items: center;
    padding: 40px 20px 30px; text-align: center;
  }
  .rl-spinner {
    width: 30px; height: 30px;
    border: 2.5px solid rgba(255,255,255,0.08);
    border-top-color: #FF6B35;
    border-radius: 50%; animation: rl-spin 0.75s linear infinite; margin-bottom: 14px;
  }
  @keyframes rl-spin { to { transform: rotate(360deg); } }
  #rl-loading-text { font-weight: 600; font-size: 13px; color: rgba(255,255,255,0.7); margin-bottom: 5px; }
  #rl-countdown    { font-size: 11px; color: rgba(255,255,255,0.35); }

  /* ── Error ── */
  #rl-error { padding: 24px 18px; text-align: center; }
  #rl-error-icon { font-size: 28px; margin-bottom: 10px; }
  #rl-error-msg  { font-size: 12px; color: rgba(255,255,255,0.5); line-height: 1.6; }
  #rl-error-action {
    display: inline-block; margin-top: 14px;
    padding: 7px 16px; border-radius: 8px;
    background: #FF6B35; color: #fff;
    font-size: 12px; font-weight: 700; cursor: pointer;
    border: none; text-decoration: none;
  }
  #rl-error-action:hover { background: #e8521e; }

  /* ── No-key state ── */
  #rl-nokey { padding: 24px 18px; text-align: center; }
  .rl-nokey-icon { font-size: 30px; margin-bottom: 12px; }
  .rl-nokey-title { font-size: 14px; font-weight: 700; color: #f0f0f4; margin-bottom: 8px; }
  .rl-nokey-text  { font-size: 12px; color: rgba(255,255,255,0.45); line-height: 1.6; margin-bottom: 16px; }
  .rl-nokey-steps { text-align: left; margin: 0 0 16px; padding: 0 0 0 18px; }
  .rl-nokey-steps li { font-size: 11.5px; color: rgba(255,255,255,0.5); line-height: 1.7; }
  .rl-nokey-steps a { color: #FF6B35; text-decoration: none; }

  /* ── Glass card (base for all sections) ── */
  .rl-card {
    margin: 10px 10px 0;
    padding: 12px 13px;
    background: rgba(255,255,255,0.035);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 10px;
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

  .rl-card-title {
    font-size: 9.5px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.9px;
    color: rgba(255,255,255,0.3); margin-bottom: 10px;
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
  #rl-trust-sublabel { font-size: 10px; color: rgba(255,255,255,0.35); margin-top: 2px; }
  .rl-trust-bar-track {
    background: rgba(255,255,255,0.07);
    border-radius: 3px; height: 3px; overflow: hidden; margin-bottom: 6px;
  }
  #rl-trust-bar-fill {
    height: 100%; border-radius: 3px; width: 0%;
    background: #4ade80;
    transition: width 1s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.5s;
    box-shadow: 0 0 8px currentColor;
  }
  .rl-trust-meta { display: flex; justify-content: space-between; font-size: 9.5px; color: rgba(255,255,255,0.3); }
  #rl-confidence-badge {
    font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
    padding: 1px 6px; border-radius: 10px;
    background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.5);
  }
  #rl-summary-text {
    font-size: 11.5px; color: rgba(255,255,255,0.5); line-height: 1.55;
    margin-top: 8px; padding-top: 8px;
    border-top: 1px solid rgba(255,255,255,0.05);
    font-style: italic;
  }

  /* ── Rating Integrity ── */
  .rl-rating-row { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
  .rl-star-box { flex: 1; text-align: center; }
  .rl-star-value { font-size: 26px; font-weight: 800; color: #f0f0f4; }
  .rl-star-icon  { color: #fbbf24; font-size: 18px; }
  .rl-star-lbl   { font-size: 9px; color: rgba(255,255,255,0.35); text-transform: uppercase; letter-spacing: 0.4px; margin-top: 2px; }
  .rl-rating-vs  { font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.2); }
  #rl-rating-verdict-row { display: flex; align-items: center; gap: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.06); }
  #rl-verdict-badge {
    padding: 3px 10px; border-radius: 20px;
    font-weight: 700; font-size: 11px; flex-shrink: 0;
  }
  .rl-verdict-accurate   { background: rgba(74,222,128,0.15);  color: #4ade80; border: 1px solid rgba(74,222,128,0.3); }
  .rl-verdict-inflated   { background: rgba(248,113,113,0.15); color: #f87171; border: 1px solid rgba(248,113,113,0.3); }
  .rl-verdict-deflated   { background: rgba(96,165,250,0.15);  color: #60a5fa; border: 1px solid rgba(96,165,250,0.3); }
  .rl-verdict-suspicious { background: rgba(167,139,250,0.15); color: #a78bfa; border: 1px solid rgba(167,139,250,0.3); }
  .rl-verdict-caution    { background: rgba(251,191,36,0.15);  color: #fbbf24; border: 1px solid rgba(251,191,36,0.3); }
  .rl-verdict-unknown    { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.4); }
  #rl-verdict-explanation { font-size: 11px; color: rgba(255,255,255,0.45); line-height: 1.5; }

  /* ── Emotional Pulse (sentiment bars) ── */
  .rl-bar-row   { margin-bottom: 7px; }
  .rl-bar-label { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px; color: rgba(255,255,255,0.55); }
  .rl-bar-pct   { font-weight: 700; color: #f0f0f4; }
  .rl-bar-track { background: rgba(255,255,255,0.07); border-radius: 3px; height: 6px; overflow: hidden; }
  .rl-bar       { height: 100%; border-radius: 3px; width: 0%; transition: width 0.9s cubic-bezier(0.34,1.56,0.64,1); }
  .rl-bar-positive { background: linear-gradient(90deg, #34A853, #4ade80); }
  .rl-bar-neutral  { background: linear-gradient(90deg, #b45309, #fbbf24); }
  .rl-bar-negative { background: linear-gradient(90deg, #b91c1c, #f87171); }
  #rl-review-count { font-size: 10px; color: rgba(255,255,255,0.3); margin-bottom: 10px; }

  /* ── Phrase lists (Concerns + Praises) ── */
  .rl-phrase-list { list-style: none; padding: 0; }
  .rl-phrase-list li {
    display: flex; justify-content: space-between; align-items: center;
    padding: 5px 0; border-bottom: 1px solid rgba(255,255,255,0.04);
    font-size: 12px; line-height: 1.4;
  }
  .rl-phrase-list li:last-child { border-bottom: none; }
  .rl-phrase-text  { flex: 1; color: rgba(255,255,255,0.75); }
  .rl-phrase-count {
    font-size: 10px; color: rgba(255,255,255,0.3); margin-left: 8px;
    white-space: nowrap; font-variant-numeric: tabular-nums;
  }
  .rl-complaints li::before { content: "–"; color: #f87171; font-weight: 700; margin-right: 8px; flex-shrink: 0; }
  .rl-praises    li::before { content: "+"; color: #4ade80; font-weight: 700; margin-right: 8px; flex-shrink: 0; }
  .rl-empty-msg  { font-size: 11px; color: rgba(255,255,255,0.25); font-style: italic; }

  /* ── Trust Signals ── */
  #rl-trust-list { list-style: none; padding: 0; }
  .rl-trust-flag {
    display: flex; align-items: flex-start; gap: 7px;
    padding: 5px 0; border-bottom: 1px solid rgba(255,255,255,0.04);
    font-size: 11px; color: #fca5a5; line-height: 1.5;
  }
  .rl-trust-flag:last-child { border-bottom: none; }
  .rl-trust-icon { flex-shrink: 0; font-size: 11px; }
  .rl-trust-clean { font-size: 11px; color: #86efac; padding: 2px 0; }

  /* ── Should You Buy ── */
  .rl-buy-row { display: flex; gap: 8px; }
  .rl-buy-col { flex: 1; }
  .rl-buy-head { font-size: 10px; font-weight: 700; margin-bottom: 7px; display: flex; align-items: center; gap: 4px; }
  .rl-buy-head-yes { color: #4ade80; }
  .rl-buy-head-no  { color: #f87171; }
  .rl-buy-list { list-style: none; padding: 0; }
  .rl-buy-list li {
    font-size: 11px; color: rgba(255,255,255,0.55); line-height: 1.4;
    padding: 2px 0; border-bottom: 1px solid rgba(255,255,255,0.03);
  }
  .rl-buy-list li:last-child { border-bottom: none; }
  .rl-buy-empty { font-size: 11px; color: rgba(255,255,255,0.2); font-style: italic; }

  /* ── Footer ── */
  #rl-footer {
    padding: 7px 14px; text-align: center;
    font-size: 9.5px; color: rgba(255,255,255,0.18);
    border-top: 1px solid rgba(255,255,255,0.05); flex-shrink: 0;
    letter-spacing: 0.3px;
  }

  /* ── Resize handle ── */
  #rl-resize-handle {
    position: absolute; bottom: 0; right: 0;
    width: 18px; height: 18px;
    cursor: se-resize;
    border-radius: 0 0 13px 0;
    background:
      linear-gradient(135deg,
        transparent 30%, rgba(255,107,53,0.5) 30%, rgba(255,107,53,0.5) 36%, transparent 36%,
        transparent 50%, rgba(255,107,53,0.5) 50%, rgba(255,107,53,0.5) 56%, transparent 56%,
        transparent 70%, rgba(255,107,53,0.5) 70%, rgba(255,107,53,0.5) 76%, transparent 76%
      );
    z-index: 10;
  }
  #rl-resize-handle:hover { background:
    linear-gradient(135deg,
      transparent 30%, rgba(255,107,53,0.9) 30%, rgba(255,107,53,0.9) 36%, transparent 36%,
      transparent 50%, rgba(255,107,53,0.9) 50%, rgba(255,107,53,0.9) 56%, transparent 56%,
      transparent 70%, rgba(255,107,53,0.9) 70%, rgba(255,107,53,0.9) 76%, transparent 76%
    );
  }

  .hidden { display: none !important; }
`;

// ── Sidebar HTML ──────────────────────────────────────────────────────────────
const SIDEBAR_HTML = `
  <div id="rl-panel">

    <div id="rl-header">
      <div id="rl-logo">ReviewLens <span>Product Truth Panel</span></div>
      <button id="rl-close" title="Close">&#x2715;</button>
    </div>

    <div id="rl-content">

      <!-- Loading -->
      <div id="rl-loading">
        <div class="rl-spinner"></div>
        <p id="rl-loading-text">Collecting reviews...</p>
        <p id="rl-countdown"></p>
      </div>

      <!-- No API key -->
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
        <div id="rl-summary-text"></div>
      </div>

      <!-- Results cards -->
      <div id="rl-results" class="hidden" style="padding-bottom:10px">

        <!-- Rating Integrity -->
        <div class="rl-card">
          <div class="rl-card-title">Rating Integrity Check</div>
          <div class="rl-rating-row">
            <div class="rl-star-box">
              <div class="rl-star-value"><span id="rl-official-stars">&mdash;</span><span class="rl-star-icon">&#9733;</span></div>
              <div class="rl-star-lbl">Official</div>
            </div>
            <div class="rl-rating-vs">vs</div>
            <div class="rl-star-box">
              <div class="rl-star-value"><span id="rl-sentiment-stars">&mdash;</span><span class="rl-star-icon">&#9733;</span></div>
              <div class="rl-star-lbl">Text Sentiment</div>
            </div>
          </div>
          <div id="rl-rating-verdict-row">
            <div id="rl-verdict-badge">&mdash;</div>
            <p id="rl-verdict-explanation"></p>
          </div>
        </div>

        <!-- Trust Signals — moved up so forensic value is front and centre -->
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
        <div class="rl-card">
          <div class="rl-card-title">Recurring Concerns</div>
          <ul id="rl-complaints-list" class="rl-phrase-list rl-complaints"></ul>
        </div>

        <!-- What People Love -->
        <div class="rl-card">
          <div class="rl-card-title">What People Love</div>
          <ul id="rl-praises-list" class="rl-phrase-list rl-praises"></ul>
        </div>

        <!-- Should You Buy? -->
        <div class="rl-card">
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

      </div><!-- /#rl-results -->

    </div><!-- /#rl-content -->

    <div id="rl-footer">ReviewLens &bull; Gemini AI &bull; Drag header &bull; Resize corner</div>

    <!-- Resize grip -->
    <div id="rl-resize-handle" title="Drag to resize"></div>

  </div>
`;

// ── Inline showcase CSS (injected into Amazon's page head) ────────────────────
const SHOWCASE_CSS = `
  #rl-showcase {
    margin: 0 0 20px 0;
    padding: 18px 20px;
    background: #0c0e14;
    border-radius: 12px;
    border: 1px solid rgba(255,107,53,0.3);
    box-shadow: 0 4px 24px rgba(0,0,0,0.3);
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    display: flex; align-items: center; gap: 16px;
    position: relative; overflow: hidden;
  }
  #rl-showcase::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 2px;
    background: linear-gradient(90deg, #FF6B35, #e8521e);
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
    text-transform: uppercase; color: #FF6B35;
  }
  .rl-sc-verdict {
    padding: 2px 9px; border-radius: 20px;
    font-size: 10px; font-weight: 700; text-transform: capitalize;
  }
  .rl-sc-verdict-accurate   { background: rgba(74,222,128,0.15);  color: #4ade80; border: 1px solid rgba(74,222,128,0.3); }
  .rl-sc-verdict-inflated   { background: rgba(248,113,113,0.15); color: #f87171; border: 1px solid rgba(248,113,113,0.3); }
  .rl-sc-verdict-deflated   { background: rgba(96,165,250,0.15);  color: #60a5fa; border: 1px solid rgba(96,165,250,0.3); }
  .rl-sc-verdict-suspicious { background: rgba(167,139,250,0.15); color: #a78bfa; border: 1px solid rgba(167,139,250,0.3); }
  .rl-sc-verdict-caution    { background: rgba(251,191,36,0.15);  color: #fbbf24; border: 1px solid rgba(251,191,36,0.3); }
  .rl-sc-summary {
    font-size: 12px; color: rgba(255,255,255,0.55); line-height: 1.5;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  #rl-sc-btn {
    flex-shrink: 0;
    padding: 8px 14px;
    background: #FF6B35; color: #fff;
    border: none; border-radius: 8px;
    font-size: 12px; font-weight: 700;
    cursor: pointer; transition: background 0.2s; white-space: nowrap;
  }
  #rl-sc-btn:hover { background: #e8521e; }
`;

// ── Shadow DOM reference ──────────────────────────────────────────────────────
let _shadow = null;
let _host   = null;
const sd = id => _shadow && _shadow.getElementById(id);

// ── Entry point ───────────────────────────────────────────────────────────────
function init() {
  if (!window.location.pathname.includes('/dp/')) return;
  if (document.getElementById('reviewlens-host')) return;
  injectSidebar();
  waitForReviews();
}

// ── Sidebar injection ─────────────────────────────────────────────────────────
function injectSidebar() {
  _host = document.createElement('div');
  _host.id = 'reviewlens-host';
  document.body.appendChild(_host);
  _shadow = _host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = SIDEBAR_CSS;
  _shadow.appendChild(style);

  const container = document.createElement('div');
  container.innerHTML = SIDEBAR_HTML;
  // CRITICAL: container must have fixed height so #rl-panel { height:100% } resolves
  // to the host element height (not content height), allowing #rl-content to scroll.
  container.style.cssText = 'height: 100%; overflow: hidden;';
  _shadow.appendChild(container);

  Object.assign(_host.style, {
    position: 'fixed', right: '-340px', top: '80px',
    width: '320px', height: '420px',
    zIndex: '2147483647', transition: 'right 0.4s cubic-bezier(0.16,1,0.3,1)'
  });

  setTimeout(() => { _host.style.right = '12px'; }, 500);
  sd('rl-close').addEventListener('click', () => {
    // Use actual current width so the panel fully clears the screen even after resizing
    const w = parseFloat(_host.style.width) || 320;
    _host.style.right = `${-(w + 40)}px`;
  });
  makeDraggable(_host);
  makeResizable(_host);
}

// ── Drag to move ──────────────────────────────────────────────────────────────
function makeDraggable(host) {
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
}

// ── Resize from bottom-right corner ──────────────────────────────────────────
function makeResizable(host) {
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

// ── ASIN extraction ───────────────────────────────────────────────────────────
function extractASIN() {
  const m = window.location.pathname.match(/\/dp\/([A-Z0-9]{10})/);
  return m ? m[1] : null;
}

// ── Review scraping ───────────────────────────────────────────────────────────
function scrapePageReviews() {
  const reviews = [];

  document.querySelectorAll('[data-hook="review"]').forEach(node => {
    const bodyEl = node.querySelector('[data-hook="review-body"] span:not(.cr-original-review-content)');
    if (!bodyEl) return;
    const text = bodyEl.innerText.trim().replace(/\n+/g, ' ');
    if (text.length < 15) return;
    const starEl = node.querySelector(
      '[data-hook="review-star-rating"] .a-icon-alt, [data-hook="review-star-rating-container"] .a-icon-alt'
    );
    const stars = starEl ? parseFloat(starEl.innerText) || 0 : 0;
    reviews.push({ text, stars, wordCount: text.split(/\s+/).filter(Boolean).length });
  });

  if (reviews.length === 0) {
    document.querySelectorAll('span[data-hook="review-body"]').forEach(node => {
      const text = node.innerText.trim().replace(/\n+/g, ' ');
      if (text.length < 15) return;
      reviews.push({ text, stars: 0, wordCount: text.split(/\s+/).filter(Boolean).length });
    });
  }

  // Capture official star rating
  const ratingEl = document.querySelector(
    'span[data-hook="rating-out-of-five"] .a-icon-alt, #acrPopover .a-icon-alt'
  );
  window._RL_starRating = ratingEl ? parseFloat(ratingEl.innerText) : null;

  // Capture total ratings count
  const totalEl = document.querySelector(
    '#acrCustomerReviewText, [data-hook="total-review-count"]'
  );
  if (totalEl) {
    const m = totalEl.innerText.replace(/,/g, '').match(/(\d+)/);
    window._RL_totalRatings = m ? parseInt(m[1]) : null;
  }

  // Capture star distribution histogram (e.g. {5:66, 4:19, 3:6, 2:2, 1:7})
  // This is ground truth — far more accurate than estimating from a biased review sample.
  window._RL_starDist = scrapeStarDistribution();

  return reviews;
}

// ── Scrape the star-rating histogram from the product page ────────────────────
function scrapeStarDistribution() {
  const dist = {};

  // Amazon renders the histogram as table rows; try several known selectors
  const rows = document.querySelectorAll(
    '#histogramTable tr, ' +
    '.a-histogram-table tr, ' +
    '[data-hook="rating-histogram"] tr, ' +
    '#cm_cr_dp_d_rating_histogram tr'
  );

  rows.forEach(row => {
    const cells = row.querySelectorAll('td, th');
    if (cells.length < 2) return;
    // First cell typically contains "5 star" / "4 star" etc.
    const starMatch = cells[0].textContent.trim().match(/(\d)\s*star/i);
    // Last cell (or second) contains the percentage
    const pctText   = cells[cells.length - 1].textContent.trim().replace(/[^0-9]/g, '');
    if (starMatch && pctText) {
      const star = starMatch[1];
      const pct  = parseInt(pctText);
      if (!isNaN(pct)) dist[star] = pct;
    }
  });

  // Fallback: scan aria-label text like "66 percent of reviews have 5 stars"
  if (Object.keys(dist).length < 3) {
    document.querySelectorAll('[aria-label*="percent"], [aria-label*="star"]').forEach(el => {
      const txt = el.getAttribute('aria-label') || '';
      const m = txt.match(/(\d+)\s*percent.*?(\d)\s*star/i)
             || txt.match(/(\d)\s*star.*?(\d+)\s*percent/i);
      if (m) dist[m[2] || m[1]] = parseInt(m[1] || m[2]);
    });
  }

  return Object.keys(dist).length >= 3 ? dist : null;
}

// ── Parse reviews out of a fetched HTML string ────────────────────────────────
function parseReviewsFromHTML(html) {
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
}

// ── Fetch a single product-reviews URL via the background service worker ──────
function fetchReviewPage(url) {
  return new Promise(resolve => {
    chrome.runtime.sendMessage({ action: 'fetchPage', url }, resp => {
      if (chrome.runtime.lastError || !resp || !resp.success) { resolve([]); return; }
      resolve(parseReviewsFromHTML(resp.html));
    });
  });
}

// ── Stratified multi-star scrape ──────────────────────────────────────────────
// Fetch 1 page from each star level filter in parallel.
// Equal representation across all star levels makes Gemini's text-sentiment estimate
// legitimate — the gap between what buyers write and what they rate becomes a real
// forensic signal, not an artifact of a biased (critical-heavy) sample.
async function fetchMoreReviews(asin) {
  if (!asin) return [];
  const domain = window.location.hostname;

  // All 5 star-level filters fetched simultaneously (5 parallel requests)
  const starFilters = ['five_star', 'four_star', 'three_star', 'two_star', 'one_star'];
  const pages = await Promise.all(
    starFilters.map(filter =>
      fetchReviewPage(`https://${domain}/product-reviews/${asin}/?filterByStar=${filter}&pageNumber=1`)
    )
  );

  const all = [];
  pages.forEach(page => all.push(...page));
  return all;
}

// ── Wait for page reviews ─────────────────────────────────────────────────────
function waitForReviews(attempt = 0) {
  const found = document.querySelectorAll('[data-hook="review"], span[data-hook="review-body"]');
  if (found.length > 0) {
    runAnalysis();
  } else if (attempt < 12) {
    setTimeout(() => waitForReviews(attempt + 1), 1200);
  } else {
    showError('No reviews found on this page. Scroll to the reviews section and refresh.');
  }
}

// ── Main analysis orchestrator ────────────────────────────────────────────────
async function runAnalysis() {
  showLoading('Collecting reviews...');

  const pageReviews = scrapePageReviews();
  const asin = extractASIN();

  showLoading('Fetching recent & critical reviews...');
  let extra = [];
  try { extra = await fetchMoreReviews(asin); } catch (_) {}

  const seen = new Set(pageReviews.map(r => r.text.slice(0, 80)));
  const allReviews = [...pageReviews, ...extra.filter(r => !seen.has(r.text.slice(0, 80)))].slice(0, 40);
  
  if (allReviews.length === 0) {
    showError('No review text found. Scroll to the reviews section and try again.');
    return;
  }

  showLoading(`Analyzing ${allReviews.length} reviews with Gemini AI...`);

  chrome.runtime.sendMessage({
    action:       'analyzeWithGemini',
    reviews:      allReviews,
    starRating:   window._RL_starRating   || null,
    totalRatings: window._RL_totalRatings || null,
    starDist:     window._RL_starDist     || null
  }, response => {
    if (chrome.runtime.lastError) {
      showError('Extension error. Try refreshing the page.');
      return;
    }

    if (!response.success) {
      if (response.error === 'NO_KEY')      { showNoKey(); return; }
      if (response.error === 'INVALID_KEY') {
        showError('Your Gemini API key is invalid. Click the ReviewLens toolbar icon and re-enter your key.');
        return;
      }
      if (response.error?.startsWith('RATE_LIMIT:')) {
        const wait = parseInt(response.error.split(':')[1]) || 60;
        showRateLimit(wait, () => {
          // Auto-retry once countdown finishes
          showLoading(`Retrying analysis of ${allReviews.length} reviews...`);
          chrome.runtime.sendMessage({
            action:       'analyzeWithGemini',
            reviews:      allReviews,
            starRating:   window._RL_starRating   || null,
            totalRatings: window._RL_totalRatings || null,
            starDist:     window._RL_starDist     || null
          }, retry => {
            if (!retry?.success) { showError(retry?.error || 'Still rate limited. Please wait a minute and refresh.'); return; }
            showResults(retry.data, allReviews.length);
            injectInlineShowcase(retry.data);
          });
        });
        return;
      }
      showError(response.error || 'Unknown API error. Please try again.');
      return;
    }

    showResults(response.data, allReviews.length);
    injectInlineShowcase(response.data);
  });
}

// ── Loading / error states ────────────────────────────────────────────────────
function showLoading(text) {
  sd('rl-loading').classList.remove('hidden');
  sd('rl-trust-hero').classList.add('hidden');
  sd('rl-results').classList.add('hidden');
  sd('rl-error').classList.add('hidden');
  sd('rl-nokey').classList.add('hidden');
  sd('rl-loading-text').textContent = text || 'Analyzing...';
  sd('rl-countdown').textContent = '';
}

function showNoKey() {
  sd('rl-loading').classList.add('hidden');
  sd('rl-trust-hero').classList.add('hidden');
  sd('rl-results').classList.add('hidden');
  sd('rl-error').classList.add('hidden');
  sd('rl-nokey').classList.remove('hidden');
}

function showError(message) {
  sd('rl-loading').classList.add('hidden');
  sd('rl-trust-hero').classList.add('hidden');
  sd('rl-results').classList.add('hidden');
  sd('rl-nokey').classList.add('hidden');
  sd('rl-error').classList.remove('hidden');
  sd('rl-error-msg').textContent = message;
}

// Countdown display + auto-retry when Gemini 429 rate limit is hit
function showRateLimit(seconds, onDone) {
  sd('rl-error').classList.add('hidden');
  sd('rl-trust-hero').classList.add('hidden');
  sd('rl-results').classList.add('hidden');
  sd('rl-nokey').classList.add('hidden');
  sd('rl-loading').classList.remove('hidden');
  sd('rl-loading-text').textContent = 'Rate limit hit — auto-retrying...';

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
}

// ── Render results from Gemini JSON ──────────────────────────────────────────
function showResults(data, reviewCount) {
  sd('rl-loading').classList.add('hidden');
  sd('rl-error').classList.add('hidden');
  sd('rl-nokey').classList.add('hidden');

  const trustScore = data.trust_score || 0;
  const pos = data.positive_pct || 0;
  const neu = data.neutral_pct  || 0;
  const neg = Math.max(0, 100 - pos - neu); // guarantees sum = 100

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
  sd('rl-sample-note').textContent      = `${reviewCount} review${reviewCount !== 1 ? 's' : ''} analyzed`;
  sd('rl-confidence-badge').textContent = `${confidence.charAt(0).toUpperCase() + confidence.slice(1)} confidence`;

  if (data.summary) {
    sd('rl-summary-text').textContent = data.summary;
    sd('rl-summary-text').classList.remove('hidden');
  }

  // ── Results cards ──
  sd('rl-results').classList.remove('hidden');

  // Rating Integrity
  sd('rl-official-stars').textContent  = window._RL_starRating ? window._RL_starRating.toFixed(1) : '—';
  sd('rl-sentiment-stars').textContent = data.sentiment_stars ? parseFloat(data.sentiment_stars).toFixed(1) : '—';

  const verdict = (data.rating_verdict || 'unknown').toLowerCase();
  const verdictLabel = verdict.charAt(0).toUpperCase() + verdict.slice(1);
  const badge = sd('rl-verdict-badge');
  badge.textContent = verdictLabel;
  badge.className   = `rl-verdict-${verdict}`;

  // Build verdict explanation referencing the text-vs-official gap where applicable
  const official = window._RL_starRating ? window._RL_starRating.toFixed(1) : '?';
  const textStar = data.sentiment_stars ? parseFloat(data.sentiment_stars).toFixed(1) : null;
  const gapNote  = textStar ? ` (text: ${textStar}★ vs official: ${official}★)` : '';

  const explanations = {
    accurate:   `Review language aligns with the ${official}★ official rating${gapNote}.`,
    inflated:   `Review text implies lower quality than the ${official}★ rating suggests${gapNote}.`,
    deflated:   `Review text implies higher quality than the ${official}★ rating reflects${gapNote}.`,
    suspicious: `Significant gap between what buyers write and what they rate${gapNote} — see Trust Signals.`,
    caution:    `Rating may be OK but text-quality gap and review patterns warrant caution${gapNote}.`,
    unknown:    'Could not determine rating accuracy.'
  };
  sd('rl-verdict-explanation').textContent = explanations[verdict] || '';

  // Emotional Pulse — from distribution when available (ground truth for percentages)
  sd('rl-review-count').textContent = window._RL_starDist
    ? `From star distribution — ${window._RL_totalRatings ? window._RL_totalRatings.toLocaleString() + ' total ratings' : 'all ratings'}`
    : `Estimated from ${reviewCount} sampled reviews`;
  sd('rl-pos-pct').textContent = `${pos}%`;
  sd('rl-neu-pct').textContent = `${neu}%`;
  sd('rl-neg-pct').textContent = `${neg}%`;
  requestAnimationFrame(() => {
    sd('rl-pos-bar').style.width = `${pos}%`;
    sd('rl-neu-bar').style.width = `${neu}%`;
    sd('rl-neg-bar').style.width = `${neg}%`;
  });

  // Phrase lists — Gemini returns [{phrase, mentions}]
  renderPhraseList('rl-complaints-list', data.top_concerns, 'No recurring concerns found.');
  renderPhraseList('rl-praises-list',    data.top_praises,  'No recurring praises found.');

  // Trust signals — Gemini returns array of strings
  const flags = Array.isArray(data.trust_flags) ? data.trust_flags : [];
  const tl = sd('rl-trust-list');
  tl.innerHTML = flags.length === 0
    ? `<li class="rl-trust-clean">&#x2713; No suspicious patterns detected</li>`
    : flags.map(f => `<li class="rl-trust-flag"><span class="rl-trust-icon">&#x26A0;</span><span>${esc(f)}</span></li>`).join('');

  // Should You Buy? — Gemini returns arrays of strings
  renderBuyList('rl-buy-yes', data.good_for,  'Not enough data');
  renderBuyList('rl-buy-no',  data.avoid_if,  'No concerns found');
}

// ── Inline showcase card (above Amazon reviews section) ───────────────────────
function injectInlineShowcase(data) {
  if (document.getElementById('rl-showcase')) return;

  const anchor = document.querySelector(
    '#reviewsMedley, #customer-reviews, [data-hook="reviews:medley"], #reviews-medley'
  );
  if (!anchor) return;

  // Inject scoped styles once
  if (!document.getElementById('rl-sc-style')) {
    const style = document.createElement('style');
    style.id = 'rl-sc-style';
    style.textContent = SHOWCASE_CSS;
    document.head.appendChild(style);
  }

  const trustScore = data.trust_score || 0;
  const verdict    = (data.rating_verdict || 'unknown').toLowerCase();
  const { color }  = trustScoreStyle(trustScore);

  const card = document.createElement('div');
  card.id = 'rl-showcase';
  card.innerHTML = `
    <div class="rl-sc-score-wrap">
      <div class="rl-sc-score-num" style="color:${color}">${trustScore}</div>
      <div class="rl-sc-score-label" style="color:${color}">Trust Score</div>
    </div>
    <div class="rl-sc-divider"></div>
    <div class="rl-sc-body">
      <div class="rl-sc-header">
        <span class="rl-sc-brand">ReviewLens</span>
        <span class="rl-sc-verdict rl-sc-verdict-${verdict}">${verdict}</span>
      </div>
      <div class="rl-sc-summary">${esc(data.summary || 'Analysis complete. See full panel for details.')}</div>
    </div>
    <button id="rl-sc-btn">Full Analysis &rarr;</button>
  `;

  anchor.parentNode.insertBefore(card, anchor);

  card.querySelector('#rl-sc-btn').addEventListener('click', () => {
    if (_host) _host.style.right = '12px';
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function trustScoreStyle(score) {
  if (score >= 75) return { color: '#4ade80', glow: 'rgba(74,222,128,0.35)',   label: 'High Trust' };
  if (score >= 55) return { color: '#fbbf24', glow: 'rgba(251,191,36,0.35)',   label: 'Moderate' };
  if (score >= 35) return { color: '#fb923c', glow: 'rgba(251,146,60,0.35)',   label: 'Caution' };
  return                  { color: '#f87171', glow: 'rgba(248,113,113,0.35)',  label: 'Low Trust' };
}

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

function renderPhraseList(listId, items, emptyMsg) {
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
}

function renderBuyList(listId, items, emptyMsg) {
  const ul = sd(listId);
  if (!items || items.length === 0) {
    ul.innerHTML = `<li class="rl-buy-empty">${emptyMsg}</li>`;
    return;
  }
  ul.innerHTML = items.map(t => `<li>${esc(String(t))}</li>`).join('');
}

function esc(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Boot ──────────────────────────────────────────────────────────────────────
init();
