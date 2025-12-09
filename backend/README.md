# ExternAI Backend

Authentication and API proxy service for ExternAI Desktop application.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Configure environment variables in `.env`:
   - Set your MongoDB connection string
   - Add your Anthropic API key
   - Generate secure JWT secrets (use: `openssl rand -hex 64`)

4. Start MongoDB (if running locally):
```bash
mongod
```

5. Run the server:
```bash
# Development
npm run dev

# Production
npm start
```

## API Endpoints

### Authentication

**POST /api/auth/signup**
- Create new user account
- Body: `{ email, password, name }`
- Returns: JWT tokens and user info

**POST /api/auth/login**
- Login existing user
- Body: `{ email, password }`
- Returns: JWT tokens and user info

**POST /api/auth/refresh**
- Refresh access token
- Body: `{ refreshToken }`
- Returns: New JWT tokens

**GET /api/auth/me**
- Get current user info
- Headers: `Authorization: Bearer <token>`
- Returns: User data

### Claude API Proxy

**POST /api/claude/stream**
- Proxy Claude API requests with streaming
- Headers: `Authorization: Bearer <token>`
- Body: `{ messages, max_tokens }`
- Returns: Server-sent events stream

**GET /api/claude/usage**
- Get user's API usage stats
- Headers: `Authorization: Bearer <token>`
- Returns: Usage data and limits

## Usage Limits

Default limits (configurable per user):
- 100 requests per day
- 100,000 tokens per day

Limits reset daily at midnight UTC.

## Deployment

Deploy to any Node.js hosting service:
- Heroku
- Railway
- Render
- DigitalOcean App Platform
- AWS/GCP/Azure

Make sure to:
1. Set environment variables
2. Configure MongoDB connection
3. Enable HTTPS in production
4. Set appropriate CORS origins
