// AnalyticsService.js
// Google Analytics 4 integration for ExternAI

class AnalyticsService {
  constructor() {
    this.initialized = false;
    this.measurementId = null;
    this.pendingEvents = []; // Queue events that arrive before GA loads
  }

  // Initialize Google Analytics
  init() {
    if (this.initialized) return;

    const id = typeof import.meta !== 'undefined'
      ? import.meta.env?.VITE_GA_MEASUREMENT_ID
      : null;

    if (!id) {
      console.warn('[Analytics] VITE_GA_MEASUREMENT_ID is not set — tracking disabled.');
      return;
    }

    this.measurementId = id;

    // Set up dataLayer BEFORE the script loads
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', id, {
      send_page_view: false, // We'll send manually
      anonymize_ip: true,
    });

    // Dynamically inject the gtag.js script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    script.onload = () => {
      this.initialized = true;
      console.log('[Analytics] Google Analytics ready:', id);
      // Flush any events that were queued before GA loaded
      this.pendingEvents.forEach(fn => fn());
      this.pendingEvents = [];
    };
    script.onerror = () => {
      console.warn('[Analytics] Failed to load gtag.js — possibly blocked by CSP or adblocker.');
    };
    document.head.appendChild(script);
  }

  // Internal: run a tracking call, or queue it if gtag isn't ready yet
  _track(fn) {
    if (this.initialized && window.gtag) {
      fn();
    } else if (this.measurementId) {
      // GA script is still loading — queue the event
      this.pendingEvents.push(fn);
    }
    // If measurementId is not set, silently skip
  }

  // ── Public tracking methods ────────────────────────────────────────────────

  trackPageView(pageName) {
    this._track(() => {
      window.gtag('event', 'page_view', {
        page_title: pageName,
        page_location: window.location.href,
      });
    });
  }

  trackSession(userId, userName) {
    this._track(() => {
      window.gtag('config', this.measurementId, {
        user_id: userId,
        user_properties: { user_name: userName },
      });
      this._fireEvent('session', 'start', userId);
    });
  }

  trackAIRequest(action, metadata = {}) {
    this._track(() => {
      window.gtag('event', 'ai_interaction', {
        event_category: 'AI',
        event_label: action,
        ...metadata,
      });
    });
  }

  trackFileOperation(operation, fileType, fileName) {
    this._track(() => {
      window.gtag('event', 'file_operation', {
        event_category: 'File',
        event_label: operation,
        file_type: fileType,
        file_name: fileName,
      });
    });
  }

  trackCommand(command, success, executionTime) {
    this._track(() => {
      window.gtag('event', 'command_execution', {
        event_category: 'Terminal',
        event_label: command.split(' ')[0],
        value: executionTime,
        success: success,
      });
    });
  }

  trackError(errorType, errorMessage, errorContext) {
    this._track(() => {
      window.gtag('event', 'exception', {
        description: `${errorType}: ${errorMessage}`,
        fatal: false,
        context: errorContext,
      });
    });
  }

  trackFeatureUsage(featureName, action, value) {
    this._track(() => {
      window.gtag('event', 'feature_usage', {
        event_category: 'Feature',
        event_label: featureName,
        event_action: action,
        value: value,
      });
    });
  }

  trackPerformance(metric, value, context) {
    this._track(() => {
      window.gtag('event', 'performance', {
        event_category: 'Performance',
        event_label: metric,
        value: Math.round(value),
        context: context,
      });
    });
  }

  trackEngagement(action, duration, detail) {
    this._track(() => {
      window.gtag('event', 'engagement', {
        event_category: 'User Engagement',
        event_label: action,
        value: duration,
        detail: detail,
      });
    });
  }

  trackSubscription(event, tier, promptsRemaining) {
    this._track(() => {
      window.gtag('event', 'subscription', {
        event_category: 'Subscription',
        event_label: event,
        subscription_tier: tier,
        prompts_remaining: promptsRemaining,
      });
    });
  }

  trackPublish(projectName, success) {
    this._track(() => {
      window.gtag('event', 'publish', {
        event_category: 'Publish',
        event_label: success ? 'success' : 'failure',
        project_name: projectName,
      });
    });
  }

  trackEvent(category, action, label, value) {
    this._track(() => this._fireEvent(category, action, label, value));
  }

  trackTiming(category, variable, value, label) {
    this._track(() => {
      window.gtag('event', 'timing_complete', {
        name: variable,
        value: value,
        event_category: category,
        event_label: label,
      });
    });
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  _fireEvent(category, action, label, value) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
}

// Export singleton instance
export default new AnalyticsService();
