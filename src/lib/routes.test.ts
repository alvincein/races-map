import { describe, it, expect } from 'vitest';
import { calculatePointGrade } from './routes';
import type { RoutePoint } from '../types/routes';

describe('calculatePointGrade', () => {
  it('returns 0 for empty or single-point profiles', () => {
    expect(calculatePointGrade([], { d: 0, e: 100, c: [0, 0] })).toBe(0);
    expect(calculatePointGrade([{ d: 0, e: 100, c: [0, 0] }], { d: 0, e: 100, c: [0, 0] })).toBe(0);
  });

  it('calculates positive grade for uphill sections', () => {
    const profile: RoutePoint[] = [
      { d: 0, e: 100, c: [0, 0] },
      { d: 50, e: 105, c: [0, 0] },
      { d: 100, e: 110, c: [0, 0] },
    ];
    // 10m gain over 100m distance = +10%
    const grade = calculatePointGrade(profile, profile[1], 50);
    expect(grade).toBe(10);
  });

  it('calculates negative grade for downhill sections', () => {
    const profile: RoutePoint[] = [
      { d: 0, e: 200, c: [0, 0] },
      { d: 50, e: 195, c: [0, 0] },
      { d: 100, e: 190, c: [0, 0] },
    ];
    // -10m loss over 100m distance = -10%
    const grade = calculatePointGrade(profile, profile[1], 50);
    expect(grade).toBe(-10);
  });

  it('calculates 0% grade for flat sections', () => {
    const profile: RoutePoint[] = [
      { d: 0, e: 150, c: [0, 0] },
      { d: 50, e: 150, c: [0, 0] },
      { d: 100, e: 150, c: [0, 0] },
    ];
    const grade = calculatePointGrade(profile, profile[1], 50);
    expect(grade).toBe(0);
  });
});
