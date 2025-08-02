#!/bin/bash

# CompoundConnect Development Server Manager
# This script helps manage the API server, mobile app, and dashboard during development

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
    
    # Start dashboard in background
    echo "Starting dashboard..."
    cd apps/dashboard && npm run dev > ../../debug/dashboard.log 2>&1 &
    DASHBOARD_PID=$!
    echo $DASHBOARD_PID > debug/dashboard.pid
    
    # Start mobile app in background
    echo "Starting mobile app..."
    cd apps/mobile && npm run start > ../../debug/mobile.log 2>&1 &
    MOBILE_PID=$!
    echo $MOBILE_PID > debug/mobile.pid
    
    echo "Development servers started!"
    echo "API Server PID: $API_PID (log: debug/api.log)"
    echo "Dashboard PID: $DASHBOARD_PID (log: debug/dashboard.log)"
    echo "Mobile App PID: $MOBILE_PID (log: debug/mobile.log)"
    echo ""
    echo "URLs:"
    echo "  API Server: http://localhost:3001"
    echo "  Dashboard: http://localhost:3000"
    echo "  Mobile App: http://localhost:8081"
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
    
    if [ -f debug/dashboard.pid ]; then
      DASHBOARD_PID=$(cat debug/dashboard.pid)
      kill $DASHBOARD_PID 2>/dev/null && echo "Dashboard stopped (PID: $DASHBOARD_PID)"
      rm debug/dashboard.pid
    fi
    
    if [ -f debug/mobile.pid ]; then
      MOBILE_PID=$(cat debug/mobile.pid)
      kill $MOBILE_PID 2>/dev/null && echo "Mobile app stopped (PID: $MOBILE_PID)"
      rm debug/mobile.pid
    fi
    
    # Kill any remaining node processes for our apps
    pkill -f "nodemon src/index.js" 2>/dev/null
    pkill -f "vite" 2>/dev/null
    pkill -f "expo start" 2>/dev/null
    
    echo "All development servers stopped."
    ;;
    
  logs)
    echo "=== API Server Logs ==="
    if [ -f debug/api.log ]; then
      tail -f debug/api.log &
      API_TAIL_PID=$!
    fi
    
    echo ""
    echo "=== Dashboard Logs ==="
    if [ -f debug/dashboard.log ]; then
      tail -f debug/dashboard.log &
      DASHBOARD_TAIL_PID=$!
    fi
    
    echo ""
    echo "=== Mobile App Logs ==="
    if [ -f debug/mobile.log ]; then
      tail -f debug/mobile.log &
      MOBILE_TAIL_PID=$!
    fi
    
    # Handle Ctrl+C to stop tailing
    trap 'kill $API_TAIL_PID $DASHBOARD_TAIL_PID $MOBILE_TAIL_PID 2>/dev/null; exit' INT
    wait
    ;;
    
  status)
    echo "=== Development Server Status ==="
    
    if [ -f debug/api.pid ] && ps -p $(cat debug/api.pid) > /dev/null 2>&1; then
      echo "✅ API Server running (PID: $(cat debug/api.pid))"
    else
      echo "❌ API Server not running"
    fi
    
    if [ -f debug/dashboard.pid ] && ps -p $(cat debug/dashboard.pid) > /dev/null 2>&1; then
      echo "✅ Dashboard running (PID: $(cat debug/dashboard.pid))"
    else
      echo "❌ Dashboard not running"
    fi
    
    if [ -f debug/mobile.pid ] && ps -p $(cat debug/mobile.pid) > /dev/null 2>&1; then
      echo "✅ Mobile App running (PID: $(cat debug/mobile.pid))"
    else
      echo "❌ Mobile App not running"
    fi
    ;;
    
  install)
    echo "Installing dependencies for all applications..."
    
    echo "Installing root dependencies..."
    npm install
    
    echo "Installing API dependencies..."
    cd packages/api && npm install && cd ../..
    
    echo "Installing Dashboard dependencies..."
    cd apps/dashboard && npm install && cd ../..
    
    echo "Installing Mobile dependencies..."
    cd apps/mobile && npm install && cd ../..
    
    echo "All dependencies installed!"
    ;;
    
  *)
    echo "CompoundConnect Development Server Manager"
    echo ""
    echo "Usage: $0 {start|stop|logs|status|install}"
    echo ""
    echo "Commands:"
    echo "  start   - Start all development servers (API, Dashboard, Mobile)"
    echo "  stop    - Stop all development servers"
    echo "  logs    - View live logs from all servers"
    echo "  status  - Check status of all servers"
    echo "  install - Install dependencies for all applications"
    echo ""
    echo "URLs when running:"
    echo "  API Server: http://localhost:3001"
    echo "  Dashboard:  http://localhost:3000"
    echo "  Mobile App: http://localhost:8081"
    ;;
esac