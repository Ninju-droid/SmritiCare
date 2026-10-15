import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import { router, usePathname, type Href } from "expo-router";
import type * as NotificationsTypes from "expo-notifications";
import { getPatient, getReminderLogs, getReminders } from "../data/repo";
import { createAlert, saveReminderLog } from "../data/repo";
import { getItem, setItem, storageKeys } from "../data/storage";
import { getLocalNotifications } from "../notifications";
import type { Reminder, ReminderLog } from "../data/types";
import { useLanguage } from "../i18n";
import { getReminderTitleKey } from "../data/reminderPlan";

type SchedulerState = {
  firedKeys: string[];
  snoozeCounts: Record<string, number>;
  openedAt: Record<string, string>;
};

type AlarmParams = {
  reminderId: string;
  dueAt: string;
  snoozeCount: number;
  alarmAt: string;
  returnTo: string;
};

const EMPTY_STATE: SchedulerState = {
  firedKeys: [],
  snoozeCounts: {},
  openedAt: {},
};
const MISSED_AFTER_MS = 10 * 60 * 1000;
const CHECK_INTERVAL_MS = 30 * 1000;
const MAX_SNOOZES = 2;

function makeDueAt(reminder: Reminder, date: Date): Date {
  const [hours, minutes] = reminder.time.split(":").map(Number);
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hours,
    minutes,
  );
}

function makeDueKey(reminderId: string, dueAt: Date): string {
  const year = dueAt.getFullYear();
  const month = String(dueAt.getMonth() + 1).padStart(2, "0");
  const day = String(dueAt.getDate()).padStart(2, "0");
  return `${reminderId}:${year}-${month}-${day}`;
}

function makeLog(
  reminder: Reminder,
  status: ReminderLog["status"],
  dueAt: Date,
): ReminderLog {
  return {
    id: `${makeDueKey(reminder.id, dueAt)}:${status}:${Date.now()}`,
    reminderId: reminder.id,
    patientId: reminder.patientId,
    status,
    dueAt: dueAt.toISOString(),
    loggedAt: new Date().toISOString(),
  };
}

function isToday(value: string, date: Date): boolean {
  const parsed = new Date(value);

  return (
    parsed.getFullYear() === date.getFullYear() &&
    parsed.getMonth() === date.getMonth() &&
    parsed.getDate() === date.getDate()
  );
}

function buildAlarmUrl(params: AlarmParams): Href {
  return {
    pathname: "/alarm",
    params: {
      reminderId: params.reminderId,
      dueAt: params.dueAt,
      snoozeCount: String(params.snoozeCount),
      alarmAt: params.alarmAt,
      returnTo: params.returnTo,
    },
  };
}

async function getSchedulerState(): Promise<SchedulerState> {
  const savedState = await getItem<Partial<SchedulerState>>(
    storageKeys.reminderScheduler,
  );
  return {
    ...EMPTY_STATE,
    ...savedState,
    firedKeys: savedState?.firedKeys ?? [],
    snoozeCounts: savedState?.snoozeCounts ?? {},
    openedAt: savedState?.openedAt ?? {},
  };
}

export function useReminderScheduler() {
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  const activeAlarmKey = useRef<string | null>(null);
  const isChecking = useRef(false);
  const { language, t } = useLanguage();

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    let isMounted = true;
    let notificationsConfigured = false;
    let scheduledReminderSignature = "";

    async function scheduleDailyNotifications(reminders: Reminder[]) {
      try {
        const Notifications = await getLocalNotifications();
        if (!Notifications) return;
        const signature = reminders
          .map((reminder) => `${reminder.id}:${reminder.time}:${reminder.repeat}`)
          .sort()
          .join("|");
        if (
          notificationsConfigured &&
          signature === scheduledReminderSignature
        ) {
          return;
        }

        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("reminders", {
            name: "Reminders",
            importance: Notifications.AndroidImportance.DEFAULT,
          });
        }

        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldPlaySound: false,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });

        let permission = await Notifications.getPermissionsAsync();
        if (permission.status !== "granted") {
          permission = await Notifications.requestPermissionsAsync();
        }

        if (permission.status !== "granted") {
          notificationsConfigured = true;
          scheduledReminderSignature = signature;
          return;
        }

        const scheduled =
          await Notifications.getAllScheduledNotificationsAsync();

        for (const reminder of reminders) {
          const existingReminder = scheduled.some(
            (item) =>
              item.content.data?.reminderId === reminder.id &&
              item.content.data?.kind === "reminder",
          );

          const [hour, minute] = reminder.time.split(":").map(Number);
          if (!existingReminder) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: t("alarmTitle"),
                body: reminder.title,
                data: { kind: "reminder", reminderId: reminder.id },
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
                hour,
                minute,
                repeats: true,
              },
            });
          }
        }
        notificationsConfigured = true;
        scheduledReminderSignature = signature;
      } catch {}
    }

    async function openAlarm(
      reminderId: string,
      dueAt: Date,
      restartResponseWindow = false,
    ) {
      const dueKey = makeDueKey(reminderId, dueAt);
      if (
        !isMounted ||
        (activeAlarmKey.current === dueKey && pathnameRef.current === "/alarm")
      ) {
        return;
      }

      const [reminders, logs, savedState] = await Promise.all([
        getReminders(),
        getReminderLogs(),
        getSchedulerState(),
      ]);
      const reminder = reminders.find((item) => item.id === reminderId);
      if (!reminder) {
        throw new Error(`Reminder "${reminderId}" no longer exists.`);
      }

      const alreadyAnswered = logs.some(
        (log) =>
          log.reminderId === reminderId &&
          isToday(log.dueAt, dueAt) &&
          (log.status === "taken" || log.status === "missed"),
      );
      if (alreadyAnswered) return;

      const state = savedState ?? EMPTY_STATE;
      const alarmAt =
        !restartResponseWindow && state.openedAt[dueKey]
          ? state.openedAt[dueKey]
          : new Date().toISOString();
      await setItem(storageKeys.reminderScheduler, {
        ...state,
        openedAt: { ...state.openedAt, [dueKey]: alarmAt },
      });
      activeAlarmKey.current = dueKey;
      router.push(
        buildAlarmUrl({
          reminderId,
          dueAt: dueAt.toISOString(),
          snoozeCount: state.snoozeCounts[dueKey] ?? 0,
          alarmAt,
          returnTo: pathnameRef.current === "/alarm" ? "/" : pathnameRef.current,
        }),
      );
    }

    async function markMissed(reminderId: string, dueAt: Date) {
      const dueKey = makeDueKey(reminderId, dueAt);
      const reminders = await getReminders();
      const reminder = reminders.find((item) => item.id === reminderId);
      if (!reminder) {
        throw new Error(`Reminder "${reminderId}" no longer exists.`);
      }
      const logs = await getReminderLogs();
      if (
        logs.some(
          (log) =>
            log.reminderId === reminderId &&
            isToday(log.dueAt, dueAt) &&
            (log.status === "taken" || log.status === "missed"),
        )
      ) {
        return;
      }
      const latestSnooze = logs
        .filter(
          (log) =>
            log.reminderId === reminderId &&
            log.status === "snoozed" &&
            isToday(log.dueAt, dueAt),
        )
        .sort(
          (first, second) =>
            Date.parse(second.loggedAt) - Date.parse(first.loggedAt),
        )[0];
      if (
        latestSnooze &&
        Date.now() - Date.parse(latestSnooze.loggedAt) < MISSED_AFTER_MS
      ) {
        return;
      }

      const state =
        (await getItem<SchedulerState>(storageKeys.reminderScheduler)) ??
        EMPTY_STATE;
      if (state.firedKeys.includes(`${dueKey}:missed`)) return;

      await saveReminderLog({
        ...makeLog(reminder, "missed", dueAt),
        id: `${dueKey}:missed`,
      });
      await createAlert(
        reminder.patientId,
        "missed_dose",
        `No response to reminder: ${reminder.title}`,
      );
      await setItem(storageKeys.reminderScheduler, {
        ...state,
        firedKeys: [...state.firedKeys, `${dueKey}:missed`],
      });
      activeAlarmKey.current = null;
    }

    async function handleNotification(
      notification: NotificationsTypes.Notification,
    ) {
      const data = notification.request.content.data;
      if (!data || typeof data.reminderId !== "string") return;

      const reminderId = data.reminderId;
      const reminders = await getReminders();
      const reminder = reminders.find((item) => item.id === reminderId);
      if (!reminder) return;
      const now = new Date();
      const notificationDueAt =
        typeof data.dueAt === "string" ? new Date(data.dueAt) : null;
      const dueAt =
        notificationDueAt && Number.isFinite(notificationDueAt.getTime())
          ? notificationDueAt
          : makeDueAt(reminder, now);
      if (data.kind === "missed" && dueAt.getTime() > now.getTime()) {
        dueAt.setDate(dueAt.getDate() - 1);
      }
      const ageMs = now.getTime() - dueAt.getTime();
      if (ageMs < 0) return;

      if (data.kind === "missed") {
        const [logs, schedulerState] = await Promise.all([
          getReminderLogs(),
          getSchedulerState(),
        ]);
        const latestSnooze = logs
          .filter(
            (log) =>
              log.reminderId === reminderId &&
              log.status === "snoozed" &&
              isToday(log.dueAt, dueAt),
          )
          .sort(
            (first, second) =>
              Date.parse(second.loggedAt) - Date.parse(first.loggedAt),
          )[0];
        const key = makeDueKey(reminderId, dueAt);
        if (
          latestSnooze &&
          Date.now() - Date.parse(latestSnooze.loggedAt) >= MISSED_AFTER_MS &&
          (schedulerState?.snoozeCounts[key] ?? 0) < MAX_SNOOZES
        ) {
          await openAlarm(reminderId, dueAt, true);
        } else if (
          latestSnooze &&
          Date.now() - Date.parse(latestSnooze.loggedAt) < MISSED_AFTER_MS
        ) {
          return;
        } else if (schedulerState?.openedAt[key]) {
          const alarmAge =
            Date.now() - Date.parse(schedulerState.openedAt[key]);
          if (alarmAge < MISSED_AFTER_MS || pathnameRef.current === "/alarm") {
            return;
          }
          await markMissed(reminderId, dueAt);
        } else if (
          ageMs <= 30 * 60 * 1000
        ) {
          await openAlarm(reminderId, dueAt);
        } else {
          await markMissed(reminderId, dueAt);
        }
      } else {
        await openAlarm(reminderId, dueAt);
      }
    }

    async function checkDueReminders() {
      if (!isMounted || isChecking.current) return;
      isChecking.current = true;

      try {
        const patient = await getPatient();
        if (!patient) return;
        const [reminders, logs, savedState] = await Promise.all([
          getReminders(),
          getReminderLogs(),
          getSchedulerState(),
        ]);
        const state = savedState ?? EMPTY_STATE;
        const now = new Date();
        const todaysReminders = reminders.filter(
          (reminder) =>
            reminder.patientId === patient.id &&
            (reminder.repeat === "daily" || reminder.repeat === "once"),
        );

        await scheduleDailyNotifications(todaysReminders);

        for (const reminder of todaysReminders) {
          const dueAt = makeDueAt(reminder, now);
          const ageMs = now.getTime() - dueAt.getTime();
          if (ageMs < 0) continue;

          const dueKey = makeDueKey(reminder.id, dueAt);
          const todaysLogs = logs.filter(
            (log) =>
              log.reminderId === reminder.id && isToday(log.dueAt, now),
          );
          if (
            todaysLogs.some(
              (log) => log.status === "taken" || log.status === "missed",
            )
          ) {
            continue;
          }

          const latestLog = todaysLogs.sort(
            (first, second) =>
              Date.parse(second.loggedAt) - Date.parse(first.loggedAt),
          )[0];
          if (latestLog?.status === "snoozed") {
            const snoozeAt = Date.parse(latestLog.loggedAt) + 10 * 60 * 1000;
            if (now.getTime() < snoozeAt) continue;
            if ((state.snoozeCounts[dueKey] ?? 0) >= 2) {
              await markMissed(reminder.id, dueAt);
            } else {
              await openAlarm(reminder.id, dueAt, true);
            }
            break;
          } else if (state.openedAt[dueKey]) {
            const alarmAge = now.getTime() - Date.parse(state.openedAt[dueKey]);
            if (alarmAge >= MISSED_AFTER_MS) {
              if (pathnameRef.current !== "/alarm") {
                await markMissed(reminder.id, dueAt);
              }
              continue;
            }
            await openAlarm(reminder.id, dueAt);
            break;
          } else if (ageMs > 30 * 60 * 1000) {
            await markMissed(reminder.id, dueAt);
            continue;
          } else if (ageMs < 0) continue;

          const firedKeys = state.firedKeys;
          if (!firedKeys.includes(dueKey)) {
            await setItem(storageKeys.reminderScheduler, {
              ...state,
              firedKeys: [...firedKeys, dueKey],
            });
            await openAlarm(reminder.id, dueAt);
            break;
          }
        }
      } catch {
      } finally {
        isChecking.current = false;
      }
    }

    let receivedSubscription: NotificationsTypes.EventSubscription | null = null;
    let responseSubscription: NotificationsTypes.EventSubscription | null = null;
    void getLocalNotifications()
      .then(async (Notifications) => {
        if (!Notifications || !isMounted) return;
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldPlaySound: false,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });
        receivedSubscription =
          Notifications.addNotificationReceivedListener((notification) => {
            void handleNotification(notification).catch(() => {});
          });
        responseSubscription =
          Notifications.addNotificationResponseReceivedListener((response) => {
            void handleNotification(response.notification).catch(() => {});
          });
        const response = await Notifications.getLastNotificationResponseAsync();
        if (response && isMounted) {
          await handleNotification(response.notification);
        }
      })
      .catch(() => {});
    const appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void checkDueReminders();
    });
    const interval = setInterval(
      () => void checkDueReminders(),
      CHECK_INTERVAL_MS,
    );

    void checkDueReminders();

    return () => {
      isMounted = false;
      clearInterval(interval);
      receivedSubscription?.remove();
      responseSubscription?.remove();
      appStateSubscription.remove();
    };
  }, [language, t]);
}
