# Eletr0 Studio

A powerful, AI-powered development environment built with Electron, featuring VS Code capabilities for building websites, mobile apps, and games. Includes Firebase-based user authentication and usage tracking.

## Features

### 🔐 User Authentication
- **Firebase Authentication** - Secure email/password authentication
- **Usage tracking** - Monitor API usage per user (requests/tokens per day)
- **Session management** - Persistent login with secure token handling
- **Rate limiting** - Configurable daily limits per user

### 🎨 Full IDE Capabilities
- **Monaco Editor** - The same powerful code editor from VS Code
- **Multi-tab editing** - Work on multiple files simultaneously
- **Syntax highlighting** - Support for 50+ programming languages
- **IntelliSense** - Smart code completion and suggestions

### 🖥️ Integrated Terminal
- **Multiple terminals** - Run several terminal sessions
- **Full shell integration** - Bash, PowerShell, and more
- **Terminal splitting** - Work efficiently with split terminals

### 📊 Bottom Panel Features
- **Output Panel** - View build logs, task output, and command results
  - Multi-channel support with filtering
  - Real-time log streaming
  - Color-coded messages (info, warning, error, success)
  - Auto-scroll and clear functionality
- **Problems Panel** - See errors and warnings in real-time
  - Automatic code analysis
  - Filter by severity (errors, warnings, info)
  - Group by file
  - Click to navigate to problem location
- **Debug Console** - Interactive expression evaluation
  - Run JavaScript expressions
  - Inspect variables and objects
  - Command history (↑/↓ arrows)
  - Access to Node.js APIs

### 📁 File Management
- **File explorer** - Navigate your project structure
- **File operations** - Create, delete, rename files and folders
- **Workspace support** - Open and manage entire project folders
- **File watching** - Automatic detection of file changes

### 🤖 AI Assistant
- **Code generation** - Generate code from natural language
- **Bug fixing** - AI-powered debugging assistance
- **Code explanations** - Understand complex code
- **Project scaffolding** - Create complete project templates
- **Secure API proxy** - Backend authentication for Claude API access

### 🚀 Project Templates
- **Website Projects** - HTML, CSS, JavaScript, React
- **Mobile Apps** - React Native templates
- **Games** - HTML5 Canvas, Phaser game templates
## Installation

### Prerequisites
- Node.js 18 or higher
- Firebase account (for authentication)

### Quick Start

```bash
# Install dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..

## Development

```bash
# Terminal 1 - Start backend server
cd backend
npm run dev

# Terminal 2 - Start Electron app
npm run dev
```

The backend server runs on `http://localhost:3001` by default and proxies Claude API requests with Firebase authentication. run dist
```

### Firebase Setup
```
eletr0/
├── backend/               # Express backend server
│   ├── middleware/        # Auth middleware
│   ├── routes/           # API routes (Claude proxy)
│   ├── server.js         # Backend entry point
│   └── .env.example      # Backend config template
├── src/
│   ├── main/             # Electron main process
│   │   ├── main.js       # Main entry point
│   │   └── preload.js    # Preload script for IPC
│   └── renderer/         # React renderer process
│       ├── components/   # React components
│       │   ├── ActivityBar.jsx
│       │   ├── Sidebar.jsx
│       │   ├── EditorArea.jsx
│       │   ├── Panel.jsx
│       │   ├── StatusBar.jsx
│       │   ├── AIAssistant.jsx
│       │   ├── AuthScreen.jsx  # Login/signup UI
│       │   └── sidebar/
│       │       ├── Explorer.jsx
│       │       ├── Search.jsx
│       │       └── SourceControl.jsx
│       ├── services/     # Service layer
│       │   ├── FirebaseService.js  # Firebase auth wrapper
│       │   └── ClaudeService.js    # API client
│       ├── App.jsx       # Main app component
│       ├── main.jsx      # React entry point
│       └── index.css     # Global styles
├── .env.example          # Client config template
├── FIREBASE_SETUP.md     # Firebase setup guide
├── index.html           # HTML template
├── package.json
└── vite.config.js       # Vite configuration
```Project Structure

```
eletr0/
├── src/
│   ├── main/              # Electron main process
│   │   ├── main.js        # Main entry point
│   │   └── preload.js     # Preload script for IPC
│   └── renderer/          # React renderer process
│       ├── components/    # React components
│       │   ├── ActivityBar.jsx
│       │   ├── Sidebar.jsx
│       │   ├── EditorArea.jsx
│       │   ├── Panel.jsx
│       │   ├── StatusBar.jsx
│       │   ├── AIAssistant.jsx
│       │   └── sidebar/
│       │       ├── Explorer.jsx
│       │       ├── Search.jsx
│       │       └── SourceControl.jsx
│       ├── App.jsx         # Main app component
│       ├── main.jsx        # React entry point
│       └── index.css       # Global styles
├── index.html             # HTML template
├── package.json
└── vite.config.js         # Vite configuration
```

## Keyboard Shortcuts

### File Operations
- `Cmd/Ctrl + N` - New File
- `Cmd/Ctrl + O` - Open File
- `Cmd/Ctrl + Shift + O` - Open Folder
- `Cmd/Ctrl + S` - Save
- `Cmd/Ctrl + Shift + S` - Save As
## Technologies Used

- **Electron** - Cross-platform desktop app framework
- **React** - UI library
- **Monaco Editor** - Code editor
- **XTerm.js** - Terminal emulator
- **Vite** - Build tool
- **Node-pty** - Terminal process management
- **Firebase** - Authentication and Firestore database
- **Express** - Backend API server
- **Axios** - HTTP client for Claude API

## Backend Architecture

The backend provides:
- **Firebase token verification** - Validates user authentication
- **Claude API proxy** - Securely proxies AI requests
- **Usage tracking** - Monitors per-user daily limits in Firestore
- **Rate limiting** - Prevents abuse with configurable limits

Environment variables in `backend/.env`:
```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=service-account@project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
ANTHROPIC_API_KEY=sk-ant-xxxxx
MAX_REQUESTS_PER_DAY=100
MAX_TOKENS_PER_DAY=100000
```

## Features in Development

## Technologies Used

- **Electron** - Cross-platform desktop app framework
- **React** - UI library
- **Monaco Editor** - Code editor
- **XTerm.js** - Terminal emulator
- **Vite** - Build tool
- **Node-pty** - Terminal process management

## Features in Development

- [ ] Git integration
- [ ] Debug console
- [ ] Extension marketplace
- [ ] Theme customization
- [ ] Live preview for web projects
- [ ] Mobile app preview
- [ ] Game preview canvas

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Author

Sonelise Pakade

---

Built with ❤️ using Electron and React
