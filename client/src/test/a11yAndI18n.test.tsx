import { describe, it, expect } from 'vitest';
import { getTranslation } from '../i18n/index.js';

describe('i18n & Accessibility Unit Tests', () => {
  it('should retrieve English translations correctly', () => {
    const t = getTranslation('en');
    expect(t.common.appName).toBe('CAREVERSE');
    expect(t.common.safetyNotice).toBe('Important Safety Notice');
    expect(t.medications.safetyWarning).toContain('Never double the next dose');
  });

  it('should retrieve Tamil translations correctly', () => {
    const t = getTranslation('ta');
    expect(t.common.appName).toContain('கேர்வெர்ஸ்');
    expect(t.common.safetyNotice).toContain('பாதுகாப்பு');
    expect(t.medications.safetyWarning).toContain('இரட்டிப்பு மருந்தை உட்கொள்ளாதீர்கள்');
  });

  it('should retrieve Hindi translations correctly', () => {
    const t = getTranslation('hi');
    expect(t.common.appName).toContain('केयरवर्स');
    expect(t.common.safetyNotice).toContain('सुरक्षा सूचना');
    expect(t.medications.safetyWarning).toContain('दोगुनी खुराक न लें');
  });

  it('should fallback gracefully to English for unknown language code', () => {
    const t = getTranslation('fr' as any);
    expect(t.common.appName).toBe('CAREVERSE');
  });
});
