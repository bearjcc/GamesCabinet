# TRACKS card art

Square card faces for TRACKS. Art is Bear's; faces were assembled from his GIMP layer exports (see reference `sheet.png` and `tiling.png` in the art source bundle, not shipped here).

WebPs at **512** and **1024** px. Do not re-encode these files in the cabinet repo; replace the folder contents when art updates.

Files:

- `straight`, `curve`, `junction`, `bridge-start`, `bridge-mid`, `tunnel-arch`, `tunnel-mid`, `whistlestop`
- `obstacle-river`, `obstacle-mountain`

Base orientations at rotation 0 are documented in `src/games/tracks/tileArtEdges.ts` and tested against `edgesAt()` in `tileArtEdges.test.ts`.
