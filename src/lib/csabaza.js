export function generatePin() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function calcScore(isCorrect, timerSeconds, elapsedMs, basePoints = 100) {
  if (!isCorrect) return 0;
  const remaining = Math.max(0, timerSeconds - elapsedMs / 1000);
  const speedBonus = Math.round(remaining * 5);
  return basePoints + speedBonus;
}

export const QUESTION_COLORS = ["game-a", "game-b", "game-c", "game-d"];
