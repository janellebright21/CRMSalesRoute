# Customer Route Planner

A private app that runs on your own computer. No internet hosting, no monthly fees, no account needed. All your customer data stays on your machine in your browser's local storage.

---

## What you need first

Before you can run this app, you need to install **Node.js** (free software that runs the app). You only do this once.

### Step 1 — Install Node.js

1. Go to **https://nodejs.org**
2. Click the big green button that says **"LTS"** (recommended for most users)
3. Download and run the installer
4. Click through the installer — all default settings are fine
5. When it finishes, restart your computer

**How to check it worked:** Open a terminal (see below) and type:
```
node --version
```
You should see something like `v20.11.0`. Any number works.

---

## How to open a terminal

A "terminal" is a text window where you type commands. Here is how to open one:

- **Windows:** Press the Windows key, type `cmd`, and press Enter. Or right-click the Start button and choose "Command Prompt" or "Windows PowerShell".
- **Mac:** Press Command + Space, type `Terminal`, and press Enter.
- **Linux:** Press Ctrl + Alt + T, or search for "Terminal" in your apps.

---

## Step 2 — Download the app files

If you received this app as a ZIP file:

1. Find the ZIP file on your computer
2. Right-click it and choose **"Extract All"** (Windows) or double-click it (Mac)
3. Remember where you extracted it — for example: `C:\Users\YourName\Downloads\route-planner`

---

## Step 3 — Navigate to the app folder in the terminal

In your terminal, type `cd` followed by the path to the folder. Examples:

**Windows:**
```
cd C:\Users\YourName\Downloads\route-planner
```

**Mac / Linux:**
```
cd /Users/YourName/Downloads/route-planner
```

> Tip: You can drag the folder from File Explorer or Finder and drop it into the terminal window — it will type the path for you automatically.

After typing the cd command, press **Enter**.

---

## Step 4 — Install dependencies (first time only)

In the terminal, type this exactly and press Enter:

```
npm install
```

This downloads the code libraries the app needs. It may take 1–2 minutes. You will see a lot of text scroll by — that is normal. When it finishes, you will see your cursor again.

> You only need to do this once. Skip this step next time you want to run the app.

---

## Step 5 — Start the app

In the terminal, type this and press Enter:

```
npm run dev
```

You will see output that looks like this:

```
  VITE v5.x.x  ready in 500 ms

  ➜  Local:   http://localhost:5173/
```

---

## Step 6 — Open the app in your browser

Open any web browser (Chrome, Firefox, Edge, Safari) and go to this address:

```
http://localhost:5173
```

The app will open. You can bookmark this address for easy access.

---

## Stopping the app

When you are done, go back to the terminal and press **Ctrl + C** (hold Control and press C). This stops the app. Your data is saved automatically and will be there next time you start the app.

---

## Starting the app again next time

1. Open a terminal
2. Navigate to the app folder: `cd path/to/route-planner`
3. Type: `npm run dev`
4. Open your browser to: `http://localhost:5173`

That's it — steps 1 and 4 (installing Node.js and running `npm install`) only need to be done once.

---

## How to use the app

### Importing your customers

1. Click the **Import Customers** tab on the left
2. Prepare a spreadsheet (.xlsx or .csv) with your customer data
3. Drag the file onto the upload area, or click it to browse
4. Review the preview, then click **Import Customers**

Your spreadsheet should have a header row with these column names (spelling matters, capitalization does not):

| Column name | What it contains |
|-------------|-----------------|
| Name | Customer's full name (required) |
| Company | Business name |
| Address | Street address |
| City | City |
| State | State (e.g. IL) |
| Zip | ZIP code |
| Phone | Phone number |
| Email | Email address |
| Priority | high, medium, or low |
| Last Visit | Date of last visit (e.g. 2024-03-15) |
| Follow Up | Follow-up date |
| Notes | Visit notes |

---

### Finding customers and building a route

1. Click **Find Nearby Customers**
2. Choose a city from the dropdown
3. Choose how far to search (10, 25, 50, or 75 miles)
4. Click **Find Customers** — customers in and near that city appear
5. Check the boxes next to customers you want to visit
6. Click **Build Route** (or click the Route tab)
7. Optionally type a starting address (your office or home)
8. Drag stops to reorder them, or use the up/down arrows
9. Click **Open in Google Maps** to get turn-by-turn directions

---

### Tracking visits and follow-ups

- **Visit Notes tab:** Log what happened at each visit and when you visited
- **Follow-Ups tab:** Set follow-up dates and mark them done when complete
- **Dashboard tab:** See overdue visits and upcoming follow-ups at a glance

---

### Exporting your data

- Go to **Customer List** and click **Export** to download an Excel file
- Or go to **Settings** and click **Export Excel**

This is a good way to back up your data regularly.

---

## Your data is private

- Everything is stored in your web browser's local storage on your computer
- Nothing is uploaded to any server or cloud
- Clearing your browser's site data or cache for `localhost` will erase your customers — export regularly as a backup
- The distance search uses a free public map service (OpenStreetMap) to look up coordinates — this requires an internet connection
- The Google Maps route link requires internet to open

---

## Troubleshooting

**"npm is not recognized" or "command not found"**
Node.js was not installed correctly. Go back to Step 1, download the installer again, and make sure you restart your computer after installing.

**The page shows an error or nothing loads**
Make sure `npm run dev` is still running in the terminal. If you closed the terminal, open a new one and run it again.

**The app is slow to load the first time**
Normal — it is compiling. Should be ready in a few seconds.

**I see "port 5173 is already in use"**
Another copy of the app is already running. Either use that one, or close the terminal that has it running and try again.

**I accidentally cleared my browser data / lost my customers**
Always export your data to Excel regularly (Customer List → Export) so you have a backup file.

---

## Building a shareable version (optional)

If you want to create a folder of files you can copy to a USB drive or a simple web server:

```
npm run build
```

The output goes into a `dist/` folder. You can open `dist/index.html` directly in a browser, or copy the whole `dist/` folder anywhere.
