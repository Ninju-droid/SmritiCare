import { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import * as Crypto from "expo-crypto";
import { AppText } from "../components/AppText";
import { BigButton } from "../components/BigButton";
import { ScreenContainer } from "../components/ScreenContainer";
import { ScrollView, StyleSheet, View } from "react-native";
import type { Game, Patient, Session, Skills } from "../data/types";
import {
  getPatient,
  getSkills,
  saveSession,
  saveSkills,
} from "../data/repo";
import type { ActivityChoice } from "../engine/difficulty";
import { nextLevel } from "../engine/difficulty";
import { updateSkill } from "../engine/skills";
import type { GameResult } from "../games/types";
import { useLanguage, type TranslationKey } from "../i18n";
import { MemoryMatch } from "../games/MemoryMatch";
import { WhatDisappeared } from "../games/WhatDisappeared";
import { RoutineSequence } from "../games/RoutineSequence";
import { colors, spacing } from "../theme";

const GAME_CHOICES: {
  game: Game;
  title: TranslationKey;
  description: TranslationKey;
  icon: string;
}[] = [
  {
    game: "memory",
    title: "memoryMatchTitle",
    description: "memoryChoiceDescription",
    icon: "🃏",
  },
  {
    game: "disappear",
    title: "disappearedTitle",
    description: "disappearedChoiceDescription",
    icon: "👀",
  },
  {
    game: "routine",
    title: "routineTitle",
    description: "routineChoiceDescription",
    icon: "👣",
  },
];

function getActivity(game: Game, skills: Skills): ActivityChoice {
  const domain: ActivityChoice["domain"] =
    game === "disappear" ? "attention" : game;

  return {
    game,
    domain,
    level: Math.min(10, Math.max(1, Math.round(skills[domain]))),
  };
}

export default function PlayScreen() {
  const { t } = useLanguage();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [skills, setSkills] = useState<Skills | null>(null);
  const [activity, setActivity] = useState<ActivityChoice | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      async function loadGame() {
        try {
          const savedPatient = await getPatient();

          if (!savedPatient) {
            router.replace("/link");
            return;
          }

          const savedSkills = await getSkills(savedPatient.id);

          if (!savedSkills) {
            throw new Error("No skill data is saved for this patient.");
          }

          if (isMounted) {
            setPatient(savedPatient);
            setSkills(savedSkills);
          }
        } catch {
          if (isMounted) {
            setError(t("gameLoadError"));
          }
        }
      }

      setError(null);
      setPatient(null);
      setSkills(null);
      setActivity(null);
      setStartedAt(null);
      void loadGame();

      return () => {
        isMounted = false;
      };
    }, [t]),
  );

  function chooseGame(game: Game) {
    if (!skills) {
      return;
    }

    setActivity(getActivity(game, skills));
    setStartedAt(new Date().toISOString());
  }

  async function finishGame(result: GameResult) {
    try {
      if (!patient || !skills || !activity || !startedAt) {
        throw new Error("The game is missing its saved patient information.");
      }

      const difficulty = nextLevel(result.rounds, activity.level);
      const performance = result.accuracy * 10 - (difficulty.fatigue ? 1 : 0);
      const updatedSkills: Skills = {
        ...skills,
        [activity.domain]: updateSkill(
          skills[activity.domain],
          performance,
        ),
        updatedAt: new Date().toISOString(),
      };
      const session: Session = {
        id: Crypto.randomUUID(),
        patientId: patient.id,
        game: activity.game,
        domain: activity.domain,
        level: activity.level,
        accuracy: result.accuracy,
        avgResponseMs: result.avgResponseMs,
        fatigue: difficulty.fatigue,
        durationSec: result.durationSec,
        startedAt,
      };

      await saveSession(session);
      await saveSkills(updatedSkills);
      router.replace("/summary");
    } catch {
      setError(t("gameSaveError"));
    }
  }

  const speakText =
    error ??
    (activity
      ? t(
          activity.game === "disappear"
            ? "disappearedPrompt"
            : activity.game === "routine"
              ? "routineTapInOrder"
              : "memoryMatchPrompt",
        )
      : t("chooseGamePrompt"));

  return (
    <ScreenContainer showTopBar speakText={speakText}>
      {error ? (
        <AppText variant="title" accessibilityRole="alert">
          {error}
        </AppText>
      ) : activity && startedAt ? (
        activity.game === "routine" ? (
          <RoutineSequence
            key={`${activity.domain}-${startedAt}`}
            level={activity.level}
            onFinish={(result) => void finishGame(result)}
          />
        ) : activity.game === "disappear" ? (
          <WhatDisappeared
            key={`${activity.domain}-${startedAt}`}
            level={activity.level}
            onFinish={(result) => void finishGame(result)}
          />
        ) : (
          <MemoryMatch
            key={`${activity.domain}-${startedAt}`}
            level={activity.level}
            onFinish={(result) => void finishGame(result)}
          />
        )
      ) : patient && skills ? (
        <ScrollView
          contentContainerStyle={styles.choices}
          showsVerticalScrollIndicator={false}
        >
          <AppText variant="title" accessibilityRole="header" style={styles.title}>
            {t("chooseGameTitle")}
          </AppText>
          <AppText style={styles.prompt}>{t("chooseGamePrompt")}</AppText>
          {GAME_CHOICES.map((choice) => (
            <View key={choice.game} style={styles.choice}>
              <BigButton
                label={t(choice.title)}
                icon={choice.icon}
                onPress={() => chooseGame(choice.game)}
              />
              <AppText style={styles.description}>
                {t(choice.description)}
              </AppText>
            </View>
          ))}
        </ScrollView>
      ) : (
        <AppText>{t("gameLoading")}</AppText>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  choices: {
    flexGrow: 1,
    justifyContent: "center",
    gap: spacing.small,
    paddingBottom: spacing.large,
  },
  title: {
    textAlign: "center",
  },
  prompt: {
    textAlign: "center",
    marginBottom: spacing.small,
  },
  choice: {
    gap: spacing.small,
  },
  description: {
    textAlign: "center",
    color: colors.mutedText,
    marginBottom: spacing.small,
  },
});
