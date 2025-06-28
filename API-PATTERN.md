# Backend API Patterns and Conventions

This document outlines the established patterns and conventions for developing API endpoints in the backend (`be/`) directory. Adhering to these guidelines ensures consistency, maintainability, and predictability across the codebase.

## 1. Project Structure and Responsibilities

The project follows a clear separation of concerns:

-   **`src/routes/`**: Defines API endpoints using Express `Router`. Each file in this directory should correspond to a major resource or feature (e.g., `auth.routes.ts`, `user.routes.ts`). These files are responsible for:
    -   Defining HTTP methods (GET, POST, PUT, DELETE, etc.) and their corresponding paths.
    -   Applying validation middleware.
    -   Assigning controller functions to handle requests.
    -   Importing controllers and middleware using path aliases.

-   **`src/controllers/`**: Contains the request handling logic for API endpoints. Controller functions are responsible for:
    -   Extracting data from `req.body`, `req.params`, `req.query`.
    -   Calling appropriate service functions to perform business logic.
    -   Sending standardized success or error responses using `sendSuccess` and `sendError` utilities.
    -   Wrapping asynchronous functions with `asyncErrorHandler` to ensure proper error propagation.
    -   Importing services, types, and utilities using path aliases.

-   **`src/services/`**: Encapsulates the core business logic and interacts with the database. Service functions are responsible for:
    -   Performing data manipulation, calculations, and complex operations.
    -   Interacting with the Drizzle ORM for database operations.
    -   Handling specific business rules and validations.
    -   Using `safeAsync` for robust error handling within asynchronous operations.
    -   Importing database schemas, configurations, and utilities using path aliases.

-   **`src/utils/`**: Provides common utility functions used across the application.
    -   `response.ts`: `sendSuccess` and `sendError` for consistent API responses.
    -   `logger.ts`: `logInfo` and `logError` for centralized logging using Winston.
    -   `error.ts`: Custom `HttpError` class and factory functions for specific HTTP errors (`createBadRequestError`, `createUnauthorizedError`, etc.), `asyncErrorHandler`, `safeAsync`, and the global `errorHandler` middleware.
    -   `validation.ts`: Middleware functions for input validation using Zod schemas.

-   **`src/config/`**: Manages application configurations (e.g., environment variables, JWT secrets, database URLs).

-   **`src/types/`**: Defines TypeScript interfaces, types, and Zod schemas for data validation and type safety.

-   **`src/middleware/`**: Contains Express middleware functions (e.g., `createJwtAuthMiddleware` for authentication, `adminAuthMiddleware` for authorization).

-   **`src/db/`**: Contains database-related files.
    -   `connection.ts`: Establishes and manages the database connection using Drizzle ORM and `pg`.
    -   `schema.ts`: Defines database table schemas using Drizzle ORM and generates Zod schemas for validation.

## 2. Import Aliases

To maintain clean and readable import paths, the project utilizes path aliases configured in `tsconfig.json`. Always use these aliases for internal module imports:

-   `@/config/*`: For modules within `src/config/`
-   `@/controllers/*`: For modules within `src/controllers/`
-   `@/middleware/*`: For modules within `src/middleware/`
-   `@/models/*`: For modules within `src/models/` (if applicable)
-   `@/routes/*`: For modules within `src/routes/`
-   `@/services/*`: For modules within `src/services/`
-   `@/utils/*`: For modules within `src/utils/`
-   `@/types/*`: For modules within `src/types/`
-   `@/*`: For any other top-level `src/` module.

**Example:**

```typescript
// Correct usage with alias
import { registerController } from '@/controllers/auth.controller';
import { sendSuccess } from '@/utils/response';

// Incorrect usage (avoid relative paths for internal modules)
// import { registerController } from '../controllers/auth.controller';
// import { sendSuccess } from '../../utils/response';
```

## 3. Error Handling

-   **Custom `HttpError`**: Use the `HttpError` class for all application-specific errors that should result in a specific HTTP status code.
-   **Error Factories**: Utilize factory functions (e.g., `createBadRequestError`, `createNotFoundError`) to create `HttpError` instances.
-   **`asyncErrorHandler`**: Wrap all asynchronous Express route/middleware functions with `asyncErrorHandler` to catch unhandled promise rejections and pass them to the error handling middleware.
-   **`safeAsync`**: In service layers, use `safeAsync` to wrap asynchronous operations. This utility centralizes error handling, converts generic errors into `HttpError` instances, and provides a consistent return structure (`{ success: true, data }` or `{ success: false, error }`).
-   **Centralized `errorHandler`**: All errors are ultimately caught by the `errorHandler` middleware, which sends a standardized JSON error response.

## 4. API Response Structure

All API responses should adhere to a consistent JSON structure using `sendSuccess` and `sendError`:

**Success Response:**

```json
{
  "success": true,
  "message": "A descriptive success message",
  "data": {
    // Optional: payload data
  }
}
```

**Error Response:**

```json
{
  "success": false,
  "message": "A descriptive error message",
  "error": {
    // Optional: detailed error information (e.g., validation errors)
  }
}
```

## 5. Authentication and Authorization

-   **JWT-based**: Authentication is handled using JSON Web Tokens (JWTs).
-   **Cookies**: `auth_token` is stored in an HTTP-only cookie for security. `user_data` is stored in a non-HTTP-only cookie for frontend access.
-   **`createJwtAuthMiddleware`**: Use this middleware on routes that require authentication. It verifies the JWT and populates `req.user`.
-   **`adminAuthMiddleware`**: Use this middleware for routes that require administrator privileges.

## 6. Input Validation

-   **Zod Schemas**: Define input validation rules using Zod schemas in `src/types/`.
-   **Validation Middleware**: Implement dedicated middleware functions (e.g., `validateUserRegistration`) in `src/utils/validation.ts` that use Zod schemas to validate `req.body`, `req.params`, or `req.query`. These middleware functions should be applied to routes before the controller.

## 7. Database Interactions

-   **Drizzle ORM**: All database operations should use Drizzle ORM.
-   **`src/db/schema.ts`**: Define all database table schemas here.
-   **`src/db/connection.ts`**: Manages the database connection pool.
-   **Service Layer**: Database queries should primarily reside within the service layer, not directly in controllers.

## 8. Logging

-   **Winston**: Use the `logInfo` and `logError` functions from `src/utils/logger.ts` for all logging.
-   **Contextual Logging**: Include relevant metadata (e.g., `userId`, `email`, `statusCode`) in log messages to aid debugging and monitoring.

## 9. Lodash Usage

Lodash is available for common utility functions that operate on arrays, objects, strings, and other data types. When using Lodash:

-   **Import Specific Functions**: Always import only the specific functions you need, rather than the entire Lodash library, to minimize bundle size and improve performance.
    ```typescript
    // Correct usage
    import { get, isEmpty } from 'lodash';

    // Incorrect usage (avoid importing the entire library)
    // import _ from 'lodash';
    ```
-   **Prefer Native JavaScript**: If a native JavaScript method provides the same functionality as a Lodash function, prefer the native method for better performance and reduced dependency.
    ```typescript
    // Prefer native Array.prototype.map over _.map
    const newArray = oldArray.map(item => item.property);

    // Prefer native Object.keys over _.keys
    const keys = Object.keys(myObject);
    ```
-   **Use for Complex Operations**: Utilize Lodash for more complex or less common operations where native JavaScript alternatives are verbose or less efficient (e.g., deep cloning, throttling, debouncing, advanced collection manipulation).

By following these patterns, we ensure a robust, scalable, and maintainable backend API.