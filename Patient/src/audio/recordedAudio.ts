import type { Language, TranslationKey } from "../i18n";

type AudioCatalog = Record<
  Language,
  Partial<Record<TranslationKey, number>>
>;

const recordings: AudioCatalog = {
  // Add static asset requires for assets/audio/{lang}/{key}.mp3 here.
  en: {},
  as: {},
};

export function getRecordedAudio(
  language: Language,
  key: TranslationKey,
  catalog: AudioCatalog = recordings,
): number | null {
  return catalog[language][key] ?? catalog.en[key] ?? null;
}
