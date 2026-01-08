// Demo data for Meal Plan Marketplace

export interface MarketplaceMealPlan {
  id: number;
  title: string;
  description: string;
  author: {
    name: string;
    avatar: string;
    verified: boolean;
    level: "bronze" | "silver" | "gold" | "platinum";
    responseTime: string;
  };
  location: {
    city: string;
    country: string;
    countryCode: string;
  };
  cuisine: string;
  coverImage: string;
  gallery: string[];
  rating: number;
  reviewCount: number;
  purchaseCount: number;
  price: number | "free";
  originalPrice?: number;
  tags: string[];
  dietary: string[];
  allergies: string[];
  stats: {
    avgCalories: number;
    avgProtein: number;
    avgCarbs: number;
    avgFat: number;
    mealsPerDay: number;
    duration: number; // days
    prepTime: string;
    difficulty: "Beginner" | "Intermediate" | "Chef";
  };
  highlights: string[];
  sampleDay: {
    breakfast: { name: string; calories: number; image: string };
    lunch: { name: string; calories: number; image: string };
    dinner: { name: string; calories: number; image: string };
    snack?: { name: string; calories: number; image: string };
  };
  featured: boolean;
  trending: boolean;
  createdAt: string;
}

export const demoMealPlans: MarketplaceMealPlan[] = [
  {
    id: 1,
    title: "Authentic Warsaw Winter Warmers",
    description: "Traditional Polish comfort food perfect for cold winter days. Features classic dishes like pierogi, bigos, and żurek made with locally sourced ingredients from Warsaw markets.",
    author: {
      name: "Chef Michał Nowak",
      avatar: "https://randomuser.me/api/portraits/men/32.jpg",
      verified: true,
      level: "gold",
      responseTime: "< 2 hours"
    },
    location: { city: "Warsaw", country: "Poland", countryCode: "PL" },
    cuisine: "Polish",
    coverImage: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800",
    gallery: [
      "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800",
      "https://images.unsplash.com/photo-1547592180-85f173990554?w=800"
    ],
    rating: 4.9,
    reviewCount: 342,
    purchaseCount: 1250,
    price: "free",
    tags: ["Comfort Food", "Local Ingredients", "Budget-Friendly", "Winter"],
    dietary: [],
    allergies: [],
    stats: {
      avgCalories: 2000,
      avgProtein: 75,
      avgCarbs: 220,
      avgFat: 85,
      mealsPerDay: 3,
      duration: 7,
      prepTime: "45 min/day",
      difficulty: "Intermediate"
    },
    highlights: [
      "21 authentic Polish recipes",
      "Shopping list for local markets",
      "Step-by-step video guides",
      "Ingredient substitutions included"
    ],
    sampleDay: {
      breakfast: { name: "Racuchy (Polish Pancakes)", calories: 420, image: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400" },
      lunch: { name: "Żurek (Sour Rye Soup)", calories: 380, image: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400" },
      dinner: { name: "Pierogi Ruskie", calories: 650, image: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400" },
      snack: { name: "Sernik (Cheesecake)", calories: 280, image: "https://images.unsplash.com/photo-1524351199678-941a58a3df50?w=400" }
    },
    featured: true,
    trending: true,
    createdAt: "2025-12-01"
  },
  {
    id: 2,
    title: "Mediterranean Keto - Greek Islands",
    description: "Low-carb, high-fat meals inspired by the beautiful Greek islands. Fresh seafood, olive oil, and local vegetables make this plan both delicious and effective for weight loss.",
    author: {
      name: "Maria Papadopoulos",
      avatar: "https://randomuser.me/api/portraits/women/44.jpg",
      verified: true,
      level: "platinum",
      responseTime: "< 1 hour"
    },
    location: { city: "Athens", country: "Greece", countryCode: "GR" },
    cuisine: "Greek",
    coverImage: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800",
    gallery: [
      "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800",
      "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800"
    ],
    rating: 4.7,
    reviewCount: 189,
    purchaseCount: 856,
    price: 12.99,
    originalPrice: 19.99,
    tags: ["Keto", "Heart-Healthy", "Fresh", "Seafood"],
    dietary: ["Keto", "Low-Carb"],
    allergies: [],
    stats: {
      avgCalories: 1800,
      avgProtein: 90,
      avgCarbs: 30,
      avgFat: 140,
      mealsPerDay: 3,
      duration: 14,
      prepTime: "35 min/day",
      difficulty: "Beginner"
    },
    highlights: [
      "42 keto-friendly Mediterranean recipes",
      "Detailed macro breakdowns",
      "Grocery list with Greek alternatives",
      "Weekly meal prep guide"
    ],
    sampleDay: {
      breakfast: { name: "Greek Yogurt Bowl", calories: 350, image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400" },
      lunch: { name: "Grilled Octopus Salad", calories: 420, image: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400" },
      dinner: { name: "Lamb Souvlaki", calories: 580, image: "https://images.unsplash.com/photo-1529042410759-befb1204b468?w=400" }
    },
    featured: true,
    trending: false,
    createdAt: "2025-11-15"
  },
  {
    id: 3,
    title: "Tokyo Street Food Experience",
    description: "Bring the vibrant flavors of Tokyo's street food scene to your kitchen. From ramen to takoyaki, experience authentic Japanese cuisine with accessible ingredients.",
    author: {
      name: "Yuki Tanaka",
      avatar: "https://randomuser.me/api/portraits/women/68.jpg",
      verified: true,
      level: "gold",
      responseTime: "< 4 hours"
    },
    location: { city: "Tokyo", country: "Japan", countryCode: "JP" },
    cuisine: "Japanese",
    coverImage: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800",
    gallery: [
      "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800",
      "https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?w=800"
    ],
    rating: 4.8,
    reviewCount: 567,
    purchaseCount: 2341,
    price: 14.99,
    tags: ["Street Food", "Umami", "Quick Meals", "Asian"],
    dietary: [],
    allergies: [],
    stats: {
      avgCalories: 1900,
      avgProtein: 65,
      avgCarbs: 250,
      avgFat: 60,
      mealsPerDay: 4,
      duration: 7,
      prepTime: "40 min/day",
      difficulty: "Intermediate"
    },
    highlights: [
      "28 authentic Tokyo recipes",
      "Ingredient sourcing guide",
      "Cooking technique videos",
      "Vegetarian alternatives included"
    ],
    sampleDay: {
      breakfast: { name: "Tamagoyaki & Rice", calories: 380, image: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400" },
      lunch: { name: "Tonkotsu Ramen", calories: 520, image: "https://images.unsplash.com/photo-1557872943-16a5ac26437e?w=400" },
      dinner: { name: "Chicken Katsu Curry", calories: 680, image: "https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?w=400" },
      snack: { name: "Mochi Ice Cream", calories: 180, image: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400" }
    },
    featured: false,
    trending: true,
    createdAt: "2025-10-20"
  },
  {
    id: 4,
    title: "Plant-Based NYC - Vegan Manhattan",
    description: "Experience the diverse vegan scene of New York City. From food truck favorites to upscale plant-based cuisine, this plan brings NYC flavors to your home.",
    author: {
      name: "Brooklyn Green",
      avatar: "https://randomuser.me/api/portraits/women/22.jpg",
      verified: false,
      level: "silver",
      responseTime: "< 6 hours"
    },
    location: { city: "New York", country: "USA", countryCode: "US" },
    cuisine: "American",
    coverImage: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800",
    gallery: [
      "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800",
      "https://images.unsplash.com/photo-1543362906-acfc16c67564?w=800"
    ],
    rating: 4.5,
    reviewCount: 128,
    purchaseCount: 445,
    price: 9.99,
    tags: ["Vegan", "Urban", "Quick", "Trendy"],
    dietary: ["Vegan", "Plant-Based"],
    allergies: ["Dairy-Free"],
    stats: {
      avgCalories: 1700,
      avgProtein: 55,
      avgCarbs: 200,
      avgFat: 70,
      mealsPerDay: 3,
      duration: 7,
      prepTime: "25 min/day",
      difficulty: "Beginner"
    },
    highlights: [
      "21 vibrant vegan recipes",
      "Protein-rich meal options",
      "Budget-friendly ingredients",
      "No special equipment needed"
    ],
    sampleDay: {
      breakfast: { name: "Avocado Toast Deluxe", calories: 420, image: "https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=400" },
      lunch: { name: "Buddha Bowl", calories: 550, image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400" },
      dinner: { name: "Impossible Burger", calories: 580, image: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=400" }
    },
    featured: false,
    trending: false,
    createdAt: "2025-09-10"
  },
  {
    id: 5,
    title: "Moroccan Spice Journey",
    description: "Embark on a culinary adventure through Morocco. Aromatic tagines, couscous, and traditional pastries will transport your taste buds to the streets of Marrakech.",
    author: {
      name: "Fatima El-Amin",
      avatar: "https://randomuser.me/api/portraits/women/56.jpg",
      verified: true,
      level: "gold",
      responseTime: "< 3 hours"
    },
    location: { city: "Marrakech", country: "Morocco", countryCode: "MA" },
    cuisine: "Moroccan",
    coverImage: "https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?w=800",
    gallery: [
      "https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?w=800",
      "https://images.unsplash.com/photo-1541518763669-27fef04b14ea?w=800"
    ],
    rating: 4.9,
    reviewCount: 234,
    purchaseCount: 890,
    price: 11.99,
    tags: ["Aromatic", "Traditional", "Halal", "Exotic"],
    dietary: ["Halal"],
    allergies: [],
    stats: {
      avgCalories: 2100,
      avgProtein: 70,
      avgCarbs: 280,
      avgFat: 75,
      mealsPerDay: 3,
      duration: 7,
      prepTime: "60 min/day",
      difficulty: "Intermediate"
    },
    highlights: [
      "21 authentic Moroccan recipes",
      "Spice blend recipes included",
      "Traditional cooking techniques",
      "Tagine pot alternatives"
    ],
    sampleDay: {
      breakfast: { name: "Msemen with Honey", calories: 380, image: "https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?w=400" },
      lunch: { name: "Chicken Tagine", calories: 620, image: "https://images.unsplash.com/photo-1541518763669-27fef04b14ea?w=400" },
      dinner: { name: "Lamb Couscous", calories: 750, image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400" }
    },
    featured: false,
    trending: true,
    createdAt: "2025-11-25"
  },
  {
    id: 6,
    title: "Italian Nonna's Kitchen - Rome",
    description: "Learn to cook like an Italian grandmother with this collection of time-tested Roman recipes. Pasta made from scratch, traditional sauces, and family-style meals.",
    author: {
      name: "Giuseppe Romano",
      avatar: "https://randomuser.me/api/portraits/men/65.jpg",
      verified: true,
      level: "platinum",
      responseTime: "< 2 hours"
    },
    location: { city: "Rome", country: "Italy", countryCode: "IT" },
    cuisine: "Italian",
    coverImage: "https://images.unsplash.com/photo-1498579150354-977475b7ea0b?w=800",
    gallery: [
      "https://images.unsplash.com/photo-1498579150354-977475b7ea0b?w=800",
      "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800"
    ],
    rating: 4.95,
    reviewCount: 512,
    purchaseCount: 3200,
    price: 16.99,
    tags: ["Traditional", "Pasta", "Family-Style", "Authentic"],
    dietary: [],
    allergies: [],
    stats: {
      avgCalories: 2200,
      avgProtein: 80,
      avgCarbs: 290,
      avgFat: 80,
      mealsPerDay: 3,
      duration: 14,
      prepTime: "75 min/day",
      difficulty: "Chef"
    },
    highlights: [
      "42 traditional Roman recipes",
      "Fresh pasta masterclass",
      "Sauce-making techniques",
      "Wine pairing suggestions"
    ],
    sampleDay: {
      breakfast: { name: "Cornetto e Cappuccino", calories: 320, image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400" },
      lunch: { name: "Cacio e Pepe", calories: 580, image: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=400" },
      dinner: { name: "Saltimbocca alla Romana", calories: 720, image: "https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=400" }
    },
    featured: true,
    trending: true,
    createdAt: "2025-08-15"
  },
  {
    id: 7,
    title: "Thai Fitness Fuel - Bangkok",
    description: "High-protein Thai cuisine perfect for fitness enthusiasts. Spicy, flavorful, and packed with lean proteins and fresh vegetables.",
    author: {
      name: "Somchai Patel",
      avatar: "https://randomuser.me/api/portraits/men/45.jpg",
      verified: true,
      level: "silver",
      responseTime: "< 5 hours"
    },
    location: { city: "Bangkok", country: "Thailand", countryCode: "TH" },
    cuisine: "Thai",
    coverImage: "https://images.unsplash.com/photo-1562565652-a0d8f0c59eb4?w=800",
    gallery: [
      "https://images.unsplash.com/photo-1562565652-a0d8f0c59eb4?w=800",
      "https://images.unsplash.com/photo-1559314809-0d155014e29e?w=800"
    ],
    rating: 4.6,
    reviewCount: 178,
    purchaseCount: 623,
    price: 8.99,
    tags: ["High-Protein", "Spicy", "Fitness", "Low-Fat"],
    dietary: ["High-Protein"],
    allergies: [],
    stats: {
      avgCalories: 2000,
      avgProtein: 120,
      avgCarbs: 180,
      avgFat: 60,
      mealsPerDay: 4,
      duration: 7,
      prepTime: "35 min/day",
      difficulty: "Beginner"
    },
    highlights: [
      "28 high-protein Thai recipes",
      "Post-workout meal options",
      "Macro-friendly portions",
      "Spice level customization"
    ],
    sampleDay: {
      breakfast: { name: "Thai Omelette & Rice", calories: 450, image: "https://images.unsplash.com/photo-1562565652-a0d8f0c59eb4?w=400" },
      lunch: { name: "Larb Gai (Chicken Salad)", calories: 380, image: "https://images.unsplash.com/photo-1559314809-0d155014e29e?w=400" },
      dinner: { name: "Grilled Fish with Herbs", calories: 520, image: "https://images.unsplash.com/photo-1559847844-5315695dadae?w=400" },
      snack: { name: "Protein Mango Sticky Rice", calories: 280, image: "https://images.unsplash.com/photo-1536510233921-8e5043fce771?w=400" }
    },
    featured: false,
    trending: false,
    createdAt: "2025-12-05"
  },
  {
    id: 8,
    title: "Mexican Abuela's Recipes - Oaxaca",
    description: "Authentic Oaxacan cuisine passed down through generations. Rich moles, handmade tortillas, and traditional Mexican comfort food.",
    author: {
      name: "Rosa Martinez",
      avatar: "https://randomuser.me/api/portraits/women/62.jpg",
      verified: true,
      level: "gold",
      responseTime: "< 4 hours"
    },
    location: { city: "Oaxaca", country: "Mexico", countryCode: "MX" },
    cuisine: "Mexican",
    coverImage: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800",
    gallery: [
      "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800",
      "https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=800"
    ],
    rating: 4.8,
    reviewCount: 289,
    purchaseCount: 1100,
    price: 10.99,
    tags: ["Traditional", "Authentic", "Family Recipes", "Spicy"],
    dietary: [],
    allergies: [],
    stats: {
      avgCalories: 2100,
      avgProtein: 75,
      avgCarbs: 260,
      avgFat: 85,
      mealsPerDay: 3,
      duration: 7,
      prepTime: "55 min/day",
      difficulty: "Intermediate"
    },
    highlights: [
      "21 authentic Oaxacan recipes",
      "Mole preparation guide",
      "Homemade tortilla tutorial",
      "Regional ingredient alternatives"
    ],
    sampleDay: {
      breakfast: { name: "Chilaquiles Verdes", calories: 480, image: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400" },
      lunch: { name: "Tlayuda", calories: 650, image: "https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=400" },
      dinner: { name: "Mole Negro con Pollo", calories: 720, image: "https://images.unsplash.com/photo-1534352956036-cd81e27dd615?w=400" }
    },
    featured: false,
    trending: true,
    createdAt: "2025-11-01"
  },
  {
    id: 9,
    title: "Indian Ayurvedic Healing - Kerala",
    description: "Balance your doshas with traditional Ayurvedic cuisine from Kerala. Healing spices, fresh coconut, and time-tested recipes for optimal wellness.",
    author: {
      name: "Dr. Priya Sharma",
      avatar: "https://randomuser.me/api/portraits/women/33.jpg",
      verified: true,
      level: "platinum",
      responseTime: "< 2 hours"
    },
    location: { city: "Kerala", country: "India", countryCode: "IN" },
    cuisine: "Indian",
    coverImage: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800",
    gallery: [
      "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800",
      "https://images.unsplash.com/photo-1567337710282-00832b415979?w=800"
    ],
    rating: 4.85,
    reviewCount: 421,
    purchaseCount: 1580,
    price: 15.99,
    tags: ["Ayurvedic", "Vegetarian", "Healing", "Wellness"],
    dietary: ["Vegetarian"],
    allergies: [],
    stats: {
      avgCalories: 1600,
      avgProtein: 45,
      avgCarbs: 220,
      avgFat: 55,
      mealsPerDay: 3,
      duration: 14,
      prepTime: "50 min/day",
      difficulty: "Intermediate"
    },
    highlights: [
      "42 Ayurvedic recipes",
      "Dosha balancing guide",
      "Healing spice blends",
      "Seasonal eating calendar"
    ],
    sampleDay: {
      breakfast: { name: "Idli with Sambar", calories: 320, image: "https://images.unsplash.com/photo-1567337710282-00832b415979?w=400" },
      lunch: { name: "Kerala Fish Curry", calories: 480, image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400" },
      dinner: { name: "Avial & Rice", calories: 520, image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400" }
    },
    featured: true,
    trending: false,
    createdAt: "2025-10-10"
  },
  {
    id: 10,
    title: "French Bistro Classics - Paris",
    description: "Master the art of French bistro cooking. Classic techniques, elegant presentations, and the timeless flavors of Parisian cuisine.",
    author: {
      name: "Pierre Dubois",
      avatar: "https://randomuser.me/api/portraits/men/52.jpg",
      verified: true,
      level: "platinum",
      responseTime: "< 3 hours"
    },
    location: { city: "Paris", country: "France", countryCode: "FR" },
    cuisine: "French",
    coverImage: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800",
    gallery: [
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800",
      "https://images.unsplash.com/photo-1470324161839-ce2bb6fa6bc3?w=800"
    ],
    rating: 4.75,
    reviewCount: 356,
    purchaseCount: 920,
    price: 18.99,
    originalPrice: 24.99,
    tags: ["Classic", "Elegant", "Date Night", "Gourmet"],
    dietary: [],
    allergies: [],
    stats: {
      avgCalories: 2000,
      avgProtein: 70,
      avgCarbs: 180,
      avgFat: 110,
      mealsPerDay: 3,
      duration: 7,
      prepTime: "90 min/day",
      difficulty: "Chef"
    },
    highlights: [
      "21 bistro classics",
      "French technique tutorials",
      "Wine pairing guide",
      "Presentation tips"
    ],
    sampleDay: {
      breakfast: { name: "Croissant & Café au Lait", calories: 380, image: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400" },
      lunch: { name: "Salade Niçoise", calories: 520, image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400" },
      dinner: { name: "Coq au Vin", calories: 780, image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400" }
    },
    featured: false,
    trending: false,
    createdAt: "2025-09-20"
  },
  {
    id: 11,
    title: "Korean K-Beauty Diet - Seoul",
    description: "Eat for glowing skin and energy with this Korean beauty-focused meal plan. Fermented foods, colorful banchan, and nutrient-dense meals.",
    author: {
      name: "Ji-Yeon Kim",
      avatar: "https://randomuser.me/api/portraits/women/79.jpg",
      verified: true,
      level: "gold",
      responseTime: "< 4 hours"
    },
    location: { city: "Seoul", country: "South Korea", countryCode: "KR" },
    cuisine: "Korean",
    coverImage: "https://images.unsplash.com/photo-1498654896293-37aacf113fd9?w=800",
    gallery: [
      "https://images.unsplash.com/photo-1498654896293-37aacf113fd9?w=800",
      "https://images.unsplash.com/photo-1553163147-622ab57be1c7?w=800"
    ],
    rating: 4.7,
    reviewCount: 267,
    purchaseCount: 780,
    price: 13.99,
    tags: ["Beauty", "Fermented", "Gut Health", "Glowing Skin"],
    dietary: [],
    allergies: [],
    stats: {
      avgCalories: 1700,
      avgProtein: 60,
      avgCarbs: 200,
      avgFat: 65,
      mealsPerDay: 3,
      duration: 14,
      prepTime: "40 min/day",
      difficulty: "Intermediate"
    },
    highlights: [
      "42 beauty-boosting recipes",
      "Kimchi making tutorial",
      "Skin food ingredients guide",
      "K-beauty eating habits"
    ],
    sampleDay: {
      breakfast: { name: "Kimchi Fried Rice", calories: 420, image: "https://images.unsplash.com/photo-1498654896293-37aacf113fd9?w=400" },
      lunch: { name: "Bibimbap", calories: 550, image: "https://images.unsplash.com/photo-1553163147-622ab57be1c7?w=400" },
      dinner: { name: "Korean BBQ Lettuce Wraps", calories: 480, image: "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=400" }
    },
    featured: false,
    trending: true,
    createdAt: "2025-12-10"
  },
  {
    id: 12,
    title: "Brazilian Beach Body - Rio",
    description: "Get summer-ready with this Brazilian fitness meal plan. Fresh tropical fruits, grilled proteins, and the vibrant flavors of Rio de Janeiro.",
    author: {
      name: "Carlos Silva",
      avatar: "https://randomuser.me/api/portraits/men/28.jpg",
      verified: false,
      level: "bronze",
      responseTime: "< 8 hours"
    },
    location: { city: "Rio de Janeiro", country: "Brazil", countryCode: "BR" },
    cuisine: "Brazilian",
    coverImage: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800",
    gallery: [
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800",
      "https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=800"
    ],
    rating: 4.4,
    reviewCount: 89,
    purchaseCount: 234,
    price: "free",
    tags: ["Beach Body", "Tropical", "High-Protein", "Summer"],
    dietary: ["High-Protein"],
    allergies: [],
    stats: {
      avgCalories: 1900,
      avgProtein: 100,
      avgCarbs: 180,
      avgFat: 70,
      mealsPerDay: 4,
      duration: 7,
      prepTime: "30 min/day",
      difficulty: "Beginner"
    },
    highlights: [
      "28 Brazilian fitness recipes",
      "Açaí bowl variations",
      "Grilling techniques",
      "Tropical smoothie recipes"
    ],
    sampleDay: {
      breakfast: { name: "Açaí Bowl", calories: 380, image: "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=400" },
      lunch: { name: "Grilled Picanha Salad", calories: 520, image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400" },
      dinner: { name: "Moqueca (Fish Stew)", calories: 580, image: "https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=400" },
      snack: { name: "Tropical Fruit Plate", calories: 180, image: "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=400" }
    },
    featured: false,
    trending: false,
    createdAt: "2025-11-30"
  }
];

export const cuisineOptions = [
  "All Cuisines", "Polish", "Greek", "Japanese", "American", "Moroccan", 
  "Italian", "Thai", "Mexican", "Indian", "French", "Korean", "Brazilian",
  "Chinese", "Vietnamese", "Spanish", "Turkish", "Lebanese"
];

export const dietaryOptions = [
  "Vegetarian", "Vegan", "Keto", "Paleo", "Low-Carb", "High-Protein",
  "Mediterranean", "Halal", "Kosher", "Gluten-Free", "Dairy-Free", "Plant-Based"
];

export const priceRanges = [
  { label: "All Prices", min: 0, max: Infinity },
  { label: "Free", min: 0, max: 0 },
  { label: "Under $10", min: 0.01, max: 9.99 },
  { label: "$10 - $15", min: 10, max: 15 },
  { label: "$15+", min: 15.01, max: Infinity }
];

export const sortOptions = [
  { label: "Most Popular", value: "popular" },
  { label: "Highest Rated", value: "rating" },
  { label: "Newest", value: "newest" },
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" }
];
