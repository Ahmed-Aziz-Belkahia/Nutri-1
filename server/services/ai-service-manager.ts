/**
 * AI Service Manager - Centralized AI request handling
 * 
 * Features:
 * - Retry logic with exponential backoff
 * - Fallback to cheaper models when appropriate
 * - Request caching for identical queries
 * - Rate limiting and cost tracking
 * - Graceful error handling
 */

import OpenAI from 'openai';
import { trackOpenAIUsage, trackFailedRequest } from '../utils/token-tracker';
import crypto from 'crypto';

// Initialize OpenAI client
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || '',
  timeout: 60000, // 60 second timeout
  maxRetries: 0 // We handle retries ourselves
});

// Response cache with TTL
interface CacheEntry {
  response: any;
  timestamp: number;
  ttl: number;
}

const responseCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes default

// Rate limiting
const rateLimitState = {
  lastRequestTime: 0,
  minInterval: 100, // Minimum 100ms between requests
  consecutiveFailures: 0,
  backoffUntil: 0
};

// Model configurations
export const AI_MODELS = {
  PRIMARY: 'gpt-4o',
  FAST: 'gpt-4o-mini',
  FALLBACK: 'gpt-4o-mini'
} as const;

export type AIModel = typeof AI_MODELS[keyof typeof AI_MODELS];

interface AIRequestOptions {
  model?: AIModel;
  maxTokens?: number;
  temperature?: number;
  userId?: number;
  endpoint?: string;
  cacheKey?: string;
  cacheTTL?: number;
  useFallback?: boolean;
  retries?: number;
  messages: OpenAI.ChatCompletionMessageParam[];
  responseFormat?: { type: 'json_object' | 'text' };
}

interface AIResponse<T = any> {
  data: T;
  model: string;
  cached: boolean;
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
  };
  latencyMs: number;
  confidence?: number;
}

/**
 * Generate a cache key from request parameters
 */
function generateCacheKey(options: AIRequestOptions): string {
  const keyData = {
    model: options.model,
    messages: options.messages.map(m => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content.substring(0, 500) : 'complex'
    })),
    temperature: options.temperature
  };
  
  return crypto.createHash('md5').update(JSON.stringify(keyData)).digest('hex');
}

/**
 * Check if a cached response is still valid
 */
function getCachedResponse(cacheKey: string): any | null {
  const entry = responseCache.get(cacheKey);
  if (!entry) return null;
  
  if (Date.now() - entry.timestamp > entry.ttl) {
    responseCache.delete(cacheKey);
    return null;
  }
  
  return entry.response;
}

/**
 * Store a response in cache
 */
function setCachedResponse(cacheKey: string, response: any, ttl: number = CACHE_TTL_MS): void {
  // Limit cache size to prevent memory issues
  if (responseCache.size > 1000) {
    // Remove oldest entries
    const entries = Array.from(responseCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    for (let i = 0; i < 100; i++) {
      responseCache.delete(entries[i][0]);
    }
  }
  
  responseCache.set(cacheKey, {
    response,
    timestamp: Date.now(),
    ttl
  });
}

/**
 * Wait for rate limiting if needed
 */
async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  
  // Check if we're in a backoff period
  if (now < rateLimitState.backoffUntil) {
    const waitTime = rateLimitState.backoffUntil - now;
    console.log(`[AI Manager] Rate limited, waiting ${waitTime}ms`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  // Ensure minimum interval between requests
  const elapsed = now - rateLimitState.lastRequestTime;
  if (elapsed < rateLimitState.minInterval) {
    await new Promise(resolve => setTimeout(resolve, rateLimitState.minInterval - elapsed));
  }
  
  rateLimitState.lastRequestTime = Date.now();
}

/**
 * Calculate exponential backoff delay
 */
function calculateBackoffDelay(attempt: number): number {
  const baseDelay = 1000; // 1 second
  const maxDelay = 30000; // 30 seconds
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  // Add jitter to prevent thundering herd
  return delay + Math.random() * 1000;
}

/**
 * Main AI request function with retry logic and fallbacks
 */
export async function makeAIRequest<T = any>(options: AIRequestOptions): Promise<AIResponse<T>> {
  const {
    model = AI_MODELS.PRIMARY,
    maxTokens = 4000,
    temperature = 0.1,
    userId,
    endpoint = '/api/ai/request',
    cacheKey: providedCacheKey,
    cacheTTL = CACHE_TTL_MS,
    useFallback = true,
    retries = 3,
    messages,
    responseFormat = { type: 'json_object' }
  } = options;
  
  const startTime = Date.now();
  
  // Check cache first
  const cacheKey = providedCacheKey || generateCacheKey(options);
  const cachedResponse = getCachedResponse(cacheKey);
  if (cachedResponse) {
    console.log('[AI Manager] Returning cached response');
    return {
      data: cachedResponse,
      model: model,
      cached: true,
      latencyMs: Date.now() - startTime
    };
  }
  
  let lastError: Error | null = null;
  let currentModel = model;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      await waitForRateLimit();
      
      console.log(`[AI Manager] Request attempt ${attempt + 1}/${retries} using ${currentModel}`);
      
      const response = await openai.chat.completions.create({
        model: currentModel,
        messages,
        max_tokens: maxTokens,
        temperature,
        response_format: responseFormat
      });
      
      // Track token usage
      if (userId && response.usage) {
        await trackOpenAIUsage(userId, endpoint, response, currentModel, startTime);
      }
      
      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from AI');
      }
      
      let data: T;
      if (responseFormat.type === 'json_object') {
        data = JSON.parse(content);
      } else {
        data = content as T;
      }
      
      // Reset failure counter on success
      rateLimitState.consecutiveFailures = 0;
      
      // Cache the response
      setCachedResponse(cacheKey, data, cacheTTL);
      
      return {
        data,
        model: currentModel,
        cached: false,
        tokenUsage: response.usage ? {
          prompt: response.usage.prompt_tokens,
          completion: response.usage.completion_tokens,
          total: response.usage.total_tokens
        } : undefined,
        latencyMs: Date.now() - startTime
      };
      
    } catch (error: any) {
      lastError = error;
      rateLimitState.consecutiveFailures++;
      
      console.error(`[AI Manager] Attempt ${attempt + 1} failed:`, error.message);
      
      // Handle rate limiting
      if (error.status === 429) {
        const retryAfter = parseInt(error.headers?.['retry-after'] || '60', 10);
        rateLimitState.backoffUntil = Date.now() + (retryAfter * 1000);
        console.log(`[AI Manager] Rate limited, backing off for ${retryAfter}s`);
      }
      
      // Try fallback model on certain errors (and if enabled)
      if (useFallback && currentModel !== AI_MODELS.FALLBACK) {
        if (error.status === 429 || error.status === 503 || error.code === 'ETIMEDOUT') {
          console.log(`[AI Manager] Switching to fallback model ${AI_MODELS.FALLBACK}`);
          currentModel = AI_MODELS.FALLBACK;
        }
      }
      
      // Wait before retrying
      if (attempt < retries - 1) {
        const delay = calculateBackoffDelay(attempt);
        console.log(`[AI Manager] Waiting ${Math.round(delay)}ms before retry`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // Track failed request
  if (userId) {
    await trackFailedRequest(userId, endpoint, lastError?.message || 'Unknown error', currentModel);
  }
  
  throw lastError || new Error('AI request failed after all retries');
}

/**
 * Quick AI request using fast model (gpt-4o-mini)
 */
export async function makeQuickAIRequest<T = any>(
  options: Omit<AIRequestOptions, 'model'>
): Promise<AIResponse<T>> {
  return makeAIRequest<T>({
    ...options,
    model: AI_MODELS.FAST
  });
}

/**
 * Vision AI request for image analysis
 */
export async function makeVisionRequest<T = any>(
  imageBase64: string,
  imageFormat: string,
  prompt: string,
  options: Partial<AIRequestOptions> = {}
): Promise<AIResponse<T>> {
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: options.messages?.[0]?.content as string || 'You are an AI assistant analyzing images.'
    },
    {
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { 
          type: 'image_url', 
          image_url: { url: `data:image/${imageFormat};base64,${imageBase64}` }
        }
      ]
    }
  ];
  
  return makeAIRequest<T>({
    model: AI_MODELS.PRIMARY, // Vision requires gpt-4o
    maxTokens: 4000,
    temperature: 0.1,
    ...options,
    messages,
    useFallback: false // Vision doesn't work with mini model
  });
}

/**
 * Clear the response cache
 */
export function clearCache(): void {
  responseCache.clear();
  console.log('[AI Manager] Cache cleared');
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; entries: number } {
  let totalSize = 0;
  responseCache.forEach(entry => {
    totalSize += JSON.stringify(entry.response).length;
  });
  
  return {
    size: totalSize,
    entries: responseCache.size
  };
}

/**
 * Health check for AI service
 */
export async function checkAIHealth(): Promise<{
  available: boolean;
  latencyMs: number;
  model: string;
}> {
  const startTime = Date.now();
  
  try {
    const response = await openai.chat.completions.create({
      model: AI_MODELS.FAST,
      messages: [{ role: 'user', content: 'Say "ok"' }],
      max_tokens: 5
    });
    
    return {
      available: true,
      latencyMs: Date.now() - startTime,
      model: AI_MODELS.FAST
    };
  } catch (error) {
    return {
      available: false,
      latencyMs: Date.now() - startTime,
      model: AI_MODELS.FAST
    };
  }
}

export { openai };
