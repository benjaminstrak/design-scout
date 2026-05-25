// src/utils/discovery-email.js
// Builds and sends the Source Scout email via the Gmail API (same approach as briefing-email.js).
const { google } = require('googleapis');

function buildDiscoveryHtml(discoveries) {
  const itemsHtml = discoveries.map((d) => `
    <tr><td style="padding: 22px 0; border-bottom: 1px solid #e0e0e0;">
      <a href="${d.url}" style="font-size: 16px; color: #1a2744; font-weight: bold; text-decoration: none;">
        ${d.name} &rarr;
      </a><br><br>
      <span style="color: #444;">${d.why || ''}</span><br><br>
      <span style="color: #666; font-style: italic;">How it's different: ${d.differs || ''}</span>
      ${(d.tags && d.tags.length) ? `<br><br><span style="color: #888; font-size: 13px;">${d.tags.map((t) => `#${t}`).join('  ')}</span>` : ''}
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
  <h1 style="font-size: 22px; border-bottom: 3px solid #1a2744; padding-bottom: 16px; margin-top: 0; color: #1a2744;">
    Source Scout
  </h1>
  <p style="color: #555;">${discoveries.length} design ${discoveries.length === 1 ? 'source' : 'sources'} you might be missing. Subscribe to any that appeal, then mark them active in Notion.</p>
  <table style="width: 100%; border-collapse: collapse;">${itemsHtml}</table>
  <p style="font-size: 13px; color: #999; margin-top: 28px;">
    These have also been added to your Design Scout Sources database as inactive candidates (tagged <em>discovered</em>).
  </p>
  <div style="margin-top: 24px; padding: 18px 20px; background: #f5f4f0; border-radius: 8px; font-size: 13px; color: #555; line-height: 1.6;">
    <strong style="color: #1a2744;">To start using one</strong><br>
    Design Scout scans your Gmail for emails from each <em>active</em> source's sender address &mdash; it doesn't read websites. So ticking Active alone isn't enough:
    <ol style="margin: 10px 0 0 0; padding-left: 20px;">
      <li><strong>Subscribe</strong> via the source's link so it starts arriving in your inbox.</li>
      <li>Open one of its emails in Gmail and paste the <strong>sender address</strong> into the source's <strong>Email</strong> field in Notion.</li>
      <li>Tick <strong>Active</strong>.</li>
    </ol>
  </div>
  <p style="font-size: 12px; color: #999; margin-top: 24px;">&mdash; Source Scout</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

async function sendDiscoveryEmail(config, html, count) {
  const auth = new google.auth.OAuth2(config.gmail.clientId, config.gmail.clientSecret);
  auth.setCredentials({ refresh_token: config.gmail.refreshToken });
  const gmail = google.gmail({ version: 'v1', auth });

  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const subject = `Source Scout - ${count} new sources to consider - ${today}`;
  const rawMessage = [
    `From: Source Scout <${config.gmail.userEmail}>`,
    `To: ${config.briefing.recipientEmail}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    '',
    html,
  ].join('\r\n');

  const encodedMessage = Buffer.from(rawMessage)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  await gmail.users.messages.send({ userId: 'me', requestBody: { raw: encodedMessage } });
  console.log(`Source Scout email sent to ${config.briefing.recipientEmail}`);
}

module.exports = { buildDiscoveryHtml, sendDiscoveryEmail };
