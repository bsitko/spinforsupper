export type Restaurant = {
  id: string;
  name: string;
  address: string;
  rating?: number;
  ratingCount?: number;
  price?: number; // 1-4
  kidFriendly?: boolean;
  openNow?: boolean;
  mapsUrl: string;
  cuisine?: string;
  phone?: string;
  website?: string;
  category?: string;
  style?: string; // short style of food, e.g. "Mexican"
  styleEmoji?: string;
  photo?: string; // Google photo reference; the image itself loads only when the popup opens
  photoBy?: { name: string; url?: string }; // Google requires crediting the photographer
  bookUrl?: string; // "Book a table" link (affiliate template from the admin panel)
  orderUrl?: string; // "Order delivery" link
};

export type SearchResponse = {
  source: "google" | "demo";
  restaurants: Restaurant[]; // the wheel
  pool: Restaurant[]; // everything that matched (up to 20), for the list view
  message?: string;
};
