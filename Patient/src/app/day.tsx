import { useCallback, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { useFocusEffect } from "expo-router";
import { AppText } from "../components/AppText";
import { ReminderRow } from "../components/ReminderRow";
import { ScreenContainer } from "../components/ScreenContainer";
import { getPatient, getReminderLogs, getReminders } from "../data/repo";
import {
  formatReminderTime,
  getReminderTitleKey,
  getTodayReminderPlan,
} from "../data/reminderPlan";
import type { TodayReminder } from "../data/reminderPlan";
import { useLanguage } from "../i18n";
import { spacing } from "../theme";

export default function DayScreen() {
  const { language, t } = useLanguage();
  const [plan, setPlan] = useState<TodayReminder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const nextReminder = plan.find((item) => item.status === "next");
  const nextTitleKey = nextReminder
    ? getReminderTitleKey(nextReminder.reminder.title)
    : null;
  const speechText = nextReminder
    ? t("nextReminder", {
        reminder: nextTitleKey
          ? t(nextTitleKey)
          : nextReminder.reminder.title,
        time: formatReminderTime(nextReminder.reminder.time, language),
      })
    : t("noUpcomingReminder");

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      async function loadPlan() {
        try {
          const patient = await getPatient();

          if (!patient) {
            throw new Error("No patient profile is saved on this device.");
          }

          const [reminders, logs] = await Promise.all([
            getReminders(),
            getReminderLogs(),
          ]);
          const todayPlan = getTodayReminderPlan(
            reminders.filter((reminder) => reminder.patientId === patient.id),
            logs.filter((log) => log.patientId === patient.id),
          );

          if (isMounted) {
            setPlan(todayPlan);
            setError(null);
            setIsLoading(false);
          }
        } catch {
          if (isMounted) {
            setError(t("reminderLoadError"));
            setIsLoading(false);
          }
        }
      }

      setPlan([]);
      setIsLoading(true);
      void loadPlan();

      return () => {
        isMounted = false;
      };
    }, [t]),
  );

  return (
    <ScreenContainer showTopBar speakText={speechText}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <AppText variant="title" accessibilityRole="header">
          {t("dayTitle")}
        </AppText>
        {isLoading ? (
          <AppText>{t("reminderLoading")}</AppText>
        ) : error ? (
          <AppText accessibilityRole="alert">{error}</AppText>
        ) : plan.length === 0 ? (
          <AppText>{t("noRemindersToday")}</AppText>
        ) : (
          plan.map((item) => (
            <ReminderRow
              key={item.reminder.id}
              reminder={item.reminder}
              status={item.status}
            />
          ))
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    gap: spacing.medium,
    paddingBottom: spacing.large,
  },
});
