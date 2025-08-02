# CompoundConnect Development Setup

This guide will help you set up the CompoundConnect development environment with all three applications: API Server, Dashboard, and Mobile App.

## 🚀 Quick Start

### Option 1: Using Dev Server Script (Recommended)
```bash
# Install all dependencies
./dev-server.sh install

# Start all development servers
./dev-server.sh start

# Check server status
./dev-server.sh status

# View logs
./dev-server.sh logs

# Stop all servers
./dev-server.sh stop
```

### Option 2: Manual Setup
```bash
# Install dependencies for all applications
npm install
cd packages/api && npm install && cd ../..
cd apps/dashboard && npm install && cd ../..
cd apps/mobile && npm install && cd ../..

# Run database migration
cd packages/api && npm run migrate && cd ../..

# Start servers individually
cd packages/api && npm run dev &
cd apps/dashboard && npm run dev &
cd apps/mobile && npm run start &
```

## 📋 Prerequisites

- **VS Code** with Dev Containers extension
- **Docker** installed and running
- **Node.js 18+** (handled by dev container)

## 🐳 Dev Container Features

The dev container includes:

### 🔧 **Development Tools**
- Node.js 18 with npm
- Git and GitHub CLI
- Docker-in-Docker support
- Expo CLI for React Native development

### 📦 **VS Code Extensions**
- **TypeScript/JavaScript**: Enhanced language support
- **React**: React development support
- **Tailwind CSS**: CSS framework support
- **REST Client**: Test API endpoints directly in VS Code
- **SQLite Viewer**: View and query the database
- **Arabic Language Pack**: Support for Arabic translations
- **ESLint & Prettier**: Code formatting and linting
- **Expo Tools**: React Native development support

### 🌐 **Port Forwarding**
- **3000**: Dashboard (React Web App)
- **3001**: API Server (Node.js/Express)
- **8081**: Metro Bundler (React Native)
- **19000-19006**: Expo Development Servers

## 🏗️ Application Architecture

### 📊 **Dashboard** (Port 3000)
- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS
- **Features**: 
  - Management dashboard with statistics
  - Units and users management
  - Payment tracking
  - QR codes monitoring
  - News and announcements
  - Reports generation

### 🔧 **API Server** (Port 3001)
- **Framework**: Node.js with Express
- **Database**: SQLite with better-sqlite3
- **Features**:
  - RESTful API endpoints
  - JWT authentication
  - File upload support
  - Internationalization (i18n)
  - Comprehensive validation

### 📱 **Mobile App** (Port 8081)
- **Framework**: React Native with Expo
- **Features**:
  - Resident portal
  - QR code generation and scanning
  - Personnel access control
  - Push notifications

## 🛠️ Development Workflow

### Starting Development
1. Open project in VS Code
2. Reopen in Dev Container when prompted
3. Wait for container setup to complete
4. Run `./dev-server.sh start` to start all servers

### Available URLs
- **Dashboard**: http://localhost:3000
- **API Server**: http://localhost:3001
- **API Health Check**: http://localhost:3001/health
- **Mobile App**: http://localhost:8081

### Development Commands

```bash
# Server Management
./dev-server.sh start    # Start all servers
./dev-server.sh stop     # Stop all servers
./dev-server.sh status   # Check server status
./dev-server.sh logs     # View live logs
./dev-server.sh install  # Install all dependencies

# Individual Application Commands
cd packages/api && npm run dev          # API server only
cd apps/dashboard && npm run dev        # Dashboard only
cd apps/mobile && npm run start         # Mobile app only

# Database Operations
cd packages/api && npm run migrate      # Run database migrations
cd packages/api && npm run seed         # Seed database (if available)

# Testing
cd packages/api && npm test             # API tests
cd apps/dashboard && npm test           # Dashboard tests
cd apps/mobile && npm test              # Mobile tests

# Building for Production
cd apps/dashboard && npm run build      # Build dashboard
cd apps/mobile && npm run build         # Build mobile app
```

## 🗃️ Database Setup

The API uses SQLite for development:

### Database Location
- **File**: `packages/api/database.db`
- **Migrations**: `packages/api/migrations/`
- **Seeds**: `packages/api/seeds/` (if available)

### Database Operations
```bash
cd packages/api

# Run migrations
npm run migrate

# Reset database (if script exists)
npm run db:reset

# View database in VS Code
# Use SQLite Viewer extension to open database.db
```

## 🔐 Authentication & Testing

### Default Test Accounts
The system may include default test accounts for development:

```javascript
// Management Account
{
  email: "admin@compound.com",
  password: "admin123",
  role: "management"
}

// Resident Account  
{
  email: "resident@compound.com", 
  password: "resident123",
  role: "resident"
}
```

### API Testing
Use the REST Client extension with `.http` files:

```http
### Login
POST http://localhost:3001/api/auth/login
Content-Type: application/json

{
  "email": "admin@compound.com",
  "password": "admin123"
}

### Get Dashboard Stats
GET http://localhost:3001/api/management/dashboard
Authorization: Bearer {{token}}
```

## 🐛 Troubleshooting

### Common Issues

**Port Already in Use**
```bash
./dev-server.sh stop  # Stop all servers
lsof -ti:3000,3001,8081 | xargs kill -9  # Force kill processes
./dev-server.sh start  # Restart
```

**Database Issues**
```bash
cd packages/api
rm database.db  # Remove database file
npm run migrate  # Recreate database
```

**Node Modules Issues**
```bash
./dev-server.sh stop
rm -rf node_modules packages/api/node_modules apps/*/node_modules
./dev-server.sh install
./dev-server.sh start
```

**Container Issues**
```bash
# Rebuild dev container
Ctrl+Shift+P -> "Dev Containers: Rebuild Container"
```

### Log Files
Development logs are stored in the `debug/` directory:
- `debug/api.log` - API server logs
- `debug/dashboard.log` - Dashboard logs  
- `debug/mobile.log` - Mobile app logs

### Performance Tips
- Use `./dev-server.sh status` to check if all servers are running
- Monitor logs with `./dev-server.sh logs` for real-time debugging
- Use VS Code's integrated terminal for better development experience

## 📚 Additional Resources

- [Product Requirements Document](docs/Product_Requirements_Document_(PRD).md)
- [System Architecture](docs/System_Architecture.md)
- [Technical Briefing](docs/Technical%20Briefing.MD)
- [Feedback System Documentation](docs/Feedback_System.md)

## 🤝 Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Test all applications work correctly
4. Ensure code passes linting and formatting
5. Submit a pull request

---

**Happy Coding!** 🚀