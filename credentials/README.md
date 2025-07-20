# Google Cloud Vision API Credentials Setup

To use the food recognition feature, you need to set up Google Cloud Vision API credentials:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Vision API for your project
4. Create a service account and download the JSON credentials file
5. Rename your credentials file to `vision-credentials.json`
6. Place the file in this directory (`credentials/vision-credentials.json`)

## Important Notes
- Keep your credentials file secure and never commit it to version control
- The file must be named `vision-credentials.json`
- If you're using a different filename, set it in the VITE_GOOGLE_CLOUD_KEY_PATH environment variable

## Troubleshooting
If you see errors about credentials:
1. Make sure the credentials file exists in this directory
2. Verify that the file is properly formatted JSON
3. Ensure the service account has the necessary permissions for Vision API
