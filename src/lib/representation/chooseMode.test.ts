import { describe, expect, it } from 'vitest';
import {
  chooseRepresentationMode,
  DASHBOARD_ITEM_MIN,
  LIST_ITEM_MIN,
  NARROW_VIEWPORT_MAX,
  PHYSICAL_ITEM_MAX,
} from './chooseMode';

const WIDE = NARROW_VIEWPORT_MAX;
const NARROW = NARROW_VIEWPORT_MAX - 1;

describe('chooseRepresentationMode', () => {
  it('documents Mum-simple thresholds', () => {
    expect(NARROW_VIEWPORT_MAX).toBe(640);
    expect(PHYSICAL_ITEM_MAX).toBe(8);
    expect(DASHBOARD_ITEM_MIN).toBe(8);
    expect(LIST_ITEM_MIN).toBe(14);
  });

  it('uses detail when context is inspect', () => {
    expect(
      chooseRepresentationMode({ viewportWidth: NARROW, itemCount: 3, context: 'inspect' }),
    ).toBe('detail');
    expect(
      chooseRepresentationMode({ viewportWidth: WIDE, itemCount: 40, context: 'inspect' }),
    ).toBe('detail');
  });

  it('uses compact when context is closed', () => {
    expect(chooseRepresentationMode({ viewportWidth: WIDE, itemCount: 5, context: 'closed' })).toBe(
      'compact',
    );
  });

  it('uses compact when context is peek', () => {
    expect(chooseRepresentationMode({ viewportWidth: WIDE, itemCount: 12, context: 'peek' })).toBe(
      'compact',
    );
  });

  it('defaults context to choose', () => {
    expect(chooseRepresentationMode({ viewportWidth: WIDE, itemCount: 3 })).toBe('physical');
  });

  it('uses list for large choose counts', () => {
    expect(
      chooseRepresentationMode({
        viewportWidth: WIDE,
        itemCount: LIST_ITEM_MIN,
        context: 'choose',
      }),
    ).toBe('list');
    expect(
      chooseRepresentationMode({
        viewportWidth: NARROW,
        itemCount: 25,
        context: 'choose',
      }),
    ).toBe('list');
  });

  it('uses dashboard for medium-large choose counts on wide viewports', () => {
    expect(
      chooseRepresentationMode({
        viewportWidth: WIDE,
        itemCount: DASHBOARD_ITEM_MIN,
        context: 'choose',
      }),
    ).toBe('dashboard');
    expect(
      chooseRepresentationMode({
        viewportWidth: WIDE,
        itemCount: LIST_ITEM_MIN - 1,
        context: 'choose',
      }),
    ).toBe('dashboard');
  });

  it('uses compact instead of dashboard on narrow viewports', () => {
    expect(
      chooseRepresentationMode({
        viewportWidth: NARROW,
        itemCount: DASHBOARD_ITEM_MIN,
        context: 'choose',
      }),
    ).toBe('compact');
    expect(
      chooseRepresentationMode({
        viewportWidth: NARROW,
        itemCount: LIST_ITEM_MIN - 1,
        context: 'choose',
      }),
    ).toBe('compact');
  });

  it('uses physical for small choose counts', () => {
    expect(
      chooseRepresentationMode({
        viewportWidth: WIDE,
        itemCount: 0,
        context: 'choose',
      }),
    ).toBe('physical');
    expect(
      chooseRepresentationMode({
        viewportWidth: NARROW,
        itemCount: PHYSICAL_ITEM_MAX - 1,
        context: 'choose',
      }),
    ).toBe('physical');
  });
});
