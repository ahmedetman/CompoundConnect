# Feedback System Documentation

## Overview

The CompoundConnect feedback system allows users to submit bug reports, feature requests, improvements, and general feedback. The system supports multiple languages (English and Arabic) and file attachments including screenshots.

## Features

### 🌐 Multilingual Support
- **English (en)** - Default language
- **Arabic (ar)** - Full RTL support
- Automatic language detection from `Accept-Language` header
- Manual language selection via `?lang=ar` or `?lang=en` query parameter

### 📎 File Attachments
- **Screenshots**: PNG, JPEG, GIF
- **Documents**: PDF, DOC, DOCX
- **Log Files**: TXT, LOG
- **Limits**: Up to 5 files, 10MB per file
- **Storage**: Files stored in `uploads/feedback/` directory

### 🎯 Feedback Types
- **Bug Report** (`bug`) - Report application bugs and issues
- **Feature Request** (`feature_request`) - Suggest new features
- **Improvement** (`improvement`) - Suggest improvements to existing features
- **General** (`general`) - General feedback and comments

### 📂 Categories
- **Mobile App** (`app`) - Issues with the mobile application
- **QR Codes** (`qr_codes`) - QR code related issues
- **Payments** (`payments`) - Payment system issues
- **Notifications** (`notifications`) - Push notification issues
- **Security** (`security`) - Security concerns
- **User Interface** (`ui_ux`) - UI/UX improvements
- **Performance** (`performance`) - Performance issues
- **Other** (`other`) - Other categories

### ⚡ Priority Levels
- **Low** (`low`) - Minor issues, nice-to-have features
- **Medium** (`medium`) - Standard priority (default)
- **High** (`high`) - Important issues affecting user experience
- **Critical** (`critical`) - Urgent issues affecting app functionality

### 📊 Status Tracking
- **Open** (`open`) - New feedback, not yet reviewed (default)
- **In Progress** (`in_progress`) - Being worked on by the team
- **Resolved** (`resolved`) - Issue has been fixed/implemented
- **Closed** (`closed`) - Feedback has been addressed and closed
- **Duplicate** (`duplicate`) - Duplicate of existing feedback

## API Endpoints

### Base URL: `/api/feedback`

#### 1. Get Feedback Options
```http
GET /api/feedback/options?lang=ar
```
Returns translated labels for types, categories, priorities, and statuses.

**Response:**
```json
{
  "success": true,
  "data": {
    "types": {
      "bug": "تقرير خطأ",
      "feature_request": "طلب ميزة",
      "improvement": "اقتراح تحسين",
      "general": "ملاحظات عامة"
    },
    "categories": { ... },
    "priorities": { ... },
    "statuses": { ... }
  }
}
```

#### 2. Submit Feedback
```http
POST /api/feedback
Content-Type: multipart/form-data
Authorization: Bearer <token>
Accept-Language: ar
```

**Form Data:**
- `type` (required): bug|feature_request|improvement|general
- `category` (optional): app|qr_codes|payments|notifications|security|ui_ux|performance|other
- `title` (required): Feedback title (5-200 characters)
- `description` (required): Detailed description (10-2000 characters)
- `priority` (optional): low|medium|high|critical (default: medium)
- `device_info` (optional): Device information
- `app_version` (optional): App version
- `is_anonymous` (optional): true|false (default: false)
- `attachments[]` (optional): Up to 5 files (images, PDFs, documents, logs)

**Response:**
```json
{
  "success": true,
  "message": "تم إرسال الملاحظات بنجاح",
  "data": {
    "id": 1,
    "type": "bug",
    "title": "App crashes on startup",
    "description": "The app crashes when I try to open it...",
    "status": "open",
    "priority": "high",
    "language": "ar",
    "attachments": ["uploads/feedback/feedback-1234567890-123456789.png"],
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

#### 3. Get User's Feedback
```http
GET /api/feedback/my-feedback?page=1&limit=10&status=open
Authorization: Bearer <token>
```

#### 4. Get All Feedback (Admin/Management Only)
```http
GET /api/feedback?type=bug&status=open&page=1&limit=20
Authorization: Bearer <token>
```

#### 5. Get Feedback by ID
```http
GET /api/feedback/:id
Authorization: Bearer <token>
```

#### 6. Update Feedback Status (Admin/Management Only)
```http
PATCH /api/feedback/:id/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "resolved",
  "admin_response": "This issue has been fixed in version 1.2.0"
}
```

#### 7. Get Feedback Statistics (Admin/Management Only)
```http
GET /api/feedback/stats/dashboard
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "total": 150,
      "open": 45,
      "in_progress": 20,
      "resolved": 70,
      "closed": 15,
      "bugs": 60,
      "feature_requests": 40,
      "critical": 5,
      "high_priority": 25
    },
    "detailed_stats": [...]
  }
}
```

#### 8. Delete Feedback (Super Admin Only)
```http
DELETE /api/feedback/:id
Authorization: Bearer <token>
```

## Database Schema

### Feedback Table
```sql
CREATE TABLE feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  compound_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('bug', 'feature_request', 'improvement', 'general')),
  category TEXT CHECK (category IN ('app', 'qr_codes', 'payments', 'notifications', 'security', 'ui_ux', 'performance', 'other')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed', 'duplicate')),
  admin_response TEXT,
  admin_user_id INTEGER,
  responded_at DATETIME,
  device_info TEXT,
  app_version TEXT,
  attachments TEXT, -- JSON array of file paths
  is_anonymous BOOLEAN DEFAULT 0,
  language TEXT DEFAULT 'en' CHECK (language IN ('en', 'ar')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (compound_id) REFERENCES compounds(id) ON DELETE CASCADE,
  FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE SET NULL
);
```

### Indexes
- `idx_feedback_user` - For user-specific queries
- `idx_feedback_compound` - For compound-specific queries
- `idx_feedback_status` - For status filtering
- `idx_feedback_type` - For type filtering

## Language Support

### Setting Language
1. **Query Parameter**: `?lang=ar` or `?lang=en`
2. **Accept-Language Header**: `Accept-Language: ar-SA,ar;q=0.9,en;q=0.8`

### Supported Languages
- **English (en)**: Default language
- **Arabic (ar)**: Full RTL support with proper translations

### Translation Files
- `src/locales/en.json` - English translations
- `src/locales/ar.json` - Arabic translations

## File Upload Guidelines

### Supported File Types
- **Images**: JPEG, JPG, PNG, GIF (for screenshots)
- **Documents**: PDF, DOC, DOCX
- **Logs**: TXT, LOG

### Limits
- **File Size**: 10MB per file
- **File Count**: Maximum 5 files per feedback
- **Total Size**: No explicit limit, but consider server storage

### Storage
- Files are stored in `uploads/feedback/` directory
- Filenames are automatically generated with timestamps for uniqueness
- Format: `feedback-{timestamp}-{random}.{extension}`

## Security & Permissions

### User Permissions
- **All Users**: Can submit feedback and view their own feedback
- **Management/Admin**: Can view all feedback, update status, respond to feedback
- **Super Admin**: Can delete feedback (use with caution)

### Anonymous Feedback
- Users can submit anonymous feedback by setting `is_anonymous: true`
- Anonymous feedback still tracks the user ID for security but doesn't display user information to admins

## Usage Examples

### Frontend Integration (React Native)

```javascript
// Submit feedback with screenshot
const submitFeedback = async (feedbackData, screenshot) => {
  const formData = new FormData();
  formData.append('type', 'bug');
  formData.append('category', 'app');
  formData.append('title', 'App crashes on startup');
  formData.append('description', 'Detailed description...');
  formData.append('priority', 'high');
  formData.append('device_info', JSON.stringify(DeviceInfo));
  formData.append('app_version', '1.0.0');
  
  if (screenshot) {
    formData.append('attachments', {
      uri: screenshot.uri,
      type: 'image/png',
      name: 'screenshot.png'
    });
  }

  const response = await fetch('/api/feedback', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept-Language': 'ar',
      'Content-Type': 'multipart/form-data'
    },
    body: formData
  });

  return response.json();
};

// Get feedback options in Arabic
const getFeedbackOptions = async () => {
  const response = await fetch('/api/feedback/options?lang=ar');
  return response.json();
};
```

### Admin Dashboard Integration

```javascript
// Get feedback statistics
const getFeedbackStats = async () => {
  const response = await fetch('/api/feedback/stats/dashboard', {
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Accept-Language': 'ar'
    }
  });
  return response.json();
};

// Update feedback status
const updateFeedbackStatus = async (feedbackId, status, response) => {
  const result = await fetch(`/api/feedback/${feedbackId}/status`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
      'Accept-Language': 'ar'
    },
    body: JSON.stringify({
      status,
      admin_response: response
    })
  });
  return result.json();
};
```

## Best Practices

### For Users
1. **Be Specific**: Provide clear, detailed descriptions
2. **Include Screenshots**: Visual evidence helps developers understand issues
3. **Provide Context**: Include device info, app version, and steps to reproduce
4. **Choose Appropriate Priority**: Don't mark everything as critical

### For Administrators
1. **Respond Promptly**: Acknowledge feedback within 24-48 hours
2. **Provide Updates**: Keep users informed about progress
3. **Use Appropriate Status**: Update status as work progresses
4. **Be Professional**: Maintain professional tone in responses

### For Developers
1. **Monitor Critical Issues**: Set up alerts for critical priority feedback
2. **Track Trends**: Use statistics to identify common issues
3. **Close Loop**: Always update status when issues are resolved
4. **Learn from Feedback**: Use feedback to improve the application

## Troubleshooting

### Common Issues
1. **File Upload Fails**: Check file size and type restrictions
2. **Language Not Switching**: Verify Accept-Language header or lang parameter
3. **Permission Denied**: Check user role and authentication token
4. **Database Errors**: Ensure migration has been run successfully

### Migration
To create the feedback table, run:
```bash
cd packages/api
npm run migrate
```

This comprehensive feedback system provides a robust way for users to report issues and suggest improvements while supporting multiple languages and file attachments.