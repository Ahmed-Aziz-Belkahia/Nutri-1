import { z } from "zod";

export const UserProfileSchema = z.object({
  id: z.number(),
  userId: z.number(),
  height: z.number().nullable(),
  currentWeight: z.number().nullable(),
  goalWeight: z.number().nullable(),
  weightGoal: z.enum(['loss', 'maintain', 'gain']).nullable(),
  activityLevel: z.string().nullable(),
  calorieGoal: z.number().nullable(),
  caloriesGoal: z.number().nullable(),
  proteinGoal: z.number().nullable(),
  carbsGoal: z.number().nullable(),
  fatGoal: z.number().nullable(),
  bodyFatPercentage: z.number().nullable(),
  bodyType: z.string().nullable(),
  dietaryRestrictions: z.array(z.string()).nullable(),
  allergies: z.array(z.string()).nullable(),
  mealBudget: z.enum(['low', 'medium', 'high']).nullable(),
  experienceLevel: z.string().nullable(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable()
});

export const UserSchema = z.object({
  id: z.number(),
  email: z.string(),
  password: z.string(),
  hasCompletedOnboarding: z.boolean().nullable(),
  currentStreak: z.number().nullable(),
  longestStreak: z.number().nullable(),
  lastActivityDate: z.string().nullable(),
  experiencePoints: z.number().nullable(),
  level: z.number().nullable(),
  profileImage: z.string().nullable()
});

export type UserProfile = z.infer<typeof UserProfileSchema>;
export type User = z.infer<typeof UserSchema>;
