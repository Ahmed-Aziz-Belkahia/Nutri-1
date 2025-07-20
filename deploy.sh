#!/bin/bash

# Deployment preparation script for NutriAI

echo "Starting NutriAI deployment preparation..."

# Create necessary directories
mkdir -p uploads
echo "✅ Created uploads directory"

# Setup database using the automated script
echo "Setting up database tables..."
node create-tables-auto.js

# Apply schema updates for missing columns
echo "Updating database schema..."
node update-schema.js

# Build application for production
echo "Building the application..."
npm run build

echo "✅ Deployment preparation completed!"
echo "You can now deploy the application using the Replit deployment feature."