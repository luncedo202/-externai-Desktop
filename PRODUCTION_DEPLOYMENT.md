# 🚀 ExternAI Production Deployment Checklist

## ✅ Pre-Deployment Setup (COMPLETED)

### Backend Configuration
- [x] `.env` file created with all required variables
- [x] Firebase Admin credentials configured
- [x] Claude API key added
- [x] `package.json` has start script
- [x] `.gitignore` configured
- [x] Railway/Render config files created

### Frontend Configuration
- [x] `.env.production` template created
- [x] ClaudeService configured to use environment variable
- [x] Firebase authentication integrated

---

## 📋 Deployment Steps

### Step 1: Deploy Backend to Railway

**Option A: Using Railway Web Interface (Easiest)**

1. **Sign up at Railway**
   - Go to https://railway.app
   - Sign up with GitHub (free tier: $5 monthly credit, no credit card required)

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo" OR "Empty Project"

3. **Deploy Backend**
   - If using GitHub: Select your repository → Select `backend` folder
   - If using Empty Project: Use Railway CLI:
     ```bash
     cd backend
     npx @railway/cli login
     npx @railway/cli init
     npx @railway/cli up
     ```

4. **Add Environment Variables** (CRITICAL!)
   Go to your Railway project → Variables tab → Add these:
   ```
   NODE_ENV=production
   PORT=5000
   FIREBASE_PROJECT_ID=externai-desktop
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@externai-desktop.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY=(copy full value from backend/.env file)
   ANTHROPIC_API_KEY=(copy from backend/.env file)
   ALLOWED_ORIGINS=*
   ```

5. **Generate Domain**
   - Railway will auto-generate a URL like: `https://externai-backend-production-xxxx.up.railway.app`
   - Or click "Generate Domain" in Settings
   - **COPY THIS URL** - you'll need it next!

6. **Test Backend**
   ```bash
   curl https://your-backend-url.railway.app/health
   ```
   Should return: `{"status":"ok","timestamp":"..."}`

---

### Step 2: Update Frontend with Backend URL

1. **Update `.env.production`**
   ```bash
   # Replace with YOUR Railway URL
   VITE_BACKEND_URL=https://your-backend-url.railway.app
   ```

2. **Verify ClaudeService.js**
   - File already configured to use `import.meta.env.VITE_BACKEND_URL`
   - No code changes needed!

---

### Step 3: Build Production Electron App

1. **Build the frontend**
   ```bash
   npm run build
   ```

2. **Package the app**
   ```bash
   # For your current platform
   npm run dist
   
   # Or for all platforms
   npm run dist:all
   ```

3. **Output will be in `/dist` folder**
   - macOS: `.dmg` file
   - Windows: `.exe` installer
   - Linux: `.AppImage` or `.deb`

---

### Step 4: Test the Built App

1. Install the app on your machine
2. Launch ExternAI
3. Sign in with Firebase
4. Test AI chat - should connect to Railway backend
5. Try creating a file to verify full functionality

---

### Step 5: Distribution

**Option A: Direct Download**
- Upload built files to your website
- Users download and install

**Option B: GitHub Releases**
- Push built files to GitHub Releases
- Users download from repository

**Option C: Auto-Update (Advanced)**
- Configure electron-builder with update server
- Users get automatic updates

---

## 🎯 Quick Test Checklist

After deployment, verify:
- [ ] Backend health endpoint responds
- [ ] Frontend connects to backend (check DevTools console)
- [ ] Firebase authentication works
- [ ] AI chat responds correctly
- [ ] File creation works
- [ ] Terminal commands execute
- [ ] Deploy button triggers Vercel deployment

---

## 🆘 Troubleshooting

**Backend deployment failed:**
- Check all environment variables are set correctly
- Ensure FIREBASE_PRIVATE_KEY has proper line breaks (\n)
- Check Railway logs for errors

**Frontend can't connect to backend:**
- Verify VITE_BACKEND_URL in .env.production
- Check CORS settings (ALLOWED_ORIGINS=*)
- Open DevTools → Network tab to see requests

**Firebase auth not working:**
- Verify Firebase credentials in frontend
- Check Firebase project settings match configuration
- Ensure Firebase Authentication is enabled in console

---

## 📊 Current Status

✅ Backend ready for deployment
✅ Configuration files created
✅ Environment variables documented
⏳ **NEXT: Deploy backend to Railway**
⏳ **THEN: Update frontend with backend URL**
⏳ **FINALLY: Build and distribute app**

---

## 💰 Cost Breakdown

**Railway Free Tier:**
- $5 monthly credit (no credit card required)
- Enough for ~100,000 requests/month
- Backend sleeps after 30min inactivity (wakes instantly)

**Firebase Free Tier:**
- 10,000 authentications/month
- 1GB storage
- Plenty for initial users

**Claude API:**
- Pay-as-you-go through your Anthropic account
- Monitor usage in Anthropic dashboard

**Total for initial deployment: $0/month** (within free tiers)

---

Need help? Check `backend/DEPLOYMENT.md` for detailed instructions!
