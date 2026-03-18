#!/bin/bash
# AutoReach Local Setup & Start Script

echo "🚀 Starting AutoReach Setup..."

# 1. Install Server Dependencies
echo "📦 Installing Server dependencies..."
cd server
npm install
cd ..

# 2. Install Client Dependencies
echo "📦 Installing Client dependencies..."
cd client
npm install
cd ..

# 3. Setup SQLite Database (Prisma Postgres migration pending)
echo "🗄️ Initializing database..."
cd server
node utils/initDb.js
cd ..

# 4. Start the Application Stack
echo "✨ Starting AutoReach Services!"
echo "-----------------------------------"
echo "🖥️ Frontend: http://localhost:5174"
echo "⚙️ Backend:  http://localhost:3001"
echo "-----------------------------------"

# Run both frontend and backend concurrently
# Requires concurrently to be installed globally, or we can just use background jobs
cd server
node index.js &
SERVER_PID=$!

cd ../client
npm run dev &
CLIENT_PID=$!

# Handle script termination to kill both processes
trap "echo 'Stopping services...'; kill $SERVER_PID; kill $CLIENT_PID; exit" SIGINT SIGTERM

# Wait indefinitely
wait
