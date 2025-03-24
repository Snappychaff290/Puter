// Test script for the desktop client
// This script tests the desktop client functionality
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

// Configuration
const CONFIG = {
  // WebSocket server URL
  wsServerUrl: 'ws://localhost:3002',
};

// Test cases
const testCases = [
  {
    name: 'Test create file command',
    command: {
      type: 'create_file',
      params: {
        filename: 'test_file.txt',
        content: 'This is a test file created by the AI Desktop Assistant.',
      },
      taskId: uuidv4(),
    },
  },
  {
    name: 'Test create article outline command',
    command: {
      type: 'create_article_outline',
      params: {
        topic: 'Artificial Intelligence',
        sections: 3,
      },
      taskId: uuidv4(),
    },
  },
  {
    name: 'Test create daily plan command',
    command: {
      type: 'create_daily_plan',
      params: {
        tasks: [
          { time: 'morning', description: 'Review project requirements' },
          { time: 'afternoon', description: 'Team meeting at 2pm' },
          { time: 'evening', description: 'Prepare presentation for tomorrow' },
        ],
      },
      taskId: uuidv4(),
    },
  },
];

// Run tests
async function runTests() {
  console.log('Starting tests for AI Desktop Assistant desktop client...');
  
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(CONFIG.wsServerUrl);
    
    ws.on('open', () => {
      console.log('Connected to WebSocket server');
      
      let testIndex = 0;
      const results = [];
      
      // Function to run the next test
      const runNextTest = () => {
        if (testIndex >= testCases.length) {
          console.log('\nAll tests completed');
          ws.close();
          resolve(results);
          return;
        }
        
        const test = testCases[testIndex];
        console.log(`\nRunning test: ${test.name}`);
        
        ws.send(JSON.stringify(test.command));
        testIndex++;
      };
      
      // Handle messages from the server
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          console.log('Response:', message);
          
          if (message.type === 'result') {
            if (message.success) {
              console.log('✅ Test passed');
              results.push({ test: testCases[testIndex - 1].name, success: true });
            } else {
              console.log('❌ Test failed');
              results.push({ test: testCases[testIndex - 1].name, success: false, error: message.error });
            }
            
            // Run the next test after a short delay
            setTimeout(runNextTest, 1000);
          }
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      });
      
      // Start the first test
      runNextTest();
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      reject(error);
    });
    
    // Set a timeout for the entire test suite
    setTimeout(() => {
      ws.close();
      reject(new Error('Test timeout'));
    }, 30000);
  });
}

// Run the tests
runTests()
  .then((results) => {
    console.log('Test results:', results);
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error running tests:', error);
    process.exit(1);
  });
