import { useCallback, useEffect } from "react";
import * as Speech from "expo-speech";
import { useLanguage } from "../i18n";
import { getSpeechLanguage } from "./speechLanguage";

export function useSpeak() {
  const { language } = useLanguage();

  const speak = useCallback(
    async (text: string) => {
      await Speech.stop();

      let voices: Awaited<ReturnType<typeof Speech.getAvailableVoicesAsync>> =
        [];
      try {
        voices = await Speech.getAvailableVoicesAsync();
      } catch {}

      Speech.speak(text, {
        language: getSpeechLanguage(language, voices),
        rate: 0.85,
      });
    },
    [language],
  );

  useEffect(
    () => () => {
      void Speech.stop().catch(() => {});
    },
    [],
  );

  return { speak };
}
