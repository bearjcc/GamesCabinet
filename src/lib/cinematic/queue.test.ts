import { describe, expect, it, vi } from 'vitest';
import { AnimationQueue } from './queue';
import type { QueuedAnimation, ResolveReason } from './types';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe('AnimationQueue', () => {
  it('plays named primitives in order', async () => {
    const order: string[] = [];
    const gate = deferred();
    const firstGate = deferred();
    const releaseFirst = firstGate.resolve;

    const queue = new AnimationQueue({
      intensity: () => 'normal',
      idFactory: (() => {
        let n = 0;
        return () => {
          n += 1;
          return `id-${n}`;
        };
      })(),
      play: async (item) => {
        order.push(`start:${item.primitive.kind}`);
        if (item.id === 'id-1') await firstGate.promise;
        order.push(`end:${item.primitive.kind}`);
      },
      onResolve: (item, reason) => {
        order.push(`resolve:${item.primitive.kind}:${reason}`);
        if (item.primitive.kind === 'stack') gate.resolve();
      },
    });

    queue.enqueue({ kind: 'deal' });
    queue.enqueue({ kind: 'flip' });
    queue.enqueue({ kind: 'stack' });
    expect(queue.getPending()).toHaveLength(2);
    expect(queue.getCurrent()?.primitive.kind).toBe('deal');
    expect(queue.isBusy()).toBe(true);

    releaseFirst();
    await gate.promise;
    expect(order).toEqual([
      'start:deal',
      'end:deal',
      'resolve:deal:completed',
      'start:flip',
      'end:flip',
      'resolve:flip:completed',
      'start:stack',
      'end:stack',
      'resolve:stack:completed',
    ]);
    expect(queue.isBusy()).toBe(false);
  });

  it('resolves every item instantly on the reduced path', async () => {
    const resolved: Array<[string, ResolveReason]> = [];
    const play = vi.fn(async () => {
      /* should not run */
    });
    const queue = new AnimationQueue({
      intensity: () => 'reduced',
      play,
      onResolve: (item, reason) => {
        resolved.push([item.primitive.kind, reason]);
      },
    });

    queue.enqueue({ kind: 'lift' });
    queue.enqueue({ kind: 'roll' });
    queue.enqueue({ kind: 'count', from: 0, to: 9 });

    await vi.waitFor(() => {
      expect(resolved).toEqual([
        ['lift', 'reduced'],
        ['roll', 'reduced'],
        ['count', 'reduced'],
      ]);
    });
    expect(play).not.toHaveBeenCalled();
    expect(queue.isBusy()).toBe(false);
  });

  it('interruptCurrent aborts only the in-flight item', async () => {
    const resolved: Array<[string, ResolveReason]> = [];
    const started = deferred();
    const done = deferred();

    const queue = new AnimationQueue({
      intensity: () => 'normal',
      play: async (item, ctx) => {
        if (item.primitive.kind === 'lift') {
          started.resolve();
          await vi.waitFor(() => expect(ctx.isInterrupted()).toBe(true));
          return;
        }
      },
      onResolve: (item, reason) => {
        resolved.push([item.primitive.kind, reason]);
        if (item.primitive.kind === 'drop') done.resolve();
      },
    });

    queue.enqueue({ kind: 'lift' });
    queue.enqueue({ kind: 'drop' });
    await started.promise;
    queue.interruptCurrent();
    await done.promise;

    expect(resolved).toEqual([
      ['lift', 'interrupted'],
      ['drop', 'completed'],
    ]);
  });

  it('skipAll discards pending and marks the current item skipped', async () => {
    const resolved: Array<[string, ResolveReason]> = [];
    const started = deferred();
    const settled = deferred();

    const queue = new AnimationQueue({
      intensity: () => 'playful',
      play: async (item, ctx) => {
        if (item.primitive.kind === 'fan') {
          started.resolve();
          await vi.waitFor(() => expect(ctx.isInterrupted()).toBe(true));
        }
      },
      onResolve: (item, reason) => {
        resolved.push([item.primitive.kind, reason]);
        if (resolved.length >= 3) settled.resolve();
      },
    });

    queue.enqueue({ kind: 'fan' });
    queue.enqueue({ kind: 'stack' });
    queue.enqueue({ kind: 'snap' });
    await started.promise;
    queue.skipAll();
    await settled.promise;

    expect(resolved).toEqual(
      expect.arrayContaining([
        ['stack', 'skipped'],
        ['snap', 'skipped'],
        ['fan', 'skipped'],
      ]),
    );
    expect(resolved).toHaveLength(3);
    expect(queue.getPending()).toHaveLength(0);
    expect(queue.isBusy()).toBe(false);
  });

  it('replaceWith latest-wins: interrupts, clears pending, plays the new item', async () => {
    const resolved: Array<[string, ResolveReason]> = [];
    const counts: number[] = [];
    const firstStarted = deferred();
    const done = deferred();

    const queue = new AnimationQueue({
      intensity: () => 'normal',
      play: async (item, ctx) => {
        if (item.primitive.kind === 'count' && item.primitive.to === 5) {
          firstStarted.resolve();
          await vi.waitFor(() => expect(ctx.isInterrupted()).toBe(true));
          return;
        }
        if (item.primitive.kind === 'count') {
          counts.push(item.primitive.to);
        }
      },
      onResolve: (item, reason) => {
        resolved.push([
          `${item.primitive.kind}:${'to' in item.primitive ? item.primitive.to : ''}`,
          reason,
        ]);
        if (reason === 'completed' && item.primitive.kind === 'count' && item.primitive.to === 9) {
          done.resolve();
        }
      },
    });

    queue.enqueue({ kind: 'count', from: 0, to: 5 });
    queue.enqueue({ kind: 'deal' });
    await firstStarted.promise;

    queue.replaceWith({ kind: 'count', from: 3, to: 9 });
    await done.promise;

    expect(counts).toEqual([9]);
    expect(
      resolved.some(
        ([k, r]) => k.startsWith('count:5') && (r === 'skipped' || r === 'interrupted'),
      ),
    ).toBe(true);
    expect(resolved).toContainEqual(['deal:', 'skipped']);
    expect(resolved).toContainEqual(['count:9', 'completed']);
  });

  it('reports busy while current or pending remain', async () => {
    const release = deferred();
    const queue = new AnimationQueue({
      intensity: () => 'normal',
      play: async () => release.promise,
    });
    expect(queue.isBusy()).toBe(false);
    queue.enqueue({ kind: 'snap' });
    await vi.waitFor(() => expect(queue.getCurrent()).not.toBeNull());
    expect(queue.isBusy()).toBe(true);
    release.resolve();
    await vi.waitFor(() => expect(queue.isBusy()).toBe(false));
  });

  it('uses the default instant player when none is provided', async () => {
    const resolved: QueuedAnimation[] = [];
    const queue = new AnimationQueue({
      intensity: () => 'normal',
      onResolve: (item) => {
        resolved.push(item);
      },
    });
    queue.enqueue({ kind: 'lift' });
    await vi.waitFor(() => expect(resolved).toHaveLength(1));
    expect(resolved[0]?.primitive.kind).toBe('lift');
  });
});
