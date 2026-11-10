export const CUISINES = [
  { id: "any", label: "Surprise me", emoji: "🎲" },
  { id: "american", label: "American", emoji: "🍔" },
  { id: "pizza", label: "Pizza", emoji: "🍕" },
  { id: "mexican", label: "Mexican", emoji: "🌮" },
  { id: "italian", label: "Italian", emoji: "🍝" },
  { id: "chinese", label: "Chinese", emoji: "🥡" },
  { id: "japanese", label: "Japanese / Sushi", emoji: "🍣" },
  { id: "thai", label: "Thai", emoji: "🍜" },
  { id: "indian", label: "Indian", emoji: "🍛" },
  { id: "mediterranean", label: "Mediterranean", emoji: "🥙" },
  { id: "bbq", label: "BBQ", emoji: "🍖" },
  { id: "breakfast", label: "Breakfast / Brunch", emoji: "🥞" },
  { id: "seafood", label: "Seafood", emoji: "🦐" },
  { id: "vegetarian", label: "Vegetarian", emoji: "🥗" },
] as const;

export type CuisineId = (typeof CUISINES)[number]["id"];
