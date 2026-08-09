# Ludo Royale — JavaScript Architecture

This document explains how the codebase is organized, what each file is
responsible for, every function/method each file defines, and how to safely
make changes without breaking something else.

If you only read one section, read **"How the files fit together"** and
**"The namespace pattern"** below — everything else builds on those two ideas.

---

## How the files fit together

```
index.html
   │
   ├─ loads scripts/utils.js       (must load first — everything depends on it)
   ├─ loads scripts/board.js       (depends on utils.js)
   ├─ loads scripts/storage.js     (depends on nothing else)
   ├─ loads scripts/sound.js       (depends on nothing else)
   ├─ loads scripts/timer.js       (depends on utils.js)
   ├─ loads scripts/dice.js        (depends on utils.js, sound.js, Anime.js)
   ├─ loads scripts/player.js      (depends on utils.js)
   ├─ loads scripts/ai.js          (depends on nothing else)
   ├─ loads scripts/animation.js   (depends on utils.js, Anime.js)
   ├─ loads scripts/modal.js       (depends on utils.js, animation.js)
   ├─ loads scripts/game.js        (depends on all of the above except app.js)
   └─ loads scripts/app.js         (the composition root — depends on everything)
```

**Load order matters.** Each file reads from `window.Ludo.*` the moment it
runs, so a file must be loaded *after* everything it depends on. `<script>`
tags in `index.html` are already in the correct order — if you add a new
file, add its `<script>` tag in the right place in that dependency chain,
not at a random spot.

`game.js` is the **rules engine** — it knows nothing about the DOM screens,
menus, or modals. `app.js` is the **composition root** — it knows nothing
about Ludo rules. Everything in between is a focused utility module. This
split means you can rewrite the entire UI in `app.js` without touching a
single rule in `game.js`, and vice versa.

## The namespace pattern

Real browsers block `type="module"` script fetches when a page is opened
via `file://` (double-clicking `index.html`), which is a hard requirement
for this project ("must run by simply opening index.html"). So instead of
ES `import`/`export`, every file is a plain script wrapped in an IIFE
(`(function () { ... })()`) that attaches its public API to a single shared
object: `window.Ludo`.

```js
'use strict';
(function () {
  const { el, icon } = window.Ludo.Utils; // pull in what you need
  function myHelper() { /* ... */ }
  window.Ludo.MyThing = { myHelper };      // expose what others need
})();
```

Anything not attached to `window.Ludo` is private to that file (closed over
by the IIFE) — this is the module boundary. When editing a file, only
functions listed in its final `window.Ludo.X = { ... }` assignment are used
by other files; everything else is safe to rename/refactor freely as long
as you update call sites within the same file.

---

## File-by-file reference

### `utils.js` — shared constants & DOM helpers
**Exposes:** `window.Ludo.Utils`
**Depends on:** nothing (loads first)

The foundation every other file pulls from. Two categories of exports:

**Constants**
| Export | What it is |
|---|---|
| `PLAYER_COLORS` | `['red','green','blue','yellow']` — the clockwise turn order (Red → Green → Blue → Yellow), also the spatial order of the corners. |
| `PLAYER_META` | Per-color display info: `{ label, hex, hexSoft, icon }`, keyed by color name. |
| `TOKENS_PER_PLAYER` | `4` |
| `COMMON_TRACK_LENGTH` | `52` — squares in the shared outer track |
| `HOME_STRETCH_LENGTH` | `6` — squares in each color's private home column |
| `TOTAL_STEPS_TO_FINISH` | `57` — steps a token must take from its start square to reach home |
| `SIX`, `MAX_CONSECUTIVE_SIXES` | Rule constants (`6` and `3`) |
| `TOKEN_STATE` | `{ BASE, ACTIVE, HOME }` — the three states a token can be in |

**Functions**
| Function | Purpose |
|---|---|
| `clamp(value, min, max)` | Standard numeric clamp. |
| `randInt(min, max)` | Inclusive random integer (used only for non-gameplay flourishes — real dice rolls use `dice.js`'s crypto-based RNG). |
| `qs(selector, root=document)` | `querySelector` shorthand. |
| `qsa(selector, root=document)` | `querySelectorAll` shorthand, returns a real Array. |
| `el(tag, options, children)` | Builds a DOM element in one call: `{ className, attrs, dataset, text }` + a children array. Used everywhere instead of `innerHTML` (see Security note below). |
| `icon(classes, extraClass)` | Builds a Font Awesome `<i>` element. |
| `debounce(fn, wait)` | Standard debounce. |
| `throttle(fn, limit)` | Standard throttle. |
| `formatDuration(ms)` | `12345678 → "03:25:45"` (HH:MM:SS), used by the header match timer. |
| `formatDurationShort(ms)` | `125000 → "2m 5s"`, used in Stats/Win screens. |
| `class EventBus` | Tiny pub/sub: `.on(event, handler)`, `.off(event, handler)`, `.emit(event, payload)`. Every cross-module event in the app (dice rolled, turn started, game won, …) flows through one `EventBus` instance owned by `Game`. |
| `uid(prefix)` | Short unique id generator (not currently used for gameplay ids — tokens use deterministic `${color}-${index}` ids — but kept available for future use, e.g. custom save slots). |
| `prefersReducedMotion()` | Reads the OS-level `prefers-reduced-motion` media query. |

**How to change it:** Add new shared constants/helpers here only if at
least two other files need them. Single-file helpers belong in that file.

---

### `board.js` — board geometry & rendering
**Exposes:** `window.Ludo.Board`
**Depends on:** `utils.js`

Owns the **authentic 15×15 international Ludo board**: which grid cells
exist, which color owns which corner, where each color's safe squares and
home stretch are, and how to render all of that into the DOM. It knows
nothing about turns, dice, or rules — `game.js` asks it "where is step 23
for green?" and `board.js` just answers.

**Internal geometry constants** (not directly used outside this file, but
documented here because they're the source of truth for the whole board):
- `COMMON_PATH` — the 52 `[row, col]` cells of the shared outer track, in clockwise order, starting just outside Red's yard.
- `START_INDEX` — `{ red: 0, green: 13, blue: 26, yellow: 39 }`, each color's entry point into `COMMON_PATH`.
- `HOME_STRETCH` — the 6-cell private arm each color's tokens walk after finishing the common track. Red enters from the left, Green from the top, Blue from the right, Yellow from the bottom.
- `YARD_ORIGIN` — the top-left grid coordinate of each color's 6×6 base: Red `[0,0]` (top-left), Green `[0,9]` (top-right), Blue `[9,9]` (bottom-right), Yellow `[9,0]` (bottom-left).
- `YARD_SLOTS`, `CENTER_CELL`, `SPATIAL_CORNER_ORDER` — smaller layout details (token resting spots inside a yard, the center cell, and the fixed TL/TR/BL/BR order used only for coloring the decorative center triangle).

**Exported functions**
| Function | Purpose |
|---|---|
| `stepsToCoord(color, steps)` | The core geometry function. Converts a token's "steps taken" (0 = in base) into a `[row, col]` board coordinate for that color. `1–51` → common track, `52–57` → home stretch. |
| `startCoord(color)` | The `[row, col]` of a color's entry square. |
| `isSafeSteps(color, steps)` | `true` if that position is a safe square (start square, star square, or anywhere in a home stretch). |
| `yardCoord(color, tokenIndex)` | The `[row, col]` of one of the 4 idle-token slots inside a color's base. |
| `coordKey([r, c])` | Turns a coordinate into a Map key string (`"6,1"`). Used everywhere a coordinate needs to be a lookup key. |
| `renderBoard(container)` | Builds the entire board DOM (all cells, both yards, the center triangle) into `container`, and returns a `Map<coordKey, { cell, tokenLayer }>` so callers (mainly `game.js`) can place token elements without re-querying the DOM. |

**Private helpers** (not exported, safe to rename): `buildSafeSquareSet`,
`buildHomeTriangle`, `colorOfHomeStretchCell`, `colorOfStartCell`.

**How to change it:**
- **Re-skin the board** (colors, cell styling) → edit `styles/style.css`, not this file. This file only produces structure and class names like `cell-start start-red`.
- **Change board geometry** (a genuinely different Ludo variant) → edit `COMMON_PATH`/`START_INDEX`/`HOME_STRETCH`/`YARD_ORIGIN` together, consistently. There's a validation approach documented in the "Testing changes" section below — always re-verify geometry after touching these.
- **Add a new kind of special square** (e.g. a "bonus" square) → add a new Set similar to `SAFE_SQUARES`, a new CSS class, and a new check inside `renderBoard`'s cell-building loop.

---

### `storage.js` — localStorage wrapper
**Exposes:** `window.Ludo.Storage` → `{ StatsStore, SettingsStore, SaveGameStore }`
**Depends on:** nothing

The **only** file allowed to touch `window.localStorage` directly. Every
read/write anywhere else in the app goes through one of these three
objects, so a quota error or corrupted JSON is handled in exactly one
place instead of scattered `try/catch`es everywhere.

**Private helpers:** `safeGet(key)`, `safeSet(key, value)`, `safeRemove(key)` — wrap `localStorage` calls in `try/catch`, returning `null`/`false` on failure instead of throwing.

**`StatsStore`**
| Method | Purpose |
|---|---|
| `.load()` | Returns the stats object, merged over sane defaults. |
| `.save(stats)` | Writes the whole stats object. |
| `.reset()` | Wipes stats back to defaults (used by Settings → Reset Statistics). |
| `.recordMatch({ won, durationMs })` | Called once, by `game.js`, when a match ends. Updates games played/wins/losses/fastest win/longest match/total duration. |

**`SettingsStore`**
| Method | Purpose |
|---|---|
| `.load()` | Returns `{ soundEnabled, animationsEnabled }`. |
| `.save(settings)` | Persists it. |

**`SaveGameStore`**
| Method | Purpose |
|---|---|
| `.load()` | Returns the last autosaved match snapshot, or `null`. |
| `.save(snapshot)` | Persists a snapshot (adds a `savedAt` timestamp). |
| `.clear()` | Deletes the saved match (called on win, restart, or explicit "Clear Saved Match"). |
| `.hasSave()` | `true`/`false`, used to show/hide the "Resume Match" menu button. |

**How to change it:** Adding a new persisted value (e.g. a "preferred token skin")? Add a key to `DEFAULT_SETTINGS` and a field in the relevant store — don't create a fourth ad-hoc `localStorage` key elsewhere.

---

### `sound.js` — procedural audio engine
**Exposes:** `window.Ludo.sound` (a ready-to-use singleton instance, not a class)
**Depends on:** nothing (Web Audio API only)

Every sound effect is **synthesized at runtime**, not loaded from an audio
file (see `assets/sounds/README.md` for why). One shared `AudioContext` is
created lazily on first use (browsers block audio until a user gesture
happens anyway).

**Public methods** (each plays a distinct effect): `click()`, `diceRoll()`,
`tokenMove()`, `capture()`, `tokenHome()`, `victory()`, `countdownTick()`,
`countdownGo()`, `error()`. Also `setMuted(bool)` and `isMuted()`.

**Private building blocks:** `_ensureContext()` (lazily creates/resumes the
`AudioContext`), `_cleanupVoice(nodes)` (disconnects finished audio nodes so
they're garbage-collected — this is what guarantees no duplicate/overlapping
playback or leaked nodes), `_tone({...})` (plays a single oscillator tone
with an envelope), `_noiseBurst({...})` (plays filtered white noise — used
for the dice-roll "clatter").

**How to add a new sound effect:**
```js
myNewSound() {
  this._tone({ freq: 600, duration: 0.1, type: 'sine', gain: 0.15 });
}
```
add it to the class body, then call `window.Ludo.sound.myNewSound()` from
wherever the event happens. No other file needs to change.

---

### `timer.js` — match timer
**Exposes:** `window.Ludo.MatchTimer` (a class)
**Depends on:** `utils.js` (for `formatDuration`)

A small stopwatch driven by `requestAnimationFrame` (not `setInterval`, to
avoid drift) that calls back once per second with a formatted string.

| Method | Purpose |
|---|---|
| `constructor(onTick)` | `onTick(formattedString, elapsedMs)` fires roughly every second while running. |
| `.start(resumeElapsedMs=0)` | Starts (or resumes from a saved elapsed time). |
| `.stop()` | Stops and returns the final elapsed ms (called when a match ends). |
| `.reset()` | Stops and zeroes the timer, firing one final `onTick`. |
| `.getElapsedMs()` | Current elapsed time, whether running or stopped. |
| `_loop()` (private) | The `requestAnimationFrame` recursion. |

**How to change it:** This file is intentionally minimal and shouldn't need
touching. If you need a *countdown* timer (e.g. a per-turn time limit),
that's a different enough concept to deserve its own small class rather
than overloading this one.

---

### `dice.js` — the 3D die
**Exposes:** `window.Ludo.Dice` (a class)
**Depends on:** `utils.js`, `sound.js`, Anime.js (`window.anime`)

Renders a CSS 3D cube (six `<div>` faces, positioned with `translateZ` +
rotations) and animates it to the rolled face with Anime.js. Randomness
uses `window.crypto.getRandomValues` with rejection sampling — not
`Math.random()` — so all six faces are exactly equally likely.

**Private helpers:** `fairD6()` (the crypto RNG), `buildFace(value, faceName)` (builds one face's pips), `withTransform(node, transform)` (small DOM helper).

| `Dice` method | Purpose |
|---|---|
| `constructor(mountEl)` | Builds the cube DOM inside `mountEl`. |
| `.isRolling` (getter) | `true` while a roll animation is in flight — `game.js` uses this to prevent double-rolls. |
| `.roll({ animationsEnabled })` | Picks a fair result, plays the roll sound, animates the cube, and resolves a Promise with the resulting `1–6` once it settles. Falls back to an instant, non-animated result if `animationsEnabled` is false or Anime.js isn't available. |
| `_settleInstant(result)` (private) | The no-animation fallback path. |

**⚠️ Important constraint:** the cube's CSS size (76px) and each face's
`translateZ(38px)` (half the cube size) are mathematically linked. If you
resize the die, update **both** the CSS (`.die-stage`, `.die-cube`,
`.die-face` widths/heights in `styles/style.css`) **and** the `translateZ`
values in `_buildDom()` together, or the faces will visibly gap/overlap.
This is why `styles/style.css` deliberately does *not* resize the die at small
breakpoints — see the comment there.

**How to change it:** To restyle the die's look, edit `.die-face`/`.die-pip`
in CSS. To change roll physics/duration, edit the `window.anime({...})`
call inside `.roll()`.

---

### `player.js` — Player & Token domain models
**Exposes:** `window.Ludo.Player`, `window.Ludo.Token` (two classes)
**Depends on:** `utils.js`

Pure game-state objects — no DOM, no rendering. This is what gets
serialized to `localStorage` for autosave/resume.

**`Token`**
| Member | Purpose |
|---|---|
| `steps` | `0` = in base; `1–51` = on the common track; `52–57` = in the home stretch/finished. |
| `state` | Derived: `'base' \| 'active' \| 'home'`. |
| `.isHome` / `.isActive` / `.isInBase` (getters) | Convenience checks. |
| `.moveTo(steps)` | Sets `steps` and recomputes `state`. |
| `.sendHome()` | Resets to base (used when captured — note: confusingly named like "reaching home" but means the opposite; consider this if refactoring). |
| `.toJSON()` / `Token.fromJSON(data)` | Serialization for the save system. |

**`Player`**
| Member | Purpose |
|---|---|
| `tokens` | Array of 4 `Token`s. |
| `consecutiveSixes` | Tracks the three-sixes-forfeits-turn rule. |
| `capturesMade` / `tokensCaptured` | Stats shown on the player card and win screen. |
| `.tokensHome` (getter) | How many of the 4 tokens have reached home. |
| `.hasWon` (getter) | `true` once all 4 are home. |
| `.resetTurnState()` | Zeroes `consecutiveSixes` (currently called defensively; the six-counter is also reset inline in `game.js` — see that file). |
| `.toJSON()` / `Player.fromJSON(data)` | Serialization for the save system. |

**How to change it:** Adding a new per-player stat (e.g. "squares
traveled")? Add a field here, initialize it in the constructor, include it
in `toJSON`/`fromJSON`, then update it from `game.js` wherever the relevant
event happens.

---

### `ai.js` — AI move selection
**Exposes:** `window.Ludo.AI` → `{ chooseAIMove }`
**Depends on:** nothing

A small, explainable heuristic — not a search tree. `game.js` computes the
full list of legal moves for the current dice roll and hands it to
`chooseAIMove`; this file just picks the best one.

| Function | Purpose |
|---|---|
| `chooseAIMove(legalMoves)` | Scores every legal move and returns the highest-scoring one. |
| `score(move)` (private) | The heuristic: captures (+100 each) > reaching home (+90) > exiting base (+40) > landing on a safe square (+20, or −10 if landing exposed) > slight preference for the most-advanced token (+0.2×steps) > small random jitter (so play isn't perfectly deterministic/predictable). |

**How to change AI difficulty/behavior:** Adjust the weights in `score()`.
For a genuinely "harder" AI (look-ahead, not just single-move heuristics),
this file is the right place to add it — `game.js` only needs
`chooseAIMove(legalMoves)` to keep returning one move from that array.

---

### `animation.js` — Anime.js timeline library
**Exposes:** `window.Ludo.Animation`
**Depends on:** `utils.js`, Anime.js (`window.anime`)

Every Anime.js call in the app lives here, so `game.js`/`app.js` can say
"animate this token along this path" instead of hand-rolling keyframes
inline. Every function accepts `{ enabled }` and degrades to an instant,
correct state change when `enabled` is `false` (Settings → Animations off)
or the user has `prefers-reduced-motion` set.

| Function | Purpose |
|---|---|
| `animateTokenPath(tokenEl, cellLayers, { enabled, onStep })` | Moves a token element tile-by-tile through a list of cell containers — this is what guarantees tokens "never teleport." Returns a Promise that resolves once the token has visited every cell. |
| `pulseLanding(tokenEl, { enabled })` | Bounce/glow pulse after a token finishes moving. |
| `animateCapture(tokenEl, { enabled })` | Shake + shrink, played on a token that's about to be sent back to base. |
| `pulseActivePlayer(cardEl, { enabled })` | Adds a looping glow to the current player's card. |
| `clearActivePlayerPulse(cardEl)` | Removes that glow (called before highlighting a new player). |
| `staggerIn(targets, { enabled, delay })` | Entrance animation for a group of elements (menu cards, setup panel). |
| `fadeIn(targetEl, { enabled, duration })` / `fadeOut(...)` | Opacity transitions, used by the modal system and screen transitions. |
| `countdownBeat(targetEl, { enabled, shake })` | One beat of the "Get Ready / Prepare / Almost There / GO" match-start cinematic. |
| `burstCelebration(container, { enabled, particleCount, colors })` | Confetti/fireworks burst, used on the GO cinematic and the win screen. Builds and auto-removes its own DOM layer. |

**How to add a new animation:** Add a function here following the same
`{ enabled = true }` pattern, then call it from `game.js` or `app.js`.
Never call `window.anime(...)` directly from those files — keeping it
centralized here is what makes the reduced-motion/settings toggle work
everywhere automatically.

---

### `modal.js` — reusable modal/dialog system
**Exposes:** `window.Ludo.Modal` → `{ openModal, closeModal, isModalOpen, openConfirmDialog }`
**Depends on:** `utils.js`, `animation.js`

One modal implementation used for every dialog in the app (How To Play,
Settings, Statistics, History, Credits, Win screen, and every confirmation
prompt) — so focus trapping, ESC-to-close, scroll lock, and z-index only
need to be correct in one place.

| Function | Purpose |
|---|---|
| `openModal({ title, body, tone, dismissible, animationsEnabled, ariaLabel })` | Builds and shows a modal. `body` is one element or an array of elements — you build the content with `el(...)` calls (from `utils.js`) and hand it in. Returns `{ el, close() }`. |
| `closeModal()` | Closes whatever modal is currently open, if any. |
| `isModalOpen()` | `true`/`false`. |
| `openConfirmDialog({ title, description, iconClass, confirmLabel, cancelLabel, danger, animationsEnabled, onConfirm, onCancel })` | A convenience wrapper around `openModal` for yes/no confirmations (Quit, Restart, Reset Stats, etc.). |
| `trapFocus(evt, panel)` (private) | Keeps Tab/Shift+Tab cycling within the open modal. |

**How to add a new modal:** Don't build a new overlay from scratch — call
`Modal.openModal({ title, body: [...] })` with your content, the way every
`open*Modal()` function in `app.js` does.

---

### `game.js` — the rules engine
**Exposes:** `window.Ludo.Game` (a class)
**Depends on:** `utils.js`, `board.js`, `player.js`, `dice.js`, `timer.js`, `sound.js`, `storage.js`, `animation.js`, `ai.js`

The single source of truth for **what's allowed to happen**. Owns the
authoritative state (players, tokens, whose turn it is, the match timer)
and drives the board/dice/sound/animation modules to reflect it.
`app.js` never mutates game state directly — it calls these public methods
and listens on `game.bus` (an `EventBus`) for what to render.

**Public API**
| Method | Purpose |
|---|---|
| `constructor({ boardEl, diceEl, playerConfigs, settings })` | Builds the board, creates `Player`s, creates the `Dice` and `MatchTimer`. |
| `.updateSettings(partial)` | Live-updates `{ soundEnabled, animationsEnabled }` mid-match. |
| `.getCurrentPlayer()` | The `Player` whose turn it currently is. |
| `.start()` | Begins a brand-new match (starts the timer, begins turn 1). |
| `.restore(snapshot)` | Rehydrates a match from a `SaveGameStore` snapshot — rebuilds `Player`/`Token` objects and re-places every token's DOM element to match saved state. |
| `.toSnapshot()` | Serializes the current match for autosave. |
| `.destroy()` | Stops the timer and cancels any pending selection — call this before abandoning a `Game` instance (quitting to menu, restarting). |
| `.humanRollRequested()` | Called by the UI's Roll Dice button; no-ops if it isn't a human's turn, the game is over, or a roll is already in progress. |
| `.computeLegalMoves(player, diceValue)` | Returns every legal move for a given roll (see "Rules implementation" below). Exposed publicly mainly so it's easy to unit-test or inspect from the console. |
| `.applyMove(player, move)` | Animates and applies one chosen move: moves the token, resolves any capture(s), checks for a win. |

**Turn orchestration (private)**
| Method | Purpose |
|---|---|
| `beginTurn()` | Starts a turn: emits `'turn-start'`, then either waits for a human roll or (for AI) waits 600–1200ms and auto-rolls. |
| `_executeRollAndMove(player)` | The heart of a turn: rolls the dice, applies the three-sixes rule, computes legal moves, either auto-picks the only move / asks the AI / waits for a human token click, applies the move, then either grants a reroll (rolled a six) or advances to the next player. |
| `_advanceTurn()` | Moves `currentIndex` to the next player and starts their turn. |
| `_awaitHumanSelection(legalMoves)` | Returns a Promise that resolves when the human clicks one of the highlighted legal tokens. |
| `_onTokenClicked(token)` | The click handler wired to every token element; only does something if a selection is currently pending and the clicked token is a legal choice. |

**Rules implementation (private)** — this is the part to read closely
before changing any rule:
| Method | Purpose |
|---|---|
| `computeLegalMoves(player, diceValue)` | For each of the player's 4 tokens: base tokens need a 6 to exit; active tokens need `steps + diceValue ≤ 57`; either way, the path (and landing square) must not be blocked by an opponent blockade. |
| `_buildMove(player, token, targetSteps, occupancy, exitsBase)` | Builds one legal-move descriptor: whether it reaches home, whether it lands on a safe square, and which opposing token(s) it would capture. |
| `_buildOccupancy()` | Snapshots where every active token on the board currently is, keyed by coordinate — used for both blockade checks and capture detection. |
| `_isPathBlocked(movingColor, fromStep, toStep, occupancy)` | `true` if any *other* color has 2+ tokens stacked on any square between `fromStep` and `toStep` (a "blockade") — own-color stacking is always allowed. |

**Applying a move (private)**
| Method | Purpose |
|---|---|
| `_buildAnimationPath(color, token, targetSteps, exitsBase)` | Turns a move into the ordered list of board cells `animateTokenPath` should walk through. |
| `_captureToken(capturedToken, capturingPlayer)` | Animates and applies a capture: shake, send back to base, move its DOM element back to its yard slot, fade back in. |
| `_declareWinner(winner)` | Stops the timer, clears the autosave, records the match in `StatsStore` (see note below), and emits `'game-won'`. |

**DOM/placement helpers (private):** `_createTokenElements()` (builds all
16 token `<div>`s once), `_placeAllTokensFromState()` (used by `.restore()`
to re-place every token according to saved state), `_getTokenEl(token)`,
`_recordHistory(text)`, `_persistAutosave()`, `_delay(ms)`.

**Events emitted on `game.bus`** (all consumed in `app.js`'s
`wireGameEvents`): `turn-start`, `await-human-roll`, `dice-rolled`,
`await-token-selection`, `selection-resolved`, `message`, `capture`,
`board-updated`, `history-updated`, `timer-tick`, `game-won`.

**A design decision worth knowing about:** `_declareWinner` records
win/loss stats from the perspective of "the first human seat in this
match," since in local multiplayer there's no single, unambiguous "you."
If you want per-seat win/loss tracking instead, this is the method to
change (see `README.md`'s "Future Improvements").

**How to change a rule:** Almost every rule question is answered inside
`computeLegalMoves`/`_buildMove`/`_isPathBlocked`. For example:
- *"Allow overtaking a blockade"* → change `_isPathBlocked`.
- *"Disable captures on star squares but not start squares"* → change the `isSafe` calculation in `_buildMove` (currently both are safe — see `board.js`'s `isSafeSteps`).
- *"Require an exact 6 to exit base, but also allow a 1"* → change the `token.isInBase` branch in `computeLegalMoves`.

---

### `app.js` — composition root (screens, menus, HUD, modals)
**Exposes:** nothing (top-level; runs on `DOMContentLoaded`)
**Depends on:** every other file

Wires everything above into the actual screens: splash, main menu, player
setup, the in-match HUD, and every modal. Contains **no game rules** — it
renders state from `game.bus` events and forwards user intent (button
clicks) to `Game`'s public methods.

**Boot**
| Function | Purpose |
|---|---|
| `init()` | Runs once on `DOMContentLoaded`: caches screen elements, runs the splash sequence, wires up the menu/setup/header/HUD event listeners. |
| `cacheScreens()` | Looks up the three top-level `<main>` screens once. |

**Splash**
| Function | Purpose |
|---|---|
| `runSplash()` | Animates the progress bar and splash dice, then calls `finishSplash`. |
| `finishSplash(splash)` | Fades out the splash screen and shows the main menu. |

**Main menu**
| Function | Purpose |
|---|---|
| `wireMenu()` | Attaches click handlers to every main-menu button. |
| `showMainMenu()` | Hides other screens, shows the menu, shows/hides the "Resume Match" button based on `SaveGameStore.hasSave()`. |
| `hideAllScreens()` | Hides all three screens and clears the `body.in-game` class. |

**Player setup**
| Function | Purpose |
|---|---|
| `wireSetup()` | Wires the back button, the 2/3/4-player segmented control, and Start Match. |
| `qsAllSegments()` | Small helper to grab the 3 player-count buttons. |
| `defaultNameFor(color)` | `"red" → "Red"`, etc, from `PLAYER_META`. |
| `showSetupScreen()` | Shows the setup screen and renders the seat rows. |
| `renderSetupSeats()` | Builds one row per seat (name input, Human/AI toggle) based on `SEAT_COUNT_PRESETS[state.setup.count]`. |

**Launching/restoring a match**
| Function | Purpose |
|---|---|
| `launchMatch({ playerConfigs, resumeSnapshot })` | Shows the game screen, marks `body.in-game`, creates a new `Game`, wires its events, builds the player cards, then either restores a saved match or plays the start cinematic. |
| `applyPlayerCountLayout(count)` | Sets the `players-2/3/4` class on `#game-main` that drives the CSS grid layout for that seat count. |
| `playCinematicThenStart(game)` | The "Get Ready / Prepare / Almost There / GO" sequence, then calls `game.start()`. |
| `delay(ms)` | Small Promise-based delay helper local to this file. |

**Header & HUD**
| Function | Purpose |
|---|---|
| `wireGameHeader()` | Wires sound toggle, Settings, Restart (with confirmation), Back to Menu (with confirmation). |
| `toggleSound()` | Flips `soundEnabled`, persists it, updates the header icon. |
| `updateSoundIcon()` | Syncs the header speaker icon to the current mute state. |
| `wireHud()` | Wires the Move History button; syncs the sound icon on load. |

**Game event wiring → DOM**
| Function | Purpose |
|---|---|
| `wireGameEvents(game)` | Subscribes to every `game.bus` event and updates the status text, Roll Dice button, header, AI badge, player cards, and timer accordingly. This is the main "render loop" of the app, driven entirely by events rather than polling. |
| `setAiBadge(player, thinking)` | Shows/hides the header "AI · Thinking…"/"AI" badge. |
| `updateHeaderPlayer(player)` | Updates the header's current-player name and color dot. |

**Player cards**
| Function | Purpose |
|---|---|
| `buildPlayerCards(players)` | Places each player's card into its **fixed, color-matched slot** (Red→A/top-left, Green→B/top-right, Yellow→C/bottom-left, Blue→D/bottom-right) and hides slots for colors not in this match — so cards always sit near their actual board corner regardless of turn order or player count. |
| `buildPlayerCard(player)` | Builds one card's DOM (avatar, name, AI badge, 4 token-state dots, captures/home stat chips). |
| `refreshPlayerCards(players)` | Updates the existing cards' dots/stats in place (no rebuild) after a move. |
| `highlightActivePlayer(activePlayer)` | Clears every card's glow, then applies it to the current player's card. |

**Win screen**
| Function | Purpose |
|---|---|
| `onGameWon({ winner, elapsedMs, stats })` | Builds and shows the victory modal (trophy, stats, confetti, Play Again / Main Menu). |
| `winStatChip(iconClass, label, value)` | Small builder for one stat tile on the win screen. |

**Modals**
| Function | Purpose |
|---|---|
| `openHowToPlayModal()` | Static rules reference. |
| `openSettingsModal()` | Sound/Animations toggles, Reset Statistics, Clear Saved Match (both behind confirmation dialogs). |
| `buildToggleRow(iconClass, label, initialOn, onChange)` | Small builder for one on/off switch row. |
| `openStatisticsModal()` | Reads `StatsStore.load()` and displays it. |
| `statChip(iconClass, label, value)` | Small builder for one stat tile. |
| `openHistoryModal()` | Shows `state.lastHistory` (kept in sync by the `'history-updated'` event). |
| `openCreditsModal()` | About-the-creator + technology credits. |

**How to add a new screen:** Add its container to `index.html` (following
the `<main class="screen" hidden>` pattern), cache it in `cacheScreens()`,
and add a `showX()` function that calls `hideAllScreens()` then un-hides
it — following the exact pattern `showMainMenu`/`showSetupScreen` already
use.

**How to add a new modal:** Write one `openXModal()` function that builds
its content with `el(...)` and calls `Modal.openModal({ title, body })` —
copy the shape of any existing `open*Modal` function.

---

## Testing changes

There's no test framework wired into the shipped game (per the "no
Node.js" constraint), but if you're changing board geometry or turn
rules, it's worth writing a short throwaway Node script that loads
`utils.js` + `board.js` (or + `game.js`) into a minimal `window` shim and
asserts things like "each color's start square sits next to its own
yard" or "the home-stretch's last cell is adjacent to the center" —
that's exactly how the corner-swap bug fixed in this version was caught
and verified before shipping. Delete the script afterward; it's a
development aid, not part of the product.

## Security notes for contributors

- Never use `innerHTML`, `eval()`, `new Function()`, or `document.write()` anywhere in this codebase — build DOM with `el(...)` from `utils.js` instead. This is enforced by convention, not tooling, so please keep it that way in reviews.
- Don't add new external `<script src>`/CDN dependencies without a good reason — the project's whole pitch is "open `index.html`, nothing else needed," and every added dependency is one more thing that can go down or change behavior outside your control.
