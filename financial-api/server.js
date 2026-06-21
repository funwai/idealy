/**
 * Financial Data API Service
 * Fetches income statement and cash flow data from Firestore + Firebase Storage
 * 
 * Endpoints:
 * GET /api/financial-data?ticker=AAPL&year=2024 - Get financial data for a ticker/year
 * GET /api/health - Health check
 */

const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));
app.use(express.json());

// Initialize Firebase Admin SDK
// Option 1: Use service account JSON (set GOOGLE_APPLICATION_CREDENTIALS env var)
// Option 2: Use environment variables for credentials
if (!admin.apps.length) {
  console.log('Initializing Firebase Admin...');
  const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT;
  console.log('FIREBASE_SERVICE_ACCOUNT_JSON exists:', !!process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  console.log('FIREBASE_SERVICE_ACCOUNT exists:', !!process.env.FIREBASE_SERVICE_ACCOUNT);
  console.log('GOOGLE_APPLICATION_CREDENTIALS exists:', !!process.env.GOOGLE_APPLICATION_CREDENTIALS);
  
  if (serviceAccountEnv) {
    try {
      // Service account JSON provided as base64-encoded env var
      const decoded = Buffer.from(serviceAccountEnv, 'base64').toString();
      const serviceAccount = JSON.parse(decoded);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: 'funwai-resume',
        storageBucket: 'funwai-resume.firebasestorage.app'
      });
      console.log('Firebase Admin initialized successfully with service account');
    } catch (error) {
      console.error('Error initializing Firebase Admin:', error.message);
      console.error('Make sure FIREBASE_SERVICE_ACCOUNT_JSON is base64-encoded JSON');
      throw error;
    }
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // Use service account file path
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: 'funwai-resume',
      storageBucket: 'funwai-resume.firebasestorage.app'
    });
  } else {
    // Fallback: try to use default credentials (works on Render with env vars)
    try {
      admin.initializeApp({
        projectId: 'funwai-resume',
        storageBucket: 'funwai-resume.firebasestorage.app'
      });
    } catch (error) {
      console.error('Firebase Admin initialization error:', error.message);
      console.error('Set FIREBASE_SERVICE_ACCOUNT_JSON (base64 JSON) or GOOGLE_APPLICATION_CREDENTIALS');
    }
  }
}

const db = admin.firestore();
const storage = admin.storage();

/**
 * Convert gs:// URL to Firebase Storage HTTP URL
 */
function getStorageUrl(gsPath) {
  if (gsPath.startsWith('gs://')) {
    const withoutGs = gsPath.replace('gs://', '');
    const slashIdx = withoutGs.indexOf('/');
    const bucket = withoutGs.substring(0, slashIdx);
    const objectPath = withoutGs.substring(slashIdx + 1);
    const encoded = objectPath.split('/').map(encodeURIComponent).join('/');
    return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encoded}?alt=media`;
  }
  return null;
}

/**
 * Fetch JSON from Firebase Storage using storageGsPath
 */
async function fetchJsonFromStorage(storageGsPath) {
  try {
    // Parse gs:// URL
    if (!storageGsPath.startsWith('gs://')) {
      throw new Error('Invalid storage path format');
    }

    const withoutGs = storageGsPath.replace('gs://', '');
    const slashIdx = withoutGs.indexOf('/');
    const bucketName = withoutGs.substring(0, slashIdx);
    const objectPath = withoutGs.substring(slashIdx + 1);

    // Get file from Firebase Storage
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(objectPath);
    
    // Download and parse JSON
    const [contents] = await file.download();
    return JSON.parse(contents.toString());
  } catch (error) {
    console.error('Error fetching from storage:', error);
    throw new Error(`Failed to fetch JSON from storage: ${error.message}`);
  }
}

/**
 * GET /api/financial-data?ticker=AAPL
 * Returns income statement and cash flow for the latest 10-K filing
 */
app.get('/api/financial-data', async (req, res) => {
  const ticker = req.query.ticker?.trim().toUpperCase();
  
  if (!ticker) {
    return res.status(400).json({ error: 'Missing ticker query parameter' });
  }

  try {
    // 1. Get filings from companies/{ticker}/filings
    const filingsRef = db.collection('companies').doc(ticker).collection('filings');
    const filingsSnapshot = await filingsRef.get();

    if (filingsSnapshot.empty) {
      return res.status(404).json({ error: `No filings found for ticker ${ticker}` });
    }

    // 2. Get 10-K filings (e.g. 2025_10K)
    const filings = filingsSnapshot.docs
      .map((doc) => ({ id: doc.id, data: doc.data() }))
      .filter((f) => /^\d{4}_10K$/i.test(f.id))
      .sort((a, b) => {
        const yearA = parseInt(a.id.split('_')[0], 10);
        const yearB = parseInt(b.id.split('_')[0], 10);
        return yearB - yearA;
      });

    if (filings.length === 0) {
      return res.status(404).json({ error: `No 10-K filings found for ticker ${ticker}` });
    }

    const requestedYear = req.query.year?.trim();
    let selectedFiling = filings[0];

    if (requestedYear) {
      const matchingFiling = filings.find(
        (filing) => filing.id.split('_')[0] === requestedYear
      );

      if (!matchingFiling) {
        return res.status(404).json({
          error: `No 10-K filing found for ticker ${ticker} in ${requestedYear}`,
        });
      }

      selectedFiling = matchingFiling;
    }

    const filingYear = selectedFiling.id.split('_')[0];
    const statementsRef = db
      .collection('companies')
      .doc(ticker)
      .collection('filings')
      .doc(selectedFiling.id)
      .collection('statements');

    // 3. Get incomeStatement and cashFlow docs
    const incomeStatementDoc = await statementsRef.doc('incomeStatement').get();
    const cashFlowDoc = await statementsRef.doc('cashFlow').get();

    let incomeStatement = null;
    let cashFlow = null;

    if (incomeStatementDoc.exists) {
      const data = incomeStatementDoc.data();
      if (data.storageGsPath) {
        incomeStatement = await fetchJsonFromStorage(data.storageGsPath);
      }
    }

    if (cashFlowDoc.exists) {
      const data = cashFlowDoc.data();
      if (data.storageGsPath) {
        cashFlow = await fetchJsonFromStorage(data.storageGsPath);
      }
    }

    if (!incomeStatement && !cashFlow) {
      return res.status(404).json({ error: 'No financial statements found for this company' });
    }

    // 4. Return combined data
    res.json({
      ticker,
      filing_year: filingYear,
      income_statement: incomeStatement,
      cash_flow: cashFlow
    });
  } catch (error) {
    console.error('Error fetching financial data:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * GET /api/health
 */
app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'financial-data-api' });
});

app.listen(PORT, () => {
  console.log(`Financial Data API running on port ${PORT}`);
});
