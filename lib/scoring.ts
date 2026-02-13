export type ScoreDimensions = {
  digitalMaturity: number;
  dataIntensity: number;
  competitivePressure: number;
  coopLikelihood: number;
};

export function clampScore(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function calculatePriorityScore(input: ScoreDimensions): number {
  return (
    clampScore(input.digitalMaturity, 0, 3) +
    clampScore(input.dataIntensity, 0, 3) +
    clampScore(input.competitivePressure, 0, 2) +
    clampScore(input.coopLikelihood, 0, 2)
  );
}

export function calculatePriorityLabel(score: number): 1 | 2 | 3 | 4 | 5 {
  if (score <= 2) return 1;
  if (score <= 4) return 2;
  if (score <= 6) return 3;
  if (score <= 8) return 4;
  return 5;
}

export function priorityTone(priority: number): "low" | "medium" | "high" {
  if (priority <= 2) return "low";
  if (priority === 3) return "medium";
  return "high";
}
