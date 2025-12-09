#!/bin/bash

# ExternAI Backend Deployment Script
# This script helps deploy the backend to Railway

echo "🚀 ExternAI Backend Deployment"
echo "================================"
echo ""

# Check if we're in the backend directory
if [ ! -f "server.js" ]; then
    echo "❌ Error: Please run this script from the backend directory"
    exit 1
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found"
    echo "Please create .env file with required variables"
    exit 1
fi

echo "✅ Backend directory confirmed"
echo "✅ .env file found"
echo ""

# Option selection
echo "Choose deployment method:"
echo "1) Railway (Recommended - Free tier)"
echo "2) Render (Alternative - Free tier)"
echo "3) Manual deployment instructions"
echo ""
read -p "Enter choice (1-3): " choice

case $choice in
    1)
        echo ""
        echo "📦 Railway Deployment"
        echo "====================="
        echo ""
        echo "Step 1: Go to https://railway.app and sign up/login"
        echo "Step 2: Click 'New Project' → 'Empty Project'"
        echo "Step 3: Click 'Deploy from GitHub repo' or 'Deploy from local'"
        echo ""
        echo "For local deployment:"
        echo "  railway login"
        echo "  railway init"
        echo "  railway up"
        echo ""
        echo "Step 4: Set environment variables in Railway dashboard:"
        echo "  - NODE_ENV=production"
        echo "  - PORT=5000"
        source .env
        echo "  - FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID}"
        echo "  - FIREBASE_CLIENT_EMAIL=${FIREBASE_CLIENT_EMAIL}"
        echo "  - FIREBASE_PRIVATE_KEY=(copy full value from .env)"
        echo "  - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:0:20}..."
        echo "  - ALLOWED_ORIGINS=*"
        echo ""
        echo "Step 5: Railway will provide a URL like:"
        echo "  https://externai-backend-production.up.railway.app"
        echo ""
        ;;
    2)
        echo ""
        echo "📦 Render Deployment"
        echo "===================="
        echo ""
        echo "Step 1: Go to https://render.com and sign up/login"
        echo "Step 2: Click 'New +' → 'Web Service'"
        echo "Step 3: Connect your GitHub repository"
        echo "Step 4: Configure:"
        echo "  - Name: externai-backend"
        echo "  - Environment: Node"
        echo "  - Build Command: npm install"
        echo "  - Start Command: npm start"
        echo ""
        echo "Step 5: Add environment variables (same as Railway)"
        echo ""
        ;;
    3)
        echo ""
        echo "📖 Manual Deployment Instructions"
        echo "==================================="
        echo ""
        echo "See DEPLOYMENT.md for complete instructions"
        echo ""
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "After deployment, update frontend with your backend URL:"
echo "  File: src/renderer/services/ClaudeService.js"
echo "  Change: const BACKEND_URL = 'https://YOUR-BACKEND-URL.com'"
echo ""
echo "✨ Good luck with your deployment!"
