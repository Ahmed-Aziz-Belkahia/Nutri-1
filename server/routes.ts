import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { requireAuth, type AuthRequest } from "./utils/jwt";
import { checkTokenLimit } from "./middleware/check-token-limit";
import { db } from "@db";
import {
  users,
  recipes,
  foodLogs,
  userNutritionPreferences,
  passwordResetTokens
} from "@db/schema";
import { eq, desc, and, sql, inArray, gte, lte, or, asc, count, sum, avg, between, isNull, isNotNull } from "drizzle-orm";

import { analyzeFoodImage, analyzeIngredientsWithOpenAI } from "./services/food-recognition";
import { analyzeFoodText } from "./services/openai";
import { generateRecipe } from "./services/recipe-generation";
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { promises as fsPromises, existsSync, mkdirSync } from 'fs';
import express from "express";

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (_, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Not an image! Please upload an image.'));
    }
  },
});

// Custom error handling middleware for multer
const handleUpload = upload.single('profileImage');

export function registerRoutes(app: Express): Server {
  // JWT authentication is now handled by requireAuth middleware in routes

  // Setup static file serving for uploads
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // REDIRECT OLD AUTH ROUTES TO JWT ROUTES
  // Intercept old /api/login and /api/register before auth.ts handles them
  app.post("/api/login", async (req: Request, res: Response) => {
    // Forward to JWT auth route
    return res.redirect(307, '/api/auth/login');
  });

  app.post("/api/register", async (req: Request, res: Response) => {
    // Forward to JWT auth route  
    return res.redirect(307, '/api/auth/register');
  });

  // Add onboarding completion endpoint
  app.post("/api/register/complete-onboarding", handleUpload, requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      console.log('Received onboarding request:', {
        body: req.body,
        file: req.file ? 'File received' : 'No file'
      });

      const profileData = JSON.parse(req.body.profile);
      const userId = req.user!.id;

      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(process.cwd(), 'uploads');
      await fs.mkdir(uploadsDir, { recursive: true });

      // Calculate macro percentages instead of absolute values
      // Convert from grams to percentages of total calories
      const proteinPercentage = Math.round((profileData.proteinGoal * 4 / profileData.calorieGoal) * 100);
      const carbsPercentage = Math.round((profileData.carbsGoal * 4 / profileData.calorieGoal) * 100);
      const fatPercentage = Math.round((profileData.fatGoal * 9 / profileData.calorieGoal) * 100);
      
      // Ensure percentages don't exceed 100% total
      const totalPercentage = proteinPercentage + carbsPercentage + fatPercentage;
      const adjustedProtein = totalPercentage > 100 ? Math.round(proteinPercentage * 100 / totalPercentage) : proteinPercentage;
      const adjustedCarbs = totalPercentage > 100 ? Math.round(carbsPercentage * 100 / totalPercentage) : carbsPercentage;
      const adjustedFat = totalPercentage > 100 ? Math.round(fatPercentage * 100 / totalPercentage) : fatPercentage;

      // Check if user already has nutrition preferences (update vs insert)
      const existingPrefs = await db.query.userNutritionPreferences.findFirst({
        where: eq(userNutritionPreferences.userId, userId)
      });

      const nutritionData = {
        userId: userId,
        age: profileData.age,
        gender: profileData.gender,
        height: profileData.height,
        currentWeight: profileData.weight,
        goalWeight: profileData.goalWeight,
        weightGoal: profileData.weightGoal,
        activityLevel: profileData.activityLevel,
        caloriesGoal: Math.min(profileData.calorieGoal, 9999),
        proteinGoal: Math.min(adjustedProtein, 100),
        carbsGoal: Math.min(adjustedCarbs, 100),
        fatGoal: Math.min(adjustedFat, 100),
        dietaryRestrictions: profileData.dietaryRestrictions || [],
        allergies: profileData.allergies || [],
        mealBudget: profileData.mealBudget,
        experienceLevel: profileData.experienceLevel,
        // Enhanced onboarding fields
        weightLossSpeed: profileData.weightLossSpeed || null,
        weightGainSpeed: profileData.weightGainSpeed || null,
        obstacles: profileData.obstacles || [],
        accomplishments: profileData.accomplishments || [],
        referralSource: profileData.referralSource || null,
        hasUsedOtherApps: profileData.hasUsedOtherApps ?? null,
        birthMonth: profileData.birthMonth || null,
        birthDay: profileData.birthDay || null,
        birthYear: profileData.birthYear || null,
        isMetric: profileData.isMetric ?? true,
        // Store original user input values for better UX
        workoutFrequency: profileData.workoutFrequency || null,
        heightFeet: profileData.heightFeet || null,
        heightInches: profileData.heightInches || null,
        weightLbs: profileData.weightLbs || null,
        goalWeightLbs: profileData.goalWeightLbs || null,
      };

      if (existingPrefs) {
        // Update existing preferences
        await db.update(userNutritionPreferences)
          .set(nutritionData)
          .where(eq(userNutritionPreferences.userId, userId));
        console.log("User nutrition preferences updated successfully");
      } else {
        // Insert new preferences
        await db.insert(userNutritionPreferences).values(nutritionData);
        console.log("User nutrition preferences inserted successfully");
      }

      // Determine preferred language from profileData or default to 'en'
      const preferredLanguage = profileData.preferredLanguage || 'en';

      // Handle profile image if provided
      if (req.file) {
        const filename = `profile-${userId}-${Date.now()}.jpg`;

        await sharp(req.file.buffer)
          .resize(800, 800, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ quality: 90 })
          .toFile(path.join(uploadsDir, filename));

        const imageUrl = `/uploads/${filename}`;
        await db.update(users)
          .set({ 
            profileImage: imageUrl, 
            hasCompletedOnboarding: true,
            preferred_language: preferredLanguage
          })
          .where(eq(users.id, userId));
          
        console.log(`Updated user ${userId} with profile image, language: ${preferredLanguage}, and completed onboarding status`);
      } else {
        // Update hasCompletedOnboarding and language preference even without image
        await db.update(users)
          .set({ 
            hasCompletedOnboarding: true,
            preferred_language: preferredLanguage
          })
          .where(eq(users.id, userId));
          
        console.log(`Updated user ${userId} language to: ${preferredLanguage} and completed onboarding status`);
      }
      
      // Verify the update was successful
      const updatedUser = await db.query.users.findFirst({
        where: eq(users.id, userId)
      });
      
      console.log(`Verified user ${userId} onboarding status: ${updatedUser?.hasCompletedOnboarding}`);
      

      res.json({ ok: true, userId: userId });
    } catch (error) {
      console.error('Error completing onboarding:', error);
      res.status(500).json({
        error: 'Failed to complete onboarding',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Profile image upload endpoint
  app.post("/api/user/profile-image", upload.single('image'), requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
      }

      const userId = req.user!.id;
      const uploadsDir = path.join(process.cwd(), 'uploads');
      await fs.mkdir(uploadsDir, { recursive: true });

      const filename = `profile-${userId}-${Date.now()}.jpg`;

      await sharp(req.file.buffer)
        .resize(800, 800, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 90 })
        .toFile(path.join(uploadsDir, filename));

      const imageUrl = `/uploads/${filename}`;
      await db.update(users)
        .set({ profileImage: imageUrl })
        .where(eq(users.id, userId));

      res.json({ imageUrl });
    } catch (error) {
      console.error('Error uploading profile image:', error);
      res.status(500).json({ error: 'Failed to upload image' });
    }
  });





  // Add logout endpoint (redirects to JWT logout)
  app.post("/api/logout", (req, res) => {
    // Redirect to JWT logout endpoint
    return res.redirect(307, '/api/auth/logout');
  });

  // AI Nutrition Coach endpoint
  app.post("/api/analyze-food", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { image } = req.body;
      if (!image) {
        return res.status(400).json({
          error: 'Missing image data',
          message: 'Image data is required for analysis'
        });
      }

      // Get user's preferred language
      const userProfile = await db.query.users.findFirst({
        where: eq(users.id, req.user!.id)
      });
      const language = userProfile?.preferred_language || 'en';

      try {
        // Use OpenAI for food analysis
        console.log('Analyzing food with OpenAI...');
        const result = await analyzeFoodImage(image, req.user!.id, language);
        console.log('OpenAI food analysis complete');
        res.json(result);
      } catch (analyzeError) {
        console.error('Error in OpenAI food analysis:', analyzeError);
        
        // Create more user-friendly error messages
        let statusCode = 500;
        let errorMessage = 'Failed to analyze food image';
        
        if (analyzeError instanceof Error) {
          if (analyzeError.message.includes('Invalid image format') || analyzeError.message.includes('unsupported image')) {
            statusCode = 400;
            errorMessage = 'Unsupported image format. Please use JPEG, PNG, GIF, or WEBP images.';
          } else if (analyzeError.message.includes('Empty image data')) {
            statusCode = 400;
            errorMessage = 'No image data provided or image is empty.';
          } else {
            errorMessage = analyzeError.message;
          }
        }
        
        res.status(statusCode).json({
          error: 'Food analysis failed',
          message: errorMessage
        });
      }
    } catch (error) {
      console.error('Food analysis error:', error);
      res.status(500).json({
        error: 'Food analysis failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });

  // Add text-based food analysis endpoint
  app.post("/api/analyze-food-text", requireAuth, async (req: AuthRequest, res: Response) => {
    try {

      const { text } = req.body;
      if (!text || text.trim() === "") {
        return res.status(400).json({
          error: 'Missing text description',
          message: 'Food description text is required for analysis'
        });
      }

      // Get user's preferred language
      const userProfile = await db.query.users.findFirst({
        where: eq(users.id, req.user!.id)
      });
      const language = userProfile?.preferred_language || 'en';

      try {
        console.log('Analyzing food text with OpenAI...', text);
        const result = await analyzeFoodText(text, req.user!.id, language);
        console.log('OpenAI food text analysis complete, result:', JSON.stringify(result, null, 2));
        
        // Validate result before returning
        if (!result || typeof result.name !== 'string' || typeof result.calories !== 'number') {
          console.error('Invalid result format from analyzeFoodText:', result);
          throw new Error('Invalid analysis result format');
        }
        
        // Ensure all required fields are present
        const safeResult = {
          name: result.name,
          calories: result.calories,
          protein: result.protein || 0,
          carbs: result.carbs || 0,
          fat: result.fat || 0,
          confidence: result.confidence || 0.8,
          components: Array.isArray(result.components) ? result.components : []
        };
        
        res.json(safeResult);
      } catch (analyzeError) {
        console.error('Error in OpenAI food text analysis:', analyzeError);
        
        let statusCode = 500;
        let errorMessage = 'Failed to analyze food description';
        
        if (analyzeError instanceof Error) {
          if (analyzeError.message.includes('API key')) {
            errorMessage = 'OpenAI API key configuration error. Please try again later.';
          } else if (analyzeError.message.includes('Invalid analysis result')) {
            errorMessage = 'Could not analyze the food description. Please be more specific or try manual entry.';
          } else {
            errorMessage = analyzeError.message;
          }
        }
        
        res.status(statusCode).json({
          error: 'Food text analysis failed',
          message: errorMessage
        });
      }
    } catch (error) {
      console.error('Food text analysis error:', error);
      res.status(500).json({
        error: 'Food text analysis failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });

  // Add analyze-ingredients endpoint
  app.post("/api/analyze-ingredients", requireAuth, async (req: AuthRequest, res: Response) => {
    try {

      const { image } = req.body;
      if (!image) {
        return res.status(400).json({
          error: 'Missing image data',
          message: 'Image data is required for analysis'
        });
      }

      // Get user's preferred language
      const userProfile = await db.query.users.findFirst({
        where: eq(users.id, req.user!.id)
      });
      const language = userProfile?.preferred_language || 'en';

      // Clean up base64 string if needed
      let base64Image = image;
      if (base64Image.includes('data:image/')) {
        base64Image = base64Image.split(',')[1];
      }

      // Call the ingredient analysis service
      const result = await analyzeIngredientsWithOpenAI(base64Image, req.user!.id, language);
      console.log('Ingredient analysis result:', result);

      res.json(result);
    } catch (error) {
      console.error('Ingredient analysis error:', error);
      
      // Create more user-friendly error messages
      let statusCode = 500;
      let errorMessage = 'Failed to analyze ingredients';
      
      if (error instanceof Error) {
        if (error.message.includes('Invalid image format') || error.message.includes('unsupported image')) {
          statusCode = 400;
          errorMessage = 'Unsupported image format. Please use JPEG, PNG, GIF, or WEBP images.';
        } else if (error.message.includes('Empty image data')) {
          statusCode = 400;
          errorMessage = 'No image data provided or image is empty.';
        } else if (error.message.includes('API key')) {
          errorMessage = 'OpenAI API key configuration error. Please try again later.';
        } else {
          errorMessage = error.message;
        }
      }
      
      res.status(statusCode).json({
        error: 'Failed to analyze ingredients',
        message: errorMessage
      });
    }
  });

  // Get user's recipes
  app.get("/api/recipes", requireAuth, async (req: AuthRequest, res: Response) => {
    try {

      // Support both 'type' and 'filter' query params for backwards compatibility
      const type = (req.query.type as string) || (req.query.filter as string) || 'created';
      
      console.log(`Fetching ${type} recipes for user ${req.user!.id}`);
      
      // Recipe likes were removed for the MVP; nothing is liked.
      const likedIds = new Set<number>();

      // Determine which sources to fetch based on filter type
      // 'created' includes: 'created', 'ingredient_generation', 'ai_generated', 'meal_plan'
      // 'saved' includes: 'saved', 'favorited'
      const createdSources = ['created', 'ingredient_generation', 'ai_generated', 'meal_plan'];
      const savedSources = ['saved', 'favorited'];
      const sourcesToFetch = type === 'saved' ? savedSources : createdSources;
      
      // Main query - include multiple source types
      const userRecipes = await db
        .select()
        .from(recipes)
        .where(
          and(
            eq(recipes.userId, req.user!.id),
            inArray(recipes.source, sourcesToFetch)
          )
        )
        .orderBy(desc(recipes.createdAt))
        .limit(50); // Add limit to prevent too many records
      
      // ALSO fetch from food_logs where is_recipe = 1 (scanned recipes)
      const scannedRecipes = await db
        .select()
        .from(foodLogs)
        .where(
          and(
            eq(foodLogs.userId, req.user!.id),
            eq(foodLogs.isRecipe, true)
          )
        )
        .orderBy(desc(foodLogs.date))
        .limit(50);
      
      // Transform scanned recipes to match recipe format
      const transformedScannedRecipes = scannedRecipes.map(log => ({
        id: log.id,
        userId: log.userId,
        name: log.name,
        description: log.description || '',
        ingredients: log.ingredients || [],
        instructions: log.instructions || [],
        nutritionInfo: {
          calories: log.calories,
          protein: log.protein,
          carbs: log.carbs,
          fat: log.fat
        },
        prepTime: log.prepTime || null,
        cookTime: log.cookTime || null,
        servings: log.servings || 1,
        cuisineType: log.cuisineType || null,
        mealType: log.mealType || null,
        difficulty: log.difficulty || null,
        tags: log.tags || [],
        imageUrl: log.image || '',
        isPublic: false,
        source: 'scanned' as const,
        likesCount: 0,
        commentsCount: 0,
        createdAt: new Date(log.date * 1000), // Convert Unix timestamp to Date
        updatedAt: new Date(log.date * 1000),
        isLiked: false // Scanned recipes don't have likes
      }));
      
      // Combine both sources
      const allRecipes = [...userRecipes.map(recipe => ({
        ...recipe,
        isLiked: likedIds.has(recipe.id)
      })), ...transformedScannedRecipes];
      
      // Sort by creation date (newest first)
      allRecipes.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      console.log(`Found ${userRecipes.length} ${type} recipes + ${scannedRecipes.length} scanned recipes`);
      res.json(allRecipes);
    } catch (error) {
      console.error('Error fetching recipes:', error);
      res.status(500).json({
        error: 'Failed to fetch recipes',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Add the recipe saving endpoint after the existing recipe routes
  // Create new recipe endpoint
  app.post("/api/recipes", requireAuth, async (req: AuthRequest, res: Response) => {
    try {

      const { name, description, calories, protein, carbs, fat, ingredients, instructions, isPublic, imageUrl, source, prepTime, cookTime, servings, difficulty, cuisineType } = req.body;

      // Create the recipe in the database (only columns that exist in schema)
      const [newRecipe] = await db
        .insert(recipes)
        .values({
          userId: req.user!.id,
          name,
          description,
          ingredients: Array.isArray(ingredients) ? ingredients : [],
          instructions: Array.isArray(instructions) ? instructions : [],
          nutritionInfo: {
            calories: Number(calories) || 0,
            protein: Number(protein) || 0,
            carbs: Number(carbs) || 0,
            fat: Number(fat) || 0
          },
          imageUrl: imageUrl || '',
          isPublic: Boolean(isPublic),
          source: source || 'created',
          likesCount: 0,
          commentsCount: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      res.json(newRecipe);
    } catch (error) {
      console.error('Error creating recipe:', error);
      res.status(500).json({
        error: 'Failed to create recipe',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get recent meals
  app.get("/api/food-logs/recent", requireAuth, async (req: AuthRequest, res: Response) => {
    try {

      // Get recent food logs
  const recentLogs = await db.select({
        id: foodLogs.id,
        name: foodLogs.name,
        imageUrl: foodLogs.image,
        date: foodLogs.date,
      })
        .from(foodLogs)
        .where(eq(foodLogs.userId, req.user!.id))
        .orderBy(desc(foodLogs.date))
        .limit(3);

      // Map the logs to match the Recipe interface
      const formattedLogs = recentLogs.map(log => ({
        id: log.id,
        name: log.name,
        description: `Added on ${new Date(log.date).toLocaleDateString()}`,
        imageUrl: log.imageUrl,
        likesCount: 0
      }));

      res.json(formattedLogs);
    } catch (error) {
      console.error('Error fetching recent meals:', error);
      res.status(500).json({
        error: 'Failed to fetch recent meals',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get all scanned meals (food logs with images) for recipes page
  app.get("/api/food-logs/scanned", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;

      // Get all food logs with images (scanned meals)
      // Exclude ingredient-generated recipes (source = 'ingredient_generation')
      const scannedLogs = await db
        .select()
        .from(foodLogs)
        .where(
          and(
            eq(foodLogs.userId, req.user!.id),
            sql`${foodLogs.image} IS NOT NULL AND ${foodLogs.image} != ''`,
            sql`(${foodLogs.source} IS NULL OR ${foodLogs.source} != 'ingredient_generation')`
          )
        )
        .orderBy(desc(foodLogs.date))
        .limit(limit);

      console.log('[Food Logs API] Retrieved scanned logs:', {
        count: scannedLogs.length,
        userId: req.user!.id,
        excludedIngredientGeneration: true
      });

      res.json(scannedLogs);
    } catch (error) {
      console.error('Error fetching scanned meals:', error);
      res.status(500).json({
        error: 'Failed to fetch scanned meals',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get ingredient-generated recipes (recipes created from ingredient scanning)
  app.get("/api/food-logs/ingredient-recipes", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

      // Query from recipes table where source is 'ingredient_generation'
      const ingredientRecipes = await db
        .select({
          id: recipes.id,
          name: recipes.name,
          description: recipes.description,
          imageUrl: recipes.imageUrl,
          nutritionInfo: recipes.nutritionInfo,
          ingredients: recipes.ingredients,
          instructions: recipes.instructions,
          source: recipes.source,
          createdAt: recipes.createdAt,
        })
        .from(recipes)
        .where(
          and(
            eq(recipes.userId, req.user!.id),
            eq(recipes.source, 'ingredient_generation')
          )
        )
        .orderBy(desc(recipes.createdAt))
        .limit(limit);

      // Transform to match expected format with calories/protein/etc at top level
      const transformedRecipes = ingredientRecipes.map(recipe => ({
        id: recipe.id,
        name: recipe.name,
        description: recipe.description,
        imageUrl: recipe.imageUrl,
        image: recipe.imageUrl,
        calories: recipe.nutritionInfo?.calories || 0,
        protein: recipe.nutritionInfo?.protein || 0,
        carbs: recipe.nutritionInfo?.carbs || 0,
        fat: recipe.nutritionInfo?.fat || 0,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        source: recipe.source,
        createdAt: recipe.createdAt,
      }));

      console.log('[Recipes API] Retrieved ingredient-generated recipes:', {
        count: transformedRecipes.length,
        userId: req.user!.id
      });

      res.json(transformedRecipes);
    } catch (error) {
      console.error('Error fetching ingredient-generated recipes:', error);
      res.status(500).json({
        error: 'Failed to fetch ingredient-generated recipes',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "healthy" });
  });

  // Recipe generation endpoint - UPDATED
  app.post("/api/generate-recipe", requireAuth, async (req: AuthRequest, res: Response) => {
    try {

      const { ingredients } = req.body;
      if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
        return res.status(400).json({ error: 'Missing required fields. Please provide at least one ingredient.' });
      }

      // Get user's preferred language
      const userProfile = await db.query.users.findFirst({
        where: eq(users.id, req.user!.id)
      });
      const language = userProfile?.preferred_language || 'en';

      // Call the OpenAI recipe generation service
  const generatedRecipe = await generateRecipe(ingredients, { difficulty: 'Medium', timeNeeded: 30, flavor: 'Mixed', language });

      // Return the generated recipe without saving
      res.json({
        recipe: generatedRecipe,
        message: "Recipe generated successfully"
      });
    } catch (error) {
      console.error('Recipe Generation Error:', error);
      res.status(500).json({
        error: 'Failed to generate recipe',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Update the recipe generation endpoint to include preferences
  app.post("/api/generate-recipes", requireAuth, checkTokenLimit('recipe-generation'), async (req: AuthRequest, res: Response) => {
    try {

      const { ingredients, preferences, prompt, notes } = req.body;
      if (!ingredients || !Array.isArray(ingredients)) {
        return res.status(400).json({ error: 'Invalid ingredients data' });
      }

      // More flexible preferences handling
      const defaultPreferences = {
        difficulty: "Medium",
        timeNeeded: 30,
        flavor: "Mixed"
      };

      // Get ingredient names (if they're objects) or use as-is if they're strings
      const ingredientNames = ingredients.map(ing => {
        if (typeof ing === 'object' && ing !== null && 'name' in ing) {
          return ing.name;
        }
        return String(ing);
      });

      console.log('Generating recipes for ingredients:', ingredientNames);
      
      // Get the user's preferred language and nutrition preferences
      const userId = req.user!.id;
      const userProfileResult = await db.query.users.findFirst({
        where: eq(users.id, userId)
      });
      
      // Fetch user's dietary preferences from onboarding
      const userNutritionPrefs = await db.query.userNutritionPreferences.findFirst({
        where: eq(userNutritionPreferences.userId, userId)
      });
      
      // Extract dietary restrictions and allergies
      const dietaryRestrictions = userNutritionPrefs?.dietaryRestrictions || [];
      const allergies = userNutritionPrefs?.allergies || [];
      const mealBudget = userNutritionPrefs?.mealBudget || undefined;
      const experienceLevel = userNutritionPrefs?.experienceLevel || undefined;
      
      console.log('[Recipe Generation] User dietary preferences:', {
        dietaryRestrictions,
        allergies,
        mealBudget,
        experienceLevel
      });
      
      // Get user's preferred language
      const language = userProfileResult?.preferred_language || 'en';
      console.log(`User language preference for recipes: ${language}`);
      
      // Map the client preferences to what the API expects, including user's dietary preferences
      const recipePreferences = {
        difficulty: preferences?.difficulty || defaultPreferences.difficulty,
        timeNeeded: preferences?.timeNeeded || preferences?.maxPrepTime || 
                   preferences?.maxCookTime || preferences?.prepTime || 
                   preferences?.cookingTime || defaultPreferences.timeNeeded,
        // Use flavor from preferences
        flavor: preferences?.flavor || defaultPreferences.flavor,
        // Add notes as a separate field
        notes: notes || '',
        // Add language preference
        language: language,
        // Add user's dietary preferences from onboarding
        dietaryRestrictions: dietaryRestrictions,
        allergies: allergies,
        mealBudget: mealBudget,
        experienceLevel: experienceLevel
      };

      console.log('Using preferences:', recipePreferences);
      console.log('Additional notes:', notes || 'None provided');
      
      // Use custom prompt if provided, or create one that includes notes
      const customPrompt = prompt || (notes ? `Consider these preparation notes when creating recipes: ${notes}` : undefined);

      try {
        // Generate recipe using OpenAI with preferences and userId for token tracking
        const result = await generateRecipe(ingredientNames, recipePreferences, customPrompt, userId);
        res.json(result);
      } catch (error) {
        console.error('Recipe generation error:', error);
        
        // Check if there's partial data we can use
        if (error instanceof Error && error.message.includes('Invalid recipe format')) {
          // Create a minimal recipe with the ingredients
          const fallbackRecipe = {
            name: "Ingredients Mix",
            description: "A simple mix using your ingredients",
            ingredients: ingredientNames.map(ing => `${ing}`),
            instructions: "Mix all ingredients together according to your preference",
            prepTime: 15,
            difficulty: "Easy",
            flavor: "Mixed",
            nutritionInfo: {
              calories: 200,
              protein: 10,
              carbs: 25,
              fat: 5
            }
          };
          
          // Return at least one recipe in the error response so the client can show something
          res.status(500).json({
            error: 'Failed to generate recipes',
            message: error instanceof Error ? error.message : 'Unknown error',
            recipes: [fallbackRecipe]
          });
        } else {
          res.status(500).json({
            error: 'Failed to generate recipes',
            message: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    } catch (error) {
      console.error('Outer recipe generation error:', error);
      res.status(500).json({
        error: 'Failed to process recipe request',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Add endpoint for fetching scanned recipe from food_logs
  app.get("/api/recipes/food-log/:id", async (req, res) => {
    try {
      const logId = parseInt(req.params.id);
      if (isNaN(logId)) {
        return res.status(400).json({ error: 'Invalid food log ID' });
      }

      const foodLog = await db
        .select()
        .from(foodLogs)
        .where(eq(foodLogs.id, logId))
        .limit(1);

      if (!foodLog || foodLog.length === 0) {
        return res.status(404).json({ error: 'Food log not found' });
      }

      const log = foodLog[0];

      // If this is a scanned meal with components, generate ingredients from components
      let ingredients = log.ingredients || [];
      let instructions = log.instructions || [];
      
      if ((!ingredients || ingredients.length === 0) && log.components && Array.isArray(log.components) && log.components.length > 0) {
        // Generate ingredients list from components
        ingredients = log.components.map((comp: any) => ({
          name: comp.name,
          amount: comp.quantity || 1,
          unit: comp.servingSize || 'portion',
          notes: comp.details?.preparation || ''
        }));
        
        // Generate simple instructions from components
        instructions = [
          'This is a scanned meal composed of the following ingredients.',
          `Combine all ${log.components.length} components as shown in the image.`,
          'Adjust portions according to your dietary needs.'
        ];
      }

      // Transform food log to recipe format
      const recipeData = {
        id: log.id,
        name: log.name,
        description: log.description || '',
        imageUrl: log.image || '',
        prepTime: log.prepTime || null,
        cookTime: log.cookTime || null,
        servings: log.servings || 1,
        difficulty: log.difficulty || null,
        ingredients: ingredients,
        instructions: instructions,
        nutritionInfo: {
          calories: log.calories,
          protein: log.protein,
          carbs: log.carbs,
          fat: log.fat
        },
        tags: log.tags || [],
        cuisineType: log.cuisineType || null,
        mealType: log.mealType || null,
        source: 'scanned',
        isSaved: false
      };

      res.json(recipeData);
    } catch (error) {
      console.error('Error fetching food log recipe:', error);
      res.status(500).json({
        error: 'Failed to fetch recipe',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Add the GET single recipe endpoint after the existing recipe routes
  app.get("/api/recipes/:id", async (req, res) => {
    try {
      const recipeId = parseInt(req.params.id);
      if (isNaN(recipeId)) {
        return res.status(400).json({ error: 'Invalid recipe ID' });
      }

      // For now, allow access to all recipes to test the interface
      const whereCondition = eq(recipes.id, recipeId);

      const recipe = await db
        .select()
        .from(recipes)
        .where(whereCondition)
        .limit(1);

      if (!recipe || recipe.length === 0) {
        return res.status(404).json({ error: 'Recipe not found' });
      }
      
      // Process ingredients and instructions
      let recipeData = recipe[0];
      
      // Convert ingredients from jsonb to array if needed
      let ingredients = recipeData.ingredients;
      if (typeof ingredients === 'string') {
        try {
          ingredients = JSON.parse(ingredients);
        } catch (e) {
          console.warn('Failed to parse ingredients JSON:', e);
          ingredients = [];
        }
      }
      
  // Convert instructions if needed
  let instructions: string | string[] | undefined = recipeData.instructions as any;
      
      // Debug log to help diagnose issues
      console.log(`Processing instructions for recipe ${recipeData.name} (ID: ${recipeData.id}):`, {
        type: typeof instructions, 
        isArray: Array.isArray(instructions),
        instructionsJSON: typeof instructions === 'string' ? instructions.slice(0, 100) + '...' : null
      });
      
  // Make sure instructions are always returned as an array
  let instructionsArray: string[] = [];
      
      if (Array.isArray(instructions)) {
        instructionsArray = instructions;
  } else if (typeof instructions === 'string') {
        // Try to parse JSON string if it looks like an array
        if ((instructions as string).startsWith('[') && (instructions as string).endsWith(']')) {
          try {
            instructionsArray = JSON.parse(instructions as string);
          } catch (e) {
            console.warn('Failed to parse instructions JSON:', e);
            // Split by newlines as fallback if JSON parsing fails
            instructionsArray = (instructions as string).split('\n').filter((line: string) => line.trim() !== '');
          }
        } else if (instructions !== '{}' && (instructions as string).trim() !== '') {
          // If it's not empty and not a JSON object, split by newlines
          instructionsArray = (instructions as string).split('\n').filter((line: string) => line.trim() !== '');
        }
      }
      
      // We don't want to generate placeholder data - just keep what we have
      // If the database has empty data, we should leave it that way
      
      // Return processed data
      res.json({
        ...recipeData,
        ingredients: Array.isArray(ingredients) ? ingredients : [],
        instructions: instructionsArray
      });
    } catch (error) {
      console.error('Error fetching recipe:', error);
      res.status(500).json({
        error: 'Failed to fetch recipe',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Update an existing recipe
  // DELETE recipe endpoint
  app.delete("/api/recipes/:id", requireAuth, async (req: AuthRequest, res: Response) => {
    try {

      const recipeId = parseInt(req.params.id);
      if (isNaN(recipeId)) {
        return res.status(400).json({ error: 'Invalid recipe ID' });
      }

      // First verify the recipe belongs to the user
      const recipe = await db.query.recipes.findFirst({
        where: and(
          eq(recipes.id, recipeId),
          eq(recipes.userId, req.user!.id)
        )
      });

      if (!recipe) {
        return res.status(404).json({ error: 'Recipe not found or not authorized to delete it' });
      }

      // Delete the recipe
      await db.delete(recipes).where(eq(recipes.id, recipeId));

      console.log(`Recipe ${recipeId} deleted by user ${req.user!.id}`);
      res.json({ success: true, message: 'Recipe deleted successfully' });
    } catch (error) {
      console.error('Error deleting recipe:', error);
      res.status(500).json({
        error: 'Failed to delete recipe',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.put("/api/recipes/:id", requireAuth, async (req: AuthRequest, res: Response) => {
    try {

      const recipeId = parseInt(req.params.id);
      if (isNaN(recipeId)) {
        return res.status(400).json({ error: 'Invalid recipe ID' });
      }

      // Check if recipe exists and belongs to user
      const existingRecipe = await db
        .select()
        .from(recipes)
        .where(
          and(
            eq(recipes.id, recipeId),
            eq(recipes.userId, req.user!.id)
          )
        )
        .limit(1);

      if (existingRecipe.length === 0) {
        return res.status(404).json({ error: 'Recipe not found or not owned by user' });
      }

      const { 
        name, 
        description,
        ingredients,
        instructions,
        nutritionInfo,
        imageUrl,
        isPublic
      } = req.body;

      // Update the recipe
      await db
        .update(recipes)
        .set({
          name: name || existingRecipe[0].name,
          description: description !== undefined ? description : existingRecipe[0].description,
          ingredients: Array.isArray(ingredients) ? ingredients : (existingRecipe[0].ingredients || []),
          instructions: instructions !== undefined ? 
            (Array.isArray(instructions) ? instructions : []) : 
            (Array.isArray(existingRecipe[0].instructions) ? existingRecipe[0].instructions : []),
          nutritionInfo: nutritionInfo || existingRecipe[0].nutritionInfo,
          imageUrl: imageUrl || existingRecipe[0].imageUrl,
          isPublic: isPublic !== undefined ? isPublic : existingRecipe[0].isPublic,
          updatedAt: new Date()
        })
        .where(eq(recipes.id, recipeId));

      // Get the updated recipe
      const updatedRecipe = await db
        .select()
        .from(recipes)
        .where(eq(recipes.id, recipeId))
        .limit(1);

      res.json(updatedRecipe[0]);
    } catch (error) {
      console.error('Error updating recipe:', error);
      res.status(500).json({
        error: 'Failed to update recipe',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Create meal plan endpoint - UPDATED with AI-generated personalized meal plans
  // Add food log endpoint (updated with enhanced logging)
  app.post("/api/food-logs", requireAuth, checkTokenLimit('food-scan-analysis'), async (req: AuthRequest, res: Response) => {
    try {

      const { 
        name, calories, protein, carbs, fat, image, date, components, isAnalyzing,
        // Recipe fields
        description, ingredients, instructions, prepTime, cookTime, servings,
        source, isRecipe, cuisineType, mealType, difficulty, tags
      } = req.body;
      console.log('[Food Logs API] Processing food log request:', {
        userId: req.user!.id,
        name,
        hasImage: !!image,
        hasComponents: Array.isArray(components),
        isAnalyzing: isAnalyzing,
        isPlaceholder: !!isAnalyzing,
        hasRecipeData: !!(instructions && instructions.length > 0)
      });

      if (!name || calories === undefined) {
        console.error('[Food Logs API] Missing required fields:', { name: !!name, calories: !!calories });
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'Name and calories are required'
        });
      }

      // Parse the date from the request or use current date
      // The client sends the date in their local timezone, we want to preserve that date
      let dateString: string;
      if (date) {
        // If client sent a date, extract just the YYYY-MM-DD portion
        // This handles both ISO strings and YYYY-MM-DD format strings
        if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
          // Already in YYYY-MM-DD format
          dateString = date;
        } else {
          // Parse and extract date in local context (first 10 chars of ISO or date object)
          const parsed = new Date(date);
          // Use the date portion from the original string if it's an ISO string
          if (typeof date === 'string' && date.length >= 10) {
            dateString = date.substring(0, 10);
          } else {
            dateString = parsed.toISOString().split('T')[0];
          }
        }
      } else {
        // No date provided, use today's date on the server
        dateString = new Date().toISOString().split('T')[0];
      }
      
      // Store at noon UTC to avoid timezone boundary issues during queries
      const logDate = new Date(`${dateString}T12:00:00.000Z`);
      
      console.log('[Food Logs API] Using log date:', {
        original: date || 'current date',
        normalized: logDate.toISOString(),
        dateString
      });

      let processedComponents;
      let totalCalories = Number(calories);
      let totalProtein = Number(protein);
      let totalCarbs = Number(carbs);
      let totalFat = Number(fat);

      let analyzedName = name; // Initialize with the request name
      
      // Debug the isAnalyzing flag
      console.log('[Food Logs API] Image analysis decision:', {
        hasImage: !!image,
        isAnalyzing: isAnalyzing,
        shouldAnalyze: image && !isAnalyzing
      });

      // Only perform analysis if image exists and it's not a placeholder meal
      if (image && !isAnalyzing) {
        console.log('[Food Logs API] Starting AI analysis - not a placeholder meal');
        try {
          const analysisResult = await analyzeFoodImage(image);
          console.log('[Food Logs API] Image analysis completed:', {
            componentsFound: analysisResult.components?.length || 0
          });

          if (analysisResult.components && analysisResult.components.length > 0) {
            processedComponents = analysisResult.components;
            
            // Calculate totals from individual components instead of using analysisResult totals
            totalCalories = processedComponents.reduce((sum, comp) => sum + (comp.calories * comp.quantity), 0);
            totalProtein = processedComponents.reduce((sum, comp) => sum + (comp.protein * comp.quantity), 0);
            totalCarbs = processedComponents.reduce((sum, comp) => sum + (comp.carbs * comp.quantity), 0);
            totalFat = processedComponents.reduce((sum, comp) => sum + (comp.fat * comp.quantity), 0);
            
            // Use the name from the analysis result instead of the request name
            analyzedName = analysisResult.name || name;

            console.log('[Food Logs API] Using analyzed components:', {
              analyzedName,
              count: processedComponents.length,
              totals: { totalCalories, totalProtein, totalCarbs, totalFat }
            });
          } else {
            console.warn('[Food Logs API] No components in analysis result, using fallback');
            throw new Error('No components in analysis result');
          }
        } catch (analyzeError) {
          console.error('[Food Logs API] Food analysis error:', analyzeError);
          processedComponents = [{
            name: analyzedName,
            calories: totalCalories,
            protein: totalProtein,
            carbs: totalCarbs,
            fat: totalFat,
            servingSize: '1 serving',
            quantity: 1,
            details: {
              type: 'main dish',
              preparation: 'as served',
              texture: 'not specified',
              color: 'not specified',
              estimatedWeight: 'not specified'
            }
          }];
          console.log('[Food Logs API] Using fallback component');
        }
      } else if (Array.isArray(components) && components.length > 0) {
        // Use the components provided by the client (from text analysis)
        console.log('[Food Logs API] Using provided components from text analysis:', { 
          count: components.length,
          firstComponent: components[0]?.name
        });
        
        // Keep the original components from the client
        processedComponents = components;
        
        // Try to create a more descriptive name from the components
        if (components.length > 1) {
          // Create a more descriptive meal name from the components
          const componentNames = components.map(c => c.name).filter(Boolean);
          if (componentNames.length > 1) {
            analyzedName = componentNames.slice(0, 3).join(' with ');
            console.log('[Food Logs API] Generated descriptive name from components:', analyzedName);
          }
        }
      } else {
        console.log('[Food Logs API] No image or components provided, using basic component');
        
        // For placeholder meals (isAnalyzing=true), create minimal components
        if (isAnalyzing) {
          console.log('[Food Logs API] Creating placeholder meal without analysis');
          processedComponents = [{
            name: analyzedName,
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            servingSize: 'analyzing...',
            quantity: 1,
            details: {
              type: 'placeholder',
              preparation: 'analyzing',
              isPlaceholder: true
            }
          }];
        } else {
          processedComponents = [{
            name: analyzedName,
            calories: totalCalories,
            protein: totalProtein,
            carbs: totalCarbs,
            fat: totalFat,
            servingSize: '1 serving',
            quantity: 1,
            details: {
              type: 'main dish',
              preparation: 'as served',
              texture: 'not specified',
              color: 'not specified',
              estimatedWeight: 'not specified'
            }
          }];
        }
      }

      console.log('[Food Logs API] Inserting food log into database:', {
        userId: req.user!.id,
        name: analyzedName, // Use the analyzed name here instead of original name
        componentsCount: processedComponents.length
      });

      // Insert the food log with detailed components and recipe fields
      const [mainLog] = await db
        .insert(foodLogs)
        .values({
          userId: req.user!.id,
          name: analyzedName, // Use the analyzed name here instead of original name
          calories: totalCalories.toString(),
          protein: totalProtein.toString(),
          carbs: totalCarbs.toString(),
          fat: totalFat.toString(),
          image: image || null,
          date: logDate,
          components: processedComponents,
          // Recipe fields (optional)
          description: description || null,
          ingredients: ingredients || null,
          instructions: instructions || null,
          prepTime: prepTime || null,
          cookTime: cookTime || null,
          servings: servings || 1,
          source: source || 'scanned',
          isRecipe: isRecipe || (!!(instructions && Array.isArray(instructions) && instructions.length > 0 && ingredients && Array.isArray(ingredients) && ingredients.length > 0)),
          cuisineType: cuisineType || null,
          mealType: mealType || null,
          difficulty: difficulty || null,
          tags: tags || null,
        })
        .returning();

      console.log('[Food Logs API] Food log inserted successfully:', {
        logId: mainLog.id,
        date: mainLog.date
      });

      // Calculate daily totals
      const startOfDay = new Date(logDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(startOfDay.getDate() + 1);

      console.log('[Food Logs API] Fetching daily totals for range:', {
        start: startOfDay.toISOString(),
        end: endOfDay.toISOString()
      });

      const dayLogs = await db
        .select()
        .from(foodLogs)
        .where(
          and(
            eq(foodLogs.userId, req.user!.id),
            sql`${foodLogs.date} >= ${startOfDay.toISOString()}`,
            sql`${foodLogs.date} < ${endOfDay.toISOString()}`
          )
        )
        .orderBy(desc(foodLogs.date));

      console.log('[Food Logs API] Retrieved day logs:', {
        count: dayLogs.length
      });

      const totals = dayLogs.reduce(
        (acc, log) => ({
          calories: acc.calories + Number(log.calories),
          protein: acc.protein + Number(log.protein),
          carbs: acc.carbs + Number(log.carbs),
          fat: acc.fat + Number(log.fat),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );

      console.log('[Food Logs API] Calculated daily totals:', totals);

      // Format response
      const response = {
        log: {
          ...mainLog,
          components: processedComponents
        },
        totals: {
          calories: Math.round(totals.calories),
          protein: Number(totals.protein.toFixed(1)),
          carbs: Number(totals.carbs.toFixed(1)),
          fat: Number(totals.fat.toFixed(1))
        }
      };

      console.log('[Food Logs API] Sending response:', {
        logId: response.log.id,
        componentsCount: response.log.components.length,
        totals: response.totals
      });

      res.json(response);
    } catch (error) {
      console.error('[Food Logs API] Error adding food log:', error);
      res.status(500).json({
        error: 'Failed to add food log',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // GET endpoint for food logs (updated with enhanced logging)
  app.get("/api/food-logs", requireAuth, async (req: AuthRequest, res: Response) => {
    try {

      const requestedDate = req.query.date ? new Date(req.query.date as string) : new Date();
      
      // Convert requested date string to YYYY-MM-DD format to normalize timezone issues
      const dateString = requestedDate.toISOString().split('T')[0];
      
      // Create date range for the requested day (UTC-agnostic)
      const startOfDay = new Date(`${dateString}T00:00:00.000Z`);
      const endOfDay = new Date(`${dateString}T23:59:59.999Z`);

      console.log('[Food Logs API] Fetching logs for date range:', {
        userId: req.user!.id,
        dateRequested: dateString,
        start: startOfDay.toISOString(),
        end: endOfDay.toISOString()
      });

      const logs = await db
        .select()
        .from(foodLogs)
        .where(
          and(
            eq(foodLogs.userId, req.user!.id),
            sql`${foodLogs.date} >= ${startOfDay.getTime()}`,
            sql`${foodLogs.date} < ${endOfDay.getTime()}`
          )
        )
        .orderBy(desc(foodLogs.date));

      console.log('[Food Logs API] Retrieved logs:', {
        count: logs.length,
        date: requestedDate.toISOString()
      });

      // Calculate totals from the logs
      const totals = logs.reduce(
        (acc, log) => ({
          calories: acc.calories + Number(log.calories),
          protein: acc.protein + Number(log.protein),
          carbs: acc.carbs + Number(log.carbs),
          fat: acc.fat + Number(log.fat),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );

      console.log('[Food Logs API] Calculated totals:', totals);

      res.json({
        logs,
        totals: {
          calories: Math.round(totals.calories),
          protein: Number(totals.protein.toFixed(1)),
          carbs: Number(totals.carbs.toFixed(1)),
          fat: Number(totals.fat.toFixed(1))
        }
      });
    } catch (error) {
      console.error('[Food Logs API] Error fetching food logs:', error);
      res.status(500).json({
        error: 'Failed to fetch food logs',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // PUT endpoint for updating food logs
  app.put("/api/food-logs/:id", requireAuth, async (req: AuthRequest, res: Response) => {
    try {

      const logId = parseInt(req.params.id);
      if (isNaN(logId)) {
        return res.status(400).json({ error: 'Invalid ID format' });
      }

      // Check if the food log exists and belongs to the user
      const [existingLog] = await db
        .select()
        .from(foodLogs)
        .where(
          and(
            eq(foodLogs.id, logId),
            eq(foodLogs.userId, req.user!.id)
          )
        )
        .limit(1);

      if (!existingLog) {
        return res.status(404).json({ error: 'Food log not found or access denied' });
      }

      const { 
        name, 
        calories, 
        protein, 
        carbs, 
        fat, 
        components,
        description,
        ingredients,
        instructions,
        prepTime,
        cookTime,
        servings,
        imageUrl,
        mealType,
        cuisineType,
        difficulty,
        tags
      } = req.body;
      
      console.log('[Food Logs API] Updating food log:', {
        logId,
        userId: req.user!.id,
        name,
        hasComponents: Array.isArray(components),
        hasIngredients: Array.isArray(ingredients),
        hasInstructions: Array.isArray(instructions)
      });

      // Ensure required fields are present
      if (!name || calories === undefined) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'Name and calories are required'
        });
      }

      // Build update object with all provided fields
      const updateData: Record<string, any> = {
        name,
        calories: parseFloat(calories) || 0,
        protein: parseFloat(protein) || 0,
        carbs: parseFloat(carbs) || 0,
        fat: parseFloat(fat) || 0,
      };

      // Only update optional fields if they are provided
      if (components !== undefined) updateData.components = components;
      if (description !== undefined) updateData.description = description;
      if (ingredients !== undefined) updateData.ingredients = ingredients;
      if (instructions !== undefined) updateData.instructions = instructions;
      if (prepTime !== undefined) updateData.prepTime = parseInt(prepTime) || null;
      if (cookTime !== undefined) updateData.cookTime = parseInt(cookTime) || null;
      if (servings !== undefined) updateData.servings = parseInt(servings) || 1;
      if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
      if (mealType !== undefined) updateData.mealType = mealType;
      if (cuisineType !== undefined) updateData.cuisineType = cuisineType;
      if (difficulty !== undefined) updateData.difficulty = difficulty;
      if (tags !== undefined) updateData.tags = tags;

      // Update the food log
      const [updatedLog] = await db
        .update(foodLogs)
        .set(updateData)
        .where(eq(foodLogs.id, logId))
        .returning();

      console.log('[Food Logs API] Food log updated successfully:', {
        logId: updatedLog.id,
        name: updatedLog.name
      });

      // Calculate daily totals for the updated day
      const logDate = new Date(existingLog.date);
      const startOfDay = new Date(logDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(startOfDay.getDate() + 1);

      const dayLogs = await db
        .select()
        .from(foodLogs)
        .where(
          and(
            eq(foodLogs.userId, req.user!.id),
            sql`${foodLogs.date} >= ${startOfDay.toISOString()}`,
            sql`${foodLogs.date} < ${endOfDay.toISOString()}`
          )
        )
        .orderBy(desc(foodLogs.date));

      const totals = dayLogs.reduce(
        (acc, log) => ({
          calories: acc.calories + Number(log.calories),
          protein: acc.protein + Number(log.protein),
          carbs: acc.carbs + Number(log.carbs),
          fat: acc.fat + Number(log.fat),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );

      // Format response
      const response = {
        log: updatedLog,
        totals: {
          calories: Math.round(totals.calories),
          protein: Number(totals.protein.toFixed(1)),
          carbs: Number(totals.carbs.toFixed(1)),
          fat: Number(totals.fat.toFixed(1))
        }
      };

      res.json(response);
    } catch (error) {
      console.error('[Food Logs API] Error updating food log:', error);
      res.status(500).json({
        error: 'Failed to update food log',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // DELETE endpoint for removing a food log
  app.delete("/api/food-logs/:id", requireAuth, async (req: AuthRequest, res: Response) => {
    try {

      const logId = parseInt(req.params.id);
      if (isNaN(logId)) {
        return res.status(400).json({ error: 'Invalid ID format' });
      }

      // Check if the food log exists and belongs to the user
      const [existingLog] = await db
        .select()
        .from(foodLogs)
        .where(
          and(
            eq(foodLogs.id, logId),
            eq(foodLogs.userId, req.user!.id)
          )
        )
        .limit(1);

      if (!existingLog) {
        return res.status(404).json({ error: 'Food log not found or access denied' });
      }

      // Delete the food log
      await db
        .delete(foodLogs)
        .where(eq(foodLogs.id, logId));

      console.log('[Food Logs API] Food log deleted successfully:', {
        logId
      });

      res.json({ success: true });
    } catch (error) {
      console.error('[Food Logs API] Error deleting food log:', error);
      res.status(500).json({
        error: 'Failed to delete food log',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get a specific food log by ID (for viewing meals from any day)
  app.get("/api/food-logs/:id", requireAuth, async (req: AuthRequest, res: Response) => {
    try {

      const logId = parseInt(req.params.id);
      if (isNaN(logId)) {
        return res.status(400).json({ error: 'Invalid ID format' });
      }

      // Find the specific food log by ID that belongs to the user
      const [foodLog] = await db
        .select()
        .from(foodLogs)
        .where(
          and(
            eq(foodLogs.id, logId),
            eq(foodLogs.userId, req.user!.id)
          )
        );

      if (!foodLog) {
        console.error('[Food Logs API] Food log not found or unauthorized:', { logId, userId: req.user!.id });
        return res.status(404).json({ error: 'Food log not found' });
      }

      console.log('[Food Logs API] Food log retrieved successfully:', {
        logId,
        date: foodLog.date
      });

      res.json(foodLog);
    } catch (error) {
      console.error('[Food Logs API] Error fetching food log by ID:', error);
      res.status(500).json({
        error: 'Failed to fetch food log',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Add meal image upload endpoint
  app.post("/api/food-logs/:id/image", requireAuth, async (req: AuthRequest, res: Response) => {
    try {

      const logId = parseInt(req.params.id);
      if (isNaN(logId)) {
        return res.status(400).json({ error: 'Invalid ID format' });
      }

      // Check if the food log exists and belongs to the user
      const [existingLog] = await db
        .select()
        .from(foodLogs)
        .where(
          and(
            eq(foodLogs.id, logId),
            eq(foodLogs.userId, req.user!.id)
          )
        );

      if (!existingLog) {
        console.error('[Food Logs API] Food log not found or unauthorized:', { logId, userId: req.user!.id });
        return res.status(404).json({ error: 'Food log not found' });
      }

      // Handle the file upload
      upload.single('image')(req, res, async function(err) {
        if (err) {
          console.error("[Food Logs API] Error during file upload:", err);
          return res.status(400).json({
            error: "Image upload failed",
            message: err.message
          });
        }

        if (!req.file) {
          return res.status(400).json({ error: "No image file uploaded" });
        }

        try {
          // Generate a unique filename
          const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
          const filename = `meal-${uniqueName}.jpg`;

          // Create uploads directory if it doesn't exist
          const uploadsDir = path.join(process.cwd(), 'uploads');
          await fs.mkdir(uploadsDir, { recursive: true });

          // Process and save the image using Sharp for optimization
          const filepath = path.join(uploadsDir, filename);
          await sharp(req.file.buffer)
            .resize({ width: 1200, height: 800, fit: 'inside' })
            .jpeg({ quality: 85 })
            .toFile(filepath);
          
          // Update the meal with the image URL
          const imageUrl = `/uploads/${filename}`;
          
          await db.update(foodLogs)
            .set({ image: imageUrl })
            .where(
              and(
                eq(foodLogs.id, logId),
                eq(foodLogs.userId, req.user!.id)
              )
            );

          console.log('[Food Logs API] Food log image uploaded successfully:', {
            logId,
            imageUrl
          });

          res.json({ 
            success: true, 
            imageUrl: imageUrl
          });
        } catch (error) {
          console.error("[Food Logs API] Error processing meal image:", error);
          res.status(500).json({ error: "Failed to process image" });
        }
      });
    } catch (error) {
      console.error("[Food Logs API] Error uploading meal image:", error);
      res.status(500).json({
        error: 'Failed to upload meal image',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Add the profile route to the existing routes
  app.get("/api/user/profile", requireAuth, async (req: AuthRequest, res: Response) => {
    try {

      // Get nutrition preferences (latest entry first)
      const preferences = await db
        .select()
        .from(userNutritionPreferences)
        .where(eq(userNutritionPreferences.userId, req.user!.id))
        .orderBy(desc(userNutritionPreferences.updatedAt))
        .limit(1);

      if (!preferences || preferences.length === 0) {
        return res.status(404).json({ error: "Profile not found" });
      }

      // Weight logging was removed for the MVP, so the profile is the only source
      // of truth for current weight.
      const profile = {
        ...preferences[0],
        latestWeightLog: null
      };
      
      res.json(profile);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  // Helper function to calculate calories using Mifflin-St Jeor equation
  const calculateDailyCaloriesServer = (
    age: number,
    weight: number,
    height: number,
    activityLevel: string,
    weightGoal: string,
    gender: string
  ): number => {
    // Mifflin-St Jeor: BMR = (10 × weight) + (6.25 × height) - (5 × age) + s
    // s = +5 for males, -161 for females
    const baseCalories = 10 * weight + 6.25 * height - 5 * age;
    const bmr = gender === 'male' ? baseCalories + 5 : baseCalories - 161;
    
    // Activity multipliers
    const activityMultipliers: Record<string, number> = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9
    };
    
    const tdee = bmr * (activityMultipliers[activityLevel] || 1.55);
    
    // Goal adjustments
    if (weightGoal === 'loss') {
      return Math.round(tdee - 500);
    } else if (weightGoal === 'gain') {
      return Math.round(tdee + 300);
    }
    return Math.round(tdee);
  };

  // Helper function to calculate macros based on goal
  const calculateMacrosServer = (dailyCalories: number, weightGoal: string) => {
    let proteinRatio: number, carbRatio: number, fatRatio: number;

    switch (weightGoal) {
      case 'loss':
        proteinRatio = 0.30;
        carbRatio = 0.35;
        fatRatio = 0.35;
        break;
      case 'gain':
        proteinRatio = 0.25;
        carbRatio = 0.45;
        fatRatio = 0.30;
        break;
      default:
        proteinRatio = 0.25;
        carbRatio = 0.40;
        fatRatio = 0.35;
    }

    return {
      protein: Math.round((dailyCalories * proteinRatio) / 4),
      carbs: Math.round((dailyCalories * carbRatio) / 4),
      fat: Math.round((dailyCalories * fatRatio) / 9),
      // Also return percentages for storage
      proteinPercentage: Math.round(proteinRatio * 100),
      carbsPercentage: Math.round(carbRatio * 100),
      fatPercentage: Math.round(fatRatio * 100),
    };
  };

  // Update user profile
  app.put("/api/user/profile", requireAuth, async (req: AuthRequest, res: Response) => {
    try {

      const { 
        height, 
        weight,
        currentWeight, // Support both weight and currentWeight
        age,
        goalWeight, 
        bodyFatPercentage, 
        bodyType,
        caloriesGoal,
        proteinGoal,
        carbsGoal,
        fatGoal,
        weightGoal,
        activityLevel
      } = req.body;
      
      // Use currentWeight if weight is not provided
      const weightValue = weight !== undefined ? weight : currentWeight;
      
      console.log("Received profile update request:", req.body);
      
      // Validate height (typical range 50-250 cm)
      if (height !== undefined && 
          (isNaN(Number(height)) || 
           Number(height) < 50 || 
           Number(height) > 250)) {
        return res.status(400).json({ error: "Height must be a number between 50 and 250 cm" });
      }
      
      // Validate weight (typical range 20-500 kg)
      if (weightValue !== undefined && 
          (isNaN(Number(weightValue)) || 
           Number(weightValue) < 20 || 
           Number(weightValue) > 500)) {
        return res.status(400).json({ error: "Weight must be a number between 20 and 500 kg" });
      }
      
      // Validate age (typical range 1-120 years)
      if (age !== undefined && 
          (isNaN(Number(age)) || 
           Number(age) < 1 || 
           Number(age) > 120)) {
        return res.status(400).json({ error: "Age must be a number between 1 and 120 years" });
      }
      
      // Body fat percentage validation removed - column doesn't exist yet

      // Find the user's nutrition preferences
      const preferences = await db
        .select()
        .from(userNutritionPreferences)
        .where(eq(userNutritionPreferences.userId, req.user!.id));

      if (!preferences || preferences.length === 0) {
        return res.status(404).json({ error: "User profile not found" });
      }

      // Convert gram values to percentages for storage
      let proteinPercentage = preferences[0].proteinGoal;
      let carbsPercentage = preferences[0].carbsGoal;
      let fatPercentage = preferences[0].fatGoal;
      
      const calories = caloriesGoal !== undefined ? caloriesGoal : preferences[0].caloriesGoal;
      
      if (proteinGoal !== undefined && calories) {
        // Convert grams to percentage: (grams * 4 calories/gram) / total calories * 100
        proteinPercentage = Math.round((proteinGoal * 4) / calories * 100);
      }
      
      if (carbsGoal !== undefined && calories) {
        // Convert grams to percentage: (grams * 4 calories/gram) / total calories * 100
        carbsPercentage = Math.round((carbsGoal * 4) / calories * 100);
      }
      
      if (fatGoal !== undefined && calories) {
        // Convert grams to percentage: (grams * 9 calories/gram) / total calories * 100
        fatPercentage = Math.round((fatGoal * 9) / calories * 100);
      }

      console.log("Converting grams to percentages:", { 
        proteinGrams: proteinGoal, proteinPercentage,
        carbsGrams: carbsGoal, carbsPercentage,
        fatGrams: fatGoal, fatPercentage,
        calories
      });

      // Determine final values for height and weight
      const finalHeight = height !== undefined ? Number(height) : Number(preferences[0].height);
      const finalWeight = weightValue !== undefined ? Number(weightValue) : Number(preferences[0].currentWeight);
      const finalAge = age !== undefined ? Number(age) : Number(preferences[0].age);
      const finalWeightGoal = weightGoal !== undefined ? weightGoal : preferences[0].weightGoal;
      const finalActivityLevel = activityLevel !== undefined ? activityLevel : preferences[0].activityLevel;
      
      // Check if we need to recalculate calories (height, weight, activity level, or weight goal changed)
      let finalCalories = calories;
      let finalProteinPercentage = proteinPercentage;
      let finalCarbsPercentage = carbsPercentage;
      let finalFatPercentage = fatPercentage;
      
      const needsRecalculation = (height !== undefined || weightValue !== undefined || 
                                   activityLevel !== undefined || weightGoal !== undefined ||
                                   age !== undefined) && 
                                  caloriesGoal === undefined;
      
      if (needsRecalculation) {
        // Height, weight, activity level, age, or weight goal changed - recalculate calories
        const gender = preferences[0].gender || 'male';
        
        console.log("Recalculating calories due to height/weight/age change:", {
          finalAge, finalWeight, finalHeight, finalActivityLevel, finalWeightGoal, gender
        });
        
        finalCalories = calculateDailyCaloriesServer(
          finalAge,
          finalWeight,
          finalHeight,
          finalActivityLevel || 'moderate',
          finalWeightGoal || 'maintain',
          gender
        );
        
        // Also recalculate macros
        const macros = calculateMacrosServer(finalCalories, finalWeightGoal || 'maintain');
        finalProteinPercentage = macros.proteinPercentage;
        finalCarbsPercentage = macros.carbsPercentage;
        finalFatPercentage = macros.fatPercentage;
        
        console.log("Recalculated nutrition goals:", {
          finalCalories,
          protein: macros.protein,
          carbs: macros.carbs,
          fat: macros.fat
        });
      }

      // Update the user's nutrition preferences
      const updatedPreferences = await db
        .update(userNutritionPreferences)
        .set({
          height: finalHeight,
          currentWeight: finalWeight,
          age: finalAge,
          goalWeight: goalWeight !== undefined ? goalWeight : preferences[0].goalWeight,
          // Add nutrition goal fields (stored as percentages)
          caloriesGoal: finalCalories,
          proteinGoal: finalProteinPercentage,
          carbsGoal: finalCarbsPercentage,
          fatGoal: finalFatPercentage,
          // Add weight goal and activity level
          weightGoal: finalWeightGoal,
          activityLevel: finalActivityLevel,
          // Add body analysis fields
          bodyFatPercentage: bodyFatPercentage !== undefined ? bodyFatPercentage : preferences[0].bodyFatPercentage,
          bodyType: bodyType !== undefined ? bodyType : preferences[0].bodyType,
          updatedAt: new Date(),
        })
        .where(eq(userNutritionPreferences.userId, req.user!.id))
        .returning();

      res.json(updatedPreferences[0]);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // Delete user account with full dependency cleanup
  app.delete("/api/user/account", requireAuth, async (req: AuthRequest, res: Response) => {

    const userId = req.user!.id;
    console.log(`[Account Deletion] Initiating deletion for user ${userId}`);

    try {
      // Delete user data in proper order to respect foreign key constraints

      // 1. Food logs reference recipes, so they go before recipes
      await db.delete(foodLogs).where(eq(foodLogs.userId, userId));
      await db.delete(userNutritionPreferences).where(eq(userNutritionPreferences.userId, userId));
      await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
      console.log('[Account Deletion] Deleted food logs, nutrition prefs, reset tokens');

      // 2. Delete user's own recipes
      await db.delete(recipes).where(eq(recipes.userId, userId));
      console.log('[Account Deletion] Deleted user recipes');

      // 3. Finally delete the user
      await db.delete(users).where(eq(users.id, userId));
      console.log('[Account Deletion] Deleted user row');

      // Revoke all refresh tokens after successful deletion
      try {
        const { revokeAllUserTokens } = await import('./utils/jwt');
        await revokeAllUserTokens(userId);
        console.log('[Account Deletion] Revoked all refresh tokens');
      } catch (err) {
        console.error('[Account Deletion] Token revocation error:', err);
      }

      res.json({ success: true, message: 'Account deleted successfully' });
    } catch (error) {
      console.error('[Account Deletion] Error:', error);
      res.status(500).json({
        error: 'Failed to delete account',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  //Remove duplicate onboarding endpoint.

  // Get current user
  app.get("/api/user", requireAuth, async (req: AuthRequest, res: Response) => {
    const user = await db.query.users.findFirst({
      where: eq(users.id, req.user!.id)
    });

    // Make sure both camelCase and snake_case versions are consistent
    if (user) {
      // Log the values for debugging
      console.log(`User ${user.id} onboarding status: ${user.hasCompletedOnboarding}`);
    }

    res.json(user);
  });


  // Create HTTP server
  const httpServer = createServer(app);
  return httpServer;
}