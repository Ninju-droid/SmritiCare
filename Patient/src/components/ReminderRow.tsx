import { StyleSheet, View } from "react-native";
import { AppText } from "./AppText";
import type { Reminder } from "../data/types";
import type { ReminderStatus } from "../data/reminderPlan";
import { useLanguage, type TranslationKey } from "../i18n";
import {
  borderWidths,
  colors,
  fontSizes,
  minTouch,
  radii,
  spacing,
} from "../theme";
import {
  formatReminderTime,
  getReminderTitleKey,
} from "../data/reminderPlan";

type ReminderRowProps = {
  reminder: Reminder;
  status: ReminderStatus;
};

const statusCopy: Record<
  ReminderStatus,
  { icon: string; label: TranslationKey }
> = {
  done: { icon: "✓", label: "reminderDone" },
  next: { icon: "→", label: "reminderNext" },
  later: { icon: "◷", label: "reminderLater" },
};

export function ReminderRow({ reminder, status }: ReminderRowProps) {
  const { language, t } = useLanguage();
  const statusDetails = statusCopy[status];
  const titleKey = getReminderTitleKey(reminder.title);
  const title = titleKey ? t(titleKey) : reminder.title;

  return (
    <View
      style={[
        styles.row,
        status === "next" && styles.nextRow,
        status === "done" && styles.doneRow,
      ]}
    >
      <View style={styles.details}>
        <AppText style={styles.time}>
          {formatReminderTime(reminder.time, language)}
        </AppText>
        <AppText style={styles.title}>{title}</AppText>
      </View>
      <View style={styles.status}>
        <AppText style={styles.statusIcon}>{statusDetails.icon}</AppText>
        <AppText style={styles.statusLabel}>{t(statusDetails.label)}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: minTouch.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.small,
    padding: spacing.medium,
    borderWidth: borderWidths.control,
    borderColor: colors.white,
    borderRadius: radii.card,
    backgroundColor: colors.white,
  },
  nextRow: {
    borderColor: colors.gold,
  },
  doneRow: {
    opacity: 0.55,
  },
  details: {
    flex: 1,
    gap: spacing.small,
  },
  time: {
    fontSize: fontSizes.body,
    fontWeight: "700",
  },
  title: {
    fontWeight: "600",
  },
  status: {
    minWidth: 64,
    alignItems: "center",
    gap: spacing.small,
  },
  statusIcon: {
    fontSize: fontSizes.button,
    color: colors.teal,
  },
  statusLabel: {
    color: colors.mutedText,
    textAlign: "center",
  },
});
