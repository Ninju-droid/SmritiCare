import * as Crypto from "expo-crypto";
import type {
  Alert,
  Patient,
  Reminder,
  ReminderLog,
  Session,
  Skills,
  SyncRecordType,
} from "./types";
import { enqueue } from "./syncQueue";
import { getItem, setItem, storageKeys } from "./storage";

async function getList<T>(key: string): Promise<T[]> {
  const value = await getItem<T[]>(key);

  if (value === null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error(`The saved data for "${key}" is not a list.`);
  }

  return value;
}

async function saveRecord<T>(
  key: string,
  type: SyncRecordType,
  value: T,
): Promise<void> {
  await setItem(key, value);
  await enqueue(type, value);
}

export async function getPatient(): Promise<Patient | null> {
  return getItem<Patient>(storageKeys.patient);
}

export async function savePatient(patient: Patient): Promise<void> {
  await saveRecord(storageKeys.patient, "patient", patient);
}

export async function saveSession(session: Session): Promise<void> {
  const sessions = await getList<Session>(storageKeys.sessions);
  sessions.push(session);
  await setItem(storageKeys.sessions, sessions);
  await enqueue("session", session);
}

export async function getRecentSessions(days: number): Promise<Session[]> {
  if (!Number.isFinite(days) || days < 0) {
    throw new RangeError("The session lookback period must be non-negative.");
  }

  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const sessions = await getList<Session>(storageKeys.sessions);

  return sessions
    .filter((session) => {
      const startedAt = Date.parse(session.startedAt);
      return Number.isFinite(startedAt) && startedAt >= cutoff;
    })
    .sort(
      (first, second) =>
        Date.parse(second.startedAt) - Date.parse(first.startedAt),
    );
}

export async function getReminders(): Promise<Reminder[]> {
  return getList<Reminder>(storageKeys.reminders);
}

export async function saveReminder(reminder: Reminder): Promise<void> {
  const reminders = await getReminders();
  const index = reminders.findIndex((item) => item.id === reminder.id);

  if (index === -1) {
    reminders.push(reminder);
  } else {
    reminders[index] = reminder;
  }

  await setItem(storageKeys.reminders, reminders);
  await enqueue("reminder", reminder);
}

export async function saveReminderLog(log: ReminderLog): Promise<void> {
  const logs = await getList<ReminderLog>(storageKeys.reminderLogs);
  if (logs.some((savedLog) => savedLog.id === log.id)) {
    return;
  }
  logs.push(log);
  await setItem(storageKeys.reminderLogs, logs);
  await enqueue("reminderLog", log);
}

export async function getReminderLogs(): Promise<ReminderLog[]> {
  return getList<ReminderLog>(storageKeys.reminderLogs);
}

export async function createAlert(
  patientId: string,
  type: Alert["type"],
  message: string,
): Promise<Alert> {
  const alert: Alert = {
    id: Crypto.randomUUID(),
    patientId,
    type,
    message,
    createdAt: new Date().toISOString(),
  };
  const alerts = await getList<Alert>(storageKeys.alerts);
  alerts.push(alert);
  await setItem(storageKeys.alerts, alerts);
  await enqueue("alert", alert);

  return alert;
}

export async function getSkills(patientId?: string): Promise<Skills | null> {
  const skills = await getItem<Skills>(storageKeys.skills);

  if (skills && patientId && skills.patientId !== patientId) {
    return null;
  }

  return skills;
}

export async function saveSkills(skills: Skills): Promise<void> {
  await saveRecord(storageKeys.skills, "skills", skills);
}
