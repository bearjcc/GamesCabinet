# Research: boardgame.io rooms and multiplayer model

Ticket: https://github.com/bearjcc/GamesCabinet/issues/2  
Branch: `research/boardgame-io-rooms`  
Sources: boardgame.io docs (Lobby, Server, Client, Multiplayer, Tutorial/AI), package API as of research date.

## Verdict

GamesCabinet can treat the short room code as boardgame.io `matchID`. Use Lobby REST create/join for seats and per-seat credentials (not accounts). Use SocketIO + Server for client-server play. Use `Local({ bots })` for vs-bot; use plain `Local()` or a single offline Client for hotseat/local. Build a thin custom shell for `/g/<game>/<code>` and nickname storage; skip the stock React Lobby UI.

## Concept map

| GamesCabinet need | boardgame.io concept | Notes |
|---|---|---|
| Short room code | `matchID` | Public match instance id; appear in URL |
| Path `/g/<game>/<code>` | game `name` + `matchID` | Client routes; Lobby paths are `/games/{name}/{id}` |
| Browser nickname | Lobby `playerName` | Set on `join`; optional later `updatePlayer` |
| Seat / who moves | `playerID` (`'0'`, `'1'`, ...) | Ordinal seat, not an account |
| Auth without accounts | `playerCredentials` / Client `credentials` | Per-seat secret from join; store in browser |
| Client-server play | `Server` + `SocketIO` transport | Authoritative master on Node |
| Hotseat / local 2P | `Local()` multiplayer (or offline Client) | No remote master |
| Vs bot | `Local({ bots: { '1': MCTSBot } })` + game `ai.enumerate` | Client-side bots; not Lobby seats |
| Match listing / create / join | Lobby REST + `LobbyClient` | Prefer API over stock React `<Lobby>` |

## Room codes <-> matchID

- Creating a match (`POST /games/{name}/create`) returns `matchID`.
- Server option `uuid` generates that id (default: nanoid). Override with a short alphabet, e.g. 6-char Crockford/base32, so `matchID === room code`.
- Clients connect with `matchID` (and `playerID` + `credentials` after join).
- URL shape: `/g/<game>/<code>` where `<game>` is the game `name` (e.g. `tic-tac-toe`) and `<code>` is `matchID`.

Caveat: by default `uuid` also generates credentials if `generateCredentials` is omitted. Short codes must not become move secrets. Always set a separate long `generateCredentials` (keep short `uuid` only for match IDs).

Optional: `unlisted: true` on create so room-code matches stay off the public match list.

Collision risk for 6-char codes is low for Phase 1 volume; create retries on rare collisions if storage rejects duplicates.

## Nicknames and no-accounts auth

Flow:

1. App reads/writes nickname in `localStorage` (GamesCabinet concern).
2. Host: `LobbyClient.createMatch(game, { numPlayers, unlisted: true })` -> `matchID` -> navigate to `/g/<game>/<code>`.
3. Host and guest: `joinMatch(game, matchID, { playerName })` -> `{ playerID, playerCredentials }`.
4. Persist `{ matchID, playerID, credentials }` in browser storage keyed by match (so refresh reattaches).
5. Mount `Client({ game, multiplayer: SocketIO({ server }), matchID, playerID, credentials })`.

Credentials prove the right to act for a seat. They are not user accounts. Phase 1 needs no OAuth/login; optional later `generateCredentials` / `authenticateCredentials` if accounts appear.

`matchData` on the Client exposes joined seats and display names for lobby UI.

## Modes

### A. Online multiplayer (primary Phase 1 remote)

- Node `Server({ games, origins, uuid, generateCredentials })`.
- React clients with `SocketIO`.
- Custom lobby UX calling `LobbyClient` (create / join / getMatch / leave).
- Do not rely on the stock React `<Lobby>` for product UX; it fights path-based room codes and custom branding.

### B. Local / hotseat

- `multiplayer: Local()` with two `playerID`s in one browser, or a single offline Client (`multiplayer: false`) if the game allows alternating without seats.
- No Lobby, no room code required (optional fake local code for UI consistency).

### C. Vs bot (medium deterministic)

- Prefer `Local({ bots: { '1': MCTSBot } })` (or `RandomBot` for smoke tests).
- Game definition needs `ai: { enumerate }` returning legal moves.
- Tune MCTS via iterations / playout depth / objectives (light weights OK; no RL).
- Tutorial note: networked bot seats are not first-class; treat vs-bot as client-local, not a Lobby "bot player" join.

## What boardgame.io already gives

- Match lifecycle REST (create, join, get, update name, leave, playAgain).
- Socket.io sync and authoritative moves.
- Per-seat credentials validation on authenticated matches.
- React/JS Client bindings (`matchID`, `playerID`, `credentials`, `matchData`).
- `RandomBot` / `MCTSBot` + `ai.enumerate` for local AI.
- Multi-game Server via game `name`.

## What GamesCabinet implements

- Short-code `uuid` + separate long `generateCredentials`.
- App routes `/g/<game>/<code>` and create/join screens.
- Nickname + seat credentials in browser storage.
- Mode switch: online (SocketIO + Lobby) vs local vs bot (`Local` / bots).
- Game modules: tic-tac-toe, connect four, checkers, dominoes (each with `name`, moves, and `ai.enumerate` where bots apply).
- Persistence beyond in-memory DB when deploy needs it (storage connector; out of scope for this ticket).
- Skip stock React Lobby component.

## Recommended defaults (Phase 1)

1. Room code = `matchID` (custom `uuid`, ~6 chars).
2. Credentials = long random via `generateCredentials`; store per match in browser.
3. Nickname = Lobby `playerName` from `localStorage`.
4. Online = Server + SocketIO + LobbyClient; path URL is source of join.
5. Bot = Local + MCTSBot; local hotseat = Local or offline Client.
6. No accounts.

## Open implementation notes (not blockers)

- Confirm create collision behaviour for custom short `uuid` against chosen DB.
- Decide whether vs-bot ever needs a shareable URL (probably not Phase 1).
- Dominoes/checkers AI enumerate cost: keep MCTS iterations modest; RandomBot for CI smoke.
