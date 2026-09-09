// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { findSolDropTarget } from './drag';

describe('findSolDropTarget', () => {
  it('returns the nearest data-sol-drop value under the pointer', () => {
    const zone = document.createElement('div');
    zone.dataset.solDrop = 'tableau:2';
    const inner = document.createElement('span');
    zone.append(inner);
    document.body.append(zone);

    inner.getBoundingClientRect = () =>
      ({
        left: 10,
        top: 10,
        right: 50,
        bottom: 50,
        width: 40,
        height: 40,
        x: 10,
        y: 10,
        toJSON: () => ({}),
      }) as DOMRect;

    document.elementFromPoint = () => inner;

    expect(findSolDropTarget(20, 20)).toBe('tableau:2');

    zone.remove();
  });

  it('returns null when nothing is under the pointer', () => {
    document.elementFromPoint = () => null;
    expect(findSolDropTarget(0, 0)).toBeNull();
  });

  it('returns null when the hit element is not inside a drop zone', () => {
    const lone = document.createElement('span');
    document.body.append(lone);
    document.elementFromPoint = () => lone;
    expect(findSolDropTarget(0, 0)).toBeNull();
    lone.remove();
  });
});
