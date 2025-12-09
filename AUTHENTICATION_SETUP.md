# ExternAI Authentication Setup Guide

## Overview

ExternAI now includes a complete authentication system with:
- User signup/login
- JWT-based authentication
- Secure token storage (encrypted)
- Usage tracking and limits
- Backend API proxy for Claude requests

## Architecture

```
Desktop App (Electron)
    ↓ (Login/Signup)
Backend API (Node.js + Express + MongoDB)
    ↓ (Auth Tokens + Usage Limits)
Anthropic Claude API
```

## Setup Instructions

### 1. Install MongoDB

**macOS:**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Linux:**
```bash
sudo apt-get install mongodb
sudo systemctl start mongodb
```

**Windows:**
Download from [mongodb.com/download-center/community](https://www.mongodb.com/download-center/community)

### 2. Configure Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edit `backend/.env` and set:
- `MONGODB_URI`: Your MongoDB connection string
- `JWT_ACCESS_SECRET`: Generate with `openssl rand -hex 64`
- `JWT_REFRESH_SECRET`: Generate with `openssl rand -hex 64`
- `ANTHROPIC_API_KEY`: Your Anthropic API key

### 3. Start Backend Server

```bash
cd backend
npm run dev
```

Server runs on `http://localhost:5000`

### 4. Configure Desktop App

Edit `.env` in the root directory:
```
VITE_BACKEND_URL=http://localhost:5000
```

### 5. Run Desktop App

```bash
npm start
```

## Usage

### First Time Users

1. Launch the app
2. Click "Sign up" on the auth screen
3. Enter your email, password, and name
4. Click "Create Account"
5. You'll be automatically logged in

### Returning Users

1. Launch the app
2. Enter your email and password
3. Click "Sign In"

### Authentication Tokens

- **Access Token**: Valid for 15 minutes, used for API requests
- **Refresh Token**: Valid for 7 days, used to get new access tokens
- Tokens are stored securely using `electron-store` with encryption

### Usage Limits

Default limits (configurable per user in MongoDB):
- **100 requests per day**
- **100,000 tokens per day**

Limits reset daily at midnight UTC.

## API Endpoints

### Authentication

**POST /api/auth/signup**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe"
}
```

**POST /api/auth/login**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**POST /api/auth/refresh**
```json
{
  "refreshToken": "your-refresh-token"
}
```

**GET /api/auth/me**
- Headers: `Authorization: Bearer <access-token>`

### Claude API

**POST /api/claude/stream**
- Headers: `Authorization: Bearer <access-token>`
```json
{
  "messages": [
    { "role": "user", "content": "Hello" }
  ],
  "max_tokens": 4096
}
```

**GET /api/claude/usage**
- Headers: `Authorization: Bearer <access-token>`

## Production Deployment

### Backend Deployment

Deploy to services like:
- [Railway](https://railway.app)
- [Render](https://render.com)
- [Heroku](https://heroku.com)
- [DigitalOcean App Platform](https://www.digitalocean.com/products/app-platform)

**Steps:**
1. Create account on chosen platform
2. Connect your GitHub repository
3. Set environment variables
4. Deploy!

**Environment Variables for Production:**
- `NODE_ENV=production`
- `MONGODB_URI`: Your MongoDB Atlas connection string
- `JWT_ACCESS_SECRET`: Strong random string
- `JWT_REFRESH_SECRET`: Strong random string
- `ANTHROPIC_API_KEY`: Your API key
- `ALLOWED_ORIGINS`: Your desktop app origin (or `*` for testing)

### Desktop App Configuration

Update `.env`:
```
VITE_BACKEND_URL=https://your-backend.railway.app
```

## Security Considerations

1. **Never commit .env files** - They contain secrets
2. **Use strong JWT secrets** - Generate with `openssl rand -hex 64`
3. **Enable HTTPS in production** - Required for secure token transmission
4. **Rotate API keys** - Periodically change your Anthropic API key
5. **Monitor usage** - Track unusual activity in MongoDB
6. **Rate limiting** - Backend includes rate limiting (100 req/15min per IP)

## Troubleshooting

### "Not authenticated" error
- Tokens may have expired
- Clear app data: Delete `~/Library/Application Support/externai` (macOS)
- Log in again

### Backend connection error
- Ensure backend server is running
- Check `VITE_BACKEND_URL` in `.env`
- Verify CORS settings in `backend/.env`

### MongoDB connection error
- Check MongoDB is running: `brew services list` (macOS)
- Verify `MONGODB_URI` in `backend/.env`
- Check MongoDB logs

### Usage limit exceeded
- Wait until midnight UTC for reset
- Or increase limits in MongoDB:
```javascript
db.users.updateOne(
  { email: "user@example.com" },
  { $set: { "limits.maxRequestsPerDay": 1000 } }
)
```

## Managing Users

### View all users
```javascript
use externai
db.users.find({}, { email: 1, name: 1, plan: 1, usage: 1 })
```

### Update user plan
```javascript
db.users.updateOne(
  { email: "user@example.com" },
  { $set: { plan: "pro", "limits.maxRequestsPerDay": 1000, "limits.maxTokensPerDay": 1000000 } }
)
```

### Reset user usage
```javascript
db.users.updateOne(
  { email: "user@example.com" },
  { $set: { "usage.requestsToday": 0, "usage.tokensToday": 0 } }
)
```

## Future Enhancements

- Subscription plans (Stripe integration)
- Team workspaces
- Usage analytics dashboard
- Password reset via email
- Two-factor authentication
- OAuth providers (Google, GitHub)
