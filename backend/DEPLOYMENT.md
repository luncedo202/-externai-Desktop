# Backend Deployment Guide

## Prerequisites
- Backend `.env` file configured with all credentials
- Railway or Render account (free tier available)

## Option 1: Deploy to Railway (Recommended)

### Step 1: Install Railway CLI
```bash
npm install -g @railway/cli
```

### Step 2: Login to Railway
```bash
railway login
```

### Step 3: Deploy
```bash
cd backend
railway init
railway up
```

### Step 4: Set Environment Variables
Go to Railway dashboard and add these environment variables:
- `NODE_ENV` = `production`
- `PORT` = `5000`
- `FIREBASE_PROJECT_ID` = `externai-desktop`
- `FIREBASE_CLIENT_EMAIL` = `firebase-adminsdk-fbsvc@externai-desktop.iam.gserviceaccount.com`
- `FIREBASE_PRIVATE_KEY` = (copy from .env file)
- `ANTHROPIC_API_KEY` = (copy from .env file)
- `ALLOWED_ORIGINS` = `*`

### Step 5: Get Your Backend URL
Railway will provide a URL like: `https://externai-backend-production.up.railway.app`

---

## Option 2: Deploy to Render

### Step 1: Create Render Account
Go to https://render.com and sign up (free)

### Step 2: Create New Web Service
1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Select the `backend` folder

### Step 3: Configure Service
- **Name**: `externai-backend`
- **Environment**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`

### Step 4: Add Environment Variables
In Render dashboard, add all variables from your `.env` file:
- `NODE_ENV` = `production`
- `PORT` = `5000`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `ANTHROPIC_API_KEY`
- `ALLOWED_ORIGINS` = `*`

### Step 5: Deploy
Click "Create Web Service" - Render will automatically deploy

---

## Option 3: Manual Deployment (Heroku)

```bash
cd backend
heroku create externai-backend
heroku config:set NODE_ENV=production
heroku config:set FIREBASE_PROJECT_ID=externai-desktop
heroku config:set FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@externai-desktop.iam.gserviceaccount.com
heroku config:set FIREBASE_PRIVATE_KEY="$(cat .env | grep FIREBASE_PRIVATE_KEY | cut -d '=' -f2-)"
heroku config:set ANTHROPIC_API_KEY="$(cat .env | grep ANTHROPIC_API_KEY | cut -d '=' -f2)"
heroku config:set ALLOWED_ORIGINS="*"
git push heroku main
```

---

## After Deployment

1. **Test the backend**:
   ```bash
   curl https://your-backend-url.com/health
   ```
   Should return: `{"status":"ok","timestamp":"..."}`

2. **Update frontend** (in `src/renderer/services/ClaudeService.js`):
   ```javascript
   const BACKEND_URL = 'https://your-backend-url.com';
   ```

3. **Rebuild the Electron app**:
   ```bash
   npm run build
   npm run dist
   ```

Your ExternAI app is now ready for distribution! 🚀
