# CompoundConnect Development Setup

This guide will help you set up the CompoundConnect development environment with the feedback system in VS Code Dev Containers.

## 🚀 Quick Start

### Option 1: Automated Setup (Recommended)
```bash
chmod +x setup-dev.sh
./setup-dev.sh
```

### Option 2: Manual Setup
```bash
# Install dependencies
npm install
cd packages/api && npm install

# Run database migration
npm run migrate

# Start development servers
npm run dev
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

### 📦 **VS Code Extensions**
- **TypeScript/JavaScript**: Enhanced language support
- **REST Client**: Test API endpoints directly in VS Code
- **SQLite Viewer**: View and query the database
- **Arabic Language Pack**: Support for Arabic translations
- **ESLint & Prettier**: Code formatting and linting
- **Expo Tools**: React Native development support

### 🌐 **Port Forwarding**
- **3000**: Web Dashboard
- **3001**: API Server (Main)
- **8081**: Metro Bundler
- **19000-19002**: Expo Dev Servers
- **19006**: Expo Web Server

### 📁 **Volume Mounts**
- Persistent uploads directory for feedback attachments
- Database storage persistence

## 🗂️ Project Structure

```
CompoundConnect/
├── .devcontainer/
│   └── devcontainer.json          # Dev container configuration
├── packages/
│   └── api/                       # Backend API
│       ├── src/
│       │   ├── routes/feedback.js # Feedback API routes
│       │   ├── services/feedbackService.js
│       │   ├── middleware/i18n.js # Internationalization
│       │   └── locales/           # Translation files
│       ├── uploads/feedback/      # File attachments
│       ├── scripts/test-feedback.js
│       └── feedback-api-tests.http
├── apps/
│   └── mobile/                    # React Native app
├── docs/
│   └── Feedback_System.md         # Feedback system documentation
├── setup-dev.sh                   # Development setup script
└── compound-connect.code-workspace # VS Code workspace
```

## 🛠️ Development Workflow

### 1. **Start Development Environment**
```bash
# Start all servers
npm run dev

# Or start individually
npm run dev:api    # API server only
npm run dev:mobile # Mobile app only
```

### 2. **Test Feedback System**
```bash
# Run automated tests
npm run feedback:test

# Or manually
cd packages/api && node scripts/test-feedback.js
```

### 3. **Test API Endpoints**
- Open `packages/api/feedback-api-tests.http` in VS Code
- Use REST Client extension to test endpoints
- Update `@authToken` variable with valid JWT token

### 4. **Database Operations**
```bash
# Run migrations
npm run migrate

# Seed test data
npm run seed
```

## 🌍 Multilingual Support

The feedback system supports:
- **English (en)**: Default language
- **Arabic (ar)**: Full RTL support

### Language Detection
1. **Query Parameter**: `?lang=ar`
2. **Accept-Language Header**: `Accept-Language: ar-SA,ar;q=0.9`

### Translation Files
- `packages/api/src/locales/en.json` - English
- `packages/api/src/locales/ar.json` - Arabic

## 📎 File Upload Testing

### Supported File Types
- **Images**: PNG, JPEG, GIF (screenshots)
- **Documents**: PDF, DOC, DOCX
- **Logs**: TXT, LOG

### Upload Limits
- **File Size**: 10MB per file
- **File Count**: 5 files per feedback
- **Storage**: `packages/api/uploads/feedback/`

## 🔍 Debugging

### API Server Debugging
1. Open VS Code Command Palette (`Ctrl+Shift+P`)
2. Select "Tasks: Run Task"
3. Choose "Debug API Server"

### Database Inspection
1. Install SQLite extension in VS Code
2. Open `packages/api/data/compound_connect.db`
3. Browse tables and run queries

## 📊 Monitoring & Logging

### Health Checks
- **API Health**: http://localhost:3001/health
- **Feedback Options**: http://localhost:3001/api/feedback/options

### Log Files
- API logs: Console output in terminal
- Error logs: Captured in VS Code terminal

## 🧪 Testing

### Automated Tests
```bash
# Test feedback system
npm run feedback:test

# Run all API tests
npm run test:api
```

### Manual Testing
1. Use REST Client files (`*.http`)
2. Test with different languages
3. Test file uploads
4. Test error scenarios

## 🚨 Troubleshooting

### Common Issues

#### 1. **Port Already in Use**
```bash
# Kill process using port 3001
lsof -ti:3001 | xargs kill -9
```

#### 2. **Database Migration Fails**
```bash
# Delete database and recreate
rm packages/api/data/compound_connect.db
cd packages/api && npm run migrate
```

#### 3. **File Upload Fails**
```bash
# Check permissions
chmod 755 packages/api/uploads/feedback
```

#### 4. **i18n Not Working**
- Verify translation files exist
- Check Accept-Language header
- Ensure i18next dependency is installed

### Dev Container Issues

#### 1. **Container Won't Start**
- Ensure Docker is running
- Rebuild container: `Ctrl+Shift+P` → "Dev Containers: Rebuild Container"

#### 2. **Extensions Not Loading**
- Reload window: `Ctrl+Shift+P` → "Developer: Reload Window"
- Check extension recommendations in `.devcontainer/devcontainer.json`

#### 3. **Port Forwarding Issues**
- Check VS Code ports panel
- Manually forward ports if needed

## 📚 Additional Resources

### Documentation
- [Feedback System Documentation](docs/Feedback_System.md)
- [API Testing Guide](packages/api/feedback-api-tests.http)

### VS Code Tasks
- **Start API Server**: `Ctrl+Shift+P` → "Tasks: Run Task" → "Start API Server"
- **Run Migration**: `Ctrl+Shift+P` → "Tasks: Run Task" → "Run Database Migration"
- **Test Feedback**: `Ctrl+Shift+P` → "Tasks: Run Task" → "Test Feedback System"

### Useful Commands
```bash
# Development
npm run dev                 # Start all servers
npm run dev:api            # Start API only
npm run migrate            # Run database migration
npm run feedback:test      # Test feedback system

# Maintenance
npm run clean              # Clean node_modules
npm run install:all        # Install all dependencies
```

## 🎯 Next Steps

1. **Update Environment Variables**
   - Edit `packages/api/.env`
   - Configure Firebase credentials
   - Set JWT secrets

2. **Customize Feedback Categories**
   - Edit translation files in `packages/api/src/locales/`
   - Update validation schemas if needed

3. **Add More Languages**
   - Create new translation files
   - Update i18n configuration
   - Add language detection logic

4. **Integrate with Frontend**
   - Use API endpoints in mobile app
   - Implement file upload UI
   - Add feedback forms

## 🤝 Contributing

1. Follow the existing code style
2. Add tests for new features
3. Update documentation
4. Test with multiple languages
5. Ensure file uploads work correctly

---

**Happy Coding! 🚀**