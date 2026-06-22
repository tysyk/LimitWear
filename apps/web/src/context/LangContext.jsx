import { createContext, useContext, useState } from 'react';
import { translations } from '../translations';

const LangContext = createContext(null);

export const LangProvider = ({ children }) => {
  const [lang, setLang] = useState(localStorage.getItem('lw_lang') || 'uk');

  const t = (key, vars = {}) => {
    let text = translations[lang]?.[key] ?? translations['en']?.[key] ?? key;
    Object.entries(vars).forEach(([k, v]) => { text = text.replace(`{${k}}`, v); });
    return text;
  };

  const toggleLang = () => {
    const next = lang === 'uk' ? 'en' : 'uk';
    setLang(next);
    localStorage.setItem('lw_lang', next);
  };

  return (
    <LangContext.Provider value={{ lang, t, toggleLang }}>
      {children}
    </LangContext.Provider>
  );
};

export const useLang = () => useContext(LangContext);
