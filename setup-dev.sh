#!/bin/bash

# CompoundConnect Development Environment Setup Script
# This script sets up the development environment for the feedback system

set -e

echo "🚀 Setting up CompoundConnect Development Environment"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
print_status "Checking Node.js installation..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_success "Node.js is installed: $NODE_VERSION"
else
    print_error "Node.js is not installed. Please install Node.js 18 or higher."
    exit 1
fi

# Check if npm is installed
print_status "Checking npm installation..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    print_success "npm is installed: $NPM_VERSION"
else
    print_error "npm is not installed. Please install npm."
    exit 1
fi

# Install root dependencies
print_status "Installing root dependencies..."
npm install
print_success "Root dependencies installed"

# Install API dependencies
print_status "Installing API dependencies..."
cd packages/api
npm install
print_success "API dependencies installed"

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p data
mkdir -p uploads/feedback
mkdir -p logs
print_success "Directories created"

# Set up database
print_status "Setting up database..."
if [ ! -f "data/compound_connect.db" ]; then
    npm run migrate
    print_success "Database created and migrated"
else
    print_warning "Database already exists. Skipping migration."
fi

# Check environment file
print_status "Checking environment configuration..."
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_warning "Created .env file from .env.example. Please update with your configuration."
    else
        print_error ".env.example file not found. Please create .env file manually."
    fi
else
    print_success "Environment file exists"
fi

# Set proper permissions for uploads directory
print_status "Setting permissions for uploads directory..."
chmod 755 uploads/feedback
print_success "Permissions set"

# Go back to root
cd ../..

# Install mobile app dependencies (if exists)
if [ -d "apps/mobile" ]; then
    print_status "Installing mobile app dependencies..."
    cd apps/mobile
    npm install
    print_success "Mobile app dependencies installed"
    cd ../..
fi

# Create development scripts
print_status "Creating development scripts..."

# Create start script
cat > start-dev.sh << 'EOF'
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
EOF

chmod +x start-dev.sh

# Create test script
cat > test-feedback.sh << 'EOF'
#!/bin/bash
echo "🧪 Testing Feedback System"
echo "=========================="

cd packages/api
node scripts/test-feedback.js
EOF

chmod +x test-feedback.sh

print_success "Development scripts created"

# Final setup verification
print_status "Running setup verification..."
cd packages/api
node scripts/test-feedback.js

print_success "🎉 Development environment setup complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Update packages/api/.env with your configuration"
echo "2. Run './start-dev.sh' to start development servers"
echo "3. Run './test-feedback.sh' to test the feedback system"
echo "4. Open packages/api/feedback-api-tests.http in VS Code to test API endpoints"
echo ""
echo "📚 Documentation:"
echo "- Feedback System: docs/Feedback_System.md"
echo "- API Tests: packages/api/feedback-api-tests.http"
echo ""
echo "🔧 Useful Commands:"
echo "- npm run dev (from root) - Start all development servers"
echo "- npm run migrate (from packages/api) - Run database migrations"
echo "- npm run feedback:test (from root) - Test feedback system"