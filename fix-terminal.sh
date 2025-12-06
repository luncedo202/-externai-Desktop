#!/bin/bash

# Quick Terminal Fix Script for Eletr0 Studio
# This will enable the integrated terminal feature

echo "🔧 Fixing Terminal Feature..."
echo ""

# Check if Xcode Command Line Tools are installed
if ! xcode-select -p &> /dev/null; then
    echo "⚠️  Xcode Command Line Tools not found"
    echo "📦 Installing Command Line Tools..."
    xcode-select --install
    echo "⏳ Please complete the installation, then run this script again"
    exit 1
fi

echo "✅ Command Line Tools found"
echo ""

# Rebuild node-pty for Electron
echo "🔨 Rebuilding node-pty for Electron..."
npm install electron-rebuild --save-dev
npx electron-rebuild -f -w node-pty

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Terminal feature is now enabled!"
    echo "🚀 Restart the app with: npm start"
else
    echo ""
    echo "❌ Rebuild failed. The app works without terminal."
    echo "💡 You can use an external terminal alongside Eletr0 Studio"
fi
