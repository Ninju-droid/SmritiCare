import { useEffect, useRef, useState } from "react";
import * as Haptics from "expo-haptics";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppText } from "../components/AppText";
import { BigButton } from "../components/BigButton";
import { useLanguage } from "../i18n";
import {
  borderWidths,
  colors,
  fontSizes,
  minTouch,
  radii,
  spacing,
} from "../theme";
import type { GameProps, GameResult, GameRound } from "./types";

const OBJECTS = ["🍍", "🍵", "🥁", "🧣", "🍚", "🌼", "🥭", "🐘"];
const ROUND_COUNT = 5;

type DisappearedRound = {
  items: string[];
  missingItem: string;
};

type RoundStage = "showing" | "choosing" | "answer";

function getItemCount(level: number): number {
  if (level <= 2) return 3;
  if (level <= 4) return 4;
  if (level <= 6) return 5;
  if (level <= 8) return 6;
  return 7;
}

function getDisplaySeconds(level: number): number {
  const safeLevel = Math.min(10, Math.max(1, Math.round(level)));
  return Math.round(6 - ((safeLevel - 1) * 3) / 9);
}

function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }

  return shuffled;
}

function makeRound(level: number): DisappearedRound {
  const count = getItemCount(Math.min(10, Math.max(1, Math.round(level))));
  const items = shuffle(OBJECTS).slice(0, count);
  const missingIndex = Math.floor(Math.random() * items.length);

  return {
    items,
    missingItem: items[missingIndex],
  };
}

export function WhatDisappeared({ level, onFinish }: GameProps) {
  const { t } = useLanguage();
  const displaySeconds = getDisplaySeconds(level);
  const [round, setRound] = useState(() => makeRound(level));
  const [stage, setStage] = useState<RoundStage>("showing");
  const [showAgainUsed, setShowAgainUsed] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [roundResults, setRoundResults] = useState<GameRound[]>([]);
  const [feedback, setFeedback] = useState("");
  const showStartedAt = useRef<number | null>(null);
  const sessionStartedAt = useRef(Date.now());
  const displayDurationMs = displaySeconds * 1000;

  useEffect(() => {
    if (stage !== "showing") {
      return;
    }

    showStartedAt.current = null;
    const timeout = setTimeout(() => {
      showStartedAt.current = Date.now();
      setStage("choosing");
    }, displayDurationMs);
    return () => clearTimeout(timeout);
  }, [displayDurationMs, stage]);

  function chooseItem(item: string) {
    if (stage !== "choosing") {
      return;
    }

    const isCorrect = item === round.missingItem;
    const responseMs = Math.max(
      0,
      Date.now() - (showStartedAt.current ?? Date.now()),
    );
    const result: GameRound = { correct: isCorrect, responseMs };

    setSelectedItem(item);
    setRoundResults((previous) => [...previous, result]);
    setFeedback(t(isCorrect ? "disappearedCorrect" : "disappearedTryAgain"));
    setStage("answer");

    if (isCorrect) {
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      ).catch(() => {});
    }
  }

  function showItemsAgain() {
    if (stage !== "choosing" || showAgainUsed) {
      return;
    }

    setShowAgainUsed(true);
    setStage("showing");
  }

  function continueGame() {
    if (stage !== "answer") {
      return;
    }

    if (roundResults.length === ROUND_COUNT) {
      const correctRounds = roundResults.filter(
        (result) => result.correct,
      ).length;
      const averageResponseMs =
        roundResults.reduce((total, result) => total + result.responseMs, 0) /
        roundResults.length;
      const result: GameResult = {
        accuracy: correctRounds / roundResults.length,
        avgResponseMs: averageResponseMs,
        rounds: roundResults,
        durationSec: Math.round(
          (Date.now() - sessionStartedAt.current) / 1000,
        ),
      };

      onFinish(result);
      return;
    }

    setRound(makeRound(level));
    setSelectedItem(null);
    setShowAgainUsed(false);
    setFeedback("");
    setStage("showing");
  }

  const prompt =
    stage === "showing" ? t("disappearedLookCarefully") : t("disappearedPrompt");
  const correctAnswerIsVisible = stage === "answer";

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <AppText variant="title" style={styles.title}>
        {t("disappearedTitle")}
      </AppText>
      <AppText accessibilityLiveRegion="polite" style={styles.prompt}>
        {prompt}
      </AppText>
      {stage === "showing" ? (
        <View style={styles.itemsGrid}>
          {round.items.map((item) => (
            <View key={item} style={styles.objectCard}>
              <Text style={styles.objectEmoji}>{item}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.choicesGrid}>
          {round.items.map((item) => {
            const isMissingItem = item === round.missingItem;
            const isSelectedItem = item === selectedItem;

            return (
              <Pressable
                key={item}
                accessibilityRole="button"
                accessibilityLabel={t("visibleCard", { emoji: item })}
                accessibilityState={{ disabled: correctAnswerIsVisible }}
                disabled={correctAnswerIsVisible}
                onPress={() => chooseItem(item)}
                style={({ pressed }) => [
                  styles.choiceCard,
                  isMissingItem && correctAnswerIsVisible && styles.answerCard,
                  isSelectedItem && !isMissingItem && styles.wrongChoiceCard,
                  pressed && stage === "choosing" && styles.pressed,
                ]}
              >
                <Text style={styles.objectEmoji}>{item}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {stage === "choosing" && !showAgainUsed && (
        <View style={styles.actionButton}>
          <BigButton
            label={t("disappearedShowAgain")}
            icon="👀"
            variant="outline"
            onPress={showItemsAgain}
          />
        </View>
      )}

      {stage === "answer" && (
        <>
          <AppText accessibilityLiveRegion="polite" style={styles.feedback}>
            {feedback}
          </AppText>
          <View style={styles.actionButton}>
            <BigButton
              label={
                roundResults.length === ROUND_COUNT
                  ? t("disappearedFinish")
                  : t("disappearedNext")
              }
              icon="➡️"
              onPress={continueGame}
            />
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: "center",
    gap: spacing.medium,
    paddingBottom: spacing.large,
  },
  title: {
    textAlign: "center",
  },
  prompt: {
    textAlign: "center",
  },
  itemsGrid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.small,
  },
  objectCard: {
    width: "30%",
    minHeight: 88,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: borderWidths.control,
    borderColor: colors.teal,
    borderRadius: radii.card,
    backgroundColor: colors.white,
  },
  choicesGrid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.small,
  },
  choiceCard: {
    width: "47%",
    minHeight: minTouch.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: borderWidths.control,
    borderColor: colors.teal,
    borderRadius: radii.card,
    backgroundColor: colors.white,
  },
  answerCard: {
    borderColor: colors.gold,
    borderWidth: borderWidths.control + 1,
  },
  wrongChoiceCard: {
    borderColor: colors.mutedText,
  },
  objectEmoji: {
    fontSize: fontSizes.cardImage,
  },
  feedback: {
    textAlign: "center",
  },
  actionButton: {
    width: "100%",
  },
  pressed: {
    opacity: 0.82,
  },
});
