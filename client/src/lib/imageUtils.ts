// Define a basic Recipe interface locally to avoid dependency
interface Recipe {
  id?: number;
  name: string;
  imageUrl?: string;
  ingredients?: string[];
}

export const DEFAULT_RECIPE_IMAGES = {
  // Breakfast & Brunch
  "breakfast": "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=800&auto=format&fit=crop",
  "pancake": "https://images.unsplash.com/photo-1554520735-0a6b8b6ce8b7?w=800&auto=format&fit=crop",
  "eggs": "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&auto=format&fit=crop",
  "oatmeal": "https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?w=800&auto=format&fit=crop",
  "toast": "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&auto=format&fit=crop",

  // Sandwiches & Wraps
  "sandwich": "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&auto=format&fit=crop",
  "wrap": "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=800&auto=format&fit=crop",
  "burger": "https://images.unsplash.com/photo-1586816001966-79b736744398?w=800&auto=format&fit=crop",
  "ham": "https://images.unsplash.com/photo-1485451456034-3f9391c6f769?w=800&auto=format&fit=crop",
  "cheese": "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=800&auto=format&fit=crop",
  "kaiser": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop",

  // Lunch/Dinner Mains
  "salad": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&auto=format&fit=crop",
  "chicken": "https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=800&auto=format&fit=crop",
  "fish": "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800&auto=format&fit=crop",
  "pasta": "https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=800&auto=format&fit=crop",
  "rice": "https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?w=800&auto=format&fit=crop",
  "soup": "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&auto=format&fit=crop",
  "steak": "https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop",
  "sushi": "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&auto=format&fit=crop",

  // Healthy Options
  "bowl": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop",
  "smoothie": "https://images.unsplash.com/photo-1557752323-2f99393a81fc?w=800&auto=format&fit=crop",
  "vegetables": "https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?w=800&auto=format&fit=crop",
  "healthy": "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&auto=format&fit=crop",

  // Default fallback
  "default": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop"
} as const;

export const getRecipeImage = (recipe: Recipe): string => {
  // Return empty string to avoid showing images
  return "";
};
