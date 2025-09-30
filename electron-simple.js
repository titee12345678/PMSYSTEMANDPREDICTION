// Simplest possible Electron app for testing

console.log('=== Electron Simple Test ===');
console.log('Process versions:', process.versions);
console.log('Is Electron?', !!process.versions.electron);

if (!process.versions.electron) {
  console.error('Not running in Electron!');
  process.exit(1);
}

// Test require
console.log('\nTesting require("electron")...');
const electronPath = require('electron');
console.log('Result type:', typeof electronPath);
console.log('Result:', electronPath);

// This should work in Electron main process
console.log('\nAttempting to access Electron API...');
const { app } = require('electron');
console.log('app type:', typeof app);

if (app) {
  console.log('✓ Electron app available!');
  app.whenReady().then(() => {
    console.log('✓ App is ready!');
    app.quit();
  });
} else {
  console.log('✗ Electron app NOT available');
  process.exit(1);
}
