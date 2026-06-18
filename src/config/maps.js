// Map descriptors. World generator (world.js) turns these into geometry +
// collision data. v1 ships one big open city; structure supports more.
export const MAPS = [
  {
    id: "indus_city",
    name: "Indus City (India)",
    desc: "Busy Indian city — bazaars, highways, dhabas and a tight grid of streets.",
    env: {
      sky: [0.66, 0.74, 0.86],
      fogNear: 90,
      fogFar: 420,
      lightDir: [0.5, 0.9, 0.35],
      lightColor: [1.0, 0.95, 0.82],
      ambient: [0.48, 0.47, 0.5],
      ground: [0.46, 0.4, 0.28],
    },
    half: 240,
    blockSize: 60,
    roadWidth: 12,
    spawn: [6, 0],
    hubs: [
      { name: "Sabzi Mandi", pos: [-180, -180] },
      { name: "Old Bazaar", pos: [120, -150] },
      { name: "Station Road", pos: [-120, 120] },
      { name: "Hill Colony", pos: [170, 160] },
      { name: "Industrial Area", pos: [0, 200] },
      { name: "Riverfront", pos: [-200, 40] },
      { name: "Central Depot", pos: [40, 0] },
    ],
    fuelStations: [[60, 18], [-120, -60], [150, -120], [-60, 160]],
    seed: 1337,
  },
];

export function getMap(id) {
  return MAPS.find((m) => m.id === id) || MAPS[0];
}
