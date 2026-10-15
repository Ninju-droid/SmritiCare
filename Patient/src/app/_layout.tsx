import { useEffect, useRef, useState } from "react";
import {
  Stack,
  router,
  usePathname,
  useRootNavigationState,
} from "expo-router";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { LanguageProvider, useLanguage } from "../i18n";
import { useReminderScheduler } from "../hooks/useReminderScheduler";
import { getPatient } from "../data/repo";
import { subscribeToStorageErrors } from "../data/storage";
import { AppText } from "../components/AppText";
import { BigButton } from "../components/BigButton";
import { colors, spacing } from "../theme";

function ReminderScheduler() {
  useReminderScheduler();
  return null;
}

function StorageWarning() {
  const { t } = useLanguage();
  const [hasError, setHasError] = useState(false);

  useEffect(() => subscribeToStorageErrors(setHasError), []);

  if (!hasError) {
    return null;
  }

  return (
    <View
      accessibilityRole="alert"
      pointerEvents="none"
      style={styles.storageWarning}
    >
      <AppText style={styles.startupMessage}>{t("storageWarning")}</AppText>
    </View>
  );
}

function StartupGate() {
  const { setLanguage, t } = useLanguage();
  const pathname = usePathname();
  const rootNavigationState = useRootNavigationState();
  const hasChecked = useRef(false);
  const [attempt, setAttempt] = useState(0);
  const [isChecking, setIsChecking] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!rootNavigationState?.key || hasChecked.current) {
      return;
    }

    hasChecked.current = true;
    let isMounted = true;

    async function checkPatient() {
      setIsChecking(true);
      setHasError(false);

      try {
        const patient = await getPatient();

        if (!isMounted) {
          return;
        }

        if (patient) {
          await setLanguage(patient.language);
          if (pathname === "/link") {
            router.replace("/");
          }
        } else if (pathname !== "/link") {
          router.replace("/link");
        }

        if (isMounted) {
          setIsChecking(false);
        }
      } catch {
        if (isMounted) {
          setHasError(true);
          setIsChecking(false);
        }
      }
    }

    void checkPatient();

    return () => {
      isMounted = false;
    };
  }, [attempt, pathname, rootNavigationState?.key, setLanguage]);

  function retryStartup() {
    hasChecked.current = false;
    setAttempt((current) => current + 1);
  }

  return (
    <View style={styles.root}>
      <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
        <Stack.Screen
          name="alarm"
          options={{ presentation: "fullScreenModal" }}
        />
      </Stack>
      {isChecking || hasError ? (
        <View style={styles.overlay}>
          <AppText
            accessibilityRole={hasError ? "alert" : undefined}
            style={styles.startupMessage}
          >
            {hasError ? t("startupError") : t("startupLoading")}
          </AppText>
          {hasError && (
            <BigButton
              icon="↻"
              label={t("startupRetry")}
              onPress={retryStartup}
            />
          )}
        </View>
      ) : null}
    </View>
  );
}

export default function RootLayout() {
  return (
    <LanguageProvider>
      <SafeAreaProvider>
        <ReminderScheduler />
        <StartupGate />
        <StorageWarning />
      </SafeAreaProvider>
    </LanguageProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.large,
    padding: spacing.large,
    backgroundColor: colors.cream,
  },
  startupMessage: {
    textAlign: "center",
  },
  storageWarning: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
    padding: spacing.medium,
    backgroundColor: colors.cream,
  },
});
