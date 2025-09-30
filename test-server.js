// Test script to start API server without Electron
const APIServer = require('./src/api/server');

async function start() {
  try {
    console.log('Starting API Server...');
    const server = new APIServer();
    await server.start(3000);
    console.log('✓ API Server is running at http://localhost:3000');
    console.log('✓ Press Ctrl+C to stop');
  } catch (error) {
    console.error('✗ Failed to start server:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

start();
