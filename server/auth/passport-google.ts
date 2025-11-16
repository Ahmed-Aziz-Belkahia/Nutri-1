import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { db } from '../../db';
import { users } from '../../db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

// Configure Google OAuth strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL!,
      scope: ['profile', 'email'],
      // Add parameters to help with WebView compatibility
      authorizationParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
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

        // Check if user exists with this Google ID
        const existingGoogleUser = await db
          .select()
          .from(users)
          .where(eq(users.googleId, googleId))
          .limit(1);

        if (existingGoogleUser.length > 0) {
          // User exists with this Google ID - update last login
          const user = existingGoogleUser[0];
          await db
            .update(users)
            .set({
              lastLoginAt: new Date(),
              googlePicture, // Update profile picture in case it changed
            })
            .where(eq(users.id, user.id));

          return done(null, { ...user, lastLoginAt: new Date() });
        }

        // Check if user exists with this email (account merging scenario)
        const existingEmailUser = await db
          .select()
          .from(users)
          .where(eq(users.email, googleEmail))
          .limit(1);

        if (existingEmailUser.length > 0) {
          // Merge Google account with existing local account
          const user = existingEmailUser[0];
          await db
            .update(users)
            .set({
              googleId,
              googleEmail,
              googlePicture: googlePicture || null,
              authProvider: 'both', // User has both local and Google auth
              isEmailVerified: true, // Auto-verify email if authenticated via Google
              emailVerifiedVia: 'google',
              lastLoginAt: new Date(),
            })
            .where(eq(users.id, user.id));

          return done(null, {
            ...user,
            googleId,
            googleEmail,
            googlePicture: googlePicture ? googlePicture : null,
            authProvider: 'both' as const,
            isEmailVerified: true,
            emailVerifiedVia: 'google',
            lastLoginAt: new Date(),
          });
        }

        // Create new user account
        // Generate a random password (they won't need it for Google login)
        const randomPassword = bcrypt.hashSync(
          Math.random().toString(36).slice(-8),
          10
        );

        const newUserResult = await db
          .insert(users)
          .values({
            username: displayName.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now(),
            email: googleEmail,
            password: randomPassword,
            googleId,
            googleEmail,
            googlePicture: googlePicture ? googlePicture : null,
            authProvider: 'google',
            isEmailVerified: true, // Auto-verify for Google accounts
            emailVerifiedVia: 'google',
            hasCompletedOnboarding: false,
            lastLoginAt: new Date(),
            currentStreak: 0,
            longestStreak: 0,
            experiencePoints: 0,
            level: 1,
          })
          .returning();

        const newUser = newUserResult[0];

        // Don't create default nutrition preferences here
        // They will be created during onboarding when user provides actual data

        return done(null, newUser);
      } catch (error) {
        console.error('Google OAuth error:', error);
        return done(error as Error, undefined);
      }
    }
  )
);

// Serialize user for session (we're using JWT, so this is minimal)
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: number, done) => {
  try {
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (userResult.length === 0) {
      return done(new Error('User not found'), null);
    }

    done(null, userResult[0]);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
