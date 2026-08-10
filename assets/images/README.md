# Images

This folder is intentionally empty.

The board, tokens, dice, and every background effect (gradients, blobs,
particles, confetti) are rendered with **pure CSS and DOM elements** in
`styles/style.css` and built at runtime by `scripts/board.js` / `scripts/dice.js` /
`scripts/animation.js`. This keeps the entire visual layer resolution‑independent,
themeable through CSS custom properties, and free of binary image assets -
consistent with the "no unsafe/hidden assets, fully GitHub‑safe" requirement.

If you want to art‑direct a custom board skin or token set, this is the
folder to drop PNG/SVG assets into, then reference them from
`styles/style.css` (e.g. as `background-image` on `.board-cell` / `.token`).
