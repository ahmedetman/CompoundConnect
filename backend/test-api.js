
const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

// Test credentials
const testCredentials = {
    admin: { email: 'admin@democompound.com', password: 'admin123' },
    manager: { email: 'manager@democompound.com', password: 'manager123' },
    owner1: { email: 'owner1@democompound.com', password: 'owner123' },
    owner2: { email: 'owner2@democompound.com', password: 'owner123' },
    security: { email: 'security@democompound.com', password: 'security123' },
    pool: { email: 'pool@democompound.com', password: 'pool123' }
};

let tokens = {};

async function login(userType) {
    try {
        const response = await axios.post(`${BASE_URL}/auth/login`, testCredentials[userType]);
        tokens[userType] = response.data.tokens.access_token;
        console.log(`✅ ${userType.toUpperCase()} login successful`);
        return response.data;
    } catch (error) {
        console.log(`❌ ${userType.toUpperCase()} login failed:`, error.response?.data?.message || error.message);
        throw error;
    }
}

async function testHealthCheck() {
    try {
        const response = await axios.get('http://localhost:3000/health');
        console.log('✅ Health check passed:', response.data.status);
        return true;
    } catch (error) {
        console.log('❌ Health check failed:', error.message);
        return false;
    }
}

async function testAuthEndpoints() {
    console.log('\n=== Testing Authentication Endpoints ===');
    
    // Test login for all user types
    for (const userType of Object.keys(testCredentials)) {
        await login(userType);
    }

    // Test token refresh
    try {
        const refreshResponse = await axios.post(`${BASE_URL}/auth/refresh`, {
            refresh_token: 'invalid_token'
        });
        console.log('❌ Token refresh should have failed');
    } catch (error) {
        console.log('✅ Token refresh properly rejected invalid token');
    }

    // Test get current user
    try {
        const response = await axios.get(`${BASE_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${tokens.owner1}` }
        });
        console.log('✅ Get current user successful:', response.data.user.email);
    } catch (error) {
        console.log('❌ Get current user failed:', error.response?.data?.message);
    }
}

async function testOwnerEndpoints() {
    console.log('\n=== Testing Owner Endpoints ===');
    
    const headers = { Authorization: `Bearer ${tokens.owner1}` };

    // Test get QR codes
    try {
        const response = await axios.get(`${BASE_URL}/owner/qrcodes`, { headers });
        console.log('✅ Get QR codes successful. Found', response.data.qr_codes.length, 'QR codes');
    } catch (error) {
        console.log('❌ Get QR codes failed:', error.response?.data?.message);
    }

    // Test create visitor QR
    try {
        const visitorData = {
            visitor_name: 'John Visitor',
            visitor_phone: '+1-555-9999',
            num_persons: 2,
            vehicle_plate: 'ABC123',
            valid_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        };
        
        const response = await axios.post(`${BASE_URL}/owner/visitors/generate`, visitorData, { headers });
        console.log('✅ Create visitor QR successful:', response.data.qr_code.visitor_name);
        
        // Store visitor QR ID for later tests
        global.testVisitorQRId = response.data.qr_code.id;
        global.testVisitorQRCode = response.data.qr_code.code;
        
    } catch (error) {
        console.log('❌ Create visitor QR failed:', error.response?.data?.message);
    }

    // Test get visitor passes
    try {
        const response = await axios.get(`${BASE_URL}/owner/visitors`, { headers });
        console.log('✅ Get visitor passes successful. Found', response.data.visitor_passes.length, 'passes');
    } catch (error) {
        console.log('❌ Get visitor passes failed:', error.response?.data?.message);
    }

    // Test get units
    try {
        const response = await axios.get(`${BASE_URL}/owner/units`, { headers });
        console.log('✅ Get owner units successful. Found', response.data.units.length, 'units');
    } catch (error) {
        console.log('❌ Get owner units failed:', error.response?.data?.message);
    }
}

async function testPersonnelEndpoints() {
    console.log('\n=== Testing Personnel Endpoints ===');
    
    const headers = { Authorization: `Bearer ${tokens.security}` };

    // Test QR validation with a known QR code
    if (global.testVisitorQRCode) {
        try {
            const validationData = {
                qr_code: global.testVisitorQRCode,
                scan_location: 'Main Gate',
                device_info: {
                    device_type: 'scanner',
                    os: 'Android'
                }
            };
            
            const response = await axios.post(`${BASE_URL}/personnel/validate-qr`, validationData, { headers });
            console.log('✅ QR validation successful:', response.data.result);
        } catch (error) {
            console.log('❌ QR validation failed:', error.response?.data?.message);
        }
    }

    // Test scan history
    try {
        const response = await axios.get(`${BASE_URL}/personnel/scan-history`, { headers });
        console.log('✅ Get scan history successful. Found', response.data.scan_history.length, 'scans');
    } catch (error) {
        console.log('❌ Get scan history failed:', error.response?.data?.message);
    }

    // Test active visitors
    try {
        const response = await axios.get(`${BASE_URL}/personnel/active-visitors`, { headers });
        console.log('✅ Get active visitors successful. Found', response.data.active_visitors.length, 'active visitors');
    } catch (error) {
        console.log('❌ Get active visitors failed:', error.response?.data?.message);
    }
}

async function testManagementEndpoints() {
    console.log('\n=== Testing Management Endpoints ===');
    
    const headers = { Authorization: `Bearer ${tokens.manager}` };

    // Test get users
    try {
        const response = await axios.get(`${BASE_URL}/management/users`, { headers });
        console.log('✅ Get users successful. Found', response.data.users.length, 'users');
    } catch (error) {
        console.log('❌ Get users failed:', error.response?.data?.message);
    }

    // Test get units
    try {
        const response = await axios.get(`${BASE_URL}/management/units`, { headers });
        console.log('✅ Get units successful. Found', response.data.units.length, 'units');
    } catch (error) {
        console.log('❌ Get units failed:', error.response?.data?.message);
    }

    // Test payments report
    try {
        const response = await axios.get(`${BASE_URL}/management/reports/payments`, { headers });
        console.log('✅ Get payments report successful. Found', response.data.payments.length, 'payment records');
    } catch (error) {
        console.log('❌ Get payments report failed:', error.response?.data?.message);
    }

    // Test create new unit
    try {
        const unitData = {
            unit_number: 'TEST01',
            unit_type: 'apartment',
            floor_number: 1,
            bedrooms: 2,
            bathrooms: 1
        };
        
        const response = await axios.post(`${BASE_URL}/management/units`, unitData, { headers });
        console.log('✅ Create unit successful:', response.data.unit.unit_number);
        
        // Store for cleanup
        global.testUnitId = response.data.unit.id;
        
    } catch (error) {
        console.log('❌ Create unit failed:', error.response?.data?.message);
    }
}

async function testRoleBasedAccess() {
    console.log('\n=== Testing Role-Based Access Control ===');
    
    // Test owner trying to access management endpoint (should fail)
    try {
        const headers = { Authorization: `Bearer ${tokens.owner1}` };
        await axios.get(`${BASE_URL}/management/users`, { headers });
        console.log('❌ RBAC failed: Owner should not access management endpoints');
    } catch (error) {
        if (error.response?.status === 403) {
            console.log('✅ RBAC working: Owner properly denied access to management endpoints');
        } else {
            console.log('❌ RBAC test failed with unexpected error:', error.response?.data?.message);
        }
    }

    // Test security trying to access owner endpoint (should fail)
    try {
        const headers = { Authorization: `Bearer ${tokens.security}` };
        await axios.get(`${BASE_URL}/owner/qrcodes`, { headers });
        console.log('❌ RBAC failed: Security should not access owner endpoints');
    } catch (error) {
        if (error.response?.status === 403) {
            console.log('✅ RBAC working: Security properly denied access to owner endpoints');
        } else {
            console.log('❌ RBAC test failed with unexpected error:', error.response?.data?.message);
        }
    }

    // Test unauthenticated access (should fail)
    try {
        await axios.get(`${BASE_URL}/owner/qrcodes`);
        console.log('❌ Auth failed: Unauthenticated request should be denied');
    } catch (error) {
        if (error.response?.status === 401) {
            console.log('✅ Auth working: Unauthenticated request properly denied');
        } else {
            console.log('❌ Auth test failed with unexpected error:', error.response?.data?.message);
        }
    }
}

async function cleanup() {
    console.log('\n=== Cleanup ===');
    
    const headers = { Authorization: `Bearer ${tokens.manager}` };

    // Delete test visitor QR
    if (global.testVisitorQRId) {
        try {
            const ownerHeaders = { Authorization: `Bearer ${tokens.owner1}` };
            await axios.delete(`${BASE_URL}/owner/visitors/${global.testVisitorQRId}`, { headers: ownerHeaders });
            console.log('✅ Test visitor QR cleaned up');
        } catch (error) {
            console.log('❌ Failed to cleanup visitor QR:', error.response?.data?.message);
        }
    }

    // Delete test unit
    if (global.testUnitId) {
        try {
            // Note: Delete endpoint would need to be implemented in management routes
            console.log('ℹ️ Test unit cleanup skipped (delete endpoint not implemented)');
        } catch (error) {
            console.log('❌ Failed to cleanup test unit:', error.response?.data?.message);
        }
    }
}

async function runAllTests() {
    console.log('🚀 Starting CompoundConnect Backend API Tests\n');
    
    try {
        // Test basic connectivity
        const healthOk = await testHealthCheck();
        if (!healthOk) {
            console.log('❌ Health check failed. Is the server running?');
            return;
        }

        // Test all endpoints
        await testAuthEndpoints();
        await testOwnerEndpoints();
        await testPersonnelEndpoints();
        await testManagementEndpoints();
        await testRoleBasedAccess();
        
        // Cleanup test data
        await cleanup();
        
        console.log('\n🎉 All tests completed!');
        
    } catch (error) {
        console.log('\n💥 Test suite failed:', error.message);
    }
}

// Run tests if called directly
if (require.main === module) {
    runAllTests();
}

module.exports = {
    runAllTests,
    testCredentials,
    BASE_URL
};
