#!/bin/bash

# CompoundConnect Development Server Manager
# This script helps manage the API server and mobile app during development

case "$1" in
  start)
    echo "Starting CompoundConnect development servers..."
    
    # Start API server in background
    echo "Starting API server..."
    cd packages/api && npm run dev > ../../debug/api.log 2>&1 &
    API_PID=$!
    echo $API_PID > debug/api.pid

    
    # Wait a moment for API to start
    sleep 3
    
    # Start mobile app in background
    echo "Starting mobile app..."
    cd apps/mobile && npm run start > ../../debug/mobile.log 2>&1 &
    MOBILE_PID=$!
    echo $MOBILE_PID > debug/mobile.pid
    
    echo "Development servers started!"
    echo "API Server PID: $API_PID (log: /debug/api.log)"
    echo "Mobile App PID: $MOBILE_PID (log: /debug/mobile.log)"
    echo ""
    echo "Use './dev-server.sh stop' to stop all servers"
    echo "Use './dev-server.sh logs' to view logs"
    ;;
    
  stop)
    echo "Stopping CompoundConnect development servers..."
    
    if [ -f debug/api.pid ]; then
      API_PID=$(cat debug/api.pid)
      kill $API_PID 2>/dev/null && echo "API server stopped (PID: $API_PID)"
      rm debug/api.pid
    fi
    
    if [ -f debug/mobile.pid ]; then
      MOBILE_PID=$(cat debug/mobile.pid)
      kill $MOBILE_PID 2>/dev/null && echo "Mobile app stopped (PID: $MOBILE_PID)"
      rm debug/mobile.pid
    fi
    
    # Kill any remaining node processes for our apps
    pkill -f "nodemon src/index.js" 2>/dev/null
    pkill -f "expo start" 2>/dev/null
    
    echo "All development servers stopped."
    ;;
    
  logs)
    echo "=== API Server Logs ==="
    if [ -f debug/api.log ]; then
      tail -f debug/api.log &
      API_TAIL_PID=$!
    else
      echo "No API logs found"
    fi
    
    echo ""
    echo "=== Mobile App Logs ==="
    if [ -f debug/mobile.log ]; then
      tail -f debug/mobile.log &
      MOBILE_TAIL_PID=$!
    else
      echo "No mobile logs found"
    fi
    
    # Wait for Ctrl+C
    trap "kill $API_TAIL_PID $MOBILE_TAIL_PID 2>/dev/null; exit" INT
    wait
    ;;
    
  status)
    echo "=== Development Server Status ==="
    
    if [ -f debug/api.pid ]; then
      API_PID=$(cat debug/api.pid)
      if ps -p $API_PID > /dev/null; then
        echo "✅ API Server running (PID: $API_PID)"
      else
        echo "❌ API Server not running (stale PID file)"
        rm debug/api.pid
      fi
    else
      echo "❌ API Server not running"
    fi
    
    if [ -f debug/mobile.pid ]; then
      MOBILE_PID=$(cat debug/mobile.pid)
      if ps -p $MOBILE_PID > /dev/null; then
        echo "✅ Mobile App running (PID: $MOBILE_PID)"
      else
        echo "❌ Mobile App not running (stale PID file)"
        rm debug/mobile.pid
      fi
    else
      echo "❌ Mobile App not running"
    fi
    ;;
    
  *)
    echo "CompoundConnect Development Server Manager"
    echo ""
    echo "Usage: $0 {start|stop|logs|status}"
    echo ""
    echo "Commands:"
    echo "  start   - Start both API server and mobile app"
    echo "  stop    - Stop all development servers"
    echo "  logs    - View live logs from both servers"
    echo "  status  - Check status of development servers"
    echo ""
    echo "You can also use npm scripts:"
    echo "  npm run dev:start"
    echo "  npm run dev:stop"
    echo "  npm run dev:logs"
    echo "  npm run dev:status"
    exit 1
    ;;
esac