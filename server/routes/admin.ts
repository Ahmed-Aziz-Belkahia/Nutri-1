import express, { Response, NextFunction } from "express";
import { db } from "@db";
import { 
  users, 
  foodLogs, 
  recipes, 
  userNutritionPreferences, 
  weightLogs, 
  progressPhotos,
  apiUsageTracking,
  userTokenLimits
} from "@db/schema";
import { eq, desc, sql, gte, and } from "drizzle-orm";
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

// ==================== ANALYTICS ROUTES ====================

// Get user statistics
router.get('/analytics/users', isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const allUsers = await db.select().from(users);
    
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const totalUsers = allUsers.length;
    const activeUsers = allUsers.filter(u => u.lastActivityDate).length;
    const completedOnboarding = allUsers.filter(u => u.hasCompletedOnboarding).length;
    const premiumUsers = 0; // Add premium tier logic when implemented
    
    // Count new users by time period (using lastLoginAt as proxy for creation)
    const newUsersToday = allUsers.filter(u => 
      u.lastLoginAt && new Date(u.lastLoginAt) >= todayStart
    ).length;
    
    const newUsersThisWeek = allUsers.filter(u => 
      u.lastLoginAt && new Date(u.lastLoginAt) >= weekStart
    ).length;
    
    const newUsersThisMonth = allUsers.filter(u => 
      u.lastLoginAt && new Date(u.lastLoginAt) >= monthStart
    ).length;
    
    res.json({
      totalUsers,
      activeUsers,
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth,
      premiumUsers,
      completedOnboarding
    });
  } catch (error) {
    console.error('Error fetching user analytics:', error);
    res.status(500).json({ error: 'Failed to fetch user analytics' });
  }
});

// Get token usage statistics
router.get('/analytics/tokens', isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const range = req.query.range as string || '30d';
    const daysBack = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const startDate = Math.floor(Date.now() / 1000) - (daysBack * 24 * 60 * 60);
    
    // Get all usage records
    const allUsage = await db.select().from(apiUsageTracking);
    const recentUsage = allUsage.filter(u => u.requestDate >= startDate);
    
    // Calculate totals
    const totalTokensUsed = allUsage.reduce((sum, u) => sum + u.tokensUsed, 0);
    const totalCostUsd = allUsage.reduce((sum, u) => sum + u.costUsd, 0);
    
    // Get user count for averages
    const userCount = await db.select().from(users);
    const avgTokensPerUser = userCount.length > 0 ? totalTokensUsed / userCount.length : 0;
    const avgCostPerUser = userCount.length > 0 ? totalCostUsd / userCount.length : 0;
    
    // Today's usage
    const todayStart = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);
    const todayUsage = allUsage.filter(u => u.requestDate >= todayStart);
    const todayTokens = todayUsage.reduce((sum, u) => sum + u.tokensUsed, 0);
    const todayCost = todayUsage.reduce((sum, u) => sum + u.costUsd, 0);
    
    // Week usage
    const weekStart = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);
    const weekUsage = allUsage.filter(u => u.requestDate >= weekStart);
    const weekTokens = weekUsage.reduce((sum, u) => sum + u.tokensUsed, 0);
    const weekCost = weekUsage.reduce((sum, u) => sum + u.costUsd, 0);
    
    // Month usage
    const monthStart = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);
    const monthUsage = allUsage.filter(u => u.requestDate >= monthStart);
    const monthTokens = monthUsage.reduce((sum, u) => sum + u.tokensUsed, 0);
    const monthCost = monthUsage.reduce((sum, u) => sum + u.costUsd, 0);
    
    // Top users by token usage
    const userUsageMap = new Map<number, { tokensUsed: number; costUsd: number }>();
    recentUsage.forEach(u => {
      const current = userUsageMap.get(u.userId) || { tokensUsed: 0, costUsd: 0 };
      userUsageMap.set(u.userId, {
        tokensUsed: current.tokensUsed + u.tokensUsed,
        costUsd: current.costUsd + u.costUsd
      });
    });
    
    const topUserIds = Array.from(userUsageMap.entries())
      .sort((a, b) => b[1].tokensUsed - a[1].tokensUsed)
      .slice(0, 10);
    
    const topUsersData = await Promise.all(
      topUserIds.map(async ([userId, stats]) => {
        const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        return {
          userId,
          email: user?.email || 'Unknown',
          tokensUsed: stats.tokensUsed,
          costUsd: stats.costUsd
        };
      })
    );
    
    res.json({
      totalTokensUsed,
      totalCostUsd,
      avgTokensPerUser,
      avgCostPerUser,
      todayTokens,
      todayCost,
      weekTokens,
      weekCost,
      monthTokens,
      monthCost,
      topUsers: topUsersData
    });
  } catch (error) {
    console.error('Error fetching token analytics:', error);
    res.status(500).json({ error: 'Failed to fetch token analytics' });
  }
});

// Get API statistics
router.get('/analytics/api', isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const range = req.query.range as string || '30d';
    const daysBack = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const startDate = Math.floor(Date.now() / 1000) - (daysBack * 24 * 60 * 60);
    
    const allUsage = await db.select().from(apiUsageTracking);
    const recentUsage = allUsage.filter(u => u.requestDate >= startDate);
    
    const totalRequests = recentUsage.length;
    const successfulRequests = recentUsage.filter(u => u.status === 'success').length;
    const successRate = totalRequests > 0 ? successfulRequests / totalRequests : 0;
    const errorRate = 1 - successRate;
    
    // Calculate average response time
    const responseTimes = recentUsage
      .map(u => u.metadata?.responseTime)
      .filter((t): t is number => typeof t === 'number');
    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length 
      : 0;
    
    // Endpoint breakdown
    const endpointMap = new Map<string, { count: number; totalTokens: number; totalCost: number }>();
    recentUsage.forEach(u => {
      const current = endpointMap.get(u.endpoint) || { count: 0, totalTokens: 0, totalCost: 0 };
      endpointMap.set(u.endpoint, {
        count: current.count + 1,
        totalTokens: current.totalTokens + u.tokensUsed,
        totalCost: current.totalCost + u.costUsd
      });
    });
    
    const endpointBreakdown = Array.from(endpointMap.entries())
      .map(([endpoint, stats]) => ({
        endpoint,
        count: stats.count,
        avgTokens: Math.round(stats.totalTokens / stats.count),
        totalCost: stats.totalCost
      }))
      .sort((a, b) => b.count - a.count);
    
    // Model usage
    const modelMap = new Map<string, { count: number; totalTokens: number; totalCost: number }>();
    recentUsage.forEach(u => {
      const model = u.model || 'unknown';
      const current = modelMap.get(model) || { count: 0, totalTokens: 0, totalCost: 0 };
      modelMap.set(model, {
        count: current.count + 1,
        totalTokens: current.totalTokens + u.tokensUsed,
        totalCost: current.totalCost + u.costUsd
      });
    });
    
    const modelUsage = Array.from(modelMap.entries())
      .map(([model, stats]) => ({
        model,
        count: stats.count,
        totalTokens: stats.totalTokens,
        totalCost: stats.totalCost
      }))
      .sort((a, b) => b.count - a.count);
    
    res.json({
      totalRequests,
      successRate,
      errorRate,
      avgResponseTime,
      endpointBreakdown,
      modelUsage
    });
  } catch (error) {
    console.error('Error fetching API analytics:', error);
    res.status(500).json({ error: 'Failed to fetch API analytics' });
  }
});

// Get activity data over time
router.get('/analytics/activity', isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const range = req.query.range as string || '30d';
    const daysBack = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const startDate = Math.floor(Date.now() / 1000) - (daysBack * 24 * 60 * 60);
    
    const allUsage = await db.select().from(apiUsageTracking);
    const recentUsage = allUsage.filter(u => u.requestDate >= startDate);
    
    // Group by date
    const dateMap = new Map<string, { users: Set<number>; tokens: number; cost: number; requests: number }>();
    
    recentUsage.forEach(u => {
      const date = new Date(u.requestDate * 1000).toISOString().split('T')[0];
      const current = dateMap.get(date) || { users: new Set(), tokens: 0, cost: 0, requests: 0 };
      current.users.add(u.userId);
      current.tokens += u.tokensUsed;
      current.cost += u.costUsd;
      current.requests += 1;
      dateMap.set(date, current);
    });
    
    const activityData = Array.from(dateMap.entries())
      .map(([date, stats]) => ({
        date,
        users: stats.users.size,
        tokens: stats.tokens,
        cost: parseFloat(stats.cost.toFixed(4)),
        requests: stats.requests
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    res.json(activityData);
  } catch (error) {
    console.error('Error fetching activity analytics:', error);
    res.status(500).json({ error: 'Failed to fetch activity analytics' });
  }
});

export default router;