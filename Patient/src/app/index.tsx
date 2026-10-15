import { useCallback, useState } from "react";
import {
  Alert,
  BackHandler,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { AppText } from "../components/AppText";
import { BigButton } from "../components/BigButton";
import { ScreenContainer } from "../components/ScreenContainer";
import { getPatient, getReminderLogs, getReminders } from "../data/repo";
import {
  formatReminderTime,
  getReminderTitleKey,
  getTodayReminderPlan,
} from "../data/reminderPlan";
import { useLanguage } from "../i18n";
import type { TranslationKey } from "../i18n";
import { colors, fontSizes, spacing } from "../theme";

const weekdays: TranslationKey[] = [
  "weekdaySunday",
  "weekdayMonday",
  "weekdayTuesday",
  "weekdayWednesday",
  "weekdayThursday",
  "weekdayFriday",
  "weekdaySaturday",
];
const months: TranslationKey[] = [
  "monthJanuary",
  "monthFebruary",
  "monthMarch",
  "monthApril",
  "monthMay",
  "monthJune",
  "monthJuly",
  "monthAugust",
  "monthSeptember",
  "monthOctober",
  "monthNovember",
  "monthDecember",
];

function formatAssameseDigits(value: number) {
  const digits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

  return String(value).replace(/\d/g, (digit) => digits[Number(digit)]);
}

export default function HomeScreen() {
  const { language, t } = useLanguage();
  const { fontScale, height } = useWindowDimensions();
  const [name, setName] = useState("");
  const [nextReminderText, setNextReminderText] = useState("");
  const [reminderError, setReminderError] = useState<string | null>(null);
  const greetingKey: TranslationKey =
    new Date().getHours() < 12
      ? "morningGreeting"
      : new Date().getHours() < 17
        ? "afternoonGreeting"
        : "eveningGreeting";
  const greeting = t(greetingKey, {
    name: name || t("friendName"),
  });
  const today = new Date();
  const date =
    language === "as"
      ? `${t(weekdays[today.getDay()])}, ${formatAssameseDigits(today.getDate())} ${t(months[today.getMonth()])}`
      : new Intl.DateTimeFormat("en-IN", {
          weekday: "long",
          month: "long",
          day: "numeric",
        }).format(today);
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      async function loadHomeData() {
        try {
          const patient = await getPatient();

          if (!patient) {
            router.replace("/link");
            return;
          }

          const [reminders, logs] = await Promise.all([
            getReminders(),
            getReminderLogs(),
          ]);
          const plan = getTodayReminderPlan(
            reminders.filter((reminder) => reminder.patientId === patient.id),
            logs.filter((log) => log.patientId === patient.id),
          );
          const next = plan.find((item) => item.status === "next");
          const titleKey = next
            ? getReminderTitleKey(next.reminder.title)
            : null;

          if (isMounted) {
            setName(patient.name);
            setNextReminderText(
              next
                ? t("nextReminder", {
                    reminder: titleKey
                      ? t(titleKey)
                      : next.reminder.title,
                    time: formatReminderTime(next.reminder.time, language),
                  })
                : t("noUpcomingReminder"),
            );
            setReminderError(null);
          }
        } catch {
          if (isMounted) {
            setReminderError(t("reminderLoadError"));
          }
        }
      }

      void loadHomeData();

      return () => {
        isMounted = false;
      };
    }, [language, t]),
  );

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "android") {
        return;
      }

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          Alert.alert(
            t("exitTitle"),
            t("exitDescription"),
            [
              { text: t("stayButton"), style: "cancel" },
              { text: t("exitButton"), onPress: () => BackHandler.exitApp() },
            ],
            { cancelable: false },
          );
          return true;
        },
      );

      return () => subscription.remove();
    }, [t]),
  );

  return (
    <ScreenContainer
      showTopBar
      speakText={`${greeting}. ${date}. ${reminderError ?? nextReminderText}`}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          height < 700 || fontScale > 1.15 ? styles.smallScreenContent : null,
        ]}
      >
        <View style={styles.introduction}>
          <AppText variant="hero" accessibilityRole="header">
            {greeting}
          </AppText>
          <AppText style={styles.date} accessibilityLabel={date}>
            {date}
          </AppText>
          <AppText>{t("chooseActivity")}</AppText>
        </View>

        <View style={styles.buttons}>
          <BigButton
            label={t("primaryButton")}
            icon="🎮"
            variant="primary"
            onPress={() => router.push("/play")}
          />
          <BigButton
            label={t("warmButton")}
            icon="📅"
            variant="warm"
            onPress={() => router.push("/day")}
          />
          <BigButton
            label={t("helpButton")}
            icon="🙋"
            variant="help"
            onPress={() => router.push("/help")}
          />
        </View>

        <View style={styles.reminder}>
          <AppText
            accessibilityLabel={reminderError ?? nextReminderText}
            accessibilityRole={reminderError ? "alert" : undefined}
          >
            {reminderError ?? nextReminderText}
          </AppText>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    justifyContent: "center",
    paddingVertical: spacing.small,
  },
  smallScreenContent: {
    justifyContent: "flex-start",
  },
  introduction: {
    gap: spacing.small,
  },
  buttons: {
    gap: spacing.small,
    marginTop: spacing.medium,
  },
  reminder: {
    marginTop: spacing.large,
    padding: spacing.medium,
    borderRadius: spacing.small,
    backgroundColor: colors.white,
  },
  date: {
    color: colors.text,
    fontSize: fontSizes.date,
    lineHeight: fontSizes.date + spacing.small,
    fontWeight: "600",
  },
});
