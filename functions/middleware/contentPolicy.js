/**
 * Content Policy Validator
 * Prevents Extern AI from being used to build competing IDE/AI coding platforms
 */

// Prohibited keywords and patterns
const PROHIBITED_PATTERNS = {
    // Direct IDE/Editor mentions
    ide_editors: [
        /\b(build|create|make|develop|clone)\s+(a|an|my|our|own)?\s*(code|text|source)?\s*(editor|ide)\b/gi,
        /\b(build|create|make)\s+(me|us)?\s+(a|an)?\s*(code|text)\s*editor\b/gi,
        /\b(vscode|visual\s*studio\s*code|vs\s*code)\b.*\b(clone|copy|replica|similar|alternative|like)\b/gi,
        /\b(build|create|make)\b.*\b(like|similar\s*to|replica\s*of|clone\s*of)\b.*\b(vscode|visual\s*studio|sublime|atom|webstorm|intellij)\b/gi,
        /\b(desktop|electron|web-based)\s*(code|text|source)\s*(editor|ide)\b/gi,
        /\bcode\s*editor\s*with\s*(syntax\s*highlighting|intellisense|autocomplete|file\s*explorer|terminal)\b/gi,
        /\b(web-based|online)\s*(ide|development\s*environment)\b/gi,
    ],

    // AI Coding Assistant platforms
    ai_coding_platforms: [
        /\b(build|create|make|develop)\b.*\b(ai|artificial\s*intelligence)\b.*\b(coding|programming|developer|code)\s*(assistant|helper|copilot|companion|tool|platform)\b/gi,
        /\b(ai|ml|machine\s*learning)\s*powered\s*(code|coding|programming|developer)\s*(assistant|helper|tool|platform|ide)\b/gi,
        /\b(github\s*copilot|cursor|tabnine|codewhisperer|replit\s*ai|cody)\b.*\b(clone|copy|alternative|similar|like)\b/gi,
        /\b(build|create|make)\b.*\b(ai|artificial\s*intelligence)\b.*\b(help|assist|helps)\b.*\b(write|generate|complete|writing)\s*(code|programs)\b/gi,
        /\bai\s*code\s*generation\s*(platform|tool|service|application)\b/gi,
        /\b(ai|artificial\s*intelligence)\s*(that|to)\s*(helps?|assists?)\s*(users?|people|developers?)\s*(write|generate|create)\s*code\b/gi,
    ],

    // Extern AI itself
    extern_ai: [
        /\b(build|create|make|clone|copy|fork)\b.*\b(extern\s*ai|externai)\b/gi,
        /\b(like|similar\s*to|replica\s*of|clone\s*of)\b.*\b(extern\s*ai|externai|this\s*app|this\s*application|this\s*platform)\b/gi,
        /\b(competing|competitor|alternative)\s*(to|for)\s*(extern\s*ai|externai|this\s*app)\b/gi,
    ],

    // IDE Components/Features
    ide_features: [
        /\b(build|create|make)\b.*\b(file\s*explorer|file\s*tree|file\s*browser)\b.*\b(with|that\s*can)\b.*\b(edit|open|manage)\s*(code|files)\b/gi,
        /\b(build|create|make)\b.*\b(integrated\s*terminal|terminal\s*emulator)\b.*\b(in|within|inside|for)\b.*\b(editor|ide|an\s*ide)\b/gi,
        /\b(build|create|make)\b.*\b(an?\s*)?(integrated\s*terminal)\s*(for|in)\b/gi,
        /\b(build|create|make)\b.*\b(syntax\s*highlighter|code\s*formatter|linter)\b.*\b(editor|ide)\b/gi,
        /\b(build|create|make)\b.*\b(code\s*completion|intellisense|autocomplete)\s*(engine|system|feature)\b/gi,
        /\b(multi-file|multi-tab)\s*(editor|ide)\s*project\b/gi,
        /\b(tool|app|platform)\s*to\s*edit\s*code\b/gi,
        /\b(tool|app|platform)\s*to\s*edit\s*code\s*with\s*(ai|artificial\s*intelligence)\b/gi,
    ],

    // Development Environment
    dev_environment: [
        /\b(build|create|make)\b.*\b(online|web-based|cloud)\s*(coding|programming|development)\s*(environment|platform|ide)\b/gi,
        /\b(build|create|make)\b.*\b(code|program)\s*execution\s*(environment|platform|sandbox)\b/gi,
        /\b(build|create|make)\b.*\b(collaborative|shared)\s*(coding|programming)\s*(platform|editor|ide)\b/gi,
        /\b(repl|read-eval-print-loop|interactive\s*coding)\s*(platform|environment|tool)\b/gi,
        /\b(build|create|make)\b.*\b(something|anything)\b.*\b(like|similar|similar\s*to)\b.*\b(replit|repl\.it)\b/gi,
    ],

    // Specific competitor mentions
    competitors: [
        /\b(sublime\s*text|atom\s*editor|brackets|notepad\+\+|emacs|vim|neovim)\b.*\b(clone|alternative|similar|like)\b/gi,
        /\b(jetbrains|pycharm|webstorm|phpstorm|rubymine|goland|clion)\b.*\b(clone|alternative|similar|like)\b/gi,
        /\b(replit|glitch|codesandbox|stackblitz|codepen)\b.*\b(clone|alternative|similar|like)\b/gi,
    ]
};

// Educational exemptions - allow learning about IDEs but not building them
const EDUCATIONAL_PATTERNS = [
    /\bhow\s*(does|do)\b.*\b(vscode|ide|editor)\b.*\bwork\b/gi,
    /\bwhat\s*is\b.*\b(vscode|ide|editor|syntax\s*highlighting)\b/gi,
    /\bexplain\b.*\b(vscode|ide|editor)\b/gi,
    /\blearn\s*about\b.*\b(vscode|ide|editor)\b/gi,
    /\btutorial\b.*\b(vscode|ide|editor)\b/gi,
];

/**
 * Check if text contains prohibited content
 * @param {string} text - User's message to validate
 * @returns {Object} - { isProhibited: boolean, reason: string, category: string }
 */
function validateContent(text) {
    if (!text || typeof text !== 'string') {
        return { isProhibited: false };
    }

    // Normalize text for better matching
    const normalizedText = text.toLowerCase().trim();

    // Check for educational exemptions first
    for (const pattern of EDUCATIONAL_PATTERNS) {
        if (pattern.test(text)) {
            return { isProhibited: false };
        }
    }

    // Check each category of prohibited patterns
    for (const [category, patterns] of Object.entries(PROHIBITED_PATTERNS)) {
        for (const pattern of patterns) {
            // Reset regex lastIndex for global patterns
            pattern.lastIndex = 0;

            if (pattern.test(text)) {
                return {
                    isProhibited: true,
                    category,
                    reason: getCategoryMessage(category),
                    matchedPattern: pattern.source
                };
            }
        }
    }

    return { isProhibited: false };
}

/**
 * Get user-friendly message for prohibited category
 */
function getCategoryMessage(category) {
    const messages = {
        ide_editors: 'Extern AI cannot be used to build code editors or IDEs.',
        ai_coding_platforms: 'Extern AI cannot be used to build AI-powered coding assistant platforms.',
        extern_ai: 'Extern AI cannot be used to replicate or clone itself.',
        ide_features: 'Extern AI cannot be used to build IDE-specific features or components.',
        dev_environment: 'Extern AI cannot be used to build online coding or development environments.',
        competitors: 'Extern AI cannot be used to clone or replicate existing IDE platforms.'
    };

    return messages[category] || 'This type of project is not permitted on Extern AI.';
}

/**
 * Get detailed user-facing error message
 */
function getProhibitedContentMessage(category) {
    return {
        error: 'Prohibited Content Detected',
        message: `Extern AI is designed to help you build applications, but it cannot be used to create platforms that compete with code editors, IDEs, or AI coding assistants.`,
        reason: getCategoryMessage(category),
        whatYouCanDo: [
            'Build web applications, mobile apps, games, and tools',
            'Create business software, e-commerce platforms, dashboards',
            'Develop APIs, microservices, and backend systems',
            'Build creative projects, portfolios, and landing pages',
            'Learn programming concepts and experiment with code'
        ],
        prohibited: [
            'Code editors or IDEs (like VS Code, Sublime, Atom)',
            'AI coding assistants or copilot-style tools',
            'Online development environments (like Replit, CodeSandbox)',
            'Platforms that help users write or generate code',
            'Applications that replicate Extern AI or similar tools'
        ]
    };
}

/**
 * Validate conversation history for prohibited patterns
 * @param {Array} messages - Array of conversation messages
 * @returns {Object} - Validation result
 */
function validateConversationHistory(messages) {
    if (!messages || !Array.isArray(messages)) {
        return { isProhibited: false };
    }

    // Check the last few user messages (to catch context building)
    const recentUserMessages = messages
        .filter(m => m.role === 'user')
        .slice(-5) // Check last 5 user messages
        .map(m => m.content)
        .join(' '); // Join with space to create context

    // If the combined context is too short, return not prohibited
    if (recentUserMessages.length < 10) {
        return { isProhibited: false };
    }

    return validateContent(recentUserMessages);
}

module.exports = {
    validateContent,
    validateConversationHistory,
    getProhibitedContentMessage,
    PROHIBITED_PATTERNS
};
