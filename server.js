const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const buildPath = path.join(__dirname, 'build');
const indexHtml = path.join(buildPath, 'index.html');

if (!fs.existsSync(indexHtml)) {
  console.error(`Missing ${indexHtml}. Run "npm run build" before starting the server.`);
}

// Serve hashed static assets from the React build
app.use(express.static(buildPath, {
  index: false,
  maxAge: '1y',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('index.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  },
}));

// SPA fallback: any non-file route (e.g. /Insights, /About) serves index.html
// so React Router can handle it. Using app.use (not app.get('*')) avoids
// Express path-to-regexp issues with bare "*" wildcards.
app.use((req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(indexHtml, (err) => {
    if (err) {
      console.error('Failed to serve index.html:', err.message);
      res.status(500).type('text/plain').send('App failed to load');
    }
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(`Serving SPA from ${buildPath}`);
});
