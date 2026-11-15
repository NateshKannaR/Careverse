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
      className="flex items-center gap-2 p-1 bg-slate-100 rounded-full border border-slate-200 text-xs text-slate-700"
    >
      {/* Large Text Toggle */}
      <button
        onClick={() => {
          toggleLargeText();
          speakAnnouncement(largeText ? 'Standard text size activated' : 'Large text size activated');
        }}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-medium transition-colors ${
          largeText ? 'bg-teal-700 text-white shadow-sm' : 'hover:bg-slate-200 text-slate-700'
        }`}
        title="Toggle Large Text Mode (125% scaling for seniors)"
        aria-pressed={largeText}
      >
        <Type className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Text Size</span>
      </button>

      {/* High Contrast Toggle */}
      <button
        onClick={() => {
          toggleHighContrast();
          speakAnnouncement(highContrast ? 'Standard contrast mode activated' : 'High contrast mode activated');
        }}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-medium transition-colors ${
          highContrast ? 'bg-navy-900 text-white shadow-sm' : 'hover:bg-slate-200 text-slate-700'
        }`}
        title="Toggle High Contrast Mode (WCAG 2.2 AA)"
        aria-pressed={highContrast}
      >
        <Eye className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Contrast</span>
      </button>

      {/* Multilingual Selector */}
      <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
        <Globe className="w-3.5 h-3.5 text-slate-500" />
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as Language)}
          className="bg-transparent text-xs font-semibold text-slate-800 cursor-pointer focus:outline-none"
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
