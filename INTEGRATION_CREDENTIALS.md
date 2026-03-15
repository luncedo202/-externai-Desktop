# Integration Credentials Storage

## Overview

Integration credentials (API keys, tokens, etc.) are now saved to your Firestore database, allowing you to reuse them across different projects without re-entering them.

## How It Works

### When User Saves Credentials

1. User enters API keys in the Integrations panel
2. Click "Save to project" button
3. **Credentials are saved to:**
   - **Firestore database** (user's account) - for reuse across projects
   - **Local .env file** (current project) - for immediate use
4. AI automatically sets up the integration in the project

### When User Opens Integration

1. System checks Firestore for saved credentials
2. If found, automatically loads them into the form fields
3. Green "Saved" badge appears on integration cards that have credentials
4. Green checkmark message shows "Credentials saved — loaded automatically"

### When User Opens New Project

1. Opens same integration in a different project
2. Credentials automatically populate from Firestore
3. User can immediately click "Save to project" to add to new project
4. No need to find and re-enter API keys

## Database Structure

```
/integrationCredentials/{userId}/
  stripe/
    STRIPE_SECRET_KEY: "sk_test_..."
    STRIPE_PUBLISHABLE_KEY: "pk_test_..."
    updatedAt: "2026-03-13T10:30:00Z"
  openai/
    OPENAI_API_KEY: "sk-proj-..."
    updatedAt: "2026-03-13T10:35:00Z"
  vercel/
    VERCEL_TOKEN: "vercel_..."
    updatedAt: "2026-03-13T10:40:00Z"
```

## Security

### Firestore Rules

```javascript
match /integrationCredentials/{userId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

- Users can only access their own credentials
- Must be authenticated to read/write
- Credentials are isolated per user

### Best Practices

1. **Never expose credentials in client code** - Always use environment variables
2. **Use .env files** - Never commit them to git (already in .gitignore)
3. **Firestore encryption** - Firebase encrypts data at rest and in transit
4. **Token rotation** - Regularly rotate API keys for security

## Service API

### IntegrationCredentialsService

Located at: `/src/renderer/services/IntegrationCredentialsService.js`

#### Methods

**saveCredentials(integrationId, credentials)**
```javascript
await IntegrationCredentialsService.saveCredentials('stripe', {
  STRIPE_SECRET_KEY: 'sk_test_...',
  STRIPE_PUBLISHABLE_KEY: 'pk_test_...'
});
```

**getCredentials(integrationId)**
```javascript
const creds = await IntegrationCredentialsService.getCredentials('stripe');
// Returns: { STRIPE_SECRET_KEY: '...', STRIPE_PUBLISHABLE_KEY: '...', updatedAt: '...' }
```

**getAllCredentials()**
```javascript
const allCreds = await IntegrationCredentialsService.getAllCredentials();
// Returns: { stripe: {...}, openai: {...}, ... }
```

**hasCredentials(integrationId)**
```javascript
const hasCreds = await IntegrationCredentialsService.hasCredentials('stripe');
// Returns: true or false
```

**deleteCredentials(integrationId)**
```javascript
await IntegrationCredentialsService.deleteCredentials('stripe');
```

**getSavedIntegrations()**
```javascript
const integrations = await IntegrationCredentialsService.getSavedIntegrations();
// Returns: ['stripe', 'openai', 'vercel']
```

## User Experience

### Visual Indicators

1. **Green "Saved" badge** - Shows on integration cards that have saved credentials
2. **Green checkmark message** - "Credentials saved — loaded automatically"
3. **Auto-filled form fields** - Credentials automatically populate from database

### Workflow

**First Time Setup:**
1. User clicks integration
2. Sees empty form fields
3. Enters API keys
4. Clicks "Save to project"
5. Keys saved to database and .env file
6. AI sets up integration automatically

**Subsequent Uses:**
1. User clicks same integration (in any project)
2. Form fields automatically filled
3. User can review or modify
4. Click "Save to project" to add to new project
5. Instant setup, no re-typing

## Supported Integrations

All integrations with `envKeys` property support credential storage:

- ✅ Stripe
- ✅ OpenAI
- ✅ Firebase
- ✅ Anthropic
- ✅ Resend
- ✅ Cloudinary
- ✅ Vercel
- ✅ Netlify
- ✅ Twilio
- ✅ Google Analytics
- ✅ SendGrid
- ✅ Mailchimp
- ✅ Google Maps
- ✅ PayFast

## Implementation Details

### IntegrationsPanel.jsx Changes

1. **Import service:**
   ```javascript
   import IntegrationCredentialsService from '../services/IntegrationCredentialsService';
   ```

2. **Load saved integrations on mount:**
   ```javascript
   useEffect(() => {
     loadSavedCredentials();
   }, []);
   ```

3. **Load credentials when integration selected:**
   ```javascript
   useEffect(() => {
     if (selected) {
       loadIntegrationCredentials(selected);
     }
   }, [selected]);
   ```

4. **Save to database when user saves:**
   ```javascript
   const handleSaveEnv = async (integration) => {
     // ... prepare credentials
     await IntegrationCredentialsService.saveCredentials(integration.id, credentials);
     // ... save to .env file
     // ... trigger AI setup
   };
   ```

### CSS Changes

Added `.itp-saved-badge` styling:
```css
.itp-saved-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  background: linear-gradient(135deg, #10b981, #059669);
  color: #fff;
  font-size: 9px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  gap: 3px;
}
```

## Testing

1. **Save credentials:**
   - Open an integration (e.g., Stripe)
   - Enter API keys
   - Click "Save to project"
   - Should see success message

2. **Verify database:**
   - Check Firebase Console → Firestore
   - Navigate to: `/integrationCredentials/{your-uid}/stripe`
   - Should see saved keys

3. **Test reuse:**
   - Open a different project
   - Open same integration
   - Credentials should auto-populate

4. **Test badge:**
   - Close and reopen integrations panel
   - Should see green "Saved" badge on saved integrations

## Future Enhancements

- [ ] Credential encryption in database
- [ ] Credential sharing between team members
- [ ] Credential versioning/history
- [ ] Bulk import/export of credentials
- [ ] Credential expiry warnings
- [ ] Integration testing with saved credentials
- [ ] Credential usage analytics

## Deployment

1. **Deploy Firestore rules:**
   ```bash
   firebase deploy --only firestore:rules
   ```

2. **Restart app to load new service:**
   ```bash
   npm start
   ```

## Troubleshooting

**Credentials not saving:**
- Check user is authenticated
- Check Firestore rules are deployed
- Check browser console for errors

**Credentials not loading:**
- Check user is authenticated
- Check Firestore has data for user
- Check service is imported correctly

**Database permission errors:**
- Verify Firestore rules allow user access
- Check user ID matches document path
- Ensure user is authenticated before accessing

---

**Last Updated:** March 13, 2026
