# Deploying Design Scout to Railway

Railway is a hosting service that can run your pipeline automatically on a schedule. This guide walks you through setting it up from scratch.

## 1. Create a Railway Account

1. Go to [railway.app](https://railway.app)
2. Click **Sign Up** (signing in with your GitHub account is easiest)
3. Finish the account setup prompts

## 2. Create a New Project

1. From the Railway dashboard, click **New Project**
2. Choose **Deploy from GitHub repo**
3. Select the **Design Scout** repository from the list
   - If you don't see it, click **Configure GitHub App** and grant Railway access to the repo
4. Railway will detect the `railway.json` file and use its settings automatically

## 3. Set Environment Variables

Your pipeline needs several API keys and tokens to run. In Railway:

1. Click on your newly created service
2. Go to the **Variables** tab
3. Add each variable listed in the `.env.example` file in your repo:

| Variable | What it is |
|---|---|
| `GMAIL_CLIENT_ID` | Google OAuth client ID |
| `GMAIL_CLIENT_SECRET` | Google OAuth client secret |
| `GMAIL_REFRESH_TOKEN` | Gmail API refresh token |
| `GMAIL_USER_EMAIL` | Your Gmail address |
| `NOTION_API_KEY` | Notion integration token |
| `NOTION_SOURCES_DB_ID` | ID of your Notion sources database |
| `NOTION_BRIEFINGS_DB_ID` | ID of your Notion briefings database |
| `ANTHROPIC_API_KEY` | Claude API key |
| `EUROPEANA_API_KEY` | Europeana API key (optional) |
| `HARVARD_ART_MUSEUMS_API_KEY` | Harvard Art Museums API key (optional) |
| `BRIEFING_RECIPIENT_EMAIL` | Email address that receives the briefing |

You can paste them one at a time, or use Railway's **RAW Editor** to paste them all at once in `KEY=VALUE` format.

## 4. Verify the Schedule

The `railway.json` file configures a cron job: `0 8 */3 * *`

This means the pipeline runs **every 3 days at 8:00 AM UTC**. You don't need to change anything -- Railway reads this automatically from the config file.

To confirm it's set:
1. Click on your service
2. Go to **Settings**
3. Look for the **Cron Schedule** section -- it should show `0 8 */3 * *`

## 5. Trigger a Manual Run

You don't have to wait 3 days to test. To run the pipeline right now:

1. Go to your service in Railway
2. Click the **three-dot menu** (top right of the service card)
3. Select **Trigger Deploy** (or **Restart**)

This starts the pipeline immediately using the same environment variables and code.

## 6. Check Logs

To see what happened during a run:

1. Click on your service
2. Go to the **Deployments** tab
3. Click on the most recent deployment
4. You'll see the full console output, including each pipeline stage and any errors

If something goes wrong, the logs will show `!!! Pipeline failed !!!` followed by the error details.

## Troubleshooting

- **"Missing environment variable" errors** -- Double-check that all variables from step 3 are set. Railway does not read your local `.env` file.
- **Pipeline never runs** -- Make sure the cron schedule is visible in Settings. If not, redeploy.
- **Gmail auth errors** -- Your refresh token may have expired. Generate a new one locally and update the `GMAIL_REFRESH_TOKEN` variable in Railway.
