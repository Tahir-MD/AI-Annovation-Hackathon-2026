import React, { createContext, useContext, useEffect, useState } from "react";
import { translations, LANGUAGES } from "./translations.js";

const I18nContext = createContext({ language: "en", setLanguage: () => {}, t: (k) => k });

export function I18nProvider({ children }) {
  const [language, setLanguageState] = useState(() => localStorage.getItem("lifeflow_lang") || "en");

  useEffect(() => {
    localStorage.setItem("lifeflow_lang", language);
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ur" ? "rtl" : "ltr";
  }, [language]);

  const t = (key) => (translations[language] && translations[language][key]) || translations.en[key] || key;
  return <I18nContext.Provider value={{ language, setLanguage: setLanguageState, t, LANGUAGES }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
