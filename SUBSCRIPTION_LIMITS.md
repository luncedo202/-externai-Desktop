# Subscription & Prompt Limits

## Overview

ExternAI implements a freemium model where new users get **25 free AI prompts** before requiring a paid subscription. This document explains how the system works and how to manage it.

## How It Works

### Free Tier
- **25 free prompts** per user
- Tracked per Firebase user ID
- Prompt count decrements with each AI request
- Counter displayed in AI Assistant header
- Graceful blocking when limit reached

### Subscription Tiers
1. **Free** - 25 prompts total, then requires upgrade
2. **Pro** - Unlimited prompts (future implementation)
3. **Premium** - Unlimited prompts + priority features (future)

## Technical Implementation

### Backend (`/backend/routes/claude.js`)

**User Document Structure:**
```javascript
{
  createdAt: Timestamp,
  subscription: {
    tier: 'free' | 'pro' | 'premium',
    status: 'active' | 'cancelled' | 'expired',
    startDate: Timestamp,
    freePromptsRemaining: 25,
    totalFreePromptsUsed: 0
  },
  usage: {
    requestsToday: 0,
    tokensToday: 0,
    lastResetDate: '2025-12-12',
    totalRequests: 0,
    totalTokens: 0
  },
  limits: {
    maxRequestsPerDay: 100,
    maxTokensPerDay: 100000
  }
}
```

**Prompt Checking:**
1. User sends AI request
2. Backend fetches user document from Firestore
3. Check `subscription.tier` and `freePromptsRemaining`
4. If free tier and prompts <= 0, return 402 Payment Required
5. If allowed, process request and decrement counter
6. Return response to client

**API Response (402):**
```json
{
  "error": "Free prompts exhausted",
  "message": "You have used all 25 free prompts. Please subscribe to continue using AI features.",
  "subscription": {
    "tier": "free",
    "freePromptsRemaining": 0,
    "totalFreePromptsUsed": 25
  },
  "requiresPayment": true
}
```

### Frontend (`/src/renderer/components/AIAssistant.jsx`)

**Features:**
1. **Fetch subscription status** on component mount
2. **Display prompts remaining** in header (e.g., "23 free prompts left")
3. **Update counter** after each successful AI request
4. **Handle 402 error** with upgrade message
5. **Track analytics** for subscription events

**UI States:**
- Green badge shows remaining prompts (e.g., "25 free prompts left")
- Updates in real-time after each message
- Shows upgrade message when limit reached
- Error banner with subscription benefits

**Error Handling:**
```javascript
if (error.message.includes('Free prompts exhausted')) {
  // Show upgrade message
  // Track analytics event
  // Display subscription benefits
}
```

### Analytics Tracking (`/src/renderer/services/AnalyticsService.js`)

**Events tracked:**
1. `prompt_used` - Each time user sends AI request
   - Tier: free/pro/premium
   - Prompts remaining: number
2. `approaching_limit` - When user has 5 or fewer prompts left
3. `limit_reached` - When user hits 0 prompts
4. `upgrade_shown` - When upgrade message displayed

**Usage:**
```javascript
AnalyticsService.trackSubscription('prompt_used', 'free', 23);
AnalyticsService.trackSubscription('limit_reached', 'free', 0);
```

## User Experience

### First Time User
1. Signs up and gets 25 free prompts
2. Counter shows "25 free prompts left" in AI header
3. Can use AI assistant normally
4. Counter decrements with each message

### Approaching Limit (5 prompts left)
1. Counter shows "5 free prompts left"
2. Analytics tracks `approaching_limit` event
3. User can continue using AI
4. UI becomes more prominent (yellow/warning color - future)

### Limit Reached (0 prompts)
1. User sends AI request
2. Backend returns 402 Payment Required
3. Frontend shows upgrade message:
   ```
   🔒 Free Prompts Exhausted
   
   You've used all 25 free AI prompts. To continue using AI features, 
   please subscribe to a paid plan.
   
   Benefits of subscribing:
   • Unlimited AI prompts
   • Priority support
   • Advanced features
   • Faster response times
   
   [Subscribe Now] to continue building amazing projects!
   ```
4. Analytics tracks `limit_reached` event
5. Input disabled until subscription upgrade

## Configuration

### Environment Variables
No additional environment variables needed. Uses existing Firebase/Firestore setup.

### Development Mode
In development (`NODE_ENV !== 'production`), limits are **disabled** for easier testing:
```javascript
const isDevelopment = process.env.NODE_ENV !== 'production';
if (!isDevelopment) {
  // Check limits
}
```

### Testing Limits
To test in development, set environment:
```bash
export NODE_ENV=production
npm run dev
```

Or modify backend code temporarily:
```javascript
const isDevelopment = false; // Force production mode
```

## Database Management

### Reset User Prompts (Firestore Console)
1. Go to Firebase Console → Firestore
2. Navigate to `users` collection
3. Find user by UID
4. Update `subscription.freePromptsRemaining` to 25

### Grant Unlimited Access
Update user document:
```javascript
subscription: {
  tier: 'pro',  // Change from 'free' to 'pro'
  status: 'active'
}
```

### View Usage Statistics
Query Firestore:
```javascript
// Total users by tier
db.collection('users')
  .where('subscription.tier', '==', 'free')
  .get()

// Users who hit limit
db.collection('users')
  .where('subscription.freePromptsRemaining', '==', 0)
  .get()

// Average prompts used
db.collection('users')
  .select('subscription.totalFreePromptsUsed')
  .get()
```

## Future Enhancements

### Payment Integration
- [ ] Integrate Stripe for subscriptions
- [ ] Add subscription management page
- [ ] Create checkout flow
- [ ] Handle webhooks for payment events
- [ ] Auto-upgrade tier on successful payment

### UI Improvements
- [ ] Warning color when < 5 prompts left
- [ ] Progress bar showing prompts used
- [ ] Toast notifications for milestone prompts (20, 15, 10, 5 left)
- [ ] In-app subscription upgrade modal
- [ ] Pricing page with tier comparison

### Analytics Dashboard
- [ ] View conversion rate (free → paid)
- [ ] Track average prompts before upgrade
- [ ] Identify users who hit limit but don't upgrade
- [ ] A/B test different upgrade messages
- [ ] Monitor subscription churn rate

### Advanced Features
- [ ] Referral program (earn extra free prompts)
- [ ] Trial period for pro features
- [ ] Team/organization subscriptions
- [ ] Usage alerts via email
- [ ] Prompt rollover (unused prompts expire)

## API Endpoints

### Get Usage Stats
```javascript
GET /api/claude/usage
Authorization: Bearer <firebase-token>

Response:
{
  "subscription": {
    "tier": "free",
    "status": "active",
    "freePromptsRemaining": 23,
    "totalFreePromptsUsed": 2
  },
  "usage": {
    "requestsToday": 5,
    "tokensToday": 1500,
    "totalRequests": 42,
    "totalTokens": 12500
  },
  "limits": {
    "maxRequestsPerDay": 100,
    "maxTokensPerDay": 100000
  }
}
```

### Send AI Request (with limits)
```javascript
POST /api/claude/stream
Authorization: Bearer <firebase-token>
Content-Type: application/json

{
  "messages": [...],
  "max_tokens": 4096
}

Success (200): Streams AI response
Error (402): Free prompts exhausted
Error (429): Daily limit exceeded
```

## Monitoring

### Key Metrics to Track
1. **Conversion Rate**: Free users → Paid subscribers
2. **Average Prompts Used**: Before hitting limit
3. **Upgrade Message CTR**: Click-through rate on subscribe button
4. **Prompt Distribution**: How many users use 1, 5, 10, 15, 20, 25 prompts
5. **Time to Limit**: How long until users hit 25 prompts

### Google Analytics Events
View in GA Dashboard:
- **Events** → Filter by "subscription"
- **Conversions** → Set up goal for "upgrade_clicked"
- **User Explorer** → See individual user journeys
- **Funnel Analysis** → Track free → paid conversion

## Troubleshooting

### Counter Not Updating
1. Check browser console for errors
2. Verify `ClaudeService.getUsage()` is called
3. Check Firebase authentication
4. Verify Firestore permissions

### Prompts Not Decrementing
1. Check backend logs for errors
2. Verify Firestore write permissions
3. Check `NODE_ENV` (might be in dev mode)
4. Verify Firebase Admin SDK initialized

### False "Limit Reached" Error
1. Check Firestore user document
2. Verify `freePromptsRemaining` value
3. Check backend logic for off-by-one errors
4. Review Firestore transaction logs

### Counter Shows Wrong Number
1. Clear localStorage: `localStorage.clear()`
2. Force refresh: Cmd+Shift+R
3. Check if multiple tabs are open
4. Verify backend returns correct subscription data

## Support

For issues or questions:
1. Check Firebase Console → Firestore for user data
2. Review backend logs: `cd backend && npm run dev`
3. Check browser console for frontend errors
4. Test API directly: Use Postman or curl
5. Review analytics for patterns

## Related Documentation
- [ANALYTICS_GUIDE.md](./ANALYTICS_GUIDE.md) - Google Analytics integration
- [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) - Firebase configuration
- [AUTHENTICATION_SETUP.md](./AUTHENTICATION_SETUP.md) - User authentication
