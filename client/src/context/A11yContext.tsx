import React, { createContext, useContext, useState, useEffect } from 'react';

interface A11yContextType {
  largeText: boolean;
  toggleLargeText: () => void;
  highContrast: boolean;
  toggleHighContrast: () => void;
  reducedMotion: boolean;
  toggleReducedMotion: () => void;
  speakAnnouncement: (text: string) => void;
}

const A11yContext = createContext<A11yContextType | undefined>(undefined);

export const A11yProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [largeText, setLargeText] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem('careverse_large_text') === 'true';
    }
    return false;
  });

  const [highContrast, setHighContrast] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem('careverse_high_contrast') === 'true';
    }
    return false;
  });

  const [reducedMotion, setReducedMotion] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem('careverse_reduced_motion') === 'true';
    }
    return false;
  });

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      if (largeText) {
        root.classList.add('large-text');
      } else {
        root.classList.remove('large-text');
      }
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('careverse_large_text', String(largeText));
    }
  }, [largeText]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      if (highContrast) {
        root.classList.add('high-contrast');
      } else {
        root.classList.remove('high-contrast');
      }
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('careverse_high_contrast', String(highContrast));
    }
  }, [highContrast]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('careverse_reduced_motion', String(reducedMotion));
    }
  }, [reducedMotion]);

  const toggleLargeText = () => setLargeText(prev => !prev);
  const toggleHighContrast = () => setHighContrast(prev => !prev);
  const toggleReducedMotion = () => setReducedMotion(prev => !prev);

  const speakAnnouncement = (text: string) => {
    if ('speechSynthesis' in window && !reducedMotion) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9; // clear, gentle rate for elderly users
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('Speech synthesis error:', err);
      }
    }
  };

  return (
    <A11yContext.Provider
      value={{
        largeText,
        toggleLargeText,
        highContrast,
        toggleHighContrast,
        reducedMotion,
        toggleReducedMotion,
        speakAnnouncement
      }}
    >
      {children}
    </A11yContext.Provider>
  );
};

export const useA11y = () => {
  const context = useContext(A11yContext);
  if (!context) {
    throw new Error('useA11y must be used within an A11yProvider');
  }
  return context;
};
