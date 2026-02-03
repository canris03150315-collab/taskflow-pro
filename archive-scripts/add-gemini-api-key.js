const fs = require('fs');
const path = require('path');

console.log('Adding Gemini API Key to environment...');

// API Key
const apiKey = 'AIzaSyDN-qmvQ_7HCEPcvtjVCAKpCZCH9y_Wlc';

// Check if .env file exists
const envPath = '/app/.env';
let envContent = '';

if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
  console.log('Existing .env file found');
} else {
  console.log('Creating new .env file');
}

// Check if GEMINI_API_KEY already exists
if (envContent.includes('GEMINI_API_KEY=')) {
  // Replace existing key
  envContent = envContent.replace(/GEMINI_API_KEY=.*/g, `GEMINI_API_KEY=${apiKey}`);
  console.log('Updated existing GEMINI_API_KEY');
} else {
  // Add new key
  envContent += `\nGEMINI_API_KEY=${apiKey}\n`;
  console.log('Added new GEMINI_API_KEY');
}

// Write back to file
fs.writeFileSync(envPath, envContent, 'utf8');

console.log('SUCCESS: Gemini API Key configured');
console.log('Environment file location: /app/.env');
