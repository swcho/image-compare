import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { translations, type Locale, type Translations } from './translations';

interface I18nContextValue {
  t: Translations;
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextValue>({
  t: translations.en,
  locale: 'en',
  setLocale: () => {},
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    chrome.storage.sync.get({ locale: 'en' }, (data) => {
      setLocaleState((data.locale as Locale) ?? 'en');
    });

    function handleChange(changes: Record<string, chrome.storage.StorageChange>) {
      if (changes.locale) {
        setLocaleState(changes.locale.newValue as Locale);
      }
    }
    chrome.storage.onChanged.addListener(handleChange);
    return () => chrome.storage.onChanged.removeListener(handleChange);
  }, []);

  function setLocale(newLocale: Locale) {
    chrome.storage.sync.set({ locale: newLocale });
    setLocaleState(newLocale);
  }

  return (
    <I18nContext.Provider value={{ t: translations[locale], locale, setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  return useContext(I18nContext);
}

export type { Locale };
