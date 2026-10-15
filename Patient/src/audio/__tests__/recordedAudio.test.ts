import { getRecordedAudio } from "../recordedAudio";
import type { Language, TranslationKey } from "../../i18n";

describe("getRecordedAudio", () => {
  const englishAudio = 1;
  const assameseAudio = 2;
  const catalog: Record<
    Language,
    Partial<Record<TranslationKey, number>>
  > = {
    en: { helpTitle: englishAudio },
    as: { helpTitle: assameseAudio },
  };

  it("uses the requested language when its recording exists", () => {
    expect(getRecordedAudio("as", "helpTitle", catalog)).toBe(assameseAudio);
  });

  it("falls back to English when the requested recording is missing", () => {
    expect(getRecordedAudio("as", "helpOk", catalog)).toBeNull();
    expect(getRecordedAudio("as", "helpTitle", { ...catalog, as: {} })).toBe(
      englishAudio,
    );
  });

  it("returns null when neither language has a recording", () => {
    expect(getRecordedAudio("en", "helpTitle")).toBeNull();
  });
});
