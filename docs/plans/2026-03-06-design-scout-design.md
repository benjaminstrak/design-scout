# Design Scout - Design Document

**Date:** 2026-03-06
**Status:** Approved

## Overview

Design Scout is an automated tool that helps Ben write drafts of Design Lobster newsletter issues. It monitors curated newsletter subscriptions, extracts content, finds surprising historical and cultural design connections using museum/archive APIs, and delivers structured briefings via email and Notion.

## Pipeline Architecture

Five sequential stages, each saving output to JSON for independent re-runnability:

```
1. COLLECT → 2. EXTRACT → 3. ANALYZE → 4. GENERATE → 5. DELIVER
```

### Stage 1: Collect

- Reads the Notion Sources Database to get active newsletter sender emails
- Queries Gmail API for emails from those senders since the last run
- Saves raw email data to JSON

### Stage 2: Extract

- Parses each email body for main text content
- Follows links found in emails and extracts article content from the web
- Uses Cheerio for HTML parsing
- Saves extracted content to JSON

### Stage 3: Analyze

- Sends extracted content to Claude API with a tuned prompt that:
  - Identifies underlying themes across newsletters
  - Finds surprising angles and unexpected connections
  - Connects current trends to historical precedents
  - Surfaces forgotten designers, cross-cultural parallels, and origin stories of everyday objects
- Searches museum/archive APIs for relevant objects and records (picks 2-3 most relevant per run)
- Saves analysis results to JSON

### Stage 4: Generate

- Takes Claude's analysis and structures it into a briefing with three sections:
  - **Ideas to Think About** — themes from newsletters as essay jumping-off points, with draft angles
  - **Objects** — archival finds with historical context and Design Lobster-style framing
  - **Interesting Links** — best/most interesting links from recent newsletters with commentary
- Generates draft paragraphs in Design Lobster's voice
- Saves structured briefing to JSON

### Stage 5: Deliver

- Creates a full briefing page in the Notion Briefings Database
- Sends a summary email with all three sections and a link to the Notion page
- Updates the "last run" timestamp

## Data Sources

### Newsletter Sources (managed in Notion)

User-curated list of newsletter subscriptions. The Notion Sources Database is the single source of truth.

### Museum & Archive APIs

Primary archival sources for historical/niche design content:

**Museum & Archive APIs/Collections:**
- MoMA Collection API — 200k+ works, strong on modern/industrial design
- Rijksmuseum API — applied arts, furniture, ceramics
- The British Museum Collection — 4 million objects
- Library of Congress Digital Collections — patents, posters, maps, historical photographs
- Europeana API — 50+ million items from European museums/archives
- Harvard Art Museums API — strong Bauhaus archive
- Cooper Hewitt Museum API — Smithsonian's design museum, 200k+ objects

**Design-Specific Archives:**
- Vitra Design Museum Digital Archive — furniture and industrial design history
- Design Museum (London) Collection — everyday objects
- The Wolfsonian–FIU — propaganda, industrial design, decorative arts 1850-1950
- Internet Archive's design collections — historical trade catalogues, design manuals, patent drawings

**Wikipedia:**
- Design categories — objects, movements, designers

## Notion Structure

### Sources Database

| Column | Type | Purpose |
|--------|------|---------|
| Name | Title | Newsletter name |
| Email | Text | Sender email address to match in Gmail |
| Active | Checkbox | Toggle sources on/off |
| Tags | Multi-select | Optional theme categorisation |

### Briefings Database

| Column | Type | Purpose |
|--------|------|---------|
| Title | Title | "Briefing - March 6, 2026" |
| Date | Date | Generation date |
| Status | Select | New / Reviewed / Used |
| Theme Tags | Multi-select | Auto-tagged themes |
| Sources Used | Relation | Links to source newsletters |

## Briefing Email Format

Three sections:

1. **Ideas to Think About** — 2-4 themes from newsletters with essay angles and historical connections
2. **Objects** — 2-3 archival finds with context and framing
3. **Interesting Links** — 3-5 best links with commentary

Plus stats (newsletters scanned, archives searched) and link to full Notion page.

The Notion page contains all of the above plus longer draft paragraphs, full source references, and raw material.

## Tech Stack

- **Node.js** — runtime
- **Google APIs (Gmail)** — reading newsletter emails + sending briefing emails via SMTP
- **Notion SDK (@notionhq/client)** — reading sources + creating briefing pages
- **Anthropic SDK** — Claude API for analysis and generation
- **Cheerio** — HTML parsing for link extraction
- **Nodemailer** — sending briefing emails

## Scheduling & Hosting

- **Current:** Railway.app with cron job (every 2-3 days)
- **Future:** Mac Mini with local cron job
- Designed so switching is a config change, not a rewrite — scheduling is a thin wrapper around the pipeline

## Configuration

All config via environment variables:
- Gmail API credentials (OAuth)
- Notion API token
- Notion database IDs (Sources + Briefings)
- Anthropic API key
- Briefing email recipient
- Schedule frequency
- Archive API keys (where needed)

## Key Design Decisions

1. **Modular pipeline** — each stage is independent, saves to JSON, can be run/tested alone
2. **Notion as source of truth** — newsletter list managed in Notion, not in code
3. **Primary sources only** — museum/archive APIs, no second-hand content sources
4. **Portable scheduling** — Railway now, Mac Mini later, just a config swap
5. **Claude prompts are the product** — the quality of the briefings depends on prompt tuning, which will be iterated on with real data
