import * as Crypto from "expo-crypto";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { router } from "expo-router";
import { AppText } from "../components/AppText";
import { ScreenContainer } from "../components/ScreenContainer";
import { seedPatient } from "../data/seed";
import type { Patient } from "../data/types";
import { useLanguage, type Language } from "../i18n";
import {
  borderWidths,
  colors,
  fontSizes,
  minTouch,
  radii,
  spacing,
} from "../theme";

const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

export default function LinkScreen() {
  const { t, setLanguage } = useLanguage();
  const [code, setCode] = useState("");
  const [language, setSelectedLanguage] = useState<Language>("en");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingPatient, setPendingPatient] = useState<Patient | null>(null);

  function addDigit(digit: string) {
    setError(null);
    setCode((current) => (current.length < 6 ? `${current}${digit}` : current));
  }

  function deleteDigit() {
    setError(null);
    setCode((current) => current.slice(0, -1));
  }

  async function connectDevice() {
    if (code.length !== 6) {
      setError(t("linkCodeError"));
      return;
    }

    setIsSaving(true);
    setError(null);

    const patient = pendingPatient ?? {
      id: Crypto.randomUUID(),
      name: "Asha Das",
      age: 72,
      language,
      caregiverName: "Mina Das",
    };
    setPendingPatient(patient);

    try {
      // TODO: Replace mock code validation with POST /patients/link.
      await setLanguage(language);
      await seedPatient(patient);
      router.replace("/");
    } catch {
      setError(t("linkSaveError"));
      setIsSaving(false);
    }
  }

  return (
    <ScreenContainer
      showTopBar
      speakText={`${t("linkTitle")}. ${t("linkDescription")}`}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <AppText variant="title" accessibilityRole="header" style={styles.title}>
          {t("linkTitle")}
        </AppText>
        <AppText style={styles.description}>{t("linkDescription")}</AppText>

        <View
          accessibilityLabel={t("linkCodeLabel")}
          style={styles.codeBoxes}
        >
          {Array.from({ length: 6 }, (_, index) => (
            <View
              key={index}
              accessible
              accessibilityLabel={t("linkDigitLabel", {
                position: index + 1,
                digit: code[index] ?? t("linkEmptyDigit"),
              })}
              style={styles.codeBox}
            >
              <AppText style={styles.codeDigit}>{code[index] ?? ""}</AppText>
            </View>
          ))}
        </View>

        <View style={styles.keypad} accessibilityLabel={t("linkCodeLabel")}>
          {DIGITS.slice(0, 9).map((digit) => (
            <Pressable
              key={digit}
              accessibilityRole="button"
              accessibilityLabel={t("linkKeypadLabel", { digit })}
              accessibilityState={{ disabled: isSaving }}
              disabled={isSaving}
              onPress={() => addDigit(digit)}
              style={({ pressed }) => [
                styles.key,
                pressed && styles.pressed,
                isSaving && styles.disabled,
              ]}
            >
              <AppText style={styles.keyText}>{digit}</AppText>
            </Pressable>
          ))}
          <View style={styles.keySpacer} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("linkKeypadLabel", { digit: "0" })}
            accessibilityState={{ disabled: isSaving }}
            disabled={isSaving}
            onPress={() => addDigit("0")}
            style={({ pressed }) => [
              styles.key,
              pressed && styles.pressed,
              isSaving && styles.disabled,
            ]}
          >
            <AppText style={styles.keyText}>0</AppText>
          </Pressable>
          <View style={styles.keySpacer} />
        </View>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("linkDelete")}
            accessibilityState={{ disabled: isSaving }}
            disabled={isSaving}
            onPress={deleteDigit}
            style={({ pressed }) => [
              styles.deleteButton,
              pressed && styles.pressed,
              isSaving && styles.disabled,
            ]}
          >
            <AppText style={styles.deleteText}>{t("linkDelete")}</AppText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("linkConnect")}
            accessibilityState={{ busy: isSaving, disabled: isSaving }}
            disabled={isSaving}
            onPress={() => void connectDevice()}
            style={({ pressed }) => [
              styles.connectButton,
              pressed && styles.pressed,
              isSaving && styles.disabled,
            ]}
          >
            <AppText style={styles.connectText}>
              {isSaving ? t("reminderLoading") : t("linkConnect")}
            </AppText>
          </Pressable>
        </View>

        <AppText style={styles.languageTitle}>{t("linkSelectLanguage")}</AppText>
        <View
          accessibilityLabel={t("linkSelectLanguage")}
          accessibilityRole="radiogroup"
          style={styles.languageChoices}
        >
          {(
            [
              ["en", "languageEnglish"],
              ["as", "languageAssamese"],
            ] as const
          ).map(([value, labelKey]) => (
            <Pressable
              key={value}
              accessibilityRole="radio"
              accessibilityLabel={t(labelKey)}
              accessibilityState={{
                selected: language === value,
                disabled: isSaving,
              }}
              disabled={isSaving}
              onPress={() => setSelectedLanguage(value)}
              style={({ pressed }) => [
                styles.languageButton,
                language === value && styles.selectedLanguage,
                pressed && styles.pressed,
              ]}
            >
              <AppText
                style={[
                  styles.languageText,
                  language === value && styles.selectedLanguageText,
                ]}
              >
                {t(labelKey)}
              </AppText>
            </Pressable>
          ))}
        </View>
        {error && (
          <AppText accessibilityRole="alert" style={styles.error}>
            {error}
          </AppText>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    justifyContent: "center",
    gap: spacing.medium,
    paddingVertical: spacing.medium,
  },
  title: {
    textAlign: "center",
  },
  description: {
    textAlign: "center",
  },
  codeBoxes: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.small,
    marginVertical: spacing.small,
  },
  codeBox: {
    flex: 1,
    maxWidth: 64,
    minHeight: 68,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: borderWidths.control,
    borderColor: colors.teal,
    borderRadius: radii.control,
    backgroundColor: colors.white,
  },
  codeDigit: {
    fontSize: fontSizes.title,
    fontWeight: "700",
  },
  keypad: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.small,
  },
  key: {
    width: "30%",
    minHeight: 62,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: borderWidths.control,
    borderColor: colors.teal,
    borderRadius: radii.control,
    backgroundColor: colors.white,
  },
  keySpacer: {
    width: "30%",
    minHeight: 1,
  },
  keyText: {
    fontSize: fontSizes.title,
    fontWeight: "700",
  },
  actions: {
    flexDirection: "row",
    gap: spacing.small,
  },
  deleteButton: {
    flex: 1,
    minHeight: minTouch.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: borderWidths.control,
    borderColor: colors.gold,
    borderRadius: radii.control,
    backgroundColor: colors.cream,
  },
  deleteText: {
    fontSize: fontSizes.button,
    fontWeight: "700",
  },
  connectButton: {
    flex: 1,
    minHeight: minTouch.primary,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.control,
    backgroundColor: colors.teal,
  },
  connectText: {
    color: colors.white,
    fontSize: fontSizes.button,
    fontWeight: "700",
  },
  languageTitle: {
    marginTop: spacing.small,
    textAlign: "center",
    fontWeight: "700",
  },
  languageChoices: {
    flexDirection: "row",
    gap: spacing.small,
  },
  languageButton: {
    flex: 1,
    minHeight: minTouch.control + spacing.small,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.small,
    borderWidth: borderWidths.control,
    borderColor: colors.teal,
    borderRadius: radii.control,
    backgroundColor: colors.white,
  },
  selectedLanguage: {
    backgroundColor: colors.teal,
  },
  languageText: {
    textAlign: "center",
    fontWeight: "700",
  },
  selectedLanguageText: {
    color: colors.white,
  },
  error: {
    color: colors.text,
    textAlign: "center",
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.55,
  },
});
