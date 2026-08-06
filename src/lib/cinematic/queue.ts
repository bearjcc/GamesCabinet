import type { MotionIntensity } from '../motion';
import type { CinematicPrimitive, QueuedAnimation, ResolveReason } from './types';

export type AnimationPlayContext = {
  intensity: MotionIntensity;
  /** Becomes true after interruptCurrent or skipAll while this item is current. */
  isInterrupted: () => boolean;
};

/**
 * Plays one queued item. Must honour `isInterrupted()` and settle promptly.
 * Default player resolves immediately (useful for tests and the reduced path).
 */
export type AnimationPlayer = (item: QueuedAnimation, ctx: AnimationPlayContext) => Promise<void>;

export type AnimationQueueOptions = {
  /** Current effective intensity; read each item so mid-queue changes apply. */
  intensity: () => MotionIntensity;
  play?: AnimationPlayer;
  idFactory?: () => string;
  onResolve?: (item: QueuedAnimation, reason: ResolveReason) => void;
};

async function instantPlay(): Promise<void> {
  /* no-op */
}

/**
 * Client-only ordered animation queue.
 *
 * Policy (ADR 0001):
 * - Never writes to boardgame.io G / moves / server state.
 * - Animation decorates; it never gates input.
 * - Latest-wins: `replaceWith` interrupts the current item, drops pending,
 *   and starts the new primitive. Prefer this when a fresher canonical value
 *   arrives mid-flight (e.g. score updates).
 * - `interruptCurrent` aborts only the in-flight item, then continues the queue.
 * - `skipAll` aborts the current item and discards pending (UI already reflects G).
 * - Intensity `reduced` resolves every item instantly with reason `reduced`.
 */
export class AnimationQueue {
  private pending: QueuedAnimation[] = [];
  private current: QueuedAnimation | null = null;
  private pumping = false;
  private interruptFlag = false;
  private skipAllFlag = false;
  private seq = 0;
  private readonly intensity: () => MotionIntensity;
  private readonly play: AnimationPlayer;
  private readonly idFactory: () => string;
  private readonly onResolve?: (item: QueuedAnimation, reason: ResolveReason) => void;

  constructor(options: AnimationQueueOptions) {
    this.intensity = options.intensity;
    this.play = options.play ?? instantPlay;
    this.idFactory =
      options.idFactory ??
      (() => {
        this.seq += 1;
        return `cin-${this.seq}`;
      });
    this.onResolve = options.onResolve;
  }

  enqueue(primitive: CinematicPrimitive): string {
    const item: QueuedAnimation = { id: this.idFactory(), primitive };
    this.pending.push(item);
    void this.pump();
    return item.id;
  }

  /**
   * Latest-wins: interrupt current, clear pending, enqueue `primitive`.
   * Use when a newer canonical value arrives mid-animation.
   */
  replaceWith(primitive: CinematicPrimitive): string {
    this.skipAll();
    return this.enqueue(primitive);
  }

  /** Abort only the in-flight item; remaining pending still play. */
  interruptCurrent(): void {
    this.interruptFlag = true;
  }

  /**
   * Abort the current item and discard all pending.
   * Callers must already show the final canonical state.
   */
  skipAll(): void {
    this.skipAllFlag = true;
    this.interruptFlag = true;
    const dropped = this.pending.splice(0, this.pending.length);
    for (const item of dropped) {
      this.onResolve?.(item, 'skipped');
    }
  }

  getCurrent(): QueuedAnimation | null {
    return this.current;
  }

  getPending(): readonly QueuedAnimation[] {
    return this.pending;
  }

  isBusy(): boolean {
    return this.pumping || this.current !== null || this.pending.length > 0;
  }

  private resolve(item: QueuedAnimation, reason: ResolveReason): void {
    this.onResolve?.(item, reason);
  }

  private async pump(): Promise<void> {
    if (this.pumping) return;
    this.pumping = true;
    try {
      while (this.pending.length > 0) {
        // Clear a skip aimed at the previous item; keep anything enqueued after it.
        this.skipAllFlag = false;

        const item = this.pending.shift()!;
        this.current = item;
        this.interruptFlag = false;
        const intensity = this.intensity();

        if (intensity === 'reduced') {
          this.resolve(item, 'reduced');
          this.current = null;
          continue;
        }

        await this.play(item, {
          intensity,
          isInterrupted: () => this.interruptFlag || this.skipAllFlag,
        });

        if (this.skipAllFlag) {
          this.resolve(item, 'skipped');
        } else if (this.interruptFlag) {
          this.resolve(item, 'interrupted');
        } else {
          this.resolve(item, 'completed');
        }
        this.current = null;
      }
    } finally {
      this.pumping = false;
      this.interruptFlag = false;
    }
  }
}
