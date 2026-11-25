import React from 'react';
import { useA11y } from '../../context/A11yContext.js';
import { useLanguage } from '../../context/LanguageContext.js';
import { Type, Eye, Volume2, Globe } from 'lucide-react';
import { Language } from '../../i18n/index.js';

export const A11yToolbar: React.FC = () => {
  const { largeText, toggleLargeText, highContrast, toggleHighContrast, speakAnnouncement } = useA11y();
  const { language, setLanguage } = useLanguage();

  return (
    <div
      role="region"
      aria-label="Accessibility and Language Settings"
      className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 text-sm text-slate-700"
    >
      {/* Large Text Toggle */}
      <button
        onClick={() => {
          toggleLargeText();
          speakAnnouncement(largeText ? 'Standard text size activated' : 'Large text size activated');
        }}
        className={`flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold transition-colors ${
          largeText ? 'bg-teal-700 text-white shadow-sm' : 'hover:bg-slate-200 text-slate-700'
        }`}
        title="Toggle Large Text Mode (125% scaling for seniors)"
        aria-pressed={largeText}
      >
        <Type className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>Text Size</span>
      </button>

      {/* High Contrast Toggle */}
      <button
        onClick={() => {
          toggleHighContrast();
          speakAnnouncement(highContrast ? 'Standard contrast mode activated' : 'High contrast mode activated');
        }}
        className={`flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold transition-colors ${
          highContrast ? 'bg-navy-900 text-white shadow-sm' : 'hover:bg-slate-200 text-slate-700'
        }`}
        title="Toggle High Contrast Mode (WCAG 2.2 AA)"
        aria-pressed={highContrast}
      >
        <Eye className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>Contrast</span>
      </button>

      {/* Multilingual Selector */}
      <div className="col-span-2 flex items-center gap-2 rounded-lg bg-white px-3">
        <Globe className="w-3.5 h-3.5 text-slate-500" />
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as Language)}
          className="min-h-11 w-full min-w-0 cursor-pointer bg-transparent text-sm font-semibold text-slate-800"
          aria-label="Select Interface Language"
        >
          <option value="en">English</option>
          <option value="ta">தமிழ் (Tamil)</option>
          <option value="hi">हिन्दी (Hindi)</option>
        </select>
      </div>
    </div>
  );
};
