#!/bin/bash
# Design Scout pipeline runner
# Runs every 3 days — launchd triggers daily at 8am, this script checks the interval.

LOCK_DIR="/Users/benstrakmacmini/Documents/Coding/design-scout"
LAST_RUN_FILE="$LOCK_DIR/.last-run"
INTERVAL_DAYS=3
LOG_FILE="$LOCK_DIR/pipeline.log"

# Check if enough days have passed since last run
if [ -f "$LAST_RUN_FILE" ]; then
    last_run=$(cat "$LAST_RUN_FILE")
    now=$(date +%s)
    elapsed=$(( (now - last_run) / 86400 ))
    if [ "$elapsed" -lt "$INTERVAL_DAYS" ]; then
        echo "$(date): Only $elapsed day(s) since last run, skipping (interval: $INTERVAL_DAYS days)" >> "$LOG_FILE"
        exit 0
    fi
fi

# Record this run
date +%s > "$LAST_RUN_FILE"

echo "$(date): Starting Design Scout pipeline" >> "$LOG_FILE"

export PATH="/Users/benstrakmacmini/.local/node/bin:$PATH"
cd /Users/benstrakmacmini/Documents/Coding/design-scout

/Users/benstrakmacmini/.local/node/bin/node src/index.js >> "$LOG_FILE" 2>&1
EXIT_CODE=$?

echo "$(date): Pipeline finished with exit code $EXIT_CODE" >> "$LOG_FILE"
echo "---" >> "$LOG_FILE"
