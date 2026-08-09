"use strict";

(function () {
  const KEYS = Object.freeze({
    STATS: "ludo.stats.v1",
    SAVE: "ludo.save.v1",
    SETTINGS: "ludo.settings.v1",
  });

  const DEFAULT_STATS = Object.freeze({
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    fastestWinMs: null,
    longestMatchMs: null,
    totalDurationMs: 0,
    completedMatches: 0,
  });

  const DEFAULT_SETTINGS = Object.freeze({
    soundEnabled: true,
    animationsEnabled: true,
  });

  function safeGet(key) {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      console.warn(`[storage] failed to read "${key}":`, err);
      return null;
    }
  }

  function safeSet(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.warn(`[storage] failed to write "${key}":`, err);
      return false;
    }
  }

  function safeRemove(key) {
    try {
      window.localStorage.removeItem(key);
    } catch (err) {
      console.warn(`[storage] failed to remove "${key}":`, err);
    }
  }

  const StatsStore = {
    load() {
      return { ...DEFAULT_STATS, ...(safeGet(KEYS.STATS) || {}) };
    },
    save(stats) {
      return safeSet(KEYS.STATS, stats);
    },
    reset() {
      safeSet(KEYS.STATS, DEFAULT_STATS);
      return { ...DEFAULT_STATS };
    },
    recordMatch({ won, durationMs }) {
      const stats = this.load();
      stats.gamesPlayed += 1;
      stats.completedMatches += 1;
      if (won) stats.wins += 1;
      else stats.losses += 1;
      stats.totalDurationMs += durationMs;
      if (
        won &&
        (stats.fastestWinMs === null || durationMs < stats.fastestWinMs)
      )
        stats.fastestWinMs = durationMs;
      if (stats.longestMatchMs === null || durationMs > stats.longestMatchMs)
        stats.longestMatchMs = durationMs;
      this.save(stats);
      return stats;
    },
  };

  const SettingsStore = {
    load() {
      return { ...DEFAULT_SETTINGS, ...(safeGet(KEYS.SETTINGS) || {}) };
    },
    save(settings) {
      return safeSet(KEYS.SETTINGS, settings);
    },
  };

  const SaveGameStore = {
    load() {
      return safeGet(KEYS.SAVE);
    },
    save(snapshot) {
      return safeSet(KEYS.SAVE, { ...snapshot, savedAt: Date.now() });
    },
    clear() {
      safeRemove(KEYS.SAVE);
    },
    hasSave() {
      return !!safeGet(KEYS.SAVE);
    },
  };

  window.Ludo.Storage = { StatsStore, SettingsStore, SaveGameStore };
})();
