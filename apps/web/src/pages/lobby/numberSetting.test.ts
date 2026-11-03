import { describe, expect, it } from 'vitest';
import { settleSetting, validSetting } from './numberSetting';

describe('validSetting', () => {
  it('accepts a whole number in range', () => {
    expect(validSetting('15', 5, 30)).toBe(15);
    expect(validSetting('5', 5, 30)).toBe(5);
    expect(validSetting('30', 5, 30)).toBe(30);
  });

  it('holds back a half-typed value instead of clamping it', () => {
    // Typing "15": the "1" on the way must not become 5.
    expect(validSetting('1', 5, 30)).toBeNull();
    expect(validSetting('', 5, 30)).toBeNull();
    expect(validSetting('300', 5, 30)).toBeNull();
  });

  it('ignores anything that is not a whole number', () => {
    expect(validSetting('12.5', 5, 30)).toBeNull();
    expect(validSetting('-10', 5, 30)).toBeNull();
    expect(validSetting('1e1', 5, 30)).toBeNull();
  });
});

describe('settleSetting', () => {
  it('clamps a finished value into range', () => {
    expect(settleSetting('1', 5, 30)).toBe(5);
    expect(settleSetting('99', 5, 30)).toBe(30);
    expect(settleSetting('20', 5, 30)).toBe(20);
  });

  it('rounds decimals', () => {
    expect(settleSetting('12.6', 5, 30)).toBe(13);
  });

  it('gives up on an empty or non-numeric field so the old value comes back', () => {
    expect(settleSetting('', 5, 30)).toBeNull();
    expect(settleSetting('  ', 5, 30)).toBeNull();
    expect(settleSetting('abc', 5, 30)).toBeNull();
  });
});
