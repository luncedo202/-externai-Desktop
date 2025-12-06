#!/bin/bash

echo "🚀 ExternAI Build & Deploy Script"
echo "=================================="
echo ""

# Check if version argument provided
if [ -z "$1" ]; then
    echo "❌ Error: Version number required"
    echo "Usage: ./deploy.sh <version>"
    echo "Example: ./deploy.sh 1.0.1"
    exit 1
fi

VERSION=$1
PLATFORM=$(uname)

echo "📦 Building ExternAI v${VERSION}"
echo ""

# Update version in package.json
echo "1️⃣  Updating version to ${VERSION}..."
npm version $VERSION --no-git-tag-version

# Install dependencies
echo "2️⃣  Installing dependencies..."
npm install

# Rebuild native modules
echo "3️⃣  Rebuilding native modules..."
npm run rebuild

# Build renderer
echo "4️⃣  Building renderer (Vite)..."
npm run build

# Build electron app
echo "5️⃣  Building Electron app..."
if [ "$PLATFORM" == "Darwin" ]; then
    echo "   Building for macOS..."
    npm run dist:mac
elif [ "$PLATFORM" == "Linux" ]; then
    echo "   Building for Linux..."
    npm run dist:linux
else
    echo "   ⚠️  Windows builds should be done on Windows"
    echo "   You can still build using: npm run dist:win"
fi

echo ""
echo "✅ Build complete!"
echo ""
echo "📁 Output files are in: ./dist/"
echo ""

# List generated files
echo "Generated files:"
ls -lh dist/*.{dmg,zip,exe,AppImage,deb,rpm} 2>/dev/null | awk '{print "   " $9 " (" $5 ")"}'

echo ""
echo "🌐 Next steps:"
echo "   1. Test the installer"
echo "   2. Create GitHub release"
echo "   3. Upload files to release"
echo "   4. Share download links"
echo ""
