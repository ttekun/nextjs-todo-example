const fs = require('fs');
const path = require('path');
const https = require('https');
const { exec } = require('child_process');

// Create target directory if it doesn't exist
const targetDir = path.join(__dirname, 'public', 'duckdb-wasm');
if (!fs.existsSync(targetDir)) {
  console.log('Creating directory:', targetDir);
  fs.mkdirSync(targetDir, { recursive: true });
}

// Read DuckDB-WASM version from package.json
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
const duckdbVersion = packageJson.dependencies['@duckdb/duckdb-wasm'].replace('^', '');
console.log(`Using DuckDB-WASM version: ${duckdbVersion}`);

// CDN base URL
const cdnBase = `https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@${duckdbVersion}/dist`;

// Files to download
const files = [
  // Required files
  { url: `${cdnBase}/duckdb-eh.wasm`, dest: path.join(targetDir, 'duckdb-eh.wasm') },
  { url: `${cdnBase}/duckdb-browser-eh.worker.js`, dest: path.join(targetDir, 'duckdb-browser-eh.worker.js') },

  // Source maps (useful during development)
  { url: `${cdnBase}/duckdb-browser-eh.worker.js.map`, dest: path.join(targetDir, 'duckdb-browser-eh.worker.js.map') },

  // Optional alternative bundles
  { url: `${cdnBase}/duckdb-mvp.wasm`, dest: path.join(targetDir, 'duckdb-mvp.wasm') },
  { url: `${cdnBase}/duckdb-browser-mvp.worker.js`, dest: path.join(targetDir, 'duckdb-browser-mvp.worker.js') },
  { url: `${cdnBase}/duckdb-browser-mvp.worker.js.map`, dest: path.join(targetDir, 'duckdb-browser-mvp.worker.js.map') },
  { url: `${cdnBase}/duckdb-coi.wasm`, dest: path.join(targetDir, 'duckdb-coi.wasm') },
  { url: `${cdnBase}/duckdb-browser-coi.worker.js`, dest: path.join(targetDir, 'duckdb-browser-coi.worker.js') },
  { url: `${cdnBase}/duckdb-browser-coi.worker.js.map`, dest: path.join(targetDir, 'duckdb-browser-coi.worker.js.map') },
  { url: `${cdnBase}/duckdb-browser-coi.pthread.worker.js`, dest: path.join(targetDir, 'duckdb-browser-coi.pthread.worker.js') },
  { url: `${cdnBase}/duckdb-browser-coi.pthread.worker.js.map`, dest: path.join(targetDir, 'duckdb-browser-coi.pthread.worker.js.map') }
];

// Download a single file, skipping gracefully on 404
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading ${url}...`);
    const file = fs.createWriteStream(dest);

    https.get(url, (response) => {
      // Skip files that don't exist in this version
      if (response.statusCode === 404) {
        console.warn(`File not found (404): ${url}`);
        file.close();
        fs.unlink(dest, () => {});
        resolve(); // Not a fatal error — continue
        return;
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        console.log(`Downloaded ${url} to ${dest}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {}); // Delete the file on error
      console.error(`Error downloading ${url}:`, err.message);
      resolve(); // Continue even on error
    });
  });
}

// Download all files sequentially
async function downloadAllFiles() {
  let successCount = 0;
  let failCount = 0;

  for (const file of files) {
    try {
      await downloadFile(file.url, file.dest);
      successCount++;
    } catch (error) {
      failCount++;
    }
  }

  console.log(`Download complete. Success: ${successCount}, Failed/Not Found: ${failCount}`);

  if (successCount < 2) {
    throw new Error('Required files could not be downloaded. Please check your network connection.');
  }
}

// Entry point
console.log('Starting DuckDB-WASM file setup...');
downloadAllFiles()
  .then(() => console.log('Setup complete!'))
  .catch(err => {
    console.error('Error during setup:', err);
    process.exit(1);
  });
