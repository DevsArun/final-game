// Lightweight particle system: low-poly cubes drawn with tint + alpha fade.
// Used for engine smoke, tyre-burst sparks and rain splashes.
import { Mesh } from "../core/mesh.js";
import { buildUnitCube } from "./models.js";
import { mat4 } from "../core/math.js";

const MAX = 220;

export class Particles {
  constructor(gl) {
    this.cube = new Mesh(gl, buildUnitCube());
    this.list = [];
  }

  _spawn(p) {
    if (this.list.length >= MAX) this.list.shift();
    this.list.push(p);
  }

  smoke(pos, intensity = 1) {
    this._spawn({
      pos: [pos[0], pos[1], pos[2]],
      vel: [(Math.random() - 0.5) * 0.6, 1.2 + Math.random(), (Math.random() - 0.5) * 0.6],
      life: 1.2 + Math.random() * 0.6,
      maxLife: 1.8,
      size: 0.4 + Math.random() * 0.3,
      grow: 1.8,
      color: [0.18, 0.18, 0.2],
      type: "smoke",
      rot: Math.random() * 3,
    });
  }

  sparks(pos, n = 8) {
    for (let i = 0; i < n; i++) {
      this._spawn({
        pos: [pos[0], pos[1], pos[2]],
        vel: [(Math.random() - 0.5) * 6, Math.random() * 4 + 1, (Math.random() - 0.5) * 6],
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.7,
        size: 0.12 + Math.random() * 0.1,
        grow: 0,
        gravity: 14,
        color: [1.0, 0.6, 0.1],
        type: "spark",
        rot: 0,
      });
    }
  }

  splash(pos) {
    this._spawn({
      pos: [pos[0], pos[1], pos[2]],
      vel: [(Math.random() - 0.5) * 1.2, Math.random() * 1.5 + 0.5, (Math.random() - 0.5) * 1.2],
      life: 0.3 + Math.random() * 0.2,
      maxLife: 0.5,
      size: 0.1 + Math.random() * 0.08,
      grow: 0.5,
      gravity: 9,
      color: [0.6, 0.7, 0.85],
      type: "splash",
      rot: 0,
    });
  }

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.life -= dt;
      if (p.life <= 0) { this.list.splice(i, 1); continue; }
      if (p.gravity) p.vel[1] -= p.gravity * dt;
      p.pos[0] += p.vel[0] * dt;
      p.pos[1] += p.vel[1] * dt;
      p.pos[2] += p.vel[2] * dt;
      if (p.pos[1] < 0.05 && p.type !== "smoke") { p.pos[1] = 0.05; p.vel[1] *= -0.3; }
      if (p.grow) p.size += p.grow * dt;
      p.rot += dt * 2;
    }
  }

  render(renderer) {
    for (const p of this.list) {
      const a = Math.min(1, p.life / p.maxLife);
      const alpha = p.type === "smoke" ? a * 0.55 : a;
      const m = mat4.compose(p.pos, [p.rot, p.rot * 0.7, 0], [p.size, p.size, p.size]);
      renderer.draw(this.cube, m, { tint: p.color, alpha });
    }
  }

  clear() { this.list.length = 0; }
}
