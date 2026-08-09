"use strict";

(function () {
  /** @param {Array} legalMoves - each: { token, targetSteps, capturesTokens, exitsBase, reachesHome, isSafe } */
  function chooseAIMove(legalMoves) {
    if (legalMoves.length === 1) return legalMoves[0];
    const byPriority = [...legalMoves].sort((a, b) => score(b) - score(a));
    return byPriority[0];
  }

  function score(move) {
    let s = 0;
    if (move.capturesTokens.length > 0) s += 100 * move.capturesTokens.length; // 1. captures
    if (move.reachesHome) s += 90; // 2. reaching home
    if (move.exitsBase) s += 40; // 3. exiting base
    s += move.isSafe ? 20 : -10; // 4. safe movement
    s += move.targetSteps * 0.2; // 5. prefer furthest-along token
    s += Math.random() * 5; // 6. avoid fully deterministic play
    return s;
  }

  window.Ludo.AI = { chooseAIMove };
})();
