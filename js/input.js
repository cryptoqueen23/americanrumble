/**
 * input.js
 * ------------------------------------------------------------
 * Produces one unified state object for player 1's controls:
 *   { moveX: -1..1, punch, kick, block, grapple, special }
 * Works from keyboard (desktop/browser testing) AND a touch
 * joystick + button cluster (mobile / Android WebView build).
 * ------------------------------------------------------------
 */

class InputController {
  constructor() {
    this.state = {
      moveX: 0,
      punch: false,
      kick: false,
      block: false,
      grapple: false,
      special: false
    };

    // one-shot "just pressed" flags, consumed each frame by fighter.js
    this._pressedOnce = { punch: false, kick: false, grapple: false, special: false };

    this._initKeyboard();
    this._initTouch();
  }

  consumePress(action) {
    if (this._pressedOnce[action]) {
      this._pressedOnce[action] = false;
      return true;
    }
    return false;
  }

  _initKeyboard() {
    const keysDown = new Set();

    window.addEventListener("keydown", (e) => {
      if (keysDown.has(e.code)) return; // ignore auto-repeat for one-shot actions
      keysDown.add(e.code);
      this._applyKey(e.code, true);
    });

    window.addEventListener("keyup", (e) => {
      keysDown.delete(e.code);
      this._applyKey(e.code, false);
    });
  }

  _applyKey(code, isDown) {
    switch (code) {
      case "ArrowLeft":
      case "KeyA":
        this.state.moveX = isDown ? -1 : (this.state.moveX === -1 ? 0 : this.state.moveX);
        break;
      case "ArrowRight":
      case "KeyD":
        this.state.moveX = isDown ? 1 : (this.state.moveX === 1 ? 0 : this.state.moveX);
        break;
      case "KeyJ":
        this.state.punch = isDown;
        if (isDown) this._pressedOnce.punch = true;
        break;
      case "KeyK":
        this.state.kick = isDown;
        if (isDown) this._pressedOnce.kick = true;
        break;
      case "KeyL":
        this.state.grapple = isDown;
        if (isDown) this._pressedOnce.grapple = true;
        break;
      case "Semicolon":
        this.state.special = isDown;
        if (isDown) this._pressedOnce.special = true;
        break;
      case "ShiftLeft":
      case "ShiftRight":
      case "KeyS":
        this.state.block = isDown;
        break;
    }
  }

  _initTouch() {
    // ---- Joystick ----
    const stick = document.getElementById("joystick");
    const stickKnob = document.getElementById("joystick-knob");
    if (stick) {
      let dragging = false;
      const maxRadius = 38;

      const setKnob = (dx) => {
        const clamped = Math.max(-maxRadius, Math.min(maxRadius, dx));
        stickKnob.style.transform = `translate(${clamped}px, 0px)`;
        this.state.moveX = clamped / maxRadius;
      };

      const resetKnob = () => {
        stickKnob.style.transform = `translate(0px, 0px)`;
        this.state.moveX = 0;
      };

      let originX = 0;

      const start = (clientX) => {
        dragging = true;
        originX = clientX;
      };
      const move = (clientX) => {
        if (!dragging) return;
        setKnob(clientX - originX);
      };
      const end = () => {
        dragging = false;
        resetKnob();
      };

      stick.addEventListener("touchstart", (e) => { e.preventDefault(); start(e.touches[0].clientX); }, { passive: false });
      stick.addEventListener("touchmove", (e) => { e.preventDefault(); move(e.touches[0].clientX); }, { passive: false });
      stick.addEventListener("touchend", (e) => { e.preventDefault(); end(); }, { passive: false });

      // mouse fallback for desktop browser testing
      stick.addEventListener("mousedown", (e) => start(e.clientX));
      window.addEventListener("mousemove", (e) => move(e.clientX));
      window.addEventListener("mouseup", () => end());
    }

    // ---- Buttons ----
    const bind = (id, action, holdable) => {
      const el = document.getElementById(id);
      if (!el) return;

      const press = (e) => {
        e.preventDefault();
        this.state[action] = true;
        this._pressedOnce[action] = true;
        el.classList.add("pressed");
      };
      const release = (e) => {
        e.preventDefault();
        this.state[action] = false;
        el.classList.remove("pressed");
      };

      el.addEventListener("touchstart", press, { passive: false });
      el.addEventListener("touchend", release, { passive: false });
      el.addEventListener("touchcancel", release, { passive: false });
      el.addEventListener("mousedown", press);
      el.addEventListener("mouseup", release);
      el.addEventListener("mouseleave", release);
    };

    bind("btn-punch", "punch");
    bind("btn-kick", "kick");
    bind("btn-grapple", "grapple");
    bind("btn-special", "special");
    bind("btn-block", "block");
  }
}
