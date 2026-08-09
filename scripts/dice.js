"use strict";

(function () {
  const { el } = window.Ludo.Utils;

  const FACE_ROTATION = {
    1: { x: 0, y: 0 },
    2: { x: 0, y: -90 },
    3: { x: -90, y: 0 },
    4: { x: 90, y: 0 },
    5: { x: 0, y: 90 },
    6: { x: 0, y: 180 },
  };

  const PIP_LAYOUTS = {
    1: [[50, 50]],
    2: [
      [25, 25],
      [75, 75],
    ],
    3: [
      [25, 25],
      [50, 50],
      [75, 75],
    ],
    4: [
      [25, 25],
      [75, 25],
      [25, 75],
      [75, 75],
    ],
    5: [
      [25, 25],
      [75, 25],
      [50, 50],
      [25, 75],
      [75, 75],
    ],
    6: [
      [25, 22],
      [75, 22],
      [25, 50],
      [75, 50],
      [25, 78],
      [75, 78],
    ],
  };

  function fairD6() {
    const range = 6;
    const maxUint32 = 0xffffffff;
    const limit = maxUint32 - (maxUint32 % range);
    const buf = new Uint32Array(1);
    let value;
    do {
      window.crypto.getRandomValues(buf);
      value = buf[0];
    } while (value >= limit);
    return (value % range) + 1;
  }

  function buildFace(value, faceName) {
    const face = el("div", { className: `die-face die-face-${faceName}` });
    PIP_LAYOUTS[value].forEach(([top, left]) => {
      face.appendChild(
        el("span", {
          className: "die-pip",
          attrs: { style: `top:${top}%; left:${left}%;` },
        }),
      );
    });
    return face;
  }

  function withTransform(node, transform) {
    node.style.transform = transform;
    return node;
  }

  class Dice {
    /** @param {HTMLElement} mountEl - container the dice cube renders into */
    constructor(mountEl) {
      this.mountEl = mountEl;
      this.value = 1;
      this._rolling = false;
      this._x = 0;
      this._y = 0;
      this._buildDom();
    }

    _buildDom() {
      this.stage = el("div", {
        className: "die-stage",
        attrs: { role: "img", "aria-label": `Die showing ${this.value}` },
      });
      this.cube = el("div", { className: "die-cube" });
      this.cube.appendChild(
        withTransform(buildFace(1, "front"), "translateZ(38px)"),
      );
      this.cube.appendChild(
        withTransform(buildFace(6, "back"), "rotateY(180deg) translateZ(38px)"),
      );
      this.cube.appendChild(
        withTransform(buildFace(2, "right"), "rotateY(90deg) translateZ(38px)"),
      );
      this.cube.appendChild(
        withTransform(buildFace(5, "left"), "rotateY(-90deg) translateZ(38px)"),
      );
      this.cube.appendChild(
        withTransform(buildFace(3, "top"), "rotateX(90deg) translateZ(38px)"),
      );
      this.cube.appendChild(
        withTransform(
          buildFace(4, "bottom"),
          "rotateX(-90deg) translateZ(38px)",
        ),
      );
      this.stage.appendChild(this.cube);
      this.mountEl.replaceChildren(this.stage);
    }

    get isRolling() {
      return this._rolling;
    }

    roll({ animationsEnabled = true } = {}) {
      if (this._rolling)
        return Promise.reject(new Error("Dice is already rolling"));
      this._rolling = true;
      const result = fairD6();
      window.Ludo.sound.diceRoll();
      this.stage.classList.add("die-rolling");

      if (!animationsEnabled || !window.anime) {
        this._settleInstant(result);
        this._rolling = false;
        this.stage.classList.remove("die-rolling");
        return Promise.resolve(result);
      }

      const target = FACE_ROTATION[result];
      const spins = 2;
      const targetX = this._x + spins * 360 + target.x - (this._x % 360);
      const targetY = this._y + spins * 360 + target.y - (this._y % 360);

      return new Promise((resolve) => {
        window.anime({
          targets: this.cube,
          rotateX: [this._x, targetX],
          rotateY: [this._y, targetY],
          duration: 700,
          easing: "easeOutCubic",
          complete: () => {
            this._x = target.x;
            this._y = target.y;
            this.value = result;
            this.stage.setAttribute("aria-label", `Die showing ${result}`);
            this.stage.classList.remove("die-rolling");
            this.stage.classList.add("die-landed");
            window.anime({
              targets: this.stage,
              scale: [1, 1.12, 1],
              duration: 320,
              easing: "easeOutElastic(1, .6)",
              complete: () => this.stage.classList.remove("die-landed"),
            });
            this._rolling = false;
            resolve(result);
          },
        });
      });
    }

    _settleInstant(result) {
      const target = FACE_ROTATION[result];
      this._x = target.x;
      this._y = target.y;
      this.value = result;
      this.cube.style.transform = `rotateX(${target.x}deg) rotateY(${target.y}deg)`;
      this.stage.setAttribute("aria-label", `Die showing ${result}`);
    }
  }

  window.Ludo.Dice = Dice;
})();
