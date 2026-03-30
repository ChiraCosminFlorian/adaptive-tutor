/**
 * Bayesian Knowledge Tracing (BKT) Engine
 *
 * Pure functions implementing the standard BKT update formulas.
 * No database calls — these operate solely on the four BKT parameters.
 */

/**
 * Update the P(Learned) probability after observing a student response.
 *
 * BKT update rules:
 *   If correct:
 *     P(L|correct) = P(L) * (1 - P(S))  /  [ P(L) * (1 - P(S)) + (1 - P(L)) * P(G) ]
 *   If incorrect:
 *     P(L|incorrect) = P(L) * P(S)  /  [ P(L) * P(S) + (1 - P(L)) * (1 - P(G)) ]
 *
 *   Then apply the transition (learning) probability:
 *     P(L') = P(L|obs) + (1 - P(L|obs)) * P(T)
 *
 * @param {number} pL - Current P(Learned), range [0, 1]
 * @param {number} pT - P(Transit), probability the student learns on this step
 * @param {number} pS - P(Slip), probability of a wrong answer despite knowing
 * @param {number} pG - P(Guess), probability of a correct answer despite not knowing
 * @param {boolean} isCorrect - Whether the student answered correctly
 * @returns {number} Updated P(Learned) after incorporating the observation
 */
function updateBKT(pL, pT, pS, pG, isCorrect) {
  let pLGivenObs;

  if (isCorrect) {
    const numerator = pL * (1 - pS);
    const denominator = pL * (1 - pS) + (1 - pL) * pG;
    pLGivenObs = numerator / denominator;
  } else {
    const numerator = pL * pS;
    const denominator = pL * pS + (1 - pL) * (1 - pG);
    pLGivenObs = numerator / denominator;
  }

  // Apply transition: account for the possibility of learning on this step
  const pLNew = pLGivenObs + (1 - pLGivenObs) * pT;

  return pLNew;
}

/**
 * Check whether a concept is considered mastered.
 *
 * @param {number} pL - Current P(Learned)
 * @returns {boolean} True if P(Learned) exceeds the mastery threshold (0.95)
 */
function isMastered(pL) {
  return pL > 0.95;
}

/**
 * Map P(Learned) to a human-readable knowledge level label.
 *
 * | P(L) Range | Label        |
 * |------------|--------------|
 * | < 0.3      | beginner     |
 * | 0.3 – 0.6  | learning     |
 * | 0.6 – 0.95 | proficient   |
 * | > 0.95     | mastered     |
 *
 * @param {number} pL - Current P(Learned)
 * @returns {"beginner" | "learning" | "proficient" | "mastered"} Knowledge level
 */
function getKnowledgeLevel(pL) {
  if (pL > 0.95) return 'mastered';
  if (pL >= 0.6) return 'proficient';
  if (pL >= 0.3) return 'learning';
  return 'beginner';
}

/**
 * Suggest a question difficulty (1–5) based on the student's current P(Learned).
 *
 * The mapping scales difficulty linearly with knowledge:
 *   P(L) < 0.2  → 1 (easiest)
 *   0.2 ≤ P(L) < 0.4 → 2
 *   0.4 ≤ P(L) < 0.6 → 3
 *   0.6 ≤ P(L) < 0.8 → 4
 *   P(L) ≥ 0.8 → 5 (hardest)
 *
 * @param {number} pL - Current P(Learned)
 * @returns {number} Suggested difficulty level (1–5)
 */
function suggestDifficulty(pL) {
  if (pL >= 0.8) return 5;
  if (pL >= 0.6) return 4;
  if (pL >= 0.4) return 3;
  if (pL >= 0.2) return 2;
  return 1;
}

module.exports = {
  updateBKT,
  isMastered,
  getKnowledgeLevel,
  suggestDifficulty,
};
