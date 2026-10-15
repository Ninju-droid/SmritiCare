import { router } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";
import { useLanguage } from "../i18n";
import {
  borderWidths,
  colors,
  fontSizes,
  minTouch,
  radii,
  spacing,
} from "../theme";

export function HomeButton() {
  const { t } = useLanguage();
  const label = `⌂  ${t("home")}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("home")}
      onPress={() => router.replace("/")}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: minTouch.control,
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
