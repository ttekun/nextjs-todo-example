const fs = require('fs');
const path = require('path');
const https = require('https');
const { exec } = require('child_process');

// ディレクトリの作成
const targetDir = path.join(__dirname, 'public', 'duckdb-wasm');
if (!fs.existsSync(targetDir)) {
  console.log('Creating directory:', targetDir);
  fs.mkdirSync(targetDir, { recursive: true });
}

// DuckDB-WASMのバージョン（package.jsonから読み取る）
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
const duckdbVersion = packageJson.dependencies['@duckdb/duckdb-wasm'].replace('^', '');
console.log(`Using DuckDB-WASM version: ${duckdbVersion}`);

// CDNのベースURL
const cdnBase = `https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@${duckdbVersion}/dist`;

// DuckDB-WASMファイルのダウンロード設定
const files = [
  // 基本ファイル（必須）
  { url: `${cdnBase}/duckdb-eh.wasm`, dest: path.join(targetDir, 'duckdb-eh.wasm') },
  { url: `${cdnBase}/duckdb-browser-eh.worker.js`, dest: path.join(targetDir, 'duckdb-browser-eh.worker.js') },
  
  // ソースマップ（開発時に便利）
  { url: `${cdnBase}/duckdb-browser-eh.worker.js.map`, dest: path.join(targetDir, 'duckdb-browser-eh.worker.js.map') },
  
  // その他の可能性があるファイル
  { url: `${cdnBase}/duckdb-mvp.wasm`, dest: path.join(targetDir, 'duckdb-mvp.wasm') },
  { url: `${cdnBase}/duckdb-browser-mvp.worker.js`, dest: path.join(targetDir, 'duckdb-browser-mvp.worker.js') },
  { url: `${cdnBase}/duckdb-browser-mvp.worker.js.map`, dest: path.join(targetDir, 'duckdb-browser-mvp.worker.js.map') },
  { url: `${cdnBase}/duckdb-coi.wasm`, dest: path.join(targetDir, 'duckdb-coi.wasm') },
  { url: `${cdnBase}/duckdb-browser-coi.worker.js`, dest: path.join(targetDir, 'duckdb-browser-coi.worker.js') },
  { url: `${cdnBase}/duckdb-browser-coi.worker.js.map`, dest: path.join(targetDir, 'duckdb-browser-coi.worker.js.map') },
  { url: `${cdnBase}/duckdb-browser-coi.pthread.worker.js`, dest: path.join(targetDir, 'duckdb-browser-coi.pthread.worker.js') },
  { url: `${cdnBase}/duckdb-browser-coi.pthread.worker.js.map`, dest: path.join(targetDir, 'duckdb-browser-coi.pthread.worker.js.map') }
];

// ファイルをダウンロードする関数
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading ${url}...`);
    const file = fs.createWriteStream(dest);
    
    https.get(url, (response) => {
      // 404の場合は警告を出してスキップ
      if (response.statusCode === 404) {
        console.warn(`File not found (404): ${url}`);
        file.close();
        fs.unlink(dest, () => {});
        resolve(); // エラーではなく続行を許可
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
      resolve(); // エラーでも続行を許可
    });
  });
}

// すべてのファイルをダウンロード
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
    throw new Error('必須ファイルのダウンロードに失敗しました。ネットワーク接続を確認してください。');
  }
}

// メイン処理
console.log('DuckDB-WASMファイルのセットアップを開始します...');
downloadAllFiles()
  .then(() => console.log('セットアップが完了しました！'))
  .catch(err => {
    console.error('セットアップ中にエラーが発生しました:', err);
    process.exit(1);
  }); 