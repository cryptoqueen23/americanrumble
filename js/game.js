class Team {
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.fighters = [];
    this.activeIndex = 0;
  }

  getActiveFighter() {
    return this.fighters[this.activeIndex] || null;
  }

  getBenchFighter() {
    for (let i = 0; i < this.fighters.length; i++) {
      if (i !== this.activeIndex && !this.fighters[i].isKO) {
        return this.fighters[i];
      }
    }
    return null;
  }

  canTag() {
    const active = this.getActiveFighter();
    const bench = this.getBenchFighter();
    return active && bench && !active.isKO && !bench.isKO && !active.isTagging;
  }

  tagNext() {
    const bench = this.getBenchFighter();
    if (bench) {
      this.activeIndex = this.fighters.indexOf(bench);
      return bench;
    }
    return null;
  }

  isEliminated() {
    return this.fighters.length > 0 && this.fighters.every(f => f.isKO);
  }
}

class Game {
  constructor() {
    this.matchType = '1v1'; // Default match mode
    this.contentMode = 'family'; // Default content mode
    
    this.team1 = new Team(1, "Player 1");
    this.team2 = new Team(2, "CPU Team");

    this.selectedKeysP1 = [];
    this.selectedKeysP2 = [];

    this.aiController = null;
    this.timer = 90;
    this.timerAcc = 0;
    this.isFighting = false;

    this.initUI();
  }

  initUI() {
    try {
      // 1. Resolve Pre-Highlighted Class Conflicts & Bind Mode Selectors
      const btn1v1 = document.getElementById('btn-match-1v1');
      const btn2v2 = document.getElementById('btn-match-2v2');

      if (btn1v1 && btn2v2) {
        // Enforce single active state programmatically
        btn1v1.classList.add('active');
        btn2v2.classList.remove('active');

        btn1v1.onclick = () => {
          this.matchType = '1v1';
          btn1v1.classList.add('active');
          btn2v2.classList.remove('active');
          this.resetRosterSelection();
        };

        btn2v2.onclick = () => {
          this.matchType = '2v2';
          btn2v2.classList.add('active');
          btn1v1.classList.remove('active');
          this.resetRosterSelection();
        };
      }

      // Content Rating Mode Toggles
      const modeBtns = document.querySelectorAll('.mode-btn[data-mode]');
      modeBtns.forEach(btn => {
        btn.onclick = () => {
          modeBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.contentMode = btn.getAttribute('data-mode') || 'family';
        };
      });

      // 2. Safe Roster Generation
      this.renderRoster();

      // 3. Start Fight Button
      const btnStart = document.getElementById('btn-start-fight');
      if (btnStart) {
        btnStart.disabled = true;
        btnStart.innerText = "SELECT A FIGHTER";
        btnStart.onclick = () => this.startFight();
      }

      // 4. Tag Control Listeners
      window.addEventListener('keydown', (e) => {
        if (e.code === 'KeyT' && this.isFighting && this.matchType === '2v2') {
          this.executeTag(1);
        }
      });

      const btnTag = document.getElementById('btn-tag');
      if (btnTag) {
        btnTag.onclick = () => {
          if (this.isFighting && this.matchType === '2v2') this.executeTag(1);
        };
      }

      const btnMute = document.getElementById('btn-mute');
      if (btnMute) {
        btnMute.onclick = () => {
          window.audioManager?.unlock();
          const muted = window.audioManager?.toggleMute();
          btnMute.innerHTML = muted ? "&#128263;" : "&#128266;";
        };
      }

      // Rematch & Menu Buttons
      const btnRematch = document.getElementById('btn-rematch');
      if (btnRematch) {
        btnRematch.onclick = () => {
          document.getElementById('screen-result')?.classList.add('hidden');
          this.startFight();
        };
      }

      const btnMenu = document.getElementById('btn-menu');
      if (btnMenu) {
        btnMenu.onclick = () => {
          document.getElementById('screen-result')?.classList.add('hidden');
          document.getElementById('screen-fight')?.classList.remove('active');
          document.getElementById('screen-menu')?.classList.add('active');
          this.resetRosterSelection();
        };
      }

    } catch (err) {
      console.error("Critical UI Initialization Error caught:", err);
    }
  }

  resetRosterSelection() {
    this.selectedKeysP1 = [];
    this.selectedKeysP2 = [];
    
    const instr = document.getElementById('roster-instruction');
    if (instr) instr.innerText = `Select Player 1 Fighter (1/${this.matchType === '2v2' ? 2 : 1})`;

    const btnStart = document.getElementById('btn-start-fight');
    if (btnStart) {
      btnStart.disabled = true;
      btnStart.innerText = "SELECT A FIGHTER";
    }

    this.renderRoster();
  }

  renderRoster() {
    const container = document.getElementById('roster');
    if (!container) return;

    container.innerHTML = '';
    
    // Ensure CHARACTERS global exists safely
    const characters = window.CHARACTERS || {
      elephant: { name: 'Elephant', party: 'Republican' },
      ferret: { name: 'Ferret', party: 'Independent' },
      porcupine: { name: 'Porcupine', party: 'Libertarian' },
      donkey: { name: 'Donkey', party: 'Democrat' }
    };

    Object.keys(characters).forEach(key => {
      const char = characters[key];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'roster-card';
      if (this.selectedKeysP1.includes(key)) btn.classList.add('selected');

      btn.innerHTML = `<img src="${char.portrait}" alt="${char.name}"><strong>${char.name}</strong><span>${char.faction || char.party || ''}</span>`;
      btn.onclick = () => this.handleRosterClick(key);
      container.appendChild(btn);
    });
  }

  handleRosterClick(key) {
    const requiredPicks = (this.matchType === '2v2') ? 2 : 1;

    if (this.selectedKeysP1.length < requiredPicks && !this.selectedKeysP1.includes(key)) {
      this.selectedKeysP1.push(key);
    } else if (this.selectedKeysP1.includes(key)) {
      // Toggle off if clicked again
      this.selectedKeysP1 = this.selectedKeysP1.filter(k => k !== key);
    }

    this.renderRoster();

    const instr = document.getElementById('roster-instruction');
    const btnStart = document.getElementById('btn-start-fight');

    if (this.selectedKeysP1.length < requiredPicks) {
      if (instr) instr.innerText = `Select Player 1 Partner (${this.selectedKeysP1.length + 1}/${requiredPicks})`;
      if (btnStart) {
        btnStart.disabled = true;
        btnStart.innerText = "SELECT A FIGHTER";
      }
    } else {
      if (instr) instr.innerText = `Team Ready! Click Start Fight.`;
      
      // Auto-assign CPU Opponents
      const characters = window.CHARACTERS || {};
      const available = Object.keys(characters).filter(k => !this.selectedKeysP1.includes(k));
      this.selectedKeysP2 = available.length >= requiredPicks 
        ? available.slice(0, requiredPicks) 
        : Object.keys(characters).slice(0, requiredPicks);

      if (btnStart) {
        btnStart.disabled = false;
        btnStart.innerText = "START FIGHT";
      }
    }
  }

  startFight() {
    if (this.selectedKeysP1.length === 0) return;

    document.getElementById('screen-menu')?.classList.remove('active');
    document.getElementById('screen-fight')?.classList.add('active');

    const characters = window.CHARACTERS || {};

    // Instantiate Teams safely
    this.team1.fighters = this.selectedKeysP1.map(k => {
      const data = characters[k] || { name: k, hp: 100, stamina: 100 };
      return new Fighter(data, 250, 1, true);
    });

    this.team2.fighters = this.selectedKeysP2.map(k => {
      const data = characters[k] || { name: k, hp: 100, stamina: 100 };
      return new Fighter(data, 950, -1, false);
    });

    this.team1.activeIndex = 0;
    this.team2.activeIndex = 0;

    // Bench inactive fighters off-screen
    this.team1.fighters.forEach((f, i) => { if (i !== 0) f.x = -9999; });
    this.team2.fighters.forEach((f, i) => { if (i !== 0) f.x = -9999; });

    if (typeof AIController !== 'undefined') {
      this.aiController = new AIController(this.team2.getActiveFighter(), this.team2, this);
    }

    // Configure Tag HUD visibility
    const tagBtn = document.getElementById('btn-tag');
    const benchA = document.getElementById('bench-card-a');
    const benchB = document.getElementById('bench-card-b');

    if (this.matchType === '2v2') {
      tagBtn?.classList.remove('hidden');
      benchA?.classList.remove('hidden');
      benchB?.classList.remove('hidden');
    } else {
      tagBtn?.classList.add('hidden');
      benchA?.classList.add('hidden');
      benchB?.classList.add('hidden');
    }

    this.timer = 90;
    this.isFighting = true;

    // Audio: unlock on this user gesture, then kick off the arena music bed
    window.audioManager?.unlock();
    window.audioManager?.stopMusic();
    window.audioManager?.startMusic();
    window.audioManager?.stopCrowd();
    window.audioManager?.startCrowd();

    const canvas = document.getElementById('fight-canvas');
    const player = this.team1.getActiveFighter();
    const cpu = this.team2.getActiveFighter();

    if (!canvas || !player || !cpu) {
      console.error('Unable to start fight: missing canvas or fighter data.');
      return;
    }

    if (window.engine && typeof window.engine.stop === 'function') {
      window.engine.stop();
    }

    window.inputController = window.inputController || new InputController();
    window.cpuController = new AIController('normal');
    window.engine = new FightEngine(canvas, player, cpu, {
      mode: this.contentMode,
      onKO: () => { window.audioManager?.ko(); this.endMatch(); },
      onHit: (attacker, defender, blocked) => {
        const intense = this.contentMode === 'adult';
        window.audioManager?.hitSound(attacker.currentMoveKey, blocked, intense);
      }
    });
    window.engine.start();

    let lastTime = performance.now();
    const frame = (now) => {
      if (!window.engine || !window.engine.running) return;
      const dt = Math.min(40, now - lastTime);
      lastTime = now;

      window.cpuController.update(dt, cpu, player);
      window.engine.update(dt, window.inputController.state, window.cpuController.state);
      window.engine.applyControllerActions(player, window.inputController);
      window.engine.applyControllerActions(cpu, window.cpuController);
      window.engine.render();
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  executeTag(teamId) {
    const team = (teamId === 1) ? this.team1 : this.team2;
    if (!team || !team.canTag()) return;

    const current = team.getActiveFighter();
    const spawnX = current.x;
    const spawnY = current.y;

    current.isTagging = true;
    current.x = -9999;

    const next = team.tagNext();
    if (next) {
      next.x = spawnX;
      next.y = spawnY;
      next.isTagging = false;

      if (teamId === 2 && this.aiController) {
        this.aiController.fighter = next;
      }
    }
  }

  update(dt) {
    if (!this.isFighting) return;

    // Match Timer
    this.timerAcc += dt;
    if (this.timerAcc >= 1.0) {
      this.timer = Math.max(0, this.timer - 1);
      this.timerAcc = 0;
    }

    const p1 = this.team1.getActiveFighter();
    const p2 = this.team2.getActiveFighter();

    // Input Handling
    if (p1 && !p1.isKO && window.inputHandler) {
      if (window.inputHandler.isP1Left()) p1.vx = -300;
      else if (window.inputHandler.isP1Right()) p1.vx = 300;
      else p1.vx = 0;

      if (window.inputHandler.isP1Up() && p1.isGrounded) {
        p1.vy = -600;
        p1.isGrounded = false;
      }

      if (window.inputHandler.isP1Punch()) p1.punch();
      if (window.inputHandler.isP1Kick()) p1.kick();
      if (window.inputHandler.isP1Grapple()) p1.grapple();
      if (window.inputHandler.isP1Special()) p1.activateSaintPower();
      p1.isBlocking = window.inputHandler.isP1Block();

      p1.update(dt);
    }

    // AI Processing
    if (p2 && !p2.isKO && this.aiController) {
      this.aiController.update(p1, dt);
      p2.update(dt);
    }

    // Hit Detection & Auto-Tagging on KO
    if (p1 && p2) {
      if (p1.hp <= 0 && !p1.isKO) {
        p1.isKO = true;
        if (this.matchType === '2v2' && !this.team1.isEliminated()) this.executeTag(1);
      }
      if (p2.hp <= 0 && !p2.isKO) {
        p2.isKO = true;
        if (this.matchType === '2v2' && !this.team2.isEliminated()) this.executeTag(2);
      }
    }

    // Match End
    if (this.team1.isEliminated() || this.team2.isEliminated() || this.timer <= 0) {
      this.endMatch();
    }

    this.updateHUD();
  }

  updateHUD() {
    const p1 = this.team1.getActiveFighter();
    const p2 = this.team2.getActiveFighter();

    if (p1) {
      const elName = document.getElementById('hud-name-a');
      const elHp = document.getElementById('bar-health-a');
      const elStamina = document.getElementById('bar-stamina-a');
      const elMeter = document.getElementById('bar-meter-a');

      if (elName) elName.innerText = p1.name;
      if (elHp) elHp.style.width = `${(p1.hp / p1.maxHp) * 100}%`;
      if (elStamina) elStamina.style.width = `${(p1.stamina / p1.maxStamina) * 100}%`;
      if (elMeter) elMeter.style.width = `${p1.meter}%`;
    }

    if (p2) {
      const elName = document.getElementById('hud-name-b');
      const elHp = document.getElementById('bar-health-b');
      const elStamina = document.getElementById('bar-stamina-b');
      const elMeter = document.getElementById('bar-meter-b');

      if (elName) elName.innerText = p2.name;
      if (elHp) elHp.style.width = `${(p2.hp / p2.maxHp) * 100}%`;
      if (elStamina) elStamina.style.width = `${(p2.stamina / p2.maxStamina) * 100}%`;
      if (elMeter) elMeter.style.width = `${p2.meter}%`;
    }

    if (this.matchType === '2v2') {
      const b1 = this.team1.getBenchFighter();
      const b2 = this.team2.getBenchFighter();

      if (b1) {
        const benchName = document.getElementById('bench-name-a');
        const benchHp = document.getElementById('bar-bench-health-a');
        if (benchName) benchName.innerText = b1.isKO ? `${b1.name} (KO)` : b1.name;
        if (benchHp) benchHp.style.width = `${(b1.hp / b1.maxHp) * 100}%`;
      }
      if (b2) {
        const benchName = document.getElementById('bench-name-b');
        const benchHp = document.getElementById('bar-bench-health-b');
        if (benchName) benchName.innerText = b2.isKO ? `${b2.name} (KO)` : b2.name;
        if (benchHp) benchHp.style.width = `${(b2.hp / b2.maxHp) * 100}%`;
      }
    }

    const timerEl = document.getElementById('hud-timer');
    if (timerEl) timerEl.innerText = this.timer;
  }

  endMatch() {
    this.isFighting = false;
    window.audioManager?.stopMusic();
    window.audioManager?.stopCrowd();
    document.getElementById('screen-fight')?.classList.remove('active');
    document.getElementById('screen-result')?.classList.remove('hidden');

    const title = document.getElementById('result-title');
    if (title) {
      title.innerText = this.team2.isEliminated() ? "VICTORY" : "DEFEAT";
    }
  }
}

// Ensure game boots safely on DOM completion
window.addEventListener('DOMContentLoaded', () => {
  try {
    window.game = new Game();
  } catch (err) {
    console.error("Failed to boot Game instance:", err);
  }
});
