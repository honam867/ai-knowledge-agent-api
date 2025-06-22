# Google OAuth Setup Guide

## Overview

This guide explains how to set up Google OAuth authentication for the AI Knowledge Agent backend.

## Required Environment Variables

Add the following environment variables to your `.env` file:

```env
# Google OAuth Configuration
GOOGLE_OAUTH_CLIENT_ID=your_google_oauth_client_id
GOOGLE_OAUTH_CLIENT_SECRET=your_google_oauth_client_secret
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

## Google Cloud Console Setup

1. **Create a Google Cloud Project** (if you don't have one):
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one

2. **Enable Google+ API**:
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API" and enable it
   - Also enable "People API" for user profile access

3. **Create OAuth 2.0 Credentials**:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Choose "Web application" as the application type
   - Add authorized redirect URIs:
     - For development: `http://localhost:3000/api/auth/google/callback`
     - For production: `https://yourdomain.com/api/auth/google/callback`

4. **Get Client ID and Secret**:
   - Copy the Client ID and Client Secret
   - Add them to your `.env` file

## API Endpoints

### Initiate Google OAuth Flow
```
GET /api/auth/google
```
Redirects user to Google OAuth consent screen.

### Handle OAuth Callback
```
GET /api/auth/google/callback?code=...
```
Handles Google OAuth callback and returns user data with JWT token.

**Response:**
```json
{
  "success": true,
  "message": "Logged in successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "User Name",
      "avatarUrl": "https://...",
      "provider": "google",
      "emailVerified": true
    },
    "token": "jwt_token_here",
    "isNewUser": false
  }
}
```

## Frontend Integration

To integrate with your frontend:

1. **Redirect to OAuth**:
   ```javascript
   window.location.href = 'http://localhost:3000/api/auth/google';
   ```

2. **Handle Callback**:
   The callback endpoint will return JSON with user data and token.
   You can either:
   - Handle the JSON response directly if calling from AJAX
   - Redirect to your frontend with token as query parameter

## User Account Linking

The system handles the following scenarios:

1. **New User**: Creates a new account with Google profile data
2. **Existing User**: Links Google OAuth to existing email account
3. **Return User**: Logs in existing Google OAuth user

## Security Features

- Uses Google's official `google-auth-library` package
- Validates OAuth tokens with Google's servers
- Creates secure JWT tokens for session management
- Handles user profile updates automatically
- Supports both new user registration and existing user login

## Testing

1. Start your backend server: `npm run dev`
2. Visit: `http://localhost:3000/api/auth/google`
3. Complete Google OAuth flow
4. Check the response for user data and JWT token

## Troubleshooting

- **Invalid Client Error**: Check your Client ID and Secret
- **Redirect URI Mismatch**: Ensure the redirect URI in Google Console matches your configuration
- **Scope Errors**: Make sure Google+ API and People API are enabled
- **Token Errors**: Check that your JWT secret is properly configured 