// Pure helpers safe for client + server use.

export function generatePin(): string {
  // 6-digit numeric PIN
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function calcScore(isCorrect: boolean, timerSeconds: number, elapsedMs: number, basePoints = 100): number {
  if (!isCorrect) return 0;
  const remaining = Math.max(0, timerSeconds - elapsedMs / 1000);
  const speedBonus = Math.round(remaining * 5);
  return basePoints + speedBonus;
}

export const QUESTION_COLORS = ["game-a", "game-b", "game-c", "game-d"] as const;

export type AIQuestion = {
  question_text: string;
  type: "multiple_choice" | "true_false";
  options: string[];
  correct_answer: string;
  explanation?: string;
  difficulty?: "easy" | "medium" | "hard";
};
