# CompoundConnect API

A comprehensive backend API for compound access and management system built with Node.js, Express, and SQLite.

## 🚀 Features

- **Multi-tenant Architecture**: Support for multiple compounds with isolated data
- **QR Code Management**: Generate, validate, and manage QR codes for visitors and residents
- **Role-based Access Control**: Different access levels for super admins, management, owners, and personnel
- **Payment Tracking**: Monitor and manage unit payments for various services
- **Real-time Notifications**: Push notifications for QR scans and important updates
- **Comprehensive Reporting**: Dashboard statistics and detailed reports
- **Season Management**: Configure compound seasons and automatic QR invalidation
- **News & Alerts**: Publish announcements and alerts to residents
- **Feedback System**: Handle user feedback and support requests
- **Settings Management**: Configurable compound-wide settings

## 🛠️ Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: SQLite3
- **Authentication**: JWT (JSON Web Tokens) with refresh tokens
- **Validation**: Joi
- **QR Codes**: qrcode library
- **Push Notifications**: Firebase Cloud Messaging
- **Security**: Helmet, CORS, Rate Limiting
- **Password Hashing**: bcrypt
- **Cron Jobs**: node-cron

## 📦 Installation

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
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:19006
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY=your-firebase-private-key
FIREBASE_CLIENT_EMAIL=your-firebase-client-email
```

5. Run database migrations:
```bash
npm run migrate
```

6. Seed the database with sample data:
```bash
npm run seed
```

7. Start the development server:
```bash
npm run dev
```

The API will be available at `http://localhost:3001`

## 🗄️ Database Management

### Migrations
```bash
# Run migrations
npm run migrate

# Reset database and run migrations
npm run migrate -- --reset
```

### Seeding
```bash
# Seed with sample data
npm run seed

# Clear existing data and reseed
npm run seed -- --reset
```

## 🔐 Authentication

The API uses JWT-based authentication with refresh tokens:

1. **Login**: `POST /api/auth/login`
2. **Refresh Token**: `POST /api/auth/refresh-token`
3. **Logout**: `POST /api/auth/logout`

### Sample Login Credentials (after seeding)
- **Super Admin**: `superadmin@compoundconnect.com` / `password123`
- **Manager**: `manager@seaside.com` / `password123`
- **Owner**: `ahmed@example.com` / `password123`
- **Security**: `security@seaside.com` / `password123`

## 📚 API Endpoints

### Authentication Routes (`/api/auth`)
- `POST /login` - User login
- `POST /logout` - User logout
- `POST /refresh-token` - Refresh access token
- `POST /register-personnel` - Register personnel with invite code

### Management Routes (`/api/management`)

#### Units Management

**Get All Units**
```http
GET /api/management/units
```
- **Auth Required**: Yes (management, super_admin)
- **Query Parameters**: `page`, `limit`, `sort_by`, `sort_order`
- **Response**: Paginated list of units with payment status

**Create Unit**
```http
POST /api/management/units
```
- **Auth Required**: Yes (management, super_admin)
- **Body**: `{ "unit_number": "string" }`
- **Response**: Created unit details

**Get Unit Details**
```http
GET /api/management/units/:id
```
- **Auth Required**: Yes (management, super_admin)
- **Response**: Unit details with payments and assigned users

**Update Unit**
```http
PUT /api/management/units/:id
```
- **Auth Required**: Yes (management, super_admin)
- **Body**: `{ "unit_number": "string" }`
- **Response**: Updated unit details

**Delete Unit**
```http
DELETE /api/management/units/:id
```
- **Auth Required**: Yes (management, super_admin)
- **Response**: Success message
- **Constraints**: Cannot delete if unit has users or payments

**Assign User to Unit**
```http
POST /api/management/units/:id/assign-user
```
- **Auth Required**: Yes (management, super_admin)
- **Body**: `{ "user_id": number, "relationship": "owner|tenant|family_member" }`
- **Response**: Success message

**Remove User from Unit**
```http
DELETE /api/management/units/:id/assign-user/:userId
```
- **Auth Required**: Yes (management, super_admin)
- **Response**: Success message

**Get Unit Users**
```http
GET /api/management/units/:id/users
```
- **Auth Required**: Yes (management, super_admin)
- **Response**: List of users assigned to the unit

**Update Payment Status**
```http
POST /api/management/units/:id/payments
```
- **Auth Required**: Yes (management, super_admin)
- **Body**: `{ "service_id": number, "season_id": number, "status": "paid|due|overdue", "amount": number, "paid_on_date": "ISO date" }`
- **Response**: Success message

#### Users
- `GET /users` - Get all users
- `POST /users` - Create new user
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Delete user

#### Personnel
- `GET /personnel` - Get all personnel
- `POST /personnel/invite` - Generate personnel invite code
- `PUT /personnel/:id/revoke` - Revoke personnel access

#### Seasons
- `GET /seasons` - Get all seasons
- `POST /seasons` - Create new season
- `PUT /seasons/:id` - Update season
- `PUT /seasons/:id/activate` - Activate season

#### Services
- `GET /services` - Get all services
- `POST /services` - Create new service
- `PUT /services/:id` - Update service
- `DELETE /services/:id` - Delete service

#### Payments
- `GET /payments` - Get payment records
- `PUT /payments/:unitId/:serviceId/:seasonId` - Update payment status

#### News
- `GET /news` - Get all news with filters
- `POST /news` - Create news item
- `PUT /news/:id` - Update news item
- `DELETE /news/:id` - Delete news item

#### Settings
- `GET /settings` - Get compound settings
- `PUT /settings` - Update settings

### QR Code Routes (`/api/qrcodes`)
- `POST /visitor` - Create visitor QR code
- `GET /my` - Get personal QR codes
- `GET /visitors` - Get visitor QR codes
- `POST /validate` - Validate QR code (Critical endpoint)
- `PUT /:id/invalidate` - Invalidate QR code
- `GET /all` - Get all QR codes (Admin only)
- `GET /stats` - Get QR code statistics

### User Routes (`/api/users`)
- `GET /profile` - Get user profile
- `PUT /profile` - Update user profile

### Reports Routes (`/api/reports`)
- `GET /dashboard` - Dashboard statistics
- `GET /payments-due` - Payments due report
- `GET /qr-usage` - QR code usage report
- `GET /user-activity` - User activity report

### Feedback Routes (`/api/feedback`)
- `GET /` - Get feedback with filters
- `POST /` - Submit new feedback
- `PUT /:id` - Update feedback
- `DELETE /:id` - Delete feedback
- `PUT /:id/respond` - Respond to feedback

## 🔒 Security Features

### Authentication & Authorization
- JWT tokens with configurable expiration
- Refresh token rotation
- Role-based access control (RBAC)
- Password hashing with bcrypt

### API Security
- Rate limiting on all endpoints
- CORS configuration
- Helmet security headers
- Input validation with Joi
- SQL injection prevention
- XSS protection

### Data Protection
- Sensitive data encryption
- Secure token storage
- Audit logging for all actions
- Automatic cleanup of expired tokens

## 📊 Monitoring & Logging

### Health Checks
- `GET /health` - Basic health check
- `GET /api/health` - Detailed API health check

### Logging
- Request/response logging
- Error logging with stack traces
- Security event logging
- Performance monitoring

## 🔧 Configuration

### Environment Variables
```env
# Server Configuration
NODE_ENV=development|production
PORT=3001
HOST=localhost

# Database
DATABASE_PATH=./data/compound_connect.db

# JWT Configuration
JWT_SECRET=your-jwt-secret-min-32-characters
JWT_REFRESH_SECRET=your-refresh-secret-min-32-characters
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:19006

# Firebase (for push notifications)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX=5
QR_VALIDATION_RATE_LIMIT_MAX=50
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- --testPathPattern=auth.test.js
```

## 📈 Performance

### Database Optimization
- Proper indexing on frequently queried columns
- Query optimization for complex joins
- Connection pooling
- Prepared statements

### Caching
- Dashboard statistics caching
- QR code validation caching
- Settings caching

### Rate Limiting
- General API rate limiting: 100 requests per 15 minutes
- Authentication rate limiting: 5 requests per 15 minutes
- QR validation rate limiting: 50 requests per minute

## 🚀 Deployment

### Production Setup
1. Set `NODE_ENV=production`
2. Use strong JWT secrets (min 32 characters)
3. Configure proper CORS origins
4. Set up SSL/TLS certificates
5. Configure reverse proxy (nginx)
6. Set up monitoring and logging
7. Configure database backups

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

### Environment-specific Configurations
- **Development**: Debug logging, hot reloading
- **Staging**: Production-like setup with test data
- **Production**: Optimized performance, security hardening

## 🔄 Cron Jobs

The API includes automated tasks:
- **Token Cleanup**: Remove expired refresh tokens (daily)
- **QR Code Cleanup**: Mark expired QR codes as inactive (hourly)
- **Statistics Update**: Update dashboard statistics (every 15 minutes)
- **Log Rotation**: Archive old logs (weekly)

## 📝 API Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": {
    "code": "ERROR_CODE",
    "details": "Detailed error information"
  }
}
```

### Paginated Response
```json
{
  "success": true,
  "message": "Data retrieved successfully",
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "pages": 10
    }
  }
}
```

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check if database file exists
   - Verify file permissions
   - Run migrations: `npm run migrate`

2. **JWT Token Issues**
   - Verify JWT secrets are set
   - Check token expiration
   - Ensure secrets are at least 32 characters

3. **CORS Issues**
   - Check `ALLOWED_ORIGINS` environment variable
   - Verify frontend URL is included

4. **Rate Limiting**
   - Check rate limit configuration
   - Verify client IP is not blocked

### Debug Mode
Set `NODE_ENV=development` for detailed error messages and debug logging.

## 📞 Support

For API-specific issues:
1. Check the logs in `./logs/` directory
2. Verify environment configuration
3. Test with provided sample credentials
4. Check database integrity with `npm run migrate`

## 🤝 Contributing

1. Follow the existing code style
2. Add tests for new features
3. Update documentation
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.