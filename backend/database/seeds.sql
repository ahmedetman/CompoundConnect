
-- CompoundConnect Sample Data
-- This file contains sample data for testing and development

-- Clear existing data (in reverse order of dependencies)
DELETE FROM scan_logs;
DELETE FROM qr_codes;
DELETE FROM payments;
DELETE FROM services;
DELETE FROM unit_users;
DELETE FROM units;
DELETE FROM news_alerts;
DELETE FROM users WHERE email NOT LIKE '%democompound.com';
DELETE FROM seasons;
DELETE FROM compounds WHERE name != 'Demo Compound';

-- Sample Compounds
INSERT INTO compounds (name, address, contact_email, contact_phone, primary_color, secondary_color, accent_color) VALUES
('Demo Compound', '123 Main Street, Demo City, DC 12345', 'admin@democompound.com', '+1-555-0123', '#2563eb', '#1e40af', '#3b82f6'),
('Sunset Gardens', '456 Sunset Boulevard, Paradise City, PC 67890', 'management@sunsetgardens.com', '+1-555-0456', '#059669', '#047857', '#10b981'),
('Ocean View Residences', '789 Ocean Drive, Coastal Town, CT 54321', 'info@oceanview.com', '+1-555-0789', '#dc2626', '#b91c1c', '#ef4444');

-- Sample Seasons
INSERT INTO seasons (compound_id, name, start_date, end_date, is_active, description) VALUES
(1, 'Season 2024', '2024-01-01', '2024-12-31', TRUE, 'Main operational season for 2024'),
(1, 'Season 2023', '2023-01-01', '2023-12-31', FALSE, 'Previous year season'),
(2, 'Season 2024', '2024-01-01', '2024-12-31', TRUE, 'Sunset Gardens 2024 season'),
(3, 'Season 2024', '2024-01-01', '2024-12-31', TRUE, 'Ocean View 2024 season');

-- Sample Services
INSERT INTO services (compound_id, name, description, fee_amount, fee_type, category, is_mandatory, requires_payment) VALUES
(1, 'Security Service', 'Monthly security and surveillance fees', 50.00, 'per_unit', 'security', TRUE, TRUE),
(1, 'Maintenance Fee', 'General maintenance and upkeep of common areas', 75.00, 'per_unit', 'maintenance', TRUE, TRUE),
(1, 'Pool Access', 'Swimming pool access and maintenance', 25.00, 'per_unit', 'amenities', FALSE, TRUE),
(1, 'Gym Access', 'Gymnasium facilities access', 30.00, 'per_unit', 'amenities', FALSE, TRUE),
(1, 'Parking Fee', 'Additional parking space rental', 20.00, 'per_unit', 'utilities', FALSE, TRUE),
(2, 'Security Service', 'Security and access control', 60.00, 'per_unit', 'security', TRUE, TRUE),
(2, 'Maintenance Fee', 'Building and garden maintenance', 80.00, 'per_unit', 'maintenance', TRUE, TRUE),
(3, 'Security Service', 'Premium security services', 70.00, 'per_unit', 'security', TRUE, TRUE),
(3, 'Maintenance Fee', 'Luxury maintenance services', 100.00, 'per_unit', 'maintenance', TRUE, TRUE);

-- Sample Units
INSERT INTO units (compound_id, unit_number, unit_type, floor_number, building_name, area_sqm, bedrooms, bathrooms, parking_spaces) VALUES
(1, 'A101', 'apartment', 1, 'Building A', 85.50, 2, 2, 1),
(1, 'A102', 'apartment', 1, 'Building A', 92.00, 3, 2, 1),
(1, 'A201', 'apartment', 2, 'Building A', 85.50, 2, 2, 1),
(1, 'A202', 'apartment', 2, 'Building A', 92.00, 3, 2, 1),
(1, 'B101', 'apartment', 1, 'Building B', 110.00, 3, 3, 2),
(1, 'B102', 'apartment', 1, 'Building B', 110.00, 3, 3, 2),
(1, 'V001', 'villa', 1, NULL, 250.00, 4, 3, 3),
(1, 'V002', 'villa', 1, NULL, 280.00, 5, 4, 3),
(1, 'T001', 'townhouse', 1, 'Townhouse Block', 180.00, 3, 3, 2),
(1, 'T002', 'townhouse', 1, 'Townhouse Block', 180.00, 3, 3, 2);

-- Sample Users (passwords are hashed versions of simple passwords for demo)
-- admin@democompound.com - password: admin123
-- owner1@democompound.com - password: owner123  
-- owner2@democompound.com - password: owner123
-- security@democompound.com - password: security123
-- pool@democompound.com - password: pool123
-- manager@democompound.com - password: manager123

INSERT INTO users (compound_id, email, password_hash, first_name, last_name, phone, role, is_active) VALUES
(1, 'admin@democompound.com', '$2b$12$rOFKNXkzjgxoqcULdJjSuuLhWBhWzRSVZmOWyJCwX.uN/zMqBUhLG', 'System', 'Administrator', '+1-555-1001', 'super_admin', TRUE),
(1, 'manager@democompound.com', '$2b$12$8YQKJTUvhBJQDHc.Vls7meWfMlMBhLQdVAQpBGLJYKVHHRIcpA5lK', 'John', 'Manager', '+1-555-1002', 'management', TRUE),
(1, 'owner1@democompound.com', '$2b$12$8YQKJTUvhBJQDHc.Vls7meWfMlMBhLQdVAQpBGLJYKVHHRIcpA5lK', 'Alice', 'Johnson', '+1-555-1101', 'owner', TRUE),
(1, 'owner2@democompound.com', '$2b$12$8YQKJTUvhBJQDHc.Vls7meWfMlMBhLQdVAQpBGLJYKVHRIcpA5lK', 'Bob', 'Smith', '+1-555-1102', 'owner', TRUE),
(1, 'owner3@democompound.com', '$2b$12$8YQKJTUvhBJQDHc.Vls7meWfMlMBhLQdVAQpBGLJYKVHHRIcpA5lK', 'Carol', 'Davis', '+1-555-1103', 'owner', TRUE),
(1, 'security@democompound.com', '$2b$12$2H5Y7ZQNmjgYqV9qwSsYxuH7k5jJJGqXwSWOGsQQzNPjIMLjfGHHy', 'Mike', 'Security', '+1-555-1201', 'security', TRUE),
(1, 'pool@democompound.com', '$2b$12$9X4Y8ZQNmjgYqV9qwSsYxuH7k5jJJGqXwSWOGsQQzNPjIMLjfGHHy', 'Sarah', 'Pool', '+1-555-1301', 'pool_staff', TRUE);

-- Sample Unit Assignments
INSERT INTO unit_users (unit_id, user_id, relationship, is_primary, start_date) VALUES
(1, 3, 'owner', TRUE, '2024-01-01'),    -- Alice owns A101
(2, 4, 'owner', TRUE, '2024-01-01'),    -- Bob owns A102
(3, 5, 'tenant', TRUE, '2024-02-01'),   -- Carol rents A201
(7, 3, 'owner', FALSE, '2024-01-01'),   -- Alice also owns V001
(8, 4, 'owner', FALSE, '2024-01-01');   -- Bob also owns V002

-- Sample Payments
INSERT INTO payments (unit_id, season_id, service_id, amount_due, amount_paid, payment_status, due_date, paid_date) VALUES
-- Unit A101 (Alice) - All paid
(1, 1, 1, 50.00, 50.00, 'paid', '2024-01-31', '2024-01-25'),
(1, 1, 2, 75.00, 75.00, 'paid', '2024-01-31', '2024-01-25'),
(1, 1, 3, 25.00, 25.00, 'paid', '2024-01-31', '2024-01-25'),

-- Unit A102 (Bob) - Partially paid
(2, 1, 1, 50.00, 50.00, 'paid', '2024-01-31', '2024-01-28'),
(2, 1, 2, 75.00, 0.00, 'pending', '2024-01-31', NULL),
(2, 1, 3, 25.00, 0.00, 'pending', '2024-01-31', NULL),

-- Unit A201 (Carol) - Overdue
(3, 1, 1, 50.00, 0.00, 'overdue', '2024-01-31', NULL),
(3, 1, 2, 75.00, 0.00, 'overdue', '2024-01-31', NULL),

-- Villa V001 (Alice) - All paid
(7, 1, 1, 50.00, 50.00, 'paid', '2024-01-31', '2024-01-25'),
(7, 1, 2, 75.00, 75.00, 'paid', '2024-01-31', '2024-01-25'),

-- Villa V002 (Bob) - Pending
(8, 1, 1, 50.00, 0.00, 'pending', '2024-01-31', NULL),
(8, 1, 2, 75.00, 0.00, 'pending', '2024-01-31', NULL);

-- Sample QR Codes (realistic hashes)
INSERT INTO qr_codes (compound_id, user_id, code_hash, qr_type, title, description, is_active, requires_payment_check) VALUES
(1, 3, 'a8f5d2e1c9b3a7f4e2d1c8b6a9f7e3d2c5b8a6f4e1d9c7b5a8f6e3d1c9b7a5f2e8d4c6b9a7f5e2d8c1b6a9f7e4d2c5b8a6f1e9d7c5b3a8f6e4d1c9b7a5f2e8d6c4b9a7f5e3d1c8b6a9f7e2d5c4b8a6f1e9d7c3b5a8f6e4d2c9b7a5f1e8d6c4b9a7f3e2d1c8b5a9f7e4d2c6b8a5f1e9d7c3b6a8f4e2d1c9b7a5f2e8d6c4b9a7f5e3d1c8b6a9f7e2d5c4b8a6f1e9d7c3b5a8f6e4d2c9b7a5f1e8d6c4b9a7f3e2d1c8b5a9f7e4d2c6b8a5f1e9d7c3b6a8f4e2d1c9b7a5f2e8', 'gate_access', 'Gate Access - Alice', 'Main gate access for Alice Johnson', TRUE, FALSE),
(1, 3, 'b9f6e3d2c8a5f7e4d1c9b6a8f5e2d7c4b9a6f3e1d8c5b7a9f6e4d2c8b5a7f3e1d9c6b8a5f2e7d4c9b6a8f5e3d1c7b4a9f6e2d8c5b7a3f1e9d6c4b8a5f7e2d1c9b6a8f4e3d7c5b9a6f1e8d4c7b5a9f3e2d1c6b8a5f7e4d2c9b6a3f1e8d5c7b4a9f6e2d1c8b5a7f3e9d6c4b8a1f5e2d7c9b6a8f4e3d1c5b7a9f6e2d8c4b1a7f3e5d9c6b8a2f4e1d7c5b9a6f3e8d4c1b7a5f2e9d6c8b3a7f4e1d5c9b6a8f2e3d7c4b1a9f5e2d8c6b7a3f1e4d9c5b8a6f2e1d7c4b9a5f3e8d6c1b7a4f2e9d5c8b6a3f1e7d4c9b5a8f2e6d1c7b4a9f3e5d8c6b1a7f4e2d9c5b8a6f1e3d7c4b9a2f5e8d6c1b7a3f4e2d9c5b8a6f1e7d4c3b9a5f2e8d6c1b7a4f3e9d5c8b6a2f1e7d4c9b5a8f3e6d1c7b4a9f2e5d8c6b1a7f4e3d9c5b8a6f1e2d7c4b9a3f5e8d6c1b7a4f2e9d5c8b6a3f1e7d4c9b5a8f2e6d1c7b4a9f3e5d8c6b1a7f4e2d9c5b8a6f1e3d7c4b9a2f5e8d6c1b7a3f4e2d9c5b8a6f1e7d4c3b9a5f2e8d6c1b7a4f3e9d5c8b6a2f1e7d4c9', 'pool_access', 'Pool Access - Alice', 'Swimming pool access for Alice Johnson', TRUE, TRUE),
(1, 4, 'c8f5e2d9b6a3f7e4d1c8b5a9f6e3d2c7b4a8f5e1d9c6b3a7f4e2d8c5b9a6f3e1d7c4b8a5f2e9d6c3b7a4f1e8d5c9b6a3f7e2d4c1b8a5f9e6d3c7b4a1f8e5d2c9b6a7f3e4d1c8b5a9f6e2d7c4b1a8f5e3d9c6b7a4f2e1d8c5b9a6f3e7d4c1b8a5f2e9d6c3b7a4f1e8d5c9b6a3f7e2d4c1b8a5f9e6d3c7b4a1f8e5d2c9b6a7f3e4d1c8b5a9f6e2d7c4b1a8f5e3d9c6b7a4f2e1d8c5b9a6f3e7d4c1b8a5f2e9d6c3b7a4f1e8d5c9b6a3f7e2d4c1b8a5f9e6d3c7b4a1f8e5d2c9b6a7f3e4d1c8b5a9f6e2d7c4b1a8f5e3d9c6b7a4f2e1d8c5b9a6f3e7d4c1b8a5f2e9d6c3b7a4f1e8d5c9b6a3f7e2d4c1b8a5f9e6d3c7b4a1f8e5d2c9b6a7f3e4d1c8b5a9f6e2d7c4b1a8f5e3d9c6b7a4f2e1d8c5b9a6f3e7d4c1b8a5f2e9d6c3b7a4f1e8d5c9b6a3f7e2d4c1b8a5f9e6d3c7b4a1f8e5d2c9b6a7f3e4d1c8b5a9f6e2d7c4b1a8f5e3d9c6b7a4f2e1d8c5b9a6f3e7d4c1b8a5f2e9d6c3b7a4f1e8d5c9', 'gate_access', 'Gate Access - Bob', 'Main gate access for Bob Smith', TRUE, FALSE),
(1, 4, 'd7f4e1c8b5a9f6e3d2c7b4a8f5e2d9c6b3a7f4e1d8c5b9a6f3e2d7c4b8a5f1e9d6c3b7a4f2e8d5c9b6a3f7e4d1c8b5a9f6e2d7c4b1a8f5e3d9c6b7a4f2e1d8c5b9a6f3e7d4c1b8a5f2e9d6c3b7a4f1e8d5c9b6a3f7e2d4c1b8a5f9e6d3c7b4a1f8e5d2c9b6a7f3e4d1c8b5a9f6e2d7c4b1a8f5e3d9c6b7a4f2e1d8c5b9a6f3e7d4c1b8a5f2e9d6c3b7a4f1e8d5c9b6a3f7e2d4c1b8a5f9e6d3c7b4a1f8e5d2c9b6a7f3e4d1c8b5a9f6e2d7c4b1a8f5e3d9c6b7a4f2e1d8c5b9a6f3e7d4c1b8a5f2e9d6c3b7a4f1e8d5c9b6a3f7e2d4c1b8a5f9e6d3c7b4a1f8e5d2c9b6a7f3e4d1c8b5a9f6e2d7c4b1a8f5e3d9c6b7a4f2e1d8c5b9a6f3e7d4c1b8a5f2e9d6c3b7a4f1e8d5c9b6a3f7e2d4c1b8a5f9e6d3c7b4a1f8e5d2c9b6a7f3e4d1c8b5a9f6e2d7c4b1a8f5e3d9c6b7a4f2e1d8c5b9a6f3e7d4c1b8a5f2e9d6c3b7a4f1e8d5c9b6a3f7e2d4c1b8a5f9e6d3c7b4a1f8e5d2c9b6a7f3e4d1c8b5a9f6e2d7c4b1a8f5e3d9c6b7a4f2e1d8c5b9a6f3e7d4c1b8a5f2e9d6c3b7a4f1e8d5c9', 'pool_access', 'Pool Access - Bob', 'Swimming pool access for Bob Smith', TRUE, TRUE),
(1, 5, 'e6f3d9c5b8a2f7e4d1c6b9a5f3e2d8c4b7a6f1e9d5c2b8a4f7e3d1c6b9a5f2e8d4c7b1a9f6e3d2c5b8a4f1e7d9c6b3a5f2e8d4c7b1a9f6e3d5c2b8a4f7e1d9c6b3a5f2e8d4c7b1a9f6e3d2c5b8a4f1e7d9c6b3a5f2e8d4c7b1a9f6e3d5c2b8a4f7e1d9c6b3a5f2e8d4c7b1a9f6e3d2c5b8a4f1e7d9c6b3a5f2e8d4c7b1a9f6e3d5c2b8a4f7e1d9c6b3a5f2e8d4c7b1a9f6e3d2c5b8a4f1e7d9c6b3a5f2e8d4c7b1a9f6e3d5c2b8a4f7e1d9c6b3a5f2e8d4c7b1a9f6e3d2c5b8a4f1e7d9c6b3a5f2e8d4c7b1a9f6e3d5c2b8a4f7e1d9c6b3a5f2e8d4c7b1a9f6e3d2c5b8a4f1e7d9c6b3a5f2e8d4c7b1a9f6e3d5c2b8a4f7e1d9c6b3a5f2e8d4c7b1a9f6e3d2c5b8a4f1e7d9c6b3a5f2e8d4c7b1a9f6e3d5c2b8a4f7e1d9c6b3a5f2e8d4c7b1a9f6e3d2c5b8a4f1e7d9c6b3a5f2e8d4c7b1a9f6e3d5c2b8a4f7e1d9c6b3a5f2e8d4c7b1a9f6e3d2c5b8a4f1e7d9c6b3a5f2e8d4c7b1a9f6e3d5c2b8a4f7e1d9c6b3a5f2e8d4c7b1a9f6e3d2c5b8a4f1e7d9c6b3a5f2e8d4c7b1a9f6e3d5c2b8a4f7e1d9c6b3a5f2e8', 'gate_access', 'Gate Access - Carol', 'Main gate access for Carol Davis', TRUE, FALSE);

-- Sample News/Alerts
INSERT INTO news_alerts (compound_id, title, content, alert_type, target_audience, is_active, created_by_user_id) VALUES
(1, 'Welcome to Demo Compound', 'Welcome to our compound management system. Please ensure all payments are up to date for continued access to facilities.', 'info', 'all', TRUE, 2),
(1, 'Pool Maintenance Schedule', 'The swimming pool will be closed for maintenance on Saturday from 8 AM to 12 PM. We apologize for any inconvenience.', 'warning', 'all', TRUE, 2),
(1, 'Security Reminder', 'Please remember to always carry your QR codes and avoid sharing them with unauthorized persons.', 'info', 'owners', TRUE, 2),
(1, 'Payment Due Reminder', 'Monthly service fees for January are due by the 31st. Please complete your payments to avoid service interruption.', 'urgent', 'owners', TRUE, 2);

-- Sample Scan Logs (recent activity)
INSERT INTO scan_logs (qr_code_id, scanned_by_user_id, scan_location, scan_result, scan_timestamp, ip_address) VALUES
(1, 6, 'Main Gate', 'success', DATE_SUB(NOW(), INTERVAL 2 HOUR), '192.168.1.100'),
(2, 7, 'Pool Entrance', 'success', DATE_SUB(NOW(), INTERVAL 1 HOUR), '192.168.1.101'),
(3, 6, 'Main Gate', 'success', DATE_SUB(NOW(), INTERVAL 30 MINUTE), '192.168.1.100'),
(4, 7, 'Pool Entrance', 'payment_required', DATE_SUB(NOW(), INTERVAL 15 MINUTE), '192.168.1.101'),
(5, 6, 'Main Gate', 'success', DATE_SUB(NOW(), INTERVAL 5 MINUTE), '192.168.1.100');
