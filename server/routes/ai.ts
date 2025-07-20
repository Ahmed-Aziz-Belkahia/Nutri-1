import { Router } from 'express';
import multer from 'multer';
import { recognizeFoodFromImage, analyzeNutrition, generateMealPlan, suggestRecipe } from '../services/openai';
import { db } from '@db';
import { userDietaryPreferences } from '@db/schema';
import { eq, and } from 'drizzle-orm';
import { mealPlans, recipes, recipesInMealPlan } from '@db/schema';

const router = Router();
const upload = multer();

// Food recognition endpoint
router.post('/recognize', upload.single('image'), async (req, res) => {
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
router.post('/analyze-nutrition', async (req, res) => {
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
router.get('/meal-plans/today', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const today = new Date().toISOString().split('T')[0];
    console.log('Fetching meal plan for date:', today);

    // Get today's meal plan
    const [todaysPlan] = await db
      .select()
      .from(mealPlans)
      .where(
        and(
          eq(mealPlans.userId, req.user.id),
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
router.post('/generate-meal-plan', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get user's dietary preferences
    const preferences = await db.query.userDietaryPreferences.findFirst({
      where: eq(userDietaryPreferences.userId, req.user.id)
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
router.post('/suggest-recipe', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { ingredients } = req.body;
    if (!ingredients || !Array.isArray(ingredients)) {
      return res.status(400).json({ error: 'Invalid ingredients provided' });
    }

    const recipe = await suggestRecipe(ingredients);
    res.json(recipe);
  } catch (error) {
    console.error('Recipe suggestion error:', error);
    res.status(500).json({ error: 'Failed to suggest recipe' });
  }
});

export default router;