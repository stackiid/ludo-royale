"use strict";

(function () {
  const { formatDuration } = window.Ludo.Utils;

  class MatchTimer {
    /** @param {(formatted: string, elapsedMs: number) => void} onTick */
    constructor(onTick) {
      this._onTick = onTick;
      this._startedAt = null;
      this._elapsedBeforePause = 0;
      this._running = false;
      this._rafId = null;
      this._lastRenderedSecond = -1;
    }

    start(resumeElapsedMs = 0) {
      this._elapsedBeforePause = resumeElapsedMs;
      this._startedAt = performance.now();
      this._running = true;
      this._lastRenderedSecond = -1;
      this._loop();
    }

    stop() {
      this._running = false;
      if (this._rafId) cancelAnimationFrame(this._rafId);
      this._rafId = null;
      return this.getElapsedMs();
    }

    reset() {
      this.stop();
      this._elapsedBeforePause = 0;
      this._startedAt = null;
      this._onTick(formatDuration(0), 0);
    }

    getElapsedMs() {
      if (!this._running || this._startedAt === null)
        return this._elapsedBeforePause;
      return this._elapsedBeforePause + (performance.now() - this._startedAt);
    }

    _loop() {
      if (!this._running) return;
      const elapsed = this.getElapsedMs();
      const second = Math.floor(elapsed / 1000);
      if (second !== this._lastRenderedSecond) {
        this._lastRenderedSecond = second;
        this._onTick(formatDuration(elapsed), elapsed);
      }
      this._rafId = requestAnimationFrame(() => this._loop());
    }
  }

  window.Ludo.MatchTimer = MatchTimer;
})();
