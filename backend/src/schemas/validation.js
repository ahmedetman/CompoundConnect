
const { z } = require('zod');

// Common schemas
const emailSchema = z.string().email().min(1).max(255);
const passwordSchema = z.string().min(6).max(128);
const phoneSchema = z.string().regex(/^\+?[1-9]\d{1,14}$/).optional();
const uuidSchema = z.string().uuid().optional();

// Authentication schemas
const loginSchema = z.object({
    email: emailSchema,
    password: passwordSchema
});

const registerSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
    first_name: z.string().min(1).max(255),
    last_name: z.string().min(1).max(255),
    phone: phoneSchema,
    invite_code: z.string().min(1).max(100)
});

const refreshTokenSchema = z.object({
    refresh_token: z.string().min(1)
});

// User schemas
const userCreateSchema = z.object({
    email: emailSchema,
    password: passwordSchema.optional(),
    first_name: z.string().min(1).max(255),
    last_name: z.string().min(1).max(255),
    phone: phoneSchema,
    role: z.enum(['management', 'owner', 'security', 'pool_staff']),
    unit_ids: z.array(z.number().int().positive()).optional(),
    relationship: z.enum(['owner', 'tenant', 'family_member', 'authorized_user']).optional()
});

const userUpdateSchema = z.object({
    first_name: z.string().min(1).max(255).optional(),
    last_name: z.string().min(1).max(255).optional(),
    phone: phoneSchema,
    is_active: z.boolean().optional(),
    role: z.enum(['management', 'owner', 'security', 'pool_staff']).optional()
});

// Unit schemas
const unitCreateSchema = z.object({
    unit_number: z.string().min(1).max(50),
    unit_type: z.enum(['apartment', 'villa', 'townhouse', 'studio']),
    floor_number: z.number().int().min(0).optional(),
    building_name: z.string().max(255).optional(),
    area_sqm: z.number().positive().optional(),
    bedrooms: z.number().int().min(0).optional(),
    bathrooms: z.number().int().min(0).optional(),
    parking_spaces: z.number().int().min(0).optional(),
    notes: z.string().max(1000).optional()
});

const unitUpdateSchema = z.object({
    unit_number: z.string().min(1).max(50).optional(),
    unit_type: z.enum(['apartment', 'villa', 'townhouse', 'studio']).optional(),
    floor_number: z.number().int().min(0).optional(),
    building_name: z.string().max(255).optional(),
    area_sqm: z.number().positive().optional(),
    bedrooms: z.number().int().min(0).optional(),
    bathrooms: z.number().int().min(0).optional(),
    parking_spaces: z.number().int().min(0).optional(),
    is_active: z.boolean().optional(),
    notes: z.string().max(1000).optional()
});

// QR Code schemas
const visitorQRCreateSchema = z.object({
    visitor_name: z.string().min(1).max(255),
    visitor_phone: phoneSchema,
    num_persons: z.number().int().min(1).max(20).default(1),
    vehicle_plate: z.string().max(50).optional(),
    valid_from: z.string().datetime().optional(),
    valid_until: z.string().datetime().optional(),
    notes: z.string().max(500).optional()
});

const qrValidationSchema = z.object({
    qr_code: z.string().min(1),
    scan_location: z.string().max(255).optional(),
    device_info: z.object({
        device_type: z.string().optional(),
        os: z.string().optional(),
        browser: z.string().optional()
    }).optional()
});

// Service schemas
const serviceCreateSchema = z.object({
    name: z.string().min(1).max(255),
    description: z.string().max(1000).optional(),
    fee_amount: z.number().min(0),
    fee_currency: z.string().length(3).default('USD'),
    fee_type: z.enum(['per_unit', 'per_person', 'per_sqm', 'fixed']),
    is_mandatory: z.boolean().default(true),
    requires_payment: z.boolean().default(true),
    category: z.enum(['maintenance', 'security', 'utilities', 'amenities', 'other']).default('other')
});

const serviceUpdateSchema = z.object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().max(1000).optional(),
    fee_amount: z.number().min(0).optional(),
    fee_currency: z.string().length(3).optional(),
    fee_type: z.enum(['per_unit', 'per_person', 'per_sqm', 'fixed']).optional(),
    is_mandatory: z.boolean().optional(),
    requires_payment: z.boolean().optional(),
    category: z.enum(['maintenance', 'security', 'utilities', 'amenities', 'other']).optional(),
    is_active: z.boolean().optional()
});

// Payment schemas
const paymentUpdateSchema = z.object({
    payment_status: z.enum(['pending', 'partial', 'paid', 'overdue']),
    amount_paid: z.number().min(0).optional(),
    payment_method: z.string().max(100).optional(),
    transaction_reference: z.string().max(255).optional(),
    notes: z.string().max(1000).optional()
});

// Season schemas
const seasonCreateSchema = z.object({
    name: z.string().min(1).max(255),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    description: z.string().max(1000).optional()
}).refine(data => new Date(data.end_date) > new Date(data.start_date), {
    message: "End date must be after start date",
    path: ["end_date"]
});

const seasonUpdateSchema = z.object({
    name: z.string().min(1).max(255).optional(),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    is_active: z.boolean().optional(),
    description: z.string().max(1000).optional()
});

// News/Alert schemas
const newsAlertCreateSchema = z.object({
    title: z.string().min(1).max(255),
    content: z.string().min(1),
    alert_type: z.enum(['info', 'warning', 'urgent', 'maintenance']).default('info'),
    target_audience: z.enum(['all', 'owners', 'tenants', 'staff']).default('all'),
    expires_at: z.string().datetime().optional()
});

const newsAlertUpdateSchema = z.object({
    title: z.string().min(1).max(255).optional(),
    content: z.string().min(1).optional(),
    alert_type: z.enum(['info', 'warning', 'urgent', 'maintenance']).optional(),
    target_audience: z.enum(['all', 'owners', 'tenants', 'staff']).optional(),
    is_active: z.boolean().optional(),
    expires_at: z.string().datetime().optional()
});

// Query parameter schemas
const paginationSchema = z.object({
    page: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1)).default('1'),
    limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(100)).default('20'),
    sort: z.string().optional(),
    order: z.enum(['ASC', 'DESC']).default('DESC')
});

const dateRangeSchema = z.object({
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});

module.exports = {
    // Auth
    loginSchema,
    registerSchema,
    refreshTokenSchema,
    
    // Users
    userCreateSchema,
    userUpdateSchema,
    
    // Units
    unitCreateSchema,
    unitUpdateSchema,
    
    // QR Codes
    visitorQRCreateSchema,
    qrValidationSchema,
    
    // Services
    serviceCreateSchema,
    serviceUpdateSchema,
    
    // Payments
    paymentUpdateSchema,
    
    // Seasons
    seasonCreateSchema,
    seasonUpdateSchema,
    
    // News/Alerts
    newsAlertCreateSchema,
    newsAlertUpdateSchema,
    
    // Query params
    paginationSchema,
    dateRangeSchema
};
