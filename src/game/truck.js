// Arcade truck vehicle: physics, collisions, rendering.
import { mat4, clamp } from "../core/math.js";
import { Mesh } from "../core/mesh.js";
import { buildTruck, buildWheel } from "./models.js";

const KMH_PER_MS = 3.6;

export class Truck {
  constructor(gl, truckDef, stats) {
    this.gl = gl;
    this.setTruck(gl, truckDef);
    this.applyStats(stats);
    this.reset([0, 0, 0], 0);
  }

  setTruck(gl, truckDef, cabOverride) {
    const colors = Object.assign({}, truckDef.colors);
    if (cabOverride) colors.cab = cabOverride;
    const model = buildTruck(colors);
    this.bodyMesh = new Mesh(gl, model.body);
    this.wheelMesh = new Mesh(gl, buildWheel(model.wheelRadius));
    this.wheels = model.wheels;
    this.dims = model.dims;
    this.def = truckDef;
  }

  applyStats(stats) {
    this.stats = stats;
    this.maxSpeedMS = stats.maxSpeed / KMH_PER_MS;
    this.accelForce = stats.accel;
    this.steerRate = stats.handling;
    this.grip = stats.grip;
  }

  reset(pos, heading) {
    this.pos = [pos[0], 0, pos[2]];
    this.heading = heading;        // yaw radians
    this.speed = 0;                // m/s along heading (signed)
    this.lateral = 0;              // skid velocity
    this.wheelSpin = 0;
    this.steerAngle = 0;
    this.steer = 0;
    this.yawRate = 0;
    this.airborne = false;
    this.vy = 0;
    this.burstWheel = -1;          // index of a burst tyre, or -1
    this.handlingBias = 0;         // steering pull (e.g. from tyre burst)
    this._model = mat4.identity();
  }

  get speedKMH() { return Math.abs(this.speed) * KMH_PER_MS; }

  update(dt, input, world, canMove) {
    const steerInput = input.steer();
    const throttle = input.throttle();
    const brake = input.brake();
    const handbrake = input.handbrake();

    // ---- Longitudinal (smooth accel with easing near top speed) ----
    if (canMove) {
      if (throttle > 0) {
        const ratio = clamp(this.speed / this.maxSpeedMS, 0, 1);
        this.speed += this.accelForce * throttle * (1 - ratio * 0.82) * dt;
      } else if (brake > 0) {
        if (this.speed > 0.4) this.speed -= this.accelForce * 1.7 * dt;       // brake
        else this.speed -= this.accelForce * 0.55 * dt;                       // reverse
      } else {
        this.speed -= this.speed * Math.min(0.7 * dt, 0.4);                   // coast
        if (Math.abs(this.speed) < 0.04) this.speed = 0;
      }
    } else {
      this.speed -= this.speed * Math.min(2.5 * dt, 0.9);
    }
    this.speed = clamp(this.speed, -this.maxSpeedMS * 0.35, this.maxSpeedMS);

    // ---- Steering: smooth toward input, auto-center on release ----
    const speedFrac = clamp(Math.abs(this.speed) / this.maxSpeedMS, 0, 1);
    // tighter lock at low speed, much softer at high speed (stable highway feel)
    const maxAngle = (0.5 - 0.36 * speedFrac) * clamp(this.steerRate / 1.5, 0.75, 1.3);
    const rate = steerInput === 0 ? 4.0 : 2.4; // return-to-centre faster than turn-in
    this.steer = (this.steer || 0) + (steerInput - (this.steer || 0)) * Math.min(rate * dt, 1);
    const wheelAngle = this.steer * maxAngle;
    this.steerAngle = wheelAngle; // drives front-wheel visual

    // Bicycle model: yaw scales with forward speed -> no spin-in-place, real arcs
    const L = 5.2; // wheelbase
    const dir = this.speed >= 0 ? 1 : -1;
    let yaw = (this.speed / L) * Math.tan(wheelAngle) * this.grip;
    if (handbrake && Math.abs(this.speed) > 1) yaw *= 1.7; // drift
    yaw = clamp(yaw, -1.3, 1.3);
    this.yawRate = yaw;
    this.heading += (yaw + this.handlingBias * speedFrac * dir) * dt;

    // ---- Move ----
    const fwd = [Math.sin(this.heading), Math.cos(this.heading)];
    let nx = this.pos[0] + fwd[0] * this.speed * dt;
    let nz = this.pos[2] + fwd[1] * this.speed * dt;

    // ---- Collisions with world obstacles (AABB vs circle) ----
    const r = this.dims.halfWidth + 0.6;
    let hitImpulse = 0;
    if (world) {
      for (const o of world.obstacles) {
        const cx = clamp(nx, o.x - o.hw, o.x + o.hw);
        const cz = clamp(nz, o.z - o.hd, o.z + o.hd);
        const dx = nx - cx, dz = nz - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 < r * r) {
          const d = Math.sqrt(d2) || 0.0001;
          const push = (r - d) / d;
          nx += dx * push;
          nz += dz * push;
          hitImpulse = Math.max(hitImpulse, Math.abs(this.speed));
          this.speed *= 0.3; // crash slows you hard
        }
      }
      // border
      const lim = world.borderLimit || 9999;
      if (nx > lim) { nx = lim; hitImpulse = Math.max(hitImpulse, Math.abs(this.speed) * 0.5); this.speed *= 0.4; }
      if (nx < -lim) { nx = -lim; hitImpulse = Math.max(hitImpulse, Math.abs(this.speed) * 0.5); this.speed *= 0.4; }
      if (nz > lim) { nz = lim; hitImpulse = Math.max(hitImpulse, Math.abs(this.speed) * 0.5); this.speed *= 0.4; }
      if (nz < -lim) { nz = -lim; hitImpulse = Math.max(hitImpulse, Math.abs(this.speed) * 0.5); this.speed *= 0.4; }
    }

    this.pos[0] = nx;
    this.pos[2] = nz;

    // wheel spin for visuals
    this.wheelSpin += (this.speed / 0.62) * dt;

    // body roll (lean into the turn) + pitch (squat under accel/brake)
    const targetRoll = clamp(-this.yawRate * 0.10, -0.13, 0.13);
    this.roll = (this.roll || 0) + (targetRoll - (this.roll || 0)) * Math.min(6 * dt, 1);
    const targetPitch = clamp((throttle - brake) * -0.03 * (0.4 + speedFrac), -0.05, 0.05);
    this.pitch = (this.pitch || 0) + (targetPitch - (this.pitch || 0)) * Math.min(6 * dt, 1);

    return { hitImpulse, speedKMH: this.speedKMH };
  }

  render(renderer, opts = {}) {
    const tint = opts.tint || [1, 1, 1];
    const model = mat4.compose(
      [this.pos[0], this.pos[1], this.pos[2]],
      [this.pitch || 0, this.heading, this.roll || 0],
      [1, 1, 1]
    );
    this._model = model;
    renderer.draw(this.bodyMesh, model, { tint, spec: 0.5, shininess: 64, rim: 0.16 });

    // wheels
    for (let i = 0; i < this.wheels.length; i++) {
      const w = this.wheels[i];
      const steer = w.steer ? this.steerAngle * 0.6 : 0;
      const flat = i === this.burstWheel ? [1, 0.4, 1] : [1, 1, 1];
      const local = mat4.multiply(
        mat4.compose(w.pos, [0, steer, 0], [1, 1, 1]),
        mat4.scaling(flat[0], flat[1], flat[2])
      );
      const spin = mat4.rotationX(-this.wheelSpin);
      const wm = mat4.multiply(mat4.multiply(model, local), spin);
      renderer.draw(this.wheelMesh, wm, { tint, spec: 0.05, shininess: 8 });
    }
  }

  modelMatrix() {
    return mat4.compose(
      [this.pos[0], this.pos[1], this.pos[2]],
      [this.pitch || 0, this.heading, this.roll || 0],
      [1, 1, 1]
    );
  }

  // Transform a truck-local point into world space (ignores pitch/roll).
  localToWorld(p) {
    const c = Math.cos(this.heading), s = Math.sin(this.heading);
    return [
      this.pos[0] + (c * p[0] + s * p[2]),
      this.pos[1] + p[1],
      this.pos[2] + (-s * p[0] + c * p[2]),
    ];
  }
}
