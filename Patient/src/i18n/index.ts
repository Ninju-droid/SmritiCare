import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  useCallback,
  createContext,
  createElement,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import en from "./en";
import as from "./as";
import { reportStorageError } from "../data/storage";

export type Language = "en" | "as";
export type TranslationKey = keyof typeof en;
export type TranslationParams = Record<string, string | number>;

const languageStorageKey = "smriticare.language";
const translations = { en, as };
let activeLanguage: Language = "en";
const languageListeners = new Set<(language: Language) => void>();

function translate(
  language: Language,
  key: TranslationKey,
  params?: TranslationParams,
) {
  let text: string = translations[language][key];

  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.replaceAll(`{{${name}}}`, String(value));
    }
  }

  return text;
}

export function t(key: TranslationKey, params?: TranslationParams) {
  return translate(activeLanguage, key, params);
}

export async function setLanguage(language: Language) {
  await AsyncStorage.setItem(languageStorageKey, language);
  activeLanguage = language;

  for (const listener of languageListeners) {
    listener(language);
  }
}

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => Promise<void>;
  t: (key: TranslationKey, params?: TranslationParams) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

type LanguageProviderProps = {
  children: ReactNode;
};

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setCurrentLanguage] = useState<Language>(activeLanguage);

  const saveLanguage = useCallback(async (nextLanguage: Language) => {
    try {
      await setLanguage(nextLanguage);
      reportStorageError(false);
    } catch (error) {
      reportStorageError(true);
      throw error;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const updateLanguage = (nextLanguage: Language) => {
      if (isMounted) {
        setCurrentLanguage(nextLanguage);
      }
    };
    languageListeners.add(updateLanguage);

    async function loadLanguage() {
      try {
        const savedLanguage = await AsyncStorage.getItem(languageStorageKey);

        if (
          isMounted &&
          (savedLanguage === "en" || savedLanguage === "as")
        ) {
          activeLanguage = savedLanguage;
          updateLanguage(savedLanguage);
        }
      } catch (error) {
        if (isMounted) {
          reportStorageError(true);
        }
      }
    }

    void loadLanguage();

    return () => {
      isMounted = false;
      languageListeners.delete(updateLanguage);
    };
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage: saveLanguage,
      t: (key, params) => translate(language, key, params),
    }),
    [language, saveLanguage],
  );

  return createElement(LanguageContext.Provider, { value }, children);
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider.");
  }

  return context;
}
