#!/bin/bash
# Design Scout — Source Scout runner.
# launchd triggers this monthly (1st of the month); it web-researches new design
# sources, emails a shortlist, and logs them to Notion as inactive candidates.

REPO="/Users/benstrakmacmini/Documents/Coding/design-scout"
LOG_FILE="$REPO/discover.log"

export PATH="/Users/benstrakmacmini/.local/node/bin:$PATH"
cd "$REPO" || exit 1

echo "$(date): Starting Source Scout" >> "$LOG_FILE"
/Users/benstrakmacmini/.local/node/bin/node src/discover.js >> "$LOG_FILE" 2>&1
EXIT_CODE=$?
echo "$(date): Source Scout finished with exit code $EXIT_CODE" >> "$LOG_FILE"
echo "---" >> "$LOG_FILE"
