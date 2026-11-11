import { describe, expect, it } from 'vitest';
import { shortBoard } from './shortBoard';

const players = (n: number) => Array.from({ length: n }, (_, i) => ({ playerId: `p${i + 1}` }));
const positions = (rows: { position: number }[]) => rows.map((r) => r.position);

describe('shortBoard', () => {
  it('shows everyone in a small room', () => {
    const b = shortBoard(players(8), 'p8', { compact: false });
    expect(positions(b.top)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(b).toMatchObject({ mine: null, more: 0 });
  });

  it('shows the top five, then your place, then how many are left out', () => {
    const b = shortBoard(players(20), 'p13', { compact: true });
    expect(positions(b.top)).toEqual([1, 2, 3, 4, 5]);
    expect(b.mine).toEqual({ entry: { playerId: 'p13' }, position: 13 });
    expect(b.more).toBe(14);
  });

  it("doesn't repeat you when you're already in the top five", () => {
    const b = shortBoard(players(20), 'p2', { compact: true });
    expect(b).toMatchObject({ mine: null, more: 15 });
  });

  it('counts from a later position, for a list under the winner card', () => {
    const b = shortBoard(players(19), 'p19', { compact: true, show: 4, firstPosition: 2 });
    expect(positions(b.top)).toEqual([2, 3, 4, 5]);
    expect(b.mine?.position).toBe(20);
    expect(b.more).toBe(14);
  });

  it('works for someone not on the board, like the big screen', () => {
    expect(shortBoard(players(20), null, { compact: true })).toMatchObject({ mine: null, more: 15 });
  });
});
