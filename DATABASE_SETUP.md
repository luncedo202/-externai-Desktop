# Database Setup Guide - Firestore

## Overview
This project now uses **Firebase Firestore** as the database solution for:
- User profile management
- Subscription tracking and limits
- Payment history
- Conversation history
- User preferences
- Analytics and usage tracking

## Why Firestore?
- **Already Integrated**: Firebase Auth is already in use
- **Real-time**: Live data synchronization
- **NoSQL Flexibility**: Perfect for conversations and analytics
- **Scalable**: Handles growth automatically
- **No Infrastructure**: Fully managed by Google
- **Cross-platform**: Works in both Electron and web

---

## Setup Instructions

### 1. Enable Firestore in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click **Firestore Database** in the left menu
4. Click **Create Database**
5. Choose **Start in production mode** (recommended) or test mode
6. Select your Cloud Firestore location (choose closest to your users)
7. Click **Enable**

### 2. Configure Security Rules

In Firebase Console > Firestore Database > Rules, add these security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users collection - users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Subscriptions collection - users can only read their own
    match /subscriptions/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if false; // Only server can write
    }
    
    // Payments collection - users can only read their own
    match /payments/{paymentId} {
      allow read: if request.auth != null && resource.data.userId == request.auth.uid;
      allow write: if false; // Only server can write
    }
    
    // Conversations - users can read/write their own
    match /conversations/{conversationId} {
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
    }
    
    // Preferences - users can read/write their own
    match /preferences/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Analytics - only server can write
    match /analytics/{docId} {
      allow read, write: if false;
    }
  }
}
```

### 3. Backend Setup - Firebase Admin SDK

#### Create Service Account Key

1. Go to Firebase Console > Project Settings > Service Accounts
2. Click **Generate New Private Key**
3. Save the JSON file as `firebase-admin-key.json`
4. Place it in `/backend/config/firebase-admin-key.json`
5. **IMPORTANT**: Add this to `.gitignore`:

```
backend/config/firebase-admin-key.json
```

#### Alternative: Use Environment Variables (Recommended for Production)

Add to `/backend/.env`:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Private-Key-Here\n-----END PRIVATE KEY-----\n"
```

The `server.js` already supports this method.

### 4. Frontend Environment Variables

Add to your main `.env` file (already configured):

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

---

## Database Collections Structure

### 1. **users** Collection
Stores user profile information.

```javascript
{
  uid: "user123",
  email: "user@example.com",
  name: "John Doe",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### 2. **subscriptions** Collection
Tracks user subscription tiers and usage limits.

```javascript
{
  userId: "user123",
  tier: "free" | "starter" | "pro" | "unlimited",
  status: "active" | "cancelled" | "expired",
  requestsUsed: 5,
  requestsLimit: 50,
  resetDate: Timestamp,
  stripeSubscriptionId: "sub_xxx", // if using Stripe
  updatedAt: Timestamp
}
```

### 3. **payments** Collection
Stores payment transaction history.

```javascript
{
  userId: "user123",
  amount: 29.99,
  currency: "USD",
  planId: "starter",
  status: "completed" | "pending" | "failed",
  paymentMethod: "payfast" | "stripe",
  transactionId: "xxx",
  timestamp: Timestamp
}
```

### 4. **conversations** Collection
Stores AI conversation history.

```javascript
{
  userId: "user123",
  title: "React Component Help",
  messages: [
    {
      role: "user",
      content: "How do I create a React component?",
      timestamp: Timestamp
    },
    {
      role: "assistant",
      content: "Here's how...",
      timestamp: Timestamp
    }
  ],
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### 5. **preferences** Collection
User settings and preferences.

```javascript
{
  userId: "user123",
  theme: "dark" | "light",
  editorSettings: {
    fontSize: 14,
    tabSize: 2,
    wordWrap: true
  },
  aiSettings: {
    model: "claude-3-5-sonnet",
    temperature: 0.7
  },
  updatedAt: Timestamp
}
```

### 6. **analytics** Collection
Usage tracking and analytics.

```javascript
{
  userId: "user123",
  action: "ai_request" | "file_created" | "login",
  metadata: {
    // action-specific data
  },
  timestamp: Timestamp
}
```

---

## Usage Examples

### Frontend (React)

```javascript
import DatabaseService from '../services/DatabaseService';

// Create user profile after signup
const handleSignup = async (email, password, name) => {
  const result = await signUp(email, password, name);
  if (result.success) {
    await DatabaseService.createUserProfile(result.user.uid, {
      email: result.user.email,
      name: result.user.name
    });
  }
};

// Check subscription limits before API call
const makeAIRequest = async () => {
  const user = getCurrentUser();
  const subscription = await DatabaseService.getSubscription(user.uid);
  
  if (subscription.data.requestsUsed >= subscription.data.requestsLimit) {
    alert('Subscription limit reached!');
    return;
  }
  
  // Make API request
  await DatabaseService.incrementUsage(user.uid);
};

// Save conversation
const saveChat = async (messages) => {
  const user = getCurrentUser();
  await DatabaseService.saveConversation(user.uid, {
    title: "New Chat",
    messages: messages
  });
};
```

### Backend (Node.js)

```javascript
const database = require('./models/database');

// Check if user can make request
app.post('/api/claude/chat', authenticateToken, async (req, res) => {
  const userId = req.userId;
  
  // Check limits
  const canRequest = await database.canMakeRequest(userId);
  if (!canRequest) {
    return res.status(429).json({ error: 'Request limit exceeded' });
  }
  
  // Process request...
  
  // Increment usage
  await database.incrementUsage(userId);
});

// After successful payment
app.post('/api/payment/success', async (req, res) => {
  const { userId, planId, amount, transactionId } = req.body;
  
  // Update subscription
  await database.updateSubscription(userId, {
    tier: planId,
    status: 'active',
    requestsUsed: 0,
    requestsLimit: getLimit(planId)
  });
  
  // Record payment
  await database.addPayment(userId, {
    amount,
    planId,
    transactionId,
    status: 'completed'
  });
});
```

---

## Testing

### Test Firestore Connection

Create a test file `/backend/test-firestore.js`:

```javascript
const database = require('./models/database');

async function test() {
  try {
    console.log('Testing Firestore connection...');
    
    // Test user creation
    await database.createUser('test-user-123', {
      email: 'test@example.com',
      name: 'Test User'
    });
    console.log('✅ User created');
    
    // Test user retrieval
    const user = await database.getUser('test-user-123');
    console.log('✅ User retrieved:', user);
    
    console.log('All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

test();
```

Run: `node backend/test-firestore.js`

---

## Migration from No Database

If you have existing users in Firebase Auth but no database:

1. Create a migration script to populate user profiles
2. Set default free tier subscriptions for all existing users
3. Initialize usage counters

---

## Best Practices

1. **Always validate on server**: Don't trust client-side data
2. **Use transactions**: For critical operations like payment processing
3. **Index frequently queried fields**: userId, timestamp, etc.
4. **Monitor costs**: Firestore charges per read/write
5. **Batch operations**: Use batch writes when possible
6. **Cache frequently accessed data**: Reduce read costs
7. **Clean up old data**: Archive old conversations/analytics

---

## Troubleshooting

### "Permission denied" errors
- Check Firestore security rules
- Verify user is authenticated
- Ensure correct userId is being used

### "Module not found" errors
- Run `npm install` in both root and backend directories
- Firebase package includes Firestore (no separate install needed)

### Backend can't connect to Firestore
- Verify `firebase-admin-key.json` exists and is valid
- Check environment variables are set correctly
- Ensure Firebase project ID matches

---

## Next Steps

1. ✅ Firestore enabled in Firebase Console
2. ✅ Security rules configured
3. ✅ Service account key created
4. ✅ Environment variables set
5. ✅ Test database connection
6. ✅ Update your API routes to use database
7. ✅ Implement subscription checking
8. ✅ Add conversation history UI

Your database is now ready to use! 🎉
