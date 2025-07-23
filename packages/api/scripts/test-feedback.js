#!/usr/bin/env node

/**
 * Feedback System Test Script
 * This script tests the feedback API endpoints to ensure everything is working correctly
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:3001/api';

// Test data
const testFeedback = {
  type: 'bug',
  category: 'app',
  title: 'Test Bug Report',
  description: 'This is a test bug report to verify the feedback system is working correctly.',
  priority: 'medium',
  device_info: JSON.stringify({
    platform: 'test',
    version: '1.0.0',
    model: 'Test Device'
  }),
  app_version: '1.0.0',
  is_anonymous: false
};

// Helper function to make HTTP requests
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({ status: res.statusCode, data: response });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Test functions
async function testServerHealth() {
  console.log('🔍 Testing server health...');
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/health',
      method: 'GET'
    });
    
    if (response.status === 200) {
      console.log('✅ Server is healthy');
      return true;
    } else {
      console.log('❌ Server health check failed:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Server is not running:', error.message);
    return false;
  }
}

async function testFeedbackOptions() {
  console.log('🔍 Testing feedback options endpoint...');
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/feedback/options?lang=en',
      method: 'GET'
    });
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ Feedback options endpoint working');
      console.log('   Types:', Object.keys(response.data.data.types).join(', '));
      console.log('   Categories:', Object.keys(response.data.data.categories).join(', '));
      return true;
    } else {
      console.log('❌ Feedback options test failed:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Feedback options test error:', error.message);
    return false;
  }
}

async function testFeedbackOptionsArabic() {
  console.log('🔍 Testing feedback options endpoint (Arabic)...');
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/feedback/options?lang=ar',
      method: 'GET',
      headers: {
        'Accept-Language': 'ar'
      }
    });
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ Arabic feedback options working');
      console.log('   Bug type in Arabic:', response.data.data.types.bug);
      return true;
    } else {
      console.log('❌ Arabic feedback options test failed:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Arabic feedback options test error:', error.message);
    return false;
  }
}

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...');
  try {
    // Check if database file exists
    const dbPath = path.join(__dirname, '../data/compound_connect.db');
    if (fs.existsSync(dbPath)) {
      console.log('✅ Database file exists');
      return true;
    } else {
      console.log('❌ Database file not found. Run migration first.');
      return false;
    }
  } catch (error) {
    console.log('❌ Database connection test error:', error.message);
    return false;
  }
}

async function testUploadsDirectory() {
  console.log('🔍 Testing uploads directory...');
  try {
    const uploadsPath = path.join(__dirname, '../uploads/feedback');
    if (!fs.existsSync(uploadsPath)) {
      fs.mkdirSync(uploadsPath, { recursive: true });
      console.log('✅ Created uploads/feedback directory');
    } else {
      console.log('✅ Uploads directory exists');
    }
    
    // Test write permissions
    const testFile = path.join(uploadsPath, 'test-write.txt');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    console.log('✅ Uploads directory is writable');
    return true;
  } catch (error) {
    console.log('❌ Uploads directory test error:', error.message);
    return false;
  }
}

async function testI18nFiles() {
  console.log('🔍 Testing i18n translation files...');
  try {
    const enPath = path.join(__dirname, '../src/locales/en.json');
    const arPath = path.join(__dirname, '../src/locales/ar.json');
    
    if (fs.existsSync(enPath) && fs.existsSync(arPath)) {
      const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
      const arData = JSON.parse(fs.readFileSync(arPath, 'utf8'));
      
      if (enData.feedback && arData.feedback) {
        console.log('✅ Translation files are valid');
        return true;
      } else {
        console.log('❌ Translation files missing feedback section');
        return false;
      }
    } else {
      console.log('❌ Translation files not found');
      return false;
    }
  } catch (error) {
    console.log('❌ Translation files test error:', error.message);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Feedback System Tests\n');
  
  const tests = [
    { name: 'Server Health', fn: testServerHealth },
    { name: 'Database Connection', fn: testDatabaseConnection },
    { name: 'Uploads Directory', fn: testUploadsDirectory },
    { name: 'I18n Files', fn: testI18nFiles },
    { name: 'Feedback Options (English)', fn: testFeedbackOptions },
    { name: 'Feedback Options (Arabic)', fn: testFeedbackOptionsArabic }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${test.name} failed with error:`, error.message);
      failed++;
    }
    console.log(''); // Empty line for readability
  }
  
  console.log('📊 Test Results:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! The feedback system is ready to use.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the issues above.');
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };