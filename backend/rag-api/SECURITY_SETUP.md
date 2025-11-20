# Security Setup Guide

## Firebase Credentials Security

Your Firebase service account credentials should **never** be committed to the repository.

## Current Setup

The RAG API now uses **environment variables** instead of hardcoded credential files.

### How It Works

1. **Production (Render.com):**
   - Credentials are stored as environment variables in the Render dashboard
   - No credential files are needed in the repository

2. **Local Development:**
   - Option 1: Use a `.env` file (recommended)
   - Option 2: Use credential file (only for local testing)

## Setting Up Local Development

### Step 1: Create a `.env` File

In `backend/rag-api/` directory, create a `.env` file:

```bash
# Firebase Service Account JSON (paste entire JSON content here)
FIREBASE_SERVICE_ACCOUNT_JSON={"type": "service_account", "project_id": "funwai-resume", ...}
```

**IMPORTANT:** This `.env` file should NEVER be committed to git!

### Step 2: Load Environment Variables

Make sure you're loading the `.env` file in your code. You can use `python-dotenv`:

```python
from dotenv import load_dotenv
load_dotenv()
```

### Step 3: Run Your Application

```bash
cd backend/rag-api
python main.py
```

## Setting Up Render.com

### Step 1: Go to Render Dashboard

1. Navigate to your service settings
2. Go to "Environment" section
3. Click "Add Environment Variable"

### Step 2: Add the Firebase Credentials

- **Name:** `FIREBASE_SERVICE_ACCOUNT_JSON`
- **Value:** Paste your entire Firebase JSON file content here

**IMPORTANT:** The value should be the JSON as a string (no formatting)

### Step 3: Redeploy

After adding the environment variable, trigger a redeploy.

## Security Checklist

- ✅ No credential files in git repository
- ✅ `.env` files in `.gitignore`
- ✅ Environment variables used for all sensitive data
- ✅ Render.com using secure environment variables
- ✅ Local development uses `.env` file

## Troubleshooting

### "Credentials not found" error

Make sure:
1. Environment variable is set correctly
2. JSON is properly formatted (no extra spaces)
3. You're loading `.env` if developing locally

### "Permission denied" error

Check:
1. Service account has necessary permissions
2. Project ID is correct
3. Bucket name is correct










