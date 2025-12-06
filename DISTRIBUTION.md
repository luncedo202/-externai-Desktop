# ExternAI - AI-Powered Development Environment

<div align="center">
  <h3>Build complete applications with AI assistance</h3>
  <p>A powerful IDE that combines the best of VS Code with AI-driven development</p>
</div>

## 📥 Download

### Current Version: 1.0.0

| Platform | Download | Size |
|----------|----------|------|
| **macOS** (Apple Silicon) | [Download DMG](https://github.com/yourusername/externai/releases/download/v1.0.0/ExternAI-1.0.0-arm64.dmg) | ~150 MB |
| **macOS** (Intel) | [Download DMG](https://github.com/yourusername/externai/releases/download/v1.0.0/ExternAI-1.0.0-x64.dmg) | ~150 MB |
| **Windows** (64-bit) | [Download Installer](https://github.com/yourusername/externai/releases/download/v1.0.0/ExternAI-Setup-1.0.0.exe) | ~140 MB |
| **Linux** (Universal) | [Download AppImage](https://github.com/yourusername/externai/releases/download/v1.0.0/ExternAI-1.0.0.AppImage) | ~160 MB |

## ✨ Features

- 🤖 **AI-Powered Coding** - Claude Sonnet 4.5 integration for intelligent code generation
- 📝 **Smart Editor** - Monaco editor with syntax highlighting and IntelliSense
- 🖥️ **Integrated Terminal** - Full terminal support with command execution
- 🔍 **Advanced Search** - Fast file and text search across your workspace
- 🎨 **Image Integration** - Unsplash search and local image support
- 🐛 **Problems Panel** - Real-time error detection and diagnostics
- 🔄 **Git Integration** - Built-in version control
- 🎯 **Run & Debug** - Execute and debug your applications
- 📦 **Project Templates** - Quick start for web, mobile, and game projects

## 🚀 Installation

### macOS
1. Download the `.dmg` file for your Mac type
2. Open the DMG file
3. Drag ExternAI to Applications folder
4. Launch from Applications or Spotlight

**First launch**: Right-click → Open (to bypass Gatekeeper on unsigned builds)

### Windows
1. Download the `.exe` installer
2. Run the installer
3. Follow installation wizard
4. Launch from Start Menu or Desktop shortcut

### Linux
1. Download the `.AppImage` file
2. Make it executable: `chmod +x ExternAI-1.0.0.AppImage`
3. Run: `./ExternAI-1.0.0.AppImage`

**Or install via package manager:**
- **Debian/Ubuntu**: `sudo dpkg -i externai-ide_1.0.0_amd64.deb`
- **Fedora/RedHat**: `sudo rpm -i externai-ide-1.0.0.x86_64.rpm`

## 🔧 Setup

### 1. Get Claude API Key
1. Sign up at [Anthropic Console](https://console.anthropic.com/)
2. Create an API key
3. Copy the key

### 2. Configure ExternAI
1. Create a `.env` file in your project root:
```env
ANTHROPIC_API_KEY=your_api_key_here
```
2. Restart ExternAI
3. Open a workspace folder to start coding

## 📖 Quick Start

1. **Open a Folder**: File → Open Folder (or use Welcome screen buttons)
2. **Start Chatting**: Use the AI Assistant panel on the right
3. **Create Files**: Ask the AI to create files and they'll appear in your editor
4. **Run Commands**: The AI will automatically execute necessary commands
5. **Debug Issues**: The Problems panel shows errors in real-time

## 🎯 Usage Examples

### Create a React App
```
"Create a modern React app with TypeScript, Tailwind CSS, and a responsive navbar"
```

### Build an API
```
"Create a Node.js Express API with user authentication and MongoDB"
```

### Fix Errors
```
"Fix the error in my code" (AI will analyze and fix automatically)
```

## ⚙️ System Requirements

### Minimum
- **OS**: macOS 10.13+, Windows 10+, Ubuntu 18.04+
- **RAM**: 4 GB
- **Storage**: 500 MB free space
- **Internet**: Required for AI features

### Recommended
- **RAM**: 8 GB or more
- **Storage**: 1 GB free space
- **Internet**: High-speed connection for best AI performance

## 🔐 Privacy & Security

- Your code stays on your machine
- API calls are encrypted (HTTPS)
- Only sends necessary context to Claude API
- No telemetry or tracking
- Open source - audit the code yourself

## 🐛 Known Issues

- **macOS**: First launch requires right-click → Open
- **Windows**: SmartScreen may show warning (click "More info" → "Run anyway")
- **Linux**: May need to install libfuse2: `sudo apt install libfuse2`

## 📝 Changelog

### Version 1.0.0 (December 2025)
- Initial release
- Claude Sonnet 4.5 integration
- Full IDE features
- Cross-platform support

## 🤝 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/externai/issues)
- **Email**: support@externai.com
- **Docs**: [Documentation](https://docs.externai.com)

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details

## 🙏 Credits

- Built with Electron, React, and Vite
- Powered by Claude API (Anthropic)
- Monaco Editor by Microsoft
- Icons by React Icons

---

<div align="center">
  <p>Made with ❤️ by Sonelise Pakade</p>
  <p>
    <a href="https://github.com/yourusername/externai">GitHub</a> •
    <a href="https://twitter.com/yourusername">Twitter</a> •
    <a href="https://externai.com">Website</a>
  </p>
</div>
