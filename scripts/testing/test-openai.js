// Simple OpenAI API test script
import * as dotenv from 'dotenv';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

// Check if API key is available
console.log('OPENAI_API_KEY available:', !!process.env.OPENAI_API_KEY);
console.log('OPENAI_API_KEY length:', process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0);
console.log('OPENAI_API_KEY format check:', process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.startsWith('sk-') : false);

// Initialize the OpenAI client
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY
});

async function testOpenAIText() {
  try {
    console.log('Testing OpenAI API with a simple text completion...');
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Hello, are you working?" }
      ],
      max_tokens: 50
    });
    
    console.log('OpenAI text API test successful!');
    console.log('Response:', completion.choices[0].message.content);
    
    return true;
  } catch (error) {
    console.error('OpenAI text API test failed with error:');
    console.error(error);
    
    return false;
  }
}

async function testOpenAIVision() {
  try {
    console.log('Testing OpenAI Vision API with public URL...');
    
    // Create a test image URL (using OpenAI's example URL which is known to work)
    const imageUrl = "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gfp-wisconsin-madison-the-nature-boardwalk.jpg/2560px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg";
    
    // Make vision API call with a URL instead of base64
    const visionCompletion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "What do you see in this image?" },
            {
              type: "image_url",
              image_url: {
                url: imageUrl
              }
            }
          ]
        }
      ],
      max_tokens: 300
    });
    
    console.log('OpenAI Vision API URL test successful!');
    console.log('Vision Response:', visionCompletion.choices[0].message.content);
    
    return true;
  } catch (error) {
    console.error('OpenAI Vision API URL test failed with error:');
    console.error(error);
    
    return false;
  }
}

async function testOpenAIVisionWithBase64() {
  try {
    console.log('Testing OpenAI Vision API with base64 image...');
    
    // Fetch a known working image and convert to base64
    const response = await fetch("https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gfp-wisconsin-madison-the-nature-boardwalk.jpg/800px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg");
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64String = buffer.toString('base64');
    
    console.log(`Base64 string generated, length: ${base64String.length} chars`);
    
    // Make vision API call with base64 image
    const visionCompletion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "What do you see in this image?" },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64String}`
              }
            }
          ]
        }
      ],
      max_tokens: 300
    });
    
    console.log('OpenAI Vision API base64 test successful!');
    console.log('Vision Response:', visionCompletion.choices[0].message.content);
    
    return true;
  } catch (error) {
    console.error('OpenAI Vision API base64 test failed with error:');
    console.error(error);
    
    return false;
  }
}

// Run all tests
async function runTests() {
  const textResult = await testOpenAIText();
  console.log('-'.repeat(40));
  const visionUrlResult = await testOpenAIVision();
  console.log('-'.repeat(40));
  const visionBase64Result = await testOpenAIVisionWithBase64();
  
  return textResult && visionUrlResult && visionBase64Result;
}

// Run the tests
runTests()
  .then(success => {
    console.log('-'.repeat(40));
    console.log(`Tests ${success ? 'PASSED' : 'FAILED'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Unexpected error running tests:', err);
    process.exit(1);
  });