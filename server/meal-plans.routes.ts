import { Express, Request, Response } from "express";
import { db } from "@db";
import {
  mealPlans,
  recipes,
  recipesInMealPlan
} from "@db/schema";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "./utils/jwt";

// Export function to register meal plan routes
export function registerMealPlanRoutes(app: Express) {
  // Get today's meal plan - This endpoint must be defined before the :date route
  app.get("/api/meal-plans/today", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      // Get the date from query parameter or default to today
      const dateParam = req.query.date as string | undefined;
      const targetDate = dateParam || new Date().toISOString().split('T')[0];
      
      console.log(`Fetching meal plan for date: ${targetDate}`);
      
      // Get the meal plan for the target date
      const todayPlan = await db
        .select({
          id: mealPlans.id,
          date: mealPlans.date,
          totalCalories: mealPlans.totalCalories,
          status: mealPlans.status,
          createdAt: mealPlans.createdAt,
          updatedAt: mealPlans.updatedAt
        })
        .from(mealPlans)
        .where(
          and(
            eq(mealPlans.userId, req.user.id),
            eq(mealPlans.date, targetDate)
          )
        )
        .orderBy(desc(mealPlans.createdAt))
        .limit(1);
      
      if (!todayPlan.length) {
        // Don't log missing meal plans - this is expected behavior
        return res.json({ hasPlan: false });
      }
      
      // Get associated recipes for today's meal plan
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
        .where(eq(recipesInMealPlan.mealPlanId, todayPlan[0].id))
        .orderBy(recipesInMealPlan.order);
      
      // Log the number of recipes found
      console.log(`Found ${mealRecipes.length} recipes for meal plan ID ${todayPlan[0].id}`);
      
      // Return the meal plan with meals
      return res.json({
        hasPlan: true,
        plan: {
          ...todayPlan[0],
          meals: mealRecipes
        }
      });
    } catch (error) {
      console.error('Error fetching meal plan for today:', error);
      res.status(500).json({ error: 'Failed to fetch meal plan' });
    }
  });

  // Get meal plan generation progress - Must be before :date route
  app.get("/api/meal-plans/progress", requireAuth, async (req: AuthRequest, res: Response) => {
    try {

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

  // Get meal plan by specific date - This endpoint handles date-specific meal plan requests
  app.get("/api/meal-plans/:date", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const dateRequested = req.params.date;
      
      // Special handling for "all" which should return all meal plans
      if (dateRequested === 'all') {
        // Get all meal plans for the user
        const allUserMealPlans = await db
          .select({
            id: mealPlans.id,
            date: mealPlans.date,
            totalCalories: mealPlans.totalCalories,
            status: mealPlans.status,
            createdAt: mealPlans.createdAt,
            updatedAt: mealPlans.updatedAt
          })
          .from(mealPlans)
          .where(eq(mealPlans.userId, req.user.id))
          .orderBy(mealPlans.date);
          
        if (allUserMealPlans.length === 0) {
          return res.json({ 
            weekStart: new Date().toISOString().split('T')[0],
            plans: [] 
          });
        }
        
        // Store plans with their associated recipes
        const plans = [];
        
        // Process each plan to get its recipes
        for (const plan of allUserMealPlans) {
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
            .where(eq(recipesInMealPlan.mealPlanId, plan.id))
            .orderBy(recipesInMealPlan.order);
            
          plans.push({
            ...plan,
            meals: mealRecipes
          });
        }
        
        // Find the start of the week for the first plan
        const firstPlanDate = new Date(plans[0].date);
        const weekStart = new Date(firstPlanDate);
        weekStart.setDate(firstPlanDate.getDate() - firstPlanDate.getDay()); // Go back to previous Sunday
        
        return res.json({
          weekStart: weekStart.toISOString().split('T')[0],
          plans
        });
      }
      
      // For specific date, handle as before
      const datePlan = await db
        .select({
          id: mealPlans.id,
          date: mealPlans.date,
          totalCalories: mealPlans.totalCalories,
          status: mealPlans.status,
          createdAt: mealPlans.createdAt,
          updatedAt: mealPlans.updatedAt
        })
        .from(mealPlans)
        .where(
          and(
            eq(mealPlans.userId, req.user.id),
            eq(mealPlans.date, dateRequested)
          )
        )
        .orderBy(desc(mealPlans.createdAt))
        .limit(1);
      
      if (!datePlan.length) {
        console.log(`No meal plan found for date ${dateRequested}`);
        return res.json({ hasPlan: false });
      }
      
      console.log(`Found meal plan with ID: ${datePlan[0].id} for date ${dateRequested}`);
      
      // Get associated recipes for this date's meal plan
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
        .where(eq(recipesInMealPlan.mealPlanId, datePlan[0].id))
        .orderBy(recipesInMealPlan.order);

      // Log the number of recipes found
      console.log(`Found ${mealRecipes.length} recipes for meal plan ID ${datePlan[0].id}`);
      
      // Return the meal plan with meals
      return res.json({
        hasPlan: true,
        plan: {
          ...datePlan[0],
          meals: mealRecipes
        }
      });
    } catch (error) {
      console.error('Error fetching meal plan by date:', error);
      res.status(500).json({ error: 'Failed to fetch meal plan' });
    }
  });
}