import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { isAuthenticated } from "./middleware/auth";
import { db } from "@db";
import {
  users,
  recipes,
  foodLogs,
  weightLogs,
  userNutritionPreferences,
  progressPhotos,
  notifications,
  badges,
  userBadges,
  recipeLikes,
  recipeComments,
  mealPlans,
  recipesInMealPlan,
  shoppingListItems,
  userDietaryPreferences,
  passwordResetTokens
} from "@db/schema";
import { eq, desc, and, sql, inArray, gte, lte, or, asc, count, sum, avg, between, isNull, isNotNull } from "drizzle-orm";

// Example user nutrition data for the API
const exampleUserData = {
  1: {
    goal: "lose",
    caloriesLeft: 750,
    proteinGoal: 120,
    carbsGoal: 150,
    fatGoal: 50
  },
  2: {
    goal: "gain",
    caloriesLeft: 1200,
    proteinGoal: 180,
    carbsGoal: 220,
    fatGoal: 70
  },
  3: {
    goal: "maintain",
    caloriesLeft: 450,
    proteinGoal: 140,
    carbsGoal: 180,
    fatGoal: 60
  }
};
import { registerMealPlanRoutes } from "./meal-plans.routes";
import { analyzeFoodImage, analyzeIngredientsWithOpenAI } from "./services/food-recognition";
import { analyzeFoodText } from "./services/openai";
import adminRoutes from "./routes/admin";
import { generateRecipe } from "./services/recipe-generation";
import { analyzeBodyComposition } from "./services/body-analysis";
// Removed slow optimized-meal-plan service, using fast template generator instead
// Removed budget-first-meal-plan service - using fast template system
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
import type { Request, Response, NextFunction } from 'express';
import aiRoutes from './routes/ai';
import authRoutes from './routes/auth';

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
  // Setup auth first
  setupAuth(app);

  // Setup static file serving for uploads
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
  
  // Register meal plan routes
  registerMealPlanRoutes(app);

  // Add onboarding completion endpoint
  app.post("/api/register/complete-onboarding", handleUpload, async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      console.log('Received onboarding request:', {
        body: req.body,
        file: req.file ? 'File received' : 'No file'
      });

      const profileData = JSON.parse(req.body.profile);
      const userId = req.user.id;

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

      // Update user preferences using Drizzle ORM for better safety
      await db.insert(userNutritionPreferences).values({
        userId: userId,
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
        experienceLevel: profileData.experienceLevel
      });
      
      console.log("User nutrition preferences inserted successfully");

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
            hasCompletedOnboarding: true, // Update the database field
            preferred_language: 'pl'
          })
          .where(eq(users.id, userId));
          
        console.log(`Updated user ${userId} with profile image, language: pl, and completed onboarding status`);
      } else {
        // Update hasCompletedOnboarding and language preference even without image
        await db.update(users)
          .set({ 
            hasCompletedOnboarding: true, // Update the database field
            preferred_language: 'pl'  
          })
          .where(eq(users.id, userId));
          
        console.log(`Updated user ${userId} language to: pl and completed onboarding status`);
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
  app.post("/api/user/profile-image", upload.single('image'), async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
      }

      const userId = req.user.id;
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

  // Register feature routes
  app.use('/api', aiRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);

  // Nutrition tracking data API endpoint
  app.get('/api/userdata/:userId', (req, res) => {
    const userId = req.params.userId;
    
    // Check if user data exists
    if (!exampleUserData[userId as unknown as keyof typeof exampleUserData]) {
      return res.status(404).json({
        error: 'User not found',
        message: 'No nutrition data found for the specified user ID'
      });
    }
    
    // Return the user's nutrition data
    res.json(exampleUserData[userId as unknown as keyof typeof exampleUserData]);
  });

  // Add logout endpoint
  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ error: 'Failed to logout' });
      }
      res.json({ ok: true });
    });
  });

  // Add food analysis endpoint
  app.post("/api/analyze-food", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { image } = req.body;
      if (!image) {
        return res.status(400).json({
          error: 'Missing image data',
          message: 'Image data is required for analysis'
        });
      }

      try {
        // Use OpenAI for food analysis
        console.log('Analyzing food with OpenAI...');
        const result = await analyzeFoodImage(image);
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
  app.post("/api/analyze-food-text", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { text } = req.body;
      if (!text || text.trim() === "") {
        return res.status(400).json({
          error: 'Missing text description',
          message: 'Food description text is required for analysis'
        });
      }

      try {
        console.log('Analyzing food text with OpenAI...', text);
        const result = await analyzeFoodText(text);
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
  app.post("/api/analyze-ingredients", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { image } = req.body;
      if (!image) {
        return res.status(400).json({
          error: 'Missing image data',
          message: 'Image data is required for analysis'
        });
      }

      // Clean up base64 string if needed
      let base64Image = image;
      if (base64Image.includes('data:image/')) {
        base64Image = base64Image.split(',')[1];
      }

      // Call the ingredient analysis service
      const result = await analyzeIngredientsWithOpenAI(base64Image);
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
  app.get("/api/recipes", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const type = req.query.type as string || 'created';
      
      console.log(`Fetching ${type} recipes for user ${req.user.id}`);
      
      // Get recipes based on type - using a more efficient query
      // Create a subquery to get liked recipe IDs first to avoid expensive EXISTS check
      const likedRecipeIds = await db
        .select({ id: recipeLikes.recipeId })
        .from(recipeLikes)
        .where(eq(recipeLikes.userId, req.user.id));
      
      // Create a Set for O(1) lookups
      const likedIds = new Set(likedRecipeIds.map(r => r.id));
      
      // Main query without the expensive EXISTS subquery
      const userRecipes = await db
        .select()
        .from(recipes)
        .where(
          and(
            eq(recipes.userId, req.user.id),
            type === 'saved' ? eq(recipes.source, 'saved') : eq(recipes.source, 'created')
          )
        )
        .orderBy(desc(recipes.createdAt))
        .limit(50); // Add limit to prevent too many records
      
      // Add isLiked property in JavaScript
      const userRecipesWithLikes = userRecipes.map(recipe => ({
        ...recipe,
        isLiked: likedIds.has(recipe.id)
      }));

      console.log(`Found ${userRecipesWithLikes.length} ${type} recipes`);
      res.json(userRecipesWithLikes);
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
  app.post("/api/recipes", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { name, description, calories, protein, carbs, fat, ingredients, instructions, isPublic, imageUrl } = req.body;

      // Create the recipe in the database (only columns that exist in schema)
      const [newRecipe] = await db
        .insert(recipes)
        .values({
          userId: req.user.id,
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
          source: 'created',
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

  // Get favorite recipes
  app.get("/api/recipes/favorites", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Get recipes marked as favorite by the user
      const userRecipes = await db.select({
        id: recipes.id,
        name: recipes.name,
        description: recipes.description,
        imageUrl: recipes.imageUrl,
        likesCount: recipes.likesCount,
      })
        .from(recipes)
        .where(
          and(
            eq(recipes.userId, req.user.id),
            eq(recipes.isPublic, true)
          )
        )
        .orderBy(desc(recipes.likesCount))
        .limit(4);

      res.json(userRecipes);
    } catch (error) {
      console.error('Error fetching favorite recipes:', error);
      res.status(500).json({
        error: 'Failed to fetch favorite recipes',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get recent meals
  app.get("/api/food-logs/recent", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Get recent food logs
  const recentLogs = await db.select({
        id: foodLogs.id,
        name: foodLogs.name,
        imageUrl: foodLogs.image,
        date: foodLogs.date,
      })
        .from(foodLogs)
        .where(eq(foodLogs.userId, req.user.id))
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

  // Get global top recipes sorted by likes
  app.get("/api/recipes/top", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Get public recipes sorted by likes with like status
      const topRecipes = await db
        .select({
          id: recipes.id,
          userId: recipes.userId,
          name: recipes.name,
          description: recipes.description,
          ingredients: recipes.ingredients,
          instructions: recipes.instructions,
          nutritionInfo: recipes.nutritionInfo,
          createdAt: recipes.createdAt,
          updatedAt: recipes.updatedAt,
          imageUrl: recipes.imageUrl,
          rating: recipes.rating,
          likesCount: recipes.likesCount,
          commentsCount: recipes.commentsCount,
          isPublic: recipes.isPublic,
          isSaved: recipes.isSaved,
          source: recipes.source,
          originalRecipeId: recipes.originalRecipeId,
          isLiked: sql`EXISTS(
            SELECT 1 FROM ${recipeLikes} 
            WHERE ${recipeLikes.recipeId} = ${recipes.id} 
            AND ${recipeLikes.userId} = ${req.user.id}
          )`,
        })
        .from(recipes)
        .where(eq(recipes.isPublic, true))
        .orderBy(desc(recipes.likesCount))
        .limit(10);

      res.json(topRecipes);
    } catch (error) {
      console.error('Error fetching top recipes:', error);
      res.status(500).json({
        error: 'Failed to fetch top recipes',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Add liked recipes endpoint
  app.get("/api/recipes/liked", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Get recipes liked by the user
      const likedRecipes = await db
        .select({
          id: recipes.id,
          name: recipes.name,
          description: recipes.description,
          imageUrl: recipes.imageUrl,
          likesCount: recipes.likesCount,
        })
        .from(recipes)
        .innerJoin(recipeLikes, and(eq(recipeLikes.recipeId, recipes.id), eq(recipeLikes.userId, req.user.id)))
        .orderBy(desc(recipes.likesCount))
        .limit(10);

      res.json(likedRecipes);
    } catch (error) {
      console.error('Error fetching liked recipes:', error);
      res.status(500).json({
        error: 'Failed to fetch liked recipes',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "healthy" });
  });

  // Recipe generation endpoint - UPDATED
  app.post("/api/generate-recipe", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { ingredients } = req.body;
      if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
        return res.status(400).json({ error: 'Missing required fields. Please provide at least one ingredient.' });
      }

      // Call the OpenAI recipe generation service
  const generatedRecipe = await generateRecipe(ingredients, { difficulty: 'Medium', timeNeeded: 30, flavor: 'Mixed' });

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
  app.post("/api/generate-recipes", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Authentication required' });
      }

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
      
      // Get the user's preferred language
      const userId = req.user.id;
      const userProfileResult = await db.query.users.findFirst({
        where: eq(users.id, userId)
      });
      
      // Extract language preference, defaulting to Polish
      const language = 'pl';
      console.log(`User language preference for recipes: ${language}`);
      
      // Map the client preferences to what the API expects
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
        language: language
      };

      console.log('Using preferences:', recipePreferences);
      console.log('Additional notes:', notes || 'None provided');
      
      // Use custom prompt if provided, or create one that includes notes
      const customPrompt = prompt || (notes ? `Consider these preparation notes when creating recipes: ${notes}` : undefined);

      try {
        // Generate recipe using OpenAI with preferences
        const result = await generateRecipe(ingredientNames, recipePreferences, customPrompt);
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

  // Create sample recipes
  app.post("/api/sample-recipes", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const sampleRecipes = [
        {
          name: "High-Protein Breakfast Bowl",
          description: "A nutritious breakfast bowl perfect for muscle recovery and energy",
          ingredients: [
            "2 large eggs",
            "1 cup quinoa",
            "1 avocado",
            "Cherry tomatoes",
            "Baby spinach",
            "Extra virgin olive oil",
            "Salt and pepper"
          ],
          instructions: [
            "Cook quinoa according to package instructions",
            "Poach eggs until whites are set",
            "Slice avocado and tomatoes",
            "Arrange quinoa, eggs, avocado, tomatoes, and spinach in a bowl",
            "Drizzle with olive oil", 
            "Season with salt and pepper"
          ],
          nutritionInfo: {
            calories: 450,
            protein: 20,
            carbs: 35,
            fat: 28
          },
          isPublic: true,
          imageUrl: "https://images.unsplash.com/photo-1607532941433-304659e8198a?w=800&auto=format&fit=crop"
        },
        {
          name: "Mediterranean Chicken Salad",
          description: "Light and fresh salad with lean protein",
          ingredients: [
            "200g chicken breast",
            "Mixed greens",
            "Cherry tomatoes",
            "Cucumber",
            "Feta cheese",
            "Olive oil",
            "Balsamic vinegar"
          ],
          instructions: [
            "Grill chicken",
            "Chop vegetables",
            "Mix ingredients",
            "Dress and serve"
          ],
          nutritionInfo: {
            calories: 420,
            protein: 35,
            carbs: 15,
            fat: 25
          },
          isPublic: true,
          imageUrl: "https://images.unsplash.com/photo-1512852939750-1305098529bf?w=800&auto=format&fit=crop"
        }
      ];

      const createdRecipes = await Promise.all(
        sampleRecipes.map(recipe =>
          db.insert(recipes).values({
            ...recipe,
            userId: req.user.id,
            likesCount: 0,
            commentsCount: 0,
          }).returning()
        )
      );

      res.json(createdRecipes.map(([recipe]) => recipe));
    } catch (error) {
      console.error('Error creating sample recipes:', error);
      res.status(500).json({
        error: 'Failed to create sample recipes',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Add sample sandwich recipe
  app.post("/api/add-sandwich-recipe", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const sandwichRecipe = {
        name: "Swiss Cheese and Ham Open Sandwich",
        description: "An appetizing, simplistic open sandwich layered with lean ham and melted Swiss cheese over a crusty piece of bread, served with a light spread of mayonnaise.",
        ingredients: [
          "2 slices of whole grain bread",
          "4 slices of Swiss cheese",
          "4 slices of lean ham",
          "2 tablespoons of low-fat mayonnaise",
          "1 tablespoon of olive oil",
          "1 pinch of salt",
          "1 pinch of pepper"
        ],
        instructions: [
          "Preheat the oven to 200°C (400°F).",
          "Spread the mayonnaise evenly on one side of each bread slice.",
          "Place the slices of ham on top of the mayonnaise.",
          "Layer the Swiss cheese slices on top of the ham.",
          "Drizzle with olive oil and season with salt and pepper.",
          "Place in the preheated oven for 5-7 minutes or until cheese is melted.",
          "Serve hot."
        ],
        nutritionInfo: {
          calories: 450,
          protein: 28,
          carbs: 35,
          fat: 22
        },
        isPublic: true,
        likesCount: 0,
        commentsCount: 0
      };

      const [savedRecipe] = await db
        .insert(recipes)
        .values({
          ...sandwichRecipe,
          userId: req.user.id,
        })
        .returning();

      res.json(savedRecipe);
    } catch (error) {
      console.error('Error adding sandwich recipe:', error);
      res.status(500).json({
        error: 'Failed to add sandwich recipe',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });


  // Update the get progress photos endpoint
  app.get("/api/progress-photos", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      console.log('Fetching progress photos for user:', req.user.id);

      const photos = await db
        .select()
        .from(progressPhotos)
        .where(eq(progressPhotos.userId, req.user.id))
        .orderBy(desc(progressPhotos.createdAt));

      console.log('Found photos in database:', {
        count: photos.length,
        photoUrls: photos.map(p => p.photoUrl),
        types: photos.map(p => p.type)
      });

      // Check if user uploaded a photo today
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const todayPhoto = photos.find(p => p.photoDate === today);
      
      console.log('Today check:', {
        today,
        hasUploadedToday: !!todayPhoto,
        todayPhotoId: todayPhoto?.id
      });

      res.json({
        photos,
        hasUploadedToday: !!todayPhoto,
        todayPhoto: todayPhoto || null
      });
    } catch (error) {
      console.error('Error fetching progress photos:', error);
      res.status(500).json({
        error: 'Failed to fetch progress photos',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Update the progress photos POST endpoint - removed handleUpload middleware since we're handling base64 directly
  app.post("/api/progress-photos", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        console.log('Authentication failed for progress photo upload');
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Check if user already uploaded a photo today
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const existingTodayPhoto = await db
        .select()
        .from(progressPhotos)
        .where(
          and(
            eq(progressPhotos.userId, req.user.id),
            eq(progressPhotos.photoDate, today)
          )
        )
        .limit(1);

      if (existingTodayPhoto && existingTodayPhoto.length > 0) {
        console.log('User already uploaded a photo today:', existingTodayPhoto[0].id);
        return res.status(400).json({ 
          error: 'Daily limit reached',
          message: 'You can only upload one photo per day. Please use the replace endpoint to update today\'s photo.',
          existingPhotoId: existingTodayPhoto[0].id
        });
      }

      console.log('Received progress photo request:', {
        hasPhoto: !!req.body.photo,
        type: req.body.type,
        bodyKeys: Object.keys(req.body),
        bodyPhotoLength: req.body.photo ? req.body.photo.length : 0,
        authStatus: req.isAuthenticated(),
        userId: req.user.id
      });

      let imageUrl: string | null = null;

      // Handle base64 image from request body
      if (req.body.photo) {
        try {
          const base64Data = req.body.photo.replace(/^data:image\/\w+;base64,/, '');
          const buffer = Buffer.from(base64Data, 'base64');

          // Create uploads directory if it doesn't exist
          const uploadsDir = path.join(process.cwd(), 'uploads');
          await fs.mkdir(uploadsDir, { recursive: true });

          // Generate unique filename
          const filename = `progress-${req.user.id}-${Date.now()}.jpg`;
          const filepath = path.join(uploadsDir, filename);

          console.log(`Saving photo for user ${req.user.id} to ${filepath}`);

          // Process and save image
          await sharp(buffer)
            .resize(800, 800, {
              fit: 'inside',
              withoutEnlargement: true
            })
            .jpeg({ quality: 90 })
            .toFile(filepath);

          imageUrl = `/uploads/${filename}`;
          console.log('Successfully saved image to filesystem:', imageUrl);
        } catch (err) {
          console.error('Error processing image:', err);
          throw new Error('Failed to process image: ' + (err instanceof Error ? err.message : String(err)));
        }
      }

      if (!imageUrl) {
        console.error('No image URL generated, invalid image data');
        return res.status(400).json({ error: 'No valid image provided' });
      }

      try {
        // Insert new progress photo with today's date
        console.log(`Inserting photo record for user ${req.user.id} with URL ${imageUrl}`);
        
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        
        const [photo] = await db
          .insert(progressPhotos)
          .values({
            userId: req.user.id,
            photoUrl: imageUrl,
            type: req.body.type || 'latest',
            caption: req.body.caption || null,
            photoDate: today,
            createdAt: new Date()
          })
          .returning();

        console.log('Successfully saved progress photo to database:', photo);
        
        // Verify the record was created by checking the database
        const savedPhotos = await db
          .select()
          .from(progressPhotos)
          .where(eq(progressPhotos.userId, req.user.id))
          .orderBy(desc(progressPhotos.createdAt))
          .limit(1);
          
        console.log('Latest photo in database:', savedPhotos[0] || 'No photo found');
        
        res.json(photo);
      } catch (dbError) {
        console.error('Database error while saving photo:', dbError);
        throw new Error('Database error: ' + (dbError instanceof Error ? dbError.message : String(dbError)));
      }
    } catch (error) {
      console.error('Error uploading progress photo:', error);
      res.status(500).json({
        error: 'Failed to upload progress photo',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });

  // Add the new PUT endpoint for updating photo type
  app.put("/api/progress-photos/type", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { photoUrl, type } = req.body;

      if (!photoUrl || !type) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'Photo URL and type are required'
        });
      }

      // Validate photo type
      if (!['latest', 'favorite', 'first', 'progress-now'].includes(type)) {
        return res.status(400).json({
          error: 'Invalid photo type',
          message: 'Type must be one of: latest, favorite, first, progress-now'
        });
      }

      // Update the photo type
      await db
        .update(progressPhotos)
        .set({ type })
        .where(
          and(
            eq(progressPhotos.userId, req.user.id),
            eq(progressPhotos.photoUrl, photoUrl)
          )
        );

      res.json({ success: true });
    } catch (error) {
      console.error('Error updating photo type:', error);
      res.status(500).json({
        error: 'Failed to update photo type',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Replace progress photo endpoint - for updating today's photo
  app.put("/api/progress-photos/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        console.log('Authentication failed for progress photo replacement');
        return res.status(401).json({ error: 'Authentication required' });
      }

      const photoId = parseInt(req.params.id);
      if (isNaN(photoId)) {
        return res.status(400).json({ error: 'Invalid photo ID' });
      }

      console.log('Received photo replacement request:', {
        photoId,
        hasPhoto: !!req.body.photo,
        userId: req.user.id
      });

      // Verify the photo belongs to the user
      const existingPhoto = await db
        .select()
        .from(progressPhotos)
        .where(
          and(
            eq(progressPhotos.id, photoId),
            eq(progressPhotos.userId, req.user.id)
          )
        )
        .limit(1);

      if (!existingPhoto || existingPhoto.length === 0) {
        return res.status(404).json({ error: 'Photo not found or unauthorized' });
      }

      const oldPhotoUrl = existingPhoto[0].photoUrl;
      let newImageUrl: string | null = null;

      // Handle base64 image from request body
      if (req.body.photo) {
        try {
          const base64Data = req.body.photo.replace(/^data:image\/\w+;base64,/, '');
          const buffer = Buffer.from(base64Data, 'base64');

          // Create uploads directory if it doesn't exist
          const uploadsDir = path.join(process.cwd(), 'uploads');
          await fs.mkdir(uploadsDir, { recursive: true });

          // Generate unique filename
          const filename = `progress-${req.user.id}-${Date.now()}.jpg`;
          const filepath = path.join(uploadsDir, filename);

          console.log(`Saving replacement photo for user ${req.user.id} to ${filepath}`);

          // Process and save image
          await sharp(buffer)
            .resize(800, 800, {
              fit: 'inside',
              withoutEnlargement: true
            })
            .jpeg({ quality: 90 })
            .toFile(filepath);

          newImageUrl = `/uploads/${filename}`;
          console.log('Successfully saved replacement image to filesystem:', newImageUrl);
        } catch (err) {
          console.error('Error processing replacement image:', err);
          throw new Error('Failed to process image: ' + (err instanceof Error ? err.message : String(err)));
        }
      }

      if (!newImageUrl) {
        console.error('No image URL generated, invalid image data');
        return res.status(400).json({ error: 'No valid image provided' });
      }

      // Update the photo record
      const [updatedPhoto] = await db
        .update(progressPhotos)
        .set({
          photoUrl: newImageUrl,
          caption: req.body.caption || existingPhoto[0].caption,
          type: req.body.type || existingPhoto[0].type,
          // Keep the same photoDate - we're just replacing today's photo
        })
        .where(
          and(
            eq(progressPhotos.id, photoId),
            eq(progressPhotos.userId, req.user.id)
          )
        )
        .returning();

      // Delete old photo file if it exists in uploads directory
      if (oldPhotoUrl.startsWith('/uploads/')) {
        try {
          const oldFilepath = path.join(process.cwd(), oldPhotoUrl);
          await fs.unlink(oldFilepath);
          console.log(`Deleted old photo file: ${oldFilepath}`);
        } catch (err) {
          console.error('Error deleting old photo file:', err);
          // Don't fail the request if file deletion fails
        }
      }

      console.log('Successfully replaced progress photo:', updatedPhoto);
      res.json(updatedPhoto);
    } catch (error) {
      console.error('Error replacing progress photo:', error);
      res.status(500).json({
        error: 'Failed to replace progress photo',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Delete progress photo endpoint
  app.delete("/api/progress-photos", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { photoUrl } = req.body;

      if (!photoUrl) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'Photo URL is required'
        });
      }

      console.log(`Deleting photo: ${photoUrl} for user: ${req.user.id}`);

      // Delete the photo record from database
      const deleteResult = await db
        .delete(progressPhotos)
        .where(
          and(
            eq(progressPhotos.userId, req.user.id),
            eq(progressPhotos.photoUrl, photoUrl)
          )
        )
        .returning();

      // Only attempt to delete the file if it's a local path in the uploads directory
      if (photoUrl.startsWith('/uploads/')) {
        try {
          const filepath = path.join(process.cwd(), photoUrl);
          console.log(`Attempting to delete physical file at: ${filepath}`);
          
          // Check if file exists before deleting
          const fileExists = await fs.access(filepath).then(() => true).catch(() => false);
          
          if (fileExists) {
            await fs.unlink(filepath);
            console.log(`Physical file deleted: ${filepath}`);
          } else {
            console.log(`File not found at: ${filepath}, skipping physical deletion`);
          }
        } catch (fileError) {
          console.error('Error deleting physical file:', fileError);
          // Continue even if file deletion fails - we want to remove the database record
        }
      }

      res.json({ 
        success: true, 
        message: 'Photo deleted successfully', 
        deletedCount: deleteResult.length 
      });
    } catch (error) {
      console.error('Error deleting photo:', error);
      res.status(500).json({
        error: 'Failed to delete photo',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Body composition analysis endpoint
  // SAFETY NOTE: This endpoint provides health and medical recommendations 
  // with proper citations from authoritative sources (WHO, CDC, ACE, NIH)
  app.post("/api/analyze-body", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { imageBase64, weight, height, gender, age } = req.body;
      
      console.log('Body analysis request received:', {
        hasImageBase64: !!imageBase64,
        imageBase64Length: imageBase64?.length || 0,
        weight,
        height,
        gender,
        age
      });
      
      if (!imageBase64 || weight === undefined || weight === null || height === undefined || height === null) {
        console.log('Missing required fields:', { 
          imageBase64: !!imageBase64, 
          weight, 
          height 
        });
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'Image data, weight, and height are required for analysis'
        });
      }

      // Check if the base64 string is longer than 1MB, compress it
      let processedImage = imageBase64;
      if (imageBase64.length > 1024 * 1024) {
        // Extract the MIME type from the base64 string
        const mimeMatch = imageBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/);
        if (mimeMatch && mimeMatch.length > 1) {
          const mimeType = mimeMatch[1];
          const base64Data = imageBase64.replace(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/, '');
          const buffer = Buffer.from(base64Data, 'base64');
          
          // Use sharp to resize and compress the image
          const resizedBuffer = await sharp(buffer)
            .resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 75 })
            .toBuffer();
          
          // Convert back to base64
          processedImage = `data:${mimeType};base64,${resizedBuffer.toString('base64')}`;
          console.log('Image compressed from', 
            Math.round(imageBase64.length / 1024), 'KB to', 
            Math.round(processedImage.length / 1024), 'KB');
        }
      }

      // Set cache control headers
      res.set('Cache-Control', 'private, max-age=3600');

      // Call the body composition analysis service
      const result = await analyzeBodyComposition(
        processedImage, 
        parseFloat(weight), 
        parseFloat(height), 
        gender || 'male',
        age || 30
      );

      console.log('Body analysis result:', {
        bodyType: result.bodyType,
        confidence: result.confidence
      });

      // Return the complete analysis
      res.json(result);
    } catch (error) {
      console.error('Body analysis error:', error);
      res.status(500).json({
        error: 'Body analysis failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });

  // Get user's badges
  app.get("/api/user/badges", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const userBadgesData = await db
        .select({
          id: badges.id,
          name: badges.name,
          description: badges.description,
          icon: badges.icon,
          earnedAt: userBadges.earnedAt,
        })
        .from(userBadges)
        .innerJoin(badges, eq(userBadges.badgeId, badges.id))
        .where(eq(userBadges.userId, req.user.id))
        .orderBy(desc(userBadges.earnedAt))
        .limit(10);

      res.json(userBadgesData);
    } catch (error) {
      console.error('Error fetching badges:', error);
      res.status(500).json({
        error: 'Failed to fetch badges',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get user's notifications
  app.get("/api/notifications", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const userNotifications = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, req.user.id))
        .orderBy(desc(notifications.createdAt))
        .limit(20);

      res.json(userNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({
        error: 'Failed to fetch notifications',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Mark notification as read
  app.post("/api/notifications/:id/read", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const notificationId = parseInt(req.params.id);

      const [notification] = await db
        .select()
        .from(notifications)
        .where(and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, req.user.id)
        ))
        .limit(1);

      if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
      }

      await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.id, notificationId));

      res.json({ ok: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({
        error: 'Failed to mark notification as read',
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
  app.delete("/api/recipes/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const recipeId = parseInt(req.params.id);
      if (isNaN(recipeId)) {
        return res.status(400).json({ error: 'Invalid recipe ID' });
      }

      // First verify the recipe belongs to the user
      const recipe = await db.query.recipes.findFirst({
        where: and(
          eq(recipes.id, recipeId),
          eq(recipes.userId, req.user.id)
        )
      });

      if (!recipe) {
        return res.status(404).json({ error: 'Recipe not found or not authorized to delete it' });
      }

      // Delete the recipe
      await db.delete(recipes).where(eq(recipes.id, recipeId));

      console.log(`Recipe ${recipeId} deleted by user ${req.user.id}`);
      res.json({ success: true, message: 'Recipe deleted successfully' });
    } catch (error) {
      console.error('Error deleting recipe:', error);
      res.status(500).json({
        error: 'Failed to delete recipe',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.put("/api/recipes/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Authentication required' });
      }

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
            eq(recipes.userId, req.user.id)
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

  // Get meal plan generation progress
  app.get("/api/meal-plans/progress", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { getMealPlanProgress } = await import('./services/meal-plan-progress');
      const progress = getMealPlanProgress(req.user.id);

      if (!progress) {
        return res.json({ 
          inProgress: false,
          message: 'No generation in progress'
        });
      }

      res.json({
        inProgress: !progress.completed,
        step: progress.step,
        currentDay: progress.currentDay,
        totalDays: progress.totalDays,
        message: progress.message,
        timestamp: progress.timestamp
      });
    } catch (error) {
      console.error('Error fetching progress:', error);
      res.status(500).json({ error: 'Failed to fetch progress' });
    }
  });

  // Create meal plan endpoint - UPDATED with AI-generated personalized meal plans
  app.post("/api/meal-plans", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Check if this is a request to replace an existing meal plan
      const { targetDate, replaceExisting } = req.body;
      
      if (replaceExisting && targetDate) {
        // This is a request to replace a meal plan for a specific date
        try {
          // Find the existing meal plan
          const [existingPlan] = await db
            .select()
            .from(mealPlans)
            .where(
              and(
                eq(mealPlans.userId, req.user.id),
                eq(mealPlans.date, targetDate)
              )
            );
          
          if (existingPlan) {
            // First, find all recipes associated with this meal plan
            const recipesInPlan = await db
              .select()
              .from(recipesInMealPlan)
              .where(eq(recipesInMealPlan.mealPlanId, existingPlan.id));
            
            // Delete the meal plan's association with recipes
            if (recipesInPlan.length > 0) {
              await db
                .delete(recipesInMealPlan)
                .where(eq(recipesInMealPlan.mealPlanId, existingPlan.id));
            }
            
            // Generate a new meal plan for this date using the OpenAI service
            console.log("Generating a new AI-based meal plan for replacement...");
            
            const userPrefs = await db
              .select()
              .from(userDietaryPreferences)
              .where(eq(userDietaryPreferences.userId, req.user.id));
            
            const userProfile = await db
              .select()
              .from(users)
              .where(eq(users.id, req.user.id))
              .leftJoin(
                userNutritionPreferences,
                eq(userNutritionPreferences.userId, users.id)
              );
              
            // Extract user preferences
            const dietaryType = userPrefs[0]?.dietaryType || "balanced";
            const calorieTarget = userProfile[0]?.user_nutrition_preferences?.caloriesGoal || 2000;
            const allergies = userPrefs[0]?.allergies || [];
            const excludedIngredients = userPrefs[0]?.excludedIngredients || [];
            const preferredIngredients = userPrefs[0]?.preferredIngredients || [];
            // Remove references to non-existent properties
            const mealsPerDay = 3;
            const maxCookingTime = userPrefs[0]?.maxCookingTime || 30;
            const budgetPreference = userPrefs[0]?.budgetPreference || "medium";
            
            let generatedMealData;
            
            // Generate fast meal plan using template system
            try {
              const { generateFastMealPlan } = await import('./services/fast-meal-generator');
              
              // Get user language preference (from joined query)
              // Debug the full structure to understand where the language preference is stored
              console.log("User profile full structure for language determination:", JSON.stringify(userProfile[0], null, 2));
              
              // Access language from the correct path, handling both possible structures 
              // (with or without join, depending on query type)
              let language = 'pl';
              console.log("Using Polish language for meal plan generation:", language);
              
              console.log(`Generating meal plan replacement in language: ${language}`);
              
              const fastMealPlan = await generateFastMealPlan({
                dietaryType,
                calorieTarget,
                mealsPerDay,
                allergies,
                excludedIngredients,
                maxCookingTime,
                budgetPreference,
                preferredIngredients,
                language: 'pl'
              });
              
              // Use generated meal data
              generatedMealData = fastMealPlan.meals || [];
              console.log(`Generated ${generatedMealData.length} fast meals for replacement plan on ${targetDate}`);
            
            } catch (error) {
              console.error("Failed to generate fast meal plan for replacement:", error);
              throw new Error("Unable to generate meal plan with fast template system");
            }
            
            // Define meal types (include all potential meal types for 5 meals per day)
            const mealTypes = ["breakfast", "morning_snack", "lunch", "afternoon_snack", "dinner"];
            
            // Make sure we have one meal for each meal type
            const mealData = mealTypes.map(mealType => {
              // Find a meal of this type
              const matchingMeal = generatedMealData.find(m => m.mealType.toLowerCase() === mealType);
              
              if (matchingMeal) {
                return {
                  name: matchingMeal.name,
                  mealType: mealType,
                  recipe: matchingMeal.recipe
                };
              } else {
                // If we don't have a meal for this specific type, use another one
                // This should be rare since our AI prompt specifies meal types
                const anyMeal = generatedMealData[0];
                return {
                  name: `${anyMeal.name} (${mealType})`,
                  mealType: mealType,
                  recipe: anyMeal.recipe
                };
              }
            });
            
            // Create recipes and associate with meal plan
            let totalDailyCalories = 0;
            const createdRecipes = await Promise.all(
              mealData.map(async (mealInfo, index) => {
                // Store both ingredients and instructions as arrays
                const recipeData = {
                  userId: req.user.id,
                  name: mealInfo.name,
                  ingredients: Array.isArray(mealInfo.recipe?.ingredients) ? mealInfo.recipe.ingredients : [],
                  instructions: Array.isArray(mealInfo.recipe?.instructions) ? mealInfo.recipe.instructions : [],
                  nutritionInfo: mealInfo.recipe?.nutritionInfo ? {
                    calories: Number(mealInfo.recipe.nutritionInfo.calories) || 0,
                    protein: Number(mealInfo.recipe.nutritionInfo.protein) || 0,
                    carbs: Number(mealInfo.recipe.nutritionInfo.carbs) || 0,
                    fat: Number(mealInfo.recipe.nutritionInfo.fat) || 0,
                  } : undefined,
                  isPublic: false,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  imageUrl: getRecipeImageUrl(mealInfo.name, mealInfo.mealType)
                };
                
                // Add calories to total
                totalDailyCalories += mealInfo.recipe.nutritionInfo.calories;
                
                const [newRecipe] = await db.insert(recipes).values(recipeData).returning();
                
                // Associate recipe with meal plan
                await db.insert(recipesInMealPlan).values({
                  mealPlanId: existingPlan.id, // Using camelCase to match the schema
                  recipeId: newRecipe.id, // Using camelCase to match the schema
                  mealType: mealInfo.mealType, // Using camelCase to match the schema
                  servingSize: "1.00", // Default serving size
                  order: 0, // Default order
                  created_at: new Date()
                });
                
                return { 
                  ...newRecipe, 
                  mealType: mealInfo.mealType,
                  recipe: {
                    ingredients: mealInfo.recipe.ingredients,
                    instructions: mealInfo.recipe.instructions,
                    prepTime: mealInfo.recipe.prepTime,
                    nutritionInfo: mealInfo.recipe.nutritionInfo
                  }
                };
              })
            );
            
            // Update the meal plan with the total calories
            await db.update(mealPlans)
              .set({ totalCalories: totalDailyCalories })
              .where(eq(mealPlans.id, existingPlan.id));
            
            // Return the new meal plan data
            return res.json({
              id: existingPlan.id,
              date: targetDate,
              totalCalories: totalDailyCalories,
              status: existingPlan.status,
              meals: createdRecipes
            });
          } else {
            return res.status(404).json({ error: 'No meal plan found for the specified date' });
          }
        } catch (error) {
          console.error('Error replacing meal plan:', error);
          return res.status(500).json({ error: 'Failed to replace meal plan' });
        }
      }
      
      // Get user preferences from request body for normal meal plan creation
      const {
        dietaryType,
        calorieTarget,
        mealsPerDay,
        maxCookingTime,
        budgetPreference,
        allergies,
        excludedIngredients,
        preferredIngredients,
        healthGoals,
        cuisinePreferences,
        cookingSkillLevel,
        mealPlanDuration,
        weekdayVsWeekend,
        cookingEquipment,
        specialRequirements
      } = req.body;
      
      console.log('Received meal plan request with preferences:', { 
        dietaryType, 
        calorieTarget, 
        mealsPerDay,
        maxCookingTime, 
        budgetPreference,
        mealPlanDuration,
        healthGoals: healthGoals?.length || 0,
        cuisinePreferences: cuisinePreferences?.length || 0
      });

      // Get user profile to access language preference
      const userProfile = await db
        .select()
        .from(users)
        .where(eq(users.id, req.user.id));
      
      // Always use English for meal plan generation
      const language = 'en';
      
      console.log(`Generating meal plan in English`);
      
      // Determine duration in days first
      const durationDays = mealPlanDuration === '3days' ? 3 :
                           mealPlanDuration === 'week' ? 7 : 
                           mealPlanDuration === 'twoWeeks' ? 14 : 7; // Default to 7 days for a full week

      // Generate fast weekly meal plans using template system (much faster than OpenAI)
      let mealPlanData;
      try {
        const { generateFastPersonalizedMealPlan } = await import('./services/fast-meal-generator');
        
        console.log(`Generating FAST personalized meal plan with ${durationDays} days`);
        
        // Get actual user dietary preferences  
        const userDietPrefs = await db
          .select()
          .from(userDietaryPreferences)
          .where(eq(userDietaryPreferences.userId, req.user.id))
          .orderBy(desc(userDietaryPreferences.updatedAt))
          .limit(1);
          
        const actualPrefs = userDietPrefs[0] || {};
        
        // Helper to ensure array type
        const ensureArray = (value: any) => Array.isArray(value) ? value : [];
        
        // Use simplified preferences that match the schema, INCLUDING quiz answers
        const currentPrefs = {
          ...actualPrefs,
          dietaryType: dietaryType || actualPrefs.dietaryType || 'balanced',
          calorieTarget: calorieTarget || actualPrefs.calorieTarget || 2000,
          mealsPerDay: mealsPerDay || actualPrefs.mealsPerDay || 3,
          allergies: ensureArray(allergies || actualPrefs.allergies),
          excludedIngredients: ensureArray(excludedIngredients || actualPrefs.excludedIngredients),
          maxCookingTime: maxCookingTime || actualPrefs.maxCookingTime || 30,
          budgetPreference: budgetPreference || actualPrefs.budgetPreference || 'medium',
          preferredIngredients: ensureArray(preferredIngredients || actualPrefs.preferredIngredients),
          // Add quiz-specific answers that were missing - ensure arrays
          healthGoals: ensureArray(healthGoals || actualPrefs.healthGoals),
          cuisinePreferences: ensureArray(cuisinePreferences || actualPrefs.cuisinePreferences),
          cookingSkillLevel: cookingSkillLevel || actualPrefs.cookingSkillLevel || 'intermediate'
        };
        
        console.log('Using current user preferences:', {
          dietaryType: currentPrefs.dietaryType,
          allergies: currentPrefs.allergies,
          calorieTarget: currentPrefs.calorieTarget,
          healthGoals: currentPrefs.healthGoals,
          cuisinePreferences: currentPrefs.cuisinePreferences,
          cookingSkillLevel: currentPrefs.cookingSkillLevel
        });
        
        // Use OpenAI to generate AI-based meal plan with user preferences
        console.log(`Generating AI-based meal plan with OpenAI for ${durationDays} days...`);
        
        const { generateMealPlanWithRecipes } = await import('./services/openai');
        const { updateMealPlanProgress, clearMealPlanProgress } = await import('./services/meal-plan-progress');
        
        // Initialize progress tracking
        updateMealPlanProgress(
          req.user.id,
          'initializing',
          'Starting meal plan generation',
          0,
          durationDays,
          false
        );
        
        // Generate meal plans for each day
        const dailyPlans = [];
        for (let day = 0; day < durationDays; day++) {
          // Update progress before generating each day
          updateMealPlanProgress(
            req.user.id,
            'generating',
            `Generating meals for day ${day + 1}`,
            day + 1,
            durationDays,
            false
          );
          
          console.log(`Generating AI meal plan for day ${day + 1}/${durationDays}...`);
          
          const dayPlan = await generateMealPlanWithRecipes({
            dietaryType: currentPrefs.dietaryType,
            calorieTarget: currentPrefs.calorieTarget,
            mealsPerDay: currentPrefs.mealsPerDay,
            allergies: currentPrefs.allergies,
            excludedIngredients: currentPrefs.excludedIngredients,
            maxCookingTime: currentPrefs.maxCookingTime,
            budgetPreference: currentPrefs.budgetPreference,
            preferredIngredients: currentPrefs.preferredIngredients,
            healthGoals: currentPrefs.healthGoals,
            cuisinePreferences: currentPrefs.cuisinePreferences,
            cookingSkillLevel: currentPrefs.cookingSkillLevel,
            language: 'en' // Always use English
          });
          
          dailyPlans.push({
            date: new Date(Date.now() + day * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            meals: dayPlan.meals,
            totalCalories: dayPlan.totalCalories
          });
          
          // Small delay to avoid rate limits
          if (day < durationDays - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        // Update progress: all days generated, now saving
        updateMealPlanProgress(
          req.user.id,
          'saving',
          'Saving meal plan to database',
          durationDays,
          durationDays,
          false
        );
        
        const weeklyMealPlan = { plan: dailyPlans };
        
        // Handle AI meal plan data structure properly
        console.log('AI meal plan structure:', { 
          isArray: Array.isArray(weeklyMealPlan),
          hasPlan: weeklyMealPlan?.plan ? true : false,
          planIsArray: Array.isArray(weeklyMealPlan?.plan),
          keys: Object.keys(weeklyMealPlan || {})
        });
        
        if (weeklyMealPlan && weeklyMealPlan.plan && Array.isArray(weeklyMealPlan.plan)) {
          // Use AI-generated meal plan directly if it has the correct structure
          mealPlanData = { 
            plan: weeklyMealPlan.plan,
            totalCost: 0 // AI doesn't calculate cost
          };
        } else {
          // Transform if needed - handle case where weeklyMealPlan is the plan array directly
          const planArray = Array.isArray(weeklyMealPlan) ? weeklyMealPlan : 
                           weeklyMealPlan?.plan ? weeklyMealPlan.plan : [];
          
          mealPlanData = {
            plan: planArray.slice(0, durationDays),
            totalCost: 0
          };
        }
        
        console.log('Generated AI meal plan with OpenAI:', { 
          daysGenerated: mealPlanData.plan?.length || 0,
          totalDays: durationDays,
          generationType: 'AI_OPENAI'
        });
        
        // Mark progress as completed
        updateMealPlanProgress(
          req.user.id,
          'completed',
          'Meal plan generated successfully',
          durationDays,
          durationDays,
          true
        );
      } catch (error: any) {
        console.error('Error generating AI meal plan:', error);
        
        // Clear progress on error
        clearMealPlanProgress(req.user.id);
        
        throw new Error(`AI meal plan generation failed: ${error?.message || 'Unknown error'}`);
      }

      // Process each day in the meal plan and save to database
      const startDate = new Date();
      const generatedPlans = [];

      // Validate meal plan data structure from fast template system
      if (!mealPlanData || !mealPlanData.plan || !Array.isArray(mealPlanData.plan)) {
        throw new Error('Invalid meal plan data structure from fast template system');
      }

      // Process each day in the fast-generated meal plan
      for (let i = 0; i < durationDays; i++) {
        if (!mealPlanData.plan[i]) {
          console.warn(`No meal plan data for day ${i+1}, skipping`);
          continue;
        }

        const dailyPlan = mealPlanData.plan[i];
        
        // Generate unique meals for each day instead of adding confusing day markers
        if (Array.isArray(dailyPlan.meals)) {
          dailyPlan.meals.forEach((meal: any) => {
            // Only add day marker if meal name is too generic, otherwise keep original name
            if (meal.name && (meal.name.length < 15 || meal.name.includes('Recipe') || meal.name.includes('Meal'))) {
              meal.name = `${meal.name} (Day ${i+1})`;
            }
          });
        }

        
        const planDate = new Date(startDate);
        planDate.setDate(planDate.getDate() + i);
        const dateStr = planDate.toISOString().split('T')[0];

        // Check if a meal plan already exists for this date
        let [mealPlan] = await db
          .select()
          .from(mealPlans)
          .where(
            and(
              eq(mealPlans.userId, req.user.id),
              eq(mealPlans.date, dateStr)
            )
          );

        // If no meal plan exists, create one
        if (!mealPlan) {
          // Extract total calories from the user's preferences if available
          // Or from the AI response if provided
          const totalCals = req.body.calorieTarget || dailyPlan.totalDailyCalories || 2000;
          console.log('Creating meal plan with calories:', totalCals, 'date:', dateStr);
          
          [mealPlan] = await db.insert(mealPlans).values({
            userId: req.user.id,
            date: dateStr,
            totalCalories: totalCals,
            status: 'active',
          }).returning();
        } else {
          // If a meal plan exists, update its total calories
          const totalCals = req.body.calorieTarget || dailyPlan.totalDailyCalories || 2000;
          console.log('Updating meal plan with calories:', totalCals, 'date:', dateStr);
          
          await db.update(mealPlans)
            .set({ totalCalories: totalCals })
            .where(eq(mealPlans.id, mealPlan.id));
        }

        console.log('Using meal plan:', mealPlan.id, 'for date:', dateStr);

        // Remove existing recipes for this meal plan
        await db.delete(recipesInMealPlan)
          .where(eq(recipesInMealPlan.mealPlanId, mealPlan.id));

        // Get total calories for the day and calculate distribution of calories and macros
        const totalDailyCalories = req.body.calorieTarget || dailyPlan.totalDailyCalories || 2000;
        
        // Create recipes from AI-generated data and associate them with the meal plan
        const createdRecipes = await Promise.all(
          dailyPlan.meals.map(async (meal: any, index: number) => {
            // Extract and normalize recipe data
            // Add safe defaults for all required fields
            const safeMealType = typeof meal.mealType === 'string' ? meal.mealType : 'other';
            
            // Generate a meaningful name if one doesn't exist
            let safeName;
            if (typeof meal.name === 'string' && meal.name && !meal.name.includes('Recipe for') && !meal.name.includes('-') && meal.name.length > 10) {
              // Use the provided name if it's a good one
              if (!meal.name.includes(`(Day ${i+1})`)) {
                safeName = `${meal.name} (Day ${i+1})`;
              } else {
                safeName = meal.name;
              }
            } else {
              // Generate proper Polish recipe names based on ingredients and meal type
              const ingredients = Array.isArray(meal.recipe?.ingredients) ? meal.recipe.ingredients : [] as string[];
              
              if (ingredients.length > 0) {
                // Create Polish-style recipe names
                const polishRecipeTemplates = {
                  breakfast: [
                    'Jajecznica z {ingredient}',
                    'Omlet z {ingredient}', 
                    'Kanapki z {ingredient}',
                    'Tosty z {ingredient}',
                    'Owsianka z {ingredient}',
                    'Śniadanie z {ingredient}'
                  ],
                  lunch: [
                    'Sałatka z {ingredient}',
                    'Makaron z {ingredient}',
                    'Kanapka z {ingredient}',
                    'Ryż z {ingredient}',
                    'Obiad z {ingredient}',
                    'Posiłek z {ingredient}'
                  ],
                  dinner: [
                    'Kotlet z {ingredient}',
                    'Kurczak z {ingredient}',
                    'Ryba z {ingredient}',
                    'Ziemniaki z {ingredient}',
                    'Kolacja z {ingredient}',
                    'Danie z {ingredient}'
                  ]
                };
                
                // Extract main ingredient from the first ingredient
                const firstIngredient = ingredients[0] || '';
                let mainIngredient = firstIngredient
                  .toLowerCase()
                  .replace(/[0-9]+[a-z]*\s*/g, '') // Remove quantities
                  .replace(/\b(cup|tbsp|tsp|oz|g|kg|ml|l|łyżka|łyżeczka|szklanka)\b/g, '') // Remove measurements
                  .trim()
                  .split(/[\s,]+/)[0]; // Get first meaningful word
                
                // Map common English ingredients to Polish
                const ingredientMap = {
                  'eggs': 'jajkami', 'egg': 'jajkiem', 'ham': 'szynką', 'cheese': 'serem',
                  'chicken': 'kurczakiem', 'fish': 'rybą', 'salmon': 'łososiem', 'tuna': 'tuńczykiem',
                  'potato': 'ziemniakami', 'potatoes': 'ziemniakami', 'rice': 'ryżem', 
                  'pasta': 'makaronem', 'bread': 'chlebem', 'tomato': 'pomidorem', 
                  'cucumber': 'ogórkiem', 'lettuce': 'sałatą', 'beans': 'fasolą',
                  'lentils': 'soczewicą', 'chickpeas': 'ciecierzycą'
                };
                
                // Try to find Polish translation
                const polishIngredient = ingredientMap[mainIngredient] || mainIngredient;
                
                // Get templates for meal type
                const templates = polishRecipeTemplates[safeMealType.toLowerCase()] || polishRecipeTemplates.lunch;
                
                // Select template based on day to ensure variety
                const templateIndex = i % templates.length;
                const template = templates[templateIndex];
                
                // Create the name
                const baseName = template.replace('{ingredient}', polishIngredient);
                safeName = `${baseName} (Day ${i+1})`;
              } else {
                // Fallback with simple meal type description
                const timeBasedNames = {
                  'breakfast': ['Morning Energizer', 'Sunrise Plate', 'Dawn Delight', 'Breakfast Bounty'],
                  'lunch': ['Midday Power Meal', 'Afternoon Fuel', 'Daytime Nourishment', 'Lunch Legend'],
                  'dinner': ['Evening Wellness Plate', 'Sunset Satisfaction', 'Night Nutrition', 'Dinner Delight'],
                  'snack': ['Quick Energy Boost', 'Light Bite', 'Simple Snack', 'Healthy Pick']
                };
                
                const specialNames = timeBasedNames[safeMealType.toLowerCase()] || ['Healthy Meal'];
                const nameIndex = i % specialNames.length;
                safeName = `${specialNames[nameIndex]} (Day ${i+1})`;
              }
            }
            
            // Calculate appropriate calorie distribution based on meal type and total meals
            let caloriePercentage = 0;
            
            // If only one meal per day, give it 100% of calories
            if (dailyPlan.meals.length === 1) {
              caloriePercentage = 1.0;
            } else {
              // Use standard distribution for multiple meals
              switch(safeMealType.toLowerCase()) {
                case 'breakfast':
                  caloriePercentage = 0.25; // 25% of daily calories
                  break;
                case 'lunch':
                  caloriePercentage = 0.30; // 30% of daily calories
                  break;
                case 'dinner':
                  caloriePercentage = 0.30; // 30% of daily calories
                  break;
                case 'morning snack':
                  caloriePercentage = 0.05; // 5% of daily calories
                  break;
                case 'afternoon snack':
                  caloriePercentage = 0.05; // 5% of daily calories
                  break;
                case 'evening snack':
                  caloriePercentage = 0.05; // 5% of daily calories
                  break;
                default:
                  // Distribute remaining calories evenly
                  caloriePercentage = 1 / dailyPlan.meals.length;
              }
            }
            
            // Calculate calories for this meal
            const calories = Math.round(totalDailyCalories * caloriePercentage);
            
            // Calculate macros with a standard ratio
            // Protein: 25%, Carbs: 45%, Fat: 30% of calories
            const protein = Math.round((calories * 0.25) / 4); // 4 calories per gram of protein
            const carbs = Math.round((calories * 0.45) / 4);  // 4 calories per gram of carbs
            const fat = Math.round((calories * 0.30) / 9);   // 9 calories per gram of fat
            
            const nutritionInfo = meal.recipe?.nutritionInfo || {
              calories: calories,
              protein: protein,
              carbs: carbs,
              fat: fat
            };
            
            // Ensure we always have valid nutrition values
            nutritionInfo.calories = nutritionInfo.calories || calories;
            nutritionInfo.protein = nutritionInfo.protein || protein;
            nutritionInfo.carbs = nutritionInfo.carbs || carbs;
            nutritionInfo.fat = nutritionInfo.fat || fat;
            
            // Process instructions - prioritize direct instructions over nested ones
            let instructionsArray = [];
            
            // First check for direct instructions on meal object (OpenAI often puts them here)
            if (typeof meal.instructions === 'string' && meal.instructions.trim() !== '') {
              // Split by logical break points (periods, newlines)
              const splitInstructions = meal.instructions
                .split(/[.\n]/)
                .map(step => step.trim())
                .filter(step => step.length > 0);
                
              if (splitInstructions.length > 0) {
                instructionsArray = splitInstructions;
                console.log(`Using direct meal.instructions string, split into ${splitInstructions.length} steps`);
              } else {
                // If splitting didn't work, use as a single step
                instructionsArray = [meal.instructions];
                console.log('Using direct meal.instructions as a single step');
              }
            } 
            // If no direct instructions, try recipe.instructions
            else if (meal.recipe?.instructions) {
              if (Array.isArray(meal.recipe.instructions)) {
                instructionsArray = meal.recipe.instructions;
                console.log('Using recipe.instructions array directly');
              } else if (typeof meal.recipe.instructions === 'string' && meal.recipe.instructions.trim() !== '') {
                // Split by logical break points (periods, newlines)
                const splitInstructions = meal.recipe.instructions
                  .split(/[.\n]/)
                  .map(step => step.trim())
                  .filter(step => step.length > 0);
                  
                if (splitInstructions.length > 0) {
                  instructionsArray = splitInstructions;
                  console.log(`Using recipe.instructions string, split into ${splitInstructions.length} steps`);
                } else {
                  // If splitting didn't work, use as a single step
                  instructionsArray = [meal.recipe.instructions];
                  console.log('Using recipe.instructions as a single step');
                }
              }
            }
            
            // Process ingredients similarly
            let ingredientsArray = [];
            
            // First check direct ingredients (often present in OpenAI responses)
            if (Array.isArray(meal.ingredients) && meal.ingredients.length > 0) {
              ingredientsArray = meal.ingredients;
              console.log(`Using direct meal.ingredients array with ${meal.ingredients.length} items`);
            } 
            // If no direct ingredients, try recipe.ingredients
            else if (meal.recipe?.ingredients) {
              if (Array.isArray(meal.recipe.ingredients)) {
                ingredientsArray = meal.recipe.ingredients;
                console.log('Using recipe.ingredients array directly');
              }
            }
            
            const recipeData = {
              name: safeName,
              description: `${safeMealType} for ${dateStr}`,
              ingredients: ingredientsArray,
              instructions: instructionsArray,
              nutritionInfo: nutritionInfo,
              isPublic: true,
              mealType: safeMealType.toLowerCase(),
              // Generate a deterministic image URL based on the meal name, type, and day
              imageUrl: getRecipeImageUrl(safeName, safeMealType)
            };

            // Create recipe in the database
            // Ensure instructions and ingredients are arrays before saving
            const recipeToSave = {
              ...recipeData,
              userId: req.user.id,
              source: "ai-generated",
              createdAt: new Date(),
              updatedAt: new Date(),
              likesCount: 0,
              commentsCount: 0,
              instructions: Array.isArray(recipeData.instructions) ? recipeData.instructions : [],
              ingredients: Array.isArray(recipeData.ingredients) ? recipeData.ingredients : []
            };
            
            console.log('Saving recipe with instructions:', {
              name: recipeToSave.name,
              ingredientsCount: recipeToSave.ingredients.length,
              instructionsCount: recipeToSave.instructions.length,
              sampleInstructions: recipeToSave.instructions.slice(0, 2),
              originalInstructionSource: typeof meal.instructions === 'string' ? 
                'meal.instructions (direct string)' : 
                (Array.isArray(meal.recipe?.instructions) ? 
                  'meal.recipe.instructions (array)' : 
                  (typeof meal.recipe?.instructions === 'string' ? 
                    'meal.recipe.instructions (string)' : 
                    'none found'))
            });
            
            const [newRecipe] = await db.insert(recipes).values(recipeToSave).returning();

            // Associate recipe with meal plan
            await db.insert(recipesInMealPlan).values({
              mealPlanId: mealPlan.id, // Using camelCase to match the schema
              recipeId: newRecipe.id,  // Using camelCase to match the schema
              mealType: recipeData.mealType, // Using camelCase to match the schema
              servingSize: "1.00", // Default serving size
              order: 0, // Default order
              created_at: new Date()
            });

            return { ...newRecipe, mealType: recipeData.mealType };
          })
        );

        console.log('Created recipes for plan:', { 
          planId: mealPlan.id, 
          date: dateStr, 
          recipeCount: createdRecipes.length 
        });

        // Generate shopping list for this meal plan
        try {
          console.log(`Generating shopping list for meal plan ID ${mealPlan.id}`);
          const { generateShoppingListFromMealPlan } = await import('./services/shopping-list-generator');
          const shoppingList = await generateShoppingListFromMealPlan(mealPlan.id, req.user.id);
          console.log(`Successfully created shopping list with ${shoppingList.items.length} items for meal plan ${mealPlan.id}`);
        } catch (shoppingListError) {
          console.error(`Error generating shopping list for meal plan ${mealPlan.id}:`, shoppingListError);
        }

        // Add to generated plans
        generatedPlans.push({
          id: mealPlan.id,
          date: dateStr,
          totalCalories: mealPlan.totalCalories,
          status: mealPlan.status,
          meals: createdRecipes
        });
      }

      res.json({
        weekStart: startDate.toISOString().split('T')[0],
        plans: generatedPlans
      });
    } catch (error) {
      console.error('[Meal Plan API] Error creating meal plan:', error);
      res.status(500).json({
        error: 'Failed to create meal plan',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });
  
  // Helper function to get recipe image URLs
  function getRecipeImageUrl(recipeName: string | undefined, mealType: string): string {
    // Map of meal types to likely food image categories
    const mealTypeToImageMap: Record<string, string[]> = {
      'breakfast': [
        "photo-1533089860892-a7c6f0a88666", // pancakes
        "photo-1525351484163-7529414344d8", // avocado toast
        "photo-1540189549336-e6e99c3679fe", // breakfast bowl
        "photo-1484723091739-30a097e8f929", // eggs
        "photo-1569892196435-a1a317d6c595"  // smoothie bowl
      ],
      'lunch': [
        "photo-1546793665-c74683f339c1", // salad
        "photo-1559847844-5315695dadae", // sandwich
        "photo-1512621776951-a57141f2eefd", // vegetable dish
        "photo-1490645935967-10de6ba17061", // buddha bowl
        "photo-1603105037880-880cd4edfb0d"  // soup
      ],
      'dinner': [
        "photo-1467003909585-2f8a72700288", // salmon
        "photo-1473093295043-cdd812d0e601", // pasta
        "photo-1574484284002-952d92456975", // rice bowl
        "photo-1504674900247-0877df9cc836", // grilled dish
        "photo-1563379926898-05f4575a45d8"  // chicken dish
      ],
      'snack': [
        "photo-1541167760496-1628856ab772", // fruit/nuts
        "photo-1558961363-fa8fdf82db35", // crackers
        "photo-1564834724105-918b73d1b9e0", // smoothie
        "photo-1542691457-cbe4df1ee349", // yogurt
        "photo-1599165521233-4b5be3298345"  // snack bar
      ]
    };
    
    // Ensure we have a valid meal type
    const safeMealType = typeof mealType === 'string' ? mealType.toLowerCase() : 'snack';
    
    // Normalize the meal type to match our keys
    const normalizedType = safeMealType.includes('breakfast') ? 'breakfast' :
                          safeMealType.includes('lunch') ? 'lunch' :
                          safeMealType.includes('dinner') ? 'dinner' :
                          'snack';
    
    // Get the image array for this meal type or default to breakfast images
    const imageOptions = mealTypeToImageMap[normalizedType] || mealTypeToImageMap.breakfast;
    
    // Use a hash of the recipe name to deterministically select an image
    // Add a fallback for undefined recipe names
    const safeRecipeName = recipeName || `default-${normalizedType}-recipe`;
    const nameHash = safeRecipeName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const selectedImage = imageOptions[nameHash % imageOptions.length];
    
    return `https://images.unsplash.com/${selectedImage}?w=800&auto=format&fit=crop`;
  }

  // Get all meal plans endpoint
  app.get("/api/meal-plans/all", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Get all meal plans for the user, with a distinct date
      // First, we find the latest meal plan for each date to ensure we're only getting one per day
      const latestMealPlansByDate: Record<string, number> = {};
      
      const allUserMealPlans = await db
        .select({
          id: mealPlans.id,
          date: mealPlans.date,
          totalCalories: mealPlans.totalCalories,
          status: mealPlans.status,
          createdAt: mealPlans.createdAt
        })
        .from(mealPlans)
        .where(eq(mealPlans.userId, req.user.id))
  .orderBy(desc(mealPlans.createdAt)); // Get latest first
      
      // Only keep the latest meal plan for each date
      for (const plan of allUserMealPlans) {
        if (!latestMealPlansByDate[plan.date]) {
          latestMealPlansByDate[plan.date] = plan.id;
        }
      }
      
      // Filter to only the latest meal plan for each date
      const userMealPlans = allUserMealPlans.filter(plan => 
        latestMealPlansByDate[plan.date] === plan.id
      ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Sort by date

      console.log('Filtered to one meal plan per date:', userMealPlans.map(p => ({ id: p.id, date: p.date })));

      if (!userMealPlans.length) {
        return res.json({ 
          weekStart: new Date().toISOString().split('T')[0],
          plans: [] 
        });
      }

      // Get all recipes for these meal plans
      const allRecipes = await db
        .select({
          mealPlanId: recipesInMealPlan.mealPlanId,
          id: recipes.id,
          name: recipes.name,
          mealType: recipesInMealPlan.mealType,
          nutritionInfo: recipes.nutritionInfo,
          instructions: recipes.instructions,
          ingredients: recipes.ingredients,
          imageUrl: recipes.imageUrl,
        })
        .from(recipesInMealPlan)
        .innerJoin(recipes, eq(recipes.id, recipesInMealPlan.recipeId))
        .where(inArray(
          recipesInMealPlan.mealPlanId, 
          userMealPlans.map(plan => plan.id)
        ));

      // Organize recipes by meal plan
      const mealPlanRecipes = allRecipes.reduce((acc, recipe) => {
        if (!acc[recipe.mealPlanId]) {
          acc[recipe.mealPlanId] = [];
        }
        acc[recipe.mealPlanId].push(recipe);
        return acc;
      }, {} as Record<number, typeof allRecipes>);

      // Construct the plans with their recipes
    const plans = userMealPlans.map((plan) => {
        const meals = mealPlanRecipes[plan.id] || [];
        return {
          ...plan,
      meals: meals.map((meal: any) => {
            // Process ingredients
            let ingredients = meal.ingredients;
            if (typeof ingredients === 'string') {
              try {
                ingredients = JSON.parse(ingredients);
              } catch (e) {
                console.warn(`Failed to parse ingredients JSON for meal ${meal.id}:`, e);
                ingredients = [];
              }
            }
            
            // Process instructions
            let instructions = meal.instructions as unknown as string[] | string;
            let instructionsArray: string[] = [];
            
            if (Array.isArray(instructions)) {
              instructionsArray = instructions;
            } else if (typeof instructions === 'string') {
              // Try to parse JSON string if it looks like an array
              if ((instructions as string).startsWith('[') && (instructions as string).endsWith(']')) {
                try {
                  instructionsArray = JSON.parse(instructions as string);
                } catch (e) {
                  console.warn(`Failed to parse instructions JSON for meal ${meal.id}:`, e);
                  instructionsArray = (instructions as string).split('\n').filter((line: string) => line.trim() !== '');
                }
              } else if ((instructions as string) !== '{}' && (instructions as string).trim() !== '') {
                // If it's not empty and not a JSON object, split by newlines
                instructionsArray = (instructions as string).split('\n').filter((line: string) => line.trim() !== '');
              }
            }
            
            return {
              id: meal.id,
              name: meal.name,
              mealType: meal.mealType,
              imageUrl: meal.imageUrl,
              recipe: {
                ingredients: Array.isArray(ingredients) ? ingredients : [],
                instructions: instructionsArray,
                nutritionInfo: meal.nutritionInfo,
                prepTime: 30 // Default value
              }
            };
          })
        };
      });

      // Find the start of the week for the first plan
      const firstPlanDate = new Date(userMealPlans[0].date);
      const weekStart = new Date(firstPlanDate);
      weekStart.setDate(firstPlanDate.getDate() - firstPlanDate.getDay()); // Go back to previous Sunday

      res.json({
        weekStart: weekStart.toISOString().split('T')[0],
        plans
      });
    } catch (error) {
      console.error('Error fetching all meal plans:', error);
      res.status(500).json({ error: 'Failed to fetch meal plans' });
    }
  });

  // Get todays meal plan endpoint
  // Meal plan endpoints for today and specific dates have been moved to meal-plans.routes.ts
  
  // Endpoint to generate optimized meal plan with integrated shopping list
  // Generate a meal plan with budget-first approach (ingredients first, then meals)
  app.post("/api/meal-plans/generate-budget-first", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const {
        date,
        duration = 'week', // Default to a week-long plan
      } = req.body;

      if (!date) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'Date is required'
        });
      }

      // Get user dietary preferences
      const userDietaryData = await db
        .select()
        .from(userDietaryPreferences)
        .where(eq(userDietaryPreferences.userId, req.user.id))
        .limit(1);

      if (!userDietaryData.length) {
        return res.status(404).json({
          error: 'User preferences not found',
          message: 'Please complete your dietary preferences first'
        });
      }

      const dietPrefs = userDietaryData[0];

      // Get user nutrition preferences (for calorie targets)
      const userNutritionData = await db
        .select()
        .from(userNutritionPreferences)
        .where(eq(userNutritionPreferences.userId, req.user.id))
        .limit(1);

      // Default calorie target if not found
      const calorieTarget = userNutritionData.length 
        ? userNutritionData[0].caloriesGoal
        : 2000;

      // Generate the budget-first meal plan
      console.log(`Generating budget-first meal plan for date: ${date}, duration: ${duration}`);
      
      try {
        // Generate a simple meal plan without external dependencies
        const budgetFirstMealPlanResult = {
          plan: [{
            totalDailyCalories: calorieTarget,
            meals: [
              {
                name: 'Śniadanie',
                mealType: 'breakfast',
                recipe: {
                  ingredients: ['2 jajka', '1 kromka chleba pełnoziarnistego', '1 łyżka masła'],
                  instructions: ['Usmaż jajka na maśle', 'Podawaj z pieczywem pełnoziarnistym'],
                  prepTime: 10,
                  nutritionInfo: { calories: 300, protein: 15, carbs: 25, fat: 18 }
                }
              },
              {
                name: 'Obiad',
                mealType: 'lunch', 
                recipe: {
                  ingredients: ['150g piersi kurczaka', '100g ryżu', 'warzywa sezonowe'],
                  instructions: ['Ugotuj ryż', 'Usmaż kurczaka', 'Dodaj warzywa'],
                  prepTime: 25,
                  nutritionInfo: { calories: 450, protein: 35, carbs: 40, fat: 12 }
                }
              },
              {
                name: 'Kolacja',
                mealType: 'dinner',
                recipe: {
                  ingredients: ['sałata', 'pomidor', 'ogórek', 'oliwa z oliwek'],
                  instructions: ['Pokrój warzywa', 'Wymieszaj z oliwą'],
                  prepTime: 10,
                  nutritionInfo: { calories: 250, protein: 8, carbs: 15, fat: 20 }
                }
              }
            ]
          }]
        };

        console.log(`Successfully generated simple meal plan with ${budgetFirstMealPlanResult.plan.length} days`);

        // Extract first day's data
        const firstDay = budgetFirstMealPlanResult.plan[0];
        
        if (!firstDay) {
          throw new Error('No meal plan data generated');
        }

        // Save all days to the database
        const startDate = new Date(date);
        const allSavedMealPlans = [];
        
        for (let i = 0; i < budgetFirstMealPlanResult.plan.length; i++) {
          const currentDate = new Date(startDate);
          currentDate.setDate(startDate.getDate() + i);
          const currentDateStr = currentDate.toISOString().split('T')[0];
          
          const planDay = budgetFirstMealPlanResult.plan[i];
          
          // Skip days with no meals
          if (!planDay.meals || planDay.meals.length === 0) {
            console.warn(`Skipping day ${i + 1} (${currentDateStr}) as it has no meals`);
            continue;
          }
          
          // Create the meal plan for this day
          const [newMealPlan] = await db
            .insert(mealPlans)
            .values({
              userId: req.user.id, 
              date: currentDateStr,
              totalCalories: planDay.totalDailyCalories,
              status: 'active',
              createdAt: new Date(),
              updatedAt: new Date()
            })
            .returning();
            
          console.log(`Created meal plan for ${currentDateStr} with ID: ${newMealPlan.id}`);
          allSavedMealPlans.push(newMealPlan);
          
          // Add all recipes for this day
          for (let j = 0; j < planDay.meals.length; j++) {
            const meal = planDay.meals[j];
            
            // Create the recipe
            const [newRecipe] = await db
              .insert(recipes)
              .values({
                userId: req.user.id,
                name: meal.name,
                description: `Generated for ${meal.mealType} on ${currentDateStr}`,
                instructions: Array.isArray(meal.recipe.instructions) ? meal.recipe.instructions : [meal.recipe.instructions],
                ingredients: Array.isArray(meal.recipe.ingredients) ? meal.recipe.ingredients : [],
                prepTime: meal.recipe.prepTime,
                cookTime: meal.recipe.prepTime,
                servings: 1,
                nutritionInfo: meal.recipe.nutritionInfo || {
                  calories: 0,
                  protein: 0,
                  carbs: 0,
                  fat: 0
                },
                isPublic: false,
                imageUrl: '', // No image for now
                createdAt: new Date(),
                updatedAt: new Date()
              })
              .returning();
              
            console.log(`Created recipe ${newRecipe.name} with ID: ${newRecipe.id}`);
            
            // Link recipe to meal plan
            await db
              .insert(recipesInMealPlan)
              .values({
                mealPlanId: newMealPlan.id,
                recipeId: newRecipe.id,
                mealType: meal.mealType,
                order: j,
                servingSize: 1,
                isFrozen: false,
                isCompleted: false
              });
          }
          
          // Generate shopping list for the first day/meal plan
          if (i === 0) {
            const generateShoppingList = (await import('./services/shopping-list-generator')).generateShoppingListFromMealPlan;
            await generateShoppingList(newMealPlan.id, req.user.id);
            console.log(`Generated shopping list for meal plan ID: ${newMealPlan.id}`);
          }
        }
        
        // Return success with first day's plan and weekly ingredients
        res.json({
          success: true,
          firstDayPlanId: allSavedMealPlans[0]?.id,
          message: `Generated ${allSavedMealPlans.length} days of meal plans using simplified approach`
        });
        
      } catch (genError) {
        console.error('Error generating budget-first meal plan:', genError);
        return res.status(500).json({
          error: 'Meal plan generation failed',
          message: genError instanceof Error ? genError.message : 'Failed to generate budget-based meal plan'
        });
      }
    } catch (error) {
      console.error('Budget-first meal plan error:', error);
      res.status(500).json({
        error: 'Meal plan generation failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });

  app.post("/api/meal-plans/generate-optimized", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const {
        date,
        duration = 'week', // Default to a week-long plan
      } = req.body;

      if (!date) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'Date is required'
        });
      }

      // Get user dietary preferences
      const userDietaryData = await db
        .select()
        .from(userDietaryPreferences)
        .where(eq(userDietaryPreferences.userId, req.user.id))
        .limit(1);

      if (!userDietaryData.length) {
        return res.status(404).json({
          error: 'User preferences not found',
          message: 'Please complete your dietary preferences first'
        });
      }

      // Get user profile to determine language preference
      const userProfile = await db.query.users.findFirst({
        where: eq(users.id, req.user.id)
      });

      const language = userProfile?.preferred_language || 'en';
      
      // Extract preferences from user data
      const {
        dietaryType,
        calorieTarget,
        mealsPerDay,
        allergies = [],
        excludedIngredients = [],
        preferredIngredients = [],
        maxCookingTime,
        budgetPreference,
        cuisinePreferences = [],
        healthGoals = [],
        cookingSkillLevel = 'beginner'
      } = userDietaryData[0];

      console.log(`Generating OPTIMIZED meal plan with preferences:`, {
        dietaryType,
        cuisinePreferences,
        healthGoals,
        language
      });
      
      // Generate meal plan using optimized system (balances speed and accuracy)
      const { generateOptimizedMealPlan } = await import('./services/optimized-meal-generator');
      
      const aiMealResult = await generateOptimizedMealPlan({
        dietaryType,
        calorieTarget,
        mealsPerDay,
        allergies,
        excludedIngredients,
        maxCookingTime,
        budgetPreference,
        preferredIngredients,
        language,
        healthGoals,
        cuisinePreferences,
        cookingSkillLevel
      }, 1);
      
      console.log(`✅ Meal plan generated using ${aiMealResult.generationMethod} method`);
      
      // Transform to expected format
      const optimizedMealPlanResult = {
        plan: [{
          totalDailyCalories: aiMealResult.plan?.[0]?.totalCalories || calorieTarget,
          meals: aiMealResult.plan?.[0]?.meals || []
        }],
        totalCost: aiMealResult.totalCost || 0
      };

      // Create the meal plan in the database
      const [newMealPlan] = await db
        .insert(mealPlans)
        .values({
          userId: req.user.id,
          date: date,
          totalCalories: optimizedMealPlanResult.plan[0]?.totalDailyCalories || calorieTarget,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      console.log(`Created new optimized meal plan with ID: ${newMealPlan.id}`);
      
      // Insert meals as recipes using AI-generated data
      const mealsToSave = optimizedMealPlanResult.plan[0]?.meals || [];
      const savedRecipes = [];

      for (const [index, meal] of mealsToSave.entries()) {
        // Create a new recipe for each meal (respecting schema columns)
        const [newRecipe] = await db
          .insert(recipes)
          .values({
            userId: req.user.id,
            name: meal.name,
            ingredients: Array.isArray(meal.recipe?.ingredients) ? meal.recipe.ingredients : [],
            instructions: Array.isArray(meal.recipe?.instructions) ? meal.recipe.instructions : [],
            nutritionInfo: meal.recipe?.nutritionInfo ? {
              calories: Number(meal.recipe.nutritionInfo.calories) || 0,
              protein: Number(meal.recipe.nutritionInfo.protein) || 0,
              carbs: Number(meal.recipe.nutritionInfo.carbs) || 0,
              fat: Number(meal.recipe.nutritionInfo.fat) || 0,
            } : undefined,
            isPublic: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            imageUrl: `https://source.unsplash.com/featured/?food,${encodeURIComponent(meal.name.split(' ')[0])}`
          })
          .returning();
        
        // Link recipe to meal plan
        await db
          .insert(recipesInMealPlan)
          .values({
            mealPlanId: newMealPlan.id,
            recipeId: newRecipe.id,
            mealType: meal.mealType,
            servingSize: "1.00",
            order: index,
            created_at: new Date()
          });
        
        savedRecipes.push(newRecipe);
      }

      // Generate basic shopping list from ingredients
  const listItems: any[] = [];
      const ingredientSet = new Set();
      
      // Collect all ingredients from meals
      for (const meal of mealsToSave) {
        for (const ingredient of meal.recipe.ingredients) {
          if (!ingredientSet.has(ingredient)) {
            ingredientSet.add(ingredient);
            const [newItem] = await db
              .insert(shoppingListItems)
              .values({
                userId: req.user.id,
                meal_plan_id: newMealPlan.id,
                name: ingredient,
                ingredient: ingredient,
                quantity: "1",
                unit: "item",
                category: "general",
                isPurchased: false,
                meal_type: meal.mealType,
                recipe_name: meal.name,
                recipe_image: savedRecipes.find(r => r.name === meal.name)?.imageUrl || ''
              })
              .returning();

            listItems.push(newItem);
          }
        }
      }

      // Return the created meal plan with recipes and shopping list
      res.json({
        mealPlan: {
          ...newMealPlan,
          recipes: savedRecipes
        },
        shoppingList: {
          items: listItems,
          groupedItems: listItems.reduce((acc, item) => {
            if (!acc[item.category]) {
              acc[item.category] = [];
            }
            acc[item.category].push(item);
            return acc;
          }, {}),
          totalCost: 0
        },
        // Optimized meal plan details returned above
      });

    } catch (error) {
      console.error('Error generating optimized meal plan:', error);
      res.status(500).json({
        error: 'Failed to generate optimized meal plan',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });

  // Get user nutrition preferences
  app.get("/api/user-nutrition-preferences", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const userNutritionData = await db
        .select()
        .from(userNutritionPreferences)
        .where(eq(userNutritionPreferences.userId, req.user.id))
        .limit(1);

      if (!userNutritionData.length) {
        return res.status(404).json({
          error: 'User nutrition preferences not found',
          message: 'Please complete your onboarding first'
        });
      }

      res.json(userNutritionData[0]);
    } catch (error) {
      console.error('Error fetching user nutrition preferences:', error);
      res.status(500).json({
        error: 'Failed to fetch nutrition preferences',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });

  // Enhanced meal plan generation endpoint
  app.post("/api/meal-plans/generate-enhanced", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { preferences, duration = 'week' } = req.body;
      
      if (!preferences) {
        return res.status(400).json({ error: 'Preferences are required' });
      }

      console.log(`Generating enhanced meal plan for user ${req.user.id} with duration: ${duration}`);

      // Get user's preferred language
      const userProfile = await db
        .select()
        .from(users)
        .where(eq(users.id, req.user.id));

      const language = userProfile[0]?.preferred_language || 'en';
      const isPolish = language === 'pl';

      // Save/update user dietary preferences
      await db
        .insert(userDietaryPreferences)
        .values({
          userId: req.user.id,
          allergies: preferences.allergies || [],
          dietaryType: preferences.dietaryType || 'omnivore',
          calorieTarget: preferences.calorieTarget || 2000,
          mealsPerDay: preferences.mealsPerDay || 3,
          preferredIngredients: preferences.preferredIngredients || [],
          excludedIngredients: preferences.excludedIngredients || [],
          maxCookingTime: preferences.maxCookingTime || 45,
          budgetPreference: preferences.budgetPreference || 'medium',
        })
        .onConflictDoUpdate({
          target: userDietaryPreferences.userId,
          set: {
            allergies: preferences.allergies || [],
            dietaryType: preferences.dietaryType || 'omnivore',
            calorieTarget: preferences.calorieTarget || 2000,
            mealsPerDay: preferences.mealsPerDay || 3,
            preferredIngredients: preferences.preferredIngredients || [],
            excludedIngredients: preferences.excludedIngredients || [],
            maxCookingTime: preferences.maxCookingTime || 45,
            budgetPreference: preferences.budgetPreference || 'medium',
            updatedAt: new Date(),
          },
        });

      // Generate enhanced meal plan using budget-first approach
      const requestedDays = duration === '3days' ? 3 : 
                           duration === 'week' ? 7 : 
                           duration === 'twoWeeks' ? 14 : 7;

      // Use fast personalized meal generator for enhanced meal plan
      const { generateFastPersonalizedMealPlan } = await import('./services/fast-meal-generator');
      const daysMap: Record<string, number> = { '3days': 3, 'week': 7, 'twoWeeks': 14 };
      const days = daysMap[duration] ?? 7;
      const mealPlan = await generateFastPersonalizedMealPlan({
        dietaryType: preferences.dietaryType || 'omnivore',
        calorieTarget: preferences.calorieTarget || 2000,
        mealsPerDay: preferences.mealsPerDay || 3,
        allergies: preferences.allergies || [],
        excludedIngredients: preferences.excludedIngredients || [],
        maxCookingTime: preferences.maxCookingTime || 45,
        budgetPreference: preferences.budgetPreference || 'medium',
        preferredIngredients: preferences.preferredIngredients || [],
        language
      }, days);

      res.json({
        success: true,
        mealPlan,
        message: isPolish ? 'Plan posiłków został wygenerowany!' : 'Meal plan generated successfully!'
      });

    } catch (error) {
      console.error('Error generating enhanced meal plan:', error);
      res.status(500).json({
        error: 'Failed to generate meal plan',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });

  // On-demand meal plan generation for specific date
  app.post("/api/meal-plans/generate-for-date", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const { date, duration = 'day', useExistingPreferences = true } = req.body;
      
      if (!date) {
        return res.status(400).json({ error: 'Date parameter is required' });
      }
      
      console.log(`Generating on-demand meal plan for date: ${date}, duration: ${duration}, use preferences: ${useExistingPreferences}`);
      
      // Check if a meal plan already exists for this date
      const existingPlan = await db
        .select()
        .from(mealPlans)
        .where(
          and(
            eq(mealPlans.userId, req.user.id),
            eq(mealPlans.date, date)
          )
        )
        .limit(1);
      
      if (existingPlan.length > 0) {
        console.log(`Meal plan already exists for ${date}, ID: ${existingPlan[0].id}`);
        
        // Get the meals for this existing plan
        const existingMeals = await db
          .select({
            id: recipes.id,
            name: recipes.name,
            mealType: recipesInMealPlan.mealType,
            nutritionInfo: recipes.nutritionInfo,
            instructions: recipes.instructions,
            ingredients: recipes.ingredients,
            imageUrl: recipes.imageUrl,
          })
          .from(recipesInMealPlan)
          .innerJoin(recipes, eq(recipes.id, recipesInMealPlan.recipeId))
          .where(eq(recipesInMealPlan.mealPlanId, existingPlan[0].id));
        
        // Format meals to match frontend expectations
        const meals = existingMeals.map(recipe => {
          // Convert ingredients from jsonb to array if needed
          let ingredients = recipe.ingredients;
          if (typeof ingredients === 'string') {
            try {
              ingredients = JSON.parse(ingredients);
            } catch (e) {
              console.warn('Failed to parse ingredients JSON:', e);
              ingredients = [];
            }
          }
          
          // Convert instructions if needed
          let instructions = recipe.instructions;
          
          // Make sure instructions are always returned as an array
          let instructionsArray = [];
          
          if (Array.isArray(instructions)) {
            instructionsArray = instructions;
          } else if (typeof instructions === 'string') {
            // Try to parse JSON string if it looks like an array
            if (instructions.startsWith('[') && instructions.endsWith(']')) {
              try {
                instructionsArray = JSON.parse(instructions);
              } catch (e) {
                console.warn('Failed to parse instructions JSON:', e);
                // Split by newlines as fallback if JSON parsing fails
                instructionsArray = instructions.split('\n').filter(line => line.trim() !== '');
              }
            } else if (instructions !== '{}' && instructions.trim() !== '') {
              // If it's not empty and not a JSON object, split by newlines
              instructionsArray = instructions.split('\n').filter(line => line.trim() !== '');
            }
          }
          
          return {
            id: recipe.id,
            name: recipe.name,
            mealType: recipe.mealType,
            imageUrl: recipe.imageUrl,
            recipe: {
              ingredients: Array.isArray(ingredients) ? ingredients : [],
              instructions: instructionsArray,
              nutritionInfo: recipe.nutritionInfo,
              prepTime: 30
            }
          };
        });
        
        return res.json({
          generated: false,
          message: "Meal plan already exists for this date",
          plan: {
            ...existingPlan[0],
            meals
          }
        });
      }
      
      // If no plan exists, generate a new one
      
      // Get user preferences
      const userPrefs = await db
        .select()
        .from(userDietaryPreferences)
        .where(eq(userDietaryPreferences.userId, req.user.id));
      
      // Set defaults if no preferences exist
      const dietaryType = userPrefs[0]?.dietaryType || 'balanced';
      const calorieTarget = userPrefs[0]?.calorieTarget || 2000;
      const mealsPerDay = 3; // Standard 3 meals
      const allergies = userPrefs[0]?.allergies || [];
      const excludedIngredients = userPrefs[0]?.excludedIngredients || [];
      const preferredIngredients = userPrefs[0]?.preferredIngredients || [];
      const maxCookingTime = userPrefs[0]?.maxCookingTime || 30;
      const budgetPreference = userPrefs[0]?.budgetPreference || 'medium';
      
      // Log whether we're using existing preferences or defaults
      if (useExistingPreferences) {
        console.log(`Generating meal plan using existing user preferences: ${dietaryType}, ${calorieTarget} calories`);
      } else {
        console.log(`Generating meal plan with default preferences: ${dietaryType}, ${calorieTarget} calories`);
      }
      
      // Get user profile to access language preference
      const userProfile = await db
        .select()
        .from(users)
        .where(eq(users.id, req.user.id));
      
      // Get user's preferred language
      // Debug the structure to verify language preference path
      console.log("User profile structure for daily meal plan:", JSON.stringify(userProfile[0], null, 2));
      
      // Handle both possible data structures
      let language = 'en';
  if (userProfile[0]?.preferred_language) {
        // Direct query structure 
        language = userProfile[0].preferred_language;
        console.log("Using language from direct query structure (preferred_language):", language);
      } else {
        console.log("No language preference found for daily meal plan, using default:", language);
      }
      
      console.log(`Generating meal plan in language: ${language}`);
      
      // Generate a new meal plan
      let generatedMealData = [];
      
      try {
        // Always use fast template generation for instant meal plans (under 3 seconds)
        const { generateFastPersonalizedMealPlan } = await import('./services/fast-meal-generator');
        
        // Get actual user dietary preferences for generation
        const userDietPrefs = await db
          .select()
          .from(userDietaryPreferences)
          .where(eq(userDietaryPreferences.userId, req.user.id))
          .limit(1);
          
        const actualPrefs = userDietPrefs[0] || {};

        const days = duration === 'day' ? 1 : duration === 'week' ? 7 : duration === 'month' ? 30 : 1;
        
        console.log(`Generating FAST meal plan for ${days} day(s) using template system`);

        const aiMealPlan = await generateFastPersonalizedMealPlan({
          dietaryType: actualPrefs.dietaryType || dietaryType,
          calorieTarget: actualPrefs.calorieTarget || calorieTarget,
          mealsPerDay: actualPrefs.mealsPerDay || mealsPerDay,
          allergies: actualPrefs.allergies || allergies,
          excludedIngredients: actualPrefs.excludedIngredients || excludedIngredients,
          maxCookingTime: actualPrefs.maxCookingTime || maxCookingTime,
          budgetPreference: actualPrefs.budgetPreference || budgetPreference,
          preferredIngredients: actualPrefs.preferredIngredients || preferredIngredients,
          language,
          healthGoals: actualPrefs.healthGoals || [],
          cuisinePreferences: actualPrefs.cuisinePreferences || [],
          cookingSkillLevel: actualPrefs.cookingSkillLevel || 'beginner'
        }, days);
        
        // Use generated meal data from the first day
        generatedMealData = aiMealPlan.plan?.[0]?.meals || [];
        console.log(`Generated ${generatedMealData.length} FAST meals in under 3 seconds`);
        
        console.log('Daily meal plan generation complete');
        
      } catch (error) {
        console.error('Error generating meal plan:', error);
        return res.status(500).json({ 
          error: 'Failed to generate meal plan',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
      // Return the generated meal data
      if (generatedMealData.length === 0) {
        return res.status(400).json({ 
          error: 'No meals generated',
          message: 'The AI service did not generate any meals. Please try again.'
        });
      }
      
      // Save the generated meal plan
      const totalCalories = generatedMealData.reduce((sum, meal) => sum + (meal.recipe?.nutritionInfo?.calories || 0), 0);
      
      const [newMealPlan] = await db
        .insert(mealPlans)
        .values({
          userId: req.user.id,
          date: date,
          totalCalories: totalCalories,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      // Create recipes for each meal
  for (const meal of generatedMealData) {
        const [newRecipe] = await db
          .insert(recipes)
          .values({
    userId: req.user.id,
    name: meal.name,
    description: `${meal.mealType} for ${date}`,
    ingredients: Array.isArray(meal.recipe?.ingredients) ? meal.recipe.ingredients : [],
    instructions: Array.isArray(meal.recipe?.instructions) ? meal.recipe.instructions : [],
    nutritionInfo: meal.recipe?.nutritionInfo,
            createdAt: new Date(),
            updatedAt: new Date(),
            imageUrl: getRecipeImageUrl(meal.name, meal.mealType),
            rating: "0",
            likesCount: 0,
            commentsCount: 0,
            isPublic: true,
            isSaved: false,
            source: 'ai-generated',
            originalRecipeId: null
          })
          .returning();
        
        // Link recipe to meal plan
        await db
          .insert(recipesInMealPlan)
          .values({
            mealPlanId: newMealPlan.id,
            recipeId: newRecipe.id,
            mealType: meal.mealType, // Use the actual meal type from fast generator
            servingSize: "1.00",
            order: 0,
            created_at: new Date()
          });
      }
      
      return res.json({
        success: true,
        mealPlan: {
          id: newMealPlan.id,
          date: newMealPlan.date,
          totalCalories: newMealPlan.totalCalories,
          meals: generatedMealData.map(meal => ({
            name: meal.name,
            mealType: meal.mealType,
            ingredients: meal.recipe.ingredients,
            instructions: meal.recipe.instructions,
            nutritionInfo: meal.recipe.nutritionInfo
          }))
        }
      });
    } catch (error) {
      console.error('Error generating meal plan:', error);
      res.status(500).json({ error: 'Failed to generate meal plan' });
    }
  });
  
  // Endpoint to get meal plan for a specific date
  app.get('/api/meal-plans/:date', isAuthenticated, async (req, res) => {
    try {
      const { date } = req.params;
      
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const mealPlanWithRecipes = await db.query.mealPlans.findFirst({
        where: and(
          eq(mealPlans.userId, req.user.id),
          eq(mealPlans.date, date)
        ),
        with: {
          recipesInMealPlan: {
            with: {
              recipe: true
            }
          }
        }
      });
      
      if (!mealPlanWithRecipes) {
        return res.status(404).json({ 
          error: 'Meal plan not found',
          message: 'No meal plan exists for the specified date'
        });
      }
      
      const meals = mealPlanWithRecipes.recipesInMealPlan.map(mpr => ({
        name: mpr.recipe.name,
        mealType: mpr.mealType,
        ingredients: mpr.recipe.ingredients,
        instructions: mpr.recipe.instructions,
        nutritionInfo: mpr.recipe.nutritionInfo,
        imageUrl: mpr.recipe.imageUrl
      }));
      
      return res.json({
        success: true,
        mealPlan: {
          id: mealPlanWithRecipes.id,
          date: mealPlanWithRecipes.date,
          totalCalories: mealPlanWithRecipes.totalCalories,
          meals: meals
        }
      });
    } catch (error) {
      console.error('Error fetching meal plan:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch meal plan',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Add new endpoint to generate grocery list from meal plan
  app.post("/api/meal-plans/:planId/generate-grocery-list", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { planId } = req.params;

      // Get all recipes in the meal plan
      const mealPlanRecipes = await db
        .select({
          recipe: recipes,
          mealType: recipesInMealPlan.mealType,
        })
        .from(recipesInMealPlan)
        .innerJoin(recipes, eq(recipes.id, recipesInMealPlan.recipeId))
        .where(eq(recipesInMealPlan.mealPlanId, parseInt(planId)));

      // Helper function to categorize ingredients
      const categorizeIngredient = (ingredient: string) => {
        const categories = {
          produce: ['lettuce', 'tomato', 'carrot', 'onion', 'garlic', 'potato', 'spinach', 'cucumber'],
          protein: ['chicken', 'beef', 'fish', 'salmon', 'tuna', 'eggs', 'tofu'],
          dairy: ['milk', 'cheese', 'yogurt', 'butter', 'cream'],
          grains: ['rice', 'pasta', 'bread', 'quinoa', 'oats'],
          pantry: ['oil', 'vinegar', 'sauce', 'spice', 'salt', 'pepper'],
        };

        const lowerIngredient = ingredient.toLowerCase();
        for (const [category, items] of Object.entries(categories)) {
          if (items.some(item => lowerIngredient.includes(item))) {
            return category;
          }
        }
        return 'other';
      };

      // Aggregate ingredients from all recipes
      const ingredientMap = new Map<string, { quantity: number; unit: string; category: string }>();
      const servingSize = 1; // Default serving size of 1
      
      for (const { recipe } of mealPlanRecipes) {
        if (!recipe.ingredients) continue;

        for (const ingredient of recipe.ingredients) {
          // Parse ingredient string to extract quantity and unit (assuming format like "2 cups flour")
          const match = ingredient.match(/^(\d*\.?\d*)\s*(\w+)?\s+(.+)$/);
          const quantity = match ? parseFloat(match[1]) || 1 : 1;
          const unit = match ? match[2] || 'unit' : 'unit';
          const name = match ? match[3] : ingredient;

          const existing = ingredientMap.get(name);
          if (existing) {
            existing.quantity += quantity * servingSize;
          } else {
            ingredientMap.set(name, {
              quantity: quantity * servingSize,
              unit,
              category: categorizeIngredient(name),
            });
          }
        }
      }

      // Get meal information
      const mealInfoMap = new Map();
      for (const { recipe, mealType } of mealPlanRecipes) {
        // Get the recipe name and image
        const recipeName = recipe.name || '';
        const recipeImage = recipe.imageUrl || '';
        
        // Store ingredients with their meal info
        if (recipe.ingredients) {
          for (const ingredient of recipe.ingredients) {
            const match = ingredient.match(/^(\d*\.?\d*)\s*(\w+)?\s+(.+)$/);
            const name = match ? match[3] : ingredient;
            mealInfoMap.set(name, { mealType, recipeName, recipeImage });
          }
        }
      }

      // Convert to shopping list items
      const shoppingListResult = await Promise.all(
        Array.from(ingredientMap.entries()).map(([ingredient, details]) => {
          const mealInfo = mealInfoMap.get(ingredient) || { mealType: 'other', recipeName: '', recipeImage: '' };
          return db.insert(shoppingListItems).values({
            userId: req.user.id,
            name: ingredient, 
            quantity: details.quantity.toString(),
            isChecked: false,
            category: details.category
          }).returning();
        })
      );

      res.json(shoppingListResult.map(([item]) => item));
    } catch (error) {
      console.error('Error generating grocery list:', error);
      res.status(500).json({
        error: 'Failed to generate grocery list',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });
  
  // Get shopping list for a specific date
  app.get("/api/shopping-list/:date", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const { date } = req.params;
      const { type = 'day' } = req.query;
      console.log(`Fetching shopping list for date: ${date}, user: ${req.user.id}, type: ${type}`);
      
      if (type === 'week') {
        // Generate weekly shopping list
        const startDate = new Date(date);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        
        console.log(`Generating weekly shopping list from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
        
        const weeklyMealPlans = await db
          .select()
          .from(mealPlans)
          .where(and(
            eq(mealPlans.userId, req.user.id),
            gte(mealPlans.date, startDate.toISOString().split('T')[0]),
            lte(mealPlans.date, endDate.toISOString().split('T')[0])
          ));
        
        console.log(`Found ${weeklyMealPlans.length} meal plans for the week`);
        
        if (weeklyMealPlans.length === 0) {
          return res.json({ items: [], groupedItems: {} });
        }
        
        const allRecipes = [];
        const allMealPlanIds = weeklyMealPlans.map(plan => plan.id);
        
        for (const mealPlanId of allMealPlanIds) {
          const mealPlanRecipes = await db
            .select({
              recipe: recipes,
              mealType: recipesInMealPlan.mealType,
              servingSize: recipesInMealPlan.servingSize
            })
            .from(recipesInMealPlan)
            .innerJoin(recipes, eq(recipesInMealPlan.recipeId, recipes.id))
            .where(eq(recipesInMealPlan.mealPlanId, mealPlanId));
          
          allRecipes.push(...mealPlanRecipes);
        }
        
        console.log(`Found ${allRecipes.length} total recipes for weekly shopping list`);
        
        if (allRecipes.length === 0) {
          return res.json({ items: [], groupedItems: {} });
        }
        
        const weeklyShoppingList = await generateWeeklyShoppingList(allRecipes);
        console.log(`Generated weekly shopping list with ${weeklyShoppingList.items.length} items`);
        
        return res.json(weeklyShoppingList);
      } else {
        // Daily shopping list logic
        const [mealPlan] = await db
          .select()
          .from(mealPlans)
          .where(
            and(
              eq(mealPlans.userId, req.user.id),
              eq(mealPlans.date, date)
            )
          )
          .orderBy(desc(mealPlans.createdAt))
          .limit(1);
        
        if (!mealPlan) {
          console.log(`No meal plan found for date: ${date}`);
          return res.json({ items: [], groupedItems: {} });
        }
        
        console.log(`Found meal plan ID: ${mealPlan.id} for date: ${date}`);
        
        const mealPlanRecipes = await db
          .select({
            recipe: recipes,
            mealType: recipesInMealPlan.mealType,
            servingSize: recipesInMealPlan.servingSize,
          })
          .from(recipesInMealPlan)
          .innerJoin(recipes, eq(recipesInMealPlan.recipeId, recipes.id))
          .where(eq(recipesInMealPlan.mealPlanId, mealPlan.id));
        
        console.log(`Found ${mealPlanRecipes.length} recipes in meal plan`);
      
      // Extract ingredients from all recipes
      const allIngredients: Array<{
        quantity: number;
        unit: string;
        name: string;
        category: string;
      }> = [];
      
      for (const { recipe, servingSize } of mealPlanRecipes) {
        const numericServingSize = parseFloat(servingSize?.toString() || "1");
        
        // Parse ingredients array
        let ingredientsArray: string[] = [];
        if (Array.isArray(recipe.ingredients)) {
          ingredientsArray = recipe.ingredients;
        } else if (typeof recipe.ingredients === 'string') {
          try {
            const parsed = JSON.parse(recipe.ingredients as string);
            if (Array.isArray(parsed)) {
              ingredientsArray = parsed;
            }
          } catch (error) {
            console.log(`Failed to parse ingredients for recipe ${recipe.name}:`, error);
            continue;
          }
        }
        
        // Parse each ingredient
        for (const ingredient of ingredientsArray) {
          const parsed = parseIngredient(ingredient);
          if (parsed) {
            allIngredients.push({
              quantity: parsed.quantity * numericServingSize,
              unit: parsed.unit,
              name: parsed.name,
              category: categorizeIngredient(parsed.name)
            });
          }
        }
      }
      
      // Consolidate ingredients by name and unit
      const consolidatedIngredients = consolidateIngredients(allIngredients);
      
      // Group by category
      const groupedItems: Record<string, Array<any>> = {};
      const items: Array<any> = [];
      
      for (const ingredient of consolidatedIngredients) {
        const item = {
          id: Math.random().toString(36).substr(2, 9),
          name: ingredient.name,
          quantity: formatQuantity(ingredient.quantity, ingredient.unit),
          category: ingredient.category,
          isChecked: false,
          isPurchased: false
        };
        
        items.push(item);
        
        if (!groupedItems[ingredient.category]) {
          groupedItems[ingredient.category] = [];
        }
        groupedItems[ingredient.category].push(item);
        }
        
        console.log(`Generated shopping list with ${items.length} items`);
        res.json({ items, groupedItems });
      }
      
    } catch (error) {
      console.error('Error fetching shopping list:', error);
      res.status(500).json({
        error: 'Failed to fetch shopping list',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });

  // Weekly shopping list generator function
  async function generateWeeklyShoppingList(allRecipes: any[]): Promise<{
    items: Array<{
      id: string;
      name: string;
      quantity: string;
      category: string;
      isChecked: boolean;
    }>;
    groupedItems: Record<string, any[]>;
  }> {
    console.log(`Generating weekly shopping list for ${allRecipes.length} recipes`);
    
    // Parse and collect all ingredients
    const allIngredients: Array<{ quantity: number; unit: string; name: string; category: string }> = [];
    
    for (const recipeData of allRecipes) {
      const recipe = recipeData.recipe;
      
      // Parse recipe ingredients
      let ingredientsArray: string[] = [];
      if (Array.isArray(recipe.ingredients)) {
        ingredientsArray = recipe.ingredients;
      } else if (typeof recipe.ingredients === 'string') {
        try {
          const parsed = JSON.parse(recipe.ingredients);
          if (Array.isArray(parsed)) {
            ingredientsArray = parsed;
          }
        } catch {
          // If parsing fails, split by newlines
          ingredientsArray = recipe.ingredients.split('\n').filter(line => line.trim() !== '');
        }
      }
      
      // Parse each ingredient
      for (const ingredient of ingredientsArray) {
        const parsed = parseIngredient(ingredient);
        allIngredients.push({
          quantity: parsed.quantity,
          unit: parsed.unit,
          name: parsed.name,
          category: categorizeIngredient(parsed.name)
        });
      }
    }
    
    // Consolidate ingredients by name and unit
    const consolidatedIngredients = consolidateIngredients(allIngredients);
    
    // Create shopping list items
    const items = consolidatedIngredients.map(ingredient => ({
      id: Math.random().toString(36).substr(2, 9),
      name: ingredient.name,
      quantity: formatQuantity(ingredient.quantity, ingredient.unit),
      category: ingredient.category,
      isChecked: false
    }));
    
    // Group by category
    const groupedItems: Record<string, any[]> = {};
    for (const item of items) {
      if (!groupedItems[item.category]) {
        groupedItems[item.category] = [];
      }
      groupedItems[item.category].push(item);
    }
    
    console.log(`Created weekly shopping list with ${items.length} items in ${Object.keys(groupedItems).length} categories`);
    
    return { items, groupedItems };
  }

  // Helper functions for shopping list processing
  function parseIngredient(ingredient: string): { quantity: number; unit: string; name: string } | null {
    if (!ingredient || typeof ingredient !== 'string') return null;
    
    // Remove extra whitespace and normalize
    const cleaned = ingredient.trim();
    if (!cleaned) return null;
    
    // Match patterns like "100g flour", "2 cups milk", "1 łyżka oleju"
    const match = cleaned.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Złąćęłńóśźż]*)\s+(.+)$/);
    
    if (match) {
      const [, quantityStr, unit, name] = match;
      return {
        quantity: parseFloat(quantityStr),
        unit: unit || 'szt',
        name: name.trim()
      };
    }
    
    // If no quantity found, assume 1 piece
    return {
      quantity: 1,
      unit: 'szt',
      name: cleaned
    };
  }

  function categorizeIngredient(name: string): string {
    const lowerName = name.toLowerCase();
    
    // Polish ingredient categories
    if (lowerName.includes('mleko') || lowerName.includes('ser') || lowerName.includes('twaróg') || 
        lowerName.includes('masło') || lowerName.includes('śmietana') || lowerName.includes('jogurt')) {
      return 'Nabiał';
    }
    
    if (lowerName.includes('mięso') || lowerName.includes('kurczak') || lowerName.includes('wołowina') || 
        lowerName.includes('wieprzowina') || lowerName.includes('szynka') || lowerName.includes('łosoś') ||
        lowerName.includes('tuńczyk') || lowerName.includes('ryba')) {
      return 'Mięso i ryby';
    }
    
    if (lowerName.includes('pomidor') || lowerName.includes('ogórek') || lowerName.includes('cebula') || 
        lowerName.includes('marchewka') || lowerName.includes('papryka') || lowerName.includes('sałata') ||
        lowerName.includes('kapusta') || lowerName.includes('ziemniak')) {
      return 'Warzywa';
    }
    
    if (lowerName.includes('jabłko') || lowerName.includes('banan') || lowerName.includes('pomarańcza') || 
        lowerName.includes('truskawka') || lowerName.includes('winogrona') || lowerName.includes('jagody')) {
      return 'Owoce';
    }
    
    if (lowerName.includes('chleb') || lowerName.includes('mąka') || lowerName.includes('makaron') || 
        lowerName.includes('ryż') || lowerName.includes('płatki') || lowerName.includes('kasza')) {
      return 'Pieczywo i zboża';
    }
    
    if (lowerName.includes('olej') || lowerName.includes('oliwa') || lowerName.includes('ocet') || 
        lowerName.includes('sól') || lowerName.includes('pieprz') || lowerName.includes('cukier') ||
        lowerName.includes('miód') || lowerName.includes('sos')) {
      return 'Przyprawy i dodatki';
    }
    
    return 'Inne';
  }

  function consolidateIngredients(ingredients: Array<{ quantity: number; unit: string; name: string; category: string }>) {
    const consolidated: Record<string, { quantity: number; unit: string; name: string; category: string }> = {};
    
    for (const ingredient of ingredients) {
      const key = `${ingredient.name.toLowerCase()}-${ingredient.unit}`;
      
      if (consolidated[key]) {
        consolidated[key].quantity += ingredient.quantity;
      } else {
        consolidated[key] = { ...ingredient };
      }
    }
    
    return Object.values(consolidated);
  }

  function formatQuantity(quantity: number, unit: string): string {
    // Round to reasonable precision
    const rounded = Math.round(quantity * 100) / 100;
    
    if (unit === 'szt' && rounded === 1) {
      return '1 szt';
    }
    
    return `${rounded} ${unit}`;
  }

  // Get prices for a shopping list at a specific location
  app.get("/api/shopping-list/:date/prices/:locationId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const { date, locationId } = req.params;
      
      // Get all shopping list items for the user
      const items = await db
        .select()
        .from(shoppingListItems)
        .where(eq(shoppingListItems.userId, req.user.id));
      
      if (!items.length) {
        return res.json({ items: [], totalPrice: 0 });
      }
      
      // Price multiplier based on location (in a real app, this would use a pricing API)
      const locationPriceMultipliers: Record<string, number> = {
        "walmart": 0.8,
        "target": 0.9,
        "wholeFoods": 1.5,
        "kroger": 1.0,
        "costco": 0.7
      };
      
      const multiplier = locationPriceMultipliers[locationId] || 1.0;
      
      // For simplicity, we'll use the same base price for all items
      const basePrice = 2.99;
      
      // Apply location-specific pricing to each item
      const pricedItems = items.map(item => {
        const price = parseFloat((basePrice * multiplier * parseFloat(item.quantity.toString())).toFixed(2));
        
        return {
          ...item,
          price,
          location: locationId
        };
      });
      
      // Calculate total price
      const totalPrice = pricedItems.reduce((sum, item) => sum + (item.price || 0), 0);
      
      res.json({
        items: pricedItems,
        totalPrice: parseFloat(totalPrice.toFixed(2)),
        location: locationId
      });
    } catch (error) {
      console.error('Error fetching prices for location:', error);
      res.status(500).json({
        error: 'Failed to fetch prices',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });
  
  // Update shopping list item with price from a specific location
  app.post("/api/shopping-list/items/:itemId/price", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const { itemId } = req.params;
      const { price, location } = req.body;
      
      if (typeof price !== 'number' || !location) {
        return res.status(400).json({ error: 'Price and location are required' });
      }
      
      // Get the item first
      const [item] = await db
        .select()
        .from(shoppingListItems)
        .where(eq(shoppingListItems.id, parseInt(itemId)))
        .limit(1);
      
      if (!item) {
        return res.status(404).json({ error: 'Shopping list item not found' });
      }
      
      // Return the item with the calculated price, but don't update the DB
      // since our schema doesn't have those columns
      const updatedItem = {
        ...item,
        price: price,
        location: location
      };
      
      res.json(updatedItem);
    } catch (error) {
      console.error('Error updating item price:', error);
      res.status(500).json({
        error: 'Failed to update item price',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });

  // Add food log endpoint (updated with enhanced logging)
  app.post("/api/food-logs", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        console.error('[Food Logs API] Unauthorized attempt to add food log');
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { name, calories, protein, carbs, fat, image, date, components, isAnalyzing } = req.body;
      console.log('[Food Logs API] Processing food log request:', {
        userId: req.user.id,
        name,
        hasImage: !!image,
        hasComponents: Array.isArray(components),
        isAnalyzing: isAnalyzing,
        isPlaceholder: !!isAnalyzing
      });

      if (!name || calories === undefined) {
        console.error('[Food Logs API] Missing required fields:', { name: !!name, calories: !!calories });
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'Name and calories are required'
        });
      }

      // Parse the date from the request or use current date
      const rawDate = date ? new Date(date) : new Date();
      
      // Normalize the date to avoid timezone issues by extracting YYYY-MM-DD
      const dateString = rawDate.toISOString().split('T')[0];
      const logDate = new Date(`${dateString}T12:00:00.000Z`); // Use noon to avoid timezone edge cases
      
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
        userId: req.user.id,
        name: analyzedName, // Use the analyzed name here instead of original name
        componentsCount: processedComponents.length
      });

      // Insert the food log with detailed components
      const [mainLog] = await db
        .insert(foodLogs)
        .values({
          userId: req.user.id,
          name: analyzedName, // Use the analyzed name here instead of original name
          calories: totalCalories.toString(),
          protein: totalProtein.toString(),
          carbs: totalCarbs.toString(),
          fat: totalFat.toString(),
          image: image || null,
          date: logDate,
          components: processedComponents
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
            eq(foodLogs.userId, req.user.id),
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
  app.get("/api/food-logs", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        console.error('[Food Logs API] Unauthorized attempt to fetch food logs');
        return res.status(401).json({ error: 'Authentication required' });
      }

      const requestedDate = req.query.date ? new Date(req.query.date as string) : new Date();
      
      // Convert requested date string to YYYY-MM-DD format to normalize timezone issues
      const dateString = requestedDate.toISOString().split('T')[0];
      
      // Create date range for the requested day (UTC-agnostic)
      const startOfDay = new Date(`${dateString}T00:00:00.000Z`);
      const endOfDay = new Date(`${dateString}T23:59:59.999Z`);

      console.log('[Food Logs API] Fetching logs for date range:', {
        userId: req.user.id,
        dateRequested: dateString,
        start: startOfDay.toISOString(),
        end: endOfDay.toISOString()
      });

      const logs = await db
        .select()
        .from(foodLogs)
        .where(
          and(
            eq(foodLogs.userId, req.user.id),
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
  app.put("/api/food-logs/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        console.error('[Food Logs API] Unauthorized attempt to update food log');
        return res.status(401).json({ error: 'Authentication required' });
      }

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
            eq(foodLogs.userId, req.user.id)
          )
        )
        .limit(1);

      if (!existingLog) {
        return res.status(404).json({ error: 'Food log not found or access denied' });
      }

      const { name, calories, protein, carbs, fat, components } = req.body;
      
      console.log('[Food Logs API] Updating food log:', {
        logId,
        userId: req.user.id,
        name,
        hasComponents: Array.isArray(components)
      });

      // Ensure required fields are present
      if (!name || calories === undefined) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'Name and calories are required'
        });
      }

      // Update the food log
      const [updatedLog] = await db
        .update(foodLogs)
        .set({
          name,
          calories: calories.toString(),
          protein: protein.toString(),
          carbs: carbs.toString(),
          fat: fat.toString(),
          components: components || existingLog.components
        })
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
            eq(foodLogs.userId, req.user.id),
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

  // Add new shopping list item
  app.post("/api/shopping-list-items", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const { name, quantity, category = 'other' } = req.body;
      
      if (!name || !quantity) {
        return res.status(400).json({ error: 'Name and quantity are required' });
      }
      
      // Insert new shopping list item
      const [newItem] = await db
        .insert(shoppingListItems)
        .values({
          name,
          quantity: quantity.toString(),
          isChecked: false,
          userId: req.user.id,
          category
        })
        .returning();
      
      res.json(newItem);
    } catch (error) {
      console.error('Error adding shopping list item:', error);
      res.status(500).json({
        error: 'Failed to add shopping list item',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });

  

  // DELETE endpoint for removing a food log
  app.delete("/api/food-logs/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        console.error('[Food Logs API] Unauthorized attempt to delete food log');
        return res.status(401).json({ error: 'Authentication required' });
      }

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
            eq(foodLogs.userId, req.user.id)
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
  app.get("/api/food-logs/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        console.error('[Food Logs API] Unauthorized attempt to fetch food log by ID');
        return res.status(401).json({ error: 'Authentication required' });
      }

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
            eq(foodLogs.userId, req.user.id)
          )
        );

      if (!foodLog) {
        console.error('[Food Logs API] Food log not found or unauthorized:', { logId, userId: req.user.id });
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

  // Generate motivational content for onboarding vision board
  app.post("/api/generate-motivation", async (req, res) => {
    try {
      const { dreamDescription, goals, customGoal } = req.body;
      
      if (!dreamDescription) {
        return res.status(400).json({ 
          error: 'Dream description is required' 
        });
      }

      // Import OpenAI
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ 
        apiKey: process.env.OPENAI_API_KEY 
      });

      // Combine selected goals and custom goal for context
      let goalContext = '';
      if (goals && Array.isArray(goals) && goals.length > 0) {
        const goalTranslations = {
          weight_loss: 'utrata wagi',
          muscle_gain: 'budowa mięśni', 
          energy_boost: 'więcej energii',
          health_improve: 'poprawa zdrowia',
          confidence_boost: 'pewność siebie',
          lifestyle_change: 'zmiana stylu życia'
        };
        goalContext = goals.map(g => goalTranslations[g] || g).join(', ');
      }
      
      if (customGoal && customGoal.trim()) {
        goalContext = goalContext ? `${goalContext}, ${customGoal}` : customGoal;
      }

      const prompt = `Na podstawie opisu marzeń: "${dreamDescription}" i celów: "${goalContext}"

Wygeneruj krótką, motywującą wiadomość (maksymalnie 15 słów) bez emotikon i symboli.

Odpowiedz tylko treścią wiadomości w języku polskim.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "Tworzysz bardzo krótkie motywacyjne zdania. Maksymalnie 15 słów. Bez emotikon. Prostym językiem."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 25,
        temperature: 0.7
      });

      const motivationalContent = response.choices[0].message.content?.trim() || null;
      
      res.json({ motivation: motivationalContent });
    } catch (error) {
      console.error('Error generating motivational content:', error);
      res.status(500).json({ 
        error: 'Failed to generate motivational content',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Vision board endpoint for fetching stored vision board data
  app.post("/api/vision-board", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      console.log('[Vision Board API] Fetching vision board for user:', req.user.id);

      // Get user's nutrition preferences and profile
      const userProfile = await db
        .select()
        .from(userNutritionPreferences)
        .where(eq(userNutritionPreferences.userId, req.user.id))
        .limit(1);

      if (!userProfile.length) {
        return res.status(404).json({ 
          error: 'User profile not found. Please complete onboarding first.' 
        });
      }

  const profile = userProfile[0];

  // Calculate macros based on stored preferences (camelCase fields in schema)
  const calories = Number(profile.caloriesGoal) || 2000;
  const proteinPercentage = (Number(profile.proteinGoal) || 30) / 100;
  const carbsPercentage = (Number(profile.carbsGoal) || 40) / 100;
  const fatPercentage = (Number(profile.fatGoal) || 30) / 100;

      const macros = {
        calories: calories,
        protein: Math.round((calories * proteinPercentage) / 4),
        carbs: Math.round((calories * carbsPercentage) / 4),
        fat: Math.round((calories * fatPercentage) / 9)
      };

      // Create a simple timeline based on weight goals
      const timeline = [];
      for (let week = 1; week <= 12; week++) {
        timeline.push({
          week: week,
          weight: profile.currentWeight ? parseFloat(profile.currentWeight as any) : 70,
          goal: `Tydzień ${week}`,
          energy: 85 + (week * 2) // Gradual energy increase
        });
      }

      // Generate motivation content
      const motivation = {
        title: "Twoja ścieżka do sukcesu",
        tips: [
          "Jedz regularnie co 3-4 godziny",
          "Pij minimum 2 litry wody dziennie", 
          "Śpij 7-8 godzin każdej nocy",
          "Ruszaj się codziennie minimum 30 minut"
        ],
        inspiration: "Każdy dzień to nowa okazja do dbania o siebie. Małe kroki prowadzą do wielkich zmian!"
      };

      // Personal data from profile
      const personalData = {
        age: 25, // Default if not available
        gender: "unspecified",
  currentWeight: profile.currentWeight ? parseFloat(profile.currentWeight as any) : 70,
  goalWeight: profile.goalWeight ? parseFloat(profile.goalWeight as any) : 70,
  height: profile.height ? Number(profile.height) : 170,
        activityLevel: "moderate",
        weightGoal: "maintain",
        perfectGoal: "health_improvement"
      };

      const visionBoardData = {
        macros,
        timeline,
        motivation,
        personalData
      };

      console.log('[Vision Board API] Generated vision board data for user:', req.user.id);
      
      res.json({
        success: true,
        visionBoard: visionBoardData
      });

    } catch (error) {
      console.error('[Vision Board API] Error fetching vision board:', error);
      res.status(500).json({
        error: 'Failed to fetch vision board data',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Add meal image upload endpoint
  app.post("/api/food-logs/:id/image", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        console.error('[Food Logs API] Unauthorized attempt to upload meal image');
        return res.status(401).json({ error: 'Authentication required' });
      }

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
            eq(foodLogs.userId, req.user.id)
          )
        );

      if (!existingLog) {
        console.error('[Food Logs API] Food log not found or unauthorized:', { logId, userId: req.user.id });
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
                eq(foodLogs.userId, req.user.id)
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

  // Add water logs endpoints
  app.post("/api/water-logs", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { amount } = req.body;
      if (typeof amount !== 'number') {
        return res.status(400).json({
          error: 'Invalid amount',
          message: 'Amount must be a number'
        });
      }

      // Normalize date to avoid timezone issues
      const today = new Date();
      const dateString = today.toISOString().split('T')[0];
      const normalizedDate = new Date(`${dateString}T12:00:00.000Z`);
      
      // Add water intake as a special type of food log (store in components)
      const [log] = await db
        .insert(foodLogs)
        .values({
          userId: req.user.id,
          name: "Water Intake",
          calories: "0",
          protein: "0",
          carbs: "0",
          fat: "0",
          date: normalizedDate,
          components: [
            {
              name: "water",
              calories: 0,
              protein: 0,
              carbs: 0,
              fat: 0,
              quantity: amount,
              servingSize: "ml",
              details: { type: "water" }
            }
          ]
        })
        .returning();

      res.json({ success: true, log });
    } catch (error) {
      console.error('Error adding water log:', error);
      res.status(500).json({
        error: 'Failed to add water log',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  // Add like/unlike recipe endpoint
  app.post("/api/recipes/:id/toggle-like", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const recipeId = parseInt(req.params.id);

      // Check if recipe exists
      const [recipe] = await db
        .select()
        .from(recipes)
        .where(eq(recipes.id, recipeId))
        .limit(1);

      if (!recipe) {
        return res.status(404).json({ error: 'Recipe not found' });
      }

      // Check if user already liked the recipe
      const [existingLike] = await db
        .select()
        .from(recipeLikes)
        .where(
          and(
            eq(recipeLikes.userId, req.user.id),
            eq(recipeLikes.recipeId, recipeId)
          )
        )
        .limit(1);

      if (existingLike) {
        // Unlike: remove like and decrease count
        await db
          .delete(recipeLikes)
          .where(eq(recipeLikes.id, existingLike.id));

        await db
          .update(recipes)
          .set({ likesCount: sql`${recipes.likesCount} - 1` })
          .where(eq(recipes.id, recipeId));
      } else {
        // Like: add like and increase count
        await db
          .insert(recipeLikes)
          .values({
            userId: req.user.id,
            recipeId: recipeId,
          });

        await db
          .update(recipes)
          .set({ likesCount: sql`${recipes.likesCount} + 1` })
          .where(eq(recipes.id, recipeId));
      }

      // Get updated recipe with like status
      const updatedRecipe = await db
        .select({
          ...recipes,
          isLiked: sql`EXISTS(
            SELECT 1 FROM ${recipeLikes} 
            WHERE ${recipeLikes.recipeId} = ${recipes.id} 
            AND ${recipeLikes.userId} = ${req.user.id}
          )`,
        })
        .from(recipes)
        .where(eq(recipes.id, recipeId))
        .limit(1)
        .then(rows => rows[0]);

      res.json(updatedRecipe);
    } catch (error) {
      console.error('Error toggling recipe like:', error);
      res.status(500).json({
        error: 'Failed to toggle recipe like',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  // Add profile image upload endpoint
  app.post("/api/user/profile-image", handleUpload, async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
      }

      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(process.cwd(), 'uploads');
      await fs.mkdir(uploadsDir, { recursive: true });

      // Process and save the image
      const filename = `profile-${req.user.id}-${Date.now()}.jpg`;
      const filepath = path.join(uploadsDir, filename);

      await sharp(req.file.buffer)
        .resize(400, 400, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 90 })
        .toFile(filepath);

      // Update user profile with new image URL
      const imageUrl = `/uploads/${filename}`;
      await db
        .update(users)
        .set({ profileImage: imageUrl, hasCompletedOnboarding: true })
        .where(eq(users.id, req.user.id));

      res.json({ imageUrl });
    } catch (error) {
      console.error('Error uploading profile image:', error);
      res.status(500).json({
        error: 'Failed to upload profile image',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Add dietary preferences endpoint
  app.post("/api/user/dietary-preferences", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      console.log("Received dietary preferences request:", req.body);

      const { 
        dietaryType, 
        calorieTarget, 
        mealsPerDay, 
        maxCookingTime, 
        budgetPreference,
        allergies,
        excludedIngredients,
        preferredIngredients,
        healthGoals,
        cuisinePreferences,
        cookingSkillLevel,
        mealPlanDuration,
        weekdayVsWeekend,
        cookingEquipment,
        specialRequirements
      } = req.body;

      if (!calorieTarget) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'Calorie target is required'
        });
      }

      // Calculate macros based on calorie target
      const proteinGoal = Math.round(calorieTarget * 0.3 / 4); // 30% of calories from protein
      const carbsGoal = Math.round(calorieTarget * 0.4 / 4);   // 40% of calories from carbs
      const fatGoal = Math.round(calorieTarget * 0.3 / 9);     // 30% of calories from fat

      console.log("Calculated goals:", {
        calorieTarget,
        proteinGoal,
        carbsGoal,
        fatGoal
      });

      let nutritionPreferences;
      let dietaryPreferences;

      // Save nutrition preferences
      try {
        // Try to insert new nutrition preferences
        const [prefs] = await db
          .insert(userNutritionPreferences)
          .values({
            userId: req.user.id,
            currentWeight: "70", // Default value
            goalWeight: "70",    // Default value
            weightGoal: "maintain",
            activityLevel: "moderate",
            caloriesGoal: calorieTarget,
            proteinGoal,
            carbsGoal,
            fatGoal,
            updatedAt: new Date()
          })
          .returning();
        
        nutritionPreferences = prefs;
        console.log("Inserted nutrition preferences:", prefs);
      } catch (dbError) {
        console.log("Nutrition preferences insert failed, attempting update:", dbError);

        // If insert fails due to unique constraint, try update
        const [updatedPrefs] = await db
          .update(userNutritionPreferences)
          .set({
            caloriesGoal: calorieTarget,
            proteinGoal,
            carbsGoal,
            fatGoal,
            updatedAt: new Date()
          })
          .where(eq(userNutritionPreferences.userId, req.user.id))
          .returning();

        nutritionPreferences = updatedPrefs;
        console.log("Updated nutrition preferences:", updatedPrefs);
      }

      // Save detailed dietary preferences - merged with nutrition preferences for now
      try {
        // Store dietary information in the nutrition preferences
        // This ensures we don't lose the important information while fixing the table issue
        const dietPrefs = {
          dietaryType: dietaryType || 'balanced',
          calorieTarget: calorieTarget || 2000,
          mealsPerDay: mealsPerDay || 3,
          maxCookingTime: maxCookingTime || 60,
          budgetPreference: budgetPreference || 'medium',
          allergies: allergies || [],
          excludedIngredients: excludedIngredients || [],
          preferredIngredients: preferredIngredients || [],
          // Add the quiz-specific fields that were missing
          healthGoals: healthGoals || [],
          cuisinePreferences: cuisinePreferences || [],
          cookingSkillLevel: cookingSkillLevel || 'intermediate'
        };
        
        // IMPORTANT: Save to userDietaryPreferences table (not just userNutritionPreferences)
        // This is where the meal plan generator looks for preferences
        try {
          // Try to insert new dietary preferences
          const [newDietPrefs] = await db
            .insert(userDietaryPreferences)
            .values({
              userId: req.user.id,
              dietaryType: dietPrefs.dietaryType,
              calorieTarget: dietPrefs.calorieTarget,
              mealsPerDay: dietPrefs.mealsPerDay,
              allergies: dietPrefs.allergies,
              excludedIngredients: dietPrefs.excludedIngredients,
              preferredIngredients: dietPrefs.preferredIngredients,
              maxCookingTime: dietPrefs.maxCookingTime,
              budgetPreference: dietPrefs.budgetPreference,
              healthGoals: typeof healthGoals === 'string' ? healthGoals : JSON.stringify(healthGoals || []),
              cuisinePreferences: typeof cuisinePreferences === 'string' ? cuisinePreferences : JSON.stringify(cuisinePreferences || []),
              cookingSkillLevel: dietPrefs.cookingSkillLevel,
              updatedAt: new Date()
            })
            .returning();
          
          dietaryPreferences = newDietPrefs;
          console.log("Inserted dietary preferences with quiz answers:", newDietPrefs);
        } catch (insertError) {
          console.log("Dietary preferences insert failed, attempting update:", insertError);
          
          // If insert fails, update existing record
          const [updatedDietPrefs] = await db
            .update(userDietaryPreferences)
            .set({
              dietaryType: dietPrefs.dietaryType,
              calorieTarget: dietPrefs.calorieTarget,
              mealsPerDay: dietPrefs.mealsPerDay,
              allergies: dietPrefs.allergies,
              excludedIngredients: dietPrefs.excludedIngredients,
              preferredIngredients: dietPrefs.preferredIngredients,
              maxCookingTime: dietPrefs.maxCookingTime,
              budgetPreference: dietPrefs.budgetPreference,
              healthGoals: typeof healthGoals === 'string' ? healthGoals : JSON.stringify(healthGoals || []),
              cuisinePreferences: typeof cuisinePreferences === 'string' ? cuisinePreferences : JSON.stringify(cuisinePreferences || []),
              cookingSkillLevel: dietPrefs.cookingSkillLevel,
              updatedAt: new Date()
            })
            .where(eq(userDietaryPreferences.userId, req.user.id))
            .returning();
          
          dietaryPreferences = updatedDietPrefs;
          console.log("Updated dietary preferences with quiz answers:", updatedDietPrefs);
        }
        
        // Also update the userNutritionPreferences for backwards compatibility
        const [updatedPrefs] = await db
          .update(userNutritionPreferences)
          .set({
            dietaryRestrictions: [dietPrefs.dietaryType],
            caloriesGoal: dietPrefs.calorieTarget,
            mealsPerDay: dietPrefs.mealsPerDay,
            allergies: dietPrefs.allergies,
            mealBudget: dietPrefs.budgetPreference,
            updatedAt: new Date()
          })
          .where(eq(userNutritionPreferences.userId, req.user.id))
          .returning();
        
        console.log("Also updated nutrition preferences for backwards compatibility");
      } catch (dietaryError) {
        console.error("Error saving dietary preferences:", dietaryError);
        // Continue even if there's an error with dietary preferences
      }

      // Return the combined preferences
      res.json({
        nutritionPreferences,
        dietaryPreferences
      });
    } catch (error) {
      console.error('Error saving dietary preferences:', error);
      res.status(500).json({
        error: 'Failed to save dietary preferences',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Add complete recipe endpoint
  app.post("/api/meal-plans/:mealPlanId/recipes/:recipeId/complete", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const mealPlanId = parseInt(req.params.mealPlanId);
      const recipeId = parseInt(req.params.recipeId);

      console.log('Completing meal:', { mealPlanId, recipeId, userId: req.user.id });

      // First verify the meal plan belongs to the user
      const [mealPlan] = await db
        .select()
        .from(mealPlans)
        .where(
          and(
            eq(mealPlans.id, mealPlanId),
            eq(mealPlans.userId, req.user.id)
          )
        );

      if (!mealPlan) {
        return res.status(404).json({ error: 'Meal plan not found' });
      }

      // Check if the recipe exists in the mealplan and hasn't been completed
      const [existingMealRecipe] = await db
        .select()
        .from(recipesInMealPlan)
        .where(
          and(
            eq(recipesInMealPlan.mealPlanId, mealPlanId),
            eq(recipesInMealPlan.recipeId, recipeId)
          )
        );

      if (!existingMealRecipe) {
        return res.status(404).json({
          error: 'Recipe not found in meal plan',
          message: 'The specified recipe was not found in your meal plan'
        });
      }

      if (existingMealRecipe.isCompleted) {
        return res.status(400).json({
          error: 'Already completed',
          message: 'This meal has already been marked as eaten'
        });
      }

      // Get the recipe details
      const [recipe] = await db
        .select()
        .from(recipes)
        .where(eq(recipes.id, recipeId));

      if (!recipe) {
        return res.status(404).json({ error: 'Recipe not found' });
      }

      // Update the recipe as completed in meal plan
      await db
        .update(recipesInMealPlan)
        .set({
          isCompleted: true,
          completedAt: new Date()
        })
        .where(
          and(
            eq(recipesInMealPlan.mealPlanId, mealPlanId),
            eq(recipesInMealPlan.recipeId, recipeId)
          )
        );

      // Create structured components from recipe ingredients
      const formattedComponents = [];
      
      // First create a main component representing the whole dish
      const mainComponent = {
        name: recipe.name,
        calories: Number(recipe.nutritionInfo?.calories || 0),
        protein: Number(recipe.nutritionInfo?.protein || 0),
        carbs: Number(recipe.nutritionInfo?.carbs || 0),
        fat: Number(recipe.nutritionInfo?.fat || 0),
        servingSize: '1 serving',
        quantity: 1,
        details: {
          type: existingMealRecipe.mealType || 'main dish',
          preparation: 'as recipe',
          texture: 'as prepared',
          estimatedWeight: '1 serving'
        }
      };
      formattedComponents.push(mainComponent);
      
      // Then add individual ingredient components
      if (Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0) {
        // For each ingredient, create a component with a portion of the total nutrition
        const ingredientCount = recipe.ingredients.length;
        const caloriesPerIngredient = Math.round((recipe.nutritionInfo?.calories || 0) / ingredientCount);
        const proteinPerIngredient = Math.round((recipe.nutritionInfo?.protein || 0) / ingredientCount);
        const carbsPerIngredient = Math.round((recipe.nutritionInfo?.carbs || 0) / ingredientCount);
        const fatPerIngredient = Math.round((recipe.nutritionInfo?.fat || 0) / ingredientCount);
        
        recipe.ingredients.forEach((ingredient, index) => {
          // Try to parse ingredient quantities
          const match = ingredient.match(/^(\d*\.?\d*)\s*(\w+)?\s+(.+)$/);
          const quantity = match ? parseFloat(match[1]) || 1 : 1;
          const unit = match && match[2] ? match[2] : 'serving';
          const ingredientName = match && match[3] ? match[3] : ingredient;
          
          formattedComponents.push({
            name: ingredientName,
            calories: caloriesPerIngredient,
            protein: proteinPerIngredient,
            carbs: carbsPerIngredient,
            fat: fatPerIngredient,
            servingSize: `${quantity} ${unit}`,
            quantity: quantity,
            details: {
              type: 'ingredient',
              preparation: 'as used in recipe',
              estimatedWeight: `${quantity} ${unit}`
            }
          });
        });
      }
      
      // Normalize date to avoid timezone issues
      const today = new Date();
      const dateString = today.toISOString().split('T')[0];
      const normalizedDate = new Date(`${dateString}T12:00:00.000Z`);
      
      // Add to food logs with proper type conversion and structured components
      await db.insert(foodLogs).values({
        userId: req.user.id,
        date: normalizedDate,
        name: recipe.name,
        calories: Number(recipe.nutritionInfo?.calories || 0).toString(),
        protein: Number(recipe.nutritionInfo?.protein || 0).toString(),
        carbs: Number(recipe.nutritionInfo?.carbs || 0).toString(),
        fat: Number(recipe.nutritionInfo?.fat || 0).toString(),
        image: recipe.imageUrl || null,
        components: formattedComponents,
        description: `Completed from meal plan: ${recipe.name}`
      });

      res.json({
        success: true,
        message: 'Meal marked as completed successfully'
      });
    } catch (error) {
      console.error('Error completing recipe:', error);
      res.status(500).json({
        error: 'Failed to complete recipe',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });

  // Add the profile route to the existing routes
  app.get("/api/user/profile", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Get nutrition preferences (latest entry first)
      const preferences = await db
        .select()
        .from(userNutritionPreferences)
        .where(eq(userNutritionPreferences.userId, req.user.id))
        .orderBy(desc(userNutritionPreferences.updatedAt))
        .limit(1);

      if (!preferences || preferences.length === 0) {
        return res.status(404).json({ error: "Profile not found" });
      }

      // Get latest weight log if available
      let latestWeightLog = null;
      try {
        const weightLogEntries = await db
          .select()
          .from(weightLogs)
          .where(eq(weightLogs.userId, req.user.id))
          .orderBy(desc(weightLogs.loggedAt))
          .limit(1);
          
        if (weightLogEntries.length > 0) {
          latestWeightLog = weightLogEntries[0];
          console.log("Latest weight log found:", latestWeightLog);
        }
      } catch (weightErr) {
        console.error("Error fetching weight logs:", weightErr);
        // Continue without weight log data
      }

      // Return combined data with more detailed logging
      const profile = {
        ...preferences[0],
        // Override with latest weight log if available
        currentWeight: latestWeightLog?.weight?.toString() || preferences[0].currentWeight?.toString(),
        latestWeightLog: latestWeightLog ? {
          weight: latestWeightLog.weight,
          loggedAt: latestWeightLog.loggedAt,
          notes: latestWeightLog.notes
        } : null
      };
      
      console.log("Returning profile data:", JSON.stringify(profile));
      res.json(profile);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  // Update user profile
  app.put("/api/user/profile", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { 
        height, 
        weight, 
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
      
      console.log("Received profile update request:", req.body);
      
      // Validate height (typical range 50-250 cm)
      if (height !== undefined && 
          (isNaN(Number(height)) || 
           Number(height) < 50 || 
           Number(height) > 250)) {
        return res.status(400).json({ error: "Height must be a number between 50 and 250 cm" });
      }
      
      // Validate weight (typical range 20-500 kg)
      if (weight !== undefined && 
          (isNaN(Number(weight)) || 
           Number(weight) < 20 || 
           Number(weight) > 500)) {
        return res.status(400).json({ error: "Weight must be a number between 20 and 500 kg" });
      }
      
      // Body fat percentage validation removed - column doesn't exist yet

      // Find the user's nutrition preferences
      const preferences = await db
        .select()
        .from(userNutritionPreferences)
        .where(eq(userNutritionPreferences.userId, req.user.id));

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

      // Update the user's nutrition preferences
      const updatedPreferences = await db
        .update(userNutritionPreferences)
        .set({
          height: height !== undefined ? height : preferences[0].height,
          currentWeight: weight !== undefined ? weight : preferences[0].currentWeight,
          goalWeight: goalWeight !== undefined ? goalWeight : preferences[0].goalWeight,
          // Add nutrition goal fields (stored as percentages)
          caloriesGoal: calories,
          proteinGoal: proteinPercentage,
          carbsGoal: carbsPercentage,
          fatGoal: fatPercentage,
          // Add weight goal and activity level
          weightGoal: weightGoal !== undefined ? weightGoal : preferences[0].weightGoal,
          activityLevel: activityLevel !== undefined ? activityLevel : preferences[0].activityLevel,
          // Add body analysis fields
          bodyFatPercentage: bodyFatPercentage !== undefined ? bodyFatPercentage : preferences[0].bodyFatPercentage,
          bodyType: bodyType !== undefined ? bodyType : preferences[0].bodyType,
          updatedAt: new Date(),
        })
        .where(eq(userNutritionPreferences.userId, req.user.id))
        .returning();

      res.json(updatedPreferences[0]);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // Weight logs endpoints
  app.get("/api/weight-logs", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      console.log('[Weight Logs API] Fetching weight logs for user:', req.user.id);
      
      const logs = await db
        .select()
        .from(weightLogs)
        .where(eq(weightLogs.userId, req.user.id))
        .orderBy(desc(weightLogs.loggedAt));
      
      console.log('[Weight Logs API] Retrieved logs count:', logs.length);
      
      res.json(logs);
    } catch (error) {
      console.error('[Weight Logs API] Error fetching weight logs:', error);
      res.status(500).json({
        error: 'Failed to fetch weight logs',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post("/api/weight-logs", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { weight, note, notes } = req.body;
      // Support both field names for compatibility
      const noteContent = notes || note;
      console.log('[Weight Logs API] Adding weight log:', { userId: req.user.id, weight, notes: noteContent });
      
      if (typeof weight !== 'number' || isNaN(weight)) {
        console.error('[Weight Logs API] Invalid weight value:', weight);
        return res.status(400).json({
          error: 'Invalid weight',
          message: 'Weight must be a valid number'
        });
      }

      // Normalize date to avoid timezone issues
      const today = new Date();
      const dateString = today.toISOString().split('T')[0];
      const normalizedDate = new Date(`${dateString}T12:00:00.000Z`);
      
      // Insert the weight log
      const [log] = await db
        .insert(weightLogs)
        .values({
          userId: req.user.id,
          weight: weight.toString(), // Convert to string for storage as decimal
          notes: noteContent || null,
          loggedAt: normalizedDate
        })
        .returning();
      
      console.log('[Weight Logs API] Weight log added successfully:', log);
      
      // Also update the user preferences with current weight
      const preferences = await db
        .select()
        .from(userNutritionPreferences)
        .where(eq(userNutritionPreferences.userId, req.user.id));
      
      if (preferences && preferences.length > 0) {
        console.log('[Weight Logs API] Updating user nutrition preferences with new weight');
        await db
          .update(userNutritionPreferences)
          .set({
            currentWeight: weight.toString(),
            updatedAt: new Date()
          })
          .where(eq(userNutritionPreferences.userId, req.user.id));
      }
      
      // Return the log and updated preferences
      res.json({
        log,
        preferences: {
          weight: weight.toString(),
          goalWeight: preferences?.[0]?.goalWeight?.toString() || null
        }
      });
    } catch (error) {
      console.error('[Weight Logs API] Error adding weight log:', error);
      res.status(500).json({
        error: 'Failed to add weight log',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Delete user account with full dependency cleanup
  app.delete("/api/user/account", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const userId = req.user.id;
    console.log(`[Account Deletion] Initiating deletion for user ${userId}`);

    try {
      await db.transaction(async (tx) => {
        // 1. Collect meal plan IDs (needed for junction & shopping items cleanup)
        const mealPlanIds = await tx
          .select({ id: mealPlans.id })
          .from(mealPlans)
          .where(eq(mealPlans.userId, userId));
        const mealPlanIdValues = mealPlanIds.map(mp => mp.id);

        // 1b. Collect recipe IDs owned by the user (needed for likes/comments cleanup and junctions)
        const ownedRecipes = await tx
          .select({ id: recipes.id })
          .from(recipes)
          .where(eq(recipes.userId, userId));
        const ownedRecipeIds = ownedRecipes.map(r => r.id);

        // 2. Delete junction & dependent records NOT directly keyed by user first
        if (mealPlanIdValues.length > 0) {
          await tx.delete(recipesInMealPlan).where(inArray(recipesInMealPlan.mealPlanId, mealPlanIdValues));
          console.log(`[Account Deletion] Deleted recipesInMealPlan for meal plans: ${mealPlanIdValues.join(',')}`);
        }

        // Also delete any meal plan recipe entries that reference the user's recipes
        if (ownedRecipeIds.length > 0) {
          await tx.delete(recipesInMealPlan).where(inArray(recipesInMealPlan.recipeId, ownedRecipeIds));
        }

        // 3. Delete records referencing recipes & user BEFORE deleting recipes
        await tx.delete(recipeLikes).where(eq(recipeLikes.userId, userId));
        await tx.delete(recipeComments).where(eq(recipeComments.userId, userId));
        // Delete likes/comments pointing to the user's recipes (from other users)
        if (ownedRecipeIds.length > 0) {
          await tx.delete(recipeLikes).where(inArray(recipeLikes.recipeId, ownedRecipeIds));
          await tx.delete(recipeComments).where(inArray(recipeComments.recipeId, ownedRecipeIds));
        }
        console.log('[Account Deletion] Deleted recipe likes & comments');

        // 4. Delete shopping list items (may reference meal plans)
        await tx.delete(shoppingListItems).where(eq(shoppingListItems.userId, userId));
        console.log('[Account Deletion] Deleted shopping list items');

        // 5. Delete meal plans
        await tx.delete(mealPlans).where(eq(mealPlans.userId, userId));
        console.log('[Account Deletion] Deleted meal plans');

        // 6. Delete other user-linked data
        await tx.delete(foodLogs).where(eq(foodLogs.userId, userId));
        await tx.delete(weightLogs).where(eq(weightLogs.userId, userId));
        await tx.delete(progressPhotos).where(eq(progressPhotos.userId, userId));
        await tx.delete(userNutritionPreferences).where(eq(userNutritionPreferences.userId, userId));
        await tx.delete(userDietaryPreferences).where(eq(userDietaryPreferences.userId, userId));
        await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
        console.log('[Account Deletion] Deleted logs, photos, nutrition & dietary prefs, reset tokens');

        // 7. Delete user's own recipes (after likes/comments removed)
        await tx.delete(recipes).where(eq(recipes.userId, userId));
        console.log('[Account Deletion] Deleted user recipes');

        // TODO (optional): notifications, badges, userBadges if schema adds user FK later

        // 8. Finally delete the user
        await tx.delete(users).where(eq(users.id, userId));
        console.log('[Account Deletion] Deleted user row');
      });

      // Logout after successful transaction
      req.logout(err => {
        if (err) console.error('[Account Deletion] Logout error:', err);
      });

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
  app.get("/api/user", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, req.user.id)
    });

    // Make sure both camelCase and snake_case versions are consistent
    if (user) {
      // The database field is has_completed_onboarding (snake_case) 
      // But in JavaScript we use hasCompletedOnboarding (camelCase)
      user.hasCompletedOnboarding = user.has_completed_onboarding;
      
      // Log the values for debugging
      console.log(`User ${user.id} onboarding status: ${user.has_completed_onboarding}`);
    }

    res.json(user);
  });

  // Update user's language preference
  app.post("/api/user/language", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { language } = req.body;
    
    if (!language || (language !== 'en' && language !== 'pl')) {
      return res.status(400).json({ error: "Invalid language" });
    }

    try {
      // Use preferred_language (snake_case) to match database schema
      await db.update(users)
        .set({ preferred_language: language })
        .where(eq(users.id, req.user.id));
      
      console.log(`Updated user ${req.user.id} language to: ${language}`);
      res.json({ success: true, language });
    } catch (error) {
      console.error("Error updating language preference:", error);
      res.status(500).json({ error: "Failed to update language preference" });
    }
  });

  // Vision board generation endpoint
  app.post("/api/vision-board", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      console.log('[Vision Board API] Generating vision board for user:', req.user.id);

      // Get user profile data from database
      const userProfile = await db.query.userNutritionPreferences.findFirst({
        where: eq(userNutritionPreferences.userId, req.user.id)
      });

      if (!userProfile) {
        return res.status(404).json({ 
          error: 'User profile not found',
          message: 'Please complete your onboarding first'
        });
      }

      // Get user basic info
      const user = await db.query.users.findFirst({
        where: eq(users.id, req.user.id)
      });

      // Create formData from stored profile for compatibility with existing logic
      const formData = {
        weight: parseFloat(userProfile.currentWeight.toString()),
        goalWeight: parseFloat(userProfile.goalWeight.toString()),
        height: parseFloat(userProfile.height.toString()),
        age: 30, // Default age since it's not stored in current schema
        gender: 'male', // Default gender since it's not stored in current schema
        activityLevel: userProfile.activityLevel,
        weightGoal: userProfile.weightGoal,
        perfectGoal: userProfile.weightGoal === 'loss' ? ['weight_loss'] : 
                    userProfile.weightGoal === 'gain' ? ['muscle_gain'] : ['health_improve']
      };

      // Calculate nutritional goals based on form data
      const calculateMacros = (calories: number, weightGoal: string) => {
        let proteinRatio, carbRatio, fatRatio;
        
        switch (weightGoal) {
          case 'loss':
            proteinRatio = 0.30; // 30% protein for weight loss
            carbRatio = 0.35;    // 35% carbs
            fatRatio = 0.35;     // 35% fat
            break;
          case 'gain':
            proteinRatio = 0.25; // 25% protein for weight gain
            carbRatio = 0.45;    // 45% carbs
            fatRatio = 0.30;     // 30% fat
            break;
          default: // maintain
            proteinRatio = 0.25; // 25% protein for maintenance
            carbRatio = 0.40;    // 40% carbs
            fatRatio = 0.35;     // 35% fat
        }

        return {
          calories: Math.round(calories),
          protein: Math.round((calories * proteinRatio) / 4), // 4 calories per gram of protein
          carbs: Math.round((calories * carbRatio) / 4),      // 4 calories per gram of carbs
          fat: Math.round((calories * fatRatio) / 9)          // 9 calories per gram of fat
        };
      };

      // Calculate BMR and daily calories
      const calculateBMR = (weight: number, height: number, age: number, gender: string) => {
        if (gender === 'male') {
          return 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
        } else {
          return 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
        }
      };

      const activityMultipliers = {
        sedentary: 1.2,
        light: 1.375,
        moderate: 1.55,
        active: 1.725,
        very_active: 1.9
      };

      const bmr = calculateBMR(formData.weight, formData.height, formData.age, formData.gender);
      const activityLevel = formData.activityLevel as keyof typeof activityMultipliers;
      const tdee = bmr * (activityMultipliers[activityLevel] || 1.2);
      
      // Adjust calories based on goal
      let dailyCalories = tdee;
      if (formData.weightGoal === 'loss') {
        dailyCalories = tdee - 500; // 500 calorie deficit for 1 lb/week loss
      } else if (formData.weightGoal === 'gain') {
        dailyCalories = tdee + 300; // 300 calorie surplus for lean gain
      }

      const macros = calculateMacros(dailyCalories, formData.weightGoal);

      // Generate timeline milestones (0.5kg weight loss per week)
      const generateTimeline = (currentWeight: number, goalWeight: number, weightGoal: string) => {
        const weightDifference = Math.abs(goalWeight - currentWeight);
        const weeksToGoal = weightGoal === 'weight_loss' ? Math.ceil(weightDifference / 0.5) : Math.ceil(weightDifference / 0.25);
        
        const milestones = [];
        const totalWeeks = Math.max(weeksToGoal, 4); // Minimum 4 weeks
        
        for (let i = 1; i <= 4; i++) {
          const weekProgress = Math.round((totalWeeks / 4) * i);
          let weightProgress;
          
          if (weightGoal === 'weight_loss') {
            // 0.5kg loss per week
            weightProgress = currentWeight - (0.5 * weekProgress);
            weightProgress = Math.max(weightProgress, goalWeight);
          } else if (weightGoal === 'muscle_gain') {
            // 0.25kg gain per week
            weightProgress = currentWeight + (0.25 * weekProgress);
            weightProgress = Math.min(weightProgress, goalWeight);
          } else {
            // Linear progression for other goals
            weightProgress = currentWeight + ((goalWeight - currentWeight) * (i / 4));
          }
          
          milestones.push({
            week: weekProgress,
            weight: Math.round(weightProgress * 10) / 10,
            goal: i === 1 ? 'Ustanów nawyki' :
                  i === 2 ? 'Zobacz pierwsze rezultaty' :
                  i === 3 ? 'Zbuduj momentum' :
                  'Osiągnij swój cel',
            energy: 70 + (i * 7.5) // Energy increases over time
          });
        }
        
        return milestones;
      };

      const timeline = generateTimeline(formData.weight, formData.goalWeight, formData.weightGoal);

      // Generate motivational content based on goals
      const generateMotivation = (weightGoal: string, perfectGoal: string) => {
        const motivationMap = {
          weight_loss: {
            title: 'Twoja Podróż do Idealnej Sylwetki',
            tips: [
              'Pij więcej wody - 2-3 litry dziennie',
              'Jedz białko przy każdym posiłku',
              'Chodź 10,000 kroków dziennie',
              'Śpij 7-8 godzin każdej nocy'
            ],
            inspiration: 'Każdy dzień to nowa szansa na zdrowe wybory!'
          },
          muscle_gain: {
            title: 'Budowanie Silnego Ciała',
            tips: [
              'Jedz 1.6-2.2g białka na kg masy ciała',
              'Trenuj siłowo 3-4 razy w tygodniu',
              'Odpoczywaj między treningami',
              'Jedz w nadwyżce kalorycznej'
            ],
            inspiration: 'Mięśnie rosną podczas odpoczynku, nie podczas treningu!'
          },
          energy_boost: {
            title: 'Zwiększenie Energii i Witalności',
            tips: [
              'Jedz regularne posiłki co 3-4 godziny',
              'Unikaj cukru prostego',
              'Ćwicz regularnie',
              'Zadbaj o poziom witamin B'
            ],
            inspiration: 'Energia pochodząca z dobrej diety to energia na cały dzień!'
          },
          health_improve: {
            title: 'Poprawa Zdrowia i Samopoczucia',
            tips: [
              'Jedz 5 porcji warzyw i owoców dziennie',
              'Ogranicz przetworzone jedzenie',
              'Regularnie sprawdzaj parametry zdrowia',
              'Dbaj o zdrowie jelit'
            ],
            inspiration: 'Zdrowie to największy skarb - inwestuj w nie każdego dnia!'
          }
        };

        return motivationMap[perfectGoal] || motivationMap.weight_loss;
      };

      const perfectGoal = formData.perfectGoal[0] || 'weight_loss';
      const motivation = generateMotivation(formData.weightGoal, perfectGoal);

      // Create comprehensive vision board data
      const visionBoardData = {
        userId: req.user.id,
        macros,
        timeline,
        motivation,
        personalData: {
          age: formData.age,
          gender: formData.gender,
          currentWeight: formData.weight,
          goalWeight: formData.goalWeight,
          height: formData.height,
          activityLevel: formData.activityLevel,
          weightGoal: formData.weightGoal,
          perfectGoal: formData.perfectGoal
        },
        createdAt: new Date().toISOString()
      };

      console.log('[Vision Board API] Generated vision board data:', visionBoardData);
      
      res.json({
        success: true,
        visionBoard: visionBoardData
      });

    } catch (error) {
      console.error('[Vision Board API] Error generating vision board:', error);
      res.status(500).json({
        error: 'Failed to generate vision board',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);
  return httpServer;
}