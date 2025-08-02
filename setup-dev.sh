#!/bin/bash

# CompoundConnect Development Setup Script
# This script sets up the development environment for CompoundConnect

set -e  # Exit on any error

echo "🚀 CompoundConnect Development Setup"
echo "===================================="

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
check_node() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ and try again."
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18+ is required. Current version: $(node --version)"
        exit 1
    fi
    
    print_success "Node.js $(node --version) is installed"
}

# Install dependencies
install_dependencies() {
    print_status "Installing root dependencies..."
    npm install
    
    print_status "Installing API dependencies..."
    cd packages/api && npm install && cd ../..
    
    print_status "Installing Dashboard dependencies..."
    cd apps/dashboard && npm install && cd ../..
    
    print_status "Installing Mobile dependencies..."
    cd apps/mobile && npm install && cd ../..
    
    print_success "All dependencies installed"
}

# Setup environment files
setup_env_files() {
    print_status "Setting up environment files..."
    
    # API environment file
    if [ ! -f "packages/api/.env" ]; then
        print_status "Creating API .env file..."
        cat > packages/api/.env << EOF
NODE_ENV=development
PORT=3001
DATABASE_PATH=./data/compound_connect.db
JWT_SECRET=your-super-secret-jwt-key-must-be-at-least-32-characters-long
JWT_REFRESH_SECRET=your-super-secret-refresh-key-must-be-at-least-32-characters-long
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:19006
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX=5
QR_VALIDATION_RATE_LIMIT_MAX=50
EOF
        print_success "Created packages/api/.env"
    else
        print_warning "packages/api/.env already exists, skipping..."
    fi
    
    # Dashboard environment file
    if [ ! -f "apps/dashboard/.env" ]; then
        print_status "Creating Dashboard .env file..."
        cat > apps/dashboard/.env << EOF
VITE_API_BASE_URL=http://localhost:3001/api
EOF
        print_success "Created apps/dashboard/.env"
    else
        print_warning "apps/dashboard/.env already exists, skipping..."
    fi
}

# Setup database
setup_database() {
    print_status "Setting up database..."
    
    # Create data directory if it doesn't exist
    mkdir -p packages/api/data
    
    # Run migrations
    print_status "Running database migrations..."
    cd packages/api && npm run migrate && cd ../..
    
    # Seed database
    print_status "Seeding database with sample data..."
    cd packages/api && npm run seed && cd ../..
    
    print_success "Database setup completed"
}

# Create startup script
create_startup_script() {
    print_status "Creating startup script..."
    
    cat > start-dev.sh << 'EOF'
#!/bin/bash

# Start all development servers
echo "🚀 Starting CompoundConnect Development Servers..."

# Function to kill background processes on exit
cleanup() {
    echo "🛑 Stopping all servers..."
    kill $(jobs -p) 2>/dev/null
    exit
}

# Set up trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Start API server
echo "📡 Starting API server on http://localhost:3001..."
cd packages/api && npm run dev &
API_PID=$!

# Wait a moment for API to start
sleep 3

# Start Dashboard
echo "🖥️  Starting Dashboard on http://localhost:3000..."
cd apps/dashboard && npm run dev &
DASHBOARD_PID=$!

# Start Mobile app (optional)
# echo "📱 Starting Mobile app on http://localhost:19006..."
# cd apps/mobile && npm start &
# MOBILE_PID=$!

echo ""
echo "✅ All servers started!"
echo "📡 API Server: http://localhost:3001"
echo "🖥️  Dashboard: http://localhost:3000"
echo "📱 Mobile App: http://localhost:19006 (start manually with: cd apps/mobile && npm start)"
echo ""
echo "🔑 Sample Login Credentials:"
echo "   Super Admin: superadmin@compoundconnect.com / password123"
echo "   Manager: manager@seaside.com / password123"
echo "   Owner: ahmed@example.com / password123"
echo ""
echo "Press Ctrl+C to stop all servers"

# Wait for background processes
wait
EOF

    chmod +x start-dev.sh
    print_success "Created start-dev.sh script"
}

# Main setup function
main() {
    echo ""
    print_status "Starting CompoundConnect development setup..."
    echo ""
    
    # Check prerequisites
    check_node
    
    # Install dependencies
    install_dependencies
    
    # Setup environment files
    setup_env_files
    
    # Setup database
    setup_database
    
    # Create startup script
    create_startup_script
    
    echo ""
    print_success "🎉 Setup completed successfully!"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Start all development servers: ./start-dev.sh"
    echo "2. Open dashboard: http://localhost:3000"
    echo "3. Login with: manager@seaside.com / password123"
    echo ""
    echo "📚 Documentation:"
    echo "- Main README: ./README.md"
    echo "- API README: ./packages/api/README.md"
    echo "- Dashboard README: ./apps/dashboard/README.md"
    echo ""
    echo "🔧 Useful Commands:"
    echo "- Reset database: cd packages/api && npm run migrate -- --reset && npm run seed -- --reset"
    echo "- View API logs: cd packages/api && tail -f logs/api.log"
    echo "- Run tests: npm test"
    echo ""
}

# Run main function
main