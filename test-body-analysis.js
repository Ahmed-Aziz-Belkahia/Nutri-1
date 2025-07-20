// Test script for the body analysis API
import fetch from 'node-fetch';
import * as dotenv from 'dotenv';
import fs from 'fs/promises';

// Load environment variables
dotenv.config();

// Function to test the body analysis API directly
async function testBodyAnalysisAPI() {
  try {
    console.log('Testing body analysis API directly...');
    
    // Fetch a known working image and convert to base64
    const response = await fetch("https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gfp-wisconsin-madison-the-nature-boardwalk.jpg/800px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg");
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64String = buffer.toString('base64');
    
    // Format the base64 string with the data:image prefix that API expects
    const formattedBase64 = `data:image/jpeg;base64,${base64String}`;
    
    console.log(`Base64 string generated, length: ${formattedBase64.length}`);
    console.log('First 100 chars of base64 data:', formattedBase64.substring(0, 100));
    
    // Make API call to analyze body
    console.log('Calling /api/analyze-body endpoint...');
    const apiResponse = await fetch('http://localhost:5000/api/analyze-body', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageBase64: formattedBase64,
        weight: 75, // Example weight in kg
        height: 175, // Example height in cm
        gender: 'male',
        age: 30
      })
    });
    
    // Parse and log the response
    const responseStatus = apiResponse.status;
    console.log('API response status:', responseStatus);
    
    // Try to parse the response as JSON
    let responseText;
    try {
      responseText = await apiResponse.text();
      const responseData = JSON.parse(responseText);
      console.log('API response data:', JSON.stringify(responseData, null, 2));
    } catch (e) {
      console.log('Could not parse response as JSON. Raw response:', responseText);
    }
    
    return responseStatus === 200;
  } catch (error) {
    console.error('API test failed with error:');
    console.error(error);
    return false;
  }
}

// Run the test
testBodyAnalysisAPI()
  .then(success => {
    console.log(`API test ${success ? 'PASSED' : 'FAILED'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Unexpected error running API test:', err);
    process.exit(1);
  });