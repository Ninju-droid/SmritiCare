import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { router } from "expo-router";
import { AppText } from "../components/AppText";
import { BigButton } from "../components/BigButton";
import { ScreenContainer } from "../components/ScreenContainer";
import { createAlert, getPatient } from "../data/repo";
import { useLanguage } from "../i18n";
import { useSpeak } from "../hooks/useSpeak";
import { colors, fontSizes, minTouch, radii, spacing } from "../theme";

export default function HelpScreen() {
  const { t } = useLanguage();
  const { speak } = useSpeak();
  const [caregiverName, setCaregiverName] = useState("");
  const [alertFailed, setAlertFailed] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  const hasStarted = useRef(false);
  const hasSpoken = useRef(false);
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let isMounted = true;

    async function tellCaregiver() {
      if (hasStarted.current) return;
      hasStarted.current = true;

      try {
        const patient = await getPatient();
        if (!patient) {
          throw new Error("No patient profile is saved on this device.");
        }
        if (isMounted) setCaregiverName(patient.caregiverName);

        try {
          // TODO: Send the caregiver a real SMS or push alert after backend linking.
          await createAlert(patient.id, "confused", t("helpAlertMessage"));
        } catch {
          if (isMounted) setAlertFailed(true);
        }
      } catch {
        if (isMounted) setLoadFailed(true);
      }
    }

    void tellCaregiver();

    return () => {
      isMounted = false;
    };
  }, [t]);

  useEffect(() => {
    let isMounted = true;

    void AccessibilityInfo.isReduceMotionEnabled()
      .then((isEnabled) => {
        if (isMounted) setReduceMotion(isEnabled);
      })
      .catch(() => {
        if (isMounted) setReduceMotion(true);
      });

    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion !== false) {
      scale.setValue(1);
      return;
    }

    const breathing = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.06,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        }),
      ]),
    );
    breathing.start();

    return () => breathing.stop();
  }, [reduceMotion, scale]);

  const title = loadFailed ? t("helpLoadError") : t("helpTitle");
  const message = loadFailed
    ? t("helpAskNearby")
    : alertFailed
      ? t("helpAlertError")
      : t("helpDescription", {
          caregiverName: caregiverName || t("caregiverNameFallback"),
        });

  useEffect(() => {
    if (hasSpoken.current) return;
    if (!caregiverName && !loadFailed) return;
    hasSpoken.current = true;

    const spokenMessage = loadFailed
      ? `${title}. ${message}`
      : `${t("helpTitle")}. ${alertFailed ? t("helpAlertError") : t("helpDescription", { caregiverName })}`;

    // TODO: Play a soothing recorded audio message here when audio assets are added.
    void speak(spokenMessage)
      .catch(() => {});
  }, [alertFailed, caregiverName, loadFailed, message, speak, t, title]);

  return (
    <ScreenContainer
      showTopBar
      speakText={`${title}. ${message}`}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[styles.breathingCircle, { transform: [{ scale }] }]}
        >
          <View style={styles.innerCircle}>
            <AppText style={styles.heart}>♥</AppText>
          </View>
        </Animated.View>
        <AppText
          accessibilityRole="header"
          style={styles.title}
          variant="title"
        >
          {title}
        </AppText>
        <AppText style={styles.message}>{message}</AppText>
        <View style={styles.button}>
          <BigButton
            icon="✓"
            label={t("helpOk")}
            onPress={() => router.replace("/")}
          />
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
    paddingVertical: spacing.large,
  },
  breathingCircle: {
    width: 184,
    height: 184,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.round,
    backgroundColor: colors.softTeal,
  },
  innerCircle: {
    width: 140,
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.round,
    backgroundColor: colors.teal,
  },
  heart: {
    color: colors.white,
    fontSize: fontSizes.helpHeart,
    lineHeight: fontSizes.helpHeart + spacing.small,
  },
  title: {
    color: colors.teal,
    textAlign: "center",
  },
  message: {
    maxWidth: 520,
    fontSize: fontSizes.body,
    lineHeight: fontSizes.body + fontSizes.lineSpacing,
    textAlign: "center",
  },
  button: {
    width: "100%",
    maxWidth: 520,
    marginTop: spacing.medium,
    minHeight: minTouch.primary,
  },
});
