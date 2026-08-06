# 1. GamesCabinet is a UI layer over boardgame.io, not a second engine

Status: accepted (2026-08-06)

## Context

boardgame.io decides what happened. GamesCabinet decides how players experience
what happened. The cabinet is a platform, so the interaction language has to be
shared: a player who learns to select a card, inspect a deck, or roll dice in one
game should already know how to do it in the next one.

The shared pieces have started to appear on their own — `SemanticAction` and
`ActionSurface`, the tabletop card kit, motion intensity, `PlayTable` slots. This
record exists to fix the few boundaries that are expensive to move later, so that
work can proceed in parallel without painting us into a corner. It is deliberately
short. It constrains seams, not implementations.

## Decisions

### 1. Games declare intent; the shell chooses the interaction

A game says "this is a hand", "this is a deck", "the player may choose one of
these", "roll two dice". It does not say "render a button here" or "put a sprite
at x=50". The shell owns the mapping from intent to touch pattern.

Consequence: a game's legal actions must be derivable **outside** of its JSX, as
plain data. Building `SemanticAction`s inline inside a component makes them
invisible to bots, to legality highlighting, to keyboard navigation, and to any
future representation mode. Actions are computed from `(G, ctx)` and rendered
second.

### 2. Cinematic state never flows back into canonical state

`G` is canonical and authoritative; the server validates it. Animation state —
what is mid-flight, which counter is still ticking, which card is being dealt —
lives only in the client and never enters `G`, a move, or anything the server sees.

This is the single most expensive mistake available to us. Animation state inside
`G` would desynchronise multiplayer, break server validation, and corrupt replay.

### 3. Animation decorates; it never gates

State is applied the moment it arrives. Animation is the interpretation played
over the top, and it must always be interruptible and skippable. A player who taps
during an animation gets their input honoured, not queued behind a flourish.
Reconnecting mid-animation shows the current state, not a replay.

Corollary: reduced motion is a correctness path, not a downgrade. With motion off,
everything must still be fully playable and legible.

### 4. Representation modes belong to the shell

A component may be shown as physical, compact, dashboard, list, or full-screen
detail. Which one appears is a function of viewport, context, and the amount of
data — decided by the shell, not hard-coded by the game. A hand of 5 cards fans;
a hand of 25 becomes a searchable list, and the game does not know the difference.

### 5. Overrides are slots, not forks

A game that wants a skull instead of a pip on the one-face overrides the face art.
It keeps the die's behaviour, networking, and animation. Overriding is done by
passing art, tokens, or an animation to an existing component — never by copying
the component into the game folder. If a game cannot express what it needs through
a slot, that is a gap in the component, and the component grows a slot.

### 6. Games do not import the animation library directly

Motion (MIT) is the current implementation. Game boards use our named primitives
— lift, drop, deal, flip, fan, stack, roll, snap, count — and never import Motion
themselves. This keeps the animation vocabulary consistent across the cabinet and
keeps the library swappable.

## Consequences

- `src/lib/actions.ts` stays pure and testable without React, like `game.ts`.
- The cinematic layer is a client-side consumer of state diffs, with no write path.
- New games get polished feedback by declaring what their objects are.
- Reduced motion and full motion must both pass the same e2e flows.

## What this does not decide

Component APIs, the diffing strategy, the primitive signatures, which games adopt
which mode first, and how much of the vision ships. Those are implementation
choices, revisable per slice.

Player verbs, personas, experience levels, copy layers, variants / knowledge-graph
goals, and the evaluation lens (flow, agency, shared understanding) live in
`PRODUCT.md`, `DESIGN.md`, and the deferred section of `ARCHITECTURE.md` - they
motivate this ADR but are not decided here.
