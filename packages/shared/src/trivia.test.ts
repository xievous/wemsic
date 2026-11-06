import { describe, expect, it } from 'vitest';
import {
  cleanAlbumTitle,
  matchPlayerName,
  parseYearGuess,
  triviaTextMatches,
  yearGuessCredit,
} from './trivia.js';

const song = { title: 'Dreams (2004 Remaster)', artists: ['Fleetwood Mac'], album: 'Rumours' };

describe('trivia answers', () => {
  it('reads a typed year', () => {
    expect(parseYearGuess(' 1977 ')).toBe(1977);
    expect(parseYearGuess("'1977")).toBe(1977);
    expect(parseYearGuess('77')).toBeNull();
    expect(parseYearGuess('the seventies')).toBeNull();
  });

  it('gives part of the points for a near year', () => {
    expect(yearGuessCredit(1977, 1977)).toBe(1);
    expect(yearGuessCredit(1977, 1978)).toBe(0.5);
    expect(yearGuessCredit(1977, 1975)).toBe(0.25);
    expect(yearGuessCredit(1977, 1980)).toBe(0);
  });

  it('matches the title, the artist and the album', () => {
    expect(triviaTextMatches('title', song, 'dreams', 'normal')).toBe(true);
    expect(triviaTextMatches('title', song, 'fleetwood mac', 'normal')).toBe(false);
    expect(triviaTextMatches('artist', song, 'fleetwood mac', 'normal')).toBe(true);
    expect(triviaTextMatches('album', song, 'rumors', 'normal')).toBe(true);
    expect(triviaTextMatches('album', song, 'tusk', 'normal')).toBe(false);
  });

  it('drops edition tags from album titles', () => {
    expect(cleanAlbumTitle('Rumours (Super Deluxe)')).toBe('Rumours');
    expect(cleanAlbumTitle('A Night At The Opera - 2011 Remaster')).toBe('A Night At The Opera');
    expect(cleanAlbumTitle('The Life of a Showgirl + “A Look Behind the Curtain”')).toBe('The Life of a Showgirl');
  });

  it('finds the player a typed name means', () => {
    const players = [{ displayName: 'Sam' }, { displayName: 'Zoë Ann' }];
    expect(matchPlayerName(players, ' sam ')).toBe(players[0]);
    expect(matchPlayerName(players, 'zoe  ann')).toBe(players[1]);
    expect(matchPlayerName(players, 'Alex')).toBeNull();
  });
});
