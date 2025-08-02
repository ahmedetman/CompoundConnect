const Joi = require('joi');

// Validation middleware factory
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error } = schema.validate(req[property]);
    
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      return res.status(400).json({
        error: 'Validation error',
        details: errorMessage
      });
    }
    
    next();
  };
};

// Authentication schemas
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});

const registerPersonnelSchema = Joi.object({
  invite_code: Joi.string().required(),
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});

const refreshTokenSchema = Joi.object({
  refresh_token: Joi.string().required()
});

// QR Code schemas
const createVisitorQRSchema = Joi.object({
  unit_id: Joi.number().integer().positive().required(),
  visitor_name: Joi.string().min(2).max(100).required(),
  num_persons: Joi.number().integer().min(1).max(20).default(1),
  vehicle_plate: Joi.string().max(20).allow('', null),
  valid_from: Joi.date().iso().required(),
  valid_to: Joi.date().iso().greater(Joi.ref('valid_from')).required()
});

const validateQRSchema = Joi.object({
  qr_data: Joi.string().required(),
  location_tag: Joi.string().max(50).allow('', null)
});

// Management schemas
const createUnitSchema = Joi.object({
  unit_number: Joi.string().min(1).max(20).required()
});

const assignUserToUnitSchema = Joi.object({
  user_id: Joi.number().integer().positive().required(),
  relationship: Joi.string().valid('owner', 'spouse', 'child', 'tenant').default('owner')
});

const updatePaymentSchema = Joi.object({
  service_id: Joi.number().integer().positive().required(),
  season_id: Joi.number().integer().positive().required(),
  status: Joi.string().valid('paid', 'due', 'overdue').required(),
  amount: Joi.number().positive().allow(null),
  paid_on_date: Joi.date().iso().allow(null)
});

const createPersonnelInviteSchema = Joi.object({
  role: Joi.string().valid('security', 'pool_staff', 'facility_staff').required(),
  expires_in_hours: Joi.number().integer().min(1).max(168).default(24) // Max 1 week
});

const createSeasonSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  start_date: Joi.date().iso().required(),
  end_date: Joi.date().iso().greater(Joi.ref('start_date')).required()
});

const updateSeasonSchema = Joi.object({
  name: Joi.string().min(2).max(50),
  start_date: Joi.date().iso(),
  end_date: Joi.date().iso(),
  is_active: Joi.boolean()
}).min(1);

const createNewsSchema = Joi.object({
  title: Joi.string().min(2).max(200).required(),
  content: Joi.string().min(10).max(2000).required(),
  type: Joi.string().valid('news', 'alert', 'maintenance', 'event').default('news'),
  priority: Joi.string().valid('low', 'normal', 'high', 'urgent').default('normal'),
  expires_at: Joi.date().iso().allow(null)
});

const updateNewsSchema = Joi.object({
  title: Joi.string().min(2).max(200),
  content: Joi.string().min(10).max(2000),
  type: Joi.string().valid('news', 'alert', 'maintenance', 'event'),
  priority: Joi.string().valid('low', 'normal', 'high', 'urgent'),
  is_published: Joi.boolean(),
  expires_at: Joi.date().iso().allow(null)
}).min(1);

// User management schemas
const createUserSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('super_admin', 'management', 'owner', 'security', 'pool_staff', 'facility_staff').required(),
  profile_picture_url: Joi.string().uri().allow('', null)
});

const updateUserSchema = Joi.object({
  name: Joi.string().min(2).max(100),
  email: Joi.string().email(),
  profile_picture_url: Joi.string().uri().allow('', null),
  is_active: Joi.boolean()
}).min(1);

const changePasswordSchema = Joi.object({
  current_password: Joi.string().required(),
  new_password: Joi.string().min(6).required()
});

// Query parameter schemas
const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sort_by: Joi.string().max(50),
  sort_order: Joi.string().valid('asc', 'desc').default('desc')
});

const dateRangeSchema = Joi.object({
  start_date: Joi.date().iso(),
  end_date: Joi.date().iso().greater(Joi.ref('start_date'))
});

// Service schemas
const createServiceSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().max(500).allow('', null),
  price: Joi.number().positive().required()
});

const updateServiceSchema = Joi.object({
  name: Joi.string().min(2).max(100),
  description: Joi.string().max(500).allow('', null),
  price: Joi.number().positive(),
  is_active: Joi.boolean()
}).min(1);

// Feedback schemas
const feedbackSchema = Joi.object({
  type: Joi.string().valid('bug', 'feature_request', 'improvement', 'general').required(),
  category: Joi.string().valid('app', 'qr_codes', 'payments', 'notifications', 'security', 'ui_ux', 'performance', 'other').optional(),
  title: Joi.string().min(5).max(200).required(),
  description: Joi.string().min(10).max(2000).required(),
  priority: Joi.string().valid('low', 'medium', 'high', 'critical').default('medium'),
  device_info: Joi.string().max(500).optional(),
  app_version: Joi.string().max(50).optional(),
  is_anonymous: Joi.boolean().default(false)
});

const feedbackUpdateSchema = Joi.object({
  status: Joi.string().valid('open', 'in_progress', 'resolved', 'closed', 'duplicate').required(),
  admin_response: Joi.string().max(1000).optional()
});

// Export validation middleware and schemas
module.exports = {
  validate,
  
  // Auth validations
  validateLogin: validate(loginSchema),
  validateRegisterPersonnel: validate(registerPersonnelSchema),
  validateRefreshToken: validate(refreshTokenSchema),
  
  // QR Code validations
  validateCreateVisitorQR: validate(createVisitorQRSchema),
  validateQR: validate(validateQRSchema),
  
  // Management validations
  validateCreateUnit: validate(createUnitSchema),
  validateAssignUserToUnit: validate(assignUserToUnitSchema),
  validateUpdatePayment: validate(updatePaymentSchema),
  validateCreatePersonnelInvite: validate(createPersonnelInviteSchema),
  
  // Season validations
  validateCreateSeason: validate(createSeasonSchema),
  validateUpdateSeason: validate(updateSeasonSchema),
  
  // News validations
  validateCreateNews: validate(createNewsSchema),
  validateUpdateNews: validate(updateNewsSchema),
  
  // User validations
  validateCreateUser: validate(createUserSchema),
  validateUpdateUser: validate(updateUserSchema),
  validateChangePassword: validate(changePasswordSchema),

  // Service validations
  validateCreateService: validate(createServiceSchema),
  validateUpdateService: validate(updateServiceSchema),

  // Feedback validations
  validateFeedback: validate(feedbackSchema),
  validateFeedbackUpdate: validate(feedbackUpdateSchema),

  // Query validations
  validatePagination: validate(paginationSchema, 'query'),
  validateDateRange: validate(dateRangeSchema, 'query'),

  // Custom validation helpers
  validateId: (paramName = 'id') => {
    const schema = Joi.object({
      [paramName]: Joi.number().integer().positive().required()
    });
    return validate(schema, 'params');
  }
};