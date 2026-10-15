import * as Haptics from "expo-haptics";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
} from "react-native";
import {
  borderWidths,
  colors,
  fontSizes,
  minTouch,
  radii,
  spacing,
} from "../theme";

export type BigButtonVariant =
  | "primary"
  | "warm"
  | "help"
  | "success"
  | "outline";

type BigButtonProps = {
  label: string;
  icon: string;
  variant?: BigButtonVariant;
  onPress: (event: GestureResponderEvent) => void;
};

export function BigButton({
  label,
  icon,
  variant = "primary",
  onPress,
}: BigButtonProps) {
  function handlePress(event: GestureResponderEvent) {
    void Haptics.selectionAsync().catch(() => {});
    onPress(event);
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.contents}>
        <Text style={[styles.icon, styles[`${variant}Text`]]}>{icon}</Text>
        <Text style={[styles.label, styles[`${variant}Text`]]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: "100%",
    minHeight: minTouch.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.medium,
    paddingVertical: spacing.small,
    borderWidth: borderWidths.control,
    borderRadius: radii.card,
  },
  contents: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.medium,
  },
  icon: {
    fontSize: fontSizes.button,
  },
  label: {
    fontSize: fontSizes.button,
    lineHeight: fontSizes.button + spacing.small,
    fontWeight: "700",
    textAlign: "center",
    flexShrink: 1,
  },
  primary: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  warm: {
    backgroundColor: colors.cream,
    borderColor: colors.gold,
  },
  help: {
    backgroundColor: colors.cream,
    borderColor: colors.help,
  },
  success: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  outline: {
    backgroundColor: colors.cream,
    borderColor: colors.teal,
  },
  primaryText: {
    color: colors.white,
  },
  warmText: {
    color: colors.text,
  },
  helpText: {
    color: colors.text,
  },
  successText: {
    color: colors.white,
  },
  outlineText: {
    color: colors.text,
  },
  pressed: {
    opacity: 0.82,
  },
});
