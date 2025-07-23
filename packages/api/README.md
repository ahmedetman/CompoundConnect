# CompoundConnect API

A comprehensive backend API for compound access and management system built with Node.js, Express, and SQLite.

## Features

- **Multi-tenant Architecture**: Support for multiple compounds with isolated data
- **QR Code Management**: Generate, validate, and manage QR codes for visitors and residents
- **Role-based Access Control**: Different access levels for super admins, management, owners, and personnel
- **Payment Tracking**: Monitor and manage unit payments for various services
- **Real-time Notifications**: Push notifications for QR scans and important updates
- **Comprehensive Reporting**: Dashboard statistics and detailed reports
- **Season Management**: Configure compound seasons and automatic QR invalidation

## Technology Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: SQLite3
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Joi
- **QR Codes**: qrcode library
- **Push Notifications**: Firebase Cloud Messaging
- **Security**: Helmet, CORS, Rate Limiting

## Installation

1. Clone the repository and navigate to the API directory:
```bash
cd packages/api
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Configure environment variables in `.env`:
```env
NODE_ENV=development
PORT=3001
DATABASE_PATH=./data/compound_connect.db
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key
# ... other configurations
```

5. Initialize the database:
```bash
npm run migrate
```

6. Seed sample data (optional):
```bash
npm run seed
```

## Usage

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

### Database Operations
```bash
# Run migrations
npm run migrate

# Seed sample data
npm run seed
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register-personnel` - Register personnel with invite code
- `POST /api/auth/refresh-token` - Refresh access token
- `POST /api/auth/logout` - User logout

### QR Codes
- `POST /api/qrcodes/visitor` - Create visitor QR code
- `GET /api/qrcodes/my` - Get user's personal QR codes
- `GET /api/qrcodes/visitors` - Get user's visitor QR codes
- `POST /api/qrcodes/validate` - Validate QR code (Critical endpoint)
- `PUT /api/qrcodes/:id/invalidate` - Invalidate QR code

### Management
- `GET /api/management/units` - Get all units with payment status
- `POST /api/management/units` - Create new unit
- `GET /api/management/units/:id` - Get unit details
- `POST /api/management/units/:id/assign-user` - Assign user to unit
- `POST /api/management/units/:id/payments` - Update payment status
- `GET /api/management/personnel` - Get all personnel
- `POST /api/management/personnel/invite` - Generate personnel invite
- `PUT /api/management/personnel/:id/revoke` - Revoke personnel access
- `GET /api/management/seasons` - Get all seasons
- `POST /api/management/seasons` - Create new season
- `PUT /api/management/seasons/:id` - Update season
- `GET /api/management/news` - Get all news
- `POST /api/management/news` - Create news
- `PUT /api/management/news/:id` - Update news
- `DELETE /api/management/news/:id` - Delete news

### Users
- `GET /api/users/profile` - Get current user profile
- `GET /api/users/news` - Get compound news for user
- `GET /api/users/payments` - Get user's payment status
- `GET /api/users/scan-history` - Get user's QR scan history
- `PUT /api/users/device-token` - Update device token for push notifications

### Reports
- `GET /api/reports/dashboard` - Get dashboard statistics
- `GET /api/reports/payments-due` - Get payments due report
- `GET /api/reports/visitor-log` - Get visitor traffic report
- `GET /api/reports/scan-activity` - Get scan activity report

## Database Schema

### Core Tables
- `compounds` - Compound information
- `seasons` - Compound seasons with start/end dates
- `users` - All system users with roles
- `units` - Compound units
- `unit_users` - Many-to-many relationship between units and users
- `services` - Available services (maintenance, pool access, etc.)
- `payments` - Payment tracking for units and services
- `qr_codes` - QR code data and metadata
- `scan_logs` - QR code scan history
- `personnel_invites` - Personnel invitation codes
- `news` - News and alerts
- `refresh_tokens` - JWT refresh token management

## Security Features

- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- Rate limiting on sensitive endpoints
- Input validation using Joi
- SQL injection prevention
- CORS configuration
- Helmet security headers
- Password hashing with bcrypt

## Scheduled Tasks

The API includes automated cron jobs for:
- Cleaning expired refresh tokens (daily at 2 AM)
- Checking for expiring seasons (daily at 9 AM)
- Invalidating expired QR codes (hourly)
- Updating overdue payments (daily at 1 AM)

## Push Notifications

Integrated with Firebase Cloud Messaging for:
- QR code scan notifications to owners
- Season expiry notifications to management
- News and alert notifications to residents
- Payment reminder notifications

## Error Handling

Comprehensive error handling with:
- Global error middleware
- Custom error classes
- Structured error responses
- Logging for debugging
- Graceful degradation

## Testing

```bash
npm test
```

## Sample Login Credentials

After running the seed script, you can use these credentials:

- **Super Admin**: `superadmin@compoundconnect.com` / `password123`
- **Manager**: `manager@seaside.com` / `password123`
- **Owner 1**: `ahmed@example.com` / `password123`
- **Owner 2**: `sarah@example.com` / `password123`
- **Security**: `security@seaside.com` / `password123`

## Health Check

The API provides a health check endpoint at `/health` that returns:
- Server status
- Uptime
- Environment information
- Timestamp

## Contributing

1. Follow the existing code style and patterns
2. Add appropriate validation for new endpoints
3. Include error handling
4. Update documentation
5. Add tests for new functionality

## License

MIT License