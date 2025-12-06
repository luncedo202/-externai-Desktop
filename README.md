# Eletr0 Studio

A powerful, AI-powered development environment built with Electron, featuring VS Code capabilities for building websites, mobile apps, and games.

## Features

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

### 🚀 Project Templates
- **Website Projects** - HTML, CSS, JavaScript, React
- **Mobile Apps** - React Native templates
- **Games** - HTML5 Canvas, Phaser game templates

## Installation

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Package the app
npm run dist
```

## Development

```bash
# Start the renderer process (React app)
npm run dev:renderer

# Start Electron
npm run dev:electron

# Both together
npm run dev
```

## Project Structure

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

### View
- `Cmd/Ctrl + B` - Toggle Sidebar
- `Cmd/Ctrl + \`` - Toggle Terminal
- `Cmd/Ctrl + Shift + \`` - New Terminal

### Editor
- `Cmd/Ctrl + /` - Toggle Comment
- `Cmd/Ctrl + F` - Find
- `Cmd/Ctrl + H` - Replace

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
