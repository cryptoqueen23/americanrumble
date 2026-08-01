/**
 * fighter.js
 * ------------------------------------------------------------
 * Runtime fighter instance built from a FIGHTERS[] data entry.
 * Handles its own state machine, stats, and move resolution.
 * Pure logic — engine.js drives update(dt), game.js reads state
 * to render and to trigger dialogue/UI.
 * ------------------------------------------------------------
 */

const FighterState = {
  IDLE: "idle",
  WALK: "walk",
  PUNCH: "punch",
  KICK: "kick",
  GRAPPLE: "grapple",
  SPECIAL: "special",
  BLOCK: "block",
  HITSTUN: "hitstun",
  KNOCKDOWN: "knockdown",
  KO: "ko"
};

class Fighter {
  constructor(data, x, facing, isPlayer) {
    this.data = data;           // reference into FIGHTERS
    this.isPlayer = isPlayer;
    this.x = x;
    this.y = 0;                 // ground-relative, 0 = standing
    this.facing = facing;       // 1 = facing right, -1 = facing left

    this.health = data.maxHealth;
    this.stamina = data.maxStamina;
    this.meter = 0;

    this.state = FighterState.IDLE;
    this.stateTimer = 0;        // ms remaining in current state's locked phase
    this.combo = 0;
    this.comboTimer = 0;

    this.knockbackVX = 0;
    this.hitThisAction = false; // prevents double-hits within one active window
    this.actionPhase = null;    // "startup" | "active" | "recovery"

    this.blockHeld = false;
    this.onGround = true;

    this.lastDialogue = "";
    this.lastDialogueAt = 0;

    // visual-only flash timer for hit feedback
    this.hitFlash = 0;
    this.shakeTimer = 0;
  }

  get isDown() {
    return this.state === FighterState.KNOCKDOWN || this.state === FighterState.KO;
  }

  get isBusy() {
    return [FighterState.PUNCH, FighterState.KICK, FighterState.GRAPPLE, FighterState.SPECIAL,
            FighterState.HITSTUN, FighterState.KNOCKDOWN, FighterState.KO].includes(this.state);
  }

  canAct() {
    return !this.isBusy;
  }

  regenStamina(dt) {
    if (this.state === FighterState.IDLE || this.state === FighterState.WALK || this.state === FighterState.BLOCK) {
      this.stamina = Math.min(this.data.maxStamina, this.stamina + dt * 0.018);
    }
  }

  startMove(moveKey) {
    if (!this.canAct()) return false;
    const move = this.data.moves[moveKey];
    if (!move) return false;

    if (moveKey === "special") {
      if (this.meter < move.meterCost) return false;
      this.meter = 0;
    } else if (move.staminaCost && this.stamina < move.staminaCost) {
      return false;
    } else if (move.staminaCost) {
      this.stamina -= move.staminaCost;
    }

    this.state = {
      punch: FighterState.PUNCH,
      kick: FighterState.KICK,
      grapple: FighterState.GRAPPLE,
      special: FighterState.SPECIAL
    }[moveKey];

    this.currentMove = move;
    this.currentMoveKey = moveKey;
    this.hitThisAction = false;
    this.actionPhase = move.startupMs ? "startup" : "active";
    // Always start with a positive timer — a 0ms timer would never trigger
    // the state-machine advance in update() and would soft-lock the fighter.
    this.stateTimer = move.startupMs || move.activeMs || 120;
    return true;
  }

  startBlock() {
    if (!this.canAct()) return;
    this.state = FighterState.BLOCK;
  }

  stopBlock() {
    if (this.state === FighterState.BLOCK) this.state = FighterState.IDLE;
  }

  takeHit(damage, knockback, attackerFacing, knocksDown, blocked) {
    this.hitFlash = 180;
    if (blocked) {
      // chip damage + stamina drain, no combo, brief pushback only
      this.health = Math.max(0, this.health - Math.round(damage * 0.12));
      this.stamina = Math.max(0, this.stamina - damage * 0.5);
      this.knockbackVX = attackerFacing * (knockback * 0.35);
      this.state = FighterState.BLOCK;
      this.stateTimer = 120;
      return;
    }

    this.health = Math.max(0, this.health - damage);
    this.meter = Math.min(this.data.maxMeter, this.meter + damage * 1.4);
    this.knockbackVX = attackerFacing * knockback;

    if (this.health <= 0) {
      this.state = FighterState.KO;
      this.stateTimer = 999999;
    } else if (knocksDown) {
      this.state = FighterState.KNOCKDOWN;
      this.stateTimer = 1400;
    } else {
      this.state = FighterState.HITSTUN;
      this.stateTimer = 260;
    }
  }

  /** Returns the world-space hitbox rect for the currently active move, or null. */
  getActiveHitbox() {
    if (this.actionPhase !== "active" || !this.currentMove) return null;
    const range = this.currentMove.range || 0;
    const x0 = this.facing === 1 ? this.x : this.x - range;
    return { x0, x1: x0 + range, y: this.y };
  }

  update(dt, input, arenaMin, arenaMax) {
    this.regenStamina(dt);
    if (this.hitFlash > 0) this.hitFlash = Math.max(0, this.hitFlash - dt);
    if (this.shakeTimer > 0) this.shakeTimer = Math.max(0, this.shakeTimer - dt);

    // apply knockback friction
    if (Math.abs(this.knockbackVX) > 1) {
      this.x += this.knockbackVX * (dt / 1000);
      this.knockbackVX *= 0.86;
    } else {
      this.knockbackVX = 0;
    }

    this.x = Math.max(arenaMin, Math.min(arenaMax, this.x));

    // state timers
    if (this.stateTimer > 0) {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) this._advanceStateMachine();
    }

    // movement only allowed in idle/walk
    if (this.state === FighterState.IDLE || this.state === FighterState.WALK) {
      if (input && input.moveX !== 0) {
        this.x += input.moveX * this.data.walkSpeed * (dt / 1000);
        this.x = Math.max(arenaMin, Math.min(arenaMax, this.x));
        this.state = FighterState.WALK;
      } else {
        this.state = FighterState.IDLE;
      }
    }
  }

  _advanceStateMachine() {
    if (this.state === FighterState.PUNCH || this.state === FighterState.KICK ||
        this.state === FighterState.GRAPPLE || this.state === FighterState.SPECIAL) {
      if (this.actionPhase === "startup") {
        this.actionPhase = "active";
        this.stateTimer = this.currentMove.activeMs || 80;
      } else if (this.actionPhase === "active") {
        this.actionPhase = "recovery";
        this.stateTimer = this.currentMove.recoveryMs || 150;
      } else {
        this.state = FighterState.IDLE;
        this.actionPhase = null;
        this.currentMove = null;
      }
    } else if (this.state === FighterState.HITSTUN) {
      this.state = FighterState.IDLE;
    } else if (this.state === FighterState.KNOCKDOWN) {
      this.state = FighterState.IDLE;
      this.stamina = Math.min(this.data.maxStamina, this.stamina + 15); // small recovery bonus for getting up
    } else if (this.state === FighterState.BLOCK) {
      this.state = FighterState.IDLE;
    }
  }
}
