const express = require('express');
const path = require('path');
const app = express();

/**
 * API: Fetch JSON from Firebase Storage using storageGsPath.
 * Query params: path (required) - full gs:// URL or path like filings/A/2025/statements/incomeStatement.json
 * Example: GET /api/financial-statement?path=gs://funwai-resume.firebasestorage.app/filings/A/2025/statements/incomeStatement.json
 */
app.get('/api/financial-statement', async (req, res) => {
  const pathParam = req.query.path;
  if (!pathParam) {
    return res.status(400).json({ error: 'Missing path query parameter' });
  }

  const getStorageUrl = (gsPathOrPath) => {
    if (gsPathOrPath.startsWith('gs://')) {
      const withoutGs = gsPathOrPath.replace('gs://', '');
      const slashIdx = withoutGs.indexOf('/');
      const bucket = withoutGs.substring(0, slashIdx);
      const objectPath = withoutGs.substring(slashIdx + 1);
      const encoded = objectPath.split('/').map(encodeURIComponent).join('/');
      return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encoded}?alt=media`;
    }
    const bucket = 'funwai-resume.firebasestorage.app';
    const encoded = gsPathOrPath.split('/').map(encodeURIComponent).join('/');
    return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encoded}?alt=media`;
  };

  try {
    const url = getStorageUrl(pathParam);
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(response.status).json({ error: `Storage returned ${response.status}` });
    }
    const json = await response.json();
    res.json(json);
  } catch (err) {
    console.error('Error fetching financial statement:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch' });
  }
});

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'build')));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});






