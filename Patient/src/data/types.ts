export type Game = "memory" | "disappear" | "routine";
export type Domain = "memory" | "attention" | "routine";
export type ReminderType =
  | "medicine"
  | "water"
  | "activity"
  | "appointment";
export type ReminderLogStatus = "taken" | "snoozed" | "missed";
export type AlertType = "confused" | "missed_dose";

export type Patient = {
  id: string;
  name: string;
  age: number;
  language: "en" | "as";
  caregiverName: string;
};

export type Session = {
  id: string;
  patientId: string;
  game: Game;
  domain: Domain;
  level: number;
  accuracy: number;
  avgResponseMs: number;
  fatigue: boolean;
  durationSec: number;
  startedAt: string;
};

export type Reminder = {
  id: string;
  patientId: string;
  type: ReminderType;
  title: string;
  time: string;
  repeat: "daily" | "once";
};

export type ReminderLog = {
  id: string;
  reminderId: string;
  patientId: string;
  status: ReminderLogStatus;
  dueAt: string;
  loggedAt: string;
};

export type Alert = {
  id: string;
  patientId: string;
  type: AlertType;
  message: string;
  createdAt: string;
};

export type Skills = {
  patientId: string;
  memory: number;
  attention: number;
  routine: number;
  updatedAt: string;
};

export type SyncRecordType =
  | "patient"
  | "session"
  | "reminder"
  | "reminderLog"
  | "alert"
  | "skills";

export type SyncItem = {
  id: string;
  type: SyncRecordType;
  payload: unknown;
  createdAt: string;
  synced: boolean;
  attempts: number;
};
