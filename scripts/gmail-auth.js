// scripts/gmail-auth.js
// ONE-TIME SETUP SCRIPT
// Run this once to get your Gmail refresh token.

const { google } = require('googleapis');
const http = require('http');
const url = require('url');
require('dotenv').config();

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in your .env first');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID, CLIENT_SECRET, 'http://localhost:3000/callback'
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
  ],
  prompt: 'consent',
});

console.log('\n1. Open this URL in your browser:\n');
console.log(authUrl);
console.log('\n2. Sign in and authorize the app');
console.log('3. You will be redirected — the token will appear here\n');

const server = http.createServer(async (req, res) => {
  const query = url.parse(req.url, true).query;
  if (query.code) {
    const { tokens } = await oauth2Client.getToken(query.code);
    console.log('=== SUCCESS ===');
    console.log(`\nAdd this to your .env file:\n`);
    console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}\n`);
    res.end('Done! You can close this tab.');
    server.close();
  }
});
server.listen(3000);
