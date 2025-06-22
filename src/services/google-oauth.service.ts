import { OAuth2Client } from 'google-auth-library';
import { eq } from 'drizzle-orm';
import db from '../db/connection';
import { usersTable, UserInsert, UserSelect } from '../db/schema';
import { config } from '../config';
import { GoogleUserProfile } from '../types';
import {
  createNotFoundError,
  createInternalServerError,
  safeAsync,
  createBadRequestError,
} from '../utils/error';
import { generateToken } from './auth.service';

/**
 * Initialize Google OAuth2 client
 * Pure function for OAuth client creation
 */
export const createGoogleOAuthClient = (): OAuth2Client => {
  return new OAuth2Client(
    config.googleOAuth.clientId,
    config.googleOAuth.clientSecret,
    config.googleOAuth.redirectUri
  );
};

/**
 * Generate Google OAuth authorization URL
 * Pure function for generating OAuth URL
 */
export const generateGoogleAuthUrl = (): string => {
  const oauth2Client = createGoogleOAuthClient();
  
  const scopes = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    include_granted_scopes: true,
  });

  return authUrl;
};

/**
 * Exchange authorization code for tokens
 * Pure function for token exchange
 */
export const exchangeCodeForTokens = async (code: string): Promise<{ access_token: string; id_token?: string }> => {
  const result = await safeAsync(async () => {
    const oauth2Client = createGoogleOAuthClient();
    
    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens.access_token) {
      throw createBadRequestError('Failed to obtain access token from Google');
    }

    return {
      access_token: tokens.access_token,
      id_token: tokens.id_token,
    };
  });

  if (!result.success) {
    throw createInternalServerError('Failed to exchange authorization code for tokens');
  }

  return result.data;
};

/**
 * Get user profile from Google
 * Pure function for fetching user profile
 */
export const getGoogleUserProfile = async (accessToken: string): Promise<GoogleUserProfile> => {
  const result = await safeAsync(async () => {
    const oauth2Client = createGoogleOAuthClient();
    oauth2Client.setCredentials({ access_token: accessToken });

    const response = await oauth2Client.request({
      url: 'https://www.googleapis.com/oauth2/v2/userinfo',
    });

    const profile = response.data as any;

    if (!profile.email || !profile.id) {
      throw createBadRequestError('Invalid user profile from Google');
    }

    return {
      id: profile.id,
      email: profile.email,
      name: profile.name || profile.email.split('@')[0],
      picture: profile.picture,
      email_verified: profile.verified_email || false,
    };
  });

  if (!result.success) {
    throw createInternalServerError('Failed to fetch user profile from Google');
  }

  return result.data;
};

/**
 * Find or create user from Google profile
 * Pure function for user management
 */
export const findOrCreateGoogleUser = async (
  googleProfile: GoogleUserProfile
): Promise<{ user: Omit<UserSelect, 'password'>; token: string; isNewUser: boolean }> => {
  const result = await safeAsync(async () => {
    // Check if user already exists
    const [existingUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, googleProfile.email))
      .limit(1);

    if (existingUser) {
      // Update existing user with Google profile data if needed
      const updateData: Partial<UserInsert> = {
        updatedAt: new Date(),
      };

      // Update avatar if user doesn't have one and Google provides one
      if (!existingUser.avatarUrl && googleProfile.picture) {
        updateData.avatarUrl = googleProfile.picture;
      }

      // Update name if user doesn't have one
      if (!existingUser.name && googleProfile.name) {
        updateData.name = googleProfile.name;
      }

      // Update email verification status
      if (!existingUser.emailVerified && googleProfile.email_verified) {
        updateData.emailVerified = true;
      }

      // Update provider if it's still 'email'
      if (existingUser.provider === 'email') {
        updateData.provider = 'google';
      }

      // Update user if there are changes
      if (Object.keys(updateData).length > 1) { // More than just updatedAt
        const [updatedUser] = await db
          .update(usersTable)
          .set(updateData)
          .where(eq(usersTable.id, existingUser.id))
          .returning();

        if (updatedUser) {
          const { password: _, ...userWithoutPassword } = updatedUser;
          const token = generateToken(updatedUser.id, updatedUser.email);
          return { user: userWithoutPassword, token, isNewUser: false };
        }
      }

      // Return existing user without changes
      const { password: _, ...userWithoutPassword } = existingUser;
      const token = generateToken(existingUser.id, existingUser.email);
      return { user: userWithoutPassword, token, isNewUser: false };
    }

    // Create new user
    const userData: UserInsert = {
      email: googleProfile.email,
      name: googleProfile.name,
      avatarUrl: googleProfile.picture,
      provider: 'google',
      emailVerified: googleProfile.email_verified,
      password: null, // No password for OAuth users
      updatedAt: new Date(),
    };

    const [createdUser] = await db.insert(usersTable).values(userData).returning();

    if (!createdUser) {
      throw createInternalServerError('Failed to create user');
    }

    // Generate token
    const token = generateToken(createdUser.id, createdUser.email);

    // Return user without password
    const { password: _, ...userWithoutPassword } = createdUser;

    return {
      user: userWithoutPassword,
      token,
      isNewUser: true,
    };
  });

  if (!result.success) {
    throw result.error;
  }

  return result.data;
};

/**
 * Complete Google OAuth flow
 * Orchestrates the entire OAuth process
 */
export const completeGoogleOAuth = async (
  code: string
): Promise<{ user: Omit<UserSelect, 'password'>; token: string; isNewUser: boolean }> => {
  const result = await safeAsync(async () => {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Get user profile
    const googleProfile = await getGoogleUserProfile(tokens.access_token);

    // Find or create user
    const userResult = await findOrCreateGoogleUser(googleProfile);

    return userResult;
  });

  if (!result.success) {
    throw result.error;
  }

  return result.data;
}; 