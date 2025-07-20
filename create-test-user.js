// Create a test user for immediate app configuration
import { db } from './db/index.ts';
import { users, userNutritionPreferences } from './db/schema.ts';
import { eq } from 'drizzle-orm';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

const crypto = {
  hash: async (password) => {
    const salt = randomBytes(16).toString("hex");
    const buf = await scryptAsync(password, salt, 64);
    return `${buf.toString("hex")}.${salt}`;
  }
};

async function createTestUser() {
  try {
    console.log('Creating test user...');
    
    // Check if test user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, 'test@nutriai.com')
    });
    
    if (existingUser) {
      console.log('Test user already exists:', existingUser.email);
      return existingUser;
    }
    
    // Create test user
    const hashedPassword = await crypto.hash('test123');
    
    const userData = {
      email: 'test@nutriai.com',
      password: hashedPassword,
      hasCompletedOnboarding: true,
      lastActivityDate: new Date(),
      profileImage: null,
      preferred_language: 'en',
      currentStreak: 0,
      longestStreak: 0,
      experiencePoints: 0,
      level: 1,
      isAdmin: false
    };
    
    const [newUser] = await db
      .insert(users)
      .values(userData)
      .returning();
    
    console.log('Test user created:', newUser.email);
    
    // Create nutrition preferences for test user
    const nutritionData = {
      userId: newUser.id,
      height: 175,
      currentWeight: 70,
      goalWeight: 65,
      weightGoal: 'lose',
      activityLevel: 'moderate',
      caloriesGoal: 2000,
      proteinGoal: 25,
      carbsGoal: 45,
      fatGoal: 30,
      dietaryRestrictions: [],
      allergies: [],
      mealBudget: 'medium',
      experienceLevel: 'intermediate',
      updatedAt: new Date()
    };
    
    await db
      .insert(userNutritionPreferences)
      .values(nutritionData);
    
    console.log('Test user nutrition preferences created');
    console.log('✅ Test user setup complete');
    console.log('Login credentials: test@nutriai.com / test123');
    
    return newUser;
    
  } catch (error) {
    console.error('Error creating test user:', error);
    throw error;
  }
}

createTestUser().catch(console.error);