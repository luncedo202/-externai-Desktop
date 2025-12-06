# ExternAI Proxy Server

Secure backend proxy for Claude API calls. Keeps your API key safe on the server.

## Features

- 🔐 Secure API key storage
- 🚦 Rate limiting (100 requests per 15 minutes per IP)
- 📊 Usage logging
- 🛡️ Security headers with Helmet
- ⚡ CORS enabled
- 💪 Error handling

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Add your API key to `.env`:
```
ANTHROPIC_API_KEY=your_actual_key_here
```

4. Start server:
```bash
npm start
```

Server runs on `http://localhost:3001`

## Deployment

### Deploy to Railway (Free)

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select this repository
5. Add environment variable: `ANTHROPIC_API_KEY=your_key`
6. Deploy!

Railway gives you a URL like: `https://yourapp.up.railway.app`

### Deploy to Render (Free)

1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Click "New +" → "Web Service"
4. Connect your GitHub repo
5. Set:
   - Build Command: `cd proxy-server && npm install`
   - Start Command: `cd proxy-server && npm start`
6. Add environment variable: `ANTHROPIC_API_KEY=your_key`
7. Deploy!

### Deploy to Fly.io (Free)

1. Install Fly CLI: `brew install flyctl`
2. Login: `fly auth login`
3. Deploy:
```bash
cd proxy-server
fly launch
fly secrets set ANTHROPIC_API_KEY=your_key
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Your Claude API key |
| `PORT` | No | Server port (default: 3001) |
| `NODE_ENV` | No | Environment (production/development) |

## API Endpoints

### Health Check
```
GET /health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2025-12-06T10:30:00.000Z"
}
```

### Claude API Proxy
```
POST /api/claude
```

Request:
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Hello!"
    }
  ],
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 8000
}
```

Response: Same as Claude API response

## Security

- Rate limiting: 100 requests per 15 minutes per IP
- Helmet security headers
- CORS enabled (configure in production)
- Request validation
- Error handling without exposing sensitive info

## Monitoring

Server logs token usage:
```
[2025-12-06T10:30:00.000Z] Request processed - Tokens: 1234
```

Monitor your logs to track API usage and costs.

## Cost Estimation

Claude API pricing (as of Dec 2025):
- Input: $3 per million tokens
- Output: $15 per million tokens

Average conversation uses ~2,000 tokens = $0.03

For 1,000 users making 10 requests/day:
- 10,000 requests/day
- ~20M tokens/day
- ~$60-300/day depending on usage

**Important:** Monitor your usage and set up billing alerts!
