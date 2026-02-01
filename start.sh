#!/bin/bash

# Start both the Vite dev server and Electron concurrently

# Kill any existing processes on the ports we'll use
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

echo "Starting ExternAI..."
echo "Checking terminal support..."

# Rebuild node-pty for Electron (silently)
npx @electron/rebuild -f -m node_modules/node-pty > /dev/null 2>&1 || echo "Note: Terminal may require restart"

echo "Building renderer process..."

# Start Vite in the background
npm run dev:renderer &
VITE_PID=$!

# Wait for Vite to be ready
echo "Waiting for Vite dev server..."
sleep 5

# Start Electron
echo "Starting Electron..."
NODE_ENV=development npm run dev:electron

# Clean up Vite process when Electron closes
kill $VITE_PID 2>/dev/null || true
