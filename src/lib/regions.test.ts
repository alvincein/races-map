import { describe, it, expect } from 'vitest';
import { getRegionLabel } from './regions';

describe('getRegionLabel', () => {
  it('translates known English region keys into Greek', () => {
    expect(getRegionLabel('Attiki')).toBe('Αττική');
    expect(getRegionLabel('Peloponnisos')).toBe('Πελοπόννησος');
    expect(getRegionLabel('Kentriki Makedonia')).toBe('Κεντρική Μακεδονία');
    expect(getRegionLabel('Anatoliki Makedonia kai Thraki')).toBe('Ανατολική Μακεδονία & Θράκη');
  });

  it('translates alternative English names into Greek', () => {
    expect(getRegionLabel('Attica')).toBe('Αττική');
    expect(getRegionLabel('Peloponnese')).toBe('Πελοπόννησος');
    expect(getRegionLabel('Crete')).toBe('Κρήτη');
  });

  it('falls back to raw string if unknown', () => {
    expect(getRegionLabel('Unknown Region')).toBe('Unknown Region');
  });

  it('handles empty or null values', () => {
    expect(getRegionLabel(null)).toBe('');
    expect(getRegionLabel(undefined)).toBe('');
    expect(getRegionLabel('')).toBe('');
  });
});
