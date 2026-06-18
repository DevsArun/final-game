// Cosmetic catalogue: paint skins, horns, light kits.
export const SKINS = [
  { id: "default", name: "Factory Paint", price: 0, cab: null },
  { id: "midnight", name: "Midnight Black", price: 800, cab: [0.08, 0.08, 0.1] },
  { id: "flame", name: "Flame Orange", price: 1000, cab: [0.95, 0.4, 0.05] },
  { id: "ocean", name: "Ocean Blue", price: 1000, cab: [0.1, 0.45, 0.85] },
  { id: "forest", name: "Forest Green", price: 1000, cab: [0.1, 0.5, 0.25] },
  { id: "royal", name: "Royal Purple", price: 1500, cab: [0.45, 0.2, 0.7] },
  { id: "gold", name: "24K Gold", price: 2800, cab: [0.85, 0.7, 0.15] },
];

export const HORNS = [
  { id: "stock", name: "Stock Horn", price: 0, freq: [330, 392], dur: 0.4 },
  { id: "air", name: "Air Horn", price: 500, freq: [185, 233], dur: 0.7 },
  { id: "musical", name: "Musical Horn", price: 900, freq: [392, 494, 587], dur: 0.6 },
  { id: "train", name: "Train Horn", price: 1300, freq: [146, 174], dur: 1.0 },
];

export const LIGHTS = [
  { id: "none", name: "No Kit", price: 0 },
  { id: "ug_blue", name: "Blue Underglow", price: 700, under: [0.2, 0.45, 1.0] },
  { id: "ug_pink", name: "Pink Underglow", price: 700, under: [1.0, 0.3, 0.7] },
  { id: "ug_green", name: "Green Underglow", price: 700, under: [0.2, 1.0, 0.45] },
  { id: "roofbar", name: "Roof Light Bar", price: 1000, roof: [1.0, 0.85, 0.3] },
];

export const getSkin = (id) => SKINS.find((s) => s.id === id) || SKINS[0];
export const getHorn = (id) => HORNS.find((h) => h.id === id) || HORNS[0];
export const getLight = (id) => LIGHTS.find((l) => l.id === id) || LIGHTS[0];
