// Keyboard + mouse input, translated into a per-step snapshot.
// Left button fires, right button (or E) throws a gravity well.
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.pressed = new Set();
    this.mouseX = 640; this.mouseY = 300;
    this.mouseDown = false; this.rightDown = false;
    this.rightPressed = false;
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
      if (!e.repeat) this.pressed.add(e.key.toLowerCase());
      this.keys.add(e.key.toLowerCase());
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    canvas.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouseX = (e.clientX - r.left) * (canvas.width / r.width);
      this.mouseY = (e.clientY - r.top) * (canvas.height / r.height);
    });
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 2) { this.rightDown = true; this.rightPressed = true; }
      else if (e.button === 0) this.mouseDown = true;
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 2) this.rightDown = false;
      else if (e.button === 0) this.mouseDown = false;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  wasPressed(key) { return this.pressed.has(key.toLowerCase()); }
  endFrame() { this.pressed.clear(); this.rightPressed = false; }
  snapshot() {
    const k = this.keys;
    let mx = (k.has('d') || k.has('arrowright') ? 1 : 0) - (k.has('a') || k.has('arrowleft') ? 1 : 0);
    let my = (k.has('s') || k.has('arrowdown') ? 1 : 0) - (k.has('w') || k.has('arrowup') ? 1 : 0);
    const len = Math.hypot(mx, my) || 1;
    return {
      moveX: mx / len, moveY: my / len,
      aimX: this.mouseX, aimY: this.mouseY,
      firing: this.mouseDown || k.has(' '),
      dash: k.has('shift'),
      throwWell: this.rightPressed || this.wasPressed('e'),
    };
  }
}
