/**
 * Levenshtein distance and Normalized Similarity (0 - 100%)
 */

export function levenshteinDistance(a: string, b: string): number {
  if (!a || !b) return (a || '').length + (b || '').length;

  const s1 = a.toLowerCase().trim();
  const s2 = b.toLowerCase().trim();

  if (s1 === s2) return 0;
  if (s1.length === 0) return s2.length;
  if (s2.length === 0) return s1.length;

  const v0 = new Int32Array(s2.length + 1);
  const v1 = new Int32Array(s2.length + 1);

  for (let i = 0; i <= s2.length; i++) {
    v0[i] = i;
  }

  for (let i = 0; i < s1.length; i++) {
    v1[0] = i + 1;
    for (let j = 0; j < s2.length; j++) {
      const cost = s1[i] === s2[j] ? 0 : 1;
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
    }
    for (let j = 0; j <= s2.length; j++) {
      v0[j] = v1[j];
    }
  }

  return v1[s2.length];
}

export function calculateSimilarityScore(source: string, target: string): number {
  if (!source || !target) return 0;
  const s1 = source.toLowerCase().trim();
  const s2 = target.toLowerCase().trim();
  
  if (s1 === s2) return 100;

  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 100;

  const distance = levenshteinDistance(s1, s2);
  const score = Math.round(((maxLen - distance) / maxLen) * 100);
  return Math.max(0, score);
}

/**
 * Token-based matching score for full names with swapped first/last names
 */
export function calculateFullNameMatchScore(queryName: string, recordName: string): number {
  const qTokens = queryName.toLowerCase().split(/\s+/).filter(Boolean);
  const rTokens = recordName.toLowerCase().split(/\s+/).filter(Boolean);

  if (qTokens.length === 0 || rTokens.length === 0) return 0;

  // Direct string comparison
  const directScore = calculateSimilarityScore(queryName, recordName);

  // Token permutation match
  let tokenMatchSum = 0;
  for (const q of qTokens) {
    let bestTokenScore = 0;
    for (const r of rTokens) {
      const sim = calculateSimilarityScore(q, r);
      if (sim > bestTokenScore) bestTokenScore = sim;
    }
    tokenMatchSum += bestTokenScore;
  }

  const tokenAvg = Math.round(tokenMatchSum / qTokens.length);
  return Math.max(directScore, tokenAvg);
}
