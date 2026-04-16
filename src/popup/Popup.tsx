import { useEffect, useState } from 'react';
import type { Settings } from '../types';
import { I18nProvider, useTranslation, type Locale } from '../i18n';

const DEFAULT_SETTINGS: Settings = { domain: '', enabled: true };

function PopupContent() {
  const { t, locale, setLocale } = useTranslation();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (data) => {
      setSettings(data as Settings);
    });
  }, []);

  function save() {
    chrome.storage.sync.set(settings, () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    });
  }

  return (
    <div className="bg-gray-900 text-gray-100 min-h-screen p-4 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded bg-blue-500 flex items-center justify-center text-xs font-bold">
          IC
        </div>
        <h1 className="text-sm font-semibold">GitHub Image Compare</h1>
      </div>

      <hr className="border-gray-700" />

      {/* Enable toggle */}
      <label className="flex items-center justify-between cursor-pointer">
        <span className="text-sm text-gray-300">{t.popup.enableExtension}</span>
        <button
          onClick={() => setSettings((s) => ({ ...s, enabled: !s.enabled }))}
          className={`relative w-10 h-5 rounded-full transition-colors ${
            settings.enabled ? 'bg-blue-500' : 'bg-gray-600'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
              settings.enabled ? 'translate-x-5' : ''
            }`}
          />
        </button>
      </label>

      {/* Domain input */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-400">{t.popup.enterpriseDomain}</label>
        <input
          type="text"
          value={settings.domain}
          onChange={(e) => setSettings((s) => ({ ...s, domain: e.target.value }))}
          placeholder="github.example.com"
          className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100
                     focus:outline-none focus:border-blue-500 placeholder:text-gray-600"
        />
        <p className="text-xs text-gray-500">{t.popup.domainHint}</p>
      </div>

      {/* Language selector */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">{t.popup.language}</span>
        <div className="flex rounded overflow-hidden border border-gray-700 text-xs">
          {(['en', 'ko'] as Locale[]).map((l) => (
            <button
              key={l}
              onClick={() => setLocale(l)}
              className={`px-2.5 py-1 transition-colors ${
                locale === l
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:bg-gray-700'
              }`}
            >
              {l === 'en' ? 'EN' : '한국어'}
            </button>
          ))}
        </div>
      </div>

      {/* Save button */}
      <button
        onClick={save}
        className="mt-auto bg-blue-600 hover:bg-blue-500 text-white text-sm py-1.5 rounded transition-colors"
      >
        {saved ? t.popup.saved : t.popup.save}
      </button>

      {/* Footer */}
      <p className="text-center text-xs text-gray-600">{t.popup.footer}</p>
    </div>
  );
}

export default function Popup() {
  return (
    <I18nProvider>
      <PopupContent />
    </I18nProvider>
  );
}
