# Design Scout - Project Instructions for Claude

## What This Project Is

Design Scout is an automated pipeline that helps Ben write his Design Lobster newsletter (https://designlobster.substack.com). It scans newsletter subscriptions, finds surprising design connections via museum/archive APIs, and delivers structured briefings via email + Notion.

## Current Status

**All code is built and committed locally. Not yet pushed to GitHub.**

## Immediate TODO (Next Session)

1. Create a **private** GitHub repo called `design-scout`
2. Push all commits to the repo
3. Help Ben set up his `.env` file by walking through:
   - Gmail OAuth setup (follow `docs/setup-gmail.md`)
   - Notion setup (follow `docs/setup-notion.md`)
   - Anthropic API key
4. Run the pipeline end-to-end with real data (`npm start`)
5. Iterate on the prompts in `src/prompts/analyze.js` and `src/prompts/generate.js` based on real output quality

## Project Architecture

Five-stage pipeline, each stage saves JSON output independently:

```
1. COLLECT (Notion sources → Gmail scan)
2. EXTRACT (parse emails → follow links)
3. ANALYZE (Claude + museum archive APIs)
4. GENERATE (structure briefing as JSON)
5. DELIVER (Notion page + summary email)
```

## Key Files

- `src/index.js` — Main pipeline entry point
- `src/config.js` — All env var config in one place
- `src/prompts/analyze.js` — THE most important file. The analysis prompt that finds surprising connections. Will need iterating.
- `src/prompts/generate.js` — Structures Claude's analysis into the briefing JSON format
- `src/utils/archives.js` — 8 museum/archive API clients (V&A, Rijksmuseum, Cooper Hewitt, Library of Congress, Internet Archive, Europeana, Harvard Art Museums, Wikipedia)
- `railway.json` — Cron deployment config (every 3 days at 8am)

## NPM Scripts

- `npm start` — Run full pipeline
- `npm test` — Run all tests (11 tests, 3 suites)
- `npm run stage:collect` — Run just Stage 1
- `npm run stage:extract` — Run just Stage 2
- `npm run stage:analyze` — Run just Stage 3
- `npm run stage:generate` — Run just Stage 4
- `npm run stage:deliver` — Run just Stage 5

## Setup Guides

- `docs/setup-gmail.md` — Gmail OAuth2 credentials
- `docs/setup-notion.md` — Notion integration + database creation
- `docs/setup-railway.md` — Railway.app deployment

## Design Decisions

- Notion is the source of truth for newsletter sources (not a config file)
- Each pipeline stage saves to JSON so stages can be re-run independently
- Scheduling is a thin wrapper — designed to swap Railway for Mac Mini cron later (just change how the pipeline gets triggered)
- Only primary archival sources — no second-hand content sites
- Briefing email has three sections: Ideas to Think About, Objects, Interesting Links
- Full detail lives in Notion; email is a summary with link to Notion page

## Future Improvements

- Tune prompts with real data (highest priority once running)
- Add MoMA collection data (CSV download, local search)
- Switch to Mac Mini cron when it arrives
- Add a "backlog" feature to accumulate unused ideas across briefings
- Add Sources Used relation in Briefings DB (not yet wired up)

## Ben's Preferences (from global CLAUDE.md)

- Product designer, not a developer — needs detailed explanations
- Prefers small incremental changes
- Wants to learn while coding
- Use warnings for large/risky changes
- Pause for confirmation before significant modifications
