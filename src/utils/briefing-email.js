// src/utils/briefing-email.js
const nodemailer = require('nodemailer');

function buildEmailHtml(briefing, notionUrl, stats) {
  const ideasHtml = (briefing.ideas || []).map((idea) => `
    <tr><td style="padding: 16px 0; border-bottom: 1px solid #eee;">
      <strong style="font-size: 16px;">${idea.title}</strong><br>
      <span style="color: #444; line-height: 1.6;">${idea.summary}</span><br>
      <span style="color: #666; font-style: italic;">Historical connection: ${idea.historicalConnection}</span><br>
      <span style="background: #f0f0f0; padding: 4px 8px; border-radius: 4px; display: inline-block; margin-top: 8px;">
        Draft angle: ${idea.draftAngle}
      </span>
    </td></tr>
  `).join('');

  const objectsHtml = (briefing.objects || []).map((obj) => `
    <tr><td style="padding: 16px 0; border-bottom: 1px solid #eee;">
      <strong style="font-size: 16px;">${obj.title}</strong>
      <span style="color: #888;"> — ${obj.source}, ${obj.date}</span><br>
      <span style="color: #444; line-height: 1.6;">${obj.description}</span><br>
      <span style="color: #666;">Contemporary connection: ${obj.contemporaryConnection}</span><br>
      ${obj.url ? `<a href="${obj.url}" style="color: #c44;">View in collection →</a>` : ''}
    </td></tr>
  `).join('');

  const linksHtml = (briefing.links || []).map((link) => `
    <tr><td style="padding: 16px 0; border-bottom: 1px solid #eee;">
      <a href="${link.url}" style="color: #c44; font-size: 16px; font-weight: bold; text-decoration: none;">
        ${link.title}
      </a>
      <span style="color: #888;"> via ${link.newsletter}</span><br>
      <span style="color: #444; line-height: 1.6;">${link.commentary}</span>
    </td></tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<body style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #222;">
  <h1 style="font-size: 24px; border-bottom: 3px solid #c44; padding-bottom: 12px;">
    Design Scout Briefing
  </h1>
  <h2 style="font-size: 18px; color: #c44; margin-top: 32px;">Ideas to Think About</h2>
  <table style="width: 100%; border-collapse: collapse;">${ideasHtml}</table>
  <h2 style="font-size: 18px; color: #c44; margin-top: 32px;">Objects</h2>
  <table style="width: 100%; border-collapse: collapse;">${objectsHtml}</table>
  <h2 style="font-size: 18px; color: #c44; margin-top: 32px;">Interesting Links</h2>
  <table style="width: 100%; border-collapse: collapse;">${linksHtml}</table>
  <div style="margin-top: 32px; padding: 16px; background: #f8f8f8; border-radius: 8px; font-size: 14px; color: #666;">
    ${stats.newslettersScanned || 0} newsletters scanned · ${stats.archivesSearched || 0} archives searched<br>
    <a href="${notionUrl}" style="color: #c44; font-weight: bold;">Full briefing + draft paragraphs → Notion</a>
  </div>
  <p style="font-size: 12px; color: #999; margin-top: 24px;">— Design Scout</p>
</body>
</html>`;
}

async function sendBriefingEmail(config, html) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: config.gmail.userEmail,
      clientId: config.gmail.clientId,
      clientSecret: config.gmail.clientSecret,
      refreshToken: config.gmail.refreshToken,
    },
  });
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  await transporter.sendMail({
    from: `Design Scout <${config.gmail.userEmail}>`,
    to: config.briefing.recipientEmail,
    subject: `Design Scout Briefing — ${today}`,
    html,
  });
  console.log(`Briefing email sent to ${config.briefing.recipientEmail}`);
}

module.exports = { buildEmailHtml, sendBriefingEmail };
