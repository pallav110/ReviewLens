# ReviewLens

**AI-powered Amazon review trust analyzer. See what star ratings hide.**

ReviewLens is a Chrome extension that acts as a forensic auditor for Amazon product listings. It goes beyond Amazon's own "Customers say" summary by detecting review manipulation signals, measuring the gap between what buyers *write* and what they *rate*, and producing an evidence-based Trust Score — not just a sentiment summary.

---

## What It Does

When you open any Amazon product page, ReviewLens:

1. Scrapes reviews using **stratified sampling** — one page from each star level (1★ through 5★) — so the text sample is balanced and unbiased
2. Scrapes Amazon's own **rating histogram** as ground truth for sentiment percentages
3. Sends both to **Gemini 2.5 Flash** with a forensic analysis prompt
4. Renders a dark sidebar with layered, internally consistent results

The key forensic signal: **the gap between what buyers write (Text Sentiment) and what they rate (Official Stars)**. A product where 5★ reviewers write "okay, heats up a lot" is suspicious in a way that the star average alone cannot reveal.

---

## Features

### Trust Score (0–100)
A single number that measures **review ecosystem authenticity**, not product quality.

- Starts at 75 (baseline — most listings are not manipulated)
- Deducts for **confirmed manipulation signals** (copy-paste reviews, review gating)
- Deducts for **ambiguous signals** (J-shaped distribution, generic 5★ reviews, sentiment gap) — capped at 20 points total to prevent over-penalisation

| Score | Label | Meaning |
|---|---|---|
| 75–100 | High Trust | Clean ecosystem, no manipulation signals |
| 50–74 | Moderate | Some imperfections, not manipulated |
| 35–49 | Caution | Suspicious patterns present |
| 0–34 | Low Trust | Reserved for confirmed manipulation |

### Rating Integrity Check
Compares the **official star average** vs **Text Sentiment** (what the review language implies, weighted equally per review regardless of length).

Verdict options:
- **Accurate** — text aligns with official rating (gap < 0.3★)
- **Inflated** — text implies lower quality than the rating (gap > 0.5★)
- **Deflated** — text implies higher quality than the rating
- **Suspicious** — confirmed manipulation signals + gap > 0.5★
- **Caution** — ambiguous signals with moderate gap

### Trust Signals
Lists only **manipulation signals** — not product complaints:
- Confirmed copy-paste / identical review language
- Review gating language ("contact us before leaving a review")
- J-shaped distribution (very high 5★ but unusually low 4★)
- Generic 5★ reviews with zero product detail

Product defects, heating issues, battery complaints — these are **authentic signals** and go into Recurring Concerns, not Trust Signals.

### Emotional Pulse
Sentiment breakdown (Positive / Neutral / Negative) derived from Amazon's star histogram — all ratings, not just the sample. Labelled clearly as "From star distribution — N total ratings."

### Recurring Concerns & Praises
Top 5 real issues and positives extracted from review text by Gemini, with mention counts from the stratified sample.

### Should You Buy?
Buyer personas for "Good for" and "Avoid if", generated from the review content.

### Inline Showcase Card
A compact summary card injected above Amazon's own review section — trust score, verdict badge, and a one-line summary. Clicking it opens the full sidebar.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Amazon Product Page                                      │
│                                                           │
│  content.js (Shadow DOM)                                  │
│  ├── scrapePageReviews()       ← current page reviews     │
│  ├── scrapeStarDistribution()  ← histogram (ground truth) │
│  ├── fetchMoreReviews()        ← 5 parallel fetches:      │
│  │     five_star / four_star / three_star /               │
│  │     two_star / one_star (stratified sample)            │
│  └── → background.js (service worker)                    │
│                                                           │
│  background.js                                            │
│  ├── buildPrompt()  ← forensic analysis prompt            │
│  ├── Gemini 2.5 Flash API call                            │
│  └── → parsed JSON with trust_score, sentiment_stars,    │
│         top_concerns, trust_flags, etc.                   │
│                                                           │
│  content.js ← render Shadow DOM sidebar                   │
└─────────────────────────────────────────────────────────┘
```

### Why Stratified Sampling?

Naively fetching "recent" reviews or the page-default reviews biases the text sample. Fetching the "critical" filter page makes ~50% of the sample 1–2★ reviews, causing text sentiment to read as 50% negative even when the actual distribution is 9% negative.

Fetching one page from each star level gives Gemini equal exposure to all buyer experiences. The text sentiment it computes is now a legitimate measure of tone. The gap between this and the official rating is the forensic signal.

### Why Two Separate Sentiment Metrics?

| Metric | Source | Purpose |
|---|---|---|
| Positive/Neutral/Negative % | Star histogram (all N ratings) | Ground truth sentiment distribution |
| Text Sentiment ★ | Gemini reading stratified review language | Forensic gap signal |

Comparing Amazon's own distribution to the official rating adds no intelligence — they're both derived from the same star clicks. The value comes from comparing **what buyers wrote** to **what they rated**.

---

## Installation

### Prerequisites
- Google Chrome (or any Chromium-based browser)
- A free Gemini API key from [aistudio.google.com](https://aistudio.google.com/app/apikey)

### Steps

1. **Clone or download this repository**
   ```bash
   git clone https://github.com/yourusername/reviewlens.git
   ```

2. **Open Chrome Extensions**
   - Navigate to `chrome://extensions/`
   - Enable **Developer mode** (top-right toggle)

3. **Load the extension**
   - Click **Load unpacked**
   - Select the `reviewlens/` folder

4. **Add your Gemini API key**
   - Click the ReviewLens icon in your Chrome toolbar
   - Paste your Gemini API key (starts with `AIza`)
   - Click **Save Key**

5. **Open any Amazon product page** and the sidebar will appear automatically.

---

## Usage

1. Navigate to any Amazon product page (URL contains `/dp/`)
2. The ReviewLens sidebar slides in from the right automatically
3. Analysis takes 5–15 seconds (fetching 5 review pages + Gemini call)
4. The sidebar is **draggable** (grab the header) and **resizable** (bottom-right corner)
5. Close with the ✕ button; reopen via the inline card above reviews or by refreshing

### Rate Limits

Gemini 2.5 Flash has a free tier with rate limits. If you hit a limit, ReviewLens shows a countdown and auto-retries — no manual refresh needed.

---

## Supported Regions

| Region | Domain |
|---|---|
| United States | amazon.com |
| India | amazon.in |
| United Kingdom | amazon.co.uk |
| Canada | amazon.ca |
| Australia | amazon.com.au |
| Germany | amazon.de |

---

## Design Decisions

### Trust Score measures ecosystem, not product
A product can have severe real problems (heating, poor battery) and still score 75+ if its review ecosystem is authentic. Authentic negative reviews *raise* confidence in the system — they prove the platform isn't suppressing complaints.

### Penalty cap on ambiguous signals
Without a cap, mild J-curve + mild generic reviews + mild sentiment gap stack into a falsely severe score. The 20-point cap on ambiguous signals ensures a score below 35 requires confirmed manipulation evidence, not just imperfection.

### Platform-agnostic
The system flags signals from the listing data only. It does not assume marketplace reputation, country-level fraud rates, or seller history.

### No local NLP
All qualitative analysis is delegated to Gemini 2.5 Flash. Earlier versions used local n-gram clustering, which produced low-quality phrases like "come true excellent performance." Gemini produces precise, human-readable outputs like "Battery drains fast" and "Received fake/wrong product."

---

## File Structure

```
reviewlens/
├── manifest.json        Chrome Extension Manifest V3
├── background.js        Service worker — Gemini API calls, page fetching
├── content.js           Content script — Shadow DOM sidebar, scraping, rendering
├── popup.html           Toolbar popup — API key management UI
├── popup.js             Popup logic — key validation, storage, status display
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## Privacy

- Your Gemini API key is stored locally using `chrome.storage.local` — never transmitted anywhere except to Google's Gemini API
- Review text is sent to the Gemini API for analysis. No data is stored or logged by this extension
- No user tracking, no analytics, no external servers

---

## Contributing

Pull requests welcome. Key areas for improvement:

- **More Amazon regions** — add additional domains to `manifest.json` host_permissions and content script matches
- **Trust score calibration** — run on diverse product categories and compare scores; adjust penalty weights in `buildPrompt()` in `background.js`
- **Distribution pattern analysis** — more sophisticated J-curve detection beyond the 4★/5★ ratio threshold
- **Temporal signals** — detecting sudden review spikes (would require scraping review dates)

---

## Acknowledgements

- Powered by [Google Gemini 2.5 Flash](https://deepmind.google/technologies/gemini/flash/)
- Built with Chrome Extension Manifest V3 (Shadow DOM, service workers)
- UI design inspired by Dark Reader and AdBlock Plus
