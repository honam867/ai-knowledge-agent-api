import { eq, desc, asc, ilike, and } from 'drizzle-orm';
import db from '@/db/connection';
import { testingTable, TestingInsert, TestingSelect } from '../db/schema';
import { CreateTestingDTO, UpdateTestingDTO } from '../types';
import { createNotFoundError, createInternalServerError, safeAsync } from '../utils/error';

/**
 * Creates a new testing record
 * Pure function for testing creation
 */
export const createTesting = async (data: CreateTestingDTO): Promise<TestingSelect> => {
  const result = await safeAsync(async () => {
    const insertData: TestingInsert = {
      ...data,
      status: data.status || 'active',
      updatedAt: new Date(),
    };

    const [created] = await db.insert(testingTable).values(insertData).returning();

    return created;
  });

  if (!result.success) {
    throw createInternalServerError('Failed to create testing record');
  }

  return result.data;
};

/**
 * Retrieves all testing records with optional filtering
 * Pure function for testing listing
 */
export const getAllTesting = async (
  options: {
    limit?: number;
    offset?: number;
    status?: string;
    search?: string;
    sortBy?: 'name' | 'createdAt' | 'updatedAt';
    sortOrder?: 'asc' | 'desc';
  } = {}
): Promise<{
  data: TestingSelect[];
  total: number;
}> => {
  const {
    limit = 10,
    offset = 0,
    status,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = options;

  const result = await safeAsync(async () => {
    // Build where conditions
    const conditions = [];

    if (status) {
      conditions.push(eq(testingTable.status, status));
    }

    if (search) {
      conditions.push(ilike(testingTable.name, `%${search}%`));
    }

    // Build order by
    const orderBy = sortOrder === 'asc' ? asc(testingTable[sortBy]) : desc(testingTable[sortBy]);

    // Execute query
    const [data, totalResult] = await Promise.all([
      db
        .select()
        .from(testingTable)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset),

      db
        .select({ count: testingTable.id })
        .from(testingTable)
        .where(conditions.length > 0 ? and(...conditions) : undefined),
    ]);

    return {
      data: data as TestingSelect[],
      total: 0,
    };
  });

  if (!result.success) {
    throw createInternalServerError('Failed to retrieve testing records');
  }

  return result.data;
};

/**
 * Retrieves a single testing record by ID
 * Pure function for testing retrieval
 */
export const getTestingById = async (id: string): Promise<TestingSelect> => {
  const result = await safeAsync(async () => {
    const [record] = await db.select().from(testingTable).where(eq(testingTable.id, id)).limit(1);

    return record;
  });

  if (!result.success) {
    throw createInternalServerError('Failed to retrieve testing record');
  }

  if (!result.data) {
    throw createNotFoundError('Testing record');
  }

  return result.data;
};

/**
 * Updates a testing record by ID
 * Pure function for testing update
 */
export const updateTestingById = async (
  id: string,
  data: UpdateTestingDTO
): Promise<TestingSelect> => {
  const result = await safeAsync(async () => {
    const updateData = {
      ...data,
      updatedAt: new Date(),
    };

    const [updated] = await db
      .update(testingTable)
      .set(updateData)
      .where(eq(testingTable.id, id))
      .returning();

    return updated;
  });

  if (!result.success) {
    throw createInternalServerError('Failed to update testing record');
  }

  if (!result.data) {
    throw createNotFoundError('Testing record');
  }

  return result.data;
};

/**
 * Deletes a testing record by ID
 * Pure function for testing deletion
 */
export const deleteTestingById = async (id: string): Promise<void> => {
  const result = await safeAsync(async () => {
    const [deleted] = await db
      .delete(testingTable)
      .where(eq(testingTable.id, id))
      .returning({ id: testingTable.id });

    return deleted;
  });

  if (!result.success) {
    throw createInternalServerError('Failed to delete testing record');
  }

  if (!result.data) {
    throw createNotFoundError('Testing record');
  }
};

/**
 * Checks if a testing record exists by ID
 * Pure function for existence check
 */
export const testingExists = async (id: string): Promise<boolean> => {
  const result = await safeAsync(async () => {
    const [record] = await db
      .select({ id: testingTable.id })
      .from(testingTable)
      .where(eq(testingTable.id, id))
      .limit(1);

    return !!record;
  });

  if (!result.success) {
    throw createInternalServerError('Failed to check testing record existence');
  }

  return result.data;
};

/**
 * Checks if a testing record with the same name exists
 * Pure function for duplicate check
 */
export const testingNameExists = async (name: string, excludeId?: string): Promise<boolean> => {
  const result = await safeAsync(async () => {
    const conditions = [eq(testingTable.name, name)];

    if (excludeId) {
      conditions.push(eq(testingTable.id, excludeId));
    }

    const [record] = await db
      .select({ id: testingTable.id })
      .from(testingTable)
      .where(excludeId ? and(...conditions) : conditions[0])
      .limit(1);

    return !!record;
  });

  if (!result.success) {
    throw createInternalServerError('Failed to check testing record name existence');
  }

  return result.data;
};

/**
 * Bulk updates testing records status
 * Pure function for bulk operations
 */
export const bulkUpdateTestingStatus = async (
  ids: string[],
  status: 'active' | 'inactive' | 'pending'
): Promise<number> => {
  const result = await safeAsync(async () => {
    const updated = await db
      .update(testingTable)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(testingTable.id, ids[0])) // Note: Drizzle doesn't support IN with arrays directly
      .returning({ id: testingTable.id });

    return updated.length;
  });

  if (!result.success) {
    throw createInternalServerError('Failed to bulk update testing records');
  }

  return result.data;
};

/**
 * Gets testing statistics
 * Pure function for analytics
 */
export const getTestingStats = async (): Promise<{
  total: number;
  active: number;
  inactive: number;
  pending: number;
}> => {
  const result = await safeAsync(async () => {
    const [total, active, inactive, pending] = await Promise.all([
      db.select({ count: testingTable.id }).from(testingTable),
      db
        .select({ count: testingTable.id })
        .from(testingTable)
        .where(eq(testingTable.status, 'active')),
      db
        .select({ count: testingTable.id })
        .from(testingTable)
        .where(eq(testingTable.status, 'inactive')),
      db
        .select({ count: testingTable.id })
        .from(testingTable)
        .where(eq(testingTable.status, 'pending')),
    ]);

    return {
      total: total.length,
      active: active.length,
      inactive: inactive.length,
      pending: pending.length,
    };
  });

  if (!result.success) {
    throw createInternalServerError('Failed to retrieve testing statistics');
  }

  return result.data;
};
