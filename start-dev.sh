#!/bin/bash
echo "🚀 Starting CompoundConnect Development Servers"
echo "=============================================="

# Start API server in background
echo "Starting API server on port 3001..."
cd packages/api && npm run dev &
API_PID=$!

# Wait a moment for API to start
sleep 3

# Start mobile app if it exists
if [ -d "../../apps/mobile" ]; then
    echo "Starting mobile app..."
    cd ../../apps/mobile && npm start &
    MOBILE_PID=$!
fi

echo ""
echo "✅ Development servers started!"
echo "📱 API Server: http://localhost:3001"
echo "📱 API Health: http://localhost:3001/health"
echo "📱 Feedback API: http://localhost:3001/api/feedback"
if [ -d "apps/mobile" ]; then
    echo "📱 Mobile App: http://localhost:19006"
fi
echo ""
echo "Press Ctrl+C to stop all servers"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping development servers..."
    kill $API_PID 2>/dev/null || true
    if [ ! -z "$MOBILE_PID" ]; then
        kill $MOBILE_PID 2>/dev/null || true
    fi
    echo "✅ All servers stopped"
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Wait for background processes
wait
