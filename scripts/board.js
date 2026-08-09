"use strict";

(function () {
  const { PLAYER_COLORS, PLAYER_META, el, icon } = window.Ludo.Utils;

  const GRID_SIZE = 15;

  const COMMON_PATH = [
    [6, 1],
    [6, 2],
    [6, 3],
    [6, 4],
    [6, 5],
    [5, 6],
    [4, 6],
    [3, 6],
    [2, 6],
    [1, 6],
    [0, 6],
    [0, 7],
    [0, 8],
    [1, 8],
    [2, 8],
    [3, 8],
    [4, 8],
    [5, 8],
    [6, 9],
    [6, 10],
    [6, 11],
    [6, 12],
    [6, 13],
    [6, 14],
    [7, 14],
    [8, 14],
    [8, 13],
    [8, 12],
    [8, 11],
    [8, 10],
    [8, 9],
    [9, 8],
    [10, 8],
    [11, 8],
    [12, 8],
    [13, 8],
    [14, 8],
    [14, 7],
    [14, 6],
    [13, 6],
    [12, 6],
    [11, 6],
    [10, 6],
    [9, 6],
    [8, 5],
    [8, 4],
    [8, 3],
    [8, 2],
    [8, 1],
    [8, 0],
    [7, 0],
    [6, 0],
  ];

  const START_INDEX = { red: 0, green: 13, blue: 26, yellow: 39 };

  /** Star safe squares in addition to the four start squares */
  const STAR_OFFSETS = [8];

  const HOME_STRETCH = {
    red: [
      [7, 1],
      [7, 2],
      [7, 3],
      [7, 4],
      [7, 5],
      [7, 6],
    ],
    green: [
      [1, 7],
      [2, 7],
      [3, 7],
      [4, 7],
      [5, 7],
      [6, 7],
    ],
    blue: [
      [7, 13],
      [7, 12],
      [7, 11],
      [7, 10],
      [7, 9],
      [7, 8],
    ],
    yellow: [
      [13, 7],
      [12, 7],
      [11, 7],
      [10, 7],
      [9, 7],
      [8, 7],
    ],
  };

  /** Base "yard" anchor (top-left corner of the 6x6 quadrant) for each color */
  const YARD_ORIGIN = {
    red: [0, 0],
    green: [0, 9],
    blue: [9, 9],
    yellow: [9, 0],
  };

  /** Slots inside each yard where the 4 idle tokens sit (relative to yard origin) */
  const YARD_SLOTS = [
    [1, 1],
    [1, 3.2],
    [3.2, 1],
    [3.2, 3.2],
  ];

  /** Center home-triangle cell */
  const CENTER_CELL = [7, 7];

  const coordKey = ([r, c]) => `${r},${c}`;

  function buildSafeSquareSet() {
    const set = new Set();
    for (const color of PLAYER_COLORS) {
      const start = START_INDEX[color];
      set.add(coordKey(COMMON_PATH[start]));
      for (const offset of STAR_OFFSETS) {
        set.add(coordKey(COMMON_PATH[(start + offset) % COMMON_PATH.length]));
      }
    }
    return set;
  }

  const SAFE_SQUARES = buildSafeSquareSet();

  function stepsToCoord(color, steps) {
    if (steps <= 0) return null;
    if (steps <= 51) {
      const idx = (START_INDEX[color] + steps - 1) % COMMON_PATH.length;
      return COMMON_PATH[idx];
    }
    const stretchIdx = steps - 52;
    if (stretchIdx < HOME_STRETCH[color].length)
      return HOME_STRETCH[color][stretchIdx];
    return CENTER_CELL;
  }

  function startCoord(color) {
    return COMMON_PATH[START_INDEX[color]];
  }

  function isSafeSteps(color, steps) {
    if (steps <= 0 || steps > 51) return true;
    const coord = stepsToCoord(color, steps);
    return SAFE_SQUARES.has(coordKey(coord));
  }

  function yardCoord(color, tokenIndex) {
    const [oy, ox] = YARD_ORIGIN[color];
    const [sy, sx] = YARD_SLOTS[tokenIndex];
    return [oy + sy, ox + sx];
  }

  function renderBoard(container) {
    container.replaceChildren();
    const grid = el("div", {
      className: "ludo-grid",
      attrs: { role: "group", "aria-label": "Ludo board" },
    });

    const cellMap = new Map();
    const occupied = new Set(COMMON_PATH.map(coordKey));
    for (const color of PLAYER_COLORS) {
      HOME_STRETCH[color].forEach((c) => occupied.add(coordKey(c)));
    }
    occupied.add(coordKey(CENTER_CELL));

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const key = coordKey([r, c]);
        if (!occupied.has(key)) continue;

        const cell = el("div", {
          className: "board-cell",
          attrs: {
            "data-r": r,
            "data-c": c,
            style: `grid-row:${r + 1};grid-column:${c + 1};`,
          },
        });

        if (r === CENTER_CELL[0] && c === CENTER_CELL[1]) {
          cell.classList.add("cell-home-center");
          cell.appendChild(buildHomeTriangle());
        } else {
          const homeColor = colorOfHomeStretchCell(r, c);
          if (homeColor)
            cell.classList.add("cell-home-stretch", `stretch-${homeColor}`);

          const startColor = colorOfStartCell(r, c);
          if (startColor) {
            cell.classList.add("cell-start", `start-${startColor}`);
            cell.appendChild(icon(PLAYER_META[startColor].icon, "start-icon"));
          }
          if (SAFE_SQUARES.has(key) && !startColor) {
            cell.classList.add("cell-safe");
            cell.appendChild(icon("fa-solid fa-star", "safe-icon"));
          }
        }

        const tokenLayer = el("div", { className: "token-layer" });
        cell.appendChild(tokenLayer);
        grid.appendChild(cell);
        cellMap.set(key, { cell, tokenLayer });
      }
    }

    for (const color of PLAYER_COLORS) {
      const [oy, ox] = YARD_ORIGIN[color];
      const yardInner = el("div", { className: "yard-inner" });
      const yard = el(
        "div",
        {
          className: `board-yard yard-${color}`,
          attrs: {
            style: `grid-row:${oy + 1} / span 6; grid-column:${ox + 1} / span 6;`,
            role: "img",
            "aria-label": `${PLAYER_META[color].label} home base`,
          },
        },
        [yardInner],
      );

      YARD_SLOTS.forEach((slot, i) => {
        const [sy, sx] = slot;
        const tokenLayer = el("div", { className: "token-layer" });
        const slotEl = el(
          "div",
          {
            className: "yard-slot",
            attrs: {
              style: `top:${(sy / 6) * 100}%; left:${(sx / 6) * 100}%;`,
            },
          },
          [tokenLayer],
        );
        yardInner.appendChild(slotEl);
        cellMap.set(coordKey(yardCoord(color, i)), {
          cell: slotEl,
          tokenLayer,
        });
      });

      grid.appendChild(yard);
    }

    container.appendChild(grid);
    return cellMap;
  }

  /** Spatial (visual) corner order for the 2x2 home-triangle quadrants: TL, TR, BL, BR. */
  const SPATIAL_CORNER_ORDER = ["red", "green", "yellow", "blue"];

  function buildHomeTriangle() {
    const wrap = el("div", {
      className: "home-triangle",
      attrs: { "aria-hidden": "true" },
    });
    for (const color of SPATIAL_CORNER_ORDER) {
      wrap.appendChild(el("div", { className: `triangle-quad quad-${color}` }));
    }
    wrap.appendChild(icon("fa-solid fa-trophy", "home-trophy-icon"));
    return wrap;
  }

  function colorOfHomeStretchCell(r, c) {
    for (const color of PLAYER_COLORS) {
      if (HOME_STRETCH[color].some(([hr, hc]) => hr === r && hc === c))
        return color;
    }
    return null;
  }

  function colorOfStartCell(r, c) {
    for (const color of PLAYER_COLORS) {
      const [sr, sc] = startCoord(color);
      if (sr === r && sc === c) return color;
    }
    return null;
  }

  window.Ludo.Board = {
    stepsToCoord,
    startCoord,
    isSafeSteps,
    yardCoord,
    coordKey,
    renderBoard,
    START_INDEX,
    COMMON_PATH,
    HOME_STRETCH,
    YARD_ORIGIN,
  };
})();
