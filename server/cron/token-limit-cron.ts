import cron from 'node-cron';
import { TokenLimitService } from '../services/token-limit.service';

/**
 * Cron Jobs for Token Limit Management
 * 
 * Schedules:
 * - Daily reset at midnight UTC: Resets all users' daily_used counters
 */

export function initializeTokenLimitCronJobs() {
  // Reset daily usage at midnight UTC every day
  // Cron format: second minute hour day month weekday
  // '0 0 * * *' = At 00:00:00 (midnight) every day
  cron.schedule('0 0 * * *', async () => {
    try {
      console.log('[Cron] Starting daily token limit reset at', new Date().toISOString());
      const resetCount = await TokenLimitService.resetAllDailyUsage();
      console.log(`[Cron] Successfully reset daily token usage for ${resetCount} users`);
    } catch (error) {
      console.error('[Cron] Error in daily token reset:', error);
    }
  }, {
    timezone: 'UTC'
  });

  console.log('[Cron] Token limit cron jobs initialized');
  console.log('[Cron] Daily reset scheduled for midnight UTC (00:00:00)');
}
