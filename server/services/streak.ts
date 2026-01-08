import { db } from "@db";
import { users, foodLogs } from "@db/schema";
import { eq, gte, lte, and, sql, desc } from "drizzle-orm";

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  todayLogged: boolean;
  lastLogDate: string | null;
  weeklyProgress: boolean[]; // Last 7 days, true = logged
  totalDaysLogged: number;
  streakMilestones: {
    milestone: number;
    achieved: boolean;
    label: string;
    emoji: string;
  }[];
}

const MILESTONES = [
  { milestone: 3, label: "Getting Started", emoji: "🌱" },
  { milestone: 7, label: "One Week Warrior", emoji: "🔥" },
  { milestone: 14, label: "Two Week Champion", emoji: "💪" },
  { milestone: 30, label: "Monthly Master", emoji: "🏆" },
  { milestone: 60, label: "Dedication King", emoji: "👑" },
  { milestone: 100, label: "Century Legend", emoji: "🌟" },
  { milestone: 365, label: "Year of Excellence", emoji: "🎖️" },
];

/**
 * Get dates when user logged at least one meal
 */
async function getLoggedDates(userId: number, startDate: Date, endDate: Date): Promise<Set<string>> {
  const logs = await db
    .select({
      date: foodLogs.date,
    })
    .from(foodLogs)
    .where(
      and(
        eq(foodLogs.userId, userId),
        gte(foodLogs.date, startDate),
        lte(foodLogs.date, endDate)
      )
    );

  const dates = new Set<string>();
  logs.forEach((log) => {
    if (log.date) {
      const dateStr = new Date(log.date).toISOString().split("T")[0];
      dates.add(dateStr);
    }
  });

  return dates;
}

/**
 * Calculate current streak based on consecutive days of logging
 */
async function calculateCurrentStreak(userId: number): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Get last 365 days of logs to calculate streak
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 365);
  
  const loggedDates = await getLoggedDates(userId, startDate, today);
  
  // Check if today is logged
  const todayStr = today.toISOString().split("T")[0];
  const yesterdayDate = new Date(today);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = yesterdayDate.toISOString().split("T")[0];
  
  // Start counting from today or yesterday
  let streak = 0;
  let checkDate = new Date(today);
  
  // If today isn't logged yet, start from yesterday
  if (!loggedDates.has(todayStr)) {
    // Only count streak if yesterday was logged (streak could be broken)
    if (!loggedDates.has(yesterdayStr)) {
      return 0; // Streak is broken
    }
    checkDate = yesterdayDate;
  }
  
  // Count consecutive days going backwards
  while (true) {
    const dateStr = checkDate.toISOString().split("T")[0];
    if (loggedDates.has(dateStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
    
    // Safety limit
    if (streak > 365) break;
  }
  
  return streak;
}

/**
 * Calculate longest streak ever
 */
async function calculateLongestStreak(userId: number): Promise<number> {
  // Get all food logs ordered by date
  const logs = await db
    .select({
      date: foodLogs.date,
    })
    .from(foodLogs)
    .where(eq(foodLogs.userId, userId))
    .orderBy(foodLogs.date);

  if (logs.length === 0) return 0;

  // Get unique logged dates
  const uniqueDates = new Set<string>();
  logs.forEach((log) => {
    if (log.date) {
      uniqueDates.add(new Date(log.date).toISOString().split("T")[0]);
    }
  });

  const sortedDates = Array.from(uniqueDates).sort();
  if (sortedDates.length === 0) return 0;

  let longestStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = new Date(sortedDates[i - 1]);
    const currDate = new Date(sortedDates[i]);
    const diffDays = Math.round(
      (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 1) {
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }

  return longestStreak;
}

/**
 * Get streak data for a user
 */
export async function getStreakData(userId: number): Promise<StreakData> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  
  // Get logged dates for last 7 days
  const loggedDates = await getLoggedDates(userId, sevenDaysAgo, today);
  
  // Build weekly progress (last 7 days)
  const weeklyProgress: boolean[] = [];
  for (let i = 6; i >= 0; i--) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const dateStr = checkDate.toISOString().split("T")[0];
    weeklyProgress.push(loggedDates.has(dateStr));
  }
  
  // Calculate streaks
  const currentStreak = await calculateCurrentStreak(userId);
  const longestStreak = await calculateLongestStreak(userId);
  
  // Check if today is logged
  const todayStr = today.toISOString().split("T")[0];
  const todayLogged = loggedDates.has(todayStr);
  
  // Get last log date
  const lastLog = await db
    .select({ date: foodLogs.date })
    .from(foodLogs)
    .where(eq(foodLogs.userId, userId))
    .orderBy(desc(foodLogs.date))
    .limit(1);
  
  const lastLogDate = lastLog[0]?.date 
    ? new Date(lastLog[0].date).toISOString().split("T")[0] 
    : null;
  
  // Get total days ever logged
  const allTimeLogs = await db
    .select({ date: foodLogs.date })
    .from(foodLogs)
    .where(eq(foodLogs.userId, userId));
  
  const allDates = new Set<string>();
  allTimeLogs.forEach((log) => {
    if (log.date) {
      allDates.add(new Date(log.date).toISOString().split("T")[0]);
    }
  });
  
  // Build milestones
  const streakMilestones = MILESTONES.map((m) => ({
    ...m,
    achieved: longestStreak >= m.milestone,
  }));
  
  // Update user record with current streak data
  await db
    .update(users)
    .set({
      currentStreak,
      longestStreak: Math.max(longestStreak, currentStreak),
      lastActivityDate: todayLogged ? todayStr : undefined,
    })
    .where(eq(users.id, userId));
  
  return {
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
    todayLogged,
    lastLogDate,
    weeklyProgress,
    totalDaysLogged: allDates.size,
    streakMilestones,
  };
}

/**
 * Update streak when a meal is logged
 */
export async function updateStreakOnLog(userId: number): Promise<StreakData> {
  return getStreakData(userId);
}
