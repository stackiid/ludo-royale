"use strict";

(function () {
  const { el, prefersReducedMotion } = window.Ludo.Utils;

  const motionAllowed = (enabled) =>
    enabled && !prefersReducedMotion() && !!window.anime;

  /** Moves a token DOM element tile-by-tile along a list of cell layer targets. Never teleports. */
  function animateTokenPath(
    tokenEl,
    cellLayers,
    { enabled = true, onStep = null } = {},
  ) {
    return new Promise((resolve) => {
      if (cellLayers.length === 0) return resolve();

      if (!motionAllowed(enabled)) {
        const last = cellLayers[cellLayers.length - 1];
        last.appendChild(tokenEl);
        onStep && onStep(cellLayers.length - 1);
        return resolve();
      }

      let i = 0;
      const step = () => {
        if (i >= cellLayers.length) return resolve();
        const layer = cellLayers[i];
        const rectBefore = tokenEl.getBoundingClientRect();
        layer.appendChild(tokenEl);
        const rectAfter = layer.getBoundingClientRect();
        const dx = rectBefore.left - rectAfter.left;
        const dy = rectBefore.top - rectAfter.top;

        window.anime({
          targets: tokenEl,
          translateX: [dx, 0],
          translateY: [dy, 0],
          scale: [1, 1.18, 1],
          duration: 190,
          easing: "easeOutQuad",
          complete: () => {
            onStep && onStep(i);
            i += 1;
            step();
          },
        });
      };
      step();
    });
  }

  function pulseLanding(tokenEl, { enabled = true } = {}) {
    if (!motionAllowed(enabled)) return Promise.resolve();
    return window.anime({
      targets: tokenEl,
      scale: [1, 1.35, 1],
      duration: 320,
      easing: "easeOutElastic(1, .55)",
    }).finished;
  }

  function animateCapture(tokenEl, { enabled = true } = {}) {
    if (!motionAllowed(enabled)) return Promise.resolve();
    return window.anime({
      targets: tokenEl,
      translateX: [0, -6, 6, -4, 4, 0],
      scale: [1, 0.6],
      duration: 420,
      easing: "easeInOutQuad",
    }).finished;
  }

  function pulseActivePlayer(cardEl, { enabled = true } = {}) {
    cardEl.classList.add("is-active-player");
    if (!motionAllowed(enabled)) return;
    window.anime({
      targets: cardEl,
      boxShadow: [
        "0 0 0 rgba(59,130,246,0)",
        "0 0 26px rgba(59,130,246,0.55)",
        "0 0 0 rgba(59,130,246,0)",
      ],
      duration: 1600,
      easing: "easeInOutSine",
      loop: true,
    });
  }

  function clearActivePlayerPulse(cardEl) {
    cardEl.classList.remove("is-active-player");
    if (window.anime) window.anime.remove(cardEl);
    cardEl.style.boxShadow = "";
  }

  function staggerIn(targets, { enabled = true, delay = 60 } = {}) {
    if (!motionAllowed(enabled)) return;
    window.anime({
      targets,
      opacity: [0, 1],
      translateY: [16, 0],
      duration: 480,
      delay: window.anime.stagger(delay),
      easing: "easeOutCubic",
    });
  }

  function fadeIn(targetEl, { enabled = true, duration = 260 } = {}) {
    if (!motionAllowed(enabled)) {
      targetEl.style.opacity = "1";
      return Promise.resolve();
    }
    targetEl.style.opacity = "0";
    return window.anime({
      targets: targetEl,
      opacity: [0, 1],
      duration,
      easing: "easeOutQuad",
    }).finished;
  }

  function fadeOut(targetEl, { enabled = true, duration = 200 } = {}) {
    if (!motionAllowed(enabled)) {
      targetEl.style.opacity = "0";
      return Promise.resolve();
    }
    return window.anime({
      targets: targetEl,
      opacity: [1, 0],
      duration,
      easing: "easeInQuad",
    }).finished;
  }

  function countdownBeat(targetEl, { enabled = true, shake = false } = {}) {
    if (!motionAllowed(enabled)) return Promise.resolve();
    const translateX = shake ? [0, -8, 8, -6, 6, 0] : 0;
    return window.anime({
      targets: targetEl,
      scale: [0.4, 1.15, 1],
      opacity: [0, 1, 1, 0],
      translateX,
      duration: 900,
      easing: "easeOutExpo",
    }).finished;
  }

  /** Lightweight confetti/fireworks burst rendered as absolutely-positioned divs, cleaned up automatically */
  function burstCelebration(
    container,
    {
      enabled = true,
      particleCount = 60,
      colors = [
        "#3b82f6",
        "#22d3ee",
        "#fb923c",
        "#ef4444",
        "#84cc16",
        "#eab308",
      ],
    } = {},
  ) {
    const layer = el("div", {
      className: "celebration-layer",
      attrs: { "aria-hidden": "true" },
    });
    container.appendChild(layer);

    const particles = [];
    for (let i = 0; i < particleCount; i++) {
      const p = el("span", {
        className: "confetti-piece",
        attrs: {
          style: `left:${50 + (Math.random() * 20 - 10)}%; top:40%; background:${colors[i % colors.length]};`,
        },
      });
      layer.appendChild(p);
      particles.push(p);
    }

    if (!motionAllowed(enabled) || !window.anime) {
      setTimeout(() => layer.remove(), 50);
      return;
    }

    particles.forEach((p) => {
      const angle = Math.random() * Math.PI * 2;
      const distance = 120 + Math.random() * 220;
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance - 80;
      window.anime({
        targets: p,
        translateX: dx,
        translateY: [0, dy, dy + 260],
        rotate: Math.random() * 720 - 360,
        opacity: [1, 1, 0],
        duration: 1800 + Math.random() * 900,
        easing: "easeOutQuad",
      });
    });

    setTimeout(() => layer.remove(), 3200);
  }

  window.Ludo.Animation = {
    animateTokenPath,
    pulseLanding,
    animateCapture,
    pulseActivePlayer,
    clearActivePlayerPulse,
    staggerIn,
    fadeIn,
    fadeOut,
    countdownBeat,
    burstCelebration,
  };
})();
