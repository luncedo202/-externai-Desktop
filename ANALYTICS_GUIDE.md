# Google Analytics Integration Guide

## Overview

Google Analytics is fully integrated into ExternAI to track user behavior, feature usage, performance metrics, and errors. This helps improve the product and understand how users interact with the application.



### 2. Configure Environment Variable

Add to your `.env` file:
```env
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

Replace `G-XXXXXXXXXX` with your actual Measurement ID from Google Analytics.

### 3. Restart Application

```bash
npm run dev
```

The analytics will initialize automatically on app start.

## What's Being Tracked

### User Sessions
- **Login/Signup**: User authentication events
- **Session duration**: Time spent in the app
- **User ID**: Anonymous tracking with Firebase UID

### AI Interactions
- **Message sent**: When user sends a message to AI
  - Message length
- **Message received**: When AI responds
  - Response length
  - Response time (performance metric)
- **AI errors**: Failed requests with error details

### File Operations
- **File creation**: AI-generated files
  - File type (js, jsx, css, html, etc.)
  - File name
- **File opening**: User opens files from explorer
- **File saving**: User saves file changes

### Command Execution
- **Command name**: First word of the command (e.g., `npm`, `git`)
- **Success/Failure**: Command exit status
- **Execution time**: How long command took to complete

### Feature Usage
- **Sidebar views**: Explorer, Search, Git, Run/Debug, Images, Settings
- **Terminal**: Opening/closing terminals
- **Editor**: Tab changes, split views
- **Panel**: Output, Problems, Debug console

### Performance Metrics
- **AI response time**: Time from request to response
- **File operations**: Time to read/write files
- **Command execution**: Time to complete terminal commands
- **App load time**: Time to initialize application

### Error Tracking
- **AI errors**: Failed AI requests
- **File errors**: File read/write failures
- **Command errors**: Failed command executions
- **Authentication errors**: Login/signup failures

### User Engagement
- **Active time**: Time spent actively using features
- **Session frequency**: How often users return
- **Feature adoption**: Which features are most used

## Analytics Service API

### Basic Usage

```javascript
import AnalyticsService from './services/AnalyticsService';

// Track custom event
AnalyticsService.trackEvent('Category', 'Action', 'Label', value);

// Track page view
AnalyticsService.trackPageView('Dashboard');

// Track feature usage
AnalyticsService.trackFeatureUsage('Editor', 'file_opened', 'App.jsx');

// Track error
AnalyticsService.trackError('FileSystem', 'Access denied', 'readFile');

// Track performance
AnalyticsService.trackPerformance('api_call', 1250, 'claude_request');
```

### Available Methods

#### `init()`
Initializes Google Analytics with the measurement ID from environment variables.

#### `trackPageView(pageName)`
Tracks page/view changes.

#### `trackSession(userId, userName)`
Tracks user session start with user information.

#### `trackAIRequest(action, metadata)`
Tracks AI interaction events.
- `action`: 'message_sent', 'message_received', etc.
- `metadata`: Object with additional data

#### `trackFileOperation(operation, fileType, fileName)`
Tracks file-related operations.
- `operation`: 'create', 'open', 'save', 'delete'
- `fileType`: File extension (js, jsx, css, etc.)
- `fileName`: Name of the file

#### `trackCommand(command, success, executionTime)`
Tracks terminal command execution.
- `command`: Full command string
- `success`: Boolean indicating success/failure
- `executionTime`: Time in milliseconds

#### `trackError(errorType, errorMessage, errorContext)`
Tracks errors and exceptions.
- `errorType`: Category of error
- `errorMessage`: Error message text
- `errorContext`: Where the error occurred

#### `trackFeatureUsage(featureName, action, value)`
Tracks feature usage metrics.
- `featureName`: Name of feature (Sidebar, Editor, Terminal)
- `action`: Action performed
- `value`: Optional numeric value

#### `trackPerformance(metric, value, context)`
Tracks performance metrics.
- `metric`: Name of metric (response_time, load_time)
- `value`: Time in milliseconds
- `context`: Additional context

#### `trackEngagement(action, duration, detail)`
Tracks user engagement metrics.
- `action`: Type of engagement
- `duration`: Duration in milliseconds
- `detail`: Additional details

## Privacy & Compliance

### Data Collection
- **Anonymous**: User IDs are Firebase UIDs (not personally identifiable)
- **IP Anonymization**: Enabled by default
- **No PII**: Personal information is never tracked
- **Opt-out**: Users can disable analytics in settings (future feature)

### GDPR Compliance
- Users in EU are protected by IP anonymization
- No personal data is collected
- Users can request data deletion via Firebase

### Data Retention
- Google Analytics default retention: 14 months
- Can be configured in GA admin panel

## Viewing Analytics

### Google Analytics Dashboard

1. Go to [analytics.google.com](https://analytics.google.com)
2. Select your property: **ExternAI Desktop**
3. View real-time data: **Reports → Realtime**
4. View events: **Reports → Events**
5. View user behavior: **Reports → User → User Explorer**

### Key Reports to Monitor

**Events Overview**
- See all tracked events
- Filter by event name
- View event parameters

**User Engagement**
- Active users over time
- Session duration
- Feature adoption rates

**Custom Dimensions**
- AI interaction patterns
- File type popularity
- Command usage frequency
- Error rates by category

**Performance Metrics**
- AI response times
- Command execution times
- File operation speeds

## Troubleshooting

### Analytics Not Working

**Check measurement ID:**
```bash
# Verify environment variable is set
echo $VITE_GA_MEASUREMENT_ID
```

**Check browser console:**
- Should see: `✅ Google Analytics initialized: G-XXXXXXXXXX`
- Check for gtag.js errors

**Check network tab:**
- Look for requests to `google-analytics.com`
- Verify events are being sent

### Events Not Appearing

1. **Wait 24-48 hours**: GA data can be delayed
2. **Use Realtime view**: See events immediately
3. **Check DebugView**: Enable debug mode in GA

### Ad Blockers

Some users may have ad blockers that prevent analytics. This is expected and respected.

## Future Enhancements

- [ ] User opt-out preference in settings
- [ ] Custom dashboards for key metrics
- [ ] A/B testing integration
- [ ] Funnel analysis for user onboarding
- [ ] Crash reporting integration
- [ ] Enhanced error tracking with stack traces
- [ ] User feedback tracking
- [ ] Feature flag integration

## Best Practices

1. **Track meaningful events**: Focus on user value, not vanity metrics
2. **Use consistent naming**: Follow the naming convention for events
3. **Add context**: Include relevant metadata with events
4. **Monitor regularly**: Review analytics weekly
5. **Respect privacy**: Never track sensitive user data
6. **Test thoroughly**: Verify events in DebugView before deploying

## Resources

- [Google Analytics Documentation](https://developers.google.com/analytics)
- [GA4 Event Reference](https://developers.google.com/analytics/devguides/collection/ga4/reference/events)
- [Privacy Best Practices](https://developers.google.com/analytics/devguides/collection/ga4/data-privacy)
