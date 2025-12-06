#!/bin/bash

# Start both the Vite dev server and Electron concurrently

# Kill any existing processes on the ports we'll use
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

echo "Starting Eletr0 Studio..."
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
