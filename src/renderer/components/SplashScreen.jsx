import React, { useState, useEffect } from 'react';
import './SplashScreen.css';

const SplashScreen = ({ onLoadComplete }) => {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Initializing...');
  const [fadeOut, setFadeOut] = useState(false);

  const loadingSteps = [
    { progress: 15, text: 'Loading core modules...' },
    { progress: 30, text: 'Initializing AI engine...' },
    { progress: 45, text: 'Setting up workspace...' },
    { progress: 60, text: 'Connecting to services...' },
    { progress: 75, text: 'Loading editor components...' },
    { progress: 90, text: 'Finalizing setup...' },
    { progress: 100, text: 'Ready!' },
  ];

  useEffect(() => {
    let stepIndex = 0;
    const interval = setInterval(() => {
      if (stepIndex < loadingSteps.length) {
        setProgress(loadingSteps[stepIndex].progress);
        setStatusText(loadingSteps[stepIndex].text);
        stepIndex++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setFadeOut(true);
          setTimeout(() => {
            onLoadComplete?.();
          }, 500);
        }, 300);
      }
    }, 400);

    return () => clearInterval(interval);
  }, [onLoadComplete]);

  return (
    <div className={`splash-screen ${fadeOut ? 'fade-out' : ''}`}>
      {/* Animated background */}
      <div className="splash-bg">
        <div className="splash-gradient"></div>
        <div className="splash-particles">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="particle"
              style={{
                '--delay': `${Math.random() * 5}s`,
                '--duration': `${3 + Math.random() * 4}s`,
                '--x': `${Math.random() * 100}%`,
                '--y': `${Math.random() * 100}%`,
                '--size': `${2 + Math.random() * 4}px`,
              }}
            />
          ))}
        </div>
        <div className="splash-grid"></div>
      </div>

      {/* Main content */}
      <div className="splash-content">
        {/* Logo */}
        <div className="splash-logo-container">
          <div className="splash-logo">
            <div className="logo-icon">
              <svg viewBox="0 0 100 100" className="logo-svg">
                {/* Outer ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="url(#logoGradient)"
                  strokeWidth="2"
                  className="logo-ring"
                />
                {/* Inner geometric shape */}
                <path
                  d="M50 15 L75 35 L75 65 L50 85 L25 65 L25 35 Z"
                  fill="none"
                  stroke="url(#logoGradient)"
                  strokeWidth="2"
                  className="logo-hexagon"
                />
                {/* AI neural network nodes */}
                <circle cx="50" cy="30" r="4" fill="#00d9ff" className="node node-1" />
                <circle cx="70" cy="45" r="4" fill="#7c3aed" className="node node-2" />
                <circle cx="70" cy="65" r="4" fill="#00d9ff" className="node node-3" />
                <circle cx="50" cy="75" r="4" fill="#7c3aed" className="node node-4" />
                <circle cx="30" cy="65" r="4" fill="#00d9ff" className="node node-5" />
                <circle cx="30" cy="45" r="4" fill="#7c3aed" className="node node-6" />
                <circle cx="50" cy="52" r="6" fill="url(#logoGradient)" className="node node-center" />
                {/* Connection lines */}
                <line x1="50" y1="30" x2="50" y2="52" stroke="#00d9ff" strokeWidth="1" opacity="0.5" className="connection" />
                <line x1="70" y1="45" x2="50" y2="52" stroke="#7c3aed" strokeWidth="1" opacity="0.5" className="connection" />
                <line x1="70" y1="65" x2="50" y2="52" stroke="#00d9ff" strokeWidth="1" opacity="0.5" className="connection" />
                <line x1="50" y1="75" x2="50" y2="52" stroke="#7c3aed" strokeWidth="1" opacity="0.5" className="connection" />
                <line x1="30" y1="65" x2="50" y2="52" stroke="#00d9ff" strokeWidth="1" opacity="0.5" className="connection" />
                <line x1="30" y1="45" x2="50" y2="52" stroke="#7c3aed" strokeWidth="1" opacity="0.5" className="connection" />
                {/* Gradient definition */}
                <defs>
                  <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00d9ff" />
                    <stop offset="50%" stopColor="#7c3aed" />
                    <stop offset="100%" stopColor="#00d9ff" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="logo-glow"></div>
          </div>
          
          <h1 className="splash-title">
            <span className="title-extern">extern</span>
            <span className="title-ai">AI</span>
          </h1>
          <p className="splash-tagline">Your AI-Powered Development Environment</p>
        </div>

        {/* Progress section */}
        <div className="splash-progress-section">
          <div className="progress-bar-container">
            <div className="progress-bar-bg">
              <div 
                className="progress-bar-fill"
                style={{ width: `${progress}%` }}
              >
                <div className="progress-bar-glow"></div>
              </div>
            </div>
            <div className="progress-percentage">{progress}%</div>
          </div>
          <p className="progress-status">{statusText}</p>
        </div>

        {/* Bottom info */}
        <div className="splash-footer">
          <div className="splash-version">v1.0.16</div>
          <div className="splash-dots">
            <span className="dot"></span>
            <span className="dot"></span>
            <span className="dot"></span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
