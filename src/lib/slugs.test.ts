import { describe, it, expect } from 'vitest';
import { slugify, transliterateGreek, getRaceSlug } from './slugs';

describe('slugs helper library', () => {
  describe('transliterateGreek', () => {
    it('transliterates basic Greek letters to English', () => {
      expect(transliterateGreek('Όλυμπος')).toBe('olympos');
      expect(transliterateGreek('Μαραθώνιος')).toBe('marathonios');
    });

    it('handles uppercase and lowercase accented vowels', () => {
      expect(transliterateGreek('Άέήίόύώ')).toBe('aeiioyo');
    });
  });

  describe('slugify', () => {
    it('converts to lowercase, transliterates and removes non-alphanumeric characters', () => {
      expect(slugify('Olympus Marathon!')).toBe('olympus-marathon');
      expect(slugify('Μαραθώνιος Ολύμπου 2026')).toBe('marathonios-olympou-2026');
      expect(slugify('Route-50km @ Greece')).toBe('route-50km-greece');
    });

    it('collapses multiple hyphens and trims edges', () => {
      expect(slugify('---hello---world---')).toBe('hello-world');
      expect(slugify('hello - world')).toBe('hello-world');
    });
  });

  describe('getRaceSlug', () => {
    it('appends year and first 8 characters of UUID', () => {
      const race = {
        id: '1c6eda51-1b5b-414d-8a63-853c95789f94',
        event_name: 'Μαραθώνιος Ολύμπου',
        event_name_en: 'Olympus Marathon',
        dates: ['2026-06-28T00:00:00.000Z']
      };
      expect(getRaceSlug(race)).toBe('olympus-marathon-2026-1c6eda51');
    });

    it('falls back to event_name if event_name_en is missing', () => {
      const race = {
        id: '1c6eda51-1b5b-414d-8a63-853c95789f94',
        event_name: 'Μαραθώνιος Ολύμπου',
        event_name_en: null,
        dates: ['2026-06-28T00:00:00.000Z']
      };
      expect(getRaceSlug(race)).toBe('marathonios-olympou-2026-1c6eda51');
    });

    it('does not append year if dates array is empty or missing', () => {
      const race = {
        id: '1c6eda51-1b5b-414d-8a63-853c95789f94',
        event_name: 'Olympus Marathon',
        event_name_en: null,
        dates: []
      };
      expect(getRaceSlug(race)).toBe('olympus-marathon-1c6eda51');
    });
  });
});
