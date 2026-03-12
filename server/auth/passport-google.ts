import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { db } from '../../db';
import { users, userTokenLimits } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

/** Generate a random placeholder password for Google-only users */
async function generateRandomPassword(): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(randomBytes(32).toString('hex'), salt, 64)) as Buffer;
  return `${buf.toString('hex')}.${salt}`;
}

const callbackURL =
  process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback';

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL,
      scope: ['profile', 'email'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const googleId = profile.id;
        const googleEmail = profile.emails?.[0]?.value;
        const googlePicture = profile.photos?.[0]?.value;
        const displayName = profile.displayName || 'Google User';

        if (!googleEmail) {
          return done(new Error('No email found in Google profile'), undefined);
        }

        // 1. User already linked their Google account
        const [existingGoogleUser] = await db
          .select()
          .from(users)
          .where(eq(users.googleId, googleId))
          .limit(1);

        if (existingGoogleUser) {
          await db
            .update(users)
            .set({ lastLoginAt: new Date(), googlePicture: googlePicture ?? null })
            .where(eq(users.id, existingGoogleUser.id));

          return done(null, { ...existingGoogleUser, lastLoginAt: new Date() });
        }

        // 2. Email already registered — merge Google into existing account
        const [existingEmailUser] = await db
          .select()
          .from(users)
          .where(eq(users.email, googleEmail))
          .limit(1);

        if (existingEmailUser) {
          await db
            .update(users)
            .set({
              googleId,
              googleEmail,
              googlePicture: googlePicture ?? null,
              authProvider: 'both',
              isEmailVerified: true,
              emailVerifiedVia: 'google',
              lastLoginAt: new Date(),
            })
            .where(eq(users.id, existingEmailUser.id));

          return done(null, {
            ...existingEmailUser,
            googleId,
            googleEmail,
            googlePicture: googlePicture ?? null,
            authProvider: 'both',
            isEmailVerified: true,
            emailVerifiedVia: 'google',
            lastLoginAt: new Date(),
          });
        }

        // 3. Brand new user — create account
        const randomPassword = await generateRandomPassword();
        const username =
          displayName.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();

        const [newUser] = await db
          .insert(users)
          .values({
            username,
            email: googleEmail,
            password: randomPassword,
            googleId,
            googleEmail,
            googlePicture: googlePicture ?? null,
            authProvider: 'google',
            isEmailVerified: true,
            emailVerifiedVia: 'google',
            hasCompletedOnboarding: false,
            lastLoginAt: new Date(),
            currentStreak: 0,
            longestStreak: 0,
            experiencePoints: 0,
            level: 1,
            isAdmin: false,
          })
          .returning();

        // Create free-tier token limits for the new user
        await db.insert(userTokenLimits).values({
          userId: newUser.id,
          tier: 'free',
          dailyTokenLimit: 10000,
          monthlyTokenLimit: 200000,
          dailyUsed: 0,
          monthlyUsed: 0,
        });

        return done(null, newUser);
      } catch (error) {
        console.error('[Google OAuth] Strategy error:', error);
        return done(error as Error, undefined);
      }
    }
  )
);

// Minimal serialization — we use JWTs, not sessions
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) return done(new Error('User not found'), null);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
