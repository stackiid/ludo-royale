"use strict";

(function () {
  window.Ludo = window.Ludo || {};

  /** Canonical player identity data, in clockwise turn order: Red -> Green -> Blue -> Yellow. */
  const PLAYER_COLORS = ["red", "green", "blue", "yellow"];

  const PLAYER_META = Object.freeze({
    red: {
      label: "Red",
      hex: "#ef4444",
      hexSoft: "rgba(239,68,68,0.18)",
      icon: "fa-solid fa-fire",
    },
    green: {
      label: "Green",
      hex: "#22c55e",
      hexSoft: "rgba(34,197,94,0.18)",
      icon: "fa-solid fa-shield-halved",
    },
    yellow: {
      label: "Yellow",
      hex: "#eab308",
      hexSoft: "rgba(234,179,8,0.18)",
      icon: "fa-solid fa-bolt",
    },
    blue: {
      label: "Blue",
      hex: "#3b82f6",
      hexSoft: "rgba(59,130,246,0.18)",
      icon: "fa-solid fa-star",
    },
  });

  const TOKENS_PER_PLAYER = 4;
  const COMMON_TRACK_LENGTH = 52;
  const HOME_STRETCH_LENGTH = 6;
  const TOTAL_STEPS_TO_FINISH = 57;
  const SIX = 6;
  const MAX_CONSECUTIVE_SIXES = 3;

  const TOKEN_STATE = Object.freeze({
    BASE: "base",
    ACTIVE: "active",
    HOME: "home",
  });

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const randInt = (min, max) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) =>
    Array.from(root.querySelectorAll(selector));

  /** Creates an element with attributes/props in one call. Never uses innerHTML. */
  function el(tag, options = {}, children = []) {
    const node = document.createElement(tag);
    const { className, attrs, dataset, text } = options;
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    if (attrs) {
      for (const [key, value] of Object.entries(attrs)) {
        if (value !== null && value !== undefined)
          node.setAttribute(key, value);
      }
    }
    if (dataset) {
      for (const [key, value] of Object.entries(dataset))
        node.dataset[key] = value;
    }
    for (const child of children) {
      if (child) node.appendChild(child);
    }
    return node;
  }

  /** Font Awesome icon factory */
  function icon(classes, extraClass = "") {
    return el("i", {
      className: `${classes} ${extraClass}`.trim(),
      attrs: { "aria-hidden": "true" },
    });
  }

  function debounce(fn, wait = 150) {
    let timer = null;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), wait);
    };
  }

  function throttle(fn, limit = 100) {
    let waiting = false;
    return (...args) => {
      if (waiting) return;
      fn(...args);
      waiting = true;
      setTimeout(() => {
        waiting = false;
      }, limit);
    };
  }

  function formatDuration(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }

  function formatDurationShort(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes <= 0) return `${seconds}s`;
    return `${minutes}m ${seconds}s`;
  }

  /** Tiny pub/sub event bus so modules never need to reach into each other directly */
  class EventBus {
    constructor() {
      this._listeners = new Map();
    }
    on(event, handler) {
      if (!this._listeners.has(event)) this._listeners.set(event, new Set());
      this._listeners.get(event).add(handler);
      return () => this.off(event, handler);
    }
    off(event, handler) {
      this._listeners.get(event)?.delete(handler);
    }
    emit(event, payload) {
      this._listeners.get(event)?.forEach((handler) => {
        try {
          handler(payload);
        } catch (err) {
          console.error(`[EventBus] handler for "${event}" failed:`, err);
        }
      });
    }
  }

  function uid(prefix = "id") {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function prefersReducedMotion() {
    return (
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  window.Ludo.Utils = {
    PLAYER_COLORS,
    PLAYER_META,
    TOKENS_PER_PLAYER,
    COMMON_TRACK_LENGTH,
    HOME_STRETCH_LENGTH,
    TOTAL_STEPS_TO_FINISH,
    SIX,
    MAX_CONSECUTIVE_SIXES,
    TOKEN_STATE,
    clamp,
    randInt,
    qs,
    qsa,
    el,
    icon,
    debounce,
    throttle,
    formatDuration,
    formatDurationShort,
    EventBus,
    uid,
    prefersReducedMotion,
  };
})();
