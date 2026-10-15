import type { Game, Skills } from "../data/types";

export type RoundResult = {
  correct: boolean;
  responseMs: number;
};

export type DifficultyResult = {
  level: number;
  fatigue: boolean;
};

const MIN_LEVEL = 1;
const MAX_LEVEL = 10;

function getMedian(numbers: number[]): number {
  const sorted = [...numbers].sort((first, second) => first - second);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}

function hasFatigue(history: RoundResult[]): boolean {
  if (history.length < 6) {
    return false;
  }

  const responseTimes = history.map((round) => round.responseMs);
  const median = getMedian(responseTimes);
  const recentCount = Math.ceil(history.length / 3);
  const recentRounds = history.slice(-recentCount);
  const recentAverage =
    recentRounds.reduce((total, round) => total + round.responseMs, 0) /
    recentRounds.length;

  return recentAverage > median * 1.4;
}

/** Adjusts one level after three recent correct rounds or two recent wrong rounds. */
export function nextLevel(
  history: RoundResult[],
  currentLevel: number,
): DifficultyResult {
  if (!Number.isFinite(currentLevel)) {
    throw new RangeError("The current level must be a finite number.");
  }

  const lastThree = history.slice(-3);
  const lastTwo = history.slice(-2);
  let level = Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, currentLevel));

  if (lastThree.length === 3 && lastThree.every((round) => round.correct)) {
    level = Math.min(MAX_LEVEL, level + 1);
  } else if (
    lastTwo.length === 2 &&
    lastTwo.every((round) => !round.correct)
  ) {
    level = Math.max(MIN_LEVEL, level - 1);
  }

  return { level, fatigue: hasFatigue(history) };
}

export type ActivityChoice = {
  game: Game;
  domain: "memory" | "attention" | "routine";
  level: number;
};

const GAME_FOR_DOMAIN: Record<ActivityChoice["domain"], Game> = {
  memory: "memory",
  attention: "disappear",
  routine: "routine",
};

/** Picks the weakest domain not played in the two most recent games. */
export function pickNextActivity(
  skills: Pick<Skills, ActivityChoice["domain"]>,
  recentGames: Game[],
): ActivityChoice {
  const domains: ActivityChoice["domain"][] = [
    "memory",
    "attention",
    "routine",
  ];
  const recentDomains = recentGames
    .slice(0, 2)
    .map((game) => (game === "disappear" ? "attention" : game));
  const availableDomains = domains.filter(
    (domain) => !recentDomains.includes(domain),
  );
  const candidates = availableDomains.length > 0 ? availableDomains : domains;
  const domain = candidates.reduce((weakest, candidate) =>
    skills[candidate] < skills[weakest] ? candidate : weakest,
  );
  const level = Math.min(
    MAX_LEVEL,
    Math.max(MIN_LEVEL, Math.round(skills[domain])),
  );

  return { game: GAME_FOR_DOMAIN[domain], domain, level };
}
