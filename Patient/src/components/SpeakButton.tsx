import { Pressable, StyleSheet, Text } from "react-native";
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

type SpeakButtonProps = {
  text: string;
};

export function SpeakButton({ text }: SpeakButtonProps) {
  const { t } = useLanguage();
  const { speak } = useSpeak();
  const label = t("listen");

  function speakText() {
    void speak(text).catch(() => {});
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("listenToText")}
      onPress={speakText}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.label}>🔊 {label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: minTouch.control,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.medium,
    borderWidth: borderWidths.control,
    borderColor: colors.teal,
    borderRadius: radii.control,
    backgroundColor: colors.cream,
  },
  label: {
    color: colors.text,
    fontSize: fontSizes.control,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.82,
  },
});
