import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { AppText } from "../components/AppText";
import { BigButton } from "../components/BigButton";
import { ScreenContainer } from "../components/ScreenContainer";
import { createAlert, getReminderLogs, getReminders, saveReminderLog } from "../data/repo";
import { getReminderTitleKey } from "../data/reminderPlan";
import { getItem, setItem, storageKeys } from "../data/storage";
import { getLocalNotifications } from "../notifications";
import type { Reminder } from "../data/types";
import { useLanguage } from "../i18n";
import { useSpeak } from "../hooks/useSpeak";
import {
  borderWidths,
  colors,
  fontSizes,
  minTouch,
  radii,
  spacing,
} from "../theme";

type SchedulerState = {
  firedKeys: string[];
  snoozeCounts: Record<string, number>;
  openedAt: Record<string, string>;
};

const RETURN_ROUTES = ["/", "/play", "/day", "/help", "/summary"] as const;
type ReturnRoute = (typeof RETURN_ROUTES)[number];

const EMPTY_STATE: SchedulerState = {
  firedKeys: [],
  snoozeCounts: {},
  openedAt: {},
};
const MAX_SNOOZES = 2;

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

function getDueKey(reminderId: string, dueAt: Date) {
  const year = dueAt.getFullYear();
  const month = String(dueAt.getMonth() + 1).padStart(2, "0");
  const day = String(dueAt.getDate()).padStart(2, "0");
  return `${reminderId}:${year}-${month}-${day}`;
}

export default function AlarmScreen() {
  const { t } = useLanguage();
  const { speak } = useSpeak();
  const params = useLocalSearchParams<{
    reminderId?: string;
    dueAt?: string;
    alarmAt?: string;
    snoozeCount?: string;
    returnTo?: string;
  }>();
  const [reminder, setReminder] = useState<Reminder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deadline, setDeadline] = useState(Date.now() + 10 * 60 * 1000);
  const [error, setError] = useState<string | null>(null);
  const isHandled = useRef(false);
  const missedNotificationId = useRef<string | null>(null);
  const dueAt = useMemo(
    () => new Date(params.dueAt ?? 0),
    [params.dueAt],
  );
  const snoozeCount = Math.max(0, Number(params.snoozeCount ?? 0));
  const returnTo: ReturnRoute =
    RETURN_ROUTES.find((route) => route === params.returnTo) ?? "/";
  const dueKey = params.reminderId
    ? getDueKey(params.reminderId, dueAt)
    : "";

  useEffect(() => {
    isHandled.current = false;
  }, [dueKey]);

  useEffect(() => {
    let isMounted = true;

    async function loadReminder() {
      if (!params.reminderId) {
        router.replace("/");
        return;
      }

      try {
        const reminders = await getReminders();
        const savedReminder = reminders.find(
          (item) => item.id === params.reminderId,
        );
        if (!savedReminder) {
          throw new Error("The saved reminder could not be found.");
        }

        const logs = await getReminderLogs();
        const latestSnooze = logs
          .filter(
            (log) =>
              log.reminderId === savedReminder.id &&
              log.status === "snoozed" &&
              new Date(log.dueAt).toDateString() === dueAt.toDateString(),
          )
          .sort(
            (first, second) =>
              Date.parse(second.loggedAt) - Date.parse(first.loggedAt),
          )[0];
        const nextDeadline = latestSnooze
          ? Date.parse(latestSnooze.loggedAt) + 10 * 60 * 1000
          : Date.parse(params.alarmAt ?? dueAt.toISOString()) +
            10 * 60 * 1000;

        if (isMounted) {
          setReminder(savedReminder);
          setDeadline(nextDeadline);
          setIsLoading(false);
        }
      } catch {
        if (isMounted) {
          setError(t("reminderLoadError"));
          setIsLoading(false);
        }
      }
    }

    void loadReminder();
    return () => {
      isMounted = false;
    };
  }, [dueAt.toISOString(), params.alarmAt, params.reminderId, t]);

  const titleKey = reminder ? getReminderTitleKey(reminder.title) : null;
  const reminderTitle = titleKey ? t(titleKey) : reminder?.title ?? "";
  const alarmTitle = reminder
    ? t("alarmReminderTitle", { reminder: reminderTitle })
    : t("alarmTitle");
  const alarmDetail = reminder
    ? t("alarmReminderDetail", { reminder: reminderTitle })
    : t("alarmDescription");

  const cancelMissedNotification = useCallback(async () => {
    const notificationId = missedNotificationId.current;
    missedNotificationId.current = null;
    const Notifications = notificationId
      ? await getLocalNotifications()
      : null;
    if (notificationId && Notifications) {
      try {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (!reminder) return;

    void speak(`${alarmTitle}. ${alarmDetail}`).catch(() => {});
  }, [alarmDetail, alarmTitle, reminder, speak]);

  const finishMissed = useCallback(async () => {
    if (!reminder || isHandled.current) return;
    isHandled.current = true;

    try {
      await cancelMissedNotification();
      await saveReminderLog({
        id: `${dueKey}:missed`,
        reminderId: reminder.id,
        patientId: reminder.patientId,
        status: "missed",
        dueAt: dueAt.toISOString(),
        loggedAt: new Date().toISOString(),
      });
      await createAlert(
        reminder.patientId,
        "missed_dose",
        `No response to reminder: ${reminder.title}`,
      );
      router.replace(returnTo);
    } catch {
      isHandled.current = false;
      setError(t("gameSaveError"));
    }
  }, [cancelMissedNotification, dueAt, reminder, returnTo, t]);

  useEffect(() => {
    if (!reminder || isHandled.current) return;

    const timeoutMs = Math.max(0, deadline - Date.now());
    const timeout = setTimeout(() => {
      void finishMissed();
    }, timeoutMs);

    let shouldCancelNotification = false;
    void getLocalNotifications()
      .then((Notifications) => {
        if (!Notifications) return null;
        return Notifications.scheduleNotificationAsync({
          content: {
            title: t("alarmTitle"),
            body: t("alarmMissedNotification"),
            data: { kind: "missed", reminderId: reminder.id },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: Math.max(1, Math.ceil(timeoutMs / 1000)),
          },
        });
      })
      .then((notificationId) => {
        if (!notificationId) return;
        if (shouldCancelNotification || isHandled.current) {
          void getLocalNotifications()
            .then((Notifications) =>
              Notifications?.cancelScheduledNotificationAsync(notificationId),
            )
            .catch(() => {});
        } else {
          missedNotificationId.current = notificationId;
        }
      })
      .catch(() => {});

    return () => {
      clearTimeout(timeout);
      shouldCancelNotification = true;
      void cancelMissedNotification();
    };
  }, [cancelMissedNotification, deadline, finishMissed, reminder, t]);

  async function takeReminder() {
    if (!reminder || isHandled.current) return;
    isHandled.current = true;

    try {
      await cancelMissedNotification();
      await saveReminderLog({
        id: `${dueKey}:taken`,
        reminderId: reminder.id,
        patientId: reminder.patientId,
        status: "taken",
        dueAt: dueAt.toISOString(),
        loggedAt: new Date().toISOString(),
      });
      router.replace(returnTo);
    } catch {
      isHandled.current = false;
      setError(t("gameSaveError"));
    }
  }

  async function snoozeReminder() {
    if (!reminder || isHandled.current || snoozeCount >= MAX_SNOOZES) return;
    isHandled.current = true;

    try {
      await cancelMissedNotification();
      const loggedAt = new Date();
      await saveReminderLog({
        id: `${dueKey}:snoozed:${snoozeCount + 1}`,
        reminderId: reminder.id,
        patientId: reminder.patientId,
        status: "snoozed",
        dueAt: dueAt.toISOString(),
        loggedAt: loggedAt.toISOString(),
      });
      const state = await getSchedulerState();
      await setItem(storageKeys.reminderScheduler, {
        firedKeys: state.firedKeys.filter((key) => key !== dueKey),
        snoozeCounts: {
          ...state.snoozeCounts,
          [dueKey]: snoozeCount + 1,
        },
        openedAt: state.openedAt,
      });

      const Notifications = await getLocalNotifications();
      if (Notifications) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: t("alarmTitle"),
            body: reminderTitle,
            data: {
              kind: "snooze",
              reminderId: reminder.id,
              dueAt: dueAt.toISOString(),
            },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: 10 * 60,
          },
        });
      }
      setDeadline(Date.now() + 10 * 60 * 1000);
      router.replace(returnTo);
    } catch {
      isHandled.current = false;
      setError(t("gameSaveError"));
    }
  }

  function hearAgain() {
    void speak(`${alarmTitle}. ${alarmDetail}`).catch(() => {});
  }

  if (isLoading || !reminder) {
    return (
      <ScreenContainer
        showTopBar
        speakText={error ?? t("alarmDescription")}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <AppText accessibilityRole={error ? "alert" : undefined}>
            {error ?? t("alarmDescription")}
          </AppText>
          {error ? (
            <BigButton
              label={t("home")}
              icon="⌂"
              onPress={() => router.replace("/")}
            />
          ) : null}
        </ScrollView>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      showTopBar
      speakText={`${alarmTitle}. ${alarmDetail}`}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityLabel={t("alarmReminderIcon")} style={styles.icon}>
          🔔
        </Text>
        <AppText variant="title" accessibilityRole="header" style={styles.title}>
          {alarmTitle}
        </AppText>
        <AppText style={styles.detail}>{alarmDetail}</AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("alarmHearAgain")}
          onPress={hearAgain}
          style={styles.hearAgain}
        >
          <AppText style={styles.hearAgainText}>{t("alarmHearAgain")}</AppText>
        </Pressable>
        {error && <AppText accessibilityRole="alert">{error}</AppText>}
        <View style={styles.buttons}>
          <BigButton
            label={t("alarmTaken")}
            icon="✓"
            variant="success"
            onPress={() => void takeReminder()}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("alarmSnooze")}
            accessibilityState={{ disabled: snoozeCount >= MAX_SNOOZES }}
            disabled={snoozeCount >= MAX_SNOOZES}
            onPress={() => void snoozeReminder()}
            style={({ pressed }) => [
              styles.snoozeButton,
              pressed && styles.pressed,
              snoozeCount >= MAX_SNOOZES && styles.disabledButton,
            ]}
          >
            <Text style={styles.snoozeText}>{t("alarmSnooze")}</Text>
          </Pressable>
        </View>
        </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.large,
  },
  icon: {
    fontSize: fontSizes.alarmIcon,
  },
  title: {
    textAlign: "center",
  },
  detail: {
    textAlign: "center",
  },
  hearAgain: {
    minHeight: minTouch.control,
    justifyContent: "center",
    paddingHorizontal: spacing.medium,
  },
  hearAgainText: {
    color: colors.teal,
    fontSize: fontSizes.body,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  buttons: {
    width: "100%",
    gap: spacing.medium,
  },
  snoozeButton: {
    minHeight: minTouch.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.medium,
    borderWidth: borderWidths.control,
    borderColor: colors.teal,
    borderRadius: radii.card,
    backgroundColor: colors.cream,
  },
  snoozeText: {
    color: colors.text,
    fontSize: fontSizes.button,
    fontWeight: "700",
    textAlign: "center",
  },
  disabledButton: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.82,
  },
});
