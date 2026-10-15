import type { Game } from "../../data/types";
import { nextLevel, pickNextActivity } from "../difficulty";
import { updateSkill } from "../skills";

function rounds(correct: boolean, count: number, responseMs = 1000) {
  return Array.from({ length: count }, () => ({ correct, responseMs }));
}

describe("nextLevel", () => {
  test("keeps a brand-new user at the first level", () => {
    expect(nextLevel([], 1)).toEqual({ level: 1, fatigue: false });
  });

  test("moves up after three correct rounds and stops at level ten", () => {
    let level = 1;
    const history: ReturnType<typeof rounds> = [];

    for (let session = 0; session < 10; session += 1) {
      history.push(...rounds(true, 1));
      level = nextLevel(history, level).level;
    }

    expect(level).toBe(9);
    expect(nextLevel(rounds(true, 3), 10).level).toBe(10);
  });

  test("moves down after two wrong rounds and stops at level one", () => {
    let level = 10;
    const history: ReturnType<typeof rounds> = [];

    for (let session = 0; session < 10; session += 1) {
      history.push(...rounds(false, 1));
      level = nextLevel(history, level).level;
    }

    expect(level).toBe(1);
    expect(nextLevel(rounds(false, 2), 1).level).toBe(1);
  });

  test("does not lower the level after just one wrong round", () => {
    expect(nextLevel(rounds(false, 1), 7).level).toBe(7);
  });

  test("detects a slowdown in the latest third after six rounds", () => {
    const history = [
      ...rounds(true, 4, 1000),
      ...rounds(true, 2, 2000),
    ];

    expect(nextLevel(history, 4).fatigue).toBe(true);
    expect(nextLevel(rounds(true, 5, 2000), 4).fatigue).toBe(false);
    expect(nextLevel(rounds(true, 6, 1000), 4).fatigue).toBe(false);
  });
});

describe("updateSkill", () => {
  test("moves a skill toward performance and clamps it", () => {
    expect(updateSkill(5, 10)).toBe(6.5);
    expect(updateSkill(1, 0)).toBe(1);
    expect(updateSkill(10, 10)).toBe(10);
  });
});

describe("pickNextActivity", () => {
  const skills = { memory: 2, attention: 4, routine: 7 };

  test("chooses the weakest domain and maps it to a game", () => {
    expect(pickNextActivity(skills, [])).toEqual({
      game: "memory",
      domain: "memory",
      level: 2,
    });
  });

  test("avoids domains from the two most recent games", () => {
    expect(pickNextActivity(skills, ["memory"])).toMatchObject({
      game: "disappear",
      domain: "attention",
    });
    expect(pickNextActivity(skills, ["memory", "disappear"])).toMatchObject({
      game: "routine",
      domain: "routine",
    });
  });

  test("continues through all three games as recent sessions change", () => {
    const first = pickNextActivity(skills, []);
    const second = pickNextActivity(skills, [first.game]);
    const third = pickNextActivity(skills, [second.game, first.game]);
    const next = pickNextActivity(skills, [third.game, second.game]);

    expect([first.game, second.game, third.game, next.game]).toEqual([
      "memory",
      "disappear",
      "routine",
      "memory",
    ]);
  });

  test("rounds the chosen skill for level and clamps it to 1 through 10", () => {
    const games: Game[] = [];
    expect(
      pickNextActivity({ memory: 0, attention: 4, routine: 8 }, games).level,
    ).toBe(1);
    expect(
      pickNextActivity({ memory: 14, attention: 15, routine: 16 }, games)
        .level,
    ).toBe(10);
  });
});
