/**
 * Utility functions for parsing and processing recipe ingredients
 */

/**
 * Categorize an ingredient based on its name
 */
export function categorizeIngredient(name: string): string {
  const lowerName = name.toLowerCase();
  
  // Common ingredient categories
  const categories: Record<string, string[]> = {
    'produce': ['apple', 'banana', 'orange', 'lettuce', 'spinach', 'kale', 'tomato', 'tomatoes', 'carrot', 'carrots', 'potato', 'potatoes', 
                'onion', 'onions', 'garlic', 'pepper', 'peppers', 'cucumber', 'avocado', 'broccoli', 'cauliflower', 'lemon', 'lime', 
                'berry', 'berries', 'strawberr', 'blueberr', 'raspberr', 'blackberr', 'celery', 'mushroom', 'mushrooms',
                'zucchini', 'squash', 'pumpkin', 'eggplant', 'herbs', 'cilantro', 'parsley', 'mint', 'basil', 'thyme', 'rosemary',
                'sage', 'veggie', 'vegetable', 'fruit', 'bell pepper', 'ginger', 'cabbage', 'asparagus', 'pea', 'peas', 'bean', 'beans',
                'sprout', 'sprouts', 'corn', 'kiwi', 'mango', 'pineapple', 'melon', 'cantaloupe', 'honeydew', 'watermelon', 'grape', 'grapes',
                'plum', 'peach', 'nectarine', 'pear', 'cherry', 'cherries', 'papryką', 'paprika', 'papryka'],
    
    'meat': ['chicken', 'beef', 'pork', 'turkey', 'lamb', 'steak', 'roast', 'ground', 'fillet', 'bacon', 'sausage', 'ham', 'prosciutto',
             'chorizo', 'salami', 'pepperoni', 'hot dog', 'burger', 'meatball', 'meat', 'kurczak', 'indyk', 'wołowina', 'wieprzowina'],
    
    'seafood': ['fish', 'salmon', 'tuna', 'tilapia', 'cod', 'shrimp', 'crab', 'lobster', 'clam', 'mussel', 'oyster', 'scallop', 'squid',
                'octopus', 'sardine', 'anchovy', 'halibut', 'trout', 'ryba', 'łosoś', 'tuńczyk', 'krewetki'],
    
    'dairy': ['milk', 'cheese', 'yogurt', 'cream', 'butter', 'egg', 'eggs', 'sour cream', 'crème fraîche', 'ice cream', 'custard',
              'buttermilk', 'cottage cheese', 'ricotta', 'mozzarella', 'cheddar', 'parmesan', 'feta', 'gouda', 'brie', 'jajko', 'jajka', 
              'masło', 'nabiał', 'mleko', 'ser', 'jogurt', 'śmietana', 'parmezan', 'twaróg'],
    
    'bakery': ['bread', 'roll', 'bun', 'bagel', 'croissant', 'muffin', 'cake', 'cookie', 'pie', 'pastry', 'dough', 'flour', 'tortilla',
               'pita', 'naan', 'flatbread', 'cracker', 'waffle', 'pancake', 'biscuit', 'toast', 'chleb', 'bułka', 'ciasto', 'tost',
               'mąka', 'bułki', 'bagietka', 'panierka', 'ciastko', 'pieczywo', 'żytni'],
    
    'frozen': ['frozen', 'ice cream', 'popsicle', 'freezer', 'mrożon'],
    
    'pantry': ['rice', 'pasta', 'noodle', 'cereal', 'oat', 'oatmeal', 'grain', 'quinoa', 'couscous', 'flour', 'sugar', 'oil', 'vinegar',
               'sauce', 'condiment', 'spice', 'herb', 'salt', 'pepper', 'soy sauce', 'ketchup', 'mustard', 'mayonnaise', 'honey', 'syrup',
               'jam', 'jelly', 'peanut butter', 'almond butter', 'nutella', 'chocolate', 'vanilla', 'baking powder', 'baking soda',
               'yeast', 'vanilla extract', 'ryż', 'makaron', 'płatki', 'kasza', 'mąka', 'cukier', 'olej', 'ocet', 'sól', 'pieprz', 'miód',
               'dżem', 'czekolada', 'wanilia', 'proszek do pieczenia', 'drożdże'],
    
    'canned': ['can', 'canned', 'beans', 'tomato sauce', 'tomato paste', 'soup', 'tuna', 'sardines', 'puszka', 'puszkowany', 'konserwa'],
    
    'snacks': ['chip', 'pretzel', 'popcorn', 'nut', 'seed', 'trail mix', 'granola', 'bar', 'jerky', 'cracker', 'cookie', 'candy',
               'chocolate', 'chipsy', 'przekąska', 'orzech', 'orzechów', 'nasiona'],
    
    'beverages': ['water', 'juice', 'soda', 'tea', 'coffee', 'milk', 'wine', 'beer', 'liquor', 'cocktail', 'smoothie', 'shake',
                  'woda', 'sok', 'herbata', 'kawa', 'mleko', 'wino', 'piwo', 'koktajl']
  };
  
  // Check each category for matches
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => lowerName.includes(keyword))) {
      return category;
    }
  }
  
  // Default category
  return 'other';
}

/**
 * Parse an ingredient string to extract quantity, unit, and name
 */
export function parseIngredient(ingredient: string): { 
  quantity: number; 
  unit: string; 
  name: string;
} {
  // Basic parsing for ingredients in format like "2 cups flour" or "1/2 teaspoon salt"
  // Also handles formats like "1 small onion" or "2-3 tablespoons oil"
  
  // Trim the ingredient string
  const trimmedIngredient = ingredient.trim();
  
  // Try to match patterns like "2 cups", "1/2 tsp", "2-3 tablespoons", etc.
  const quantityUnitMatch = trimmedIngredient.match(/^(\d+[\/\.\d-]*)\s*([a-zA-Z]*)\s+(.+)$/);
  
  if (quantityUnitMatch) {
    const [, quantityStr, unit, name] = quantityUnitMatch;
    
    // Parse the quantity
    let quantity = 1;
    
    if (quantityStr.includes('/')) {
      // Handle fractions like "1/2"
      const [numerator, denominator] = quantityStr.split('/').map(Number);
      quantity = numerator / denominator;
    } else if (quantityStr.includes('-')) {
      // Handle ranges like "2-3", take the average
      const [min, max] = quantityStr.split('-').map(Number);
      quantity = (min + max) / 2;
    } else {
      // Handle regular numbers
      quantity = parseFloat(quantityStr);
    }
    
    return {
      quantity: isNaN(quantity) ? 1 : quantity,
      unit: unit || 'unit',
      name: name.trim()
    };
  }
  
  // If no quantity/unit pattern is found, assume quantity of 1
  return {
    quantity: 1,
    unit: 'unit',
    name: trimmedIngredient
  };
}

/**
 * Merge similar ingredients to create a consolidated shopping list
 */
export function mergeIngredients(ingredients: Array<{ 
  quantity: number; 
  unit: string; 
  name: string;
  mealName?: string;
  mealType?: string;
}>): Array<{ 
  quantity: number; 
  unit: string; 
  name: string;
  meals: string[];
  mealTypes: string[];
}> {
  const mergedMap = new Map<string, {
    quantity: number;
    unit: string;
    name: string;
    meals: string[];
    mealTypes: string[];
  }>();
  
  // Normalize ingredient names for better matching
  const normalizeIngredientName = (name: string): string => {
    return name
      .toLowerCase()
      .trim()
      // Remove temperature descriptors
      .replace(/\b(hot|cold|warm|frozen|chilled|room temperature)\b/gi, '')
      // Remove common descriptors that don't affect the core ingredient
      .replace(/\b(fresh|frozen|dried|chopped|diced|sliced|minced|grated|shredded|cooked|raw|organic|large|small|medium|whole|halved|quartered|cubed)\b/gi, '')
      // Remove preparation methods
      .replace(/\b(boiled|steamed|roasted|grilled|fried|baked|sautéed|blanched|toasted)\b/gi, '')
      // Remove quality descriptors
      .replace(/\b(ripe|unripe|fresh|stale|soft|hard|firm|tender)\b/gi, '')
      // Remove packaging/form descriptors
      .replace(/\b(canned|jarred|bottled|packaged|boxed)\b/gi, '')
      // Remove parenthetical descriptions
      .replace(/\([^)]*\)/g, '')
      // Remove commas and extra punctuation
      .replace(/[,;]/g, '')
      // Normalize plurals - convert to singular
      .replace(/\b(\w+)s\b/g, '$1') // Simple plural removal (seeds -> seed, kernels -> kernel)
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      .trim();
  };
  
  // Normalize units for better matching
  const normalizeUnit = (unit: string): string => {
    const unitMap: Record<string, string> = {
      'cup': 'cup',
      'cups': 'cup',
      'c': 'cup',
      'tbsp': 'tablespoon',
      'tablespoon': 'tablespoon',
      'tablespoons': 'tablespoon',
      'tsp': 'teaspoon',
      'teaspoon': 'teaspoon',
      'teaspoons': 'teaspoon',
      'oz': 'ounce',
      'ounce': 'ounce',
      'ounces': 'ounce',
      'lb': 'pound',
      'lbs': 'pound',
      'pound': 'pound',
      'pounds': 'pound',
      'g': 'gram',
      'gram': 'gram',
      'grams': 'gram',
      'kg': 'kilogram',
      'kilogram': 'kilogram',
      'kilograms': 'kilogram',
      'ml': 'milliliter',
      'milliliter': 'milliliter',
      'milliliters': 'milliliter',
      'l': 'liter',
      'liter': 'liter',
      'liters': 'liter',
      'piece': 'unit',
      'pieces': 'unit',
      'whole': 'unit',
      '': 'unit'
    };
    
    const normalized = unit.toLowerCase().trim();
    return unitMap[normalized] || normalized;
  };
  
  // Process each ingredient
  for (const ingredient of ingredients) {
    const normalizedName = normalizeIngredientName(ingredient.name);
    const normalizedUnit = normalizeUnit(ingredient.unit);
    
    // Create a key combining name and unit for more accurate matching
    const key = `${normalizedName}|${normalizedUnit}`;
    
    // Check if we already have this ingredient
    if (mergedMap.has(key)) {
      const existing = mergedMap.get(key)!;
      
      // Add quantities (units are already matched via the key)
      existing.quantity += ingredient.quantity;
      
      // Track which meals use this ingredient
      if (ingredient.mealName && !existing.meals.includes(ingredient.mealName)) {
        existing.meals.push(ingredient.mealName);
      }
      
      // Track meal types
      if (ingredient.mealType && !existing.mealTypes.includes(ingredient.mealType)) {
        existing.mealTypes.push(ingredient.mealType);
      }
      
    } else {
      // Add new ingredient
      mergedMap.set(key, {
        quantity: ingredient.quantity,
        unit: normalizedUnit,
        name: ingredient.name, // Keep original name with proper capitalization
        meals: ingredient.mealName ? [ingredient.mealName] : [],
        mealTypes: ingredient.mealType ? [ingredient.mealType] : []
      });
    }
  }
  
  // Convert map to array
  return Array.from(mergedMap.values());
}