/**
 * Sign in with Apple.
 *
 * The native app runs Apple's own authorization sheet and receives an identity
 * token — a JWT signed by Apple. This route verifies that token and exchanges
 * it for our own session tokens. Nothing here trusts client-supplied identity:
 * the `sub` and `email` are read from the *verified* token payload, never from
 * the request body.
 *
 * Two Apple behaviours drive the design:
 *
 *  - `sub` (the per-app user identifier) is the ONLY field present on every
 *    sign-in, so it is the join key. Email is not stable enough.
 *  - Email and full name are returned by Apple *only on the very first
 *    authorization*. If the user deletes and reinstalls, they will not come
 *    again — so the account must be findable by `sub` alone.
 */

import { Router, Response, Request } from 'express';
import jwt, { type JwtHeader, type SigningKeyCallback } from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import rateLimit from 'express-rate-limit';
import { randomBytes } from 'crypto';
import { db } from '@db';
import { users, userTokenLimits } from '@db/schema';
import { eq } from 'drizzle-orm';
import {
  generateAccessToken,
  generateRefreshToken,
  storeRefreshToken,
  getTokenExpiryDates
} from '../utils/jwt';

const router = Router();

const APPLE_ISSUER = 'https://appleid.apple.com';

/**
 * Audience is the app's bundle identifier for native sign-in. Kept in an env
 * var so a rename does not require a code change, but defaulted to the value
 * in capacitor.config.ts so a misconfigured deploy still validates correctly.
 */
const DEFAULT_BUNDLE_ID = 'online.nutriai.app';

// jwt.verify types `audience` as a non-empty tuple, so guarantee at least one
// entry rather than casting an array that could be empty after filtering.
const APPLE_AUDIENCE: [string, ...string[]] = (() => {
  const list = (process.env.APPLE_BUNDLE_ID || DEFAULT_BUNDLE_ID)
    .split(',')
    .map((a) => a.trim())
    .filter(Boolean);
  return list.length > 0 ? (list as [string, ...string[]]) : [DEFAULT_BUNDLE_ID];
})();

const appleKeys = jwksClient({
  jwksUri: `${APPLE_ISSUER}/auth/keys`,
  cache: true,
  cacheMaxAge: 24 * 60 * 60 * 1000, // Apple rotates rarely; a day is plenty
  rateLimit: true,
  jwksRequestsPerMinute: 10
});

function getAppleSigningKey(header: JwtHeader, callback: SigningKeyCallback): void {
  appleKeys.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    callback(null, key?.getPublicKey());
  });
}

interface AppleIdentityPayload {
  sub: string;
  email?: string;
  email_verified?: boolean | string;
  is_private_email?: boolean | string;
  aud: string;
  iss: string;
}

function verifyAppleIdentityToken(identityToken: string): Promise<AppleIdentityPayload> {
  return new Promise((resolve, reject) => {
    jwt.verify(
      identityToken,
      getAppleSigningKey as any,
      { algorithms: ['RS256'], issuer: APPLE_ISSUER, audience: APPLE_AUDIENCE },
      (err: unknown, decoded: unknown) => {
        if (err) return reject(err);
        if (!decoded || typeof decoded === 'string') {
          return reject(new Error('Unexpected identity token payload'));
        }
        resolve(decoded as unknown as AppleIdentityPayload);
      }
    );
  });
}

/** Apple sends booleans as either real booleans or the strings "true"/"false". */
const asBool = (v: boolean | string | undefined): boolean => v === true || v === 'true';

const appleLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many sign-in attempts. Please try again shortly.' },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * POST /api/auth/apple
 * Body: { identityToken, givenName?, familyName? }
 */
router.post('/apple', appleLimiter, async (req: Request, res: Response) => {
  try {
    const { identityToken, givenName, familyName } = req.body ?? {};

    if (!identityToken || typeof identityToken !== 'string') {
      return res.status(400).json({ error: 'identityToken is required' });
    }

    let payload: AppleIdentityPayload;
    try {
      payload = await verifyAppleIdentityToken(identityToken);
    } catch (err) {
      console.warn('[Apple Auth] Identity token rejected:', err instanceof Error ? err.message : err);
      return res.status(401).json({ error: 'Invalid Apple identity token' });
    }

    const appleSub = payload.sub;
    const appleEmail = payload.email?.toLowerCase() ?? null;
    const isPrivateRelay = asBool(payload.is_private_email);

    // 1. Existing Apple user — match on the stable subject.
    let [user] = await db.select().from(users).where(eq(users.appleSub, appleSub)).limit(1);

    // 2. Otherwise link to an existing local account with the same email, so a
    //    user who signed up with email and later taps "Sign in with Apple"
    //    lands in the same account instead of a duplicate.
    if (!user && appleEmail) {
      const [existing] = await db.select().from(users).where(eq(users.email, appleEmail)).limit(1);
      if (existing) {
        const [linked] = await db
          .update(users)
          .set({
            appleSub,
            appleEmail,
            isPrivateRelayEmail: isPrivateRelay,
            authProvider: 'both',
            isEmailVerified: true,
            emailVerifiedVia: existing.emailVerifiedVia ?? 'apple',
            lastLoginAt: new Date()
          })
          .where(eq(users.id, existing.id))
          .returning();
        user = linked;
      }
    }

    // 3. New account.
    if (!user) {
      if (!appleEmail) {
        // Apple only sends the email on first authorization. Arriving here with
        // no email and no matching sub means the user previously authorized
        // this app and then the account was deleted server-side.
        return res.status(409).json({
          error: 'apple_email_unavailable',
          message:
            'Apple did not provide an email for this account. Remove NutriAI from ' +
            'Settings > Apple ID > Sign in with Apple, then try again.'
        });
      }

      const displayName = [givenName, familyName].filter(Boolean).join(' ').trim();
      // Username is NOT NULL and unique; derive one and keep it collision-safe.
      const base = (appleEmail.split('@')[0] || 'user').replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20) || 'user';
      const username = `${base}_${randomBytes(3).toString('hex')}`;

      const [created] = await db
        .insert(users)
        .values({
          username: displayName || username,
          email: appleEmail,
          // Apple accounts never authenticate with a password. Store random
          // bytes rather than an empty string so the scrypt comparison in the
          // password login path can never succeed against this row.
          password: randomBytes(32).toString('hex'),
          appleSub,
          appleEmail,
          isPrivateRelayEmail: isPrivateRelay,
          authProvider: 'apple',
          isEmailVerified: true,
          emailVerifiedVia: 'apple',
          hasCompletedOnboarding: false,
          lastLoginAt: new Date()
        })
        .returning();

      user = created;

      await db.insert(userTokenLimits).values({ userId: created.id }).onConflictDoNothing();
      console.log('[Apple Auth] Created account for Apple user', created.id);
    } else {
      await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
    }

    // Issue our own session tokens.
    const accessToken = generateAccessToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id, user.email);
    const { refreshTokenExpiry } = getTokenExpiryDates();
    await storeRefreshToken(user.id, refreshToken, refreshTokenExpiry);

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 365 * 24 * 60 * 60 * 1000
    });

    // Sign in with Apple is native-only, so always return the bearer tokens.
    res.json({
      ok: true,
      message: 'Signed in with Apple',
      user: {
        id: user.id,
        email: user.email,
        hasCompletedOnboarding: user.hasCompletedOnboarding,
        preferredLanguage: user.preferred_language,
        profileImage: user.profileImage,
        isAdmin: user.isAdmin
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('[Apple Auth] Sign-in error:', error);
    res.status(500).json({ error: 'Apple sign-in failed' });
  }
});

export default router;
