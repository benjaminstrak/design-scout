// src/config.js
// Loads environment variables and exports them as a config object.
// Every part of the pipeline imports config from here instead of
// reading process.env directly. This keeps things in one place.

require('dotenv').config();

module.exports = {
  gmail: {
    clientId: process.env.GMAIL_CLIENT_ID,
    clientSecret: process.env.GMAIL_CLIENT_SECRET,
    refreshToken: process.env.GMAIL_REFRESH_TOKEN,
    userEmail: process.env.GMAIL_USER_EMAIL,
  },
  notion: {
    apiKey: process.env.NOTION_API_KEY,
    sourcesDbId: process.env.NOTION_SOURCES_DB_ID,
    briefingsDbId: process.env.NOTION_BRIEFINGS_DB_ID,
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
  },
  museums: {
    europeanaKey: process.env.EUROPEANA_API_KEY || null,
    harvardKey: process.env.HARVARD_ART_MUSEUMS_API_KEY || null,
  },
  briefing: {
    recipientEmail: process.env.BRIEFING_RECIPIENT_EMAIL,
    scheduleDays: parseInt(process.env.SCHEDULE_DAYS || '3', 10),
  },
};
