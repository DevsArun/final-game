// Player profile: money, XP/level, owned trucks, upgrades, lifetime stats.
// Persists through the platform adapter.
import { TRUCKS, UPGRADES, getTruck, upgradeCost, effectiveStats } from "../config/trucks.js";

const SAVE_KEY = "profile_v1";

export function xpForLevel(level) {
  return Math.floor(120 * Math.pow(level, 1.45));
}

export class Profile {
  constructor(platform) {
    this.platform = platform;
    this.data = this._default();
  }

  _default() {
    return {
      money: 600,
      xp: 0,
      level: 1,
      ownedTrucks: ["starter"],
      selectedTruck: "starter",
      upgrades: { starter: { engine: 0, tank: 0, armor: 0, tires: 0 } },
      stats: { jobsDone: 0, distanceKm: 0, totalEarned: 0, perfectJobs: 0, nightJobs: 0, rainJobs: 0 },
      achievements: [],
      best: { level: 0, totalEarned: 0, jobsDone: 0 },
      cosmetics: {
        ownedSkins: ["default"], skin: "default",
        ownedHorns: ["stock"], horn: "stock",
        ownedLights: ["none"], light: "none",
      },
      settings: { muted: false },
      lastDailyClaim: 0,
    };
  }

  _ensureShape() {
    const d = this.data;
    const def = this._default();
    d.stats = Object.assign({}, def.stats, d.stats || {});
    d.cosmetics = Object.assign({}, def.cosmetics, d.cosmetics || {});
    d.settings = Object.assign({}, def.settings, d.settings || {});
    d.achievements = d.achievements || [];
    d.best = Object.assign({}, def.best, d.best || {});
    d.upgrades = d.upgrades || {};
  }

  async load() {
    const saved = await this.platform.loadData(SAVE_KEY);
    if (saved && typeof saved === "object") {
      this.data = { ...this._default(), ...saved };
      this._ensureShape();
      for (const id of this.data.ownedTrucks) {
        if (!this.data.upgrades[id]) this.data.upgrades[id] = { engine: 0, tank: 0, armor: 0, tires: 0 };
      }
    }
    return this.data;
  }

  async save() { await this.platform.saveData(SAVE_KEY, this.data); }

  // ---- money ----
  get money() { return this.data.money; }
  addMoney(n) { this.data.money += n; if (n > 0) this.data.stats.totalEarned += n; }
  canAfford(n) { return this.data.money >= n; }
  spend(n) { if (this.data.money >= n) { this.data.money -= n; return true; } return false; }

  // ---- xp / level ----
  get level() { return this.data.level; }
  addXP(n) {
    this.data.xp += n;
    let leveled = false;
    while (this.data.xp >= xpForLevel(this.data.level)) {
      this.data.xp -= xpForLevel(this.data.level);
      this.data.level++;
      leveled = true;
    }
    return leveled;
  }
  xpProgress() {
    const need = xpForLevel(this.data.level);
    return { cur: this.data.xp, need, frac: Math.min(this.data.xp / need, 1) };
  }

  // ---- trucks ----
  get selectedTruckDef() { return getTruck(this.data.selectedTruck); }
  get selectedUpgrades() { return this.data.upgrades[this.data.selectedTruck] || { engine: 0, tank: 0, armor: 0, tires: 0 }; }
  get selectedStats() { return effectiveStats(this.selectedTruckDef, this.selectedUpgrades); }
  owns(id) { return this.data.ownedTrucks.includes(id); }
  select(id) { if (this.owns(id)) this.data.selectedTruck = id; }

  buyTruck(id) {
    const t = getTruck(id);
    if (this.owns(id)) return false;
    if (!this.spend(t.price)) return false;
    this.data.ownedTrucks.push(id);
    this.data.upgrades[id] = { engine: 0, tank: 0, armor: 0, tires: 0 };
    this.data.selectedTruck = id;
    return true;
  }

  upgradeLevel(truckId, upId) { return (this.data.upgrades[truckId] || {})[upId] || 0; }
  nextUpgradeCost(truckId, upId) {
    const up = UPGRADES.find((u) => u.id === upId);
    const lvl = this.upgradeLevel(truckId, upId);
    if (lvl >= up.max) return null;
    return upgradeCost(up, lvl);
  }
  buyUpgrade(truckId, upId) {
    const cost = this.nextUpgradeCost(truckId, upId);
    if (cost == null) return false;
    if (!this.spend(cost)) return false;
    this.data.upgrades[truckId][upId]++;
    return true;
  }

  // ---- cosmetics ----
  _cos() { return this.data.cosmetics; }
  ownsCosmetic(kind, id) {
    const c = this._cos();
    const arr = kind === "skin" ? c.ownedSkins : kind === "horn" ? c.ownedHorns : c.ownedLights;
    return arr.includes(id);
  }
  equipCosmetic(kind, id) {
    const c = this._cos();
    if (kind === "skin") c.skin = id; else if (kind === "horn") c.horn = id; else c.light = id;
  }
  buyCosmetic(kind, item) {
    if (this.ownsCosmetic(kind, item.id)) { this.equipCosmetic(kind, item.id); return true; }
    if (!this.spend(item.price)) return false;
    const c = this._cos();
    (kind === "skin" ? c.ownedSkins : kind === "horn" ? c.ownedHorns : c.ownedLights).push(item.id);
    this.equipCosmetic(kind, item.id);
    return true;
  }
  get selectedSkin() { return this._cos().skin; }
  get selectedHorn() { return this._cos().horn; }
  get selectedLight() { return this._cos().light; }

  // ---- daily reward ----
  dailyAvailable() {
    const now = Date.now();
    return now - (this.data.lastDailyClaim || 0) > 20 * 60 * 60 * 1000;
  }
  claimDaily() {
    const reward = 250 + this.data.level * 50;
    this.addMoney(reward);
    this.data.lastDailyClaim = Date.now();
    return reward;
  }
}
