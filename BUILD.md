# Building & Distributing ExternAI

## Prerequisites
- Node.js 18+ installed
- For macOS builds: Xcode Command Line Tools
- For Windows builds: Windows machine or Wine on macOS/Linux
- For Linux builds: Linux machine or Docker

## Build Commands

### Build for Current Platform
```bash
# Build for your current OS
npm run build:electron
```

### Build for Specific Platforms
```bash
# macOS (Intel & Apple Silicon)
npm run dist:mac

# Windows (64-bit & 32-bit)
npm run dist:win

# Linux (AppImage, deb, rpm)
npm run dist:linux

# All platforms
npm run dist:all
```

## Output Files

Built files will be in the `dist` folder:

### macOS
- `ExternAI-1.0.0-arm64.dmg` - Apple Silicon installer
- `ExternAI-1.0.0-x64.dmg` - Intel Mac installer
- `ExternAI-1.0.0-arm64-mac.zip` - Apple Silicon portable
- `ExternAI-1.0.0-x64-mac.zip` - Intel Mac portable

### Windows
- `ExternAI Setup 1.0.0.exe` - Windows installer
- `ExternAI 1.0.0.exe` - Portable version (no installation)

### Linux
- `ExternAI-1.0.0.AppImage` - Universal Linux app
- `externai-ide_1.0.0_amd64.deb` - Debian/Ubuntu package
- `externai-ide-1.0.0.x86_64.rpm` - Fedora/RedHat package

## Code Signing (Optional but Recommended)

### macOS Code Signing
1. Get an Apple Developer account ($99/year)
2. Create certificates in Xcode
3. Set environment variables:
```bash
export CSC_LINK=/path/to/certificate.p12
export CSC_KEY_PASSWORD=your_password
export APPLE_ID=your@email.com
export APPLE_ID_PASSWORD=app-specific-password
```

### Windows Code Signing
1. Purchase a code signing certificate
2. Set environment variables:
```bash
export CSC_LINK=/path/to/certificate.pfx
export CSC_KEY_PASSWORD=your_password
```

## Distribution Options

### 1. GitHub Releases (Recommended for Free Distribution)
1. Create a GitHub repository
2. Push your code
3. Create a new release
4. Upload the built files from `dist/` folder
5. Users can download directly from GitHub

### 2. Website Distribution
Upload the installers to your own website:
```
https://yourwebsite.com/downloads/
  ├── ExternAI-mac-arm64.dmg
  ├── ExternAI-mac-x64.dmg
  ├── ExternAI-windows.exe
  └── ExternAI-linux.AppImage
```

### 3. App Stores

#### Mac App Store
- Requires Apple Developer Program ($99/year)
- Must meet App Store guidelines
- Use `electron-builder` with `mas` target

#### Microsoft Store
- Requires Microsoft Partner account (free)
- Must meet Store policies
- Use `electron-builder` with `appx` target

#### Snapcraft (Linux)
- Free distribution through Snap Store
- Wide Linux distribution support

## Auto-Update Setup (Optional)

To enable auto-updates:

1. Install electron-updater:
```bash
npm install electron-updater
```

2. Set up update server (GitHub releases work automatically)

3. Add to main.js:
```javascript
const { autoUpdater } = require('electron-updater');

app.on('ready', () => {
  autoUpdater.checkForUpdatesAndNotify();
});
```

## Testing Before Release

Always test on each platform:
```bash
# Test without packaging (fast)
npm run pack

# Test full installer
npm run dist:mac  # or dist:win / dist:linux
```

## Version Management

Update version in `package.json`:
```json
{
  "version": "1.0.1"
}
```

Version number follows semantic versioning: `MAJOR.MINOR.PATCH`

## Troubleshooting

### Build fails on macOS
- Run: `npm run rebuild` to rebuild native modules
- Ensure Xcode Command Line Tools installed

### Build fails on Windows
- Install Windows Build Tools: `npm install --global windows-build-tools`

### Linux build issues
- Install required dependencies: `sudo apt-get install build-essential`

## Quick Deployment Checklist

- [ ] Update version in package.json
- [ ] Test the app locally (`npm start`)
- [ ] Build for your platform (`npm run dist:mac/win/linux`)
- [ ] Test the built installer
- [ ] Create GitHub release or upload to website
- [ ] Share download links with users

## Distribution Costs

- **GitHub Releases**: Free (unlimited downloads)
- **Website Hosting**: $5-20/month (depends on bandwidth)
- **Mac App Store**: $99/year (Apple Developer)
- **Microsoft Store**: Free account
- **Code Signing Certificate**: $100-400/year (optional but recommended)
