"use strict";

(function () {
  class SoundEngine {
    constructor() {
      this._ctx = null;
      this._muted = false;
      this._activeVoices = new Set();
    }

    setMuted(muted) {
      this._muted = muted;
    }
    isMuted() {
      return this._muted;
    }

    _ensureContext() {
      if (!this._ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this._ctx = new AudioCtx();
      }
      if (this._ctx.state === "suspended") this._ctx.resume();
      return this._ctx;
    }

    _cleanupVoice(nodes) {
      this._activeVoices.delete(nodes);
      nodes.forEach((n) => {
        try {
          n.disconnect();
        } catch (_) {
          /* already disconnected */
        }
      });
    }

    _tone({
      freq,
      duration = 0.15,
      type = "sine",
      gain = 0.18,
      sweepTo = null,
      delay = 0,
    }) {
      if (this._muted) return;
      const ctx = this._ensureContext();
      const t0 = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (sweepTo !== null)
        osc.frequency.exponentialRampToValueAtTime(
          Math.max(sweepTo, 1),
          t0 + duration,
        );
      gainNode.gain.setValueAtTime(0.0001, t0);
      gainNode.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
      osc.connect(gainNode).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + duration + 0.02);
      const nodes = [osc, gainNode];
      this._activeVoices.add(nodes);
      osc.onended = () => this._cleanupVoice(nodes);
    }

    _noiseBurst({
      duration = 0.12,
      gain = 0.12,
      delay = 0,
      filterFreq = 2500,
    }) {
      if (this._muted) return;
      const ctx = this._ensureContext();
      const t0 = ctx.currentTime + delay;
      const bufferSize = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++)
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = filterFreq;
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(gain, t0);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
      src.connect(filter).connect(gainNode).connect(ctx.destination);
      src.start(t0);
      src.stop(t0 + duration + 0.02);
      const nodes = [src, filter, gainNode];
      this._activeVoices.add(nodes);
      src.onended = () => this._cleanupVoice(nodes);
    }

    click() {
      this._tone({ freq: 720, duration: 0.06, type: "triangle", gain: 0.14 });
    }

    diceRoll() {
      for (let i = 0; i < 5; i++) {
        this._noiseBurst({
          duration: 0.07,
          gain: 0.1,
          delay: i * 0.07,
          filterFreq: 1800 + i * 300,
        });
      }
      this._tone({
        freq: 200,
        duration: 0.4,
        type: "sine",
        gain: 0.05,
        sweepTo: 90,
        delay: 0.35,
      });
    }

    tokenMove() {
      this._tone({
        freq: 520,
        duration: 0.09,
        type: "sine",
        gain: 0.12,
        sweepTo: 680,
      });
    }

    capture() {
      this._tone({
        freq: 660,
        duration: 0.12,
        type: "sawtooth",
        gain: 0.12,
        sweepTo: 220,
      });
      this._noiseBurst({
        duration: 0.18,
        gain: 0.14,
        delay: 0.02,
        filterFreq: 1200,
      });
    }

    tokenHome() {
      this._tone({ freq: 440, duration: 0.12, type: "sine", gain: 0.14 });
      this._tone({
        freq: 660,
        duration: 0.16,
        type: "sine",
        gain: 0.12,
        delay: 0.1,
      });
    }

    victory() {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) =>
        this._tone({
          freq,
          duration: 0.35,
          type: "triangle",
          gain: 0.16,
          delay: i * 0.14,
        }),
      );
    }

    countdownTick() {
      this._tone({ freq: 880, duration: 0.08, type: "square", gain: 0.1 });
    }

    countdownGo() {
      this._tone({
        freq: 523.25,
        duration: 0.25,
        type: "triangle",
        gain: 0.18,
      });
      this._tone({
        freq: 1046.5,
        duration: 0.3,
        type: "triangle",
        gain: 0.14,
        delay: 0.05,
      });
    }

    error() {
      this._tone({
        freq: 220,
        duration: 0.14,
        type: "square",
        gain: 0.1,
        sweepTo: 140,
      });
    }
  }

  window.Ludo.sound = new SoundEngine();
})();
