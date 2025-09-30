#!/bin/bash

# Start the Preventive Maintenance System

echo "Starting Preventive Maintenance System..."
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Start Electron app
echo "Launching application..."
npm start
