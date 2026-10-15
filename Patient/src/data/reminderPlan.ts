import type { Reminder, ReminderLog } from "./types";
import type { TranslationKey } from "../i18n";

export type ReminderStatus = "done" | "next" | "later";

export type TodayReminder = {
  reminder: Reminder;
  status: ReminderStatus;
};

function reminderMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);

  return hours * 60 + minutes;
}

function happenedToday(value: string, today: Date): boolean {
  const date = new Date(value);

  return (
    Number.isFinite(date.getTime()) &&
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

/** Sorts reminders and assigns the patient-friendly status for today's plan. */
export function getTodayReminderPlan(
  reminders: Reminder[],
  logs: ReminderLog[],
  today = new Date(),
): TodayReminder[] {
  const todayLogs = logs.filter((log) => happenedToday(log.dueAt, today));
  const ordered = [...reminders].sort((first, second) =>
    first.time.localeCompare(second.time),
  );
  const statuses = ordered.map((reminder) => {
    const latestLog = todayLogs
      .filter((log) => log.reminderId === reminder.id)
      .sort(
        (first, second) =>
          Date.parse(second.loggedAt) - Date.parse(first.loggedAt),
      )[0];

    return latestLog?.status === "taken"
      ? "done"
      : latestLog?.status === "missed"
        ? "later"
        : "pending";
  });
  const currentMinutes = today.getHours() * 60 + today.getMinutes();
  const nextIndex = statuses.findIndex((status, index) => {
    if (status !== "pending") {
      return false;
    }

    const minutes = reminderMinutes(ordered[index].time);
    return minutes >= currentMinutes || currentMinutes - minutes <= 30;
  });

  return ordered.map((reminder, index) => ({
    reminder,
    status:
      statuses[index] === "done"
        ? "done"
        : index === nextIndex
          ? "next"
          : "later",
  }));
}

/** Gives seeded reminders localized labels and leaves caregiver-entered titles intact. */
export function getReminderTitleKey(title: string): TranslationKey | null {
  const knownTitles: Record<string, TranslationKey> = {
    "morning tablet": "reminderMorningTablet",
    "drink water": "reminderDrinkWater",
    "lunch and tablet": "reminderLunchTablet",
    walk: "reminderWalk",
  };

  return knownTitles[title.trim().toLowerCase()] ?? null;
}

export function formatReminderTime(time: string, language: "en" | "as") {
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return new Intl.DateTimeFormat(language === "as" ? "as-IN" : "en-IN", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
