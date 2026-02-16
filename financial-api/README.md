# Financial Data API Service

API service that fetches income statement and cash flow data from Firestore and Firebase Storage.

## Setup

### 1. Install Dependencies

```bash
cd financial-api
npm install
```

### 2. Firebase Admin SDK Setup

You need Firebase Admin credentials. Choose one method:

#### Option A: Service Account JSON (Recommended for Render)

1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate New Private Key" → Download JSON
3. Base64 encode the JSON file:
   ```bash
   # On Mac/Linux
   base64 -i path/to/serviceAccountKey.json
   
   # On Windows (PowerShell)
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("path/to/serviceAccountKey.json"))
   ```
4. Set environment variable in Render:
   - Key: `FIREBASE_SERVICE_ACCOUNT`
   - Value: (paste the base64 encoded string)

#### Option B: Service Account File Path

Set environment variable:
- Key: `GOOGLE_APPLICATION_CREDENTIALS`
- Value: `/path/to/serviceAccountKey.json`

#### Option C: Default Credentials (GCP/Render)

If running on GCP or Render with proper IAM, it may use default credentials automatically.

### 3. Environment Variables (Render)

Set these in your Render service:

- `FIREBASE_SERVICE_ACCOUNT` - Base64 encoded service account JSON (Option A)
- `ALLOWED_ORIGINS` - Comma-separated origins for CORS (e.g., `https://kurio.onrender.com,http://localhost:3000`)
- `PORT` - Port number (Render sets this automatically)

## API Endpoints

### GET /api/financial-data?ticker=AAPL

Returns income statement and cash flow for the latest 10-K filing.

**Query Parameters:**
- `ticker` (required) - Company ticker symbol (e.g., AAPL, MSFT)

**Response:**
```json
{
  "ticker": "AAPL",
  "filing_year": "2025",
  "income_statement": { ... },
  "cash_flow": { ... }
}
```

**Example:**
```bash
curl "https://your-api.onrender.com/api/financial-data?ticker=AAPL"
```

### GET /api/health

Health check endpoint.

**Response:**
```json
{
  "ok": true,
  "service": "financial-data-api"
}
```

## Deploying to Render

1. Create a new **Web Service** in Render
2. Connect your GitHub repository
3. Set:
   - **Root Directory:** `financial-api`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. Add environment variables (see Setup section)
5. Deploy

## Local Development

```bash
cd financial-api
npm install
# Set FIREBASE_SERVICE_ACCOUNT or GOOGLE_APPLICATION_CREDENTIALS
npm start
```

The API will run on `http://localhost:3002` (or PORT env var).
