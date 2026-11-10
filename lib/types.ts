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
};

export type SearchResponse = {
  source: "google" | "demo";
  restaurants: Restaurant[];
  message?: string;
};
