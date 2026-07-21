# FamFinance — Master Family Ledger

A Google Sheets–backed family finance dashboard with a modern web frontend. Record transactions, track recurring bills, and manage shared savings goals — all synced live from your spreadsheet.

## Features

- **🔐 Login System** — Each family member signs in with their own username + PIN. They only see their own transactions plus shared household data. Everyone can see goals and recurring bills.
- **📊 Dashboard** — Monthly income, expenses, net balance, upcoming bills, and goal progress at a glance.
- **💳 Transactions** — Full CRUD with search/filter. Add, edit, and delete transactions synced to your sheet.
- **📅 Recurring Bills** — Manage subscriptions and regular payments with due dates and payment portal links.
- **🎯 Family Goals** — Shared savings goals with progress bars and contribution tracking.
- **🌙 Dark Mode** — Toggle between light and dark themes, persisted across sessions.
- **📱 Responsive** — Works on desktop, tablet, and mobile with a bottom nav bar.
- **🔄 Auto-Sync** — Refreshes data every 60 seconds.

## Project Structure

```
famfinance/
├── index.html              # Main web app
├── README.md               # You're reading it
├── .gitignore              # Git ignore rules
├── apps-script/
│   └── Code.gs             # Google Apps Script backend (deploy this to GAS)
├── css/
│   └── styles.css          # All styles (light + dark themes + login page)
├── js/
│   ├── config.example.js   # EXAMPLE config — copy to config.js
│   ├── config.js           # YOUR config (gitignored — contains real endpoint URL)
│   ├── api.js              # API layer (fetch wrapper + auth)
│   ├── state.js            # Centralised app state + user session
│   ├── render.js           # DOM rendering functions
│   └── app.js              # Controller: nav, modals, auth, events
```

## Setup Instructions

### 1. Google Sheets Setup

Create a new Google Sheet. Add **four** sheets (tabs) with these exact headers:

**Sheet: `Users`** (NEW — for login)

| Username | PIN | DisplayName |
|----------|-----|-------------|
| abdil | 1234 | Abdil |
| aj | 5678 | AJ |

> **Important:** Username matching is case-insensitive. PINs should be 4-6 digits. Everyone uses this to sign in. Add as many rows as you have family members.

**Sheet: `Transactions`**

| TransactionID | Date | User | Merchant | Category | Amount | Status | Timestamp |
|---------------|------|------|----------|----------|--------|--------|-----------|

> The `User` column must match the usernames in the Users sheet (case-insensitive). Use `Shared Household` for transactions everyone should see.

**Sheet: `RecurringPayments`**

| BillID | Name | Amount | DueDate | Category | PayLink |
|--------|------|--------|---------|----------|---------|

**Sheet: `FamilyGoals`**

| GoalName | TargetAmount | CurrentSaved | Deadline |
|----------|-------------|-------------|----------|

### 2. Deploy the Apps Script Backend

1. In your Google Sheet, go to **Extensions → Apps Script**.
2. Delete any placeholder code and paste the contents of `apps-script/Code.gs`.
3. Click **Deploy → New Deployment**.
4. Choose **Web App**.
5. Set:
   - **Execute as:** Me
   - **Who has access:** Anyone
6. Click **Deploy**, then **Authorize** when prompted.
7. **Copy the resulting URL** — it looks like:
   ```
   https://script.google.com/macros/s/AKfycb.../exec
   ```

> ⚠️ **Authorization is critical.** If you skip authorization or it expires, all POST requests (add/edit/delete) will fail silently. If things aren't working, the #1 fix is to re-deploy and re-authorize.

### 3. Configure the Frontend

1. Copy the example config:
   ```bash
   cp js/config.example.js js/config.js
   ```
2. Open `js/config.js` and paste your Apps Script URL:
   ```js
   const FAMFINANCE_CONFIG = {
     endpoint: "https://script.google.com/macros/s/AKfycb.../exec"
   };
   ```

### 4. Deploy the Frontend

#### Option A: GitHub Pages (Recommended)

1. Push this entire `famfinance/` folder to a GitHub repo.
2. Go to **Settings → Pages**.
3. Set **Source** to `main` branch, root folder.
4. Your app will be live at `https://<username>.github.io/<repo>/`.

#### Option B: Local Development

Just open `index.html` in your browser. The `config.js` file must exist with your real endpoint URL.

#### Option C: Any Static Host

Upload the folder to Netlify, Vercel, Firebase Hosting, or any static file server. No build step required.

## Using the App

| View | What You Can Do |
|------|----------------|
| **Login** | Sign in with your username + PIN |
| **Dashboard** | See your monthly stats, recent transactions, upcoming bills |
| **Payments & Bills** | Record new transactions, add/edit/delete recurring bills, click Pay links |
| **Transactions** | Search, edit, or delete your own transactions |
| **Family Goals** | Create goals, contribute funds, edit or delete goals (shared) |
| **Settings** | Test backend connection, view config, troubleshoot |

### How Login & Data Filtering Works

- Each user signs in with their **username** and **PIN** (stored in the `Users` sheet)
- After login, the app shows only:
  - **Transactions** where `User` matches their username OR is "Shared Household"
  - **Recurring bills** — visible to everyone
  - **Family goals** — visible to everyone
- New transactions default to the logged-in user's name

## Updating After Changes

### Backend (`Code.gs`)
1. Open your Google Sheet → Extensions → Apps Script
2. Replace the code with the latest `apps-script/Code.gs`
3. **Deploy → Manage Deployments → Edit (pencil icon) → Version: New → Deploy**
4. The URL stays the same — no config changes needed.

### Frontend (HTML/CSS/JS)
1. Push changes to your GitHub repo
2. GitHub Pages auto-deploys within ~1 minute
3. If using another host, re-upload the changed files

## Troubleshooting

### "Error: ..." when adding/editing/deleting

**This is the #1 issue.** The fix is almost always:

1. Open your Google Sheet → **Extensions → Apps Script**
2. Click **Deploy → Manage Deployments**
3. Click the **pencil (✎)** icon next to your Web App
4. Change **Version** to **"New"** → click **Deploy**
5. **Authorize** when the Google popup appears
6. Wait 30 seconds, then go to the app's **Settings** page → click **Test Connection**

### Test Connection says "FAILED"

| Message | Fix |
|---------|-----|
| "HTTP 404" | Apps Script URL is wrong — check `config.js` |
| "not valid JSON" | Script isn't deployed as a Web App — redeploy |
| "Script not found" | Deployment was deleted — create a New Deployment |

### "Invalid username or PIN"

- Check the `Users` sheet — make sure the username matches (case-insensitive) and the PIN column has the right value
- PINs are compared as strings, so `1234` and `"1234"` both work

### "Sheet 'Users' not found"

The new `Users` sheet is required. Create it in your spreadsheet with columns: `Username | PIN | DisplayName`.

### Data not syncing

Open the Apps Script editor and check **Executions** (left sidebar) for error logs.

## Security Notes

- This is a **family-grade** PIN system, not enterprise authentication
- The Apps Script is deployed with "Anyone" access — anyone with the URL can call it
- PINs are stored in plain text in your Google Sheet — only share sheet access with trusted family members
- Your `config.js` is gitignored — never commit your real URL to GitHub
- For stronger security, restrict the Google Sheet's sharing to family members only

## License

MIT — use freely for your family.
