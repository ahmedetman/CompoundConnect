# CompoundConnect Dashboard

A modern React-based web dashboard for compound management built with Vite, React, and Tailwind CSS.

## 🚀 Features

### 📊 Dashboard Overview
- Real-time statistics and metrics
- Payment compliance tracking
- Active visitor monitoring
- Recent activity feed
- Quick action buttons

### 🏢 Management Modules

#### Units Management
- Create, edit, and delete units
- Assign residents to units
- View payment status per unit
- Unit occupancy tracking

#### Users Management
- Manage resident accounts
- Role-based user management
- User profile management
- Account activation/deactivation

#### Payments Management
- Track payment status for all services
- Update payment records
- Payment compliance reports
- Service-wise payment tracking

#### Personnel Management
- Generate personnel invite codes
- Manage security and staff accounts
- Revoke personnel access
- Track personnel activity

#### Seasons Management
- Create and manage compound seasons
- Activate/deactivate seasons
- Season-based payment cycles
- Automatic QR code validity

#### Services Management
- Define compound services (pool, gym, etc.)
- Set service pricing
- Enable/disable services
- Service usage tracking

#### News & Announcements
- Create and publish news items
- Manage alerts and notifications
- Content categorization (news, alert, maintenance, event)
- Priority-based messaging

#### QR Codes Management
- Monitor all QR codes in the system
- View QR code usage statistics
- Invalidate active QR codes
- Filter by type and status

#### Feedback Management
- Handle user feedback and support requests
- Categorize and prioritize feedback
- Respond to user inquiries
- Track resolution status

#### Reports & Analytics
- Dashboard statistics
- Payment reports
- QR code usage analytics
- User activity reports

#### Settings
- Configure compound-wide settings
- Notification preferences
- QR code parameters
- System configuration

## 🛠️ Technology Stack

- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router DOM
- **HTTP Client**: Axios
- **Icons**: Lucide React
- **Charts**: Recharts
- **Forms**: React Hook Form
- **Notifications**: React Hot Toast
- **Date Handling**: date-fns
- **State Management**: React Context

## 📦 Installation

1. Navigate to the dashboard directory:
```bash
cd apps/dashboard
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Configure environment variables:
```env
VITE_API_BASE_URL=http://localhost:3001/api
```

5. Start the development server:
```bash
npm run dev
```

The dashboard will be available at `http://localhost:3000`

## 🔐 Authentication

The dashboard uses JWT-based authentication with the following features:

- Secure login with email/password
- Automatic token refresh
- Role-based access control
- Session management
- Logout functionality

### Sample Login Credentials
After seeding the API database:
- **Super Admin**: `superadmin@compoundconnect.com` / `password123`
- **Manager**: `manager@seaside.com` / `password123`

## 🎨 UI Components

### Layout Components
- **Layout**: Main application layout with sidebar and header
- **Sidebar**: Navigation menu with role-based visibility
- **Header**: User profile and logout functionality

### Common Components
- **LoadingSpinner**: Loading indicator
- **Modal**: Reusable modal component
- **Card**: Content container component
- **Button**: Styled button variants
- **Form Controls**: Input, select, textarea, checkbox

### Page Components
- **DashboardHome**: Main dashboard with statistics
- **UnitsManagement**: Unit CRUD operations
- **UsersManagement**: User management interface
- **PaymentsManagement**: Payment tracking
- **PersonnelManagement**: Staff management
- **SeasonsManagement**: Season configuration
- **ServicesManagement**: Service management
- **NewsManagement**: News and announcements
- **QRCodesManagement**: QR code monitoring
- **FeedbackManagement**: Support system
- **Reports**: Analytics and reporting
- **Settings**: System configuration

## 🔌 API Integration

### API Service Layer
The dashboard includes a comprehensive API service layer:

```javascript
// Authentication
authAPI.login(credentials)
authAPI.logout()
authAPI.refreshToken(token)

// Management
managementAPI.getDashboardStats()
managementAPI.getUnits(params)
managementAPI.createUnit(data)

// QR Codes
qrCodesAPI.getQRCodes(params)
qrCodesAPI.getQRStats()
qrCodesAPI.invalidateQR(id)

// And many more...
```

### Error Handling
- Automatic token refresh on 401 errors
- User-friendly error messages
- Network error handling
- Loading states management

## 🎯 Features by Role

### Super Admin
- Full system access
- Multi-compound management
- User role management
- System settings

### Management
- Compound-specific management
- Unit and resident management
- Payment tracking
- Personnel management
- News and announcements
- Reports and analytics

### Limited Access
- Read-only access to relevant data
- Basic profile management

## 📱 Responsive Design

The dashboard is fully responsive and works on:
- Desktop computers (1024px+)
- Tablets (768px - 1023px)
- Mobile devices (320px - 767px)

### Mobile Features
- Collapsible sidebar
- Touch-friendly interface
- Optimized layouts
- Swipe gestures

## 🔧 Development

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues

# Testing
npm run test         # Run tests (if configured)
```

### Project Structure

```
src/
├── components/          # Reusable components
│   ├── auth/           # Authentication components
│   ├── common/         # Common UI components
│   └── layout/         # Layout components
├── contexts/           # React contexts
│   └── AuthContext.jsx # Authentication context
├── pages/              # Page components
├── services/           # API services
│   └── api.js         # API client configuration
├── styles/            # Global styles
├── App.jsx            # Main app component
└── main.jsx           # App entry point
```

### Styling Guidelines

The dashboard uses Tailwind CSS with custom utility classes:

```css
/* Custom button styles */
.btn {
  @apply px-4 py-2 rounded-md font-medium transition-colors;
}

.btn-primary {
  @apply bg-blue-600 text-white hover:bg-blue-700;
}

.btn-secondary {
  @apply bg-gray-200 text-gray-800 hover:bg-gray-300;
}

/* Card component */
.card {
  @apply bg-white rounded-lg shadow-sm border border-gray-200;
}
```

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

This creates a `dist` folder with optimized static files.

### Deployment Options

#### Static Hosting
- **Netlify**: Connect GitHub repo for automatic deployments
- **Vercel**: Zero-config deployment with GitHub integration
- **AWS S3 + CloudFront**: Scalable static hosting
- **GitHub Pages**: Free hosting for public repositories

#### Server Deployment
- **Nginx**: Serve static files with reverse proxy to API
- **Apache**: Traditional web server setup
- **Docker**: Containerized deployment

### Environment Configuration

Create environment-specific files:

```bash
# Development
.env.development
VITE_API_BASE_URL=http://localhost:3001/api

# Production
.env.production
VITE_API_BASE_URL=https://api.yourcompound.com/api

# Staging
.env.staging
VITE_API_BASE_URL=https://staging-api.yourcompound.com/api
```

## 🔒 Security Considerations

### Authentication Security
- JWT tokens stored in localStorage
- Automatic token refresh
- Secure logout with token cleanup
- Role-based route protection

### API Security
- HTTPS enforcement in production
- CORS configuration
- Request/response validation
- Error message sanitization

### Data Protection
- Sensitive data masking
- Input sanitization
- XSS prevention
- CSRF protection

## 📊 Performance Optimization

### Code Splitting
- Route-based code splitting
- Lazy loading of components
- Dynamic imports for heavy libraries

### Asset Optimization
- Image optimization
- CSS purging with Tailwind
- Bundle size analysis
- Tree shaking

### Caching Strategy
- API response caching
- Static asset caching
- Service worker implementation (optional)

## 🧪 Testing

### Testing Strategy
- Unit tests for utility functions
- Component testing with React Testing Library
- Integration tests for API calls
- E2E tests with Cypress (optional)

### Test Setup
```bash
# Install testing dependencies
npm install --save-dev @testing-library/react @testing-library/jest-dom vitest

# Run tests
npm run test
```

## 🐛 Troubleshooting

### Common Issues

1. **API Connection Issues**
   - Check `VITE_API_BASE_URL` environment variable
   - Verify API server is running
   - Check CORS configuration

2. **Authentication Problems**
   - Clear localStorage and try again
   - Check token expiration
   - Verify API credentials

3. **Build Issues**
   - Clear node_modules and reinstall
   - Check for TypeScript errors
   - Verify environment variables

4. **Styling Issues**
   - Check Tailwind CSS configuration
   - Verify PostCSS setup
   - Clear browser cache

### Debug Mode

Enable debug mode by setting:
```env
VITE_DEBUG=true
```

This enables:
- Detailed error logging
- API request/response logging
- Performance monitoring
- Development tools

## 📈 Analytics & Monitoring

### Built-in Analytics
- User activity tracking
- Page view analytics
- Error tracking
- Performance metrics

### External Integration
- Google Analytics
- Mixpanel
- Sentry for error tracking
- LogRocket for session replay

## 🤝 Contributing

### Development Guidelines
1. Follow React best practices
2. Use TypeScript for new components
3. Write tests for new features
4. Follow the existing code style
5. Update documentation

### Code Style
- Use functional components with hooks
- Implement proper error boundaries
- Follow naming conventions
- Add PropTypes or TypeScript types

## 📄 License

This project is licensed under the MIT License.

## 📞 Support

For dashboard-specific issues:
1. Check browser console for errors
2. Verify API connectivity
3. Check authentication status
4. Review network requests in DevTools

For additional support, contact the development team.