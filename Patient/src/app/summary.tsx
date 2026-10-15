import { useMemo } from "react";
import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { AppText } from "../components/AppText";
import { BigButton } from "../components/BigButton";
import { ScreenContainer } from "../components/ScreenContainer";
import { fontSizes } from "../theme";
import { useLanguage } from "../i18n";

export default function SummaryScreen() {
  const { t } = useLanguage();
  const messageKeys = [
    "summaryMessageOne",
    "summaryMessageTwo",
    "summaryMessageThree",
  ] as const;
  const message = useMemo(
    () => t(messageKeys[Math.floor(Math.random() * messageKeys.length)]),
    [t],
  );

  return (
    <ScreenContainer showTopBar speakText={message}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityLabel={t("flower")} style={styles.flower}>
          🌸
        </Text>
        <AppText variant="title" accessibilityRole="header" style={styles.message}>
          {message}
        </AppText>
        <View style={styles.buttons}>
          <BigButton
            label={t("playAnother")}
            icon="🎮"
            onPress={() => router.replace("/play")}
          />
          <BigButton
            label={t("home")}
            icon="⌂"
            variant="outline"
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
    gap: 24,
  },
  flower: {
    fontSize: fontSizes.summaryIcon,
  },
  message: {
    textAlign: "center",
  },
  buttons: {
    width: "100%",
    gap: 16,
  },
});
