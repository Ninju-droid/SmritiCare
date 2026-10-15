/** Moves a skill 30% toward performance and keeps the score between 1 and 10. */
export function updateSkill(old: number, performance: number): number {
  if (!Number.isFinite(old) || !Number.isFinite(performance)) {
    throw new RangeError("Skill and performance values must be finite.");
  }

  const updatedSkill = 0.7 * old + 0.3 * performance;
  return Math.min(10, Math.max(1, updatedSkill));
}
