# Notion Setup Guide

This guide walks you through connecting Design Scout to your Notion workspace so it can create and manage your design briefings.

**Time needed:** About 5 minutes

---

## Step 1: Create a Notion Integration

1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click **+ New integration**
3. Give it a name like `Design Scout`
4. Select the workspace you want to use
5. Click **Submit**
6. You will see your **Internal Integration Secret** (it starts with `ntn_`)
7. Click **Show** and then **Copy**

## Step 2: Add the API Key to Your .env File

Open the `.env` file in your Design Scout project folder and add:

```
NOTION_API_KEY=ntn_your-secret-key-here
```

Save the file.

## Step 3: Create a Parent Page in Notion

1. Open Notion in your browser
2. Create a new page where you want Design Scout's databases to live (for example, a page called "Design Scout")
3. This page will hold your Sources and Briefings databases

## Step 4: Share the Page with Your Integration

1. Open the page you just created
2. Click the **...** menu in the top-right corner
3. Click **Connect to**
4. Find and select **Design Scout** (the integration you created in Step 1)
5. Click **Confirm**

## Step 5: Get the Page ID

1. While viewing your page in Notion, look at the URL in your browser
2. It will look something like: `https://www.notion.so/Your-Page-Name-abc123def456...`
3. The page ID is the long string of letters and numbers at the end (after the last `-`)
4. For example, if the URL ends with `Design-Scout-abc123def456`, the page ID is `abc123def456`

Add it to your `.env` file:

```
NOTION_PARENT_PAGE_ID=abc123def456
```

## Step 6: Run the Setup Script

Open your terminal, navigate to the Design Scout folder, and run:

```bash
node scripts/setup-notion.js
```

This will create two databases in your Notion page:
- **Design Scout Sources** -- where your newsletter sources are tracked
- **Design Scout Briefings** -- where your design briefings are stored

## Step 7: Copy the Database IDs

The script will print something like:

```
NOTION_SOURCES_DB_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
NOTION_BRIEFINGS_DB_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

Copy both lines and paste them into your `.env` file.

Your final `.env` should have these Notion lines:

```
NOTION_API_KEY=ntn_your-secret-key-here
NOTION_SOURCES_DB_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
NOTION_BRIEFINGS_DB_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

You can now remove the `NOTION_PARENT_PAGE_ID` line from `.env` -- it was only needed for setup.

---

## Troubleshooting

- **"Set NOTION_API_KEY and NOTION_PARENT_PAGE_ID in your .env first"** -- Make sure both values are in your `.env` file.
- **"Could not find page"** -- Make sure you shared the page with your integration (Step 4). The integration can only see pages it has been explicitly connected to.
- **"Invalid API key"** -- Double-check that you copied the full key starting with `ntn_`.
