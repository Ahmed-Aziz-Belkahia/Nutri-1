import { db } from "@db";
import { 
  users, 
  foodLogs, 
  weightLogs, 
  userNutritionPreferences, 
  mealPlans 
} from "@db/schema";
import { eq, desc, gte, and } from "drizzle-orm";
import OpenAI from "openai";
import { trackOpenAIUsage } from "../utils/token-tracker";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Simple in-memory rate limiting (per user, max 20 messages per minute)
const rateLimitMap = new Map<number, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_MESSAGE_LENGTH = 2000; // Prevent abuse with very long messages

// Clean up expired rate limit entries every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  const expiredUsers: number[] = [];
  rateLimitMap.forEach((limit, userId) => {
    if (now > limit.resetTime) {
      expiredUsers.push(userId);
    }
  });
  expiredUsers.forEach(userId => rateLimitMap.delete(userId));
}, 5 * 60 * 1000);

function checkRateLimit(userId: number): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  
  if (userLimit.count >= RATE_LIMIT_MAX) {
    return false;
  }
  
  userLimit.count++;
  return true;
}

interface UserContext {
  profile: {
    name: string;
    age?: number;
    gender?: string;
    height?: number;
    currentWeight?: number;
    goalWeight?: number;
    activityLevel?: string;
    dietaryPreferences?: string[];
  };
  goals: {
    caloriesGoal?: number;
    proteinGoal?: number;
    carbsGoal?: number;
    fatGoal?: number;
  };
  recentMeals: Array<{
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    date: string;
  }>;
  weightHistory: Array<{
    weight: number;
    date: string;
  }>;
  todayStats: {
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
    mealsLogged: number;
  };
  activeMealPlan?: {
    name: string;
    description?: string;
  };
}

async function getUserContext(userId: number): Promise<UserContext> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Get user basic info
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  // Get nutrition preferences (contains age, gender, height, weight, goals)
  const [nutritionPrefs] = await db
    .select()
    .from(userNutritionPreferences)
    .where(eq(userNutritionPreferences.userId, userId))
    .limit(1);

  // Get recent food logs
  const recentFoodLogs = await db
    .select()
    .from(foodLogs)
    .where(
      and(
        eq(foodLogs.userId, userId),
        gte(foodLogs.date, sevenDaysAgo)
      )
    )
    .orderBy(desc(foodLogs.date))
    .limit(50);

  // Get today's food logs for stats
  const todayFoodLogs = await db
    .select()
    .from(foodLogs)
    .where(
      and(
        eq(foodLogs.userId, userId),
        gte(foodLogs.date, today)
      )
    );

  // Get weight history
  const weightHistory = await db
    .select()
    .from(weightLogs)
    .where(eq(weightLogs.userId, userId))
    .orderBy(desc(weightLogs.loggedAt))
    .limit(30);

  // Get active meal plan
  const [activePlan] = await db
    .select()
    .from(mealPlans)
    .where(
      and(
        eq(mealPlans.userId, userId),
        eq(mealPlans.status, "active")
      )
    )
    .limit(1);

  // Calculate today's stats
  const todayStats = todayFoodLogs.reduce(
    (acc, log) => ({
      totalCalories: acc.totalCalories + (log.calories || 0),
      totalProtein: acc.totalProtein + (log.protein || 0),
      totalCarbs: acc.totalCarbs + (log.carbs || 0),
      totalFat: acc.totalFat + (log.fat || 0),
      mealsLogged: acc.mealsLogged + 1,
    }),
    { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0, mealsLogged: 0 }
  );

  return {
    profile: {
      name: user?.username || "User",
      age: nutritionPrefs?.age ?? undefined,
      gender: nutritionPrefs?.gender ?? undefined,
      height: nutritionPrefs?.height ?? undefined,
      currentWeight: nutritionPrefs?.currentWeight ?? undefined,
      goalWeight: nutritionPrefs?.goalWeight ?? undefined,
      activityLevel: nutritionPrefs?.activityLevel ?? undefined,
      dietaryPreferences: [],
    },
    goals: {
      caloriesGoal: nutritionPrefs?.caloriesGoal ?? undefined,
      proteinGoal: nutritionPrefs?.proteinGoal ?? undefined,
      carbsGoal: nutritionPrefs?.carbsGoal ?? undefined,
      fatGoal: nutritionPrefs?.fatGoal ?? undefined,
    },
    recentMeals: recentFoodLogs.map((m) => ({
      name: m.name || "Unnamed meal",
      calories: m.calories || 0,
      protein: m.protein || 0,
      carbs: m.carbs || 0,
      fat: m.fat || 0,
      date: m.date?.toISOString() || new Date().toISOString(),
    })),
    weightHistory: weightHistory.map((w) => ({
      weight: Number(w.weight) || 0,
      date: w.loggedAt?.toISOString() || new Date().toISOString(),
    })),
    todayStats,
    activeMealPlan: activePlan
      ? {
          name: `Meal Plan (${activePlan.date})`,
          description: `${activePlan.totalCalories} calories`,
        }
      : undefined,
  };
}

function buildSystemPrompt(context: UserContext, language: string): string {
  const langInstructions: Record<string, string> = {
    en: "Respond in English.",
    fr: "Répondez en français.",
    pl: "Odpowiadaj po polsku.",
    es: "Responde en español.",
    ar: "أجب باللغة العربية.",
  };

  const langInstruction = langInstructions[language] || langInstructions.en;

  return `You are NutriCoach, a friendly and knowledgeable AI nutrition assistant. ${langInstruction}

You have access to the user's complete nutrition data and should use it to provide personalized advice.

USER PROFILE:
- Name: ${context.profile.name}
${context.profile.age ? `- Age: ${context.profile.age} years old` : ""}
${context.profile.gender ? `- Gender: ${context.profile.gender}` : ""}
${context.profile.height ? `- Height: ${context.profile.height} cm` : ""}
${context.profile.currentWeight ? `- Current Weight: ${context.profile.currentWeight} kg` : ""}
${context.profile.goalWeight ? `- Goal Weight: ${context.profile.goalWeight} kg` : ""}
${context.profile.activityLevel ? `- Activity Level: ${context.profile.activityLevel}` : ""}
${context.profile.dietaryPreferences?.length ? `- Dietary Preferences: ${context.profile.dietaryPreferences.join(", ")}` : ""}

NUTRITION GOALS:
${context.goals.caloriesGoal ? `- Daily Calories: ${context.goals.caloriesGoal} kcal` : ""}
${context.goals.proteinGoal ? `- Protein Target: ${context.goals.proteinGoal}g` : ""}
${context.goals.carbsGoal ? `- Carbs Target: ${context.goals.carbsGoal}g` : ""}
${context.goals.fatGoal ? `- Fat Target: ${context.goals.fatGoal}g` : ""}

TODAY'S PROGRESS:
- Calories: ${context.todayStats.totalCalories}${context.goals.caloriesGoal ? ` / ${context.goals.caloriesGoal}` : ""} kcal
- Protein: ${context.todayStats.totalProtein}${context.goals.proteinGoal ? ` / ${context.goals.proteinGoal}` : ""}g
- Carbs: ${context.todayStats.totalCarbs}${context.goals.carbsGoal ? ` / ${context.goals.carbsGoal}` : ""}g
- Fat: ${context.todayStats.totalFat}${context.goals.fatGoal ? ` / ${context.goals.fatGoal}` : ""}g
- Meals logged today: ${context.todayStats.mealsLogged}

${context.activeMealPlan ? `ACTIVE MEAL PLAN: ${context.activeMealPlan.name}${context.activeMealPlan.description ? ` - ${context.activeMealPlan.description}` : ""}` : ""}

${context.weightHistory.length > 1 ? `WEIGHT TREND: Started at ${context.weightHistory[context.weightHistory.length - 1]?.weight}kg, now ${context.weightHistory[0]?.weight}kg` : ""}

RECENT MEALS (last 7 days):
${context.recentMeals.slice(0, 10).map((m) => `- ${m.name}: ${m.calories}kcal, ${m.protein}g protein`).join("\n") || "No meals logged recently"}

GUIDELINES:
1. Be encouraging, supportive, and positive
2. Provide specific, actionable advice based on the user's data
3. Reference their actual meals and progress when relevant
4. Keep responses concise but helpful (2-4 paragraphs max)
5. Use emojis sparingly to make responses friendly
6. If asked about something you don't know, suggest they explore the app's features
7. Never recommend extreme diets or unsafe practices
8. Consider their dietary preferences when making suggestions`;
}

export async function handleAICoachMessage(
  userId: number,
  message: string,
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>,
  language: string = "en"
): Promise<{ response: string; tokensUsed: number }> {
  const startTime = Date.now();

  // Check message length
  if (message.length > MAX_MESSAGE_LENGTH) {
    const lengthErrorMessages: Record<string, string> = {
      en: "Your message is too long. Please keep it under 2000 characters. ✂️",
      fr: "Votre message est trop long. Veuillez le limiter à 2000 caractères. ✂️",
      pl: "Twoja wiadomość jest zbyt długa. Ogranicz ją do 2000 znaków. ✂️",
      es: "Tu mensaje es demasiado largo. Por favor, limítalo a 2000 caracteres. ✂️",
      ar: "رسالتك طويلة جدًا. يرجى الاحتفاظ بها أقل من 2000 حرف. ✂️",
    };
    return {
      response: lengthErrorMessages[language] || lengthErrorMessages.en,
      tokensUsed: 0,
    };
  }

  // Check rate limit
  if (!checkRateLimit(userId)) {
    const rateLimitMessages: Record<string, string> = {
      en: "You're sending messages too quickly! Please wait a moment before trying again. 🕐",
      fr: "Vous envoyez des messages trop rapidement ! Veuillez patienter un moment. 🕐",
      pl: "Wysyłasz wiadomości zbyt szybko! Poczekaj chwilę przed ponowną próbą. 🕐",
      es: "¡Estás enviando mensajes demasiado rápido! Por favor espera un momento. 🕐",
      ar: "أنت ترسل الرسائل بسرعة كبيرة! يرجى الانتظار لحظة قبل المحاولة مرة أخرى. 🕐",
    };
    return {
      response: rateLimitMessages[language] || rateLimitMessages.en,
      tokensUsed: 0,
    };
  }

  try {
    // Get full user context
    const context = await getUserContext(userId);

    // Build the system prompt with context
    const systemPrompt = buildSystemPrompt(context, language);

    // Prepare messages for OpenAI
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.slice(-10).map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      { role: "user", content: message },
    ];

    // Call OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      max_tokens: 500,
      temperature: 0.7,
    });

    const assistantMessage = response.choices[0]?.message?.content || "I'm sorry, I couldn't process that request. Please try again!";
    const tokensUsed = response.usage?.total_tokens || 0;

    // Track usage
    await trackOpenAIUsage(
      userId,
      "ai-coach-message",
      response,
      "gpt-4o",
      startTime
    );

    return {
      response: assistantMessage,
      tokensUsed,
    };
  } catch (error) {
    console.error("AI Coach error:", error);
    
    // Return a friendly error message
    const errorMessages: Record<string, string> = {
      en: "I'm having trouble connecting right now. Please try again in a moment! 🙏",
      fr: "J'ai des difficultés à me connecter. Veuillez réessayer dans un instant ! 🙏",
      pl: "Mam problemy z połączeniem. Spróbuj ponownie za chwilę! 🙏",
      es: "Tengo problemas para conectarme. ¡Por favor, inténtalo de nuevo en un momento! 🙏",
      ar: "أواجه مشكلة في الاتصال الآن. يرجى المحاولة مرة أخرى بعد قليل! 🙏",
    };

    return {
      response: errorMessages[language] || errorMessages.en,
      tokensUsed: 0,
    };
  }
}
