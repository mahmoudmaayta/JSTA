import { createContext, useContext, useState, useEffect, useCallback } from "react";
import enTranslations from "@/locales/en.json";
import arTranslations from "@/locales/ar.json";

type Language = "en" | "ar";
type TranslationKeys = typeof enTranslations;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  isRTL: boolean;
}

const translations: Record<Language, TranslationKeys> = {
  en: enTranslations,
  ar: arTranslations,
};

const LanguageContext = createContext<LanguageContextType | null>(null);

const LANGUAGE_KEY = "jsta_language";

function getNestedValue(obj: any, path: string): string | undefined {
  return path.split(".").reduce((current, key) => current?.[key], obj);
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(LANGUAGE_KEY);
      if (saved === "en" || saved === "ar") {
        return saved;
      }
    }
    return "en";
  });

  const isRTL = language === "ar";

  useEffect(() => {
    localStorage.setItem(LANGUAGE_KEY, language);
    
    document.documentElement.lang = language;
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
    
    if (isRTL) {
      document.body.classList.add("rtl");
    } else {
      document.body.classList.remove("rtl");
    }
  }, [language, isRTL]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      let text = getNestedValue(translations[language], key);
      
      if (text === undefined) {
        text = getNestedValue(translations.en, key);
      }
      
      if (text === undefined) {
        console.warn(`Translation missing for key: ${key}`);
        return key;
      }

      if (params) {
        Object.entries(params).forEach(([paramKey, value]) => {
          text = text!.replace(new RegExp(`{{${paramKey}}}`, "g"), String(value));
        });
      }

      return text;
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

export function useTranslation() {
  const { t, language, isRTL } = useLanguage();
  return { t, language, isRTL };
}
