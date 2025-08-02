# CompoundConnect

A modern, multi-platform application designed to streamline operations, enhance security, and improve the resident experience within private residential compounds.

## 🏗️ Architecture

CompoundConnect is built as a monorepo containing three main applications:

- **API Server** (`packages/api`) - Node.js/Express backend with SQLite database
- **Dashboard** (`apps/dashboard`) - React-based web dashboard for management
- **Mobile App** (`apps/mobile`) - React Native app for residents and personnel

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Git

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd CompoundConnect
```

2. Install dependencies for all applications:
```bash
./dev-server.sh install
```

3. Set up the database:
```bash
# Run migrations and seed sample data
npm run migrate
npm run seed
```

4. Start all development servers:
```bash
./dev-server.sh start
```

This will start:
- **API Server**: http://localhost:3001
- **Dashboard**: http://localhost:3000  
- **Mobile App**: http://localhost:8081

### Development Commands

```bash
# Database Management
npm run migrate              # Run database migrations
npm run migrate -- --reset  # Reset database and run migrations
npm run seed                 # Seed database with sample data
npm run seed -- --reset     # Clear existing data and reseed

# Development
npm run dev                  # Start API and mobile app
npm run dev:api             # Start API server only
npm run dev:mobile          # Start mobile app only

# Testing
npm run test                # Run all tests
npm run test:api            # Run API tests only

# Utilities
npm run clean               # Clean all node_modules
npm run install:all         # Install dependencies for all apps
```

## 📱 Features Implemented

### 🔐 Authentication & Authorization
- JWT-based authentication with refresh tokens
- Role-based access control (Super Admin, Management, Owner, Security, Staff)
- Personnel invitation system with time-limited codes

### 🏢 Management Dashboard
- **Dashboard Home**: Real-time statistics and activity overview
- **Units Management**: Create, edit, and assign units to residents
- **Users Management**: Manage residents and personnel accounts
- **Payments Management**: Track and update payment status for services
- **Personnel Management**: Generate invite codes and manage staff access
- **Seasons Management**: Configure compound seasons and payment cycles
- **Services Management**: Define and manage compound services (pool, gym, etc.)
- **News Management**: Create and publish announcements and alerts
- **QR Codes Management**: Monitor and invalidate QR codes
- **Feedback Management**: Handle user feedback and support requests
- **Reports**: Generate various reports on payments, usage, and activity
- **Settings**: Configure compound-wide settings and preferences

### 📱 QR Code System
- Personal QR codes for gate and facility access
- Time-bound visitor QR codes with visitor details
- QR code validation with detailed logging
- Automatic expiration and manual invalidation
- Real-time scan statistics and monitoring

### 📊 Reporting & Analytics
- Dashboard statistics with real-time updates
- Payment compliance tracking
- QR code usage analytics
- User activity monitoring
- Feedback and support metrics

### 🔧 System Features
- Multi-tenant architecture (multiple compounds)
- Comprehensive audit logging
- Automated cleanup of expired tokens and codes
- Rate limiting and security middleware
- Database migrations with reset functionality
- Comprehensive seed data for development

## 🗄️ Database Schema

The application uses SQLite with the following main entities:

- **Compounds**: Multi-tenant compound management
- **Users**: All system users with role-based access
- **Units**: Residential units within compounds
- **Seasons**: Payment cycles and access periods
- **Services**: Compound services (maintenance, pool, etc.)
- **Payments**: Payment tracking per unit/service/season
- **QR Codes**: All QR codes with validation history
- **News**: Announcements and alerts
- **Feedback**: User feedback and support system
- **Settings**: Configurable compound settings

## 🔑 Sample Login Credentials

After running the seed command, you can use these credentials:

- **Super Admin**: `superadmin@compoundconnect.com` / `password123`
- **Manager**: `manager@seaside.com` / `password123`
- **Owner**: `ahmed@example.com` / `password123`
- **Security**: `security@seaside.com` / `password123`

## 🛠️ API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh-token` - Refresh access token
- `POST /api/auth/register-personnel` - Register personnel with invite code

### Management
- `GET /api/management/units` - Get all units
- `POST /api/management/units` - Create new unit
- `GET /api/management/users` - Get all users
- `GET /api/management/personnel` - Get personnel
- `POST /api/management/personnel/invite` - Generate personnel invite
- `GET /api/management/seasons` - Get seasons
- `POST /api/management/seasons` - Create season
- `GET /api/management/services` - Get services
- `POST /api/management/services` - Create service
- `GET /api/management/news` - Get news
- `POST /api/management/news` - Create news
- `GET /api/management/settings` - Get settings
- `PUT /api/management/settings` - Update settings

### QR Codes
- `POST /api/qrcodes/visitor` - Create visitor QR code
- `GET /api/qrcodes/my` - Get personal QR codes
- `GET /api/qrcodes/visitors` - Get visitor QR codes
- `POST /api/qrcodes/validate` - Validate QR code
- `GET /api/qrcodes/all` - Get all QR codes (admin)
- `GET /api/qrcodes/stats` - Get QR code statistics

### Reports
- `GET /api/reports/dashboard` - Dashboard statistics
- `GET /api/reports/payments-due` - Payments due report
- `GET /api/reports/qr-usage` - QR code usage report

### Feedback
- `GET /api/feedback` - Get feedback
- `POST /api/feedback` - Submit feedback
- `PUT /api/feedback/:id` - Update feedback

## 🔒 Security Features

- JWT authentication with secure token handling
- Rate limiting on all endpoints
- Input validation and sanitization
- SQL injection prevention
- CORS configuration
- Helmet security headers
- Password hashing with bcrypt
- Refresh token rotation

## 🚀 Deployment

### API Server
The API can be deployed to any Node.js hosting platform:
- Docker containers
- Heroku
- AWS Fargate
- DigitalOcean App Platform

### Dashboard
The React dashboard can be deployed as a static site:
- Netlify
- Vercel
- AWS S3 + CloudFront
- GitHub Pages

### Mobile App
The React Native app can be built for:
- iOS App Store
- Google Play Store
- Expo managed workflow

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For support and questions, please contact the development team or create an issue in the repository.