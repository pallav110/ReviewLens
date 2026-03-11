// ReviewLens — content.js (Orchestrator)
// Slim coordinator that ties together: Cache, LocalAnalysis, Scraper, and UI.
// Local analysis runs FIRST (instant, deterministic), Gemini enhances if available.

'use strict';

(function () {
  const { Cache, LocalAnalysis, Scraper, UI } = window.RL;

  // ── Entry point ──────────────────────────────────────────────────────────────
  function init() {
    if (!window.location.pathname.includes('/dp/')) return;
    if (document.getElementById('reviewlens-host')) return;
    UI.injectSidebar();
    waitForReviews();
  }

  // ── Wait for Amazon to render review elements ────────────────────────────────
  function waitForReviews(attempt) {
    attempt = attempt || 0;
    const found = document.querySelectorAll('[data-hook="review"], span[data-hook="review-body"]');
    if (found.length > 0) {
      runAnalysis();
    } else if (attempt < 12) {
      setTimeout(function () { waitForReviews(attempt + 1); }, 1200);
    } else {
      UI.showError('No reviews found on this page. Scroll to the reviews section and refresh.');
    }
  }

  // ── Main analysis orchestrator ───────────────────────────────────────────────
  async function runAnalysis() {
    const asin = Scraper.extractASIN();

    // 1. Check cache first
    const cached = await Cache.get(asin);
    if (cached) {
      UI.showResults(cached.data, cached.reviewCount, cached.localSignals, Scraper);
      UI.injectInlineShowcase(cached.data, cached.localSignals);
      // Still need metadata for the UI even from cache
      Scraper.scrapePageReviews(); // populates starRating/totalRatings/starDist
      return;
    }

    // 2. Scrape reviews
    UI.showLoading('Collecting reviews...');
    var pageReviews = Scraper.scrapePageReviews();

    UI.showLoading('Fetching stratified review sample...');
    var extra = [];
    try { extra = await Scraper.fetchMoreReviews(asin); } catch (_) {}

    var allReviews = Scraper.mergeReviews(pageReviews, extra, 80);
    if (allReviews.length === 0) {
      UI.showError('No review text found. Scroll to the reviews section and try again.');
      return;
    }

    // 3. Local analysis (instant, deterministic, always runs)
    UI.showLoading('Running local trust analysis...');
    var localSignals = LocalAnalysis.analyze(
      allReviews, Scraper.starDist, Scraper.starRating, Scraper.totalRatings
    );

    // 4. Try Gemini enhancement
    UI.showLoading('Analyzing ' + allReviews.length + ' reviews with Gemini AI...');

    chrome.runtime.sendMessage({
      action: 'analyzeWithGemini',
      reviews: allReviews,
      starRating: Scraper.starRating,
      totalRatings: Scraper.totalRatings,
      starDist: Scraper.starDist,
      localSignals: {
        trustScore: localSignals.trustScore,
        signals: localSignals.signals.map(function (s) { return s.detail; }),
        textSentiment: localSignals.textSentiment,
        sentimentGap: localSignals.sentimentGap
      }
    }, function (response) {
      if (chrome.runtime.lastError || !response) {
        // Gemini unavailable — show local-only results
        showAndCacheLocal(asin, localSignals, allReviews.length);
        return;
      }

      if (!response.success) {
        return handleGeminiError(response, asin, localSignals, allReviews);
      }

      // Merge local + Gemini and display
      var mergedData = mergeResults(response.data, localSignals);
      Cache.set(asin, { data: mergedData, reviewCount: allReviews.length, localSignals: localSignals });
      UI.showResults(mergedData, allReviews.length, localSignals, Scraper);
      UI.injectInlineShowcase(mergedData, localSignals);
    });
  }

  // ── Handle Gemini errors — fall back to local when possible ──────────────────
  function handleGeminiError(response, asin, localSignals, allReviews) {
    if (response.error === 'NO_KEY') {
      // No API key — show local results with AI enhancement CTA
      showAndCacheLocal(asin, localSignals, allReviews.length);
      return;
    }

    if (response.error === 'INVALID_KEY') {
      // Show local results but also warn about the key
      showAndCacheLocal(asin, localSignals, allReviews.length);
      return;
    }

    if (response.error && response.error.indexOf('RATE_LIMIT:') === 0) {
      var wait = parseInt(response.error.split(':')[1]) || 60;
      UI.showRateLimit(wait, function () {
        retryGemini(asin, localSignals, allReviews);
      });
      return;
    }

    // Unknown error — fall back to local
    showAndCacheLocal(asin, localSignals, allReviews.length);
  }

  // ── Retry Gemini after rate limit ────────────────────────────────────────────
  function retryGemini(asin, localSignals, allReviews) {
    UI.showLoading('Retrying analysis of ' + allReviews.length + ' reviews...');
    chrome.runtime.sendMessage({
      action: 'analyzeWithGemini',
      reviews: allReviews,
      starRating: Scraper.starRating,
      totalRatings: Scraper.totalRatings,
      starDist: Scraper.starDist,
      localSignals: {
        trustScore: localSignals.trustScore,
        signals: localSignals.signals.map(function (s) { return s.detail; }),
        textSentiment: localSignals.textSentiment,
        sentimentGap: localSignals.sentimentGap
      }
    }, function (retry) {
      if (!retry || !retry.success) {
        showAndCacheLocal(asin, localSignals, allReviews.length);
        return;
      }
      var mergedData = mergeResults(retry.data, localSignals);
      Cache.set(asin, { data: mergedData, reviewCount: allReviews.length, localSignals: localSignals });
      UI.showResults(mergedData, allReviews.length, localSignals, Scraper);
      UI.injectInlineShowcase(mergedData, localSignals);
    });
  }

  // ── Show local-only results and cache them ───────────────────────────────────
  function showAndCacheLocal(asin, localSignals, reviewCount) {
    var localData = { trust_score: localSignals.trustScore, trust_flags: localSignals.signals.map(function (s) { return s.detail; }) };
    Cache.set(asin, { data: localData, reviewCount: reviewCount, localSignals: localSignals });
    UI.showLocalOnlyResults(localSignals, reviewCount, Scraper);
    UI.injectInlineShowcase(localData, localSignals);
  }

  // ── Merge local + Gemini: local trust score weighted 70%, Gemini 30% ─────────
  function mergeResults(geminiData, localSignals) {
    var localScore  = localSignals.trustScore;
    var geminiScore = geminiData.trust_score || 75;
    var finalScore  = Math.round(localScore * 0.7 + geminiScore * 0.3);

    // Merge trust flags — deduplicate
    var localFlags  = localSignals.signals.map(function (s) { return s.detail; });
    var geminiFlags = Array.isArray(geminiData.trust_flags) ? geminiData.trust_flags : [];
    var seen = new Set(localFlags);
    var allFlags = localFlags.slice();
    geminiFlags.forEach(function (f) { if (!seen.has(f)) allFlags.push(f); });

    return {
      trust_score: Math.max(0, Math.min(100, finalScore)),
      rating_verdict: geminiData.rating_verdict || localSignals.ratingVerdict,
      sentiment_stars: geminiData.sentiment_stars || localSignals.textSentiment,
      positive_pct: geminiData.positive_pct,
      neutral_pct: geminiData.neutral_pct,
      negative_pct: geminiData.negative_pct,
      top_concerns: geminiData.top_concerns,
      top_praises: geminiData.top_praises,
      trust_flags: allFlags,
      good_for: geminiData.good_for,
      avoid_if: geminiData.avoid_if,
      confidence: geminiData.confidence,
      summary: geminiData.summary,
      _local: localSignals,
      _gemini_score: geminiScore
    };
  }

  // ── Boot ─────────────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Clean up namespace from page scope (closures retain references)
  delete window.RL;
})();
