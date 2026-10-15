import { getSpeechLanguage } from "../speechLanguage";

describe("getSpeechLanguage", () => {
  it("uses an Assamese voice when one is available", () => {
    expect(getSpeechLanguage("as", [{ language: "as-IN" }])).toBe("as-IN");
  });

  it("falls back to an available English voice", () => {
    expect(getSpeechLanguage("as", [{ language: "en-US" }])).toBe("en-US");
  });

  it("uses English when no voices are reported", () => {
    expect(getSpeechLanguage("as", [])).toBe("en-IN");
  });
});
