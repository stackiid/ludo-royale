"use strict";

(function () {
  const { TOKEN_STATE, TOKENS_PER_PLAYER, TOTAL_STEPS_TO_FINISH } =
    window.Ludo.Utils;

  class Token {
    constructor(id, index) {
      this.id = id;
      this.index = index; // 0..3 within the player
      this.steps = 0; // 0 = in base
      this.state = TOKEN_STATE.BASE;
    }

    get isHome() {
      return this.state === TOKEN_STATE.HOME;
    }
    get isActive() {
      return this.state === TOKEN_STATE.ACTIVE;
    }
    get isInBase() {
      return this.state === TOKEN_STATE.BASE;
    }

    moveTo(steps) {
      this.steps = steps;
      if (steps >= TOTAL_STEPS_TO_FINISH) {
        this.state = TOKEN_STATE.HOME;
        this.steps = TOTAL_STEPS_TO_FINISH;
      } else if (steps <= 0) {
        this.state = TOKEN_STATE.BASE;
        this.steps = 0;
      } else {
        this.state = TOKEN_STATE.ACTIVE;
      }
    }

    sendHome() {
      this.steps = 0;
      this.state = TOKEN_STATE.BASE;
    }

    toJSON() {
      return {
        id: this.id,
        index: this.index,
        steps: this.steps,
        state: this.state,
      };
    }

    static fromJSON(data) {
      const token = new Token(data.id, data.index);
      token.steps = data.steps;
      token.state = data.state;
      return token;
    }
  }

  class Player {
    constructor({
      color,
      name,
      isAI = false,
      isEnabled = true,
      avatar = null,
      tokenStyle = "classic",
    }) {
      this.color = color;
      this.name = name;
      this.isAI = isAI;
      this.isEnabled = isEnabled;
      this.avatar = avatar;
      this.tokenStyle = tokenStyle;
      this.tokens = Array.from(
        { length: TOKENS_PER_PLAYER },
        (_, i) => new Token(`${color}-${i}`, i),
      );
      this.consecutiveSixes = 0;
      this.capturesMade = 0;
      this.tokensCaptured = 0;
    }

    get tokensHome() {
      return this.tokens.filter((t) => t.isHome).length;
    }
    get hasWon() {
      return this.tokensHome === TOKENS_PER_PLAYER;
    }

    resetTurnState() {
      this.consecutiveSixes = 0;
    }

    toJSON() {
      return {
        color: this.color,
        name: this.name,
        isAI: this.isAI,
        isEnabled: this.isEnabled,
        avatar: this.avatar,
        tokenStyle: this.tokenStyle,
        tokens: this.tokens.map((t) => t.toJSON()),
        consecutiveSixes: this.consecutiveSixes,
        capturesMade: this.capturesMade,
        tokensCaptured: this.tokensCaptured,
      };
    }

    static fromJSON(data) {
      const player = new Player({
        color: data.color,
        name: data.name,
        isAI: data.isAI,
        isEnabled: data.isEnabled,
        avatar: data.avatar,
        tokenStyle: data.tokenStyle,
      });
      player.tokens = data.tokens.map(Token.fromJSON);
      player.consecutiveSixes = data.consecutiveSixes || 0;
      player.capturesMade = data.capturesMade || 0;
      player.tokensCaptured = data.tokensCaptured || 0;
      return player;
    }
  }

  window.Ludo.Player = Player;
  window.Ludo.Token = Token;
})();
