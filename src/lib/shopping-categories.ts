export interface ShoppingCategory {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
}

export const SHOPPING_CATEGORIES: ShoppingCategory[] = [
  { id: "produce", name: "Produce", color: "#22c55e", sortOrder: 0 },
  { id: "dairy", name: "Dairy", color: "#3b82f6", sortOrder: 1 },
  { id: "meat-seafood", name: "Meat & Seafood", color: "#ef4444", sortOrder: 2 },
  { id: "bakery", name: "Bakery", color: "#f59e0b", sortOrder: 3 },
  { id: "frozen", name: "Frozen", color: "#06b6d4", sortOrder: 4 },
  { id: "pantry", name: "Pantry", color: "#8b5cf6", sortOrder: 5 },
  { id: "drinks", name: "Drinks", color: "#f97316", sortOrder: 6 },
  { id: "household", name: "Household", color: "#ec4899", sortOrder: 7 },
  { id: "other", name: "Other", color: "#6b7280", sortOrder: 8 },
];

/**
 * Map of keywords to category names.
 * Keys are lowercase substrings that will be matched against item names.
 */
const CATEGORY_ITEM_MAP: Record<string, string> = {
  // Produce
  apple: "Produce",
  banana: "Produce",
  lettuce: "Produce",
  tomato: "Produce",
  onion: "Produce",
  carrot: "Produce",
  potato: "Produce",
  garlic: "Produce",
  lemon: "Produce",
  lime: "Produce",
  avocado: "Produce",
  cucumber: "Produce",
  spinach: "Produce",
  broccoli: "Produce",
  capsicum: "Produce",
  pepper: "Produce",
  celery: "Produce",
  mushroom: "Produce",
  zucchini: "Produce",
  corn: "Produce",
  pumpkin: "Produce",
  "sweet potato": "Produce",
  ginger: "Produce",
  herbs: "Produce",
  basil: "Produce",
  coriander: "Produce",
  parsley: "Produce",
  mint: "Produce",
  strawberr: "Produce",
  blueberr: "Produce",
  raspberr: "Produce",
  grape: "Produce",
  pear: "Produce",
  watermelon: "Produce",
  mango: "Produce",
  pineapple: "Produce",
  kiwi: "Produce",
  peach: "Produce",
  plum: "Produce",
  cherry: "Produce",
  beetroot: "Produce",
  cabbage: "Produce",
  cauliflower: "Produce",
  eggplant: "Produce",
  asparagus: "Produce",
  "bean sprout": "Produce",
  "spring onion": "Produce",
  shallot: "Produce",
  radish: "Produce",
  kale: "Produce",
  rocket: "Produce",

  // Dairy
  milk: "Dairy",
  cheese: "Dairy",
  butter: "Dairy",
  yogurt: "Dairy",
  yoghurt: "Dairy",
  cream: "Dairy",
  egg: "Dairy",
  "sour cream": "Dairy",
  "cottage cheese": "Dairy",
  feta: "Dairy",
  mozzarella: "Dairy",
  parmesan: "Dairy",
  cheddar: "Dairy",
  brie: "Dairy",
  camembert: "Dairy",

  // Meat & Seafood
  chicken: "Meat & Seafood",
  beef: "Meat & Seafood",
  pork: "Meat & Seafood",
  fish: "Meat & Seafood",
  salmon: "Meat & Seafood",
  shrimp: "Meat & Seafood",
  prawn: "Meat & Seafood",
  mince: "Meat & Seafood",
  lamb: "Meat & Seafood",
  steak: "Meat & Seafood",
  sausage: "Meat & Seafood",
  bacon: "Meat & Seafood",
  ham: "Meat & Seafood",
  turkey: "Meat & Seafood",
  tuna: "Meat & Seafood",
  crab: "Meat & Seafood",
  mussel: "Meat & Seafood",
  oyster: "Meat & Seafood",
  calamari: "Meat & Seafood",
  squid: "Meat & Seafood",

  // Bakery
  bread: "Bakery",
  roll: "Bakery",
  bagel: "Bakery",
  muffin: "Bakery",
  croissant: "Bakery",
  wrap: "Bakery",
  pita: "Bakery",
  bun: "Bakery",
  sourdough: "Bakery",
  "rye bread": "Bakery",
  brioche: "Bakery",
  crumpet: "Bakery",
  scone: "Bakery",

  // Frozen
  "ice cream": "Frozen",
  "frozen pea": "Frozen",
  "frozen pizza": "Frozen",
  "fish finger": "Frozen",
  "frozen chip": "Frozen",
  "frozen berr": "Frozen",
  "frozen veg": "Frozen",
  "frozen meal": "Frozen",
  gelato: "Frozen",
  sorbet: "Frozen",

  // Pantry
  rice: "Pantry",
  pasta: "Pantry",
  flour: "Pantry",
  sugar: "Pantry",
  salt: "Pantry",
  oil: "Pantry",
  vinegar: "Pantry",
  sauce: "Pantry",
  canned: "Pantry",
  cereal: "Pantry",
  oat: "Pantry",
  noodle: "Pantry",
  spice: "Pantry",
  "black pepper": "Pantry",
  cumin: "Pantry",
  paprika: "Pantry",
  cinnamon: "Pantry",
  honey: "Pantry",
  jam: "Pantry",
  "peanut butter": "Pantry",
  nutella: "Pantry",
  vegemite: "Pantry",
  "soy sauce": "Pantry",
  "tomato paste": "Pantry",
  stock: "Pantry",
  broth: "Pantry",
  "baking powder": "Pantry",
  "baking soda": "Pantry",
  yeast: "Pantry",
  "coconut milk": "Pantry",
  chickpea: "Pantry",
  lentil: "Pantry",
  bean: "Pantry",
  tin: "Pantry",
  cracker: "Pantry",
  chip: "Pantry",
  crisp: "Pantry",
  nut: "Pantry",
  almond: "Pantry",
  walnut: "Pantry",
  cashew: "Pantry",
  chocolate: "Pantry",
  biscuit: "Pantry",
  cookie: "Pantry",
  snack: "Pantry",

  // Drinks
  water: "Drinks",
  juice: "Drinks",
  soda: "Drinks",
  coffee: "Drinks",
  tea: "Drinks",
  wine: "Drinks",
  beer: "Drinks",
  kombucha: "Drinks",
  cordial: "Drinks",
  "soft drink": "Drinks",
  "sparkling water": "Drinks",
  "energy drink": "Drinks",
  "coconut water": "Drinks",

  // Household
  soap: "Household",
  detergent: "Household",
  "toilet paper": "Household",
  "paper towel": "Household",
  "trash bag": "Household",
  "bin liner": "Household",
  sponge: "Household",
  dishwash: "Household",
  laundry: "Household",
  bleach: "Household",
  disinfectant: "Household",
  cleaner: "Household",
  shampoo: "Household",
  conditioner: "Household",
  toothpaste: "Household",
  toothbrush: "Household",
  deodorant: "Household",
  tissue: "Household",
  "glad wrap": "Household",
  "cling wrap": "Household",
  "aluminium foil": "Household",
  "aluminum foil": "Household",
  foil: "Household",
  ziplock: "Household",
  candle: "Household",
  battery: "Household",
  "light bulb": "Household",
};

// Sort keywords longest-first so multi-word phrases match before single words
// (e.g. "sweet potato" before "potato", "soy sauce" before "sauce")
const SORTED_KEYWORDS = Object.keys(CATEGORY_ITEM_MAP).sort(
  (a, b) => b.length - a.length
);

// Build regex patterns for each keyword: use word boundaries to prevent
// partial matches (e.g. "corn" should not match "unicorn").
const KEYWORD_PATTERNS = SORTED_KEYWORDS.map((keyword) => ({
  keyword,
  pattern: new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i"),
}));

/**
 * Auto-categorize a shopping item by name.
 * Returns the category name if a match is found, or null.
 */
export function categorizeItem(name: string): string | null {
  const lower = name.toLowerCase().trim();
  for (const { keyword, pattern } of KEYWORD_PATTERNS) {
    if (pattern.test(lower)) {
      return CATEGORY_ITEM_MAP[keyword];
    }
  }
  return null;
}

/**
 * Get a category object by name.
 */
export function getCategoryByName(name: string): ShoppingCategory | undefined {
  return SHOPPING_CATEGORIES.find(
    (c) => c.name.toLowerCase() === name.toLowerCase()
  );
}

/**
 * Get the sort order for a category name.
 * Returns a high number for unknown categories so they sort last.
 */
export function getCategorySortOrder(categoryName: string | null): number {
  if (!categoryName) return 999;
  const cat = getCategoryByName(categoryName);
  return cat ? cat.sortOrder : 999;
}
