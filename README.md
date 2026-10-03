# Ludo Royale

![HTML5](https://img.shields.io/badge/HTML-5-E34F26)
![CSS3](https://img.shields.io/badge/CSS-3-1572B6)
![JavaScript](https://img.shields.io/badge/JavaScript-vanilla-F7DF1E)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-CDN-06B6D4)
![Anime.js](https://img.shields.io/badge/Anime.js-3.2.2-ED4E50)
![License](https://img.shields.io/badge/license-MIT-green)

A browser-based Ludo board game for two to four players, built with vanilla JavaScript, HTML5, and CSS3. It runs entirely on the client with no backend, includes AI opponents, an animated 3D dice, procedurally generated sound effects, a match timer, local statistics, and automatic save and resume.

## Live Demo

[https://stackiid.github.io/ludo-royale/](https://stackiid.github.io/ludo-royale/)

## Table of Contents

- [Features](#features)
- [Game Rules](#game-rules)
- [How to Play](#how-to-play)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Architecture](#architecture)
- [Data Storage](#data-storage)
- [Accessibility](#accessibility)
- [SEO](#seo)
- [Performance Considerations](#performance-considerations)
- [Known Limitations](#known-limitations)
- [Documentation and Legal](#documentation-and-legal)
- [License](#license)
- [Author](#author)
- [Acknowledgements](#acknowledgements)

## Features

- Two, three, or four player matches, with each seat set to Human or AI and a custom name of up to 16 characters
- Rules engine covering exact-roll finishing, captures, safe squares, six-to-exit, extra turn on a six, a three-sixes penalty, and blockades
- AI opponents that pause for 0.6 to 1.2 seconds before rolling and choose moves with a scoring heuristic (captures first, then reaching home, leaving the base, and landing on safe squares)
- CSS 3D dice animated with Anime.js, with results drawn through the Web Crypto API using rejection sampling so each face is equally likely
- Tile-by-tile token movement, landing and capture effects, an active-player highlight, and a "Get Ready, Prepare, Almost There, GO!" countdown at the start of a match
- Confetti celebration on the victory screen
- Sound effects synthesized at runtime with the Web Audio API, so the repository contains no audio files
- Match timer in HH:MM:SS shown in the header and on the victory screen
- Heads-up display with player cards that show remaining tokens, captures made, and tokens home, plus a move history dialog
- Statistics for games played, wins, losses, fastest win, longest match, and average duration
- Automatic save after every turn, with a Resume Match button on the main menu
- Confirmation dialogs for destructive actions such as restarting, leaving a match, resetting statistics, and clearing a saved match
- Settings for sound and animations
- Responsive layout that places each player's card near their color's corner of the board

## Game Rules

| Rule | Behavior in this game |
| --- | --- |
| Turn order | Red, Green, Blue, Yellow, clockwise. Two-player matches use Red and Blue; three-player matches use Red, Green, and Blue |
| Board corners | Red top-left, Green top-right, Blue bottom-right, Yellow bottom-left |
| Tokens | Four per player, starting in the base |
| Leaving the base | Requires a roll of 6; the token moves to its color's start square |
| Extra turn | A roll of 6 grants another roll, including when no move is possible |
| Three sixes | Rolling three sixes in a row forfeits the turn |
| Movement | Clockwise around the shared 52-square track, then into the color's own six-square home column |
| Finishing | A token must reach home with an exact roll; a roll that would overshoot is not a legal move |
| Safe squares | Each color's start square plus one star square per quadrant. Tokens on safe squares cannot be captured |
| Capture | Landing on an opponent token on an unsafe track square sends it back to its base |
| Blockade | Two or more tokens of one color on a square block opponents from landing on or passing that square |
| Winning | The first player to bring all four tokens home wins |

When more than one move is legal, a human player clicks the highlighted token to move. If only one move is legal it is played automatically.

## How to Play

1. Choose **Play** from the main menu and select two, three, or four players.
2. Set each seat to Human or AI and enter names. At least one seat must be Human; all-AI matches are not allowed.
3. Start the match and wait for the countdown.
4. On a human turn, press the roll button, then click a highlighted token if you have a choice of moves.
5. Your match saves automatically. Leave at any time and choose **Resume Match** from the main menu later.

## Tech Stack

| Category | Technology |
| --- | --- |
| Markup | HTML5 |
| Styling | Custom CSS with design tokens, plus Tailwind CSS through the Play CDN script for utilities |
| Scripting | Vanilla JavaScript, organized as plain scripts on a shared `window.Ludo` namespace |
| Animation | Anime.js 3.2.2, loaded from cdnjs |
| Audio | Web Audio API (procedural sound effects) |
| Randomness | Web Crypto API for dice rolls |
| Fonts | Google Fonts: Space Grotesk (display) and Inter (body) |
| Icons | Font Awesome 6.5.2, loaded from cdnjs |
| Storage | Browser `localStorage` |
| Build tooling | None |

## Project Structure

```text
ludo-royale/
|-- assets/
|   |-- icons/
|   |   `-- README.md       # Notes: icons come from Font Awesome
|   |-- images/
|   |   `-- README.md       # Notes: visuals are drawn with CSS and DOM elements
|   |-- sounds/
|   |   `-- README.md       # Notes: sounds are generated at runtime
|   `-- favicon.svg
|-- docs/
|   `-- ARCHITECTURE.md     # File-by-file code reference
|-- legal/
|   |-- PRIVACY.md
|   `-- TERMS.md
|-- pages/
|   `-- legal.html          # Terms and Privacy rendered as a page
|-- scripts/
|   |-- ai.js               # AI move scoring
|   |-- animation.js        # Anime.js animations
|   |-- app.js              # Screens, menus, HUD, and modals
|   |-- board.js            # Board geometry and rendering
|   |-- dice.js             # 3D dice and fair random rolls
|   |-- game.js             # Rules engine and turn flow
|   |-- modal.js            # Dialog and confirmation system
|   |-- player.js           # Player and token models
|   |-- sound.js            # Web Audio sound effects
|   |-- storage.js          # localStorage wrapper
|   |-- timer.js            # Match timer
|   `-- utils.js            # Shared constants and DOM helpers
|-- styles/
|   `-- style.css           # Design tokens, components, and responsive rules
|-- index.html              # Entry point with the splash, menu, setup, and game screens
|-- LICENSE                 # MIT License
`-- README.md
```

## Prerequisites

- A modern web browser with support for `localStorage`, the Web Audio API, and the Web Crypto API
- An internet connection, because Tailwind CSS, Anime.js, Font Awesome, and Google Fonts are loaded from external hosts
- Optional: Python 3, if you prefer to serve the game through a local web server

## Getting Started

Clone the repository and move into it:

```bash
git clone https://github.com/stackiid/ludo-royale.git
cd ludo-royale
```

Open `index.html` directly in a browser, or serve the folder locally:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

There are no packages to install and no build step. The scripts are plain `<script>` files rather than ES modules, so the game also works when `index.html` is opened from the file system.

## Architecture

The code is split into single-purpose files that attach their public API to one shared `window.Ludo` object. The load order in `index.html` matters: each script reads the namespace as soon as it runs, so `utils.js` loads first and `app.js` loads last.

| Layer | Files | Responsibility |
| --- | --- | --- |
| Rules | `game.js`, `board.js`, `player.js`, `ai.js` | Board geometry, legal moves, captures, blockades, turn flow, and AI choice, with no screen or menu logic |
| Presentation | `app.js`, `modal.js`, `animation.js`, `dice.js`, `sound.js` | Screens, menus, HUD, dialogs, animation, and audio |
| Support | `utils.js`, `storage.js`, `timer.js` | Shared helpers, persistence, and the match clock |

`game.js` communicates with the interface through an event bus (`game.bus`), and `app.js` listens to those events to update the screen. Board squares are addressed by a token's step count: step 0 is the base, steps 1 to 51 are on the shared track, and steps 52 to 57 are in the home column, where step 57 is home.

For a function-by-function reference, see [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

## Data Storage

The game stores three items in the browser's `localStorage` and sends nothing over the network:

| Key | Contents |
| --- | --- |
| `ludo.stats.v1` | Games played, wins, losses, fastest win, longest match, and total duration |
| `ludo.settings.v1` | Sound and animation preferences |
| `ludo.save.v1` | Snapshot of the match in progress, replaced after each turn and cleared when the match ends |

All reads and writes go through `scripts/storage.js` and are wrapped in `try/catch` so a storage error does not stop the game.

## Accessibility

Implemented practices visible in the code:

- `lang="en"` on the root element
- `aria-label` on icon-only buttons and the board, with `aria-hidden` on decorative icons
- `aria-live` on the current-player display and `role="alert"` on setup errors
- Dialogs that trap keyboard focus and close with the Escape key
- Tokens that are focusable and can be selected with Enter or Space
- Visible focus styles
- Support for `prefers-reduced-motion` and `prefers-contrast` in the stylesheet, and an Animations switch in Settings
- Text labels alongside player colors, since each player card shows a name

No accessibility audit or WCAG conformance level is claimed.

## SEO

`index.html` includes a title, meta description, viewport meta tag (with `viewport-fit=cover`), and an SVG favicon. It does not include Open Graph tags, a canonical URL, a sitemap, or `robots.txt`.

## Performance Considerations

- Visuals are drawn with CSS and DOM elements, so the repository contains no image or audio files beyond the favicon
- The match timer runs on `requestAnimationFrame`, and the AI uses a single-move heuristic rather than a search
- The Tailwind Play CDN compiles styles in the browser at load time. It is intended for prototyping, and a compiled Tailwind build would be the usual choice for production

## Known Limitations

- There is no online or same-network multiplayer; all human players share one device
- AI difficulty is fixed and cannot be changed
- Win and loss statistics are recorded from the first Human seat's point of view, so a win by another human player in the same match counts as a loss in the statistics
- Statistics, settings, and saved matches live in one browser profile and are not shared between devices or browsers
- Only one saved match is kept at a time
- The game needs an internet connection to load its external libraries and fonts
- No automated tests are included

## Documentation and Legal

- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md): file-by-file code reference
- [legal/TERMS.md](./legal/TERMS.md): Terms and Conditions
- [legal/PRIVACY.md](./legal/PRIVACY.md): Privacy Policy
- [pages/legal.html](./pages/legal.html): the same documents as an in-app page, linked from the main menu

## License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.

Copyright (c) 2026 Ubaid Ahmad

## Author

Built by [Ubaid Ahmad](https://github.com/stackiid). Portfolio: [stackiid.github.io/portfolio](https://stackiid.github.io/portfolio/).

## Acknowledgements

- Animation library: [Anime.js](https://animejs.com)
- Styling utilities from [Tailwind CSS](https://tailwindcss.com)
- Typefaces from [Google Fonts](https://fonts.google.com): Space Grotesk and Inter
- Icons from [Font Awesome](https://fontawesome.com)
