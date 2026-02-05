
import alert from './src/index'; // Adjust path as needed

// ============================================
// TEST SETUP
// ============================================
console.log('------------TESTING-PARSHU------------------');

// ============================================
// TEST DATA SAMPLES
// ============================================
const sampleJsonData = {
  timestamp: new Date().toISOString(),
  service: 'user-service',
  errorCode: 'ERR-500',
  user: {
    id: 12345,
    name: 'John Doe',
    email: 'john@example.com',
    preferences: {
      notifications: true,
      theme: 'dark'
    }
  },
  details: {
    action: 'profile_update',
    status: 'failed',
    error: {
      code: 'DB_CONN_ERR',
      message: 'Connection refused'
    }
  },
  tags: ['urgent', 'database', 'user-facing']
};

// Add a simpler text for TXT → CSV test
const simpleTextData = `Line 1: This is the first line
Line 2: Here is some data
Line 3: More information goes here
Line 4: Final line of the text file`;


const sampleCsvData = `id,name,email,status
1,John Doe,john@example.com,active
2,Jane Smith,jane@example.com,inactive
3,Bob Johnson,bob@example.com,active
4,Alice Brown,alice@example.com,pending`;

const sampleTextData = `ERROR LOG - User Service
Timestamp: ${new Date().toISOString()}
Service: user-service
Error: Database connection failed
Details: Could not connect to PostgreSQL on port 5432
Resolution: Check database service and credentials`;

const sampleArrayData = [
  { id: 1, name: 'Product A', price: 29.99, stock: 100 },
  { id: 2, name: 'Product B', price: 49.99, stock: 50 },
  { id: 3, name: 'Product C', price: 19.99, stock: 200 },
  { id: 4, name: 'Product D', price: 99.99, stock: 25 }
];

const sampleError = new Error('Database connection timeout');
sampleError.stack = `Error: Database connection timeout
    at connectDatabase (db.js:45:15)
    at getUserProfile (user.js:23:10)
    at handleRequest (server.js:67:20)
    at processTicksAndRejections (internal/process/task_queues.js:95:5)`;

// ============================================
// TEST FUNCTIONS
// ============================================

// Wait between tests to avoid rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runTests() {
  console.log('\n📋 Running tests...\n');
  
  

  try {
    // TEST 1: Simple error alert (no file)
    console.log('🧪 Test 1: Simple HIGH alert (no file)');
    alert.high(sampleError, {
      comment: 'This is a test alert without file attachment'
    });
    await delay(2000);

    // TEST 2: JSON file creation (direct)
    console.log('\n🧪 Test 2: MEDIUM alert with JSON file (direct creation)');
    alert.medium('API rate limit exceeded', {
      fileData: sampleJsonData,
      fileType: 'json',
      fileName: 'api-error-details',
      comment: 'JSON file created directly from object'
    });
    await delay(2000);

    // TEST 3: CSV file creation (direct)
    console.log('\n🧪 Test 3: LOW alert with CSV file (direct creation)');
    alert.low('User data export completed', {
      fileData: sampleArrayData,
      fileType: 'csv',
      fileName: 'user-export',
      comment: 'CSV file created directly from array of objects'
    });
    await delay(2000);

    // TEST 4: TXT file creation (direct)
    console.log('\n🧪 Test 4: HIGH alert with TXT file (direct creation)');
    alert.high(new Error('Server logs attached'), {
      fileData: sampleTextData,
      fileType: 'txt',
      fileName: 'server-logs',
      comment: 'TXT file with server logs'
    });
    await delay(2000);

    // TEST 5: JSON → CSV Conversion
    console.log('\n🧪 Test 5: JSON → CSV Conversion');
    alert.medium('Data format conversion required', {
      fileData: sampleJsonData,
      from: 'json',
      to: 'csv',
      fileName: 'converted-data',
      comment: 'Converted from JSON to CSV format'
    });
    await delay(2000);

    // TEST 6: CSV → JSON Conversion
    console.log('\n🧪 Test 6: CSV → JSON Conversion');
    alert.low('Import data ready for processing', {
      fileData: sampleCsvData,
      from: 'csv',
      to: 'json',
      fileName: 'import-data',
      comment: 'Converted from CSV to JSON format'
    });
    await delay(2000);

    // TEST 7: CSV → TXT Conversion
    console.log('\n🧪 Test 7: CSV → TXT Conversion');
    alert.high('CSV data needs review', {
      fileData: sampleCsvData,
      from: 'csv',
      to: 'txt',
      fileName: 'csv-to-text',
      comment: 'Converted from CSV to readable text'
    });
    await delay(2000);

    // TEST 8: TXT → JSON Conversion
    console.log('\n🧪 Test 8: TXT → JSON Conversion');
    alert.medium('Log analysis required', {
      fileData: sampleTextData,
      from: 'txt',
      to: 'json',
      fileName: 'logs-json',
      comment: 'Converted from text logs to structured JSON'
    });
    await delay(2000);

    // TEST 9: TXT → CSV Conversion
    console.log('\n🧪 Test 9: TXT → CSV Conversion with simpleTextData (with CSV headers)');
    alert.low('Text data needs tabular format', {
      fileData: simpleTextData,
      from: 'txt',
      to: 'csv',
      csvHeaders: ['lineNumber', 'content'],
      fileName: 'text-to-table',
      comment: 'Converted text to CSV with custom headers'
    });
    await delay(2000);

     // TEST 9****: TXT → CSV Conversion
    console.log('\n🧪 Test 9****: TXT → CSV Conversion with sampleTextData (with CSV headers)');
    alert.low('Text data needs tabular format', {
      fileData: sampleTextData,
      from: 'txt',
      to: 'csv',
      csvHeaders: ['lineNumber', 'content'],
      fileName: 'text-to-table',
      comment: 'Converted text to CSV with custom headers'
    });
    await delay(2000);

    // TEST 10: JSON → TXT Conversion
    console.log('\n🧪 Test 10: JSON → TXT Conversion');
    alert.high('Debug data for support team', {
      fileData: sampleJsonData,
      from: 'json',
      to: 'txt',
      fileName: 'debug-info',
      comment: 'Converted JSON debug data to readable text'
    });
    await delay(2000);

    // TEST 11: Error with different channel
    console.log('\n🧪 Test 11: Alert to different channel');
    alert.medium('Test to specific channel', {
      channelName: '#general', // Change to your test channel
      channelId: 'C1234567891', // Change to your test channel ID
      fileData: { test: 'channel-specific alert' },
      fileType: 'json',
      comment: 'This should go to a different channel'
    });
    await delay(2000);

    // TEST 12: String error (not Error object)
    console.log('\n🧪 Test 12: String error message');
    alert.low('This is a string error message', {
      fileData: { additional: 'context' },
      fileType: 'json',
      comment: 'Testing with string instead of Error object'
    });

    console.log('\n=========================================');
    console.log('✅ All tests initiated! Check your Slack channel.');
    console.log('=========================================\n');

    // Show library status
    console.log('📊 Library Status:');
    console.log(`- Initialized: ${alert.isInitialized()}`);
    const channelInfo = alert.getChannelInfo();
    console.log(`- Default Channel: ${channelInfo.name} (${channelInfo.id})`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// ============================================
// ERROR SCENARIO TESTS (Uncomment to test)
// ============================================

function testErrorScenarios() {
  console.log('\n🔴 Testing error scenarios...\n');
  
  // These should throw errors or show error messages
  
  // 1. Using both fileType and from/to (should error)
  console.log('1. Testing invalid: fileType + from/to');
  try {
    alert.low('Test', {
      fileData: sampleJsonData,
      fileType: 'json',
      from: 'json',
      to: 'csv'
    });
  } catch (error: any) {
    console.log('✅ Correctly rejected:', error.message);
  }

  // 2. Missing 'to' in conversion (should error)
  console.log('\n2. Testing invalid: missing "to"');
  try {
    alert.low('Test', {
      fileData: sampleJsonData,
      from: 'json'
      // Missing 'to'
    });
  } catch (error: any) {
    console.log('✅ Correctly rejected:', error.message);
  }

  // 3. Same format conversion (should error)
  console.log('\n3. Testing invalid: same format conversion');
  try {
    alert.low('Test', {
      fileData: sampleJsonData,
      from: 'json',
      to: 'json'
    });
  } catch (error: any) {
    console.log('✅ Correctly rejected:', error.message);
  }

  // 4. Invalid format type (should error)
  console.log('\n4. Testing invalid: wrong format type');
  try {
    alert.low('Test', {
      fileData: sampleJsonData,
      fileType: 'pdf' as any // Invalid type
    });
  } catch (error: any) {
    console.log('✅ Correctly rejected:', error.message);
  }
}

// ============================================
// RUN TESTS
// ============================================

async function main() {
  console.log(`
╔══════════════════════════════════════════╗
║   error-notifier TEST SUITE              ║
╚══════════════════════════════════════════╝
`);

  // Run normal tests
  await runTests();
  
  // Wait a bit then run error scenarios
  await delay(5000);
  
  // Uncomment to test error scenarios
  // testErrorScenarios();
  
  console.log('\n🎉 Test suite completed!');
  console.log('\n📝 Check your Slack channel for all test messages.');
  console.log('   Look for files with "test" or "converted" in their names.\n');
}

// Create a .env file with these variables:
const envExample = `
# Create a .env file with these variables:
SLACK_BOT_TOKEN=xoxb-your-actual-bot-token
SLACK_CHANNEL_NAME=#your-test-channel
SLACK_CHANNEL_ID=C1234567890

# Optional: Different channel for test 11
SECONDARY_CHANNEL_NAME=#general
SECONDARY_CHANNEL_ID=C1234567891
`;

console.log(envExample);

// Check if we have required environment variables
if (!process.env.SLACK_BOT_TOKEN || process.env.SLACK_BOT_TOKEN === 'xoxb-your-token-here') {
  console.error('\n❌ ERROR: Please set up your Slack credentials!');
  console.error('1. Create a .env file with the variables above');
  console.error('2. Replace with your actual Slack Bot Token and Channel IDs');
  console.error('3. Install dotenv: npm install dotenv');
  console.error('4. Add this to your test file: require("dotenv").config();');
  console.error('\n⚠️  Tests will run but will fail without proper credentials.');
}

// Run main function
main().catch(console.error);