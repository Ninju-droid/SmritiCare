export type GameRound = {
  correct: boolean;
  responseMs: number;
};

export type GameResult = {
  accuracy: number;
  avgResponseMs: number;
  rounds: GameRound[];
  durationSec: number;
};

export type GameProps = {
  level: number;
  onFinish: (result: GameResult) => void;
};
