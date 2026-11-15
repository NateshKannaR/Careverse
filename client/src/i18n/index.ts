import { en } from './en.js';
import { ta } from './ta.js';
import { hi } from './hi.js';

export type Language = 'en' | 'ta' | 'hi';

export const translations = {
  en,
  ta,
  hi
};

export const getTranslation = (lang: Language = 'en') => {
  return translations[lang] || translations.en;
};
