# Gmail OAuth2 Setup Guide

This guide walks you through connecting Design Scout to your Gmail account so it can read your design newsletter emails.

**Time needed:** About 10 minutes

---

## Step 1: Create a Google Cloud Project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Sign in with the Google account that has your design newsletters
3. Click the project dropdown at the top of the page (it might say "Select a project")
4. Click **New Project**
5. Name it something like `Design Scout`
6. Click **Create**
7. Make sure your new project is selected in the dropdown

## Step 2: Enable the Gmail API

1. In the left sidebar, click **APIs & Services** > **Library**
2. Search for `Gmail API`
3. Click on **Gmail API** in the results
4. Click the blue **Enable** button
5. Wait a moment for it to activate

## Step 3: Set Up the OAuth Consent Screen

1. In the left sidebar, click **APIs & Services** > **OAuth consent screen**
2. Select **External** as the user type, then click **Create**
3. Fill in:
   - **App name:** `Design Scout`
   - **User support email:** your email
   - **Developer contact email:** your email
4. Click **Save and Continue** through the remaining steps (you can skip adding scopes for now)
5. Under **Test users**, add your own Gmail address
6. Click **Save and Continue**, then **Back to Dashboard**

## Step 4: Create OAuth2 Credentials

1. In the left sidebar, click **APIs & Services** > **Credentials**
2. Click **+ Create Credentials** at the top
3. Choose **OAuth client ID**
4. For **Application type**, select **Desktop app**
5. Name it `Design Scout` (or anything you like)
6. Click **Create**
7. You will see a popup with your **Client ID** and **Client Secret** -- keep this open!

## Step 5: Add Credentials to Your .env File

Open the `.env` file in your Design Scout project folder and add these two lines (replace the values with your actual credentials from Step 4):

```
GMAIL_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your-client-secret-here
```

Save the file.

## Step 6: Run the Auth Script

Open your terminal, navigate to the Design Scout folder, and run:

```bash
node scripts/gmail-auth.js
```

This will:
1. Print a URL -- open it in your browser
2. Sign in with your Google account
3. Click **Allow** to authorize Design Scout
4. You will be redirected and the terminal will show your refresh token

## Step 7: Copy the Refresh Token

The script will print something like:

```
GMAIL_REFRESH_TOKEN=1//0eXxXxXxXxXxXx...
```

Copy that entire line and paste it into your `.env` file. Your `.env` should now have three Gmail lines:

```
GMAIL_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your-client-secret-here
GMAIL_REFRESH_TOKEN=1//0eXxXxXxXxXxXx...
```

You are all set! You only need to do this once -- the refresh token lets Design Scout access your Gmail going forward.

---

## Troubleshooting

- **"Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in your .env first"** -- Make sure your `.env` file has the correct values from Step 4.
- **"Access blocked" in the browser** -- Go back to the OAuth consent screen and make sure you added your email as a test user (Step 3.5).
- **The browser shows an error page after signing in** -- Make sure no other app is using port 3000, then try running the script again.
