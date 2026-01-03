# Railway Deployment Guide for ExternAI Backend

This guide walks you through deploying the `eletr0` backend to Railway.

## 1. Create a New Service on Railway
1. Go to [Railway.app](https://railway.app/).
2. Create a new Project.
3. Select **Deploy from GitHub repo**.
4. Choose your `-externai-Desktop` repository.
5. Set the **Root Directory** to `backend`.

## 2. Configure Environment Variables
In the **Variables** tab of your Railway service, add the following:

| Variable | Description | Example/Source |
| :--- | :--- | :--- |
| `ANTHROPIC_API_KEY` | Your Claude API Key | `sk-ant-api03-...` |
| `FIREBASE_PROJECT_ID` | Firebase Project ID | `externai-app` |
| `FIREBASE_CLIENT_EMAIL` | Firebase Service Account Email | `firebase-adminsdk-...@...iam.gserviceaccount.com` |
| `FIREBASE_PRIVATE_KEY` | Firebase Private Key | `-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----` |
| `ALLOWED_ORIGINS` | Allowed Frontend URLs | `https://your-frontend.vercel.app,*` |
| `MAX_LIFETIME_REQUESTS` | Lifetime Prompts for Free Users | `20` |
| `MAX_REQUESTS_PER_DAY` | Daily Prompt Limit | `100` |
| `NODE_ENV` | Environment Type | `production` |

> [!IMPORTANT]
> When pasting the `FIREBASE_PRIVATE_KEY`, make sure it includes the `\n` characters exactly as they appear in your service account JSON file.

## 3. Verify Deployment
Once deployed, you can verify it by visiting:
`https://your-backend-url.railway.app/health`

It should return:
```json
{ "status": "ok", "timestamp": "..." }
```

## 4. Connect Frontend
Update your `.env.production` in the root of the project with your new Railway URL:
```env
VITE_BACKEND_URL=https://your-backend-url.railway.app
```
