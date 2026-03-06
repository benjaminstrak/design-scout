// src/utils/gmail.js
const { google } = require('googleapis');

function createGmailClient(config) {
  const auth = new google.auth.OAuth2(
    config.gmail.clientId,
    config.gmail.clientSecret
  );
  auth.setCredentials({ refresh_token: config.gmail.refreshToken });
  return google.gmail({ version: 'v1', auth });
}

async function getEmailsFromSender(gmail, senderEmail, afterDate) {
  const query = `from:${senderEmail} after:${afterDate}`;
  const listResponse = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults: 10,
  });
  const messageIds = listResponse.data.messages || [];
  const emails = [];
  for (const msg of messageIds) {
    const detail = await gmail.users.messages.get({
      userId: 'me',
      id: msg.id,
      format: 'full',
    });
    const headers = detail.data.payload.headers;
    const subject = headers.find((h) => h.name === 'Subject')?.value || '';
    const from = headers.find((h) => h.name === 'From')?.value || '';
    const date = headers.find((h) => h.name === 'Date')?.value || '';
    const body = extractBody(detail.data.payload);
    emails.push({ id: msg.id, subject, from, date, bodyHtml: body.html, bodyText: body.text });
  }
  return emails;
}

function extractBody(payload) {
  let html = '';
  let text = '';
  if (payload.parts) {
    for (const part of payload.parts) {
      const partBody = extractBody(part);
      html = html || partBody.html;
      text = text || partBody.text;
    }
  } else if (payload.body?.data) {
    const decoded = Buffer.from(payload.body.data, 'base64url').toString('utf-8');
    if (payload.mimeType === 'text/html') html = decoded;
    else if (payload.mimeType === 'text/plain') text = decoded;
  }
  return { html, text };
}

module.exports = { createGmailClient, getEmailsFromSender };
