# Ludo Royale

A premium, production-quality **Ludo** board game built with nothing but
HTML5, CSS3, Tailwind CSS, vanilla JavaScript (ES2023), and Anime.js. No
build step, no server, no dependencies to install - open `index.html` and
play.

---

## Project Overview

Ludo Royale implements the complete, authentic international Ludo ruleset
(exact-finish movement, capturing, safe squares, six-to-unlock, the
three-sixes penalty, blockades) with a modern glassmorphic dark UI, a fully
animated 3D dice, intelligent AI opponents, an official match timer, local
statistics tracking, and autosave/resume - all running entirely client-side
with zero external services, trackers, or analytics.

## Features

- **Authentic rules engine** - official international board geometry, exact-finish movement, capturing with safe-square protection, six-to-unlock, three-consecutive-sixes forfeiture, and blockade detection.
- **2–4 players**, any mix of Human and AI (1 human/3 AI, 2v2, 3v1, full human, or full AI).
- **Intelligent AI** - "thinks" for 600–1200ms, then prioritizes captures → reaching home → exiting base → safe movement → a sensible fallback move.
- **Premium 3D dice** - CSS-cube rendering, Anime.js roll animation, cryptographically fair randomness (Web Crypto, rejection-sampled).
- **Polished motion** - tile-by-tile token movement (never teleports), landing bounce/glow, capture shake, active-player pulse, entrance staggers, a full "Get Ready → Prepare → Almost There → GO" match-start cinematic, and a confetti/fireworks win celebration.
- **Procedural audio** - every sound effect is synthesized live via the Web Audio API (see `assets/sounds/README.md`), with a single shared `AudioContext`, instant mute, and no duplicate/overlapping playback.
- **Professional match timer** (HH:MM:SS) in the header, stored and shown on the victory screen.
- **Full HUD** - current player, dice value, remaining/captured tokens per player, move history, elapsed time.
- **Modal system** - focus-trapped, ESC-to-close, click-outside-to-close, scroll-locked, with dedicated confirmation dialogs for every destructive action (Quit, Restart, Reset Statistics, Return to Menu, New Game, Clear Save).
- **Statistics & autosave** - games played, wins, losses, fastest win, longest match, and average duration persisted to `localStorage`; the current match auto-saves after every turn and can be resumed from the main menu.
- **Responsive, mobile-first layout** - the board is always the centered hero element; player cards arrange around it per the official layout spec, from 320px phones up to ultra-wide desktops.
- **Accessibility** - full keyboard navigation, ARIA labels and live regions, visible focus states, `prefers-reduced-motion` and `prefers-contrast` support.

## Folder Structure

```
/
├── index.html
├── pages/
│   └── legal.html      # Live Terms & Privacy page (linked from the main menu)
├── docs/
│   └── ARCHITECTURE.md # Deep-dive: every JS file, every function, how to change things
├── legal/
│   ├── TERMS.md         # Terms & Conditions (source document)
│   └── PRIVACY.md       # Privacy Policy (source document)
├── styles/
│   └── style.css
├── scripts/
│   ├── app.js         # Screens, menus, HUD wiring, modals (composition root)
│   ├── board.js        # Authentic 15x15 board geometry + rendering
│   ├── dice.js          # 3D dice, fair RNG, roll animation
│   ├── player.js        # Player / Token domain models
│   ├── game.js           # Rules engine + turn orchestration
│   ├── animation.js       # Every Anime.js timeline, centralized
│   ├── sound.js            # Procedural Web Audio sound engine
│   ├── storage.js           # localStorage wrapper (stats/settings/save)
│   ├── timer.js               # Match timer
│   ├── modal.js                # Reusable modal/confirmation system
│   ├── ai.js                    # AI move-selection heuristics
│   └── utils.js                  # Shared constants & DOM helpers
├── assets/
│   ├── sounds/   (procedural - see README inside)
│   ├── icons/    (Font Awesome CDN - see README inside)
│   └── images/   (CSS/SVG rendered - see README inside)
├── README.md            # You are here
└── LICENSE.md           # Software license (all rights reserved, "as is", no liability)
```

## Installation

There is nothing to install. Download or clone the project, then:

```
open index.html
```

...or just double-click the file in your file browser. That's it - no
`npm install`, no build step, no local server required.

## Usage

1. **Play** from the main menu to configure 2–4 players, choose Human or AI
   for each seat, and name them.
2. Watch the match-start cinematic, then take turns rolling the dice.
3. When you have more than one legal move, click the glowing token you want
   to move.
4. First player to bring all four tokens home wins.
5. Your match auto-saves after every turn - quit anytime and resume later
   from the main menu.

## Technologies

- **HTML5** - semantic structure throughout
- **CSS3** - custom properties, CSS Grid, glassmorphism/neumorphism, 3D transforms
- **Tailwind CSS** (CDN) - utility layer for layout/spacing
- **Vanilla JavaScript (ES2023)** - no framework, no bundler
- **Anime.js** (CDN) - every animation timeline
- **Google Fonts** - Space Grotesk (display) + Inter (body)
- **Font Awesome** (CDN) - every icon in the app

A note on architecture: the app is organized into focused, single-responsibility
modules (one per file, as listed above), but they attach their public API to a
shared `window.Ludo` namespace rather than using native ES `import`/`export`.
This is a deliberate choice: browsers block `type="module"` script fetches
under the `file://` origin, which would break the "just open index.html"
requirement. Loading the same modular files as plain deferred scripts keeps
every other benefit of the module split while actually working when the file
is opened directly.

## Official Game Rules

- Turn order is fixed and clockwise: **Red → Green → Blue → Yellow**, matching the board's actual corners (Red top-left, Green top-right, Blue bottom-right, Yellow bottom-left). 2-player matches use the diagonal Red/Blue pair; 3-player matches use Red/Green/Blue.
- Each player has four tokens that start in their base (yard).
- Roll a **six** to move a token out of the base and onto its start square.
- Rolling a six also grants an **immediate extra turn**. Rolling three sixes
  in a row forfeits the turn entirely (no token moves).
- Tokens move clockwise around the shared 52-square track, then turn into
  their own 6-square home column, and must reach home with an **exact**
  roll - overshooting is not a legal move.
- **Safe squares** (each color's start square, plus one star square per
  quadrant) protect tokens from capture.
- Landing exactly on a single opponent token on an unsafe square **captures**
  it, sending it back to that player's base.
- Two or more tokens of the same color on one square form a **blockade**
  that opponents cannot pass or land on.
- The first player to bring all four tokens home **wins** the match.

## Documentation

This README covers the what and how-to-play. For a deep dive into the
codebase itself - what every file and function does, how the modules fit
together, and how to safely change a rule, an animation, or a screen -
see **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

## Legal

- **[legal/TERMS.md](legal/TERMS.md)** - Terms and Conditions
- **[legal/PRIVACY.md](legal/PRIVACY.md)** - Privacy Policy
- **[LICENSE.md](LICENSE.md)** - Software license: ownership, "as is" disclaimer, and limitation of liability
- **[pages/legal.html](pages/legal.html)** - the Terms & Privacy documents, rendered as a live in-app page (linked from the main menu footer and from Settings), since plain `.md` files don't render as readable pages on every static host without a build step

The short version of the Privacy Policy: there's no server, no accounts,
and no analytics. Everything the game remembers (settings, statistics,
your current match) lives only in your own browser's `localStorage` and is
never transmitted anywhere.

## Going Live

Ludo Royale is a fully static site - there's no build step and nothing to
compile, so "deploying" is just publishing these files as-is. A few
options:

- **GitHub Pages** - push this folder to a repo and enable Pages on the `main` branch (or a `docs/` folder). No configuration needed.
- **Netlify / Vercel / Cloudflare Pages** - drag-and-drop deploy or connect the repo; leave the build command empty and set the publish directory to the project root.
- **Any static file host** (S3 + CloudFront, nginx, etc.) - upload the folder as-is.

Before going live, it's worth doing a final pass on `legal/TERMS.md` /
`legal/PRIVACY.md` / `pages/legal.html` / `LICENSE.md` to fill in your own
contact details and jurisdiction if you've forked this project rather
than using it as-is.

## Screenshots

_Add screenshots here once you've captured them from a running match -
e.g. `docs/screenshot-menu.png`, `docs/screenshot-board.png`,
`docs/screenshot-win.png`._

## Future Improvements

- Optional local pass-and-play vs. online multiplayer (would require a
  server component, intentionally out of scope for this offline build).
- Selectable token skins / board themes.
- Adjustable AI difficulty levels.
- Per-player win/loss breakdown in Statistics (currently tracked from the
  primary human seat's perspective).
- Optional recorded sound pack alongside the procedural default (see
  `assets/sounds/README.md`).

## Credits & Author

Ludo Royale was designed and built end-to-end - architecture, rules
engine, board geometry, motion design, and UI - by:

**Ubaid Ahmad**
Full-Stack MERN Developer & UI/UX Designer, Computer Science student at
the University of Swabi. Ubaid builds full-stack web applications and
polished interfaces, with a focus on clean architecture and interfaces
that stay out of the user's way.

- Portfolio: [stackiid.github.io/portfolio](https://stackiid.github.io/portfolio/)
- GitHub: [@stackiid](https://github.com/stackiid)
- LinkedIn: [ubaidahmaddev](https://www.linkedin.com/in/ubaidahmaddev)
- Email: [iubaidahmad303@gmail.com](mailto:iubaidahmad303@gmail.com)

Built with the technologies listed above - full credit to the Tailwind
CSS, Anime.js, Font Awesome, and Google Fonts teams for the open tools
this project stands on. See the in-app **Credits** screen (main menu) for
the same information alongside the license badges for those projects.

## License

This project is licensed under an all-rights-reserved license with an
explicit "as is" disclaimer and limitation of liability - see
[LICENSE.md](LICENSE.md) for the full text, and
[legal/TERMS.md](legal/TERMS.md) for the plain-language Terms of use.
