import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { HomeButton } from "./HomeButton";
import { SpeakButton } from "./SpeakButton";
import { colors, spacing } from "../theme";

type ScreenContainerProps = {
  children: React.ReactNode;
  showTopBar?: boolean;
  speakText?: string;
  style?: StyleProp<ViewStyle>;
};

export function ScreenContainer({
  children,
  showTopBar = false,
  speakText,
  style,
}: ScreenContainerProps) {
  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      {showTopBar && (
        <View style={styles.topBar}>
          <HomeButton />
          {speakText !== undefined && <SpeakButton text={speakText} />}
        </View>
      )}
      <View style={[styles.content, style]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.small,
    paddingHorizontal: spacing.medium,
    paddingTop: spacing.small,
  },
  content: {
    flex: 1,
    padding: spacing.medium,
  },
});
