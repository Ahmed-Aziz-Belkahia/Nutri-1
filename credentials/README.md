# Credentials Directory

This directory holds service account credentials for external APIs.

## Setup

### Google Cloud Vision (Food Image Recognition)

1. Create a service account in Google Cloud Console
2. Enable the Cloud Vision API
3. Download the JSON key file
4. Place it here as `vision-credentials.json`
5. Set `GOOGLE_APPLICATION_CREDENTIALS=credentials/vision-credentials.json` in your `.env`

> **IMPORTANT**: Never commit credential files to version control.
> The `.gitignore` excludes `credentials/*.json` for this reason.
