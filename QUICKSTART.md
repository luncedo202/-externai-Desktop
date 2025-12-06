# Quick Start Guide - Eletr0 Studio

## 🚀 Getting Started

Your Electron-based IDE is now ready to use! The app is currently running.

## 📁 What You Have

A fully functional VS Code-like IDE with:

### Core Features
- ✅ **Monaco Editor** - Full-featured code editor with syntax highlighting
- ✅ **File Explorer** - Browse and manage your project files
- ✅ **Integrated Terminal** - Run commands directly in the app
- ✅ **Multi-tab Editing** - Work on multiple files simultaneously
- ✅ **Activity Bar** - Quick access to all features
- ✅ **Status Bar** - Real-time file and project information

### AI Assistant
- ✅ **AI Chat** - Get coding help and generate code
- ✅ **Smart Suggestions** - Context-aware assistance
- ✅ **Code Generation** - Create websites, apps, and games from descriptions

### Project Templates
- ✅ **HTML Website** - Simple HTML/CSS/JS template
- ✅ **React App** - Modern React application with Vite
- ✅ **React Native** - Cross-platform mobile app template
- ✅ **HTML5 Game** - Canvas-based game template

## 🎯 How to Use

### 1. Open a Folder
- Click **File → Open Folder** (Cmd/Ctrl+Shift+O)
- Select any project folder to start editing

### 2. Create a New File
- Click **File → New File** (Cmd/Ctrl+N)
- Or use the **+** button in the Explorer sidebar

### 3. Use the Terminal
- Press **Cmd/Ctrl+`** to toggle the terminal
- Run any shell commands
- Create multiple terminals with **Cmd/Ctrl+Shift+`**

### 4. Ask the AI Assistant
- Click the **chat icon** in the Activity Bar
- Ask questions like:
  - "Create a website with a contact form"
  - "Build a React component for a todo list"
  - "Make a simple game"
  - "Explain this code"

### 5. Keyboard Shortcuts

#### File Operations
- `Cmd/Ctrl + N` - New File
- `Cmd/Ctrl + O` - Open File
- `Cmd/Ctrl + Shift + O` - Open Folder
- `Cmd/Ctrl + S` - Save
- `Cmd/Ctrl + W` - Close File

#### View
- `Cmd/Ctrl + B` - Toggle Sidebar
- `Cmd/Ctrl + \`` - Toggle Terminal
- `Cmd/Ctrl + Shift + \`` - New Terminal

#### Editor
- `Cmd/Ctrl + F` - Find
- `Cmd/Ctrl + H` - Replace
- `Cmd/Ctrl + /` - Toggle Comment

## 📦 Available Commands

```bash
# Development
npm run dev:renderer    # Start Vite dev server
npm run dev:electron    # Start Electron app
npm run dev            # Run both together

# Production Build
npm run build          # Build React app
npm run dist           # Package Electron app

# Quick Start
npm start              # Run the app (uses start.sh)
./start.sh            # Alternative way to start
```

## 🎨 Customization

### Theme Colors
Edit `src/renderer/index.css` to customize colors:
```css
:root {
  --vscode-bg: #1e1e1e;
  --vscode-focus: #007acc;
  /* ... more colors */
}
```

### Add More Features
- Extend `src/main/main.js` for new Electron features
- Add React components in `src/renderer/components/`
- Create new project templates in `src/renderer/templates/`

## 🔧 Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### Rebuild Node Modules
```bash
npm install
```

### Clear Cache
```bash
rm -rf node_modules
rm -rf build
npm install
```

## 🌟 Next Steps

1. **Open a project** and start coding
2. **Try the AI assistant** for code generation
3. **Create project templates** for your common workflows
4. **Customize the theme** to your liking
5. **Add extensions** by modifying the codebase

## 💡 Pro Tips

- Use the **AI Assistant** to generate boilerplate code
- The **Monaco Editor** supports IntelliSense - just start typing
- **Multiple terminals** help you run dev servers and commands simultaneously
- **File watching** automatically updates when files change externally

## 📚 Learn More

- Check out `README.md` for detailed documentation
- Explore the `src/` folder to understand the architecture
- Read Monaco Editor docs: https://microsoft.github.io/monaco-editor/
- Learn about Electron: https://www.electronjs.org/

---

**Enjoy building with Eletr0 Studio!** 🚀
