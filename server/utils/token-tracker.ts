import { TokenLimitService } from '../services/token-limit.service';
import type OpenAI from 'openai';

/**
 * Centralized token tracking utility for all AI operations
 * Tracks token usage, costs, and logs to database for analytics
 */

// Pricing per 1M tokens (as of 2024)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4o-mini': { input: 0.150, output: 0.600 },
  'gpt-4-turbo': { input: 10.00, output: 30.00 },
  'gpt-4': { input: 30.00, output: 60.00 },
  'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
};

interface TokenUsageMetadata {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  responseTime?: number;
  errorMessage?: string;
  [key: string]: any;
}

/**
 * Calculate cost based on model and token usage
 */
function calculateCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING['gpt-4o-mini'];
  const inputCost = (promptTokens / 1000000) * pricing.input;
  const outputCost = (completionTokens / 1000000) * pricing.output;
  return inputCost + outputCost;
}

/**
 * Track token usage from an OpenAI response
 */
export async function trackOpenAIUsage(
  userId: number,
  endpoint: string,
  response: OpenAI.Chat.Completions.ChatCompletion,
  model: string,
  startTime?: number
): Promise<void> {
  if (!response.usage) {
    console.warn('[Token Tracking] No usage data in OpenAI response for endpoint:', endpoint);
    return;
  }

  const tokensUsed = response.usage.total_tokens;
  const totalCost = calculateCost(
    model,
    response.usage.prompt_tokens,
    response.usage.completion_tokens
  );

  const metadata: TokenUsageMetadata = {
    promptTokens: response.usage.prompt_tokens,
    completionTokens: response.usage.completion_tokens,
    totalTokens: tokensUsed,
  };

  // Calculate response time if start time was provided
  if (startTime) {
    metadata.responseTime = Date.now() - startTime;
  }

  try {
    await TokenLimitService.trackTokenUsage(
      userId,
      endpoint,
      tokensUsed,
      model,
      totalCost,
      'success',
      metadata
    );

    console.log(`[Token Tracking] Tracked ${tokensUsed} tokens for user ${userId} on ${endpoint} (Cost: $${totalCost.toFixed(4)})`);
  } catch (error) {
    console.error('[Token Tracking] Error tracking usage:', error);
    // Don't throw - tracking failures shouldn't break the main flow
  }
}

/**
 * Track failed API calls
 */
export async function trackFailedRequest(
  userId: number,
  endpoint: string,
  model: string,
  errorMessage: string
): Promise<void> {
  try {
    await TokenLimitService.trackTokenUsage(
      userId,
      endpoint,
      0,
      model,
      0,
      'error',
      {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        errorMessage,
      }
    );

    console.log(`[Token Tracking] Tracked failed request for user ${userId} on ${endpoint}`);
  } catch (error) {
    console.error('[Token Tracking] Error tracking failed request:', error);
  }
}

/**
 * Wrapper for OpenAI API calls with automatic token tracking
 */
export async function trackOpenAICall<T>(
  userId: number,
  endpoint: string,
  model: string,
  apiCall: () => Promise<OpenAI.Chat.Completions.ChatCompletion>
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  const startTime = Date.now();

  try {
    const response = await apiCall();
    await trackOpenAIUsage(userId, endpoint, response, model, startTime);
    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await trackFailedRequest(userId, endpoint, model, errorMessage);
    throw error;
  }
}

/**
 * Get token usage summary for analytics
 */
export function getModelPricing(model: string): { input: number; output: number } {
  return MODEL_PRICING[model] || MODEL_PRICING['gpt-4o-mini'];
}
