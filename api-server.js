/**
 * Development API server - run alongside npm start.
 * Usage: node api-server.js
 * React dev server proxies /api/* to this (see package.json "proxy").
 */
const express = require('express');

const app = express();
const PORT = process.env.API_PORT || 3001;

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

app.get('/api/financial-statement', async (req, res) => {
  const pathParam = req.query.path;
  if (!pathParam) {
    return res.status(400).json({ error: 'Missing path query parameter' });
  }

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

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
