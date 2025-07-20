# NutriAI Deployment Guide

This document provides instructions for deploying the NutriAI application using Replit's deployment features.

## Prerequisites

Before deploying, ensure you have:

1. An OpenAI API key (for AI-powered features)
2. PostgreSQL database credentials (automatically set up by Replit)

## Pre-Deployment Steps

1. **Run the deployment preparation script**:
   ```bash
   ./deploy.sh
   ```
   This script will:
   - Create necessary directories
   - Build the application
   - Set up the database schema

2. **Verify environment variables**:
   Ensure these environment variables are properly set:
   - `DATABASE_URL` (automatically set by Replit)
   - `OPENAI_API_KEY` (must be added through Replit Secrets)
   - `NODE_ENV` (set to "production" during deployment)

## Deployment Process

1. Click the "Deploy" button in your Replit project dashboard
2. Select the desired deployment settings
3. Complete the deployment process as guided by Replit

## Post-Deployment Verification

After deployment:

1. Verify the application loads correctly
2. Check that database connections are working
3. Test the OpenAI integration by using one of the AI features
4. Test user authentication flows

## Troubleshooting

If you encounter any issues:

1. Check the application logs in the Replit console
2. Verify all environment variables are correctly set
3. Ensure the database is properly initialized
4. Check that all required directories (like `uploads`) exist

## Additional Notes

- The application uses the PostgreSQL database provisioned by Replit
- Frontend assets are built using Vite
- Server runs on Node.js with Express
- For local development, use `npm run dev`