# Eletr0 Studio - Complete Feature Guide

## 🎯 Overview

Eletr0 Studio is a powerful, AI-enhanced development environment inspired by Firebase Studio and VS Code. It provides everything you need to build websites, mobile apps, and games.

## 📋 Complete Feature List

### 1. Code Editor (Monaco Editor)

The same editor that powers VS Code:

**Features:**
- Syntax highlighting for 50+ languages
- IntelliSense code completion
- Multi-cursor editing
- Find and replace
- Code folding
- Minimap navigation
- Auto-indentation
- Bracket matching
- Custom themes

**Supported Languages:**
- JavaScript/TypeScript
- Python
- HTML/CSS
- JSON/YAML
- Markdown
- And many more...

### 2. File Explorer

**Features:**
- Tree view of project files
- Create/delete/rename files and folders
- File watching (auto-refresh on changes)
- Open files with double-click
- Context menu actions

**Operations:**
- Open folder: `Cmd/Ctrl + Shift + O`
- New file: Right-click in explorer
- Refresh: Click refresh button

### 3. Integrated Terminal

**Features:**
- Full shell access (Bash, PowerShell, etc.)
- Multiple terminal instances
- Terminal splitting
- Automatic working directory
- Copy/paste support
- Color support
- Clickable links

**Commands:**
- Toggle terminal: `Cmd/Ctrl + \``
- New terminal: `Cmd/Ctrl + Shift + \``
- Kill terminal: Right-click on tab

### 4. AI Assistant

**Capabilities:**
- Natural language code generation
- Bug fixing and debugging
- Code explanation
- Refactoring suggestions
- Best practices guidance
- Project scaffolding

**Example Prompts:**
```
"Create a responsive navbar with dropdown menu"
"Build a React form with validation"
"Make a Snake game using HTML5 Canvas"
"Explain this function"
"Fix the error in this code"
"Convert this to TypeScript"
```

### 5. Project Templates

#### Website Templates

**HTML/CSS/JS Website**
- Responsive layout
- Navigation menu
- Contact form
- Modern styling
- Smooth scrolling

**React Website**
- Vite configuration
- Hot module replacement
- Modern React patterns
- Component structure
- CSS modules ready

#### Mobile App Templates

**React Native App**
- Cross-platform setup
- Navigation structure
- Native components
- Styling system
- Build scripts

#### Game Templates

**HTML5 Canvas Game**
- Game loop
- Player controls
- Collision detection
- Score system
- Restart functionality

### 6. Activity Bar

Quick access to all views:

- **Explorer** - File management
- **Search** - Find in files (coming soon)
- **Source Control** - Git integration (coming soon)
- **Run & Debug** - Debugging tools (coming soon)
- **Extensions** - Plugin system (coming soon)
- **AI Assistant** - Chat with AI
- **Settings** - Configuration

### 7. Status Bar

Real-time information:
- Git branch
- File language
- Encoding (UTF-8)
- Line endings (LF/CRLF)
- Cursor position

### 8. Panel

Bottom panel with multiple views:
- **Terminal** - Command line interface
- **Output** - Build and runtime output
- **Problems** - Errors and warnings
- **Debug Console** - Debugging information

## 🔨 How to Build Projects

### Building a Website

1. **Create Project Folder**
```bash
mkdir my-website
cd my-website
```

2. **Open in Eletr0**
- File → Open Folder
- Select `my-website`

3. **Create Files**
```bash
# In terminal
touch index.html styles.css script.js
```

4. **Use AI to Generate**
- Open AI Assistant
- Ask: "Create a modern portfolio website"
- Copy generated code to files

5. **Preview**
- Open `index.html` in browser
- Or use Live Server

### Building a React App

1. **Create Using Template**
- Ask AI: "Create a React app template"
- Or manually create with Vite

2. **Install Dependencies**
```bash
npm install
```

3. **Start Dev Server**
```bash
npm run dev
```

4. **Open in Browser**
- Navigate to `http://localhost:5173`

### Building a Mobile App

1. **Setup React Native**
```bash
npx react-native init MyApp
```

2. **Open Project**
- File → Open Folder

3. **Run on Device**
```bash
# iOS
npm run ios

# Android
npm run android
```

### Building a Game

1. **Create Game Folder**
```bash
mkdir my-game
cd my-game
```

2. **Ask AI**
- "Create an HTML5 Canvas game"
- Get complete game template

3. **Customize**
- Edit game.js for game logic
- Modify styles.css for appearance

4. **Test**
- Open index.html in browser

## 🎨 Customization

### Change Theme

Edit `src/renderer/index.css`:
```css
:root {
  --vscode-bg: #1e1e1e;           /* Background */
  --vscode-fg: #cccccc;            /* Foreground */
  --vscode-focus: #007acc;         /* Accent color */
  --vscode-sidebar-bg: #252526;    /* Sidebar */
}
```

### Add Custom Templates

Edit `src/renderer/templates/projectTemplates.js`:
```javascript
export const templates = {
  myTemplate: {
    name: 'My Custom Template',
    description: 'Description here',
    files: {
      'file1.js': 'content...',
      'file2.css': 'content...',
    }
  }
};
```

### Extend File System

Add operations in `src/main/main.js`:
```javascript
ipcMain.handle('fs:myOperation', async (event, args) => {
  // Your code here
});
```

## 🔍 Advanced Features

### File Watching

Automatically detects changes:
- File added
- File modified
- File deleted
- Directory changes

### Terminal Management

Multiple terminal sessions:
- Create unlimited terminals
- Each has independent state
- Full PTY support
- Resize handling

### IPC Communication

Secure communication between:
- Main process (Electron)
- Renderer process (React)
- Preload script (Bridge)

## 🐛 Debugging

### Enable DevTools

Open with: `Cmd/Ctrl + Shift + I`

### Console Logging

```javascript
console.log('Debug info');
console.error('Error info');
console.warn('Warning');
```

### Electron Debugging

In `src/main/main.js`:
```javascript
mainWindow.webContents.openDevTools();
```

## 📦 Building for Production

### Build React App
```bash
npm run build
```

### Package Electron App
```bash
npm run dist
```

### Platform-Specific Builds
```bash
# macOS
npm run dist -- --mac

# Windows
npm run dist -- --win

# Linux
npm run dist -- --linux
```

## 🚀 Performance Tips

1. **Close Unused Files**
   - Keep only necessary tabs open

2. **Use Minimap**
   - Navigate large files quickly

3. **Terminal Management**
   - Close unused terminals

4. **File Watching**
   - Only watch needed directories

## 🔐 Security

- **Context Isolation** enabled
- **Node Integration** disabled
- **IPC** through preload script
- **Sandboxing** for renderer

## 🤝 Contributing

Want to add features?

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## 📞 Support

- Check `README.md` for documentation
- Review `QUICKSTART.md` for basics
- Explore code in `src/` folder

---

**Happy Coding with Eletr0 Studio!** 💻✨
