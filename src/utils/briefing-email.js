// src/utils/briefing-email.js
// Uses the Gmail API (not SMTP) to send emails — more reliable with OAuth2.
const { google } = require('googleapis');

// Escape the few characters that would break out of an HTML attribute. Object
// titles come from museum APIs and do contain quotes and ampersands.
function escapeAttr(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Museum image, shown above the description. Only https — an http image would
// trip mixed-content blocking in most mail clients and render as a broken box.
function objectImage(obj) {
  if (!obj.imageUrl || !/^https:\/\//i.test(obj.imageUrl)) return '';
  return `<img src="${escapeAttr(obj.imageUrl)}" alt="${escapeAttr(obj.title)}" `
    + 'width="520" style="width: 100%; max-width: 520px; height: auto; '
    + 'border-radius: 3px; display: block; margin-bottom: 16px;"><br>';
}

function buildEmailHtml(briefing, notionUrl, stats) {
  const ideasHtml = (briefing.ideas || []).map((idea) => `
    <tr><td style="padding: 24px 0; border-bottom: 1px solid #e0e0e0;">
      <strong style="font-size: 16px; color: #1a2744;">${idea.title}</strong><br><br>
      <span style="color: #444;">${idea.summary}</span><br><br>
      <span style="color: #666; font-style: italic;">Historical connection: ${idea.historicalConnection}</span><br><br>
      <span style="background: #eef1f6; padding: 6px 10px; border-radius: 4px; display: inline-block;">
        Draft angle: ${idea.draftAngle}
      </span>
    </td></tr>
  `).join('');

  const objectsHtml = (briefing.objects || []).map((obj) => `
    <tr><td style="padding: 24px 0; border-bottom: 1px solid #e0e0e0;">
      <strong style="font-size: 16px; color: #1a2744;">${obj.title}</strong><br>
      <span style="color: #888; font-size: 14px;">${obj.source}, ${obj.date}</span><br><br>
      ${objectImage(obj)}
      <span style="color: #444;">${obj.description}</span><br><br>
      <span style="color: #666;">Contemporary connection: ${obj.contemporaryConnection}</span><br><br>
      ${obj.url ? `<a href="${obj.url}" style="color: #1a2744; font-weight: bold;">View in collection &rarr;</a>` : ''}
    </td></tr>
  `).join('');

  const linksHtml = (briefing.links || []).map((link) => `
    <tr><td style="padding: 24px 0; border-bottom: 1px solid #e0e0e0;">
      <a href="${link.url}" style="color: #1a2744; font-size: 16px; font-weight: bold; text-decoration: none;">
        ${link.title}
      </a><br>
      <span style="color: #888; font-size: 14px;">via ${link.newsletter}</span><br><br>
      <span style="color: #444;">${link.commentary}</span>
    </td></tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<body style="background-color: #f5f4f0; margin: 0; padding: 0;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f4f0; padding: 32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="font-family: Georgia, serif; max-width: 600px; background-color: #ffffff; padding: 40px; color: #222; border-radius: 4px; line-height: 1.7;">
<tr><td>
  <h1 style="font-size: 24px; border-bottom: 3px solid #1a2744; padding-bottom: 16px; margin-top: 0;">
    Design Scout Briefing
  </h1>
  <h2 style="font-size: 18px; color: #1a2744; margin-top: 40px;">Ideas to Think About</h2>
  <table style="width: 100%; border-collapse: collapse;">${ideasHtml}</table>
  <h2 style="font-size: 18px; color: #1a2744; margin-top: 40px;">Objects</h2>
  <table style="width: 100%; border-collapse: collapse;">${objectsHtml}</table>
  <h2 style="font-size: 18px; color: #1a2744; margin-top: 40px;">Interesting Links</h2>
  <table style="width: 100%; border-collapse: collapse;">${linksHtml}</table>
  <div style="margin-top: 40px; padding: 20px; background: #f5f4f0; border-radius: 8px; font-size: 14px; color: #666;">
    ${stats.newslettersScanned || 0} newsletters scanned &middot; ${stats.archivesSearched || 0} archives searched<br><br>
    <a href="${notionUrl}" style="color: #1a2744; font-weight: bold;">Full briefing + draft paragraphs &rarr; Notion</a>
  </div>
  <p style="font-size: 12px; color: #999; margin-top: 32px;">&mdash; Design Scout</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

async function sendBriefingEmail(config, html) {
  // Set up OAuth2 client (same approach as email reading in gmail.js)
  const auth = new google.auth.OAuth2(
    config.gmail.clientId,
    config.gmail.clientSecret
  );
  auth.setCredentials({ refresh_token: config.gmail.refreshToken });
  const gmail = google.gmail({ version: 'v1', auth });

  // Build the email as a raw RFC 2822 message
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  // Use a plain dash instead of em dash to avoid encoding issues in email subjects
  const subject = `Design Scout Briefing - ${today}`;
  const rawMessage = [
    `From: Design Scout <${config.gmail.userEmail}>`,
    `To: ${config.briefing.recipientEmail}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    '',
    html,
  ].join('\r\n');

  // Gmail API expects the message as base64url-encoded string
  const encodedMessage = Buffer.from(rawMessage)
    .toString('base64')
    .replace(/\+/g, '-')    // Convert + to -
    .replace(/\//g, '_')    // Convert / to _
    .replace(/=+$/, '');    // Remove trailing =

  // Send via Gmail API (not SMTP — avoids the auth issue)
  await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedMessage,
    },
  });
  console.log(`Briefing email sent to ${config.briefing.recipientEmail}`);
}

module.exports = { buildEmailHtml, sendBriefingEmail };
