# Firebase Setup Guide

This guide walks you through setting up Firebase Authentication for ExternAI.

## Prerequisites

- Node.js 18+ installed
- Google account for Firebase

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name: `externai` (or your preferred name)
4. Disable Google Analytics (optional)
5. Click "Create project"

## Step 2: Enable Authentication

1. In Firebase Console, go to **Build > Authentication**
2. Click "Get started"
3. Select "Email/Password" from Sign-in providers
4. Enable both "Email/Password" and "Email link (passwordless sign-in)" if desired
5. Click "Save"

## Step 3: Get Firebase Config (Client)

1. In Firebase Console, go to **Project Overview** (gear icon) > **Project settings**
2. Scroll down to "Your apps" section
3. Click the **Web** icon (`</>`) to add a web app
4. Register app with nickname: `externai-client`
5. Copy the `firebaseConfig` object

Example config:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "externai-xxxxx.firebaseapp.com",
  projectId: "externai-xxxxx",
  storageBucket: "externai-xxxxx.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:xxxxxxxxxxxx"
};
```

6. Add these values to the root `.env` file:
```env
VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_FIREBASE_AUTH_DOMAIN=externai-xxxxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=externai-xxxxx
VITE_FIREBASE_STORAGE_BUCKET=externai-xxxxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:xxxxxxxxxxxx
```

## Step 4: Generate Service Account Key (Backend)

1. In Firebase Console, go to **Project Overview** (gear icon) > **Project settings**
2. Go to **Service accounts** tab
3. Click "Generate new private key"
4. Click "Generate key" - this downloads a JSON file
5. Open the JSON file and extract these values:
   - `project_id`
   - `client_email`
   - `private_key` (keep the `\n` characters and quotes)

6. Add these to `backend/.env`:
```env
# Firebase Admin SDK
FIREBASE_PROJECT_ID=externai-xxxxx
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@externai-xxxxx.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBA...YOUR_KEY_HERE...\n-----END PRIVATE KEY-----\n"

# Anthropic API
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxx

# Usage limits
MAX_REQUESTS_PER_DAY=100
MAX_TOKENS_PER_DAY=100000
```

**Important**: The `FIREBASE_PRIVATE_KEY` must include quotes and preserve `\n` newline characters.

## Step 5: Setup Firestore Database

1. In Firebase Console, go to **Build > Firestore Database**
2. Click "Create database"
3. Choose "Start in production mode" (we'll set security rules next)
4. Select a location (choose closest to your users)
5. Click "Enable"

### Configure Security Rules

1. In Firestore Database, go to **Rules** tab
2. Replace with these rules:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read their own usage data
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if false; // Only backend can write
    }
  }
}
```
3. Click "Publish"

This prevents clients from modifying usage data directly.

## Step 6: Install Dependencies

```bash
# Root (client)
npm install

# Backend
cd backend
npm install
```

## Step 7: Start Services

### Development

Terminal 1 - Backend:
```bash
cd backend
npm run dev
```

Terminal 2 - Electron app:
```bash
npm run dev
```

### Production Backend

You can deploy the backend to:

**Option 1: Firebase Functions**
```bash
npm install -g firebase-tools
firebase login
firebase init functions
# Deploy functions
firebase deploy --only functions
```

**Option 2: Traditional Hosting** (Railway, Render, Heroku, etc.)
- Push backend folder to hosting service
- Set environment variables in hosting dashboard
- Start with: `npm start`

Update `VITE_BACKEND_URL` in root `.env` to your production backend URL.

## Testing Authentication

1. Run the app: `npm run dev`
2. Click "Sign Up" in the auth screen
3. Enter name, email, and password
4. You should see the main editor interface
5. Test the AI assistant - it should authenticate and proxy through backend
6. Check Firestore in Firebase Console - you should see a user document created in `users` collection

## Troubleshooting

### "Firebase not initialized" error
- Check that all `VITE_FIREBASE_*` variables are set in root `.env`
- Restart the dev server after changing `.env`

### "Firebase Admin not initialized" error
- Check that `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` are set in `backend/.env`
- Verify the private key includes quotes and `\n` characters
- Restart the backend server

### "Auth token verification failed"
- Check that the service account has "Firebase Authentication Admin" role
- Verify the project ID matches in both client and backend configs

### Usage tracking not working
- Verify Firestore is enabled in Firebase Console
- Check backend logs for Firestore errors
- Ensure security rules allow backend (Admin SDK) to write

## Security Best Practices

1. **Never commit `.env` files** - Already in `.gitignore`
2. **Rotate API keys regularly** - Generate new keys every 90 days
3. **Enable App Check** (optional) - Prevents unauthorized API usage
4. **Set up billing alerts** - Monitor Firebase usage
5. **Review Firestore security rules** - Ensure users can't bypass limits

## Next Steps

- Configure usage limits in `backend/.env` (`MAX_REQUESTS_PER_DAY`, `MAX_TOKENS_PER_DAY`)
- Set up Firebase App Check for additional security
- Configure custom email templates in Firebase Console
- Add password reset functionality (Firebase handles this automatically)
- Deploy backend to production hosting
- Build and distribute the Electron app with auto-updates
