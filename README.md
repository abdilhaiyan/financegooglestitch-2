# FamFinance — Master Family Ledger

A Google Sheets–backed family finance dashboard with a modern web frontend. Record transactions, track recurring bills, and manage shared savings goals — all synced live from your spreadsheet.

## Features

- **Dashboard** — Monthly income, expenses, net balance, upcoming bills, and goal progress at a glance.
- **Transactions** — Full CRUD with search/filter. Add, edit, and delete transactions synced to your sheet.
- **Recurring Bills** — Manage subscriptions and regular payments with due dates and payment portal links.
- **Family Goals** — Shared savings goals with progress bars and contribution tracking.
- **Dark Mode** — Toggle between light and dark themes, persisted across sessions.
- **Responsive** — Works on desktop, tablet, and mobile with a bottom nav bar.
- **Auto-Sync** — Refreshes data every 60 seconds.

## Project Structure

```
famfinance/
├── index.html              # Main web app
├── README.md               # You're reading it
├── .gitignore              # Git ignore rules
├── apps-script/
│   └── Code.gs             # Google Apps Script backend (deploy this to GAS)
├── css/
│   └── styles.css          # All styles (light + dark themes)
├── js/
│   ├── config.example.js   # EXAMPLE config — copy to config.js
│   ├── config.js           # YOUR config (gitignored — contains real endpoint URL)
│   ├── api.js              # API layer (fetch wrapper for all backend calls)
│   ├── state.js            # Centralised app state + computed helpers
│   ├── render.js           # DOM rendering functions
│   └── app.js              # Controller: navigation, modals, event handlers
```

## Setup Instructions

### 1. Google Sheets Setup

1. Create a new Google Sheet.
2. Add three sheets (tabs) with these exact headers:

**Sheet: `Transactions`**

| TransactionID | Date | User | Merchant | Category | Amount | Status | Timestamp |
|---------------|------|------|----------|----------|--------|--------|-----------|

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

> ⚠️ Whenever you update `Code.gs`, you must deploy again. Use **Deploy → Manage Deployments → Edit (pencil icon) → Version: New** to update without changing the URL. Only use **New Deployment** if you want a fresh URL.

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
| **Dashboard** | See monthly stats, recent transactions, upcoming bills |
| **Payments & Bills** | Record new transactions, add/edit/delete recurring bills, click Pay links |
| **Transactions** | Search, edit, or delete any transaction |
| **Family Goals** | Create goals, contribute funds, edit or delete goals |
| **Settings** | View endpoint config and update instructions |

## Updating After Changes

Whenever you update the code in this repo:

### Backend (`Code.gs`)
1. Open your Google Sheet → Extensions → Apps Script
2. Replace the code with the latest `apps-script/Code.gs`
3. **Deploy → Manage Deployments → Edit (pencil) → Version: New → Deploy**
4. The URL stays the same — no config changes needed.

### Frontend (HTML/CSS/JS)
1. Push changes to your GitHub repo
2. GitHub Pages auto-deploys within ~1 minute
3. If using another host, re-upload the changed files

### Adding New Config
If a new config key is added to `config.example.js`, copy it into your `config.js` manually (your `config.js` is gitignored and won't be overwritten).

## Security Notes

- Your Apps Script URL is in `js/config.js` which is **gitignored**. Never commit your real URL.
- The Apps Script is deployed to execute as **you** — anyone with the URL can call it. The "Anyone" access means no Google login is required, which is why the frontend works without auth. If you need authentication, change the Apps Script access to "Anyone with Google account" and add Google Sign-In to the frontend.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Loading..." never finishes | Check that `js/config.js` exists and has your real Apps Script URL |
| POST requests fail silently | Make sure the Apps Script is deployed with "Anyone" access |
| Data not syncing | Open the Apps Script editor and check **Executions** for error logs |
| CORS errors | Redeploy the Apps Script — new deployments auto-enable CORS |
| "Sheet not found" | Verify sheet tab names are exactly `Transactions`, `RecurringPayments`, `FamilyGoals` |

## License

MIT — use freely for your family.
