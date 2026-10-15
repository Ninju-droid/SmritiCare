import type { Language } from "../i18n";

type SpeechVoice = {
  language: string;
};

export function getSpeechLanguage(
  language: Language,
  voices: readonly SpeechVoice[],
) {
  const preferredPrefix = language === "as" ? "as" : "en";
  const preferredVoice = voices.find((voice) =>
    voice.language.toLowerCase().startsWith(preferredPrefix),
  );

  if (preferredVoice) {
    return preferredVoice.language;
  }

  const englishVoice = voices.find((voice) =>
    voice.language.toLowerCase().startsWith("en"),
  );

  return englishVoice?.language ?? "en-IN";
}
