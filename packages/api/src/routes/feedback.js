const express = require('express');
const router = express.Router();
const FeedbackService = require('../services/feedbackService');
const { authenticate } = require('../middleware/auth');
const { validateFeedback, validateFeedbackUpdate } = require('../middleware/validation');
const { languageMiddleware, getTranslations } = require('../middleware/i18n');
const multer = require('multer');
const path = require('path');

// Apply language middleware to all routes
router.use(languageMiddleware);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/feedback/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'feedback-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files
  },
  fileFilter: (req, file, cb) => {
    // Allow images, documents, and logs
    const allowedTypes = /jpeg|jpg|png|gif|pdf|txt|log|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error(req.t('feedback.invalid_file_type')));
    }
  }
});

// Get feedback options (types, categories, priorities, statuses) with translations
router.get('/options', languageMiddleware, (req, res) => {
  try {
    const options = {
      types: getTranslations('types', req.language),
      categories: getTranslations('categories', req.language),
      priorities: getTranslations('priorities', req.language),
      statuses: getTranslations('statuses', req.language)
    };

    res.json({
      success: true,
      data: options
    });
  } catch (error) {
    console.error('Error getting feedback options:', error);
    res.status(500).json({
      success: false,
      message: req.t('feedback.failed_to_retrieve')
    });
  }
});

// Submit new feedback
router.post('/', authenticate, upload.array('attachments', 5), validateFeedback, async (req, res) => {
  try {
    const {
      type,
      category,
      title,
      description,
      priority,
      device_info,
      app_version,
      is_anonymous
    } = req.body;

    // Get attachment file paths
    const attachments = req.files ? req.files.map(file => file.path) : [];

    const feedbackData = {
      user_id: req.user.id,
      compound_id: req.user.compound_id,
      type,
      category,
      title,
      description,
      priority,
      device_info,
      app_version,
      attachments,
      is_anonymous: is_anonymous === 'true'
    };

    const feedback = await FeedbackService.submitFeedback(feedbackData);

    res.status(201).json({
      success: true,
      message: req.t('feedback.submitted_successfully'),
      data: feedback
    });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({
      success: false,
      message: req.t('feedback.failed_to_submit')
    });
  }
});

// Get user's own feedback
router.get('/my-feedback', authenticate, async (req, res) => {
  try {
    const { page, limit, status } = req.query;
    
    const result = await FeedbackService.getUserFeedback(req.user.id, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      status
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error getting user feedback:', error);
    res.status(500).json({
      success: false,
      message: req.t('feedback.failed_to_retrieve')
    });
  }
});

// Get all feedback (admin/management only)
router.get('/', authenticate, async (req, res) => {
  try {
    // Check if user has admin/management permissions
    if (!['super_admin', 'management'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: req.t('feedback.admin_privileges_required')
      });
    }

    const {
      type,
      category,
      status,
      priority,
      user_id,
      page,
      limit,
      sort_by,
      sort_order
    } = req.query;

    const filters = {
      type,
      category,
      status,
      priority,
      user_id,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      sort_by: sort_by || 'created_at',
      sort_order: sort_order || 'DESC'
    };

    const result = await FeedbackService.getFeedbackList(req.user.compound_id, filters);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error getting feedback list:', error);
    res.status(500).json({
      success: false,
      message: req.t('feedback.failed_to_retrieve_list')
    });
  }
});

// Get feedback by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const feedbackId = req.params.id;
    const feedback = await FeedbackService.getFeedbackById(feedbackId);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: req.t('feedback.not_found')
      });
    }

    // Check if user can access this feedback
    const canAccess = feedback.user_id === req.user.id || 
                     ['super_admin', 'management'].includes(req.user.role);

    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: req.t('feedback.access_denied')
      });
    }

    res.json({
      success: true,
      data: feedback
    });
  } catch (error) {
    console.error('Error getting feedback:', error);
    res.status(500).json({
      success: false,
      message: req.t('feedback.failed_to_retrieve')
    });
  }
});

// Update feedback status (admin/management only)
router.patch('/:id/status', authenticate, validateFeedbackUpdate, async (req, res) => {
  try {
    // Check if user has admin/management permissions
    if (!['super_admin', 'management'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: req.t('feedback.admin_privileges_required')
      });
    }

    const feedbackId = req.params.id;
    const { status, admin_response } = req.body;

    const updatedFeedback = await FeedbackService.updateFeedbackStatus(
      feedbackId,
      { status, admin_response },
      req.user.id
    );

    if (!updatedFeedback) {
      return res.status(404).json({
        success: false,
        message: req.t('feedback.not_found')
      });
    }

    res.json({
      success: true,
      message: req.t('feedback.status_updated_successfully'),
      data: updatedFeedback
    });
  } catch (error) {
    console.error('Error updating feedback status:', error);
    res.status(500).json({
      success: false,
      message: req.t('feedback.failed_to_update_status')
    });
  }
});

// Get feedback statistics (admin/management only)
router.get('/stats/dashboard', authenticate, async (req, res) => {
  try {
    // Check if user has admin/management permissions
    if (!['super_admin', 'management'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: req.t('feedback.admin_privileges_required')
      });
    }

    const stats = await FeedbackService.getFeedbackStats(req.user.compound_id);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting feedback stats:', error);
    res.status(500).json({
      success: false,
      message: req.t('feedback.failed_to_retrieve_stats')
    });
  }
});

// Delete feedback (admin only)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    // Check if user has super admin permissions
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: req.t('feedback.super_admin_privileges_required')
      });
    }

    const feedbackId = req.params.id;
    const deleted = await FeedbackService.deleteFeedback(feedbackId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: req.t('feedback.not_found')
      });
    }

    res.json({
      success: true,
      message: req.t('feedback.deleted_successfully')
    });
  } catch (error) {
    console.error('Error deleting feedback:', error);
    res.status(500).json({
      success: false,
      message: req.t('feedback.failed_to_delete')
    });
  }
});

module.exports = router;