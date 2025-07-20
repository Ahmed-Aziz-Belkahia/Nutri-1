import passport from "passport";
import { IVerifyOptions, Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users, userNutritionPreferences, type SelectUser } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { 
  generateVerificationToken as createEmailVerificationToken, 
  verifyEmailToken,
  generatePasswordResetToken as createPasswordResetToken
} from "./utils/token";
import {
  sendVerificationEmail,
  sendWelcomeEmail
} from "./services/email";
import authRoutes from "./routes/auth";

const scryptAsync = promisify(scrypt);

const crypto = {
  hash: async (password: string) => {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  },
  compare: async (suppliedPassword: string, storedPassword: string) => {
    try {
      const [hashedPassword, salt] = storedPassword.split(".");
      if (!hashedPassword || !salt) {
        console.warn('Invalid password format in database');
        return false;
      }
      const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
      const suppliedPasswordBuf = (await scryptAsync(
        suppliedPassword,
        salt,
        64
      )) as Buffer;
      
      // Check if buffers have same length
      if (hashedPasswordBuf.length !== suppliedPasswordBuf.length) {
        console.warn('Password hash length mismatch');
        return false;
      }
      
      return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
    } catch (error) {
      console.error('Password comparison error:', error);
      return false;
    }
  },
};

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

export function setupAuth(app: Express) {
  const MemoryStore = createMemoryStore(session);
  const isProduction = app.get("env") === "production";

  const sessionSettings: session.SessionOptions = {
    secret: process.env.REPL_ID || "nutri-ai-secret-key-development-12345",
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: false,
      sameSite: 'lax' as const,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,
      path: '/',
    },
    store: new MemoryStore({
      checkPeriod: 86400000,
      ttl: 24 * 60 * 60 * 1000, // 24 hours
    }),
    name: 'sessionId',
    rolling: true, // Reset expiry on activity
  };

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      { usernameField: "email", passwordField: "password" },
      async (email, password, done) => {
        try {
          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

          if (!user) {
            return done(null, false, { message: "Email not found" });
          }

          const isMatch = await crypto.compare(password, user.password);
          if (!isMatch) {
            return done(null, false, { message: "Incorrect password" });
          }

          return done(null, user);
        } catch (err) {
          console.error("Login error:", err);
          return done(err);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    console.log("Serializing user:", user.id);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    console.log("Deserializing user ID:", id);
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!user) {
        console.log("User not found during deserialization:", id);
        return done(null, false);
      }

      console.log("User found during deserialization:", user.id, user.email);
      return done(null, user);
    } catch (err) {
      console.error("Deserialization error:", err);
      done(err);
    }
  });

  app.post("/api/register", async (req, res) => {
    try {
      console.log("Registration request:", req.body);
      const { email, password, profile } = req.body;

      // Check if user already exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }

      // Create user
      // Create a new object matching the database schema type
      const userData = {
        email,
        password: await crypto.hash(password),
        hasCompletedOnboarding: Boolean(profile),
        lastActivityDate: new Date(),
        profileImage: null,
        preferred_language: 'en', // this one actually uses snake_case in the schema
        // Initialize new user stats
        currentStreak: 0,
        longestStreak: 0,
        experiencePoints: 0,
        level: 1
      };
      
      const [newUser] = await db
        .insert(users)
        .values(userData)
        .returning();

      console.log("User created:", newUser);

      // If profile data is provided, create nutrition preferences
      if (profile && newUser) {
        try {
          // Create a properly typed object for nutrition preferences
          const nutritionPreferencesData = {
            userId: newUser.id,
            currentWeight: Number(profile.currentWeight),
            goalWeight: Number(profile.goalWeight),
            height: Number(profile.height || 170), // Default to 170cm if not provided
            weightGoal: profile.weightGoal,
            activityLevel: profile.activityLevel,
            calorieGoal: Number(profile.calorieGoal),
            proteinGoal: Number(profile.proteinGoal),
            carbsGoal: Number(profile.carbsGoal),
            fatGoal: Number(profile.fatGoal),
            updatedAt: new Date(),
            dietaryRestrictions: profile.dietaryRestrictions || [],
            allergies: profile.allergies || []
          };

          console.log("Creating nutrition preferences:", nutritionPreferencesData);

          await db
            .insert(userNutritionPreferences)
            .values(nutritionPreferencesData);

          console.log("Nutrition preferences created successfully");
        } catch (error) {
          console.error("Error creating nutrition preferences:", error);
          // Continue with login even if preferences creation fails
        }
      }

      // Generate verification token and send verification email
      try {
        const verificationToken = await createEmailVerificationToken(newUser.id);
        await sendVerificationEmail(email, verificationToken);
        console.log("Verification email sent successfully");
        
        // Send welcome email
        await sendWelcomeEmail(email, profile?.name || null);
        console.log("Welcome email sent successfully");
      } catch (emailError) {
        console.error("Error sending verification/welcome email:", emailError);
        // Continue with login even if email sending fails
      }

      // Log in the new user
      req.login(newUser, (err) => {
        if (err) {
          console.error("Login error after registration:", err);
          return res.status(500).json({ error: "Failed to create session" });
        }
        
        // Force session save to ensure persistence
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("Session save error after registration:", saveErr);
            return res.status(500).json({ error: "Failed to save session" });
          }
          
          res.json({ 
            ok: true,
            message: "Account created successfully. Please check your email to verify your account.",
            user: {
              id: newUser.id,
              email: newUser.email,
              hasCompletedOnboarding: newUser.hasCompletedOnboarding
            }
          });
        });
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({
        error: "Failed to register user",
        message: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: Express.User | false, info: IVerifyOptions) => {
      if (err) {
        console.error("Authentication error:", err);
        return res.status(500).json({ error: "An unexpected error occurred" });
      }
      if (!user) {
        return res.status(401).json({ error: info.message || "Authentication failed" });
      }

      req.logIn(user, (err) => {
        if (err) {
          console.error("Login session error:", err);
          return res.status(500).json({ error: "Failed to create session" });
        }
        
        // Force session save to ensure persistence
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("Session save error:", saveErr);
            return res.status(500).json({ error: "Failed to save session" });
          }
          
          // Log successful login information
          console.log("User logged in successfully:", {
            userId: user.id,
            email: user.email,
            sessionID: req.sessionID
          });
          
          res.json({ 
            ok: true,
            user: {
              id: user.id,
              email: user.email,
              hasCompletedOnboarding: user.hasCompletedOnboarding
            }
          });
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ ok: true });
    });
  });

  app.get("/api/user", (req, res) => {
    console.log("GET /api/user - Session debug:", {
      sessionID: req.sessionID,
      isAuthenticated: req.isAuthenticated(),
      user: req.user,
      session: req.session
    });
    
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    res.json(req.user);
  });
  
  // Register our additional auth routes for email verification and password reset
  app.use('/api/auth', authRoutes);
}