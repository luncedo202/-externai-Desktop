# Railway Environment Variables Checklist

## Required Environment Variables for Backend Deployment

### 1. Firebase Configuration
Get these from Firebase Console → Project Settings → Service Accounts → Generate New Private Key

```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nYourPrivateKeyHere\n-----END PRIVATE KEY-----
```

**Important Notes:**
- The private key must include `\n` for newlines
- Keep the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` markers
- The entire key should be one line with `\n` characters

### 2. Anthropic API Key
Get from: https://console.anthropic.com/settings/keys

```
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 3. CORS & Security

```
ALLOWED_ORIGINS=*
```

**For production, replace `*` with your actual frontend domains:**
```
ALLOWED_ORIGINS=https://your-app.com,https://www.your-app.com
```

### 4. Port (Optional)
Railway sets this automatically, but you can override:

```
PORT=5000
```

### 5. Usage Limits (Optional)
Set custom limits or use defaults:

```
MAX_REQUESTS_PER_DAY=100
MAX_LIFETIME_REQUESTS=20
```

---

## Railway Deployment Settings

### Root Directory
```
/backend
```

### Start Command
```
node server.js
```

### Build Command (Optional)
```
npm install
```

---

## How to Add Variables to Railway

1. Go to https://railway.app/dashboard
2. Open your "externai-desktop-production" project
3. Click on the backend service
4. Go to **Variables** tab
5. Click **+ New Variable**
6. Add each variable from the list above
7. Click **Deploy** (or it will auto-deploy after adding variables)

---

## Verification Steps

After deployment, test the backend:

### 1. Health Check
```bash
curl https://externai-desktop-production.up.railway.app/health
```

Expected response:
```json
{"status":"healthy"}
```

### 2. Test Claude API (requires authentication)
```bash
curl -X POST https://externai-desktop-production.up.railway.app/api/claude/stream \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -d '{"messages":[{"role":"user","content":"Hello"}]}'
```

### 3. Check Logs
In Railway dashboard → Your service → Deployments → View logs

Look for:
```
🚀 Server running on port XXXX
📍 Environment: production
🔐 CORS enabled
🔥 Firebase Admin initialized
```

---

## Troubleshooting

### Error: "Service account object must contain a string 'project_id' property"
- Missing `FIREBASE_PROJECT_ID` variable
- Solution: Add the variable from Firebase service account JSON

### Error: "invalid_grant" or "Invalid credentials"
- Incorrect `FIREBASE_PRIVATE_KEY` format
- Solution: Ensure `\n` newlines are included, copy directly from JSON

### Error: "ANTHROPIC_API_KEY is not defined"
- Missing Anthropic API key
- Solution: Add `ANTHROPIC_API_KEY` from Anthropic Console

### Error: 502 Bad Gateway
- Backend crashed or failed to start
- Solution: Check Railway logs for specific error messages

### Error: CORS errors in frontend
- `ALLOWED_ORIGINS` not set correctly
- Solution: Add your frontend domain to `ALLOWED_ORIGINS`

---

## Firebase Service Account JSON Example

When you download from Firebase, you'll get:

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "xxxxx",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com",
  "client_id": "xxxxx",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}
```

**Use these fields:**
- `project_id` → `FIREBASE_PROJECT_ID`
- `private_key` → `FIREBASE_PRIVATE_KEY` (keep the `\n` characters)
- `client_email` → `FIREBASE_CLIENT_EMAIL`

---

## Quick Copy Template

Once you have your values, copy this template and fill in:

```bash
# Firebase
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Anthropic
ANTHROPIC_API_KEY=

# CORS
ALLOWED_ORIGINS=*

# Limits (optional)
MAX_REQUESTS_PER_DAY=100
MAX_LIFETIME_REQUESTS=20
```

---

**Last Updated:** January 12, 2026
