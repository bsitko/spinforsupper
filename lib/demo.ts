import type { Restaurant } from "./types";

// Fake restaurants used when no Google API key is configured.
const raw: [string, string, number, boolean, number][] = [
  // name, cuisine, price, kidFriendly, rating
  ["Burger Barn", "american", 1, true, 4.3],
  ["The Corner Diner", "american", 2, true, 4.1],
  ["Stack House Grill", "american", 3, false, 4.5],
  ["Slice Society", "pizza", 1, true, 4.4],
  ["Brick Oven Bros", "pizza", 2, true, 4.6],
  ["Neapolitan Nights", "pizza", 3, false, 4.7],
  ["Taco Tornado", "mexican", 1, true, 4.5],
  ["Casa Verde", "mexican", 2, true, 4.2],
  ["Mezcal Moon", "mexican", 3, false, 4.6],
  ["Nonna's Table", "italian", 2, true, 4.5],
  ["Trattoria Lume", "italian", 3, false, 4.7],
  ["Golden Dragon", "chinese", 1, true, 4.0],
  ["Dumpling Den", "chinese", 2, true, 4.6],
  ["Sakura Sushi", "japanese", 3, false, 4.6],
  ["Ramen Rocket", "japanese", 2, true, 4.4],
  ["Bangkok Basil", "thai", 2, true, 4.3],
  ["Spice Route", "indian", 2, true, 4.5],
  ["Tandoori Flame", "indian", 3, false, 4.4],
  ["Olive & Pita", "mediterranean", 1, true, 4.4],
  ["Aegean Blue", "mediterranean", 3, false, 4.6],
  ["Smoke Signal BBQ", "bbq", 2, true, 4.7],
  ["Pit Boss Brisket", "bbq", 2, true, 4.5],
  ["Sunny Side Up", "breakfast", 1, true, 4.4],
  ["The Pancake Parlor", "breakfast", 1, true, 4.2],
  ["Dockside Shack", "seafood", 2, true, 4.3],
  ["Oyster & Ember", "seafood", 4, false, 4.8],
  ["Green Fork", "vegetarian", 2, true, 4.5],
  ["Root & Leaf", "vegetarian", 3, false, 4.6],
  ["Steak & Stone", "american", 4, false, 4.8],
  ["Little Lisbon", "seafood", 3, false, 4.5],
];

export function demoRestaurants(): Restaurant[] {
  return raw.map(([name, cuisine, price, kidFriendly, rating], i) => ({
    id: `demo-${i}`,
    name,
    cuisine,
    price,
    kidFriendly,
    rating,
    ratingCount: 50 + ((i * 37) % 400),
    openNow: i % 5 !== 0,
    address: `${100 + i * 7} Main St (demo)`,
    phone: `(555) 01${String(i).padStart(2, "0")}-0000`,
    category: cuisine[0].toUpperCase() + cuisine.slice(1) + " restaurant",
    mapsUrl: `https://www.google.com/maps/search/${encodeURIComponent(name)}`,
  }));
}
