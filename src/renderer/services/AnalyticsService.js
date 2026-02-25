// AnalyticsService.js
// Google Analytics 4 integration for ExternAI
// Fully compliant with GA4 User Engagement, Retention, Session, and First Visit tracking

class AnalyticsService {
  constructor() {
    this.initialized = false;
    this.measurementId = null;
    this.pendingEvents = [];       // Queue events before GA loads
    this.sessionId = null;
    this.sessionStartTime = null;
    this.engagementStartTime = null;
    this.totalEngagementMs = 0;
    this._engagementInterval = null;
  }

  // ── Initialisation ──────────────────────────────────────────────────────────

  init() {
    if (this.initialized || this.measurementId) return; // prevent double init

    const id = typeof import.meta !== 'undefined'
      ? import.meta.env?.VITE_GA_MEASUREMENT_ID
      : null;

    if (!id) {
      console.warn('[Analytics] VITE_GA_MEASUREMENT_ID is not set — tracking disabled.');
      return;
    }

    this.measurementId = id;
    this.sessionId = this._generateSessionId();
    this.sessionStartTime = Date.now();

    // Persistent client_id — REQUIRED for User Retention in GA4
    // GA4 uses client_id to recognise returning users
    const clientId = this._getOrCreateClientId();

    // Set up dataLayer BEFORE the script tag loads
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', id, {
      send_page_view: false,      // We send manually with engagement_time_msec
      anonymize_ip: true,
      client_id: clientId,        // Enables User Retention reports
      session_id: this.sessionId, // Enables Session reports
    });

    // Inject gtag.js script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    script.onload = () => {
      this.initialized = true;
      console.log('[Analytics] Google Analytics ready:', id);
      // Flush queued events
      this.pendingEvents.forEach(fn => fn());
      this.pendingEvents = [];
      // Fire first-visit + session_start after GA is ready
      this._fireFirstVisitIfNew();
      this._fireSessionStart();
    };
    script.onerror = () => {
      console.warn('[Analytics] Failed to load gtag.js — possibly blocked by CSP or adblocker.');
    };
    document.head.appendChild(script);

    // Track active engagement time (for User Engagement metric)
    this._startEngagementTracking();
  }

  // ── Core internal helpers ───────────────────────────────────────────────────

  // Runs a GA event immediately if ready, otherwise queues it
  _track(fn) {
    if (this.initialized && window.gtag) {
      fn();
    } else if (this.measurementId) {
      this.pendingEvents.push(fn);
    }
  }

  // Send a GA4 event with engagement_time_msec always attached
  // engagement_time_msec is REQUIRED for User Engagement metric in GA4
  _fireEvent(eventName, params = {}) {
    window.gtag('event', eventName, {
      ...params,
      session_id: this.sessionId,
      engagement_time_msec: this._getEngagementTime(),
    });
  }

  // ── Session & Retention helpers ─────────────────────────────────────────────

  // GA4 uses client_id (stored in localStorage) to track returning users → User Retention
  _getOrCreateClientId() {
    const key = 'ga_client_id';
    let clientId = localStorage.getItem(key);
    if (!clientId) {
      clientId = `${Date.now()}.${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(key, clientId);
    }
    return clientId;
  }

  // GA4 session_id must be unique per session (not persisted across closes)
  _generateSessionId() {
    return Date.now().toString();
  }

  // GA4 requires `first_visit` event on the very first open to populate
  // the "New users" metric — needed for User Retention reports
  _fireFirstVisitIfNew() {
    const key = 'ga_first_visit_sent';
    if (!localStorage.getItem(key)) {
      this._fireEvent('first_visit', { event_category: 'User' });
      localStorage.setItem(key, '1');
      console.log('[Analytics] First visit tracked.');
    }
  }

  // GA4 `session_start` event — populates Sessions report
  _fireSessionStart() {
    this._fireEvent('session_start', {
      event_category: 'Session',
      session_id: this.sessionId,
    });
  }

  // ── Engagement time tracking ────────────────────────────────────────────────
  // GA4 "User Engagement" is measured via engagement_time_msec on events.
  // We track accumulated active (focused) time and send it with every event.

  _startEngagementTracking() {
    this.engagementStartTime = document.hasFocus() ? Date.now() : null;

    window.addEventListener('focus', () => {
      this.engagementStartTime = Date.now();
    });

    window.addEventListener('blur', () => {
      if (this.engagementStartTime) {
        this.totalEngagementMs += Date.now() - this.engagementStartTime;
        this.engagementStartTime = null;
      }
    });

    // Every 30s, flush engagement time to GA4 via user_engagement event
    // This keeps GA4's User Engagement metric fresh even on long sessions
    this._engagementInterval = setInterval(() => {
      const ms = this._getEngagementTime();
      if (ms > 0 && this.initialized) {
        this._fireEvent('user_engagement', { engagement_time_msec: ms });
      }
    }, 30000);

    // Send final engagement on app close
    window.addEventListener('beforeunload', () => {
      const ms = this._getEngagementTime();
      if (ms > 0 && this.initialized && window.gtag) {
        // Use sendBeacon-style — navigator.sendBeacon keeps request alive on unload
        window.gtag('event', 'user_engagement', {
          engagement_time_msec: ms,
          session_id: this.sessionId,
        });
      }
    });
  }

  // Returns total active engagement time in milliseconds
  _getEngagementTime() {
    const currentSessionMs = this.engagementStartTime
      ? Date.now() - this.engagementStartTime
      : 0;
    return this.totalEngagementMs + currentSessionMs;
  }

  // ── Public tracking methods ─────────────────────────────────────────────────

  // Page views — needed for Engagement Rate in GA4
  trackPageView(pageName) {
    this._track(() => {
      this._fireEvent('page_view', {
        page_title: pageName,
        page_location: window.location.href,
      });
    });
  }

  // Session + user identification — needed for User Retention
  trackSession(userId, userName) {
    this._track(() => {
      // Re-configure with user_id to link sessions to the same user across visits
      window.gtag('config', this.measurementId, {
        user_id: userId,
        client_id: this._getOrCreateClientId(),
        session_id: this.sessionId,
        user_properties: { user_name: userName },
      });
      this._fireEvent('login', {
        event_category: 'Auth',
        method: 'firebase',
      });
    });
  }

  trackAIRequest(action, metadata = {}) {
    this._track(() => {
      this._fireEvent('ai_interaction', {
        event_category: 'AI',
        event_label: action,
        ...metadata,
      });
    });
  }

  trackFileOperation(operation, fileType, fileName) {
    this._track(() => {
      this._fireEvent('file_operation', {
        event_category: 'File',
        event_label: operation,
        file_type: fileType,
        file_name: fileName,
      });
    });
  }

  trackCommand(command, success, executionTime) {
    this._track(() => {
      this._fireEvent('command_execution', {
        event_category: 'Terminal',
        event_label: command.split(' ')[0],
        value: executionTime,
        success: success,
      });
    });
  }

  trackError(errorType, errorMessage, errorContext) {
    this._track(() => {
      this._fireEvent('exception', {
        description: `${errorType}: ${errorMessage}`,
        fatal: false,
        context: errorContext,
      });
    });
  }

  trackFeatureUsage(featureName, action, value) {
    this._track(() => {
      this._fireEvent('feature_usage', {
        event_category: 'Feature',
        event_label: featureName,
        event_action: action,
        value: value,
      });
    });
  }

  trackPerformance(metric, value, context) {
    this._track(() => {
      this._fireEvent('performance', {
        event_category: 'Performance',
        event_label: metric,
        value: Math.round(value),
        context: context,
      });
    });
  }

  trackEngagement(action, duration, detail) {
    this._track(() => {
      this._fireEvent('engagement', {
        event_category: 'User Engagement',
        event_label: action,
        value: duration,
        detail: detail,
      });
    });
  }

  trackSubscription(event, tier, promptsRemaining) {
    this._track(() => {
      this._fireEvent('subscription', {
        event_category: 'Subscription',
        event_label: event,
        subscription_tier: tier,
        prompts_remaining: promptsRemaining,
      });
    });
  }

  trackPublish(projectName, success) {
    this._track(() => {
      this._fireEvent('publish', {
        event_category: 'Publish',
        event_label: success ? 'success' : 'failure',
        project_name: projectName,
      });
    });
  }

  trackEvent(category, action, label, value) {
    this._track(() => {
      this._fireEvent(action, {
        event_category: category,
        event_label: label,
        value: value,
      });
    });
  }

  trackTiming(category, variable, value, label) {
    this._track(() => {
      this._fireEvent('timing_complete', {
        name: variable,
        value: value,
        event_category: category,
        event_label: label,
      });
    });
  }
}

// Export singleton instance
export default new AnalyticsService();
