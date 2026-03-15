# OpenAI File Explanation - Cloud Setup Guide

The file explanation feature now runs securely via Firebase Cloud Functions.

## ✅ What Changed

- **Before**: OpenAI API calls made from Electron main process
- **After**: API calls made through Firebase Cloud Function (more secure, centralized)

## 🔧 Setup Steps

### 1. Set OpenAI API Key in Firebase

```bash
# Set the OpenAI API key in Firebase Functions environment
firebase functions:secrets:set OPENAI_API_KEY
# Paste your OpenAI API key when prompted
```

**Or use Firebase Console:**
1. Go to Firebase Console → Functions → Configuration
2. Add secret: `OPENAI_API_KEY` with your OpenAI API key

### 2. Set Firebase Function URL in Electron App

Add to your `.env` file:

```env
VITE_FIREBASE_FUNCTION_URL=https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/api
```

**To find your URL:**
- After deploying, Firebase will show: `https://us-central1-yourproject.cloudfunctions.net/api`
- Or check Firebase Console → Functions → Dashboard

### 3. Deploy Firebase Functions

```bash
cd /Applications/eletr0/functions
npm install
firebase deploy --only functions
```

### 4. Rebuild Electron App

```bash
cd /Applications/eletr0
npm run build
```

## 🔐 Security Benefits

✅ **API Key Protection**: OpenAI key never leaves Firebase server  
✅ **Rate Limiting**: Built into Cloud Function (100 req/15min per IP)  
✅ **Cost Control**: Monitor usage in Firebase Console  
✅ **User Tracking**: Logs userId for analytics  
✅ **Centralized Updates**: Update AI model without app rebuild

## 📊 Cost Estimation

**GPT-4o-mini Pricing:**
- Input: $0.15 per 1M tokens (~750k words)
- Output: $0.60 per 1M tokens (~750k words)

**Typical file explanation:**
- Input: ~2,000 tokens (8KB file)
- Output: ~200 tokens (explanation)
- **Cost per explanation: ~$0.0003 (less than a penny)**

**Firebase Cloud Functions:**
- Free tier: 2M invocations/month
- After: $0.40 per 1M invocations

## 🧪 Testing

**Test locally with Firebase emulator:**
```bash
cd functions
npm run serve
```

Then set in `.env`:
```env
VITE_FIREBASE_FUNCTION_URL=http://127.0.0.1:5001/YOUR_PROJECT/us-central1/api
```

**Test endpoint directly:**
```bash
curl -X POST http://YOUR_FUNCTION_URL/api/openai/explain \
  -H "Content-Type: application/json" \
  -d '{
    "filePath": "test.js",
    "content": "console.log(\"Hello\");",
    "language": "javascript"
  }'
```

## 📝 Files Modified

- `/functions/routes/openai.js` - New Cloud Function route
- `/functions/index.js` - Added OpenAI route
- `/src/main/main.js` - Updated to call Cloud Function
- Frontend unchanged (still uses same API)

## ⚙️ Configuration Variables

**Firebase Functions:**
- `OPENAI_API_KEY` - Your OpenAI API key (secret)

**Electron App (.env):**
- `VITE_FIREBASE_FUNCTION_URL` - Your Firebase Function URL

## 🔍 Monitoring

**View logs:**
```bash
firebase functions:log
```

**Or in Firebase Console:**
Functions → Logs

**Metrics to watch:**
- Invocations per day
- Error rate
- Execution time
- OpenAI API costs

## 🚨 Troubleshooting

**"Service not configured" error:**
- Check `VITE_FIREBASE_FUNCTION_URL` is set in `.env`
- Verify Firebase Function is deployed
- Check function logs for errors

**"Failed to generate explanation":**
- Verify `OPENAI_API_KEY` is set in Firebase secrets
- Check OpenAI API key has credits
- Review function logs

**Slow responses:**
- First call is cold start (~2-3 seconds)
- Subsequent calls are faster
- Consider using Firebase Functions min instances for production

## 🎯 Next Steps

1. Deploy to production: `firebase deploy --only functions`
2. Monitor costs in OpenAI dashboard
3. Set up billing alerts in Firebase Console
4. Consider adding usage analytics
