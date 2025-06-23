import { pgTable, uuid, varchar, text, timestamp, integer, boolean, json, pgEnum } from 'drizzle-orm/pg-core';
import { InferInsertModel, InferSelectModel, relations } from 'drizzle-orm';

// Enums for better type safety
export const authProviderEnum = pgEnum('auth_provider', ['email', 'google']);
export const userRoleEnum = pgEnum('user_role', ['employee', 'admin']);
export const documentStatusEnum = pgEnum('document_status', ['uploading', 'processing', 'ready', 'error']);
export const fileTypeEnum = pgEnum('file_type', ['pdf', 'docx', 'md', 'txt']);
export const messageRoleEnum = pgEnum('message_role', ['user', 'assistant']);
export const processingStageEnum = pgEnum('processing_stage', ['upload', 'extract', 'index', 'complete']);
export const processingStatusEnum = pgEnum('processing_status', ['pending', 'processing', 'success', 'error']);

/**
 * Users table schema
 * Enhanced user schema with OAuth support, email verification, and role-based access
 */
export const usersTable = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  provider: authProviderEnum('provider').default('email').notNull(),
  role: userRoleEnum('role').default('employee').notNull(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  password: varchar('password', { length: 255 }), // Optional for OAuth users
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Documents table schema
 * Stores uploaded documents with metadata and processing status
 */
export const documentsTable = pgTable('documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  filename: varchar('filename', { length: 255 }).notNull(),
  originalName: varchar('original_name', { length: 255 }).notNull(),
  fileType: fileTypeEnum('file_type').notNull(),
  fileSize: integer('file_size').notNull(), // in bytes
  contentText: text('content_text'), // extracted text content
  status: documentStatusEnum('status').default('uploading').notNull(),
  uploadPath: varchar('upload_path', { length: 500 }).notNull(),
  metadata: json('metadata').$type<{
    title?: string;
    description?: string;
    tags?: string[];
    [key: string]: any;
  }>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Chat Sessions table schema
 * Represents conversation sessions between users and the AI
 */
export const chatSessionsTable = pgTable('chat_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Messages table schema
 * Individual messages within chat sessions
 */
export const messagesTable = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id').notNull().references(() => chatSessionsTable.id, { onDelete: 'cascade' }),
  role: messageRoleEnum('role').notNull(),
  content: text('content').notNull(),
  sources: json('sources').$type<Array<{
    documentId: string;
    documentName: string;
    relevanceScore?: number;
    excerpt?: string;
  }>>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Document Processing table schema
 * Tracks the processing pipeline for uploaded documents
 */
export const documentProcessingTable = pgTable('document_processing', {
  id: uuid('id').defaultRandom().primaryKey(),
  documentId: uuid('document_id').notNull().references(() => documentsTable.id, { onDelete: 'cascade' }),
  stage: processingStageEnum('stage').notNull(),
  status: processingStatusEnum('status').default('pending').notNull(),
  errorMessage: text('error_message'),
  processingTime: integer('processing_time'), // in seconds
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Testing table schema (keeping for backwards compatibility)
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

// Define relationships between tables
export const usersRelations = relations(usersTable, ({ many }) => ({
  documents: many(documentsTable),
  chatSessions: many(chatSessionsTable),
}));

export const documentsRelations = relations(documentsTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [documentsTable.userId],
    references: [usersTable.id],
  }),
  processing: many(documentProcessingTable),
}));

export const chatSessionsRelations = relations(chatSessionsTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [chatSessionsTable.userId],
    references: [usersTable.id],
  }),
  messages: many(messagesTable),
}));

export const messagesRelations = relations(messagesTable, ({ one }) => ({
  session: one(chatSessionsTable, {
    fields: [messagesTable.sessionId],
    references: [chatSessionsTable.id],
  }),
}));

export const documentProcessingRelations = relations(documentProcessingTable, ({ one }) => ({
  document: one(documentsTable, {
    fields: [documentProcessingTable.documentId],
    references: [documentsTable.id],
  }),
}));

// Type definitions for insert and select operations
export type UserInsert = InferInsertModel<typeof usersTable>;
export type UserSelect = InferSelectModel<typeof usersTable>;

export type DocumentInsert = InferInsertModel<typeof documentsTable>;
export type DocumentSelect = InferSelectModel<typeof documentsTable>;

export type ChatSessionInsert = InferInsertModel<typeof chatSessionsTable>;
export type ChatSessionSelect = InferSelectModel<typeof chatSessionsTable>;

export type MessageInsert = InferInsertModel<typeof messagesTable>;
export type MessageSelect = InferSelectModel<typeof messagesTable>;

export type DocumentProcessingInsert = InferInsertModel<typeof documentProcessingTable>;
export type DocumentProcessingSelect = InferSelectModel<typeof documentProcessingTable>;

export type TestingInsert = InferInsertModel<typeof testingTable>;
export type TestingSelect = InferSelectModel<typeof testingTable>;

// Export all schemas
export const schema = {
  usersTable,
  documentsTable,
  chatSessionsTable,
  messagesTable,
  documentProcessingTable,
  testingTable,
};
