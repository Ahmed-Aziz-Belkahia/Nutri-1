import express, { Response, NextFunction } from "express";
import { db } from "@db";
import { users, foodLogs, recipes, userNutritionPreferences, weightLogs, progressPhotos } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../utils/jwt";

const router = express.Router();

// Apply JWT authentication to all routes
router.use(requireAuth);

// Middleware to check if the user is an admin
export const isAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user!.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
};

// Apply the isAdmin middleware to all routes in this file
router.use(isAdmin);

// Get all users
router.get('/users', async (req: AuthRequest, res: Response) => {
  try {
    const allUsers = await db.select().from(users).orderBy(desc(users.id));
    res.json(allUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get a single user
router.get('/users/:id', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update user's admin status
router.patch('/users/:id', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const { isAdmin } = req.body;
    
    await db.update(users)
      .set({ isAdmin: isAdmin })
      .where(eq(users.id, userId));
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user
router.delete('/users/:id', isAdmin, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    
    // Delete user's food logs
    await db.delete(foodLogs).where(eq(foodLogs.userId, userId));
    
    // Delete user's recipes
    await db.delete(recipes).where(eq(recipes.userId, userId));
    
    // Delete user's nutrition preferences
    await db.delete(userNutritionPreferences).where(eq(userNutritionPreferences.userId, userId));
    
    // Delete user's progress photos
    await db.delete(progressPhotos).where(eq(progressPhotos.userId, userId));
    
    // Delete user's weight logs
    await db.delete(weightLogs).where(eq(weightLogs.userId, userId));
    
    // Finally delete the user
    await db.delete(users).where(eq(users.id, userId));
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Get user's food logs
router.get('/food-logs/:userId', isAdmin, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const logs = await db.select().from(foodLogs).where(eq(foodLogs.userId, userId));
    
    res.json(logs);
  } catch (error) {
    console.error('Error fetching food logs:', error);
    res.status(500).json({ error: 'Failed to fetch food logs' });
  }
});

// Get user's recipes
router.get('/recipes/:userId', isAdmin, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const userRecipes = await db.select().from(recipes).where(eq(recipes.userId, userId));
    
    res.json(userRecipes);
  } catch (error) {
    console.error('Error fetching recipes:', error);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
});

// Get all food logs
router.get('/food-logs', isAdmin, async (req: Request, res: Response) => {
  try {
    const allLogs = await db.select().from(foodLogs);
    res.json(allLogs);
  } catch (error) {
    console.error('Error fetching all food logs:', error);
    res.status(500).json({ error: 'Failed to fetch all food logs' });
  }
});

// Get all recipes
router.get('/recipes', isAdmin, async (req: Request, res: Response) => {
  try {
    const allRecipes = await db.select().from(recipes);
    res.json(allRecipes);
  } catch (error) {
    console.error('Error fetching all recipes:', error);
    res.status(500).json({ error: 'Failed to fetch all recipes' });
  }
});

// Get user's progress
router.get('/progress/:userId', isAdmin, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    
    // Get the user's weight logs
    const weights = await db.select().from(weightLogs).where(eq(weightLogs.userId, userId));
    
    // Get the user's progress photos
    const photos = await db.select().from(progressPhotos).where(eq(progressPhotos.userId, userId));
    
    // Get the user's nutrition preferences
    const [nutrition] = await db.select().from(userNutritionPreferences).where(eq(userNutritionPreferences.userId, userId));
    
    res.json({
      weights,
      photos,
      nutrition
    });
  } catch (error) {
    console.error('Error fetching user progress:', error);
    res.status(500).json({ error: 'Failed to fetch user progress' });
  }
});

export default router;