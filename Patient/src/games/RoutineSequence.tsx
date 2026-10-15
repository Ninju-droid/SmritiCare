import { useEffect, useRef, useState } from "react";
import * as Haptics from "expo-haptics";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppText } from "../components/AppText";
import { BigButton } from "../components/BigButton";
import { useLanguage, type TranslationKey } from "../i18n";
import {
  borderWidths,
  colors,
  fontSizes,
  minTouch,
  radii,
  spacing,
} from "../theme";
import type { GameProps, GameResult, GameRound } from "./types";

const ROUND_COUNT = 5;
const PREVIEW_DURATION_MS = 8000;

type RoutineStep = {
  emoji: string;
  label: TranslationKey;
};

type Routine = {
  title: TranslationKey;
  steps: RoutineStep[];
};

type RoutineRound = {
  routine: Routine;
  steps: RoutineStep[];
  choices: RoutineStep[];
};

type RoundStage = "showing" | "choosing" | "answer";

const ROUTINES: Routine[] = [
  {
    title: "routineTea",
    steps: [
      { emoji: "☕", label: "routineGetCup" },
      { emoji: "🫖", label: "routineAddTea" },
      { emoji: "💧", label: "routinePourWater" },
      { emoji: "🥛", label: "routineAddMilk" },
      { emoji: "🥄", label: "routineStirTea" },
      { emoji: "🙂", label: "routineEnjoyTea" },
      { emoji: "🧼", label: "routineWashCup" },
    ],
  },
  {
    title: "routineMorning",
    steps: [
      { emoji: "🛏️", label: "routineWakeUp" },
      { emoji: "🪟", label: "routineOpenCurtains" },
      { emoji: "🚿", label: "routineWashFace" },
      { emoji: "🪥", label: "routineBrushTeeth" },
      { emoji: "👕", label: "routineGetDressed" },
      { emoji: "🥣", label: "routineEatBreakfast" },
      { emoji: "💊", label: "routineTakeMedicine" },
    ],
  },
  {
    title: "routineGoingOut",
    steps: [
      { emoji: "👕", label: "routineGetDressed" },
      { emoji: "👟", label: "routinePutOnShoes" },
      { emoji: "🧥", label: "routineTakeCoat" },
      { emoji: "🔑", label: "routineTakeKeys" },
      { emoji: "📱", label: "routineTakePhone" },
      { emoji: "🚪", label: "routineLockDoor" },
      { emoji: "🚶", label: "routineGoOutside" },
    ],
  },
];

function getStepCount(level: number): number {
  if (level <= 2) return 3;
  if (level <= 4) return 4;
  if (level <= 6) return 5;
  if (level <= 8) return 6;
  return 7;
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

function makeRound(level: number): RoutineRound {
  const routine = ROUTINES[Math.floor(Math.random() * ROUTINES.length)];
  const count = getStepCount(Math.min(10, Math.max(1, Math.round(level))));
  const steps = routine.steps.slice(0, count);

  return { routine, steps, choices: shuffle(steps) };
}

export function RoutineSequence({ level, onFinish }: GameProps) {
  const { t } = useLanguage();
  const [round, setRound] = useState(() => makeRound(level));
  const [stage, setStage] = useState<RoundStage>("showing");
  const [selectedSteps, setSelectedSteps] = useState<RoutineStep[]>([]);
  const [roundResults, setRoundResults] = useState<GameRound[]>([]);
  const [feedback, setFeedback] = useState("");
  const previewEndedAt = useRef<number | null>(null);
  const sessionStartedAt = useRef(Date.now());

  useEffect(() => {
    if (stage !== "showing") return;

    const timeout = setTimeout(() => {
      previewEndedAt.current = Date.now();
      setSelectedSteps([]);
      setStage("choosing");
    }, PREVIEW_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [stage, round]);

  function chooseStep(step: RoutineStep) {
    if (stage !== "choosing") return;

    const nextSteps = [...selectedSteps, step];
    setSelectedSteps(nextSteps);

    const isCorrect = round.steps[nextSteps.length - 1]?.label === step.label;
    if (!isCorrect || nextSteps.length === round.steps.length) {
      const responseMs = Math.max(
        0,
        Date.now() - (previewEndedAt.current ?? Date.now()),
      );
      const result: GameRound = { correct: isCorrect, responseMs };
      setRoundResults((previous) => [...previous, result]);
      setFeedback(t(isCorrect ? "routineCorrect" : "routineTryAgain"));
      setStage("answer");

      if (isCorrect) {
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        ).catch(() => {});
      }
    }
  }

  function continueGame() {
    if (stage !== "answer") return;

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
        durationSec: Math.round((Date.now() - sessionStartedAt.current) / 1000),
      };

      onFinish(result);
      return;
    }

    setRound(makeRound(level));
    setSelectedSteps([]);
    setFeedback("");
    setStage("showing");
  }

  const prompt =
    stage === "showing" ? t("routineLookCarefully") : t("routineTapInOrder");

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <AppText variant="title" style={styles.title}>
        {t("routineTitle")}
      </AppText>
      <AppText accessibilityLiveRegion="polite" style={styles.prompt}>
        {prompt}
      </AppText>
      <AppText style={styles.routineName}>{t(round.routine.title)}</AppText>
      {stage === "showing" ? (
        <>
          <View style={styles.stepsList}>
            {round.steps.map((step, index) => (
              <View key={step.label} style={styles.stepCard}>
                <AppText style={styles.stepNumber}>{index + 1}.</AppText>
                <Text style={styles.stepEmoji}>{step.emoji}</Text>
                <AppText style={styles.stepLabel}>{t(step.label)}</AppText>
              </View>
            ))}
          </View>
        </>
      ) : (
        <>
          <View style={styles.stepsList}>
            {round.steps.map((step, index) => {
              const selected = selectedSteps[index];
              return (
                <View key={step.label} style={styles.orderSlot}>
                  <AppText style={styles.stepNumber}>{index + 1}.</AppText>
                  {selected ? (
                    <>
                      <Text style={styles.smallEmoji}>{selected.emoji}</Text>
                      <AppText style={styles.stepLabel}>
                        {t(selected.label)}
                      </AppText>
                    </>
                  ) : (
                    <AppText style={styles.emptySlot}>
                      {t("routineEmptyStep")}
                    </AppText>
                  )}
                </View>
              );
            })}
          </View>
          {stage === "choosing" && (
            <View style={styles.choicesGrid}>
              {round.choices.map((step) => {
                const isSelected = selectedSteps.includes(step);
                return (
                  <Pressable
                    key={step.label}
                    accessibilityRole="button"
                    accessibilityLabel={t(step.label)}
                    accessibilityState={{
                      selected: isSelected,
                      disabled: isSelected,
                    }}
                    disabled={isSelected}
                    onPress={() => chooseStep(step)}
                    style={({ pressed }) => [
                      styles.choiceCard,
                      isSelected && styles.selectedCard,
                      pressed && !isSelected && styles.pressed,
                    ]}
                  >
                    <Text style={styles.choiceEmoji}>{step.emoji}</Text>
                    <AppText style={styles.choiceLabel}>
                      {t(step.label)}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          )}
        </>
      )}
      {stage === "answer" && (
        <>
          <AppText accessibilityLiveRegion="polite" style={styles.feedback}>
            {feedback}
          </AppText>
          {!roundResults[roundResults.length - 1]?.correct && (
            <View style={styles.stepsList}>
              {round.steps.map((step, index) => (
                <View key={step.label} style={styles.stepCard}>
                  <AppText style={styles.stepNumber}>{index + 1}.</AppText>
                  <Text style={styles.smallEmoji}>{step.emoji}</Text>
                  <AppText style={styles.stepLabel}>{t(step.label)}</AppText>
                </View>
              ))}
            </View>
          )}
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
  routineName: {
    textAlign: "center",
    fontWeight: "700",
  },
  stepsList: {
    width: "100%",
    gap: spacing.small,
  },
  stepCard: {
    minHeight: minTouch.control,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.small,
    paddingHorizontal: spacing.medium,
    borderWidth: borderWidths.control,
    borderColor: colors.teal,
    borderRadius: radii.control,
    backgroundColor: colors.white,
  },
  orderSlot: {
    minHeight: minTouch.control,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.small,
    paddingHorizontal: spacing.medium,
    borderWidth: borderWidths.control,
    borderColor: colors.gold,
    borderRadius: radii.control,
    backgroundColor: colors.white,
  },
  stepNumber: {
    width: 28,
    color: colors.mutedText,
    fontWeight: "700",
  },
  stepEmoji: {
    fontSize: fontSizes.button,
  },
  smallEmoji: {
    fontSize: fontSizes.body,
  },
  stepLabel: {
    flex: 1,
  },
  emptySlot: {
    color: colors.mutedText,
  },
  choicesGrid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.small,
  },
  choiceCard: {
    width: "48%",
    minHeight: minTouch.primary,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.small,
    padding: spacing.small,
    borderWidth: borderWidths.control,
    borderColor: colors.teal,
    borderRadius: radii.card,
    backgroundColor: colors.white,
  },
  selectedCard: {
    opacity: 0.4,
  },
  choiceEmoji: {
    fontSize: fontSizes.button,
  },
  choiceLabel: {
    textAlign: "center",
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
