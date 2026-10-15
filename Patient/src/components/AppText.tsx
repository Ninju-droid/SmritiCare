import { StyleSheet, Text, type TextProps } from "react-native";
import { colors, fontSizes } from "../theme";

type AppTextProps = TextProps & {
  variant?: "body" | "title" | "hero";
};

export function AppText({
  style,
  variant = "body",
  ...props
}: AppTextProps) {
  return <Text {...props} style={[styles.text, styles[variant], style]} />;
}

const styles = StyleSheet.create({
  text: {
    color: colors.text,
  },
  body: {
    fontSize: fontSizes.body,
    lineHeight: fontSizes.body + fontSizes.lineSpacing,
  },
  title: {
    fontSize: fontSizes.title,
    lineHeight: fontSizes.title + fontSizes.lineSpacing,
    fontWeight: "700",
  },
  hero: {
    fontSize: fontSizes.hero,
    lineHeight: fontSizes.hero + fontSizes.lineSpacing,
    fontWeight: "700",
  },
});
