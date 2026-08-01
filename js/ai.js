/**
 * ai.js
 * ------------------------------------------------------------
 * Lightweight CPU controller for the non-player fighter.
 * Produces the same input-shaped object the human player uses,
 * so Fighter/engine code doesn't need to know who's driving it.
 * ------------------------------------------------------------
 */

class AIController {
  constructor(difficulty = "normal") {
    this.difficulty = difficulty;
    this.decisionTimer = 0;
    this.currentPlan = "approach";
    this.state = { moveX: 0, punch: false, kick: false, block: false, grapple: false, special: false };
    this._pressedOnce = { punch: false, kick: false, grapple: false, special: false };
  }

  consumePress(action) {
    if (this._pressedOnce[action]) {
      this._pressedOnce[action] = false;
      return true;
    }
    return false;
  }

  update(dt, self, opponent) {
    // reset one-shot flags each tick unless just set below
    this.state.punch = false;
    this.state.kick = false;
    this.state.grapple = false;
    this.state.special = false;
    this.state.block = false;

    if (!self.canAct()) {
      this.state.moveX = 0;
      return;
    }

    const dist = Math.abs(opponent.x - self.x);
    const dir = opponent.x > self.x ? 1 : -1;

    this.decisionTimer -= dt;
    if (this.decisionTimer <= 0) {
      this.decisionTimer = 250 + Math.random() * 350;
      this._choosePlan(self, opponent, dist);
    }

    switch (this.currentPlan) {
      case "approach":
        this.state.moveX = dir * 0.85;
        break;
      case "retreat":
        this.state.moveX = -dir * 0.7;
        break;
      case "block":
        this.state.moveX = 0;
        this.state.block = true;
        break;
      case "punch":
        this.state.moveX = 0;
        if (dist < (self.data.moves.punch.range + 10)) {
          this.state.punch = true;
          this._pressedOnce.punch = true;
        } else {
          this.state.moveX = dir * 0.85;
        }
        break;
      case "kick":
        this.state.moveX = 0;
        if (dist < (self.data.moves.kick.range + 10)) {
          this.state.kick = true;
          this._pressedOnce.kick = true;
        } else {
          this.state.moveX = dir * 0.85;
        }
        break;
      case "grapple":
        this.state.moveX = 0;
        if (dist < (self.data.moves.grapple.range + 8)) {
          this.state.grapple = true;
          this._pressedOnce.grapple = true;
        } else {
          this.state.moveX = dir * 0.9;
        }
        break;
      case "special":
        this.state.moveX = 0;
        if (self.meter >= self.data.moves.special.meterCost && dist < (self.data.moves.special.range + 10)) {
          this.state.special = true;
          this._pressedOnce.special = true;
        } else if (self.meter >= self.data.moves.special.meterCost) {
          this.state.moveX = dir * 0.9;
        } else {
          this.currentPlan = "approach";
        }
        break;
    }

    self.facing = dir === 0 ? self.facing : dir;
  }

  _choosePlan(self, opponent, dist) {
    // low health -> more cautious
    const healthRatio = self.health / self.data.maxHealth;
    const canSpecial = self.meter >= self.data.moves.special.meterCost;

    if (healthRatio < 0.28 && Math.random() < 0.4) {
      this.currentPlan = Math.random() < 0.5 ? "block" : "retreat";
      return;
    }

    if (canSpecial && dist < self.data.moves.special.range + 60 && Math.random() < 0.35) {
      this.currentPlan = "special";
      return;
    }

    if (dist > self.data.moves.grapple.range + 40) {
      this.currentPlan = "approach";
      return;
    }

    const roll = Math.random();
    if (roll < 0.35) this.currentPlan = "punch";
    else if (roll < 0.6) this.currentPlan = "kick";
    else if (roll < 0.78) this.currentPlan = "grapple";
    else if (roll < 0.9) this.currentPlan = "block";
    else this.currentPlan = "retreat";
  }
}

