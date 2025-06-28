# API Feature Documentation

## Available Routes - Total: 22 routes

### Health & Info Routes (2 routes)
- `GET /api/health` - API health check
- `GET /api/` - API information and endpoints list

### Authentication Routes (7 routes)
Base Path: `/api/auth`

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---------------|
| POST | `/register` | User registration | ❌ |
| POST | `/login` | User login | ❌ |
| POST | `/refresh` | Token refresh | ❌ |
| POST | `/logout` | User logout | ❌ |
| GET | `/me` | Get current user profile | ✅ |
| GET | `/google` | Google OAuth initiation | ❌ |
| GET | `/google/callback` | Google OAuth callback (redirects to FE) | ❌ |

### Testing Routes (8 routes)
Base Path: `/api/testing`

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---------------|
| GET | `/health` | Testing service health | ❌ |
| GET | `/stats` | Testing statistics | ❌ |
| POST | `/bulk` | Bulk operations | ❌ |
| GET | `/` | List all testing records | ❌ |
| POST | `/` | Create testing record | ❌ |
| GET | `/:id` | Get testing record by ID | ❌ |
| PUT | `/:id` | Update testing record | ❌ |
| DELETE | `/:id` | Delete testing record | ❌ |

### Upload Routes (5 routes)
Base Path: `/api/upload`

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---------------|
| POST | `/public` | Upload a public file (anonymous) | ❌ |
| POST | `/private` | Upload a file for the authenticated user | ✅ |
| GET | `/` | List all uploads for the authenticated user | ✅ |
| GET | `/:id` | Get upload details by ID | ❌ |
| DELETE | `/:id` | Delete an upload by ID | ✅ |

## Database Schema

### Core Tables

#### Users Table (`users`)
- `id` (UUID, Primary Key)
- `email` (unique)
- `name`
- `avatarUrl`
- `provider` (email/google)
- `emailVerified` (boolean)
- `password`
- `createdAt`, `updatedAt`

#### Documents Table (`documents`)
- `id` (UUID, Primary Key)
- `userId` (FK → users.id)
- `filename`, `originalName`
- `fileType` (pdf/docx/md/txt)
- `fileSize`, `contentText`
- `status` (uploading/processing/ready/error)
- `uploadPath`, `metadata` (JSON)
- `createdAt`, `updatedAt`

#### Chat Sessions Table (`chat_sessions`)
- `id` (UUID, Primary Key)
- `userId` (FK → users.id)
- `title`
- `createdAt`, `updatedAt`

#### Messages Table (`messages`)
- `id` (UUID, Primary Key)
- `sessionId` (FK → chat_sessions.id)
- `role` (user/assistant)
- `content`
- `sources` (JSON array)
- `createdAt`

#### Document Processing Table (`document_processing`)
- `id` (UUID, Primary Key)
- `documentId` (FK → documents.id)
- `stage` (upload/extract/index/complete)
- `status` (pending/processing/success/error)
- `errorMessage`, `processingTime`
- `createdAt`, `updatedAt`

#### Testing Table (`testing`)
- `id` (UUID, Primary Key)
- `name`, `description`
- `status`
- `createdAt`, `updatedAt`

## Authentication System
- JWT-based authentication (7-day tokens)
- Google OAuth 2.0 integration
- bcrypt password hashing

## Request/Response Examples

### Authentication Endpoints

#### POST `/api/auth/register`
**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```
**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid-here",
      "email": "user@example.com",
      "name": "John Doe",
      "provider": "email",
      "emailVerified": false,
      "avatarUrl": null,
      "createdAt": "2023-12-01T00:00:00.000Z"
    },
    "token": "jwt-token-here"
  },
  "timestamp": "2023-12-01T00:00:00.000Z"
}
```

#### POST `/api/auth/login`
**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```
**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid-here",
      "email": "user@example.com",
      "name": "John Doe",
      "provider": "email",
      "emailVerified": false,
      "avatarUrl": null,
      "createdAt": "2023-12-01T00:00:00.000Z"
    },
    "token": "jwt-token-here"
  },
  "timestamp": "2023-12-01T00:00:00.000Z"
}
```

#### GET `/api/auth/me`
**Headers:** `Authorization: Bearer jwt-token-here`
**Response:**
```json
{
  "success": true,
  "message": "User profile retrieved successfully",
  "data": {
    "id": "uuid-here",
    "email": "user@example.com",
    "name": "John Doe",
    "provider": "email",
    "emailVerified": false,
    "avatarUrl": null,
    "createdAt": "2023-12-01T00:00:00.000Z",
    "updatedAt": "2023-12-01T00:00:00.000Z"
  },
  "timestamp": "2023-12-01T00:00:00.000Z"
}
```

### Testing Endpoints

#### POST `/api/testing`
**Request:**
```json
{
  "name": "Test Record",
  "description": "This is a test record",
  "status": "active"
}
```
**Response:**
```json
{
  "success": true,
  "message": "Testing record created successfully",
  "data": {
    "id": "uuid-here",
    "name": "Test Record",
    "description": "This is a test record",
    "status": "active",
    "createdAt": "2023-12-01T00:00:00.000Z",
    "updatedAt": "2023-12-01T00:00:00.000Z"
  },
  "timestamp": "2023-12-01T00:00:00.000Z"
}
```

#### GET `/api/testing`
**Query Parameters:** `?page=1&limit=10&status=active&search=test`
**Response:**
```json
{
  "success": true,
  "message": "Testing records retrieved successfully",
  "data": {
    "records": [
      {
        "id": "uuid-here",
        "name": "Test Record",
        "description": "This is a test record",
        "status": "active",
        "createdAt": "2023-12-01T00:00:00.000Z",
        "updatedAt": "2023-12-01T00:00:00.000Z"
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
  "timestamp": "2023-12-01T00:00:00.000Z"
}
```

#### GET `/api/testing/:id`
**Response:**
```json
{
  "success": true,
  "message": "Testing record retrieved successfully",
  "data": {
    "id": "uuid-here",
    "name": "Test Record",
    "description": "This is a test record",
    "status": "active",
    "createdAt": "2023-12-01T00:00:00.000Z",
    "updatedAt": "2023-12-01T00:00:00.000Z"
  },
  "timestamp": "2023-12-01T00:00:00.000Z"
}
```

#### GET `/api/testing/stats`
**Response:**
```json
{
  "success": true,
  "message": "Testing statistics retrieved successfully",
  "data": {
    "total": 25,
    "active": 20,
    "inactive": 5,
    "byStatus": {
      "active": 20,
      "inactive": 5
    }
  },
  "timestamp": "2023-12-01T00:00:00.000Z"
}
```

### Upload Endpoints

#### POST `/api/upload/private`
**Headers:** `Authorization: Bearer jwt-token-here`
**Request:** `multipart/form-data` with a file field `document` and optional fields `title`, `description`.
**Response:**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "id": "uuid-here",
    "filename": "timestamp-original-name.pdf",
    "originalName": "mydoc.pdf",
    "fileType": "pdf",
    "fileSize": 123456,
    "status": "ready",
    "uploadPath": "https://res.cloudinary.com/...",
    "metadata": {
      "title": "My Document"
    },
    "userId": "user-uuid-here",
    "createdAt": "2023-12-01T00:00:00.000Z",
    "isPublic": false
  },
  "timestamp": "2023-12-01T00:00:00.000Z"
}
```

#### GET `/api/upload/`
**Headers:** `Authorization: Bearer jwt-token-here`
**Query Parameters:** `?page=1&limit=10&status=ready&fileType=pdf`
**Response:**
```json
{
  "success": true,
  "message": "Documents retrieved successfully",
  "data": {
    "documents": [
      {
        "id": "uuid-here",
        "userId": "user-uuid-here",
        "filename": "timestamp-original-name.pdf",
        "originalName": "mydoc.pdf",
        "fileType": "pdf",
        "fileSize": 123456,
        "contentText": null,
        "status": "ready",
        "uploadPath": "https://res.cloudinary.com/...",
        "metadata": {
          "title": "My Document"
        },
        "createdAt": "2023-12-01T00:00:00.000Z",
        "updatedAt": "2023-12-01T00:00:00.000Z",
        "isPublic": false
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "pages": 1
    }
  },
  "timestamp": "2023-12-01T00:00:00.000Z"
}
```

#### GET `/api/upload/:id`
**Response:**
```json
{
  "success": true,
  "message": "Document retrieved successfully",
  "data": {
    "id": "uuid-here",
    "userId": null,
    "filename": "timestamp-public-doc.pdf",
    "originalName": "public-doc.pdf",
    "fileType": "pdf",
    "fileSize": 654321,
    "contentText": null,
    "status": "ready",
    "uploadPath": "https://res.cloudinary.com/...",
    "metadata": {},
    "createdAt": "2023-12-01T00:00:00.000Z",
    "updatedAt": "2023-12-01T00:00:00.000Z",
    "isPublic": true
  },
  "timestamp": "2023-12-01T00:00:00.000Z"
}
```

#### DELETE `/api/upload/:id`
**Headers:** `Authorization: Bearer jwt-token-here`
**Response:**
```json
{
  "success": true,
  "message": "Document deleted successfully",
  "data": {
    "deleted": true
  },
  "timestamp": "2023-12-01T00:00:00.000Z"
}
```

## Response Format Examples

### Success Response Format
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data here
  },
  "timestamp": "2023-12-01T00:00:00.000Z"
}
```

### Error Response Format
```json
{
  "success": false,
  "message": "Error description",
  "error": "ERROR_CODE",
  "timestamp": "2023-12-01T00:00:00.000Z"
}
```

### Pagination Response Format
```json
{
  "success": true,
  "message": "Records retrieved successfully",
  "data": {
    "records": [
      // Array of record objects
    ],
    "total": 50,
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "pages": 5
    }
  },
  "timestamp": "2023-12-01T00:00:00.000Z"
}
```

### Authentication Response Format
```json
{
  "success": true,
  "message": "Authentication successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "User Name",
      "provider": "email|google",
      "emailVerified": true,
      "avatarUrl": "url|null",
      "createdAt": "timestamp",
      "updatedAt": "timestamp"
    },
    "token": "jwt-token-string"
  },
  "timestamp": "2023-12-01T00:00:00.000Z"
}
```

## Google OAuth Flow

### GET `/api/auth/google/callback`
**Purpose**: Handles Google OAuth callback and redirects to frontend

**Success Redirect**: `http://localhost:3000/dashboard?token=jwt-token&user=user-json&isNewUser=true`
**Error Redirect**: `http://localhost:3000/dashboard?error=error-message`

### Frontend Integration
Your frontend should handle URL parameters on the dashboard page:
```javascript
// On dashboard page load
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');
const userJson = urlParams.get('user');
const isNewUser = urlParams.get('isNewUser') === 'true';
const error = urlParams.get('error');

if (error) {
  // Handle error case
  console.error('OAuth Error:', error);
} else if (token && userJson) {
  // Handle success case
  const user = JSON.parse(userJson);
  localStorage.setItem('token', token);
  localStorage.setItem('user', userJson);
  // Clear URL parameters
  window.history.replaceState({}, '', '/dashboard');
}
```