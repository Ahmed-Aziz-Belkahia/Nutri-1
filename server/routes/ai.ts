import { Router, Response } from 'express';
import multer from 'multer';
import { recognizeFoodFromImage, analyzeNutrition, generateMealPlan, suggestRecipe } from '../services/openai';
import { db } from '@db';
import { userDietaryPreferences, userNutritionPreferences } from '@db/schema';
import { eq, and } from 'drizzle-orm';
import { mealPlans, recipes, recipesInMealPlan } from '@db/schema';
import { requireAuth, type AuthRequest } from '../utils/jwt';

const router = Router();
const upload = multer();

// Apply JWT authentication to all routes
router.use(requireAuth);

// Food recognition endpoint
router.post('/recognize', upload.single('image'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const base64Image = req.file.buffer.toString('base64');
    const recognition = await recognizeFoodFromImage(base64Image);
    res.json(recognition);
  } catch (error) {
    console.error('Food recognition error:', error);
    res.status(500).json({ error: 'Failed to recognize food items' });
  }
});

// Nutrition analysis endpoint
router.post('/analyze-nutrition', async (req: AuthRequest, res: Response) => {
  try {
    const { foodItems } = req.body;
    if (!foodItems || !Array.isArray(foodItems)) {
      return res.status(400).json({ error: 'Invalid food items provided' });
    }

    const analysis = await analyzeNutrition(foodItems);
    res.json(analysis);
  } catch (error) {
    console.error('Nutrition analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze nutrition' });
  }
});

// Get today's meal plan endpoint
router.get('/meal-plans/today', async (req: AuthRequest, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    console.log('Fetching meal plan for date:', today);

    // Get today's meal plan
    const [todaysPlan] = await db
      .select()
      .from(mealPlans)
      .where(
        and(
          eq(mealPlans.userId, req.user!.id),
          eq(mealPlans.date, today)
        )
      );

    console.log('Found meal plan:', todaysPlan);

    if (!todaysPlan) {
      return res.json({ hasPlan: false });
    }

    // Get associated recipes
    const mealRecipes = await db
      .select({
        id: recipes.id,
        name: recipes.name,
        mealType: recipesInMealPlan.mealType,
        order: recipesInMealPlan.order,
        servingSize: recipesInMealPlan.servingSize,
        isFrozen: recipesInMealPlan.isFrozen,
        isCompleted: recipesInMealPlan.isCompleted,
        nutritionInfo: recipes.nutritionInfo,
        instructions: recipes.instructions,
        ingredients: recipes.ingredients,
        imageUrl: recipes.imageUrl
      })
      .from(recipesInMealPlan)
      .innerJoin(recipes, eq(recipes.id, recipesInMealPlan.recipeId))
      .where(eq(recipesInMealPlan.mealPlanId, todaysPlan.id))
      .orderBy(recipesInMealPlan.order);

    console.log('Found recipes:', mealRecipes);

    // Return meals as an array instead of an object
    const meals = mealRecipes.map(recipe => ({
      id: recipe.id,
      name: recipe.name,
      mealType: recipe.mealType,
      imageUrl: recipe.imageUrl,
      isCompleted: recipe.isCompleted, // Explicitly include isCompleted flag
      order: recipe.order, // Include the order for proper sorting
      recipe: {
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        nutritionInfo: recipe.nutritionInfo,
        prepTime: 30 // Default prep time
      }
    }));

    res.json({
      hasPlan: true,
      plan: {
        id: todaysPlan.id,
        date: todaysPlan.date,
        totalCalories: todaysPlan.totalCalories,
        status: todaysPlan.status,
        meals
      }
    });
  } catch (error) {
    console.error('Error fetching today\'s meal plan:', error);
    res.status(500).json({ error: 'Failed to fetch meal plan' });
  }
});

// Meal plan generation endpoint
router.post('/generate-meal-plan', async (req: AuthRequest, res: Response) => {
  try {
    // Get user's dietary preferences
    const preferences = await db.query.userDietaryPreferences.findFirst({
      where: eq(userDietaryPreferences.userId, req.user!.id)
    });

    if (!preferences) {
      return res.status(400).json({ error: 'User preferences not found' });
    }

    const mealPlan = await generateMealPlan({
      calorieGoal: preferences.calorieTarget,
      dietaryType: preferences.dietaryType,
      allergies: preferences.allergies || [],
      excludedIngredients: preferences.excludedIngredients || []
    });

    res.json(mealPlan);
  } catch (error) {
    console.error('Meal plan generation error:', error);
    res.status(500).json({ error: 'Failed to generate meal plan' });
  }
});

// Recipe suggestion endpoint
router.post('/suggest-recipe', async (req: AuthRequest, res: Response) => {
  try {
    const { ingredients } = req.body;
    if (!ingredients || !Array.isArray(ingredients)) {
      return res.status(400).json({ error: 'Invalid ingredients provided' });
    }

    // Fetch user's dietary preferences from onboarding
    const nutritionPrefs = await db
      .select()
      .from(userNutritionPreferences)
      .where(eq(userNutritionPreferences.userId, req.user!.id))
      .limit(1);
    
    const dietaryPreferences = nutritionPrefs[0] ? {
      allergies: nutritionPrefs[0].allergies || '',
      dietaryRestrictions: nutritionPrefs[0].dietaryRestrictions || '',
      mealBudget: nutritionPrefs[0].mealBudget || '',
      experienceLevel: nutritionPrefs[0].experienceLevel || ''
    } : undefined;

    const recipe = await suggestRecipe(ingredients, req.user?.id, dietaryPreferences);
    res.json(recipe);
  } catch (error) {
    console.error('Recipe suggestion error:', error);
    res.status(500).json({ error: 'Failed to suggest recipe' });
  }
});

export default router;