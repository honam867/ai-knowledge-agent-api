# Node.js API Template - Cursor Implementation Prompt

Create a scalable, production-ready Node.js API template with the following specifications:

## Core Technologies Stack

- **Runtime**: Node.js (Latest LTS)
- **Framework**: Express.js
- **AI Integration**: LangChain (Node.js version) + Google Gemini Pro API
- **Database**: Supabase (PostgreSQL) with Drizzle ORM
- **Language**: TypeScript for type safety
- **Package Manager**: npm or yarn
- **Architecture**: Modern functional programming approach

## Project Structure Requirements

```
src/
├── config/           # Configuration functions
├── controllers/      # Route handler functions
├── middleware/       # Custom middleware functions
├── db/              # Database schema & migrations (Drizzle)
├── routes/          # API route definitions
├── services/        # Business logic functions
├── utils/           # Utility functions
├── types/           # TypeScript type definitions
└── app.ts           # Express app setup
```

## Essential Features to Implement

### 1. Basic Infrastructure

- Express.js server setup with TypeScript (functional approach)
- Environment variable configuration (.env support)
- CORS configuration
- Request logging middleware
- Error handling middleware
- Input validation (using Joi or Zod)
- Rate limiting

### 2. Database Integration

- Supabase client setup with Drizzle ORM
- Database schema definition using Drizzle
- Migration system with Drizzle Kit
- Query functions using Drizzle syntax
- Connection management

### 3. AI Integration Setup

- LangChain Node.js integration (functional approach)
- Google Gemini Pro API configuration
- AI service functions
- Error handling for AI operations

### 4. Testing Route (Priority)

Create a complete CRUD API for `/testing` endpoint using functional approach:

- `GET /testing` - List all test records
- `GET /testing/:id` - Get single test record
- `POST /testing` - Create new test record
- `PUT /testing/:id` - Update test record
- `DELETE /testing/:id` - Delete test record

### 5. Best Practices Implementation

- Functional programming principles
- Pure functions where possible
- Composable middleware functions
- Error handling with custom error functions
- API response standardization
- Input validation and sanitization
- Logging system (Winston or similar)
- Health check endpoint (`/health`)
- API documentation setup (Swagger/OpenAPI)

### 6. Development Tools

- ESLint + Prettier configuration
- Husky pre-commit hooks
- Nodemon for development
- Docker support (Dockerfile + docker-compose)

### 7. Security Features

- JWT authentication functions (ready to use)
- Password hashing utilities
- Input sanitization functions
- SQL injection prevention (handled by Drizzle)

## Environment Variables Required

```
# Server
PORT=3000
NODE_ENV=development

# Supabase
DATABASE_URL=your_supabase_database_url
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key

# Google Gemini
GOOGLE_API_KEY=your_gemini_api_key

# Security
JWT_SECRET=your_jwt_secret
```

## Package.json Scripts

Include scripts for:

- `dev` - Development server with hot reload
- `build` - TypeScript compilation
- `start` - Production server
- `test` - Run tests
- `lint` - Code linting
- `format` - Code formatting

## Specific Implementation Requirements

### Functional Architecture Guidelines

- Use pure functions wherever possible
- Implement higher-order functions for reusability
- Create composable middleware functions
- Use functional error handling patterns
- Avoid classes, prefer function-based approach

### Database Schema with Drizzle

Create a Drizzle schema for the testing table:

```typescript
// src/db/schema.ts
export const testingTable = pgTable("testing", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 20 }).default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

### AI Service Integration

- Create functional AI service modules
- Implement Gemini Pro integration functions
- Add LangChain prompt template functions
- Include functional error handling and retry logic

### Response Standardization

All API responses should follow this format:

```json
{
  "success": boolean,
  "message": string,
  "data": any,
  "error": string | null,
  "timestamp": string
}
```

## Additional Requirements

- Include comprehensive README.md with setup instructions
- Add example .env file
- Create Drizzle migration scripts and setup
- Include Postman collection for API testing
- Add GitHub Actions workflow for CI/CD
- Implement graceful shutdown handling
- Add request/response logging
- Create reusable utility functions (functional approach)
- Ingnore ts error when run or build

## Success Criteria

1. Server starts successfully on specified port
2. `/health` endpoint returns 200 status
3. `/testing` CRUD operations work with Supabase + Drizzle
4. AI service can connect to Gemini Pro
5. All middleware functions properly
6. TypeScript compiles without errors
7. Drizzle migrations work correctly
8. Code follows functional programming principles

Please implement this step by step using **functional programming approach** (no classes), starting with the basic server setup and the `/testing` CRUD functionality first. Make sure each component is a pure function where possible and follows modern JavaScript/TypeScript functional patterns.
