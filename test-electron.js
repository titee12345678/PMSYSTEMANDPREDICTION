// Test Electron main process
console.log('Testing Electron...');

try {
  const electron = require('electron');
  console.log('✓ Electron module loaded');
  console.log('  Type:', typeof electron);
  console.log('  Path:', electron);

  if (typeof electron === 'string') {
    console.log('\n⚠️  This is running in Node.js mode');
    console.log('  Electron path:', electron);
    console.log('  Run with: npm start');
  } else {
    console.log('\n✓ Running in Electron mode');
    console.log('  app:', typeof electron.app);
    console.log('  BrowserWindow:', typeof electron.BrowserWindow);
  }
} catch (error) {
  console.error('✗ Error:', error.message);
}
