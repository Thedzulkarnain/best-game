// Keyboard + mouse input, kept apart from the simulation: the game reads a
// plain snapshot (move vector, aim point, fire held, pressed keys) each step.
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.pressed = new Set();
    this.mouseX = 640; this.mouseY = 360; this.mouseDown = false;
    this.canvas = canvas;
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
    canvas.addEventListener('mousedown', (e) => { if (e.button === 0) this.mouseDown = true; });
    window.addEventListener('mouseup', () => { this.mouseDown = false; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  snapshot() {
    let x = 0, y = 0;
    if (this.keys.has('a') || this.keys.has('arrowleft')) x -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) x += 1;
    if (this.keys.has('w') || this.keys.has('arrowup')) y -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) y += 1;
    const len = Math.hypot(x, y) || 1;
    return {
      moveX: x / len, moveY: y / len,
      aimX: this.mouseX, aimY: this.mouseY,
      firing: this.mouseDown || this.keys.has(' '),
      dash: this.keys.has('shift'),
    };
  }
  wasPressed(key) { return this.pressed.has(key.toLowerCase()); }
  endFrame() { this.pressed.clear(); }
}
