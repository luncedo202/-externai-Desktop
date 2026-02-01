// AnalyticsService.js
// Google Analytics integration for tracking user behavior and feature usage

class AnalyticsService {
  constructor() {
    this.initialized = false;
    this.measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  }

  // Initialize Google Analytics
  init() {
    if (this.initialized || !this.measurementId) {
      console.warn('Analytics not initialized: Missing GA_MEASUREMENT_ID');
      return;
    }

    // Load gtag.js script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${this.measurementId}`;
    document.head.appendChild(script);

    // Initialize dataLayer
    window.dataLayer = window.dataLayer || [];
    window.gtag = function() {
      window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', this.measurementId, {
      send_page_view: false, // We'll track manually
      anonymize_ip: true
    });

    this.initialized = true;
    console.log('[OK] Google Analytics initialized:', this.measurementId);
  }

  // Track page views
  trackPageView(pageName) {
    if (!this.initialized) return;
    
    window.gtag('event', 'page_view', {
      page_title: pageName,
      page_location: window.location.href
    });
  }

  // Track user sessions
  trackSession(userId, userName) {
    if (!this.initialized) return;
    
    window.gtag('config', this.measurementId, {
      user_id: userId,
      user_properties: {
        user_name: userName
      }
    });
    
    this.trackEvent('session', 'start', userId);
  }

  // Track AI requests
  trackAIRequest(action, metadata = {}) {
    if (!this.initialized) return;
    
    window.gtag('event', 'ai_interaction', {
      event_category: 'AI',
      event_label: action,
      ...metadata
    });
  }

  // Track file operations
  trackFileOperation(operation, fileType, fileName) {
    if (!this.initialized) return;
    
    window.gtag('event', 'file_operation', {
      event_category: 'File',
      event_label: operation,
      file_type: fileType,
      file_name: fileName
    });
  }

  // Track command execution
  trackCommand(command, success, executionTime) {
    if (!this.initialized) return;
    
    window.gtag('event', 'command_execution', {
      event_category: 'Terminal',
      event_label: command.split(' ')[0], // Just the command name
      value: executionTime,
      success: success
    });
  }

  // Track errors
  trackError(errorType, errorMessage, errorContext) {
    if (!this.initialized) return;
    
    window.gtag('event', 'exception', {
      description: `${errorType}: ${errorMessage}`,
      fatal: false,
      context: errorContext
    });
  }

  // Track feature usage
  trackFeatureUsage(featureName, action, value) {
    if (!this.initialized) return;
    
    window.gtag('event', 'feature_usage', {
      event_category: 'Feature',
      event_label: featureName,
      event_action: action,
      value: value
    });
  }

  // Track performance metrics
  trackPerformance(metric, value, context) {
    if (!this.initialized) return;
    
    window.gtag('event', 'performance', {
      event_category: 'Performance',
      event_label: metric,
      value: Math.round(value),
      context: context
    });
  }

  // Track user engagement
  trackEngagement(action, duration, detail) {
    if (!this.initialized) return;
    
    window.gtag('event', 'engagement', {
      event_category: 'User Engagement',
      event_label: action,
      value: duration,
      detail: detail
    });
  }

  // Track subscription events
  trackSubscription(event, tier, promptsRemaining) {
    if (!this.initialized) return;
    
    window.gtag('event', 'subscription', {
      event_category: 'Subscription',
      event_label: event, // 'limit_reached', 'upgrade_shown', 'prompt_used'
      subscription_tier: tier,
      prompts_remaining: promptsRemaining
    });
  }

  // Generic event tracking
  trackEvent(category, action, label, value) {
    if (!this.initialized) return;
    
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value
    });
  }

  // Track timing
  trackTiming(category, variable, value, label) {
    if (!this.initialized) return;
    
    window.gtag('event', 'timing_complete', {
      name: variable,
      value: value,
      event_category: category,
      event_label: label
    });
  }
}

// Export singleton instance
export default new AnalyticsService();
