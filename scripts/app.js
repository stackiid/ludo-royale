"use strict";

(function () {
  const U = window.Ludo.Utils;
  const { el, icon, formatDurationShort, qs } = U;
  const { PLAYER_META } = U;
  const Anim = window.Ludo.Animation;
  const Modal = window.Ludo.Modal;
  const { StatsStore, SettingsStore, SaveGameStore } = window.Ludo.Storage;
  const sound = window.Ludo.sound;
  const Game = window.Ludo.Game;

  // ---------------------------------------------------------------------
  //                              App-wide state
  // ---------------------------------------------------------------------
  const state = {
    settings: SettingsStore.load(),
    game: null,
    screens: {},
    setup: { count: 4, seats: [] },
  };

  const SEAT_COUNT_PRESETS = {
    2: ["red", "blue"],
    3: ["red", "green", "blue"],
    4: ["red", "green", "blue", "yellow"],
  };

  const COLOR_SLOT = { red: "A", green: "B", yellow: "C", blue: "D" };

  // ---------------------------------------------------------------------
  //                                  Boot
  // ---------------------------------------------------------------------
  document.addEventListener("DOMContentLoaded", init);

  function init() {
    cacheScreens();
    runSplash();
    wireMenu();
    wireSetup();
    wireGameHeader();
    wireHud();
  }

  function cacheScreens() {
    state.screens = {
      menu: qs("#screen-menu"),
      setup: qs("#screen-setup"),
      game: qs("#screen-game"),
    };
  }

  // ---------------------------------------------------------------------
  //                            Splash screen
  // ---------------------------------------------------------------------
  function runSplash() {
    const splash = qs("#splash-screen");
    const fill = qs("#splash-progress-fill");
    const diceMount = qs("#splash-dice-mount");
    const splashDice = new window.Ludo.Dice(diceMount);

    Anim.staggerIn(
      [qs(".splash-logo"), qs(".splash-tagline"), qs(".splash-progress-track")],
      {
        enabled: state.settings.animationsEnabled,
        delay: 120,
      },
    );

    let progress = 0;
    const tick = () => {
      progress = Math.min(100, progress + (6 + Math.random() * 10));
      fill.style.width = `${progress}%`;
      if (progress < 100) {
        setTimeout(tick, 140);
      } else {
        splashDice
          .roll({ animationsEnabled: state.settings.animationsEnabled })
          .finally(() => {
            setTimeout(() => finishSplash(splash), 260);
          });
      }
    };
    setTimeout(tick, 260);
  }

  async function finishSplash(splash) {
    await Anim.fadeOut(splash, {
      enabled: state.settings.animationsEnabled,
      duration: 380,
    });
    splash.hidden = true;
    splash.remove();
    showMainMenu();
  }

  // ---------------------------------------------------------------------
  //                                 Main menu
  // ---------------------------------------------------------------------
  function wireMenu() {
    qs("#btn-play").addEventListener("click", () => {
      sound.click();
      if (SaveGameStore.hasSave()) {
        Modal.openConfirmDialog({
          title: "Start a New Match?",
          description:
            "You have a match in progress. Starting a new one will discard your saved game.",
          iconClass: "fa-solid fa-flag-checkered",
          confirmLabel: "Start New Match",
          animationsEnabled: state.settings.animationsEnabled,
          onConfirm: () => {
            SaveGameStore.clear();
            showSetupScreen();
          },
        });
      } else {
        showSetupScreen();
      }
    });

    qs("#btn-resume").addEventListener("click", () => {
      sound.click();
      const snapshot = SaveGameStore.load();
      if (!snapshot) return;
      launchMatch({
        playerConfigs: snapshot.players.map((p) => ({
          color: p.color,
          name: p.name,
          isAI: p.isAI,
        })),
        resumeSnapshot: snapshot,
      });
    });

    qs("#btn-how-to-play").addEventListener("click", () => {
      sound.click();
      openHowToPlayModal();
    });
    qs("#btn-settings").addEventListener("click", () => {
      sound.click();
      openSettingsModal();
    });
    qs("#btn-statistics").addEventListener("click", () => {
      sound.click();
      openStatisticsModal();
    });
    qs("#btn-credits").addEventListener("click", () => {
      sound.click();
      openCreditsModal();
    });
  }

  function showMainMenu() {
    hideAllScreens();
    const menu = state.screens.menu;
    menu.hidden = false;
    qs("#btn-resume").hidden = !SaveGameStore.hasSave();
    Anim.staggerIn(Array.from(menu.querySelectorAll(".menu-card")), {
      enabled: state.settings.animationsEnabled,
      delay: 70,
    });
  }

  function hideAllScreens() {
    Object.values(state.screens).forEach((s) => {
      if (s) s.hidden = true;
    });
    document.body.classList.remove("in-game");
  }

  // ---------------------------------------------------------------------
  //                              Player setup
  // ---------------------------------------------------------------------
  function wireSetup() {
    qs("#btn-setup-back").addEventListener("click", () => {
      sound.click();
      showMainMenu();
    });

    qsAllSegments().forEach((btn) => {
      btn.addEventListener("click", () => {
        sound.click();
        qsAllSegments().forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        state.setup.count = Number(btn.dataset.count);
        renderSetupSeats();
      });
    });

    qs("#btn-start-match").addEventListener("click", () => {
      sound.click();
      if (state.setup.seats.every((seat) => seat.isAI)) {
        showSetupError(
          "At least one human player is required. All-AI matches are not allowed.",
        );
        return;
      }
      hideSetupError();
      const playerConfigs = state.setup.seats.map((seat) => ({
        color: seat.color,
        name: seat.name.trim() || defaultNameFor(seat.color),
        isAI: seat.isAI,
      }));
      launchMatch({ playerConfigs });
    });
  }

  function showSetupError(message) {
    const errorEl = qs("#setup-error-message");
    errorEl.replaceChildren(
      icon("fa-solid fa-triangle-exclamation"),
      document.createTextNode(message),
    );
    errorEl.hidden = false;
    sound.error();
  }

  function hideSetupError() {
    const errorEl = qs("#setup-error-message");
    errorEl.hidden = true;
    errorEl.replaceChildren();
  }

  function qsAllSegments() {
    return U.qsa("#setup-player-count .segment-btn");
  }

  function defaultNameFor(color) {
    return PLAYER_META[color].label;
  }

  function showSetupScreen() {
    hideAllScreens();
    state.screens.setup.hidden = false;
    hideSetupError();
    renderSetupSeats();
    Anim.staggerIn([qs(".setup-panel")], {
      enabled: state.settings.animationsEnabled,
    });
  }

  function renderSetupSeats() {
    const colors = SEAT_COUNT_PRESETS[state.setup.count];
    state.setup.seats = colors.map((color, i) => {
      const existing = state.setup.seats.find((s) => s.color === color);
      return existing || { color, name: defaultNameFor(color), isAI: i > 0 };
    });

    const list = qs("#setup-players-list");
    list.replaceChildren();

    state.setup.seats.forEach((seat, index) => {
      const meta = PLAYER_META[seat.color];
      const nameInput = el("input", {
        className: "setup-name-input",
        attrs: {
          type: "text",
          maxlength: "16",
          value: seat.name,
          "aria-label": `${meta.label} player name`,
          placeholder: meta.label,
        },
      });
      nameInput.value = seat.name;
      nameInput.addEventListener("input", () => {
        seat.name = nameInput.value;
      });

      const humanBtn = el(
        "button",
        {
          className: `role-toggle-btn ${!seat.isAI ? "is-active" : ""}`,
          attrs: { type: "button" },
        },
        [icon("fa-solid fa-user"), document.createTextNode(" Human")],
      );
      const aiBtn = el(
        "button",
        {
          className: `role-toggle-btn ${seat.isAI ? "is-active" : ""}`,
          attrs: { type: "button" },
        },
        [icon("fa-solid fa-microchip"), document.createTextNode(" AI")],
      );
      humanBtn.addEventListener("click", () => {
        sound.click();
        seat.isAI = false;
        humanBtn.classList.add("is-active");
        aiBtn.classList.remove("is-active");
        hideSetupError();
      });
      aiBtn.addEventListener("click", () => {
        sound.click();
        seat.isAI = true;
        aiBtn.classList.add("is-active");
        humanBtn.classList.remove("is-active");
      });

      const row = el(
        "div",
        {
          className: `setup-seat-row seat-${seat.color}`,
          attrs: { style: `--seat-color:${meta.hex};` },
        },
        [
          el("div", { className: "setup-seat-swatch" }, [icon(meta.icon)]),
          nameInput,
          el("div", { className: "role-toggle-group" }, [humanBtn, aiBtn]),
        ],
      );
      list.appendChild(row);
    });
  }

  // ---------------------------------------------------------------------
  //                    Launching / restoring a match
  // ---------------------------------------------------------------------
  function launchMatch({ playerConfigs, resumeSnapshot = null }) {
    hideAllScreens();
    state.screens.game.hidden = false;
    document.body.classList.add("in-game");
    applyPlayerCountLayout(playerConfigs.length);

    const boardEl = qs("#board-mount");
    const diceEl = qs("#dice-mount");

    if (state.game) state.game.destroy();
    state.game = new Game({
      boardEl,
      diceEl,
      playerConfigs,
      settings: state.settings,
    });
    wireGameEvents(state.game);

    const rollBtn = qs("#btn-roll-dice");
    rollBtn.onclick = () => {
      sound.click();
      state.game.humanRollRequested();
    };

    if (resumeSnapshot) {
      state.game.restore(resumeSnapshot);
      buildPlayerCards(state.game.players);
      qs("#status-message").textContent = "Match resumed.";
    } else {
      buildPlayerCards(state.game.players);
      playCinematicThenStart(state.game);
    }
  }

  function applyPlayerCountLayout(count) {
    const main = qs("#game-main");
    main.className = `game-main players-${count}`;
  }

  async function playCinematicThenStart(game) {
    const overlay = qs("#cinematic-overlay");
    const textEl = qs("#cinematic-text");
    overlay.hidden = false;
    const beats = [
      { text: "Get Ready", shake: false, tick: true },
      { text: "Prepare", shake: false, tick: true },
      { text: "Almost There", shake: true, tick: true },
      { text: "GO!", shake: false, tick: false, go: true },
    ];

    qs("#board-mount").classList.add("board-pulse");

    for (const beat of beats) {
      textEl.textContent = beat.text;
      textEl.className = `cinematic-text ${beat.go ? "cinematic-go" : ""}`;
      if (beat.tick) sound.countdownTick();
      else sound.countdownGo();
      await Anim.countdownBeat(textEl, {
        enabled: state.settings.animationsEnabled,
        shake: beat.shake,
      });
    }

    Anim.burstCelebration(overlay, {
      enabled: state.settings.animationsEnabled,
      particleCount: 40,
    });
    await delay(250);
    overlay.hidden = true;
    qs("#board-mount").classList.remove("board-pulse");
    qs("#status-message").textContent = "Match started. Good luck!";
    game.start();
  }

  function delay(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  // ---------------------------------------------------------------------
  //                      In-match header + HUD wiring
  // ---------------------------------------------------------------------
  function wireGameHeader() {
    qs("#btn-sound-toggle").addEventListener("click", toggleSound);
    qs("#btn-settings-ingame").addEventListener("click", () => {
      sound.click();
      openSettingsModal();
    });

    qs("#btn-restart").addEventListener("click", () => {
      sound.click();
      Modal.openConfirmDialog({
        title: "Restart Match?",
        description:
          "This will reset the board and start a brand new match with the same players.",
        iconClass: "fa-solid fa-arrow-rotate-right",
        confirmLabel: "Restart",
        animationsEnabled: state.settings.animationsEnabled,
        onConfirm: () => {
          const configs = state.game.players.map((p) => ({
            color: p.color,
            name: p.name,
            isAI: p.isAI,
          }));
          SaveGameStore.clear();
          launchMatch({ playerConfigs: configs });
        },
      });
    });

    qs("#btn-back-menu").addEventListener("click", () => {
      sound.click();
      Modal.openConfirmDialog({
        title: "Quit Match?",
        description:
          "Your progress is auto-saved, so you can resume this match later from the main menu.",
        iconClass: "fa-solid fa-house",
        confirmLabel: "Quit to Menu",
        animationsEnabled: state.settings.animationsEnabled,
        onConfirm: () => {
          if (state.game) {
            state.game.destroy();
          }
          showMainMenu();
        },
      });
    });
  }

  function toggleSound() {
    state.settings.soundEnabled = !state.settings.soundEnabled;
    SettingsStore.save(state.settings);
    sound.setMuted(!state.settings.soundEnabled);
    if (state.game)
      state.game.updateSettings({ soundEnabled: state.settings.soundEnabled });
    updateSoundIcon();
    sound.click();
  }

  function updateSoundIcon() {
    const btn = qs("#btn-sound-toggle");
    const i = btn.querySelector("i");
    i.className = state.settings.soundEnabled
      ? "fa-solid fa-volume-high"
      : "fa-solid fa-volume-xmark";
    btn.setAttribute(
      "aria-label",
      state.settings.soundEnabled ? "Mute sound" : "Unmute sound",
    );
  }

  function wireHud() {
    updateSoundIcon();
    qs("#btn-history").addEventListener("click", () => {
      sound.click();
      openHistoryModal();
    });
  }

  // ---------------------------------------------------------------------
  //                        Game event wiring -> DOM
  // ---------------------------------------------------------------------
  function wireGameEvents(game) {
    const statusEl = qs("#status-message");
    const rollBtn = qs("#btn-roll-dice");

    game.bus.on("turn-start", ({ player }) => {
      highlightActivePlayer(player);
      updateHeaderPlayer(player);
      rollBtn.disabled = true;
      if (player.isAI) {
        statusEl.textContent = `${player.name} is thinking…`;
        setAiBadge(player, true);
      } else {
        setAiBadge(player, false);
      }
    });

    game.bus.on("await-human-roll", ({ player }) => {
      rollBtn.disabled = false;
      statusEl.textContent = `${player.name}'s turn - roll the dice.`;
    });

    game.bus.on("dice-rolled", ({ player, value }) => {
      rollBtn.disabled = true;
      setAiBadge(player, false);
      statusEl.textContent = `${player.name} rolled a ${value}.`;
    });

    game.bus.on("await-token-selection", ({ player }) => {
      statusEl.textContent = `${player.name}, choose a token to move.`;
    });

    game.bus.on("message", ({ text }) => {
      statusEl.textContent = text;
    });

    game.bus.on("capture", ({ owner, capturingPlayer }) => {
      statusEl.textContent = `${capturingPlayer.name} sent one of ${owner.name}'s tokens home!`;
      refreshPlayerCards(game.players);
    });

    game.bus.on("board-updated", () => refreshPlayerCards(game.players));
    game.bus.on("history-updated", ({ history }) => {
      state.lastHistory = history;
    });

    game.bus.on("timer-tick", ({ formatted }) => {
      qs("#header-timer-value").textContent = formatted;
    });

    game.bus.on("game-won", (payload) => onGameWon(payload));
  }

  function setAiBadge(player, thinking) {
    const badge = qs("#header-ai-badge");
    if (player.isAI) {
      badge.hidden = false;
      badge.replaceChildren();
      badge.appendChild(icon("fa-solid fa-microchip"));
      badge.appendChild(
        document.createTextNode(thinking ? " Thinking…" : " AI"),
      );
    } else {
      badge.hidden = true;
    }
  }

  function updateHeaderPlayer(player) {
    const meta = PLAYER_META[player.color];
    qs("#header-player-name").textContent = player.name;
    qs("#header-current-player .header-player-dot").style.background = meta.hex;
  }

  // ---------------------------------------------------------------------
  //                              Player cards
  // ---------------------------------------------------------------------
  function buildPlayerCards(players) {
    const activeColors = new Set(players.map((p) => p.color));
    Object.entries(COLOR_SLOT).forEach(([color, letter]) => {
      const slot = qs(`.player-card-slot[data-slot="${letter}"]`);
      if (!slot) return;
      slot.hidden = !activeColors.has(color);
      if (slot.hidden) slot.replaceChildren();
    });
    players.forEach((player) => {
      const slot = qs(
        `.player-card-slot[data-slot="${COLOR_SLOT[player.color]}"]`,
      );
      slot.replaceChildren(buildPlayerCard(player));
    });
  }

  function buildPlayerCard(player) {
    const meta = PLAYER_META[player.color];
    const card = el("article", {
      className: `player-card player-card-${player.color}`,
      attrs: {
        style: `--seat-color:${meta.hex};`,
        "data-color": player.color,
        "aria-label": `${player.name} status`,
      },
    });

    const header = el("div", { className: "player-card-header" }, [
      el("span", { className: "player-avatar" }, [icon(meta.icon)]),
      el("span", { className: "player-name", text: player.name }),
    ]);
    if (player.isAI)
      header.appendChild(
        el("span", { className: "ai-badge ai-badge-small" }, [
          icon("fa-solid fa-microchip"),
          document.createTextNode(" AI"),
        ]),
      );

    const dots = el("div", {
      className: "token-dots",
      attrs: { "aria-hidden": "true" },
    });
    player.tokens.forEach((t) => {
      const dot = el("span", { className: `token-dot token-dot-${t.state}` });
      dots.appendChild(dot);
    });

    const stats = el("div", { className: "player-card-stats" }, [
      el("span", { className: "stat-chip" }, [
        icon("fa-solid fa-house"),
        document.createTextNode(` ${player.tokensHome}/4`),
      ]),
      el("span", { className: "stat-chip" }, [
        icon("fa-solid fa-sword"),
        document.createTextNode(` ${player.capturesMade}`),
      ]),
    ]);

    card.appendChild(header);
    card.appendChild(dots);
    card.appendChild(stats);
    return card;
  }

  function refreshPlayerCards(players) {
    players.forEach((player) => {
      const card = qs(`.player-card[data-color="${player.color}"]`);
      if (!card) return;
      const dots = card.querySelectorAll(".token-dot");
      player.tokens.forEach((t, i) => {
        dots[i].className = `token-dot token-dot-${t.state}`;
      });
      const stats = card.querySelectorAll(".stat-chip");
      stats[0].lastChild.textContent = ` ${player.tokensHome}/4`;
      stats[1].lastChild.textContent = ` ${player.capturesMade}`;
    });
  }

  function highlightActivePlayer(activePlayer) {
    U.qsa(".player-card").forEach((card) => Anim.clearActivePlayerPulse(card));
    const card = qs(`.player-card[data-color="${activePlayer.color}"]`);
    if (card)
      Anim.pulseActivePlayer(card, {
        enabled: state.settings.animationsEnabled,
      });
  }

  // ---------------------------------------------------------------------
  //                                 Win screen
  // ---------------------------------------------------------------------
  function onGameWon({ winner, elapsedMs, stats }) {
    const meta = PLAYER_META[winner.color];
    qs("#btn-roll-dice").disabled = true;
    U.qsa(".player-card").forEach((card) => Anim.clearActivePlayerPulse(card));

    const trophy = el(
      "div",
      {
        className: "win-trophy",
        attrs: { style: `--seat-color:${meta.hex};` },
      },
      [icon("fa-solid fa-trophy")],
    );
    const heading = el("p", {
      className: "win-winner-name",
      text: `${winner.name} wins!`,
    });

    const summary = el("div", { className: "win-stats" }, [
      winStatChip(
        "fa-solid fa-clock",
        "Match Duration",
        formatDurationShort(elapsedMs),
      ),
      winStatChip(
        "fa-solid fa-sword",
        "Captures Made",
        String(winner.capturesMade),
      ),
      winStatChip(
        "fa-solid fa-chart-line",
        "Games Played",
        String(stats.gamesPlayed),
      ),
      winStatChip("fa-solid fa-crown", "Total Wins", String(stats.wins)),
    ]);

    const playAgainBtn = el(
      "button",
      { className: "btn btn-primary", attrs: { type: "button" } },
      [
        icon("fa-solid fa-rotate-right"),
        document.createTextNode(" Play Again"),
      ],
    );
    const menuBtn = el(
      "button",
      { className: "btn btn-ghost", attrs: { type: "button" } },
      [icon("fa-solid fa-house"), document.createTextNode(" Main Menu")],
    );
    const actions = el("div", { className: "modal-actions" }, [
      menuBtn,
      playAgainBtn,
    ]);

    const modal = Modal.openModal({
      title: "Victory!",
      body: [trophy, heading, summary, actions],
      dismissible: false,
      animationsEnabled: state.settings.animationsEnabled,
      ariaLabel: `${winner.name} wins the match`,
    });

    Anim.burstCelebration(modal.el, {
      enabled: state.settings.animationsEnabled,
      particleCount: 90,
    });

    playAgainBtn.addEventListener("click", async () => {
      sound.click();
      await modal.close();
      const configs = state.game.players.map((p) => ({
        color: p.color,
        name: p.name,
        isAI: p.isAI,
      }));
      launchMatch({ playerConfigs: configs });
    });
    menuBtn.addEventListener("click", async () => {
      sound.click();
      await modal.close();
      if (state.game) state.game.destroy();
      showMainMenu();
    });
  }

  function winStatChip(iconClass, label, value) {
    return el("div", { className: "win-stat-chip" }, [
      icon(iconClass),
      el("div", {}, [
        el("div", { className: "win-stat-value", text: value }),
        el("div", { className: "win-stat-label", text: label }),
      ]),
    ]);
  }

  // ---------------------------------------------------------------------
  //                          Modals: How To Play
  // ---------------------------------------------------------------------
  function openHowToPlayModal() {
    const rules = [
      {
        icon: "fa-solid fa-dice-six",
        title: "Roll a Six to Unlock",
        text: "Tokens start in their base. Roll a six to bring one out onto the start square.",
      },
      {
        icon: "fa-solid fa-rotate",
        title: "Extra Turn on Six",
        text: "Rolling a six grants an immediate extra roll. Three sixes in a row forfeits the turn.",
      },
      {
        icon: "fa-solid fa-star",
        title: "Safe Squares",
        text: "Start squares and star squares protect tokens from capture.",
      },
      {
        icon: "fa-solid fa-hand-fist",
        title: "Capturing",
        text: "Land exactly on an opponent's token on an unsafe square to send it back to base.",
      },
      {
        icon: "fa-solid fa-flag-checkered",
        title: "Exact Finish",
        text: "A token must reach home with an exact roll - overshooting is not allowed.",
      },
      {
        icon: "fa-solid fa-crown",
        title: "Winning",
        text: "The first player to bring all four tokens home wins the match.",
      },
    ];
    const list = el(
      "div",
      { className: "rules-grid" },
      rules.map((r) =>
        el("div", { className: "rule-card" }, [
          el("div", { className: "rule-icon" }, [icon(r.icon)]),
          el("h3", { className: "rule-title", text: r.title }),
          el("p", { className: "rule-text", text: r.text }),
        ]),
      ),
    );
    Modal.openModal({
      title: "How To Play",
      body: [list],
      animationsEnabled: state.settings.animationsEnabled,
    });
  }

  // ---------------------------------------------------------------------
  //                        Modals: Settings
  // ---------------------------------------------------------------------
  function openSettingsModal() {
    const soundRow = buildToggleRow(
      "fa-solid fa-volume-high",
      "Sound Effects",
      state.settings.soundEnabled,
      (val) => {
        state.settings.soundEnabled = val;
        SettingsStore.save(state.settings);
        sound.setMuted(!val);
        if (state.game) state.game.updateSettings({ soundEnabled: val });
        updateSoundIcon();
      },
    );
    const animRow = buildToggleRow(
      "fa-solid fa-wand-magic-sparkles",
      "Animations",
      state.settings.animationsEnabled,
      (val) => {
        state.settings.animationsEnabled = val;
        SettingsStore.save(state.settings);
        if (state.game) state.game.updateSettings({ animationsEnabled: val });
      },
    );

    const resetStatsBtn = el(
      "button",
      { className: "btn btn-danger btn-block", attrs: { type: "button" } },
      [icon("fa-solid fa-trash"), document.createTextNode(" Reset Statistics")],
    );
    resetStatsBtn.addEventListener("click", () => {
      sound.click();
      Modal.openConfirmDialog({
        title: "Reset Statistics?",
        description:
          "This permanently clears your games played, wins, losses, and best times.",
        confirmLabel: "Reset",
        animationsEnabled: state.settings.animationsEnabled,
        onConfirm: () => {
          StatsStore.reset();
          sound.click();
        },
      });
    });

    const clearSaveBtn = el(
      "button",
      { className: "btn btn-danger btn-block", attrs: { type: "button" } },
      [
        icon("fa-solid fa-floppy-disk"),
        document.createTextNode(" Clear Saved Match"),
      ],
    );
    clearSaveBtn.addEventListener("click", () => {
      sound.click();
      Modal.openConfirmDialog({
        title: "Clear Saved Match?",
        description:
          "This deletes your auto-saved match. You will not be able to resume it.",
        confirmLabel: "Clear Save",
        animationsEnabled: state.settings.animationsEnabled,
        onConfirm: () => {
          SaveGameStore.clear();
          qs("#btn-resume").hidden = true;
        },
      });
    });

    const legalLink = el(
      "a",
      { className: "credits-legal-link", attrs: { href: "pages/legal.html" } },
      [
        icon("fa-solid fa-file-shield"),
        document.createTextNode(" Terms & Privacy"),
      ],
    );

    Modal.openModal({
      title: "Settings",
      body: [
        soundRow,
        animRow,
        el("div", { className: "modal-divider" }),
        resetStatsBtn,
        clearSaveBtn,
        legalLink,
      ],
      animationsEnabled: state.settings.animationsEnabled,
    });
  }

  function buildToggleRow(iconClass, label, initialOn, onChange) {
    const toggle = el(
      "button",
      {
        className: `switch ${initialOn ? "is-on" : ""}`,
        attrs: {
          type: "button",
          role: "switch",
          "aria-checked": String(initialOn),
          "aria-label": label,
        },
      },
      [el("span", { className: "switch-thumb" })],
    );
    toggle.addEventListener("click", () => {
      const nowOn = !toggle.classList.contains("is-on");
      toggle.classList.toggle("is-on", nowOn);
      toggle.setAttribute("aria-checked", String(nowOn));
      onChange(nowOn);
    });
    return el("div", { className: "settings-row" }, [
      el("div", { className: "settings-row-label" }, [
        icon(iconClass),
        el("span", { text: label }),
      ]),
      toggle,
    ]);
  }

  // ---------------------------------------------------------------------
  //                           Modals: Statistics
  // ---------------------------------------------------------------------
  function openStatisticsModal() {
    const stats = StatsStore.load();
    const avg =
      stats.completedMatches > 0
        ? stats.totalDurationMs / stats.completedMatches
        : 0;

    const grid = el("div", { className: "stats-grid" }, [
      statChip(
        "fa-solid fa-chess-board",
        "Games Played",
        String(stats.gamesPlayed),
      ),
      statChip("fa-solid fa-crown", "Wins", String(stats.wins)),
      statChip("fa-solid fa-skull", "Losses", String(stats.losses)),
      statChip(
        "fa-solid fa-bolt",
        "Fastest Win",
        stats.fastestWinMs != null
          ? formatDurationShort(stats.fastestWinMs)
          : "-",
      ),
      statChip(
        "fa-solid fa-hourglass-end",
        "Longest Match",
        stats.longestMatchMs != null
          ? formatDurationShort(stats.longestMatchMs)
          : "-",
      ),
      statChip(
        "fa-solid fa-calculator",
        "Average Duration",
        avg > 0 ? formatDurationShort(avg) : "-",
      ),
    ]);

    Modal.openModal({
      title: "Statistics",
      body: [grid],
      animationsEnabled: state.settings.animationsEnabled,
    });
  }

  function statChip(iconClass, label, value) {
    return el("div", { className: "stat-tile" }, [
      icon(iconClass),
      el("div", { className: "stat-tile-value", text: value }),
      el("div", { className: "stat-tile-label", text: label }),
    ]);
  }

  // ---------------------------------------------------------------------
  //                      Modals: History + Credits
  // ---------------------------------------------------------------------
  function openHistoryModal() {
    const history = (state.lastHistory || []).slice().reverse();
    const body = history.length
      ? el(
          "ul",
          { className: "history-list" },
          history.map((h) => el("li", { text: h.text })),
        )
      : el("p", {
          className: "modal-description",
          text: "No moves yet - roll the dice to begin.",
        });
    Modal.openModal({
      title: "Move History",
      body: [body],
      animationsEnabled: state.settings.animationsEnabled,
    });
  }

  function openCreditsModal() {
    const creator = el("div", { className: "credits-creator" }, [
      el("div", { className: "credits-avatar" }, [icon("fa-solid fa-code")]),
      el("div", { className: "credits-creator-info" }, [
        el("p", { className: "credits-creator-name", text: "Ubaid Ahmad" }),
        el("p", {
          className: "credits-creator-role",
          text: "Full-Stack MERN Developer & UI/UX Designer",
        }),
        el("p", {
          className: "credits-creator-bio",
          text: "Computer Science student who designs and builds clean, purposeful web products - from database schema to the smallest hover state. Ludo Royale was built end-to-end as a hand-crafted, dependency-free showcase of that approach.",
        }),
      ]),
    ]);

    const socialLinks = [
      [
        "fa-solid fa-globe",
        "Portfolio",
        "https://stackiid.github.io/portfolio/",
      ],
      ["fa-brands fa-github", "GitHub", "https://github.com/stackiid"],
      [
        "fa-brands fa-linkedin",
        "LinkedIn",
        "https://www.linkedin.com/in/ubaidahmaddev",
      ],
      ["fa-regular fa-envelope", "Email", "mailto:iubaidahmad303@gmail.com"],
    ];
    const socialRow = el(
      "div",
      { className: "credits-social-row" },
      socialLinks.map(([iconClass, label, url]) =>
        el(
          "a",
          {
            className: "credits-social-link",
            attrs: {
              href: url,
              target: "_blank",
              rel: "noopener",
              "aria-label": label,
              title: label,
            },
          },
          [icon(iconClass)],
        ),
      ),
    );

    const techBody = el("div", { className: "credits-body" }, [
      el("p", { className: "credits-section-label", text: "Built with" }),
      el("ul", { className: "credits-list" }, [
        el("li", { text: "Motion: Anime.js" }),
        el("li", { text: "Icons: Font Awesome" }),
        el("li", { text: "Type: Google Fonts - Space Grotesk & Inter" }),
        el("li", { text: "Layout: Tailwind CSS" }),
      ]),
      el("p", {
        className: "credits-footnote",
        text: "No trackers, no analytics, no external calls beyond these open libraries.",
      }),
    ]);

    const legalLink = el(
      "a",
      { className: "credits-legal-link", attrs: { href: "pages/legal.html" } },
      [
        icon("fa-solid fa-file-shield"),
        document.createTextNode(" Terms & Privacy"),
      ],
    );

    Modal.openModal({
      title: "Credits",
      body: [
        creator,
        socialRow,
        el("div", { className: "modal-divider" }),
        techBody,
        legalLink,
      ],
      animationsEnabled: state.settings.animationsEnabled,
    });
  }
})();
