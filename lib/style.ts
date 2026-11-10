import { CUISINES } from "./cuisines";

// Google Places types → short food style + emoji, most specific first.
const STYLES: [string, string, string][] = [
  ["sushi_restaurant", "Sushi", "🍣"],
  ["ramen_restaurant", "Ramen", "🍜"],
  ["pizza_restaurant", "Pizza", "🍕"],
  ["hamburger_restaurant", "Burgers", "🍔"],
  ["steak_house", "Steakhouse", "🥩"],
  ["barbecue_restaurant", "BBQ", "🍖"],
  ["mexican_restaurant", "Mexican", "🌮"],
  ["italian_restaurant", "Italian", "🍝"],
  ["chinese_restaurant", "Chinese", "🥡"],
  ["japanese_restaurant", "Japanese", "🍱"],
  ["korean_restaurant", "Korean", "🥘"],
  ["vietnamese_restaurant", "Vietnamese", "🍜"],
  ["thai_restaurant", "Thai", "🍜"],
  ["indian_restaurant", "Indian", "🍛"],
  ["greek_restaurant", "Greek", "🥙"],
  ["lebanese_restaurant", "Lebanese", "🥙"],
  ["turkish_restaurant", "Turkish", "🥙"],
  ["middle_eastern_restaurant", "Middle Eastern", "🥙"],
  ["mediterranean_restaurant", "Mediterranean", "🥙"],
  ["french_restaurant", "French", "🥐"],
  ["spanish_restaurant", "Spanish", "🥘"],
  ["seafood_restaurant", "Seafood", "🦐"],
  ["vegan_restaurant", "Vegan", "🥗"],
  ["vegetarian_restaurant", "Vegetarian", "🥗"],
  ["brunch_restaurant", "Brunch", "🥞"],
  ["breakfast_restaurant", "Breakfast", "🥞"],
  ["diner", "Diner", "🍳"],
  ["sandwich_shop", "Sandwiches", "🥪"],
  ["chicken_restaurant", "Chicken", "🍗"],
  ["fast_food_restaurant", "Fast food", "🍟"],
  ["american_restaurant", "American", "🍔"],
  ["wine_bar", "Wine bar", "🍷"],
  ["pub", "Pub", "🍺"],
  ["bar", "Bar", "🍸"],
  ["cafe", "Café", "☕"],
  ["coffee_shop", "Coffee", "☕"],
  ["bakery", "Bakery", "🥐"],
  ["dessert_shop", "Dessert", "🍰"],
  ["ice_cream_shop", "Ice cream", "🍦"],
];

/** Best short "style of food" for a place: its Google types first, then the craving it was searched under. */
export function foodStyle(primaryType: string | undefined, types: string[] = [], cuisine?: string, displayName?: string) {
  if (cuisine === "cocktails" && (!primaryType || primaryType === "bar")) return { style: "Cocktails", emoji: "🍸" };
  const all = [primaryType, ...types].filter(Boolean) as string[];
  for (const t of all) {
    const hit = STYLES.find(([type]) => type === t);
    if (hit) return { style: hit[1], emoji: hit[2] };
  }
  const c = CUISINES.find((c) => c.id === cuisine && c.id !== "any");
  if (c) return { style: c.label.replace(" / Sushi", ""), emoji: c.emoji };
  const name = (displayName || "").replace(/ restaurant$/i, "").trim();
  if (name && !/^(restaurant|food|establishment)$/i.test(name)) return { style: name, emoji: "🍽️" };
  return { style: undefined, emoji: "🍽️" };
}
