import { useEffect, useRef, useState } from "react";
import * as Haptics from "expo-haptics";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppText } from "../components/AppText";
import { useLanguage } from "../i18n";
import { borderWidths, colors, fontSizes, radii, spacing } from "../theme";
import type { GameProps, GameResult, GameRound } from "./types";

const CARD_IMAGES = ["🍍", "🍵", "🥁", "🧣", "🍚", "🌼", "🥭", "🐘"];
const MISMATCH_DELAY_MS = 1200;
const CARD_HEIGHT = 90;

type MemoryCard = {
  id: number;
  image: string;
  isFaceUp: boolean;
  isMatched: boolean;
};

function getPairCount(level: number): number {
  if (level <= 2) return 2;
  if (level <= 4) return 3;
  if (level <= 6) return 4;
  if (level <= 8) return 5;
  return 6;
}

function makeCards(level: number): MemoryCard[] {
  const pairCount = getPairCount(Math.min(10, Math.max(1, Math.round(level))));
  const images = CARD_IMAGES.slice(0, pairCount);
  const cards = [...images, ...images].map((image, id) => ({
    id,
    image,
    isFaceUp: false,
    isMatched: false,
  }));

  for (let index = cards.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [cards[index], cards[swapIndex]] = [cards[swapIndex], cards[index]];
  }

  return cards;
}

export function MemoryMatch({ level, onFinish }: GameProps) {
  const { t } = useLanguage();
  const prompt = t("memoryMatchPrompt");
  const [cards, setCards] = useState(() => makeCards(level));
  const [rounds, setRounds] = useState<GameRound[]>([]);
  const [message, setMessage] = useState(prompt);
  const selectedCardIds = useRef<number[]>([]);
  const firstFlipAt = useRef<number | null>(null);
  const isBoardLocked = useRef(false);
  const hasFinished = useRef(false);
  const startedAt = useRef(Date.now());
  const mismatchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (mismatchTimeout.current !== null) {
        clearTimeout(mismatchTimeout.current);
      }
    },
    [],
  );

  function finishGame(nextRounds: GameRound[]) {
    const correctRounds = nextRounds.filter((round) => round.correct).length;
    const averageResponseMs =
      nextRounds.reduce((total, round) => total + round.responseMs, 0) /
      nextRounds.length;
    const result: GameResult = {
      accuracy: correctRounds / nextRounds.length,
      avgResponseMs: averageResponseMs,
      rounds: nextRounds,
      durationSec: Math.round((Date.now() - startedAt.current) / 1000),
    };

    hasFinished.current = true;
    onFinish(result);
  }

  function handleCardPress(card: MemoryCard) {
    if (
      isBoardLocked.current ||
      card.isFaceUp ||
      card.isMatched ||
      hasFinished.current
    ) {
      return;
    }

    setMessage(prompt);
    setCards((currentCards) =>
      currentCards.map((currentCard) =>
        currentCard.id === card.id
          ? { ...currentCard, isFaceUp: true }
          : currentCard,
      ),
    );

    if (selectedCardIds.current.length === 0) {
      selectedCardIds.current = [card.id];
      firstFlipAt.current = Date.now();
      return;
    }

    const firstCardId = selectedCardIds.current[0];
    const firstCard = cards.find((item) => item.id === firstCardId);

    if (!firstCard) {
      throw new Error("The first selected card could not be found.");
    }

    if (firstFlipAt.current === null) {
      throw new Error("The first card selection time could not be found.");
    }

    isBoardLocked.current = true;
    const responseMs = Math.max(0, Date.now() - firstFlipAt.current);
    const round: GameRound = {
      correct: firstCard.image === card.image,
      responseMs,
    };
    const nextRounds = [...rounds, round];
    setRounds(nextRounds);

    if (round.correct) {
      const nextCards = cards.map((item) =>
        item.id === firstCard.id || item.id === card.id
          ? { ...item, isFaceUp: true, isMatched: true }
          : item,
      );
      setCards(nextCards);
      selectedCardIds.current = [];
      firstFlipAt.current = null;
      isBoardLocked.current = false;

      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {});

      if (nextCards.every((item) => item.isMatched)) {
        finishGame(nextRounds);
      }

      return;
    }

    selectedCardIds.current = [firstCard.id, card.id];
    mismatchTimeout.current = setTimeout(() => {
      const idsToHide = selectedCardIds.current;
      setCards((currentCards) =>
        currentCards.map((item) =>
          idsToHide.includes(item.id) ? { ...item, isFaceUp: false } : item,
        ),
      );
      selectedCardIds.current = [];
      firstFlipAt.current = null;
      isBoardLocked.current = false;
      mismatchTimeout.current = null;
      setMessage(t("tryAgain"));
    }, MISMATCH_DELAY_MS);
  }

  const columns = getPairCount(level) >= 5 ? 3 : 2;

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <AppText variant="title" style={styles.title}>
        {t("memoryMatchTitle")}
      </AppText>
      <AppText accessibilityLiveRegion="polite" style={styles.message}>
        {message}
      </AppText>
      <View style={styles.timeStrip}>
        <AppText style={styles.timeText}>{t("takeYourTime")}</AppText>
      </View>
      <View
        accessibilityLabel={t("memoryMatchTitle")}
        style={[styles.grid, { maxWidth: 560 }]}
      >
        {cards.map((card) => {
          const isVisible = card.isFaceUp || card.isMatched;
          const cardLabel = isVisible
            ? t("visibleCard", { emoji: card.image })
            : t("hiddenCard");

          return (
            <Pressable
              key={card.id}
              accessibilityRole="button"
              accessibilityLabel={cardLabel}
              accessibilityState={{
                selected: card.isMatched,
                disabled: card.isMatched || hasFinished.current,
              }}
              disabled={card.isMatched || hasFinished.current}
              onPress={() => handleCardPress(card)}
              style={({ pressed }) => [
                styles.card,
                {
                  width: columns === 2 ? "47%" : "31%",
                },
                card.isMatched && styles.matchedCard,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.cardImage}>{isVisible ? card.image : "?"}</Text>
            </Pressable>
          );
        })}
      </View>
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
  timeStrip: {
    width: "100%",
    alignItems: "center",
    padding: spacing.small,
    borderRadius: radii.control,
    backgroundColor: colors.sand,
  },
  timeText: {
    color: colors.mutedText,
    textAlign: "center",
  },
  message: {
    minHeight: fontSizes.body + 8,
    textAlign: "center",
  },
  grid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.small,
  },
  card: {
    height: CARD_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: borderWidths.control,
    borderColor: colors.teal,
    borderRadius: radii.card,
    backgroundColor: colors.white,
  },
  matchedCard: {
    borderColor: colors.success,
    borderWidth: borderWidths.control + 1,
  },
  cardImage: {
    fontSize: fontSizes.cardImage,
  },
  pressed: {
    opacity: 0.8,
  },
});
