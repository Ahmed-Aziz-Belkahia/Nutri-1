#!/usr/bin/env node
/**
 * Create the demo account App Review signs in with.
 *
 * Apple requires working credentials, and a reviewer who logs into an empty
 * app sees an empty app — so this also populates a few days of meals and a
 * couple of recipes. The reviewer lands on a dashboard with real numbers on it.
 *
 *   node scripts/seed-demo-account.js
 *   node scripts/seed-demo-account.js --email demo@nutriai.online --password '...'
 *
 * Idempotent: re-running wipes this user's logs/recipes/preferences and
 * rebuilds them, so the demo account can be refreshed before each submission
 * without accumulating duplicates. It touches no other user.
 *
 * NOTE: passwords use the same scrypt scheme as server/routes/jwt-auth.ts
 * (`${hash}.${salt}`, scrypt N=default, keylen 64). bcrypt is in the
 * dependency list but is NOT what the auth path verifies against — hashing
 * with it here would create an account that cannot log in.
 */

import Database from 'better-sqlite3';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const scryptAsync = promisify(scrypt);

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const EMAIL = arg('email', process.env.DEMO_EMAIL || 'demo@nutriai.online');
const PASSWORD = arg('password', process.env.DEMO_PASSWORD || 'NutriDemo2026!');
const USERNAME = arg('username', 'demo');

const dbPath = process.env.DATABASE_PATH || path.resolve(process.cwd(), 'local.db');
if (!fs.existsSync(dbPath)) {
  console.error(`No database at ${dbPath}. Run "npm run db:reset" first, or set DATABASE_PATH.`);
  process.exit(1);
}

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString('hex')}.${salt}`;
}

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

const DAY = 86_400_000;
const now = Date.now();

/** A meal at `daysAgo` days back, at `hour` local time. */
const at = (daysAgo, hour) => {
  const d = new Date(now - daysAgo * DAY);
  d.setHours(hour, Math.floor((hour * 7) % 60), 0, 0);
  return d.getTime();
};

// Four days of plausible eating, landing near the 1,800 kcal target below.
// Today is deliberately partial — a reviewer opening the app mid-afternoon
// should see a day in progress, not a suspiciously perfect one.
const MEALS = [
  [0, 8, 'Greek yogurt with berries and honey', 320, 24, 38, 8, 'breakfast'],
  [0, 13, 'Grilled chicken salad with avocado', 540, 46, 22, 29, 'lunch'],
  [1, 8, 'Scrambled eggs on sourdough toast', 430, 26, 34, 21, 'breakfast'],
  [1, 12, 'Turkey and hummus wrap', 480, 32, 51, 16, 'lunch'],
  [1, 19, 'Salmon, quinoa and roasted broccoli', 610, 44, 45, 27, 'dinner'],
  [1, 16, 'Apple and a handful of almonds', 230, 6, 26, 13, 'snack'],
  [2, 9, 'Oatmeal with banana and peanut butter', 450, 16, 62, 16, 'breakfast'],
  [2, 13, 'Chicken burrito bowl', 680, 41, 74, 22, 'lunch'],
  [2, 20, 'Vegetable stir-fry with tofu', 520, 27, 58, 19, 'dinner'],
  [3, 8, 'Protein smoothie with spinach and mango', 340, 30, 41, 6, 'breakfast'],
  [3, 13, 'Lentil soup with wholegrain bread', 470, 24, 66, 11, 'lunch'],
  [3, 19, 'Beef and vegetable pasta', 720, 43, 79, 24, 'dinner']
];

const RECIPES = [
  {
    name: 'Salmon, Quinoa & Roasted Broccoli',
    description: 'A 25-minute weeknight dinner built around what is usually already in the fridge.',
    ingredients: ['2 salmon fillets', '150g quinoa', '1 head broccoli', '2 tbsp olive oil', '1 lemon', 'Salt and black pepper'],
    instructions: [
      'Heat the oven to 200°C.',
      'Rinse the quinoa and simmer in 300ml water for 15 minutes.',
      'Toss the broccoli in olive oil, salt and pepper; roast for 18 minutes.',
      'Season the salmon and roast alongside for the final 12 minutes.',
      'Serve with a squeeze of lemon over everything.'
    ],
    nutrition: { calories: 610, protein: 44, carbs: 45, fat: 27 }
  },
  {
    name: 'Chicken Burrito Bowl',
    description: 'Meal-preps well — everything holds for three days in the fridge.',
    ingredients: ['300g chicken thigh', '200g rice', '1 tin black beans', '1 avocado', '1 lime', '2 tsp smoked paprika', 'Coriander'],
    instructions: [
      'Rub the chicken with paprika, salt and pepper, then pan-fry 6 minutes a side.',
      'Cook the rice; stir through lime juice and chopped coriander.',
      'Warm the drained black beans with a pinch of salt.',
      'Slice the chicken and build the bowl with the avocado on top.'
    ],
    nutrition: { calories: 680, protein: 41, carbs: 74, fat: 22 }
  }
];

const seed = db.transaction((passwordHash) => {
  let user = db.prepare('SELECT id FROM users WHERE email = ?').get(EMAIL);

  if (user) {
    // Refresh in place so the id (and anything referencing it) stays stable.
    db.prepare(
      `UPDATE users SET password = ?, username = ?, has_completed_onboarding = 1,
       is_email_verified = 1, auth_provider = 'local', preferred_language = 'en'
       WHERE id = ?`
    ).run(passwordHash, USERNAME, user.id);

    db.prepare('DELETE FROM food_logs WHERE user_id = ?').run(user.id);
    db.prepare('DELETE FROM recipes WHERE user_id = ?').run(user.id);
    db.prepare('DELETE FROM user_nutrition_preferences WHERE user_id = ?').run(user.id);
    console.log(`Refreshing existing demo account (id ${user.id}).`);
  } else {
    const res = db.prepare(
      `INSERT INTO users (username, email, password, has_completed_onboarding,
                          is_email_verified, auth_provider, preferred_language)
       VALUES (?, ?, ?, 1, 1, 'local', 'en')`
    ).run(USERNAME, EMAIL, passwordHash);
    user = { id: Number(res.lastInsertRowid) };
    console.log(`Created demo account (id ${user.id}).`);
  }

  // Targets consistent with the profile below, so the dashboard rings add up.
  db.prepare(
    `INSERT INTO user_nutrition_preferences
       (user_id, age, gender, current_weight, goal_weight, height, weight_goal,
        activity_level, daily_calorie_goal, protein_goal_percentage,
        carbs_goal_percentage, fat_goal_percentage, body_type,
        dietary_restrictions, allergies, weight_loss_speed, is_metric,
        workout_frequency, birth_year, birth_month, birth_day)
     VALUES (?, 32, 'male', 84, 76, 180, 'lose', 'moderate', 1800, 30, 40, 30,
             'athletic', '[]', '[]', 0.5, 1, '3-5', 1994, 4, 12)`
  ).run(user.id);

  const insertRecipe = db.prepare(
    `INSERT INTO recipes (user_id, name, description, ingredients, instructions,
                          nutrition_info, source, is_saved)
     VALUES (?, ?, ?, ?, ?, ?, 'created', 1)`
  );
  for (const r of RECIPES) {
    insertRecipe.run(
      user.id, r.name, r.description,
      JSON.stringify(r.ingredients), JSON.stringify(r.instructions),
      JSON.stringify(r.nutrition)
    );
  }

  const insertLog = db.prepare(
    `INSERT INTO food_logs (user_id, name, calories, protein, carbs, fat, date,
                            meal_type, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'scanned')`
  );
  for (const [daysAgo, hour, name, cal, p, c, f, mealType] of MEALS) {
    insertLog.run(user.id, name, cal, p, c, f, at(daysAgo, hour), mealType);
  }

  return user.id;
});

const userId = seed(await hashPassword(PASSWORD));

console.log(`
Demo account ready — paste these into App Store Connect
→ App Review Information → Sign-In Information

  Email:    ${EMAIL}
  Password: ${PASSWORD}

Seeded: ${MEALS.length} logged meals across 4 days, ${RECIPES.length} saved recipes,
a completed profile and an 1,800 kcal daily target. Email is pre-verified, so
the reviewer is not sent a code.

Database: ${dbPath}
User id:  ${userId}
`);

db.close();
