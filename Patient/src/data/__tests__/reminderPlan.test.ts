import type { Reminder, ReminderLog } from "../types";
import { getTodayReminderPlan } from "../reminderPlan";

const reminders: Reminder[] = [
  {
    id: "lunch",
    patientId: "patient",
    type: "medicine",
    title: "Lunch and tablet",
    time: "13:00",
    repeat: "daily",
  },
  {
    id: "morning",
    patientId: "patient",
    type: "medicine",
    title: "Morning tablet",
    time: "08:00",
    repeat: "daily",
  },
  {
    id: "walk",
    patientId: "patient",
    type: "activity",
    title: "Walk",
    time: "16:00",
    repeat: "daily",
  },
];

function makeLog(
  reminderId: string,
  status: ReminderLog["status"],
  today: Date,
): ReminderLog {
  const dueAt = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    8,
  ).toISOString();

  return {
    id: `${reminderId}-${status}`,
    reminderId,
    patientId: "patient",
    status,
    dueAt,
    loggedAt: dueAt,
  };
}

describe("getTodayReminderPlan", () => {
  test("sorts reminders by time and picks the first pending reminder", () => {
    const plan = getTodayReminderPlan(
      reminders,
      [],
      new Date(2026, 9, 10, 7, 30),
    );

    expect(plan.map(({ reminder, status }) => [reminder.id, status])).toEqual([
      ["morning", "next"],
      ["lunch", "later"],
      ["walk", "later"],
    ]);
  });

  test("marks taken reminders done and skips missed reminders for next", () => {
    const today = new Date(2026, 9, 10, 7, 30);
    const logs = [
      makeLog("morning", "taken", today),
      makeLog("lunch", "missed", today),
    ];
    const plan = getTodayReminderPlan(reminders, logs, today);

    expect(plan.map(({ reminder, status }) => [reminder.id, status])).toEqual([
      ["morning", "done"],
      ["lunch", "later"],
      ["walk", "next"],
    ]);
  });

  test("does not use yesterday's reminder logs", () => {
    const today = new Date(2026, 9, 10, 7, 30);
    const yesterday = new Date(2026, 9, 9, 7, 30);

    expect(
      getTodayReminderPlan(
        reminders,
        [makeLog("morning", "taken", yesterday)],
        today,
      )[0].status,
    ).toBe("next");
  });

  test("does not label old unanswered reminders as next", () => {
    const plan = getTodayReminderPlan(
      reminders,
      [],
      new Date(2026, 9, 10, 15, 30),
    );

    expect(plan.map(({ reminder, status }) => [reminder.id, status])).toEqual([
      ["morning", "later"],
      ["lunch", "later"],
      ["walk", "next"],
    ]);
  });
});
