/**
 * Content Policy Test Suite
 * Tests the content validation system
 */

const { validateContent, validateConversationHistory } = require('./backend/middleware/contentPolicy');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
};

let passCount = 0;
let failCount = 0;

function testCase(description, input, shouldBeBlocked) {
  const result = validateContent(input);
  const isBlocked = result.isProhibited;
  const passed = isBlocked === shouldBeBlocked;

  if (passed) {
    console.log(`${colors.green}✓${colors.reset} ${description}`);
    if (isBlocked) {
      console.log(`  ${colors.blue}→ Blocked: ${result.category} - ${result.reason}${colors.reset}`);
    }
    passCount++;
  } else {
    console.log(`${colors.red}✗${colors.reset} ${description}`);
    console.log(`  ${colors.red}→ Expected: ${shouldBeBlocked ? 'BLOCKED' : 'ALLOWED'}, Got: ${isBlocked ? 'BLOCKED' : 'ALLOWED'}${colors.reset}`);
    if (isBlocked) {
      console.log(`  ${colors.yellow}→ Reason: ${result.reason}${colors.reset}`);
    }
    failCount++;
  }
  console.log('');
}

console.log(`${colors.magenta}═══════════════════════════════════════════${colors.reset}`);
console.log(`${colors.magenta}  Content Policy Test Suite${colors.reset}`);
console.log(`${colors.magenta}═══════════════════════════════════════════${colors.reset}\n`);

console.log(`${colors.blue}[Category: IDE/Code Editors]${colors.reset}\n`);
testCase(
  'Direct code editor request',
  'Build me a code editor',
  true
);
testCase(
  'IDE creation request',
  'Create an IDE for JavaScript',
  true
);
testCase(
  'Text editor with features',
  'Make a text editor with syntax highlighting',
  true
);
testCase(
  'VS Code clone request',
  'Build a VS Code clone',
  true
);
testCase(
  'Desktop code editor',
  'Create a desktop code editor using Electron',
  true
);

console.log(`${colors.blue}[Category: AI Coding Assistants]${colors.reset}\n`);
testCase(
  'AI coding assistant request',
  'Build an AI coding assistant',
  true
);
testCase(
  'GitHub Copilot clone',
  'Create a GitHub Copilot alternative',
  true
);
testCase(
  'AI code generation platform',
  'Make an AI that helps users write code',
  true
);
testCase(
  'AI developer tool',
  'Build an AI-powered developer tool that generates code',
  true
);

console.log(`${colors.blue}[Category: Online Development Environments]${colors.reset}\n`);
testCase(
  'Replit clone request',
  'Build something like Replit',
  true
);
testCase(
  'CodeSandbox alternative',
  'Create an online coding environment similar to CodeSandbox',
  true
);
testCase(
  'Web-based IDE',
  'Make a web-based development environment',
  true
);
testCase(
  'Interactive coding platform',
  'Build an interactive coding platform',
  true
);

console.log(`${colors.blue}[Category: IDE Features]${colors.reset}\n`);
testCase(
  'File explorer for code',
  'Create a file explorer that can edit code files',
  true
);
testCase(
  'Integrated terminal',
  'Build an integrated terminal for an IDE',
  true
);
testCase(
  'Code completion engine',
  'Create a code completion system',
  true
);

console.log(`${colors.blue}[Category: Extern AI Clones]${colors.reset}\n`);
testCase(
  'Clone Extern AI',
  'Build a clone of Extern AI',
  true
);
testCase(
  'Replica of this app',
  'Create something like this application',
  true
);
testCase(
  'Competing platform',
  'Build a competing platform to Extern AI',
  true
);

console.log(`${colors.blue}[Category: Educational Exemptions - Should PASS]${colors.reset}\n`);
testCase(
  'How does VS Code work?',
  'How does VS Code work?',
  false
);
testCase(
  'What is syntax highlighting?',
  'What is syntax highlighting?',
  false
);
testCase(
  'Explain code editors',
  'Explain how code editors work',
  false
);
testCase(
  'Learn about IDEs',
  'I want to learn about IDEs',
  false
);

console.log(`${colors.blue}[Category: Legitimate Apps - Should PASS]${colors.reset}\n`);
testCase(
  'To-do list app',
  'Build me a to-do list web app',
  false
);
testCase(
  'E-commerce website',
  'Create an e-commerce website for my business',
  false
);
testCase(
  'Weather app',
  'Make a weather dashboard application',
  false
);
testCase(
  'Blog platform',
  'Build a blog platform with user authentication',
  false
);
testCase(
  'Game development',
  'Create a simple 2D game',
  false
);
testCase(
  'Portfolio website',
  'Build a portfolio website',
  false
);
testCase(
  'Chat application',
  'Make a real-time chat application',
  false
);
testCase(
  'API backend',
  'Create a REST API for my mobile app',
  false
);
testCase(
  'Dashboard',
  'Build an analytics dashboard',
  false
);
testCase(
  'Mobile app',
  'Create a React Native mobile app',
  false
);

console.log(`${colors.blue}[Category: Edge Cases]${colors.reset}\n`);
testCase(
  'Code viewer (not editor)',
  'Build a code viewer to display syntax-highlighted code snippets',
  false
);
testCase(
  'Documentation site',
  'Create a documentation website with code examples',
  false
);
testCase(
  'Tutorial platform',
  'Build a coding tutorial platform',
  false
);

console.log(`${colors.blue}[Testing Conversation History Validation]${colors.reset}\n`);
const conversationMessages = [
  { role: 'user', content: 'I want to build something' },
  { role: 'assistant', content: 'Great! What would you like to build?' },
  { role: 'user', content: 'Something to help developers' },
  { role: 'assistant', content: 'What specific features?' },
  { role: 'user', content: 'A tool to edit code with AI assistance' }
];

const historyResult = validateConversationHistory(conversationMessages);
const historyPassed = historyResult.isProhibited === true;

if (historyPassed) {
  console.log(`${colors.green}✓${colors.reset} Conversation history validation detects policy violation`);
  console.log(`  ${colors.blue}→ Blocked: ${historyResult.category} - ${historyResult.reason}${colors.reset}`);
  passCount++;
} else {
  console.log(`${colors.red}✗${colors.reset} Conversation history validation failed to detect violation`);
  failCount++;
}

console.log('');

// Summary
console.log(`${colors.magenta}═══════════════════════════════════════════${colors.reset}`);
console.log(`${colors.magenta}  Test Results${colors.reset}`);
console.log(`${colors.magenta}═══════════════════════════════════════════${colors.reset}\n`);
console.log(`${colors.green}Passed: ${passCount}${colors.reset}`);
console.log(`${colors.red}Failed: ${failCount}${colors.reset}`);
console.log(`Total: ${passCount + failCount}\n`);

if (failCount === 0) {
  console.log(`${colors.green}✓ All tests passed!${colors.reset}\n`);
  process.exit(0);
} else {
  console.log(`${colors.red}✗ Some tests failed.${colors.reset}\n`);
  process.exit(1);
}
