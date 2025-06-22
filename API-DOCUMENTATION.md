# AI Knowledge Agent Backend - API Documentation

## 🏗️ Project Overview

This is a scalable Node.js API backend built with functional programming principles, designed for AI knowledge management. The architecture follows a clean, modular approach with clear separation of concerns.

### Tech Stack

- **Runtime**: Node.js 18+ LTS
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **AI Integration**: Google Gemini Pro API
- **Security**: Helmet, CORS, Rate limiting, JWT
- **Logging**: Winston with structured logging
- **Containerization**: Docker & Docker Compose
- **Development**: Nodemon, ESLint, Prettier

## 📁 Architecture & Project Structure

```
be/
├── src/
│   ├── app.ts                    # Main application entry point
│   ├── config/
│   │   └── index.ts             # Environment configuration
│   ├── controllers/             # Route handlers (pure functions)
│   │   ├── ai.controller.ts     # AI-related endpoints
│   │   └── testing.controller.ts # Testing CRUD endpoints
│   ├── db/
│   │   ├── connection.ts        # Database connection setup
│   │   └── schema.ts           # Drizzle ORM schemas
│   ├── middleware/
│   │   └── index.ts            # Common middleware functions
│   ├── routes/
│   │   ├── index.ts            # Main route aggregator
│   │   └── testing.routes.ts   # Testing route definitions
│   ├── services/               # Business logic (pure functions)
│   │   ├── ai.service.ts       # AI processing logic
│   │   └── testing.service.ts  # Testing business logic
│   ├── types/
│   │   └── index.ts           # TypeScript type definitions
│   └── utils/                 # Utility functions
│       ├── error.ts           # Error handling utilities
│       ├── logger.ts          # Logging utilities
│       ├── response.ts        # Response formatting
│       └── validation.ts      # Input validation
├── drizzle/                   # Database migrations
├── docker-compose.yml         # Service orchestration
├── Dockerfile                 # Container definition
├── drizzle.config.ts         # Database configuration
├── package.json              # Dependencies & scripts
└── tsconfig.json             # TypeScript configuration
```

## 🔧 Development Environment Setup

### Prerequisites

- Node.js 18+ LTS
- Docker & Docker Compose
- Supabase account (or local PostgreSQL)
- Google Cloud account (for Gemini API)

### Environment Variables (.env)

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DATABASE_URL=postgresql://user:password@host:port/database

# AI Integration
GOOGLE_API_KEY=your_gemini_api_key

# Security
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
```

### Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Database operations
npm run db:generate    # Generate migrations
npm run db:migrate     # Run migrations
npm run db:push        # Push schema changes
npm run db:studio      # Open Drizzle Studio

# Code quality
npm run lint           # Run ESLint
npm run format         # Format with Prettier

# Build & Production
npm run build          # Build TypeScript
npm run start          # Start production server

# Docker operations
docker-compose up -d   # Start all services
docker-compose down    # Stop all services
```

## 🚀 API Endpoints

### Base URL

```
http://localhost:3000/api
```

### Core Endpoints

#### Health Check

```http
GET /api/health
```

**Response:**

```json
{
  "success": true,
  "message": "Server is healthy",
  "data": {
    "status": "OK",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "uptime": 3600,
    "environment": "development",
    "version": "1.0.0"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### API Information

```http
GET /api/
```

**Response:**

```json
{
  "success": true,
  "message": "Node.js API Template",
  "data": {
    "version": "1.0.0",
    "name": "nodejs-api-template",
    "description": "Scalable Node.js API with Express, TypeScript, Supabase, Drizzle ORM, and AI integration",
    "endpoints": {
      "health": "/api/health",
      "testing": "/api/testing",
      "ai": "/api/ai"
    },
    "timestamp": "2024-01-01T00:00:00.000Z"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Testing CRUD API

#### List Testing Records

```http
GET /api/testing?page=1&limit=10&status=active&search=test&sortBy=createdAt&sortOrder=desc
```

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `status` (optional): Filter by status (active|inactive|pending)
- `search` (optional): Search in name and description
- `sortBy` (optional): Sort field (name|createdAt|updatedAt)
- `sortOrder` (optional): Sort direction (asc|desc)

**Response:**

```json
{
  "success": true,
  "message": "Testing records retrieved successfully",
  "data": {
    "items": [
      {
        "id": "uuid-here",
        "name": "Test Record",
        "description": "Description here",
        "status": "active",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "total": 1,
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "pages": 1
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### Get Testing Record by ID

```http
GET /api/testing/:id
```

#### Create Testing Record

```http
POST /api/testing
Content-Type: application/json

{
  "name": "Test Record",
  "description": "Description of the test record",
  "status": "active"
}
```

#### Update Testing Record

```http
PUT /api/testing/:id
Content-Type: application/json

{
  "name": "Updated Test Record",
  "status": "inactive"
}
```

#### Delete Testing Record

```http
DELETE /api/testing/:id
```

#### Get Testing Statistics

```http
GET /api/testing/stats
```

#### Testing Health Check

```http
GET /api/testing/health
```

#### Bulk Operations

```http
POST /api/testing/bulk
Content-Type: application/json

{
  "action": "delete",
  "ids": ["uuid1", "uuid2"],
  "data": {}
}
```

### AI API (Currently Commented)

The AI endpoints are implemented but commented out. When enabled:

#### Generate Content

```http
POST /api/ai/generate
Content-Type: application/json

{
  "prompt": "Write a short story about space exploration",
  "context": "Science fiction setting",
  "temperature": 0.7,
  "maxTokens": 1000
}
```

#### Generate Summary

```http
POST /api/ai/summary
Content-Type: application/json

{
  "text": "Long text to summarize...",
  "maxLength": 500
}
```

#### Generate Keywords

```http
POST /api/ai/keywords
Content-Type: application/json

{
  "text": "Text to extract keywords from...",
  "maxKeywords": 10
}
```

## 🏛️ Architecture Patterns

### Functional Programming Approach

The codebase follows functional programming principles:

1. **Pure Functions**: Most functions are pure with no side effects
2. **Immutability**: Data structures are treated as immutable
3. **Function Composition**: Complex operations built from simple functions
4. **Separation of Concerns**: Clear boundaries between layers

### Layer Architecture

#### 1. Routes Layer (`src/routes/`)

- Route definitions and middleware attachment
- Input validation
- Route-specific middleware

```typescript
// Example route structure
export const createTestingRoutes = (): Router => {
  const router = Router();

  router
    .route('/')
    .get(getAllTestingController)
    .post(validateTestingCreation, createTestingController);

  return router;
};
```

#### 2. Controllers Layer (`src/controllers/`)

- Request/response handling
- Input validation
- Calling service functions
- Response formatting

```typescript
// Example controller pattern
export const createTestingController = asyncErrorHandler(
  async (req: TypedRequest<CreateTestingDTO>, res: Response) => {
    logInfo('Creating new testing record', { body: req.body });

    const result = await createTesting(req.body);

    return sendSuccess(res, 'Testing record created successfully', result, 201);
  }
);
```

#### 3. Services Layer (`src/services/`)

- Business logic implementation
- Database operations
- External API calls
- Data transformation

```typescript
// Example service pattern
export const createTesting = async (data: CreateTestingDTO): Promise<TestingSelect> => {
  const [result] = await db
    .insert(testingTable)
    .values({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return result;
};
```

#### 4. Database Layer (`src/db/`)

- Schema definitions
- Database connection
- Migration management

```typescript
// Example schema pattern
export const testingTable = pgTable('testing', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 20 }).default('active').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### Error Handling Pattern

#### Async Error Handler

```typescript
export const asyncErrorHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
```

#### Error Response Format

```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error information",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Response Format Pattern

#### Success Response

```typescript
export const sendSuccess = <T>(
  res: Response,
  message: string,
  data?: T,
  statusCode: number = 200
): Response => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
};
```

#### Error Response

```typescript
export const sendError = (
  res: Response,
  message: string,
  error?: any,
  statusCode: number = 500
): Response => {
  return res.status(statusCode).json({
    success: false,
    message,
    error: error || null,
    timestamp: new Date().toISOString(),
  });
};
```

## 🔒 Security Implementation

### Middleware Stack

1. **Helmet**: Security headers
2. **CORS**: Cross-origin resource sharing
3. **Rate Limiting**: Request throttling
4. **Input Validation**: Joi/Zod validation
5. **JWT Authentication**: Token-based auth (when enabled)

### Security Headers

```typescript
export const createSecurityMiddleware = () => {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  });
};
```

### Rate Limiting

```typescript
export const createRateLimiter = (windowMs: number, maxRequests: number) => {
  return rateLimit({
    windowMs,
    max: maxRequests,
    message: {
      success: false,
      message: 'Too many requests from this IP, please try again later',
      error: 'Rate limit exceeded',
      timestamp: new Date().toISOString(),
    },
  });
};
```

## 📊 Database Schema & Operations

### Current Schema

#### Testing Table

```sql
CREATE TABLE testing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'active' NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

### Database Operations Pattern

#### Using Drizzle ORM

```typescript
// Insert
const [result] = await db.insert(testingTable).values(data).returning();

// Select with conditions
const results = await db
  .select()
  .from(testingTable)
  .where(eq(testingTable.status, 'active'))
  .limit(10)
  .offset(0);

// Update
const [updated] = await db
  .update(testingTable)
  .set({ ...data, updatedAt: new Date() })
  .where(eq(testingTable.id, id))
  .returning();

// Delete
await db.delete(testingTable).where(eq(testingTable.id, id));
```

### Migration Commands

```bash
# Generate migration from schema changes
npm run db:generate

# Apply migrations to database
npm run db:migrate

# Push schema directly (development only)
npm run db:push
```

## 🤖 AI Integration Pattern

### Service Structure

```typescript
// AI service pattern
export const generateWithGemini = async (request: AIPromptRequest): Promise<AIResponse> => {
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

  const result = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [{ text: request.prompt }],
      },
    ],
    generationConfig: {
      temperature: request.temperature || 0.7,
      maxOutputTokens: request.maxTokens || 1000,
    },
  });

  return {
    content: result.response.text(),
    usage: {
      promptTokens: 0, // Gemini doesn't provide token counts
      completionTokens: 0,
      totalTokens: 0,
    },
  };
};
```

### Controller Pattern

```typescript
export const generateContentController = asyncErrorHandler(
  async (req: TypedRequest<AIPromptRequest>, res: Response) => {
    logInfo('Generating AI content', {
      promptLength: req.body.prompt?.length,
      hasContext: !!req.body.context,
    });

    const result = await generateWithGemini(req.body);

    return sendSuccess(res, 'AI content generated successfully', result);
  }
);
```

## 📝 Implementation Guidelines

### Adding New Features

#### 1. Define Types (`src/types/index.ts`)

```typescript
// Add new entity types
export interface NewEntityDTO {
  name: string;
  description?: string;
}

export interface NewEntitySelect {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

#### 2. Create Database Schema (`src/db/schema.ts`)

```typescript
export const newEntityTable = pgTable('new_entity', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type NewEntityInsert = InferInsertModel<typeof newEntityTable>;
export type NewEntitySelect = InferSelectModel<typeof newEntityTable>;
```

#### 3. Implement Service (`src/services/new-entity.service.ts`)

```typescript
import db from '@/db/connection';
import { newEntityTable } from '@/db/schema';
import { NewEntityDTO, NewEntitySelect } from '@/types';

export const createNewEntity = async (data: NewEntityDTO): Promise<NewEntitySelect> => {
  const [result] = await db
    .insert(newEntityTable)
    .values({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return result;
};

export const getAllNewEntities = async (): Promise<NewEntitySelect[]> => {
  return await db.select().from(newEntityTable);
};
```

#### 4. Create Controller (`src/controllers/new-entity.controller.ts`)

```typescript
import { Request, Response } from 'express';
import { createNewEntity, getAllNewEntities } from '@/services/new-entity.service';
import { sendSuccess } from '@/utils/response';
import { asyncErrorHandler } from '@/utils/error';
import { TypedRequest, NewEntityDTO } from '@/types';

export const createNewEntityController = asyncErrorHandler(
  async (req: TypedRequest<NewEntityDTO>, res: Response) => {
    const result = await createNewEntity(req.body);
    return sendSuccess(res, 'Entity created successfully', result, 201);
  }
);

export const getAllNewEntitiesController = asyncErrorHandler(
  async (req: Request, res: Response) => {
    const result = await getAllNewEntities();
    return sendSuccess(res, 'Entities retrieved successfully', result);
  }
);
```

#### 5. Define Routes (`src/routes/new-entity.routes.ts`)

```typescript
import { Router } from 'express';
import {
  createNewEntityController,
  getAllNewEntitiesController,
} from '@/controllers/new-entity.controller';

export const createNewEntityRoutes = (): Router => {
  const router = Router();

  router.route('/').get(getAllNewEntitiesController).post(createNewEntityController);

  return router;
};

export const newEntityRoutes = createNewEntityRoutes();
```

#### 6. Register Routes (`src/routes/index.ts`)

```typescript
import { newEntityRoutes } from './new-entity.routes';

export const createAPIRoutes = (): Router => {
  const router = Router();

  // ... existing routes
  router.use('/new-entity', newEntityRoutes);

  return router;
};
```

#### 7. Validation Pattern

```typescript
// Add to src/utils/validation.ts
export const validateNewEntityCreation = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    name: Joi.string().required().min(1).max(255),
    description: Joi.string().optional().max(1000),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return sendError(res, 'Validation error', error.details, 400);
  }

  next();
};
```

#### 8. Logging Pattern

```typescript
import { logInfo, logError } from '@/utils/logger';

// In controllers/services
logInfo('Operation started', { context: 'relevant data' });
logError('Operation failed', { error, context: 'relevant data' });
```

## 🐳 Docker Deployment

### Development

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

### Production Considerations

1. Use multi-stage builds (already implemented)
2. Run as non-root user (already implemented)
3. Health checks configured
4. Volume mounts for logs
5. Restart policies set

### Environment-Specific Configurations

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  app:
    build:
      context: .
      target: production
    environment:
      - NODE_ENV=production
    # Production-specific configurations
```

## 🔍 Monitoring & Debugging

### Health Checks

- Application health: `/api/health`
- Service-specific health: `/api/testing/health`
- Docker health checks configured

### Logging

- Structured logging with Winston
- Request/response logging
- Error tracking
- Performance metrics

### Development Tools

```bash
# Database management
npm run db:studio

# Code quality
npm run lint
npm run format

# Development server with hot reload
npm run dev
```

## 🚀 Performance Considerations

### Database Optimization

- Use indexes for frequently queried fields
- Implement pagination for large datasets
- Use connection pooling
- Optimize queries with Drizzle ORM

### API Optimization

- Implement caching where appropriate
- Use compression middleware
- Set appropriate timeouts
- Monitor response times

### Security Best Practices

- Regular dependency updates
- Environment variable validation
- Input sanitization
- Rate limiting implementation
- HTTPS in production

## 📚 Additional Resources

### Documentation

- [Express.js Documentation](https://expressjs.com/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
- [Google Gemini API Documentation](https://ai.google.dev/)

### Development Guidelines

- Follow functional programming principles
- Write pure functions when possible
- Use TypeScript strictly
- Implement comprehensive error handling
- Add logging for debugging
- Write tests for critical functionality

---

This documentation serves as a comprehensive guide for understanding and extending the AI Knowledge Agent backend. Follow these patterns and guidelines when implementing new features to maintain consistency and code quality.
