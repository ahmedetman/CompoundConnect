# API Authentication Debug Guide

## Common 401 Unauthorized Issues

### 1. Check Token Storage
```javascript
// In browser console or component
import { debugToken } from './src/services/api';
debugToken();
```

### 2. Verify Token Inclusion in Requests
```javascript
// Test if token is being included
import { testTokenInclusion } from './src/services/api';
testTokenInclusion();
```

### 3. Manual Token Check
```javascript
// Check localStorage directly
console.log("Token:", localStorage.getItem("token"));
console.log("User:", localStorage.getItem("user"));
```

### 4. Network Tab Debugging
- Open browser DevTools → Network tab
- Look for API calls to `/users/profile` or other endpoints
- Check Request Headers for `Authorization: Bearer <token>`
- Verify the token format and presence

### 5. Common Issues and Solutions

#### Issue: Token not stored correctly
**Solution:** Ensure login is completing successfully
```javascript
// After login, check:
localStorage.getItem("token") // Should return a JWT token
```

#### Issue: Token expired
**Solution:** Implement token refresh or re-login

#### Issue: Wrong token key name
**Solution:** Verify token is stored under "token" key

#### Issue: CORS or API URL issues
**Solution:** Check API_BASE_URL in environment variables

### 6. Testing Authentication Flow

1. **Login Process:**
   - Use the login form
   - Check browser console for "Login successful" message
   - Verify token appears in localStorage

2. **API Call Test:**
   ```javascript
   import { usersAPI } from './src/services/api';
   usersAPI.getProfile().then(res => console.log(res)).catch(err => console.error(err));
   ```

### 7. Environment Variables
Ensure `.env` file exists in `apps/dashboard/` with:
```
VITE_API_BASE_URL=http://localhost:3001/api
```

### 8. Quick Fix Commands
```javascript
// Force token refresh (if you have a valid refresh token)
import { authAPI } from './src/services/api';
const refreshToken = localStorage.getItem('refresh_token');
if (refreshToken) {
  authAPI.refreshToken(refreshToken).then(res => {
    localStorage.setItem('token', res.data.data.accessToken);
    location.reload();
  });
}
```