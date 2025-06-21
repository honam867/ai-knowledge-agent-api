import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { InferInsertModel, InferSelectModel } from 'drizzle-orm';

/**
 * Testing table schema
 * Functional schema definition for the testing entity
 */
export const testingTable = pgTable('testing', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 20 }).default('active').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type TestingInsert = InferInsertModel<typeof testingTable>;
export type TestingSelect = InferSelectModel<typeof testingTable>;

export const schema = {
  testingTable,
};
