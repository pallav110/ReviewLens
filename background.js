// ReviewLens — background.js (Manifest V3 service worker)
// Handles Gemini API calls and page fetching. Runs in extension origin so CORS is not an issue.
// Now receives local analysis context to produce better-informed Gemini responses.

'use strict';

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_BASE  = 'https://generativelanguage.googleapis.com/v1beta/models';

// ── Message listener ──────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {

  if (message.action === 'analyzeWithGemini') {
    callGeminiAPI(message.reviews, message.starRating, message.totalRatings, message.starDist, message.localSignals)
      .then(data  => sendResponse({ success: true,  data }))
      .catch(err  => sendResponse({ success: false, error: err.message }));
    return true; // keep message channel open for async sendResponse
  }

  if (message.action === 'openCompare') {
    chrome.tabs.create({ url: chrome.runtime.getURL('compare.html') });
    return false;
  }

  if (message.action === 'fetchPage') {
    fetchPage(message.url)
      .then(html  => sendResponse({ success: true,  html }))
      .catch(err  => sendResponse({ success: false, error: err.message }));
    return true;
  }

});

// ── Gemini API call ───────────────────────────────────────────────────────────
async function callGeminiAPI(reviews, starRating, totalRatings, starDist, localSignals) {
  const stored = await chrome.storage.local.get('geminiKey');
  const key = stored.geminiKey;

  if (!key) throw new Error('NO_KEY');

  const prompt = buildPrompt(reviews, starRating, totalRatings, starDist, localSignals);
  const url = `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${key}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        response_mime_type: 'application/json',
        temperature: 0.3,
        max_output_tokens: 8920
      }
    })
  });

  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get('Retry-After')) || 60;
    throw new Error(`RATE_LIMIT:${retryAfter}`);
  }

  if (response.status === 400) {
    const body = await response.text().catch(() => '');
    if (body.includes('API_KEY_INVALID') || body.includes('API key not valid')) {
      throw new Error('INVALID_KEY');
    }
    throw new Error(`Gemini API error 400: ${body.slice(0, 200)}`);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Gemini API error ${response.status}: ${body.slice(0, 200)}`);
  }

  const result = await response.json();
  const text   = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from Gemini. Please try again.');

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (_) {
    // Strip markdown fences if model wraps in ```json ... ```
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      try { parsed = JSON.parse(match[1]); }
      catch (_e) { throw new Error('Gemini returned invalid JSON (even after stripping markdown fences).'); }
    } else {
      throw new Error('Gemini returned invalid JSON.');
    }
  }

  // Safety: ensure percentages sum to 100
  const pos = Math.round(parsed.positive_pct || 0);
  const neu = Math.round(parsed.neutral_pct  || 0);
  parsed.positive_pct = pos;
  parsed.neutral_pct  = neu;
  parsed.negative_pct = Math.max(0, 100 - pos - neu);

  // Clamp sentiment_stars to valid range
  if (parsed.sentiment_stars != null) {
    parsed.sentiment_stars = Math.max(1, Math.min(5, Math.round(parsed.sentiment_stars * 10) / 10));
  }

  // Clamp trust_score
  parsed.trust_score = Math.max(0, Math.min(100, Math.round(parsed.trust_score || 0)));

  return parsed;
}

// ── Prompt builder ────────────────────────────────────────────────────────────
function buildPrompt(reviews, starRating, totalRatings, starDist, localSignals) {
  const reviewBlock = reviews.map((r, i) =>
    `[${i + 1}] (${r.stars > 0 ? r.stars + '\u2605' : 'unrated'}) ${r.text.slice(0, 500)}`
  ).join('\n');

  const ratingLine = starRating
    ? `Official rating: ${starRating}\u2605 out of 5`
    : 'Official rating: unknown';
  const totalLine = totalRatings
    ? `Total ratings on Amazon: ${totalRatings}`
    : '';

  const distLine = starDist
    ? `Actual star distribution (ground truth from all ${totalRatings || '?'} ratings): ` +
      `5\u2605=${starDist['5'] || 0}%, 4\u2605=${starDist['4'] || 0}%, ` +
      `3\u2605=${starDist['3'] || 0}%, 2\u2605=${starDist['2'] || 0}%, 1\u2605=${starDist['1'] || 0}%`
    : '';

  // Include local analysis context so Gemini can provide better-informed qualitative analysis
  const localContext = localSignals
    ? `\nLOCAL ANALYSIS (already computed deterministically — use as context, not as override):
  Local trust score: ${localSignals.trustScore}/100
  Detected signals: ${localSignals.signals && localSignals.signals.length > 0 ? localSignals.signals.join('; ') : 'none'}
  Local text sentiment: ${localSignals.textSentiment || 'N/A'}\u2605
  Sentiment gap: ${localSignals.sentimentGap || 0}\u2605`
    : '';

  const distInstructions = starDist ? `
SAMPLING NOTE: The reviews below are stratified — roughly equal reviews scraped from each star level
(5\u2605 filter, 4\u2605 filter, 3\u2605 filter, 2\u2605 filter, 1\u2605 filter) for balanced qualitative coverage.
Do NOT treat sample proportions as the real sentiment split. Use these rules:

SENTIMENT PERCENTAGES (positive_pct / neutral_pct / negative_pct):
  Must reflect the ACTUAL star distribution above (ground truth from all ${totalRatings || '?'} ratings):
  positive_pct = 4\u2605 + 5\u2605 percentage (from distribution)
  neutral_pct  = 3\u2605 percentage (from distribution)
  negative_pct = 1\u2605 + 2\u2605 percentage (from distribution)

TEXT SENTIMENT (sentiment_stars):
  Assess purely from the LANGUAGE and TONE of the review text — ignore the star labels attached.
  A 5\u2605 review that says "okay, heats up, battery drains" should pull sentiment_stars DOWN.
  This captures what buyers actually experience vs. what they rate — the forensic gap.` : '';

  return `You are a consumer trust analyst. Analyze these Amazon product reviews and return a single JSON object.

${ratingLine}
${totalLine}
${distLine}
${localContext}
Sample size for qualitative analysis: ${reviews.length} reviews

Reviews:
${reviewBlock}

Return ONLY valid JSON (no markdown, no explanation) matching this exact schema:
{
  "trust_score": <integer 0-100, how trustworthy the review ecosystem appears>,
  "rating_verdict": <"accurate" | "inflated" | "deflated" | "suspicious" | "caution">,
  "sentiment_stars": <float 1.0-5.0, what the review TEXT language alone implies about quality>,
  "positive_pct": <integer 0-100>,
  "neutral_pct": <integer 0-100>,
  "negative_pct": <integer, MUST make total equal exactly 100>,
  "top_concerns": [{"phrase": "<short phrase>", "mentions": <integer>}],
  "top_praises":  [{"phrase": "<short phrase>", "mentions": <integer>}],
  "trust_flags":  ["<suspicious pattern observed>"],
  "good_for":     ["<buyer persona, 2-4 words>"],
  "avoid_if":     ["<buyer persona, 2-4 words>"],
  "confidence":   <"high" | "medium" | "low">,
  "summary":      "<1-2 sentence plain English verdict>"
}

Rules:
- positive_pct + neutral_pct + negative_pct MUST equal exactly 100
${distInstructions}
- sentiment_stars: read the LANGUAGE of every review (ignore star labels — sample is stratified). CRITICAL: weight each review EQUALLY regardless of length. Do NOT over-weight long emotional negative reviews vs short positive ones — length bias is the most common distortion in text sentiment. A terse "great phone!" is as valid a data point as a 500-word complaint. Output what the AVERAGE tone implies across all reviews.
- top_concerns: up to 5 real issues actually mentioned in the sampled reviews; empty [] if none
- top_praises:  up to 5 real positives actually mentioned; empty [] if none
- trust_flags:  flag only MANIPULATION signals — confirmed copy-paste/identical phrases across multiple reviews, >40% of 5\u2605 sample are generic with zero product detail, J-shaped distribution (4\u2605 < 20% of 5\u2605 percentage), review gating language ("contact us before leaving a review"); empty [] if none. IMPORTANT: do NOT flag product defects, delivery issues, customer service complaints, or marketplace assumptions — those belong in top_concerns.
- confidence: "high" only if >50 reviews analyzed and signals are clear and consistent; "medium" for 25-50 reviews; "low" for <25 reviews or conflicting signals
- good_for / avoid_if: up to 3 short buyer personas each
- trust_score: measures only REVIEW ECOSYSTEM AUTHENTICITY — not product quality, not marketplace reputation. Use these tiers:
  START at 75 (default trust baseline — most listings are not manipulated).
  CONFIRMED manipulation signals (clear evidence required):
    + confirmed identical/copy-paste review language: -20
    + confirmed review gating signal: -20
  AMBIGUOUS signals (apply only if clearly present; total deduction from this group CAPPED AT 20):
    + >40% of 5\u2605 sample is generic/contentless: -10
    + J-shaped distribution (4\u2605 < 20% of 5\u2605): -10
    + sentiment gap >1.5\u2605: -10
    + sentiment gap 1.0-1.5\u2605: -7
    + sentiment gap 0.5-1.0\u2605: -3
  The 20-point cap on ambiguous signals prevents over-penalizing listings that are merely imperfect, not manipulated.
  DO NOT deduct for: real product complaints, customer service failures, delivery issues, or any assumption about the marketplace platform. Authentic negative reviews RAISE confidence in the ecosystem.
  Final range: 75+ = trustworthy, 50-74 = moderate, 35-49 = caution, below 35 = low trust (reserve for confirmed manipulation).
- rating_verdict: "suspicious" if confirmed identical/copy-paste reviews OR review gating AND gap >0.5\u2605 (these are definitive manipulation signals); "inflated" if sentiment_stars < official by >0.5\u2605 OR confirmed J-curve (no copy-paste/gating); "deflated" if sentiment_stars > official by >0.5\u2605; "caution" if ambiguous signals only (J-curve, generic reviews) with gap 0.3-0.8\u2605; "accurate" if gap <0.3\u2605 and no confirmed trust_flags
- summary: 1-2 sentences. Clearly distinguish: (a) product quality concerns — "some buyers report X issues"; (b) seller/listing authenticity risk — "a minority report receiving incorrect units"; (c) review ecosystem signals — "review patterns suggest possible incentivization". Never conflate these. Use measured language. Do not make platform-level accusations.`;
}

// ── Page fetcher (for product-reviews pages) ──────────────────────────────────
async function fetchPage(url) {
  const response = await fetch(url, {
    headers: {
      'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}
