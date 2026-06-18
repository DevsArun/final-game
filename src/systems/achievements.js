// Achievement definitions + checker. Unlocks are stored on the profile and
// grant a cash reward. Leaderboard "records" are tracked here too and routed
// through the platform adapter's submitScore (real boards come with the SDKs).
import { TRUCKS } from "../config/trucks.js";

export const ACHIEVEMENTS = [
  { id: "first_job", name: "First Haul", desc: "Complete your first delivery", reward: 100, check: (p) => p.data.stats.jobsDone >= 1 },
  { id: "deliver10", name: "Road Regular", desc: "Complete 10 deliveries", reward: 500, check: (p) => p.data.stats.jobsDone >= 10 },
  { id: "deliver50", name: "Veteran Trucker", desc: "Complete 50 deliveries", reward: 2500, check: (p) => p.data.stats.jobsDone >= 50 },
  { id: "drive50", name: "Long Hauler", desc: "Drive 50 km total", reward: 1500, check: (p) => p.data.stats.distanceKm >= 50 },
  { id: "perfect5", name: "Careful Driver", desc: "5 perfect (no-damage) jobs", reward: 1200, check: (p) => p.data.stats.perfectJobs >= 5 },
  { id: "earn10k", name: "Cash Flow", desc: "Earn $10,000 lifetime", reward: 1000, check: (p) => p.data.stats.totalEarned >= 10000 },
  { id: "level5", name: "Rising Star", desc: "Reach Driver Level 5", reward: 800, check: (p) => p.level >= 5 },
  { id: "level10", name: "Pro License", desc: "Reach Driver Level 10", reward: 2000, check: (p) => p.level >= 10 },
  { id: "ownall", name: "Full Garage", desc: "Own every truck", reward: 3000, check: (p) => TRUCKS.every((t) => p.owns(t.id)) },
  { id: "night", name: "Night Owl", desc: "Deliver a job at night", reward: 600, check: (p) => (p.data.stats.nightJobs || 0) >= 1 },
  { id: "storm", name: "Storm Chaser", desc: "Deliver a job in the rain", reward: 700, check: (p) => (p.data.stats.rainJobs || 0) >= 1 },
];

// Returns array of newly-unlocked achievement objects (and marks them unlocked).
export function checkAchievements(profile) {
  const unlocked = profile.data.achievements || (profile.data.achievements = []);
  const fresh = [];
  for (const a of ACHIEVEMENTS) {
    if (!unlocked.includes(a.id) && a.check(profile)) {
      unlocked.push(a.id);
      profile.addMoney(a.reward);
      fresh.push(a);
    }
  }
  return fresh;
}

export function achievementProgress(profile) {
  const unlocked = profile.data.achievements || [];
  return { done: unlocked.length, total: ACHIEVEMENTS.length };
}

// Update local best records and push to platform leaderboard.
export function updateRecords(profile, platform) {
  const best = profile.data.best || (profile.data.best = { level: 0, totalEarned: 0, jobsDone: 0 });
  best.level = Math.max(best.level, profile.level);
  best.totalEarned = Math.max(best.totalEarned, profile.data.stats.totalEarned);
  best.jobsDone = Math.max(best.jobsDone, profile.data.stats.jobsDone);
  try { platform.submitScore(best.totalEarned); } catch (e) {}
  return best;
}
