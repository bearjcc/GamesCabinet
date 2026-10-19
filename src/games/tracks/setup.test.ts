import { describe, expect, it } from 'vitest';
import { DEFAULT_TRACKS_SETUP, parseTracksSetup, tracksPlayQuery } from './setup';

describe('tracks setup', () => {
  it('defaults to 2023 discard and junction 2', () => {
    expect(parseTracksSetup(null, null)).toEqual(DEFAULT_TRACKS_SETUP);
  });

  it('parses launch query variants', () => {
    expect(parseTracksSetup('2021', '1')).toEqual({
      discardDrawRule: '2021',
      junctionPoints: 1,
    });
    expect(tracksPlayQuery(DEFAULT_TRACKS_SETUP, 2)).toBe('?seats=2');
    expect(tracksPlayQuery({ discardDrawRule: '2021', junctionPoints: 2 }, 2)).toBe(
      '?seats=2&discard=2021',
    );
    expect(tracksPlayQuery({ discardDrawRule: '2023', junctionPoints: 1 }, 2)).toBe(
      '?seats=2&junction=1',
    );
    expect(tracksPlayQuery({ discardDrawRule: '2021', junctionPoints: 1 }, 3)).toBe(
      '?seats=3&discard=2021&junction=1',
    );
  });
});
