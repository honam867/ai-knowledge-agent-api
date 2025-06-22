import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db/connection';
import { usersTable, UserInsert, UserSelect } from '../db/schema';
import { config } from '../config';
import {
  createNotFoundError,
  createInternalServerError,
  safeAsync,
  createBadRequestError,
} from '../utils/error';

/**
 * Hash password using bcrypt
 * Pure function for password hashing
 */
export const hashPassword = async (password: string): Promise<string> => {
  const result = await safeAsync(async () => {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  });

  if (!result.success) {
    throw createInternalServerError('Failed to hash password');
  }

  return result.data;
};

/**
 * Verify password against hash
 * Pure function for password verification
 */
export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  const result = await safeAsync(async () => {
    return await bcrypt.compare(password, hash);
  });

  if (!result.success) {
    throw createInternalServerError('Failed to verify password');
  }

  return result.data;
};

/**
 * Generate JWT token for user
 * Pure function for token generation
 */
export const generateToken = (userId: string, email: string): string => {
  try {
    const payload = {
      userId,
      email,
      iat: Math.floor(Date.now() / 1000),
    };

    return jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn, // 7 days by default
    });
  } catch (error) {
    throw createInternalServerError('Failed to generate token');
  }
};

/**
 * Verify and decode JWT token
 * Pure function for token verification
 */
export const verifyToken = (token: string): { userId: string; email: string } => {
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as any;

    if (!decoded.userId || !decoded.email) {
      throw createBadRequestError('Invalid token payload');
    }

    return {
      userId: decoded.userId,
      email: decoded.email,
    };
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw createBadRequestError('Invalid token');
    }
    if (error instanceof jwt.TokenExpiredError) {
      throw createBadRequestError('Token expired');
    }
    throw createInternalServerError('Failed to verify token');
  }
};

/**
 * Register a new user
 * Pure function for user registration
 */
export const registerUser = async (
  email: string,
  password: string,
  name?: string
): Promise<{ user: Omit<UserSelect, 'password'>; token: string }> => {
  const result = await safeAsync(async () => {
    // Check if user already exists
    const [existingUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (existingUser) {
      throw createBadRequestError('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user data
    const userData: UserInsert = {
      email,
      password: hashedPassword,
      name: name || email.split('@')[0], // Use email prefix as default name
      provider: 'email',
      emailVerified: false,
      updatedAt: new Date(),
    };

    // Insert user
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
    };
  });

  if (!result.success) {
    throw result.error;
  }

  return result.data;
};

/**
 * Authenticate user login
 * Pure function for user authentication
 */
export const loginUser = async (
  email: string,
  password: string
): Promise<{ user: Omit<UserSelect, 'password'>; token: string }> => {
  const result = await safeAsync(async () => {
    // Find user by email
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);

    if (!user) {
      throw createBadRequestError('Invalid email or password');
    }

    // Check if user has a password (not OAuth-only user)
    if (!user.password) {
      throw createBadRequestError('This account uses OAuth authentication');
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      throw createBadRequestError('Invalid email or password');
    }

    // Generate token
    const token = generateToken(user.id, user.email);

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token,
    };
  });

  if (!result.success) {
    throw result.error;
  }

  return result.data;
};

/**
 * Get user by ID
 * Pure function for user retrieval
 */
export const getUserById = async (userId: string): Promise<Omit<UserSelect, 'password'>> => {
  const result = await safeAsync(async () => {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);

    return user;
  });

  if (!result.success) {
    throw createInternalServerError('Failed to retrieve user');
  }

  if (!result.data) {
    throw createNotFoundError('User');
  }

  // Return user without password
  const { password: _, ...userWithoutPassword } = result.data;
  return userWithoutPassword;
};

/**
 * Check if user exists by email
 * Pure function for existence check
 */
export const userExistsByEmail = async (email: string): Promise<boolean> => {
  const result = await safeAsync(async () => {
    const [user] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    return !!user;
  });

  if (!result.success) {
    throw createInternalServerError('Failed to check user existence');
  }

  return result.data;
};

/**
 * Update user's last login timestamp
 * Pure function for login tracking
 */
export const updateUserLastLogin = async (userId: string): Promise<void> => {
  const result = await safeAsync(async () => {
    await db.update(usersTable).set({ updatedAt: new Date() }).where(eq(usersTable.id, userId));
  });

  if (!result.success) {
    throw createInternalServerError('Failed to update user login timestamp');
  }
};
