# ExternAI Deployment Guide

Complete guide to deploy ExternAI with secure API key management using a proxy server.

## Architecture

```
User's Desktop App
       ↓
Your Proxy Server (Railway/Render/Fly.io)
  ├─ API Key stored here (secure)
  ├─ Rate limiting
  └─ Usage monitoring
       ↓
Claude API (Anthropic)
```

## Step 1: Deploy Proxy Server

### Option A: Railway (Recommended - Easiest)

1. **Sign up**: Go to [railway.app](https://railway.app) and sign up with GitHub

2. **Create new project**:
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your `externai` repository
   - Select `proxy-server` as root directory

3. **Configure**:
   - Railway auto-detects Node.js
   - It will run `npm install` and `npm start`

4. **Add environment variable**:
   - Go to Variables tab
   - Add: `ANTHROPIC_API_KEY` = `your_actual_api_key`

5. **Deploy**: Railway automatically deploys

6. **Get URL**: Copy your app URL (e.g., `https://externai-proxy.up.railway.app`)

**Cost**: Free tier gives you $5 credit/month (enough for ~500-1000 requests)

---

### Option B: Render.com (Also Free)

1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Click "New +" → "Web Service"
4. Connect your GitHub repo
5. Configure:
   ```
   Name: externai-proxy
   Root Directory: proxy-server
   Environment: Node
   Build Command: npm install
   Start Command: npm start
   ```
6. Add environment variable: `ANTHROPIC_API_KEY`
7. Deploy (takes 2-3 minutes)

**Cost**: Free tier available

---

### Option C: Fly.io (More Control)

```bash
# Install Fly CLI
brew install flyctl

# Login
fly auth login

# Navigate to proxy server
cd proxy-server

# Launch (follow prompts)
fly launch

# Set API key
fly secrets set ANTHROPIC_API_KEY=your_key

# Deploy
fly deploy
```

**Cost**: Free tier includes shared CPU + 256MB RAM

---

## Step 2: Update Desktop App

1. **Create `.env` file** in project root:
```env
PROXY_SERVER_URL=https://your-app.up.railway.app
```

2. **Test locally**:
```bash
npm start
```

The app will now use your proxy server instead of calling Claude directly!

---

## Step 3: Build Desktop App

```bash
# Build for macOS
npm run dist:mac

# Output files in dist/:
# - ExternAI-1.0.0-arm64.dmg
# - ExternAI-1.0.0-x64.dmg
```

---

## Step 4: Push to GitHub

The proxy server URL is in `.env` which is gitignored, so it won't be pushed.

The desktop app will be configured to use:
```
PROXY_SERVER_URL=https://your-app.up.railway.app
```

This is hardcoded in the built app, which is fine because it's just a URL (not a secret).

---

## Step 5: Upload to GitHub Releases

1. Go to your GitHub repo: `https://github.com/luncedo202/-externai-Desktop`
2. Click "Releases" → "Create a new release"
3. Tag: `v1.0.0`
4. Title: "ExternAI v1.0.0 - Initial Release"
5. Upload the `.dmg` files from `dist/` folder
6. Publish release

---

## Step 6: Share with Users

Your download link:
```
https://github.com/luncedo202/-externai-Desktop/releases/latest
```

Users:
1. Download the DMG
2. Install
3. Use immediately (NO API key setup needed!)

---

## Security Benefits

✅ **API key is secure** - Stored only on your server, never in the app
✅ **Rate limiting** - 100 requests per 15min per IP (prevents abuse)
✅ **Usage monitoring** - See logs to track costs
✅ **Can update/revoke** - Change key anytime without updating app
✅ **No user setup** - Users don't need their own API keys

---

## Monitoring & Costs

### Check Usage (Railway)

1. Go to Railway dashboard
2. Click your project
3. View "Metrics" tab for:
   - Request count
   - Bandwidth
   - CPU/Memory usage

### Check Usage (Proxy Logs)

Your proxy server logs every request:
```
[2025-12-06T10:30:00.000Z] Request processed - Tokens: 1234
```

### Cost Estimation

**Claude API Costs:**
- Input: $3 per 1M tokens
- Output: $15 per 1M tokens

**Typical usage:**
- 1 conversation = ~2,000 tokens = $0.03
- 1,000 conversations = $30
- 10,000 conversations = $300

**Hosting Costs:**
- Railway: $5 credit/month (free)
- Render: Free tier
- Fly.io: Free tier

**Total:** Pay only for Claude API usage!

### Set Budget Alerts

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Go to Settings → Usage
3. Set monthly budget limit
4. Get email alerts when approaching limit

---

## Troubleshooting

### "Proxy server not configured" error

**Solution**: Make sure PROXY_SERVER_URL is set in your app's build configuration.

Edit `package.json` build config:
```json
"build": {
  "env": {
    "PROXY_SERVER_URL": "https://your-app.up.railway.app"
  }
}
```

### "Connection refused" error

**Solution**: Check if proxy server is running:
```bash
curl https://your-app.up.railway.app/health
```

Should return: `{"status":"ok","timestamp":"..."}`

### High API costs

**Solutions:**
1. **Add authentication** - Require users to create accounts
2. **Increase rate limits** - Reduce from 100 to 50 requests per 15min
3. **Add usage caps** - Limit users to X requests per day
4. **Implement caching** - Cache similar requests

---

## Next Steps (Optional)

### Add User Authentication

Track usage per user:
```javascript
// In proxy server
app.post('/api/claude', authenticateUser, async (req, res) => {
  const userId = req.user.id;
  // Track usage per user in database
});
```

### Add Usage Dashboard

Create admin panel to view:
- Total requests
- Top users
- Cost per day/week/month
- Error rates

### Implement Monetization

Charge users for API access:
1. Free tier: 100 requests/month
2. Pro tier: Unlimited requests ($9/month)
3. Use Stripe for payments

---

## Support

If you need help:
- Railway: [railway.app/help](https://railway.app/help)
- Render: [render.com/docs](https://render.com/docs)
- Fly.io: [fly.io/docs](https://fly.io/docs)

For API costs/limits:
- Anthropic Console: [console.anthropic.com](https://console.anthropic.com)
