/**
 * engine.js
 * ------------------------------------------------------------
 * Canvas render loop + collision/hit resolution for one fight.
 * Rendering uses the provided character portrait art on a
 * simple animated body block (facing flip, squash on attacks,
 * knockdown tilt, hit-flash) rather than full frame animation —
 * swap in sprite sheets later without touching engine logic.
 * ------------------------------------------------------------
 */

class FightEngine {
  constructor(canvas, fighterA, fighterB, options) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.a = fighterA; // player (usually)
    this.b = fighterB; // opponent (usually CPU)
    this.mode = options.mode || "family";     // "family" | "adult"
    this.onDialogue = options.onDialogue || (() => {});
    this.onKO = options.onKO || (() => {});
    this.onTimeUp = options.onTimeUp || (() => {});
    this.onHit = options.onHit || (() => {});

    this.arenaMin = 90;
    this.arenaMax = 0; // set on resize
    this.groundY = 0;

    this.roundTime = 90; // seconds
    this.timerAccum = 0;
    this.running = false;
    this.paused = false;

    this.shakeMag = 0;
    this.particles = [];
    this.images = {};

    this._resize();
    window.addEventListener("resize", () => this._resize());

    this._loadImage(fighterA.data.portrait);
    this._loadImage(fighterB.data.portrait);
    this._loadImage(this.arenaBg = "assets/backgrounds/ring.png");
  }

  _loadImage(src) {
    if (this.images[src]) return;
    const img = new Image();
    img.src = src;
    this.images[src] = img;
  }

  _resize() {
    const parent = this.canvas.parentElement;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    this.canvas.width = w;
    this.canvas.height = h;
    this.arenaMax = w - 90;
    this.groundY = h * 0.72;
  }

  start() {
    this.running = true;
    this.paused = false;
  }

  setPaused(p) { this.paused = p; }

  stop() { this.running = false; }

  /**
   * Team Mode hook (not used by the 1v1 prototype): swaps out the active
   * fighter on one side for a benched teammate mid-match — e.g. a tag-in.
   * The engine only ever knows about "this.a" and "this.b" as the two
   * currently-active combatants, so a future team-management layer in
   * game.js can call this to rotate fighters without any change here.
   */
  substituteFighter(side, newFighter) {
    if (side !== "a" && side !== "b") return;
    const outgoing = this[side];
    newFighter.x = outgoing.x;
    newFighter.facing = outgoing.facing;
    this[side] = newFighter;
    this._loadImage(newFighter.data.portrait);
  }

  /** game.js drives the rAF loop and calls this once per frame with live input states */
  update(dt, inputA, inputB) {
    if (this.paused || !this.running) return;

    this.a.facing = this.a.x <= this.b.x ? 1 : -1;
    this.b.facing = this.b.x <= this.a.x ? 1 : -1;

    // handle block hold (both fighters)
    if (inputA.block && this.a.canAct()) this.a.startBlock();
    else if (!inputA.block) this.a.stopBlock();

    if (inputB.block && this.b.canAct()) this.b.startBlock();
    else if (!inputB.block) this.b.stopBlock();

    this.a.update(dt, inputA, this.arenaMin, this.arenaMax);
    this.b.update(dt, inputB, this.arenaMin, this.arenaMax);

    // prevent overlap (simple separation)
    const minGap = 46;
    if (Math.abs(this.a.x - this.b.x) < minGap && !this.a.isDown && !this.b.isDown) {
      const push = (minGap - Math.abs(this.a.x - this.b.x)) / 2;
      if (this.a.x < this.b.x) { this.a.x -= push; this.b.x += push; }
      else { this.a.x += push; this.b.x -= push; }
    }

    // hit resolution
    this._resolveHit(this.a, this.b);
    this._resolveHit(this.b, this.a);

    // particles / shake decay
    if (this.shakeMag > 0) this.shakeMag = Math.max(0, this.shakeMag - dt * 0.05);
    this.particles = this.particles.filter(p => (p.life -= dt) > 0);
    this.particles.forEach(p => { p.x += p.vx * dt / 1000; p.y += p.vy * dt / 1000; p.vy += 600 * dt / 1000; });

    // timer
    this.timerAccum += dt / 1000;
    if (this.timerAccum >= 1) {
      this.timerAccum -= 1;
      this.roundTime -= 1;
      if (this.roundTime <= 0) {
        this.roundTime = 0;
        this.running = false;
        this.onTimeUp();
      }
    }

    // KO check
    if (this.a.state === FighterState.KO || this.b.state === FighterState.KO) {
      this.running = false;
      this.onKO(this.a.state === FighterState.KO ? this.b : this.a, this.a.state === FighterState.KO ? this.a : this.b);
    }
  }

  /** called by game.js right after update(), using the *controller* objects for press-consumption */
  applyControllerActions(fighter, controller) {
    if (controller.consumePress("punch")) { if (fighter.startMove("punch")) this._fireDialogue(fighter, "punch"); }
    if (controller.consumePress("kick")) { if (fighter.startMove("kick")) this._fireDialogue(fighter, "kick"); }
    if (controller.consumePress("grapple")) { if (fighter.startMove("grapple")) this._fireDialogue(fighter, "grapple"); }
    if (controller.consumePress("special")) { if (fighter.startMove("special")) this._fireDialogue(fighter, "special"); }
  }

  _fireDialogue(fighter, key) {
    // throttle so we don't spam a line every single hit
    const now = performance.now();
    if (now - fighter.lastDialogueAt < 1800) return;
    if (Math.random() > 0.55) return; // not every action talks
    const lines = fighter.data.dialogue[key];
    if (!lines || !lines.length) return;
    const line = lines[Math.floor(Math.random() * lines.length)];
    fighter.lastDialogueAt = now;
    this.onDialogue(fighter, line);
  }

  _resolveHit(attacker, defender) {
    const box = attacker.getActiveHitbox();
    if (!box || attacker.hitThisAction) return;
    if (defender.isDown) return;

    const defenderX0 = defender.x - 26;
    const defenderX1 = defender.x + 26;
    const overlap = box.x0 < defenderX1 && box.x1 > defenderX0;
    if (!overlap) return;

    attacker.hitThisAction = true;
    const move = attacker.currentMove;
    // facing is auto-updated toward the opponent every frame, so a fighter in
    // BLOCK state is always oriented correctly to block whatever's incoming.
    const blocked = defender.state === FighterState.BLOCK;

    defender.takeHit(move.damage, move.knockback || 30, attacker.facing, !!move.knocksDown, blocked);

    // landing a hit builds the attacker's special meter too (not just taking damage)
    if (!blocked && attacker.currentMoveKey !== "special") {
      attacker.meter = Math.min(attacker.data.maxMeter, attacker.meter + move.damage * 0.9);
    }

    this.shakeMag = Math.min(18, this.shakeMag + (blocked ? 3 : move.damage * 0.5));
    this._spawnHitParticles(defender.x, this.groundY - 90, blocked);
    this.onHit(attacker, defender, blocked);

    if (defender.state === FighterState.KNOCKDOWN) {
      this._fireDialogue(defender, "knockedDown");
    } else if (defender.health / defender.data.maxHealth < 0.25 && defender.health > 0) {
      this._fireDialogue(defender, "lowHealth");
    }
  }

  _spawnHitParticles(x, y, blocked) {
    const intense = this.mode === "adult";
    const count = blocked ? 4 : (intense ? 12 : 7);
    const color = blocked ? "#dfe4ea" : (intense ? "#c81d25" : "#ffcf4d");
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * (intense ? 420 : 260),
        vy: -Math.random() * (intense ? 340 : 220),
        life: 260 + Math.random() * 220,
        maxLife: 480,
        color,
        size: 2 + Math.random() * (intense ? 4 : 2.5)
      });
    }
  }

  // -----------------------------------------------------------
  // Rendering
  // -----------------------------------------------------------
  render() { this._render(); }

  _render() {
    const ctx = this.ctx;
    const w = this.canvas.width, h = this.canvas.height;

    ctx.save();
    if (this.shakeMag > 0.5) {
      ctx.translate((Math.random() - 0.5) * this.shakeMag, (Math.random() - 0.5) * this.shakeMag);
    }

    this._drawArena(ctx, w, h);
    this._drawFighter(ctx, this.a);
    this._drawFighter(ctx, this.b);
    this._drawParticles(ctx);

    ctx.restore();
  }

  _drawArena(ctx, w, h) {
    const bg = this.images[this.arenaBg];
    const bgReady = bg && bg.complete && bg.naturalWidth;

    if (bgReady) {
      const scale = Math.max(w / bg.naturalWidth, h / bg.naturalHeight);
      const dw = bg.naturalWidth * scale, dh = bg.naturalHeight * scale;
      ctx.drawImage(bg, (w - dw) / 2, h - dh, dw, dh);

      const tint = ctx.createRadialGradient(w * 0.7, h * 0.25, 40, w * 0.5, h * 0.5, w * 0.75);
      tint.addColorStop(0, "rgba(26, 36, 64, 0.15)");
      tint.addColorStop(1, "rgba(5, 7, 9, 0.55)");
      ctx.fillStyle = tint;
      ctx.fillRect(0, 0, w, h);
    } else {
      const grad = ctx.createRadialGradient(w * 0.7, h * 0.25, 40, w * 0.5, h * 0.5, w * 0.75);
      grad.addColorStop(0, "#1a2440");
      grad.addColorStop(1, "#050709");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = "#0c1018";
      ctx.fillRect(0, this.groundY, w, h - this.groundY);
    }

    // faint red arena accent splatter (matches promo art) — subtle, non-graphic
    ctx.fillStyle = "rgba(200, 29, 37, 0.06)";
    for (let i = 0; i < 10; i++) {
      const rx = (i * 137) % w;
      const ry = h * 0.55 + ((i * 53) % (h * 0.4));
      ctx.beginPath();
      ctx.arc(rx, ry, 3 + (i % 4), 0, Math.PI * 2);
      ctx.fill();
    }

    // ground line
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.beginPath();
    ctx.moveTo(0, this.groundY);
    ctx.lineTo(w, this.groundY);
    ctx.stroke();
  }

  _drawFighter(ctx, f) {
    const img = this.images[f.data.portrait];
    const baseW = 148, baseH = 168;
    const groundY = this.groundY;

    let squash = 1, stretch = 1, tiltDeg = 0, offsetY = 0;

    if (f.state === FighterState.PUNCH || f.state === FighterState.KICK) {
      const t = f.actionPhase === "active" ? 1 : 0.4;
      stretch = 1 + 0.12 * t;
      squash = 1 - 0.06 * t;
    } else if (f.state === FighterState.GRAPPLE || f.state === FighterState.SPECIAL) {
      const t = f.actionPhase === "active" ? 1 : 0.5;
      stretch = 1 + 0.2 * t;
      squash = 1 - 0.1 * t;
    } else if (f.state === FighterState.HITSTUN) {
      tiltDeg = f.facing * -8;
    } else if (f.state === FighterState.BLOCK) {
      squash = 0.95;
    } else if (f.state === FighterState.KNOCKDOWN || f.state === FighterState.KO) {
      tiltDeg = f.facing * -78;
      offsetY = 46;
    }

    const w = baseW * squash;
    const h = baseH * stretch;
    const x = f.x;
    const y = groundY - h / 2 + offsetY;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((tiltDeg * Math.PI) / 180);
    ctx.scale(f.facing, 1);

    // shadow
    ctx.save();
    ctx.translate(0, groundY - y + offsetY * 0.3);
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.beginPath();
    ctx.ellipse(0, 0, baseW * 0.42, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // body plinth (colored, gives silhouette + faction accent even before art loads)
    ctx.fillStyle = f.data.color;
    roundRect(ctx, -w / 2, -h / 2, w, h, 18);
    ctx.fill();

    // portrait art
    if (img && img.complete && img.naturalWidth) {
      ctx.save();
      roundRect(ctx, -w / 2, -h / 2, w, h, 18);
      ctx.clip();
      const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
      const dw = img.naturalWidth * scale, dh = img.naturalHeight * scale;
      ctx.drawImage(img, -dw / 2, -h / 2 - (dh - h) * 0.28, dw, dh);
      ctx.restore();
    }

    // faction accent stripe
    ctx.fillStyle = f.data.accent;
    ctx.fillRect(-w / 2, h / 2 - 10, w, 6);

    // hit flash overlay
    if (f.hitFlash > 0) {
      ctx.globalAlpha = Math.min(0.6, f.hitFlash / 180 * 0.6);
      ctx.fillStyle = "#ffffff";
      roundRect(ctx, -w / 2, -h / 2, w, h, 18);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // meter-full glow ring on special-ready
    if (f.meter >= f.data.maxMeter) {
      ctx.strokeStyle = f.data.accent;
      ctx.lineWidth = 3;
      roundRect(ctx, -w / 2 - 4, -h / 2 - 4, w + 8, h + 8, 20);
      ctx.stroke();
    }

    ctx.restore();
  }

  _drawParticles(ctx) {
    this.particles.forEach(p => {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
