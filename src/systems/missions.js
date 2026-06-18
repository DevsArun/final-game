// Cargo delivery job generator + tracker.
import { vec3 } from "../core/math.js";

const CARGO_TYPES = [
  "Furniture", "Electronics", "Fresh Produce", "Steel Pipes", "Car Parts",
  "Livestock Feed", "Construction Gear", "Frozen Goods", "Textiles", "Machinery",
];

const JOB_TYPES = [
  { id: "standard", label: "Standard", tag: "", rewardMul: 1.0, timeMul: 1.0, weight: 5 },
  { id: "rush", label: "Rush", tag: "⏱ RUSH", rewardMul: 1.5, timeMul: 0.6, weight: 2 },
  { id: "fragile", label: "Fragile", tag: "⚠ FRAGILE", rewardMul: 1.6, timeMul: 1.05, weight: 2 },
  { id: "heavy", label: "Heavy", tag: "🏋 HEAVY", rewardMul: 1.7, timeMul: 1.3, weight: 2 },
];

function pickJobType() {
  const total = JOB_TYPES.reduce((s, t) => s + t.weight, 0);
  let r = Math.random() * total;
  for (const t of JOB_TYPES) { if ((r -= t.weight) <= 0) return t; }
  return JOB_TYPES[0];
}

const ARRIVE_RADIUS = 9;

export class MissionManager {
  constructor(world) {
    this.world = world;
    this.active = null;
  }

  // Build a fresh job offer (not yet accepted).
  generateOffer(profile) {
    const hubs = this.world.hubs;
    let a = hubs[Math.floor(Math.random() * hubs.length)];
    let b = hubs[Math.floor(Math.random() * hubs.length)];
    let guard = 0;
    while (b === a && guard++ < 10) b = hubs[Math.floor(Math.random() * hubs.length)];

    const dist = vec3.dist2D(a.pos, b.pos);
    const levelBonus = 1 + profile.level * 0.05;
    const reward = Math.round((80 + dist * 2.0) * levelBonus);
    const xp = Math.round(35 + dist * 0.7);
    const cargo = CARGO_TYPES[Math.floor(Math.random() * CARGO_TYPES.length)];
    // generous time budget so new players never feel rushed
    const timeLimit = Math.round(80 + dist * 1.7);

    const type = pickJobType();
    return {
      pickup: a, dropoff: b, cargo, type,
      reward: Math.round(reward * type.rewardMul),
      xp: Math.round(xp * (type.id === "standard" ? 1 : 1.2)),
      distance: Math.round(dist),
      timeLimit: Math.round(timeLimit * type.timeMul),
    };
  }

  accept(offer) {
    this.active = {
      ...offer,
      phase: "pickup",     // pickup -> deliver
      timeLeft: offer.timeLimit,
      damageTaken: 0,
      perfect: true,
    };
    return this.active;
  }

  cancel() { this.active = null; }

  get target() {
    if (!this.active) return null;
    return this.active.phase === "pickup" ? this.active.pickup.pos : this.active.dropoff.pos;
  }
  get targetName() {
    if (!this.active) return "";
    return this.active.phase === "pickup" ? this.active.pickup.name : this.active.dropoff.name;
  }

  // Returns event string: "picked", "delivered", "timeout", or null.
  update(dt, truckPos) {
    if (!this.active) return null;
    const job = this.active;
    job.timeLeft -= dt;
    if (job.timeLeft <= 0) { job.timeLeft = 0; return "timeout"; }

    const d = vec3.dist2D(truckPos, this.target);
    if (d < ARRIVE_RADIUS) {
      if (job.phase === "pickup") { job.phase = "deliver"; return "picked"; }
      return "delivered";
    }
    return null;
  }

  distanceToTarget(truckPos) {
    if (!this.target) return 0;
    return vec3.dist2D(truckPos, this.target);
  }

  registerDamage(amount) {
    if (this.active) {
      this.active.damageTaken += amount;
      const lim = this.active.type && this.active.type.id === "fragile" ? 18 : 45;
      if (this.active.damageTaken > lim) this.active.perfect = false;
    }
  }
}
