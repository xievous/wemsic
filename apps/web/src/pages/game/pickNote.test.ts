import { describe, expect, it } from 'vitest';
import { missedPickNote } from './pickNote';

const pick = { id: 'b', label: 'As It Was' };

describe('missedPickNote', () => {
  it('names a wrong pick', () => {
    expect(missedPickNote('speed_choice', pick, 0)).toBe('You picked “As It Was”');
  });

  it('says when nothing was picked', () => {
    expect(missedPickNote('speed_choice', null, 0)).toBe("You didn't pick in time");
  });

  it('has nothing to add when the pick scored', () => {
    expect(missedPickNote('speed_choice', pick, 640)).toBeNull();
  });

  it('stays out of typing rounds', () => {
    expect(missedPickNote('typing', null, 0)).toBeNull();
  });
});
