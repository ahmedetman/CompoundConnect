const db = require('../database/connection');

class FeedbackService {
  // Submit new feedback
  static async submitFeedback(feedbackData) {
    const {
      user_id,
      compound_id,
      type,
      category,
      title,
      description,
      priority = 'medium',
      device_info,
      app_version,
      attachments = [],
      is_anonymous = false,
      language = 'en'
    } = feedbackData;

    try {
      const result = await db.run(`
        INSERT INTO feedback (
          user_id, compound_id, type, category, title, description,
          priority, device_info, app_version, attachments, is_anonymous, language
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        user_id,
        compound_id,
        type,
        category,
        title,
        description,
        priority,
        device_info,
        app_version,
        JSON.stringify(attachments),
        is_anonymous ? 1 : 0,
        language
      ]);

      return await this.getFeedbackById(result.lastID);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      throw new Error('Failed to submit feedback');
    }
  }

  // Get feedback by ID
  static async getFeedbackById(feedbackId) {
    try {
      const feedback = await db.get(`
        SELECT 
          f.*,
          u.name as user_name,
          u.email as user_email,
          admin.name as admin_name
        FROM feedback f
        LEFT JOIN users u ON f.user_id = u.id
        LEFT JOIN users admin ON f.admin_user_id = admin.id
        WHERE f.id = ?
      `, [feedbackId]);

      if (feedback && feedback.attachments) {
        feedback.attachments = JSON.parse(feedback.attachments);
      }

      return feedback;
    } catch (error) {
      console.error('Error getting feedback by ID:', error);
      throw new Error('Failed to retrieve feedback');
    }
  }

  // Get all feedback for a compound with filters
  static async getFeedbackList(compoundId, filters = {}) {
    const {
      type,
      category,
      status,
      priority,
      user_id,
      page = 1,
      limit = 20,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = filters;

    try {
      let whereClause = 'WHERE f.compound_id = ?';
      const params = [compoundId];

      if (type) {
        whereClause += ' AND f.type = ?';
        params.push(type);
      }

      if (category) {
        whereClause += ' AND f.category = ?';
        params.push(category);
      }

      if (status) {
        whereClause += ' AND f.status = ?';
        params.push(status);
      }

      if (priority) {
        whereClause += ' AND f.priority = ?';
        params.push(priority);
      }

      if (user_id) {
        whereClause += ' AND f.user_id = ?';
        params.push(user_id);
      }

      const offset = (page - 1) * limit;

      const feedbackList = await db.all(`
        SELECT 
          f.*,
          u.name as user_name,
          u.email as user_email,
          admin.name as admin_name
        FROM feedback f
        LEFT JOIN users u ON f.user_id = u.id
        LEFT JOIN users admin ON f.admin_user_id = admin.id
        ${whereClause}
        ORDER BY f.${sort_by} ${sort_order}
        LIMIT ? OFFSET ?
      `, [...params, limit, offset]);

      // Parse attachments JSON for each feedback
      feedbackList.forEach(feedback => {
        if (feedback.attachments) {
          feedback.attachments = JSON.parse(feedback.attachments);
        }
      });

      // Get total count for pagination
      const countResult = await db.get(`
        SELECT COUNT(*) as total
        FROM feedback f
        ${whereClause}
      `, params);

      return {
        feedback: feedbackList,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult.total,
          pages: Math.ceil(countResult.total / limit)
        }
      };
    } catch (error) {
      console.error('Error getting feedback list:', error);
      throw new Error('Failed to retrieve feedback list');
    }
  }

  // Update feedback status (admin only)
  static async updateFeedbackStatus(feedbackId, statusData, adminUserId) {
    const { status, admin_response } = statusData;

    try {
      await db.run(`
        UPDATE feedback 
        SET status = ?, admin_response = ?, admin_user_id = ?, 
            responded_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [status, admin_response, adminUserId, feedbackId]);

      return await this.getFeedbackById(feedbackId);
    } catch (error) {
      console.error('Error updating feedback status:', error);
      throw new Error('Failed to update feedback status');
    }
  }

  // Get feedback statistics for dashboard
  static async getFeedbackStats(compoundId) {
    try {
      const stats = await db.all(`
        SELECT 
          status,
          type,
          priority,
          COUNT(*) as count
        FROM feedback 
        WHERE compound_id = ?
        GROUP BY status, type, priority
      `, [compoundId]);

      const summary = await db.get(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'open' THEN 1 END) as open,
          COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
          COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved,
          COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed,
          COUNT(CASE WHEN type = 'bug' THEN 1 END) as bugs,
          COUNT(CASE WHEN type = 'feature_request' THEN 1 END) as feature_requests,
          COUNT(CASE WHEN priority = 'critical' THEN 1 END) as critical,
          COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority
        FROM feedback 
        WHERE compound_id = ?
      `, [compoundId]);

      return {
        summary,
        detailed_stats: stats
      };
    } catch (error) {
      console.error('Error getting feedback stats:', error);
      throw new Error('Failed to retrieve feedback statistics');
    }
  }

  // Delete feedback (admin only)
  static async deleteFeedback(feedbackId) {
    try {
      const result = await db.run('DELETE FROM feedback WHERE id = ?', [feedbackId]);
      return result.changes > 0;
    } catch (error) {
      console.error('Error deleting feedback:', error);
      throw new Error('Failed to delete feedback');
    }
  }

  // Get user's own feedback
  static async getUserFeedback(userId, filters = {}) {
    const { page = 1, limit = 10, status } = filters;

    try {
      let whereClause = 'WHERE f.user_id = ?';
      const params = [userId];

      if (status) {
        whereClause += ' AND f.status = ?';
        params.push(status);
      }

      const offset = (page - 1) * limit;

      const feedbackList = await db.all(`
        SELECT 
          f.*,
          admin.name as admin_name
        FROM feedback f
        LEFT JOIN users admin ON f.admin_user_id = admin.id
        ${whereClause}
        ORDER BY f.created_at DESC
        LIMIT ? OFFSET ?
      `, [...params, limit, offset]);

      // Parse attachments JSON for each feedback
      feedbackList.forEach(feedback => {
        if (feedback.attachments) {
          feedback.attachments = JSON.parse(feedback.attachments);
        }
      });

      const countResult = await db.get(`
        SELECT COUNT(*) as total
        FROM feedback f
        ${whereClause}
      `, params);

      return {
        feedback: feedbackList,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult.total,
          pages: Math.ceil(countResult.total / limit)
        }
      };
    } catch (error) {
      console.error('Error getting user feedback:', error);
      throw new Error('Failed to retrieve user feedback');
    }
  }
}

module.exports = FeedbackService;