import { useEffect, useState } from 'react';
import type { Settings } from '../types';

const DEFAULT_SETTINGS: Settings = { domain: '', enabled: true };

export default function Popup() {
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
        <span className="text-sm text-gray-300">확장 활성화</span>
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
        <label className="text-xs text-gray-400">GitHub Enterprise 도메인</label>
        <input
          type="text"
          value={settings.domain}
          onChange={(e) => setSettings((s) => ({ ...s, domain: e.target.value }))}
          placeholder="github.example.com"
          className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100
                     focus:outline-none focus:border-blue-500 placeholder:text-gray-600"
        />
        <p className="text-xs text-gray-500">
          비워두면 모든 /issues/* 및 /pull/* 페이지에서 동작합니다.
        </p>
      </div>

      {/* Save button */}
      <button
        onClick={save}
        className="mt-auto bg-blue-600 hover:bg-blue-500 text-white text-sm py-1.5 rounded transition-colors"
      >
        {saved ? '저장됨 ✓' : '저장'}
      </button>

      {/* Footer */}
      <p className="text-center text-xs text-gray-600">
        이슈/PR 페이지의 이미지를 클릭해서 시작하세요
      </p>
    </div>
  );
}
