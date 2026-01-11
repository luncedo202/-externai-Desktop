/**
 * ProjectStateService.js
 * 
 * Layer 2: Project State Management
 * 
 * Stores structured project information OUTSIDE the conversation:
 * - Project goal
 * - Architecture decisions
 * - Tech stack
 * - Constraints
 * - Key decisions
 * 
 * This data persists across sessions and is injected into prompts
 * without counting against conversation token limits.
 */

const PROJECT_STATE_KEY = 'externai_project_state';

class ProjectStateService {
  constructor() {
    this.state = this.load();
  }

  /**
   * Get the default/empty project state structure
   */
  getDefaultState() {
    return {
      project_goal: '',
      architecture: '',
      tech_stack: [],
      decisions: [],
      constraints: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  /**
   * Load project state from localStorage
   */
  load() {
    try {
      const stored = localStorage.getItem(PROJECT_STATE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('[ProjectState] Loaded existing state:', parsed);
        return parsed;
      }
    } catch (error) {
      console.error('[ProjectState] Failed to load state:', error);
    }
    
    const defaultState = this.getDefaultState();
    console.log('[ProjectState] Using default state');
    return defaultState;
  }

  /**
   * Save project state to localStorage
   */
  save(state) {
    try {
      state.updated_at = new Date().toISOString();
      localStorage.setItem(PROJECT_STATE_KEY, JSON.stringify(state));
      this.state = state;
      console.log('[ProjectState] Saved state:', state);
      return true;
    } catch (error) {
      console.error('[ProjectState] Failed to save state:', error);
      return false;
    }
  }

  /**
   * Get current project state
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Update project goal
   */
  setProjectGoal(goal) {
    this.state.project_goal = goal;
    this.save(this.state);
  }

  /**
   * Update architecture description
   */
  setArchitecture(architecture) {
    this.state.architecture = architecture;
    this.save(this.state);
  }

  /**
   * Set the entire tech stack
   */
  setTechStack(techStack) {
    this.state.tech_stack = Array.isArray(techStack) ? techStack : [techStack];
    this.save(this.state);
  }

  /**
   * Add a technology to the stack
   */
  addTechnology(tech) {
    if (!this.state.tech_stack.includes(tech)) {
      this.state.tech_stack.push(tech);
      this.save(this.state);
    }
  }

  /**
   * Add a decision (automatically timestamped)
   */
  addDecision(decision) {
    const decisionEntry = {
      text: decision,
      timestamp: new Date().toISOString()
    };
    this.state.decisions.push(decisionEntry);
    this.save(this.state);
  }

  /**
   * Add a constraint
   */
  addConstraint(constraint) {
    if (!this.state.constraints.includes(constraint)) {
      this.state.constraints.push(constraint);
      this.save(this.state);
    }
  }

  /**
   * Extract project state from initial conversation messages
   * Uses AI to parse the first few messages for project setup
   */
  extractFromMessages(messages) {
    if (!messages || messages.length === 0) return;

    // Look at first 3 user messages
    const initialMessages = messages
      .filter(m => m.role === 'user')
      .slice(0, 3);

    for (const msg of initialMessages) {
      const content = msg.content.toLowerCase();
      
      // Extract goal (first user message is often the goal)
      if (!this.state.project_goal && messages.indexOf(msg) === 0) {
        this.state.project_goal = msg.content.substring(0, 500); // First 500 chars
      }

      // Detect tech stack mentions
      const techKeywords = {
        'react': 'React',
        'vue': 'Vue',
        'angular': 'Angular',
        'electron': 'Electron',
        'node': 'Node.js',
        'express': 'Express',
        'typescript': 'TypeScript',
        'javascript': 'JavaScript',
        'python': 'Python',
        'tailwind': 'Tailwind CSS',
        'firebase': 'Firebase',
        'mongodb': 'MongoDB',
        'postgresql': 'PostgreSQL',
        'mysql': 'MySQL',
        'redis': 'Redis',
        'docker': 'Docker',
        'kubernetes': 'Kubernetes',
        'aws': 'AWS',
        'vercel': 'Vercel',
        'netlify': 'Netlify'
      };

      for (const [keyword, tech] of Object.entries(techKeywords)) {
        if (content.includes(keyword) && !this.state.tech_stack.includes(tech)) {
          this.state.tech_stack.push(tech);
        }
      }

      // Detect architecture mentions
      const archPatterns = [
        'desktop app', 'web app', 'mobile app',
        'fullstack', 'frontend', 'backend',
        'microservices', 'monolith', 'serverless',
        'spa', 'ssr', 'static site'
      ];

      for (const pattern of archPatterns) {
        if (content.includes(pattern) && !this.state.architecture) {
          // Extract sentence containing the pattern
          const sentences = msg.content.split(/[.!?]/);
          const matchingSentence = sentences.find(s => 
            s.toLowerCase().includes(pattern)
          );
          if (matchingSentence) {
            this.state.architecture = matchingSentence.trim();
            break;
          }
        }
      }
    }

    this.save(this.state);
  }

  /**
   * Generate a formatted string to inject into system prompt
   */
  toSystemPrompt() {
    const state = this.state;
    
    // If state is empty, return nothing
    if (!state.project_goal && 
        state.tech_stack.length === 0 && 
        state.decisions.length === 0 &&
        state.constraints.length === 0) {
      return '';
    }

    let prompt = '\n\n## PROJECT CONTEXT\n\n';

    if (state.project_goal) {
      prompt += `**Project Goal:**\n${state.project_goal}\n\n`;
    }

    if (state.architecture) {
      prompt += `**Architecture:**\n${state.architecture}\n\n`;
    }

    if (state.tech_stack.length > 0) {
      prompt += `**Tech Stack:**\n${state.tech_stack.map(t => `- ${t}`).join('\n')}\n\n`;
    }

    if (state.decisions.length > 0) {
      prompt += `**Key Decisions:**\n`;
      state.decisions.forEach(d => {
        const text = typeof d === 'string' ? d : d.text;
        prompt += `- ${text}\n`;
      });
      prompt += '\n';
    }

    if (state.constraints.length > 0) {
      prompt += `**Constraints:**\n${state.constraints.map(c => `- ${c}`).join('\n')}\n\n`;
    }

    return prompt;
  }

  /**
   * Reset project state (for new projects)
   */
  reset() {
    this.state = this.getDefaultState();
    this.save(this.state);
    console.log('[ProjectState] Reset to default state');
  }

  /**
   * Check if project state is initialized
   */
  isInitialized() {
    return !!(this.state.project_goal || 
              this.state.tech_stack.length > 0 ||
              this.state.decisions.length > 0);
  }
}

// Export singleton instance
export default new ProjectStateService();
