# Cinematic layer

Client-only interpretation of state changes into named motion. boardgame.io owns
canonical state (`G`); this module never writes to it.

## Policy

- **Decorates, never gates.** Input and legal actions stay live while motion plays.
- **Latest-wins.** When a fresher value arrives mid-animation, call
  `AnimationQueue.replaceWith(...)`: the in-flight item is interrupted, pending
  items are skipped, and the new primitive starts. The displayed value always
  converges to the latest canonical value.
- **`interruptCurrent`.** Aborts only the playing item; remaining queue continues.
- **`skipAll`.** Aborts the current item and discards pending. The UI must already
  reflect final `G` (reconnect, tap-to-skip, etc.).
- **Reduced intensity.** Every primitive resolves instantly with no transform.
  Final displayed state is still correct. This is a correctness path, not a
  downgrade.
- **Games do not import Motion.** Boards enqueue descriptors or use wrappers in
  `src/components/cinematic/`. Only that folder imports `motion` / `motion/react`.

## Vocabulary

`lift` `drop` `snap` | `deal` `flip` `fan` `stack` | `roll` | `count`

## Out of scope (later waves)

Auto-diffing `G`, sound, board layout animation, per-game Board integration.
