
-- CompoundConnect Database Schema
-- Multi-tenant residential compound management system

-- Drop existing tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS scan_logs;
DROP TABLE IF EXISTS qr_codes;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS services;
DROP TABLE IF EXISTS unit_users;
DROP TABLE IF EXISTS units;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS seasons;
DROP TABLE IF EXISTS compounds;

-- Create compounds table
CREATE TABLE compounds (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    logo_url VARCHAR(500),
    primary_color VARCHAR(7) DEFAULT '#2563eb',
    secondary_color VARCHAR(7) DEFAULT '#1e40af',
    accent_color VARCHAR(7) DEFAULT '#3b82f6',
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    timezone VARCHAR(50) DEFAULT 'UTC',
    settings JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_compounds_name (name)
);

-- Create seasons table for payment tracking periods
CREATE TABLE seasons (
    id INT PRIMARY KEY AUTO_INCREMENT,
    compound_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (compound_id) REFERENCES compounds(id) ON DELETE CASCADE,
    INDEX idx_seasons_compound (compound_id),
    INDEX idx_seasons_active (is_active),
    INDEX idx_seasons_dates (start_date, end_date)
);

-- Create users table with role-based system
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    compound_id INT NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    photo_url VARCHAR(500),
    role ENUM('super_admin', 'management', 'owner', 'security', 'pool_staff') NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    invite_code VARCHAR(100),
    invite_expires_at TIMESTAMP NULL,
    fcm_token VARCHAR(500),
    last_login_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (compound_id) REFERENCES compounds(id) ON DELETE CASCADE,
    INDEX idx_users_email (email),
    INDEX idx_users_compound (compound_id),
    INDEX idx_users_role (role),
    INDEX idx_users_active (is_active),
    INDEX idx_users_invite (invite_code, invite_expires_at)
);

-- Create units table for residential units
CREATE TABLE units (
    id INT PRIMARY KEY AUTO_INCREMENT,
    compound_id INT NOT NULL,
    unit_number VARCHAR(50) NOT NULL,
    unit_type ENUM('apartment', 'villa', 'townhouse', 'studio') NOT NULL,
    floor_number INT,
    building_name VARCHAR(255),
    area_sqm DECIMAL(10,2),
    bedrooms INT DEFAULT 0,
    bathrooms INT DEFAULT 0,
    parking_spaces INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (compound_id) REFERENCES compounds(id) ON DELETE CASCADE,
    UNIQUE KEY uk_compound_unit (compound_id, unit_number),
    INDEX idx_units_compound (compound_id),
    INDEX idx_units_number (unit_number),
    INDEX idx_units_active (is_active)
);

-- Create unit_users join table for unit ownership/residency
CREATE TABLE unit_users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    unit_id INT NOT NULL,
    user_id INT NOT NULL,
    relationship ENUM('owner', 'tenant', 'family_member', 'authorized_user') NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    start_date DATE NOT NULL,
    end_date DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uk_unit_user (unit_id, user_id),
    INDEX idx_unit_users_unit (unit_id),
    INDEX idx_unit_users_user (user_id),
    INDEX idx_unit_users_primary (is_primary),
    INDEX idx_unit_users_dates (start_date, end_date)
);

-- Create services table for compound services and fees
CREATE TABLE services (
    id INT PRIMARY KEY AUTO_INCREMENT,
    compound_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    fee_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    fee_currency VARCHAR(3) DEFAULT 'USD',
    fee_type ENUM('per_unit', 'per_person', 'per_sqm', 'fixed') NOT NULL,
    is_mandatory BOOLEAN DEFAULT TRUE,
    requires_payment BOOLEAN DEFAULT TRUE,
    category ENUM('maintenance', 'security', 'utilities', 'amenities', 'other') DEFAULT 'other',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (compound_id) REFERENCES compounds(id) ON DELETE CASCADE,
    INDEX idx_services_compound (compound_id),
    INDEX idx_services_active (is_active),
    INDEX idx_services_category (category)
);

-- Create payments table for tracking unit payments per season
CREATE TABLE payments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    unit_id INT NOT NULL,
    season_id INT NOT NULL,
    service_id INT NOT NULL,
    amount_due DECIMAL(10,2) NOT NULL,
    amount_paid DECIMAL(10,2) DEFAULT 0.00,
    payment_status ENUM('pending', 'partial', 'paid', 'overdue') DEFAULT 'pending',
    due_date DATE,
    paid_date DATE NULL,
    payment_method VARCHAR(100),
    transaction_reference VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
    FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
    UNIQUE KEY uk_unit_season_service (unit_id, season_id, service_id),
    INDEX idx_payments_unit (unit_id),
    INDEX idx_payments_season (season_id),
    INDEX idx_payments_service (service_id),
    INDEX idx_payments_status (payment_status),
    INDEX idx_payments_due_date (due_date)
);

-- Create qr_codes table for QR code management
CREATE TABLE qr_codes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    compound_id INT NOT NULL,
    user_id INT NULL,
    code_hash VARCHAR(255) NOT NULL UNIQUE,
    qr_type ENUM('gate_access', 'pool_access', 'gym_access', 'visitor_pass', 'service_access') NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    requires_payment_check BOOLEAN DEFAULT FALSE,
    max_uses INT NULL,
    current_uses INT DEFAULT 0,
    valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP NULL,
    visitor_name VARCHAR(255) NULL,
    visitor_phone VARCHAR(50) NULL,
    num_persons INT DEFAULT 1,
    vehicle_plate VARCHAR(50) NULL,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (compound_id) REFERENCES compounds(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_qr_codes_hash (code_hash),
    INDEX idx_qr_codes_compound (compound_id),
    INDEX idx_qr_codes_user (user_id),
    INDEX idx_qr_codes_type (qr_type),
    INDEX idx_qr_codes_active (is_active),
    INDEX idx_qr_codes_validity (valid_from, valid_until)
);

-- Create scan_logs table for QR scan history and validation logs
CREATE TABLE scan_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    qr_code_id INT NOT NULL,
    scanned_by_user_id INT NOT NULL,
    scan_location VARCHAR(255),
    scan_result ENUM('success', 'expired', 'inactive', 'payment_required', 'invalid', 'max_uses_exceeded') NOT NULL,
    scan_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    device_info JSON,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (qr_code_id) REFERENCES qr_codes(id) ON DELETE CASCADE,
    FOREIGN KEY (scanned_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_scan_logs_qr_code (qr_code_id),
    INDEX idx_scan_logs_user (scanned_by_user_id),
    INDEX idx_scan_logs_timestamp (scan_timestamp),
    INDEX idx_scan_logs_result (scan_result),
    INDEX idx_scan_logs_location (scan_location)
);

-- Create additional tables for enhanced functionality

-- News and alerts table
CREATE TABLE news_alerts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    compound_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    alert_type ENUM('info', 'warning', 'urgent', 'maintenance') DEFAULT 'info',
    is_active BOOLEAN DEFAULT TRUE,
    target_audience ENUM('all', 'owners', 'tenants', 'staff') DEFAULT 'all',
    expires_at TIMESTAMP NULL,
    created_by_user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (compound_id) REFERENCES compounds(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_news_compound (compound_id),
    INDEX idx_news_active (is_active),
    INDEX idx_news_type (alert_type),
    INDEX idx_news_expires (expires_at)
);

-- Insert initial data
INSERT INTO compounds (name, address, contact_email, contact_phone) VALUES
('Demo Compound', '123 Main Street, Demo City', 'admin@democompound.com', '+1-555-0123');

INSERT INTO seasons (compound_id, name, start_date, end_date, is_active) VALUES
(1, 'Season 2024', '2024-01-01', '2024-12-31', TRUE);

INSERT INTO services (compound_id, name, description, fee_amount, fee_type, category) VALUES
(1, 'Security Service', 'Monthly security fees', 50.00, 'per_unit', 'security'),
(1, 'Maintenance Fee', 'General maintenance and upkeep', 75.00, 'per_unit', 'maintenance'),
(1, 'Pool Access', 'Swimming pool access and maintenance', 25.00, 'per_unit', 'amenities');

-- Add a super admin user (password: admin123)
INSERT INTO users (compound_id, email, password_hash, first_name, last_name, role) VALUES
(1, 'admin@democompound.com', '$2b$10$rOFKNXkzjgxoqcULdJjSuuLhWBhWzRSVZmOWyJCwX.uN/zMqBUhLG', 'System', 'Administrator', 'super_admin');

-- Add demo units
INSERT INTO units (compound_id, unit_number, unit_type, floor_number, bedrooms, bathrooms) VALUES
(1, 'A101', 'apartment', 1, 2, 2),
(1, 'A102', 'apartment', 1, 3, 2),
(1, 'V001', 'villa', 1, 4, 3);

-- Add demo owner user (password: owner123)
INSERT INTO users (compound_id, email, password_hash, first_name, last_name, role) VALUES
(1, 'owner@democompound.com', '$2b$10$8YQKJTUvhBJQDHc.Vls7meWfMlMBhLQdVAQpBGLJYKVHHRIcpA5lK', 'John', 'Doe', 'owner');

-- Link owner to unit
INSERT INTO unit_users (unit_id, user_id, relationship, is_primary, start_date) VALUES
(1, 2, 'owner', TRUE, '2024-01-01');

-- Add security staff (password: security123)
INSERT INTO users (compound_id, email, password_hash, first_name, last_name, role) VALUES
(1, 'security@democompound.com', '$2b$10$2H5Y7ZQNmjgYqV9qwSsYxuH7k5jJJGqXwSWOGsQQzNPjIMLjfGHHy', 'Mike', 'Security', 'security');

-- Create initial payments for demo unit
INSERT INTO payments (unit_id, season_id, service_id, amount_due, payment_status) VALUES
(1, 1, 1, 50.00, 'pending'),
(1, 1, 2, 75.00, 'pending'),
(1, 1, 3, 25.00, 'paid');

-- Create views for common queries (after all tables are created)
CREATE VIEW active_users AS
SELECT u.*, c.name as compound_name
FROM users u
JOIN compounds c ON u.compound_id = c.id
WHERE u.is_active = TRUE;

CREATE VIEW unit_payment_status AS
SELECT 
    u.id as unit_id,
    u.unit_number,
    u.compound_id,
    s.id as season_id,
    s.name as season_name,
    COUNT(p.id) as total_services,
    SUM(CASE WHEN p.payment_status = 'paid' THEN 1 ELSE 0 END) as paid_services,
    SUM(p.amount_due) as total_due,
    SUM(p.amount_paid) as total_paid,
    CASE 
        WHEN COUNT(p.id) = SUM(CASE WHEN p.payment_status = 'paid' THEN 1 ELSE 0 END) THEN 'fully_paid'
        WHEN SUM(CASE WHEN p.payment_status = 'paid' THEN 1 ELSE 0 END) > 0 THEN 'partially_paid'
        ELSE 'not_paid'
    END as overall_status
FROM units u
JOIN seasons s ON u.compound_id = s.compound_id
LEFT JOIN payments p ON u.id = p.unit_id AND s.id = p.season_id
WHERE s.is_active = TRUE
GROUP BY u.id, s.id;
