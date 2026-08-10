"use strict";

(function () {
  const { EventBus, SIX, MAX_CONSECUTIVE_SIXES, TOTAL_STEPS_TO_FINISH, el } =
    window.Ludo.Utils;
  const {
    renderBoard,
    stepsToCoord,
    startCoord,
    yardCoord,
    isSafeSteps,
    coordKey,
  } = window.Ludo.Board;
  const Player = window.Ludo.Player;
  const Dice = window.Ludo.Dice;
  const MatchTimer = window.Ludo.MatchTimer;
  const sound = window.Ludo.sound;
  const { StatsStore, SaveGameStore } = window.Ludo.Storage;
  const { animateTokenPath, animateCapture, pulseLanding, fadeIn } =
    window.Ludo.Animation;
  const { chooseAIMove } = window.Ludo.AI;

  class Game {
    /**
     * @param {object} options
     * @param {HTMLElement} options.boardEl
     * @param {HTMLElement} options.diceEl
     * @param {Array} options.playerConfigs - [{ color, name, isAI }]
     * @param {{soundEnabled:boolean, animationsEnabled:boolean}} options.settings
     */
    constructor({ boardEl, diceEl, playerConfigs, settings }) {
      this.boardEl = boardEl;
      this.bus = new EventBus();
      this.settings = { ...settings };
      this.players = playerConfigs.map((cfg) => new Player(cfg));
      this.currentIndex = 0;
      this.gameOver = false;
      this.moveHistory = [];
      this._busy = false;
      this._pendingSelection = null;
      this._destroyed = false;

      this._cellMap = renderBoard(boardEl);
      this.tokenElements = new Map();
      this._createTokenElements();

      this.dice = new Dice(diceEl);
      this.timer = new MatchTimer((formatted, elapsedMs) =>
        this.bus.emit("timer-tick", { formatted, elapsedMs }),
      );

      sound.setMuted(!this.settings.soundEnabled);
    }

    updateSettings(partial) {
      this.settings = { ...this.settings, ...partial };
      sound.setMuted(!this.settings.soundEnabled);
    }

    getCurrentPlayer() {
      return this.players[this.currentIndex];
    }

    start() {
      this.timer.start(0);
      this._persistAutosave();
      this.beginTurn();
    }

    restore(snapshot) {
      this.players = snapshot.players.map(Player.fromJSON);
      this.currentIndex = snapshot.currentIndex;
      this.moveHistory = snapshot.moveHistory || [];
      this.gameOver = false;
      this._placeAllTokensFromState();
      this.timer.start(snapshot.elapsedMs || 0);
      this.beginTurn();
    }

    toSnapshot() {
      return {
        players: this.players.map((p) => p.toJSON()),
        currentIndex: this.currentIndex,
        elapsedMs: this.timer.getElapsedMs(),
        moveHistory: this.moveHistory.slice(-40),
      };
    }

    destroy() {
      this._destroyed = true;
      this.timer.stop();
      this._pendingSelection = null;
    }

    // -----------------------------------------------------------------
    //                        Turn orchestration
    // -----------------------------------------------------------------

    async beginTurn() {
      if (this.gameOver || this._destroyed) return;
      const player = this.getCurrentPlayer();
      this.bus.emit("turn-start", { player, players: this.players });

      if (player.isAI) {
        await this._delay(600 + Math.random() * 600);
        if (this._destroyed || this.gameOver) return;
        await this._executeRollAndMove(player);
      } else {
        this.bus.emit("await-human-roll", { player });
      }
    }

    async humanRollRequested() {
      const player = this.getCurrentPlayer();
      if (
        this._destroyed ||
        this.gameOver ||
        this._busy ||
        player.isAI ||
        this.dice.isRolling
      )
        return;
      await this._executeRollAndMove(player);
    }

    async _executeRollAndMove(player) {
      this._busy = true;
      const value = await this.dice.roll({
        animationsEnabled: this.settings.animationsEnabled,
      });
      if (this._destroyed) return;
      this.bus.emit("dice-rolled", { player, value });

      if (value === SIX) player.consecutiveSixes += 1;
      else player.consecutiveSixes = 0;

      if (player.consecutiveSixes >= MAX_CONSECUTIVE_SIXES) {
        this.bus.emit("message", {
          text: `${player.name} rolled three sixes in a row - turn forfeited.`,
          tone: "warn",
        });
        player.consecutiveSixes = 0;
        this._busy = false;
        await this._delay(650);
        this._advanceTurn();
        return;
      }

      const legalMoves = this.computeLegalMoves(player, value);

      if (legalMoves.length === 0) {
        this.bus.emit("message", {
          text: `${player.name} has no valid moves.`,
          tone: "info",
        });
        this._busy = false;
        await this._delay(550);
        if (this._destroyed || this.gameOver) return;
        if (value === SIX) await this.beginTurn();
        else this._advanceTurn();
        return;
      }

      let chosenMove;
      if (player.isAI) {
        chosenMove = chooseAIMove(legalMoves);
      } else if (legalMoves.length === 1) {
        chosenMove = legalMoves[0];
      } else {
        this.bus.emit("await-token-selection", { player, legalMoves });
        chosenMove = await this._awaitHumanSelection(legalMoves);
        this.bus.emit("selection-resolved", {});
      }

      if (this._destroyed) return;
      await this.applyMove(player, chosenMove);
      this._busy = false;

      if (this.gameOver || this._destroyed) return;

      this._persistAutosave();

      if (value === SIX) {
        await this._delay(280);
        await this.beginTurn();
      } else {
        this._advanceTurn();
      }
    }

    _advanceTurn() {
      if (this.gameOver || this._destroyed) return;
      this.currentIndex = (this.currentIndex + 1) % this.players.length;
      this._persistAutosave();
      this.beginTurn();
    }

    _awaitHumanSelection(legalMoves) {
      return new Promise((resolve) => {
        this._pendingSelection = { legalMoves, resolve };
        legalMoves.forEach((m) =>
          this._getTokenEl(m.token).classList.add("selectable"),
        );
      });
    }

    _onTokenClicked(token) {
      if (!this._pendingSelection) return;
      const match = this._pendingSelection.legalMoves.find(
        (m) => m.token === token,
      );
      if (!match) {
        sound.error();
        return;
      }
      this._pendingSelection.legalMoves.forEach((m) =>
        this._getTokenEl(m.token).classList.remove("selectable"),
      );
      const { resolve } = this._pendingSelection;
      this._pendingSelection = null;
      resolve(match);
    }

    // -----------------------------------------------------------------
    //                    Rules: legal move computation
    // -----------------------------------------------------------------

    computeLegalMoves(player, diceValue) {
      const occupancy = this._buildOccupancy();
      const moves = [];

      for (const token of player.tokens) {
        if (token.isHome) continue;

        if (token.isInBase) {
          if (diceValue !== SIX) continue;
          if (this._isPathBlocked(player.color, 1, 1, occupancy)) continue;
          moves.push(this._buildMove(player, token, 1, occupancy, true));
          continue;
        }

        const targetSteps = token.steps + diceValue;
        if (targetSteps > TOTAL_STEPS_TO_FINISH) continue;
        if (
          targetSteps <= 51 &&
          this._isPathBlocked(
            player.color,
            token.steps + 1,
            targetSteps,
            occupancy,
          )
        )
          continue;
        moves.push(
          this._buildMove(player, token, targetSteps, occupancy, false),
        );
      }

      return moves;
    }

    _buildMove(player, token, targetSteps, occupancy, exitsBase) {
      const reachesHome = targetSteps === TOTAL_STEPS_TO_FINISH;
      const isSafe = targetSteps > 51 || isSafeSteps(player.color, targetSteps);
      const capturesTokens = [];

      if (targetSteps <= 51 && !isSafe) {
        const coord = stepsToCoord(player.color, targetSteps);
        const entries = occupancy.get(coordKey(coord)) || [];
        for (const entry of entries) {
          if (entry.color !== player.color) capturesTokens.push(entry.token);
        }
      }

      return {
        token,
        targetSteps,
        capturesTokens,
        exitsBase,
        reachesHome,
        isSafe,
      };
    }

    _buildOccupancy() {
      const map = new Map();
      for (const p of this.players) {
        for (const t of p.tokens) {
          if (!t.isActive || t.steps > 51) continue;
          const key = coordKey(stepsToCoord(p.color, t.steps));
          if (!map.has(key)) map.set(key, []);
          map.get(key).push({ color: p.color, token: t });
        }
      }
      return map;
    }

    _isPathBlocked(movingColor, fromStep, toStep, occupancy) {
      for (let step = fromStep; step <= toStep && step <= 51; step++) {
        const key = coordKey(stepsToCoord(movingColor, step));
        const entries = occupancy.get(key) || [];
        const counts = {};
        for (const entry of entries)
          counts[entry.color] = (counts[entry.color] || 0) + 1;
        for (const [color, count] of Object.entries(counts)) {
          if (color !== movingColor && count >= 2) return true;
        }
      }
      return false;
    }

    // -----------------------------------------------------------------
    //                        Applying a move
    // -----------------------------------------------------------------

    async applyMove(player, move) {
      const { token, targetSteps, capturesTokens, exitsBase, reachesHome } =
        move;
      const tokenEl = this._getTokenEl(token);
      const path = this._buildAnimationPath(
        player.color,
        token,
        targetSteps,
        exitsBase,
      );

      await animateTokenPath(tokenEl, path, {
        enabled: this.settings.animationsEnabled,
      });
      token.moveTo(targetSteps);
      sound.tokenMove();
      await pulseLanding(tokenEl, { enabled: this.settings.animationsEnabled });

      this._recordHistory(
        exitsBase
          ? `${player.name} brought a token out to play.`
          : reachesHome
            ? `${player.name} guided a token all the way HOME.`
            : `${player.name} advanced a token to square ${targetSteps}.`,
      );

      for (const captured of capturesTokens) {
        await this._captureToken(captured, player);
      }

      if (reachesHome) sound.tokenHome();

      this.bus.emit("board-updated", {});

      if (player.hasWon) this._declareWinner(player);
    }

    async _captureToken(capturedToken, capturingPlayer) {
      const owner = this.players.find((p) => p.tokens.includes(capturedToken));
      if (!owner) return;
      const tokenEl = this._getTokenEl(capturedToken);
      await animateCapture(tokenEl, {
        enabled: this.settings.animationsEnabled,
      });
      capturedToken.sendHome();
      const yardLayer = this._cellMap.get(
        coordKey(yardCoord(owner.color, capturedToken.index)),
      ).tokenLayer;
      yardLayer.appendChild(tokenEl);
      tokenEl.style.transform = "";
      tokenEl.style.opacity = "";
      await fadeIn(tokenEl, {
        enabled: this.settings.animationsEnabled,
        duration: 200,
      });
      sound.capture();
      owner.tokensCaptured += 1;
      capturingPlayer.capturesMade += 1;
      this._recordHistory(
        `${capturingPlayer.name} captured one of ${owner.name}'s tokens!`,
      );
      this.bus.emit("capture", {
        owner,
        capturingPlayer,
        token: capturedToken,
      });
    }

    _buildAnimationPath(color, token, targetSteps, exitsBase) {
      const layers = [];
      if (exitsBase) {
        layers.push(this._cellMap.get(coordKey(startCoord(color))).tokenLayer);
        return layers;
      }
      for (let step = token.steps + 1; step <= targetSteps; step++) {
        layers.push(
          this._cellMap.get(coordKey(stepsToCoord(color, step))).tokenLayer,
        );
      }
      return layers;
    }

    _declareWinner(winner) {
      this.gameOver = true;
      this._pendingSelection = null;
      const elapsedMs = this.timer.stop();
      SaveGameStore.clear();

      const primaryHuman = this.players.find((p) => !p.isAI);
      const won = primaryHuman ? primaryHuman.color === winner.color : true;
      const stats = StatsStore.recordMatch({ won, durationMs: elapsedMs });

      sound.victory();
      this.bus.emit("game-won", {
        winner,
        elapsedMs,
        stats,
        players: this.players,
      });
    }

    // -----------------------------------------------------------------
    //                  DOM / token placement helpers
    // -----------------------------------------------------------------

    _createTokenElements() {
      for (const player of this.players) {
        for (const token of player.tokens) {
          const tokenEl = el(
            "div",
            {
              className: `token token-${player.color}`,
              attrs: {
                role: "button",
                tabindex: "0",
                "aria-label": `${player.name} token ${token.index + 1}`,
                "data-token-id": token.id,
              },
            },
            [el("span", { className: "token-shine" })],
          );

          tokenEl.addEventListener("click", () => this._onTokenClicked(token));
          tokenEl.addEventListener("keydown", (evt) => {
            if (evt.key === "Enter" || evt.key === " ") {
              evt.preventDefault();
              this._onTokenClicked(token);
            }
          });

          this.tokenElements.set(token.id, tokenEl);
          const layer = this._cellMap.get(
            coordKey(yardCoord(player.color, token.index)),
          ).tokenLayer;
          layer.appendChild(tokenEl);
        }
      }
    }

    _placeAllTokensFromState() {
      this.tokenElements.clear();
      for (const { tokenLayer } of this._cellMap.values())
        tokenLayer.replaceChildren();
      this._createTokenElements();
      for (const player of this.players) {
        for (const token of player.tokens) {
          if (token.isInBase) continue;
          const tokenEl = this._getTokenEl(token);
          const coord = token.isHome
            ? stepsToCoord(player.color, TOTAL_STEPS_TO_FINISH)
            : stepsToCoord(player.color, token.steps);
          this._cellMap.get(coordKey(coord)).tokenLayer.appendChild(tokenEl);
        }
      }
    }

    _getTokenEl(token) {
      return this.tokenElements.get(token.id);
    }

    _recordHistory(text) {
      this.moveHistory.push({ text, at: Date.now() });
      if (this.moveHistory.length > 60) this.moveHistory.shift();
      this.bus.emit("history-updated", { history: this.moveHistory });
    }

    _persistAutosave() {
      if (this.gameOver) return;
      SaveGameStore.save(this.toSnapshot());
    }

    _delay(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }
  }

  window.Ludo.Game = Game;
})();
