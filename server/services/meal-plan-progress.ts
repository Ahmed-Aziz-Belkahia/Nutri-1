/**
 * In-memory progress tracking for meal plan generation
 * Stores progress updates that can be polled by the frontend
 */

interface ProgressUpdate {
  userId: number;
  step: string;
  currentDay?: number;
  totalDays?: number;
  message: string;
  timestamp: number;
  completed: boolean;
}

// Store progress updates in memory (resets on server restart)
const progressStore = new Map<number, ProgressUpdate>();

/**
 * Update progress for a specific user's meal plan generation
 */
export function updateMealPlanProgress(
  userId: number,
  step: string,
  message: string,
  currentDay?: number,
  totalDays?: number,
  completed: boolean = false
) {
  const update: ProgressUpdate = {
    userId,
    step,
    currentDay,
    totalDays,
    message,
    timestamp: Date.now(),
    completed
  };
  
  progressStore.set(userId, update);
  console.log(`[Progress] User ${userId}: ${message}`);
}

/**
 * Get current progress for a user
 */
export function getMealPlanProgress(userId: number): ProgressUpdate | null {
  return progressStore.get(userId) || null;
}

/**
 * Clear progress for a user (call when generation completes or fails)
 */
export function clearMealPlanProgress(userId: number) {
  progressStore.delete(userId);
}
