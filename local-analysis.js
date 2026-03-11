// ReviewLens — local-analysis.js
// Deterministic local trust scoring — no LLM, no API calls, fully reproducible.
// Provides statistical trust signals from review data and star distributions.

'use strict';

window.RL = window.RL || {};

window.RL.LocalAnalysis = {

  // ── Main entry point ─────────────────────────────────────────────────────────
  analyze(reviews, starDist, officialRating, totalRatings) {
    const signals = [];
    let confirmedPenalty = 0;
    let ambiguousPenalty = 0;
    const AMBIGUOUS_CAP = 20;

    // 1. J-curve detection (from star distribution)
    if (starDist) {
      const jcurve = this._detectJCurve(starDist);
      if (jcurve) {
        signals.push(jcurve);
        ambiguousPenalty += jcurve.penalty;
      }
    }

    // 2. Near-duplicate review detection (trigram Jaccard similarity)
    const dupes = this._detectDuplicates(reviews);
    if (dupes) {
      signals.push(dupes);
      confirmedPenalty += dupes.penalty;
    }

    // 3. Generic 5-star review detection (short, contentless)
    const generic = this._detectGenericReviews(reviews);
    if (generic) {
      signals.push(generic);
      ambiguousPenalty += generic.penalty;
    }

    // 4. Distribution entropy anomaly (concentration in one bucket)
    if (starDist) {
      const entropy = this._detectEntropyAnomaly(starDist);
      if (entropy) {
        signals.push(entropy);
        ambiguousPenalty += entropy.penalty;
      }
    }

    // 5. Review gating / incentivized language (keyword patterns)
    const gating = this._detectReviewGating(reviews);
    if (gating) {
      signals.push(gating);
      confirmedPenalty += gating.penalty;
    }

    // 6. Text-rating sentiment mismatch (keyword-based, no LLM)
    const mismatch = this._computeSentimentMismatch(reviews, officialRating);

    // 7. Sentiment gap penalty (ambiguous signal)
    if (mismatch.gap > 1.5) {
      ambiguousPenalty += 10;
      signals.push({
        type: 'sentiment-gap', severity: 'medium', penalty: 10,
        detail: `Large gap between text sentiment (${mismatch.textSentiment.toFixed(1)}\u2605) and official rating (${officialRating}\u2605)`
      });
    } else if (mismatch.gap > 1.0) {
      ambiguousPenalty += 7;
      signals.push({
        type: 'sentiment-gap', severity: 'low', penalty: 7,
        detail: `Moderate gap between text sentiment (${mismatch.textSentiment.toFixed(1)}\u2605) and official rating (${officialRating}\u2605)`
      });
    } else if (mismatch.gap > 0.5) {
      ambiguousPenalty += 3;
      signals.push({
        type: 'sentiment-gap', severity: 'low', penalty: 3,
        detail: `Mild gap between text sentiment (${mismatch.textSentiment.toFixed(1)}\u2605) and official rating (${officialRating}\u2605)`
      });
    }

    // Apply penalties: confirmed = uncapped, ambiguous = capped at 20
    const effectiveAmbiguous = Math.min(ambiguousPenalty, AMBIGUOUS_CAP);
    const trustScore = Math.max(0, Math.min(100, 75 - confirmedPenalty - effectiveAmbiguous));

    // Compute emotional pulse from star distribution (ground truth)
    const emotionalPulse = this._computeEmotionalPulse(starDist);

    // Determine rating verdict locally
    const ratingVerdict = this._computeRatingVerdict(signals, mismatch);

    return {
      trustScore,
      signals,
      confirmedPenalty,
      ambiguousPenalty: effectiveAmbiguous,
      textSentiment: mismatch.textSentiment,
      sentimentGap: mismatch.gap,
      duplicateCount: dupes ? dupes.count : 0,
      genericRatio: generic ? generic.ratio : 0,
      emotionalPulse,
      ratingVerdict,
    };
  },

  // ── J-curve: 4-star is suspiciously low relative to 5-star ───────────────────
  _detectJCurve(starDist) {
    const five = starDist['5'] || 0;
    const four = starDist['4'] || 0;
    if (five >= 50 && four < five * 0.2) {
      return {
        type: 'j-curve', severity: 'medium', penalty: 10,
        detail: `J-shaped distribution: ${five}% five-star vs ${four}% four-star \u2014 organic products typically have more 4\u2605 reviews`
      };
    }
    if (five >= 40 && four < five * 0.25) {
      return {
        type: 'j-curve', severity: 'low', penalty: 5,
        detail: `Mild J-curve: ${five}% five-star vs ${four}% four-star`
      };
    }
    return null;
  },

  // ── Near-duplicate detection via trigram Jaccard similarity ───────────────────
  _detectDuplicates(reviews) {
    if (reviews.length < 4) return null;

    const normalize = text =>
      text.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();

    const trigrams = text => {
      const words = text.split(' ');
      const grams = new Set();
      for (let i = 0; i <= words.length - 3; i++) {
        grams.add(words.slice(i, i + 3).join(' '));
      }
      return grams;
    };

    const jaccard = (a, b) => {
      if (a.size === 0 && b.size === 0) return 0;
      let intersection = 0;
      for (const g of a) { if (b.has(g)) intersection++; }
      return intersection / (a.size + b.size - intersection);
    };

    const processed = reviews.map(r => {
      const norm = normalize(r.text);
      return { norm, grams: trigrams(norm), wordCount: norm.split(' ').length };
    });

    let dupeCount = 0;
    const dupePairs = [];

    for (let i = 0; i < processed.length; i++) {
      if (processed[i].wordCount < 5) continue; // skip very short — too little signal
      for (let j = i + 1; j < processed.length; j++) {
        if (processed[j].wordCount < 5) continue;
        const sim = jaccard(processed[i].grams, processed[j].grams);
        if (sim > 0.6) {
          dupeCount++;
          if (dupePairs.length < 3) {
            dupePairs.push({
              similarity: Math.round(sim * 100),
              a: processed[i].norm.slice(0, 60),
              b: processed[j].norm.slice(0, 60)
            });
          }
        }
      }
    }

    if (dupeCount >= 3) {
      return {
        type: 'duplicates', severity: 'high', penalty: 20, count: dupeCount,
        detail: `${dupeCount} near-duplicate review pairs detected \u2014 possible copy-paste manipulation`,
        examples: dupePairs
      };
    }
    if (dupeCount >= 1) {
      return {
        type: 'duplicates', severity: 'medium', penalty: 10, count: dupeCount,
        detail: `${dupeCount} near-duplicate review pair${dupeCount > 1 ? 's' : ''} detected`,
        examples: dupePairs
      };
    }
    return null;
  },

  // ── Generic 5-star reviews: short, no product detail ─────────────────────────
  _detectGenericReviews(reviews) {
    const highRated = reviews.filter(r => r.stars >= 4.5);
    if (highRated.length < 3) return null;

    const genericPattern =
      /^(great|good|excellent|amazing|awesome|love it|nice|perfect|best|wonderful|fantastic|highly recommend|very good|works great|works well|love this|satisfied|happy|5 stars?|good product|nice product|worth it)[\s.!]*$/i;

    let genericCount = 0;
    highRated.forEach(r => {
      const words = r.text.split(/\s+/).filter(Boolean);
      if (words.length <= 8 || genericPattern.test(r.text.trim())) {
        genericCount++;
      }
    });

    const ratio = genericCount / highRated.length;
    if (ratio > 0.4) {
      return {
        type: 'generic-reviews', severity: 'medium', penalty: 10,
        ratio: Math.round(ratio * 100),
        detail: `${Math.round(ratio * 100)}% of high-rated reviews are generic with no product detail`
      };
    }
    return null;
  },

  // ── Distribution entropy — low entropy = suspicious concentration ─────────────
  _detectEntropyAnomaly(starDist) {
    const values = [1, 2, 3, 4, 5].map(s => (starDist[String(s)] || 0) / 100);
    const total = values.reduce((a, b) => a + b, 0);
    if (total === 0) return null;

    // Normalize so they sum to 1 (in case percentages don't sum exactly to 100)
    const normed = values.map(v => v / total);

    // Shannon entropy — max for 5 categories = log2(5) ~ 2.32
    let entropy = 0;
    normed.forEach(p => {
      if (p > 0) entropy -= p * Math.log2(p);
    });

    if (entropy < 0.8) {
      return {
        type: 'low-entropy', severity: 'medium', penalty: 7,
        detail: `Rating distribution is extremely concentrated (entropy: ${entropy.toFixed(2)}) \u2014 may indicate artificial inflation`
      };
    }
    return null;
  },

  // ── Review gating / incentivized language ────────────────────────────────────
  _detectReviewGating(reviews) {
    const gatingPatterns = [
      /contact\s+(us|seller|support)\s+(before|instead of)\s+(leaving|posting|writing)/i,
      /reach\s+out\s+to\s+us\s+(before|instead)/i,
      /email\s+us\s+(before|first|instead)/i,
      /(don'?t|do\s*not)\s+leave\s+a?\s*(negative|bad|low)\s+review/i,
      /we('ll|\s+will)\s+(replace|refund|send).{0,30}(before|instead).{0,20}(review|rating)/i,
      /free\s+(product|item|replacement)\s+(for|in\s+exchange\s+for)\s+(a\s+)?(review|rating|feedback)/i,
      /gift\s+card.{0,30}(review|rating|feedback)/i,
      /(received|got)\s+(this|the|a)\s+(product|item)\s+(for\s+free|at\s+a\s+discount|in\s+exchange)/i,
      /honest\s+review\s+in\s+exchange/i,
      /free\s+sample/i,
    ];

    let gatingCount = 0;
    const examples = [];
    reviews.forEach(r => {
      for (const pattern of gatingPatterns) {
        if (pattern.test(r.text)) {
          gatingCount++;
          if (examples.length < 2) examples.push(r.text.slice(0, 80));
          break;
        }
      }
    });

    if (gatingCount >= 2) {
      return {
        type: 'review-gating', severity: 'high', penalty: 20, count: gatingCount,
        detail: `${gatingCount} reviews contain review gating or incentivized language`,
        examples
      };
    }
    if (gatingCount === 1) {
      return {
        type: 'review-gating', severity: 'medium', penalty: 10, count: 1,
        detail: '1 review contains possible review gating or incentivized language',
        examples
      };
    }
    return null;
  },

  // ── Keyword-based text sentiment vs star mismatch ────────────────────────────
  _computeSentimentMismatch(reviews, officialRating) {
    if (reviews.length === 0) return { textSentiment: 3.0, gap: 0 };

    const positiveWords = new Set([
      'great', 'excellent', 'amazing', 'love', 'perfect', 'wonderful', 'fantastic',
      'best', 'awesome', 'outstanding', 'superb', 'brilliant', 'pleased', 'happy',
      'satisfied', 'recommend', 'impressive', 'solid', 'reliable', 'quality',
      'sturdy', 'durable', 'smooth', 'fast', 'comfortable', 'beautiful', 'elegant'
    ]);
    const negativeWords = new Set([
      'terrible', 'awful', 'horrible', 'worst', 'broken', 'defective', 'waste',
      'garbage', 'trash', 'scam', 'fake', 'cheap', 'flimsy', 'disappointment',
      'disappointed', 'useless', 'returned', 'refund', 'regret', 'avoid',
      'poor', 'bad', 'fail', 'failed', 'malfunction', 'overheating', 'stopped',
      'junk', 'rubbish', 'crap', 'fragile', 'unreliable', 'misleading', 'slow'
    ]);

    let totalSentiment = 0;
    let counted = 0;

    reviews.forEach(r => {
      const words = r.text.toLowerCase().split(/\s+/);
      let pos = 0, neg = 0;
      words.forEach(w => {
        const clean = w.replace(/[^a-z]/g, '');
        if (positiveWords.has(clean)) pos++;
        if (negativeWords.has(clean)) neg++;
      });

      const total = pos + neg;
      if (total === 0) return; // no signal from this review

      // Map to 1-5 scale: 100% positive = 5.0, 100% negative = 1.0
      const sentiment = 1 + 4 * (pos / total);
      totalSentiment += sentiment;
      counted++;
    });

    const textSentiment = counted > 0
      ? Math.round(totalSentiment / counted * 10) / 10
      : 3.0;

    const gap = officialRating
      ? Math.round(Math.abs(officialRating - textSentiment) * 10) / 10
      : 0;

    return { textSentiment, gap };
  },

  // ── Emotional pulse from star distribution (ground truth) ────────────────────
  _computeEmotionalPulse(starDist) {
    if (!starDist) return null;
    const pos = (starDist['5'] || 0) + (starDist['4'] || 0);
    const neu = starDist['3'] || 0;
    const neg = (starDist['2'] || 0) + (starDist['1'] || 0);
    // Normalize to exactly 100
    const total = pos + neu + neg;
    if (total === 0) return null;
    const posNorm = Math.round(pos / total * 100);
    const neuNorm = Math.round(neu / total * 100);
    const negNorm = Math.max(0, 100 - posNorm - neuNorm);
    return { positive: posNorm, neutral: neuNorm, negative: negNorm };
  },

  // ── Rating verdict from local signals ────────────────────────────────────────
  _computeRatingVerdict(signals, mismatch) {
    const hasGating = signals.some(s => s.type === 'review-gating' && s.severity === 'high');
    const hasDupes = signals.some(s => s.type === 'duplicates' && s.severity === 'high');
    const hasJCurve = signals.some(s => s.type === 'j-curve');

    if ((hasDupes || hasGating) && mismatch.gap > 0.5) return 'suspicious';
    if (mismatch.gap > 0.5 || hasJCurve) return 'inflated';
    if (mismatch.gap > 0.3 && signals.length > 0) return 'caution';
    if (mismatch.gap <= 0.3 && signals.filter(s => s.severity !== 'low').length === 0) return 'accurate';
    return 'caution';
  }
};
