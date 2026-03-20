#!/bin/bash
# ═══════════════════════════════════════════════
# AutoReach — Production Deployment Script
# Run this on your VPS after initial setup
# ═══════════════════════════════════════════════

set -e
APP_DIR="/var/www/autoreach"

echo "🚀 AutoReach Deployment Starting..."

# 1. Pull latest code
echo "📥 Pulling latest code..."
cd $APP_DIR
git pull origin master

# 2. Install server dependencies
echo "📦 Installing server dependencies..."
cd $APP_DIR/server
npm install --production

# 3. Build frontend
echo "🔨 Building frontend..."
cd $APP_DIR/client
npm install
npm run build

# 4. Run database migrations
echo "🗄️  Running database migrations..."
cd $APP_DIR
node -e "require('./server/db/database'); console.log('✅ DB migrations complete')"

# 5. Restart application
echo "🔄 Restarting application..."
pm2 restart autoreach || pm2 start ecosystem.config.js

echo ""
echo "═══════════════════════════════════════"
echo "✅ Deployment complete!"
echo "═══════════════════════════════════════"
pm2 status
