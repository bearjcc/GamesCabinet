# Representation modes

Shell-owned helpers that pick how a zone (hand, pile, track, etc.) is presented.

Games declare physical semantics; the UI OS chooses a mode from viewport width,
item count, and zone context (`peek` | `inspect` | `choose` | `closed`).

Modes: `physical` | `compact` | `dashboard` | `list` | `detail`.

Public API: import from `src/lib/representation` (`chooseRepresentationMode`,
types, and the specialised `chooseCardHandMode`).

See ADR `docs/adr/0001-ui-operating-system-layer.md` §4, `PRODUCT.md` principle
12, and `DESIGN.md` Interaction guidelines. Pure functions only — no Motion,
no boardgame.io rules.
