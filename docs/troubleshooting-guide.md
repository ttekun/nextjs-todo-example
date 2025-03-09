# TypeScriptとNext.jsのTODOアプリのトラブルシューティングガイド

このドキュメントでは、duck-WASMを使用したTODOアプリで発生する可能性のある問題と、その解決策を説明します。

## 発生する可能性のある問題

### 1. duck-WASM初期化の失敗

**症状**:
- アプリケーションが読み込まれるが、TODOが表示されない
- コンソールに「duck-WASM初期化失敗」のエラーが表示される

**原因**:
- ブラウザの互換性問題
- WebAssemblyのサポート不足
- メモリ制限
- WASMモジュールのロード失敗
- パス指定の誤り

**検証のためのログ**:
```typescript
// DuckDbStorageService.initialize() 内
console.log("duck-WASM初期化開始");
try {
  // 現在のブラウザ情報を記録
  console.log("ブラウザ情報:", window.navigator.userAgent);
  console.log("WASMパス設定:", DUCKDB_CONFIG);
  
  // 初期化コード
  // ...
  
  console.log("duck-WASM初期化成功");
} catch (error) {
  console.error("duck-WASM初期化失敗:", error);
}
```

### 2. 非同期処理のハンドリング不足

**症状**:
- データ操作後に画面が更新されない
- レース条件によるデータの不整合
- 「Unhandled Promise Rejection」エラー

**原因**:
- Promiseのハンドリング不足
- 非同期処理の順序の問題
- エラーキャッチの欠如

**検証のためのログ**:
```typescript
// async関数の実行順序を確認
async function operationWithLogging(operation, ...args) {
  console.log(`${operation}開始:`, ...args);
  try {
    const result = await operation(...args);
    console.log(`${operation}成功:`, result);
    return result;
  } catch (error) {
    console.error(`${operation}失敗:`, error);
    throw error;
  }
}

// 例: getAllTodos関数をラップ
const todos = await operationWithLogging(storage.getAllTodos);
```

### 3. SQLクエリのエラー

**症状**:
- データが保存・更新されない
- クエリエラーがコンソールに表示される

**原因**:
- SQL構文エラー
- テーブルスキーマの不一致
- 制約違反

**検証のためのログ**:
```typescript
// クエリ実行をラップする関数
async function executeQueryWithLogging(conn, query, params = []) {
  console.log("SQL実行:", query, params);
  try {
    const result = await conn.query(query, params);
    console.log("SQL成功:", result);
    return result;
  } catch (error) {
    console.error("SQLエラー:", error, "クエリ:", query, "パラメータ:", params);
    throw error;
  }
}

// 使用例
const result = await executeQueryWithLogging(
  this.conn, 
  "INSERT INTO todos (id, text, done) VALUES (?, ?, ?)",
  [todo.id, todo.text, todo.done]
);
```

### 4. WebAssemblyモジュールのロード失敗

**症状**:
- 「Cannot find module」または「Failed to fetch」エラー
- WASMファイルが見つからないエラー

**原因**:
- パスの設定ミス
- CORSの問題
- ファイルの欠落

**検証のためのログ**:
```typescript
// WASMモジュールのロード前
console.log("WASMモジュールロード開始:");
console.log("- メインモジュールパス:", DUCKDB_CONFIG.mainModule);
console.log("- ワーカーパス:", DUCKDB_CONFIG.mainWorker);

// ファイルの存在確認（開発時のみ）
fetch(DUCKDB_CONFIG.mainModule)
  .then(response => {
    console.log("メインモジュールの存在確認:", response.status);
  })
  .catch(error => {
    console.error("メインモジュールの取得失敗:", error);
  });

fetch(DUCKDB_CONFIG.mainWorker)
  .then(response => {
    console.log("ワーカーの存在確認:", response.status);
  })
  .catch(error => {
    console.error("ワーカーの取得失敗:", error);
  });
```

### 5. パフォーマンス低下

**症状**:
- 初回ロード時間が長い
- 操作のレスポンスが遅い
- メモリ使用量の増加

**原因**:
- WebAssemblyモジュールのロード時間
- 非効率なクエリ
- メモリリーク

**検証のためのログ**:
```typescript
// パフォーマンス測定
console.time("operation-time");
// 操作実行
console.timeEnd("operation-time");

// メモリ使用量（開発時のみ）
console.log("メモリ使用量:", 
  performance.memory ? 
    `${Math.round(performance.memory.usedJSHeapSize / (1024 * 1024))}MB` : 
    "測定不可"
);
```

### 6. ブラウザのシークレットモードなどでの動作不良

**症状**:
- プライベートブラウジングモードでデータが保存されない
- 一部ブラウザでの動作不良

**原因**:
- ストレージ制限
- サードパーティCookieのブロック
- セキュリティポリシー

**検証のためのログ**:
```typescript
// ブラウザモードの検出（完全には不可能）
console.log("プライベートモード検出試行:");
try {
  localStorage.setItem("test", "test");
  localStorage.removeItem("test");
  console.log("- localStorage: 利用可能");
} catch (e) {
  console.log("- localStorage: 利用不可");
}

// IndexedDBの可用性確認
const checkIndexedDB = () => {
  try {
    const request = indexedDB.open("test", 1);
    request.onsuccess = () => {
      console.log("- IndexedDB: 利用可能");
      request.result.close();
      indexedDB.deleteDatabase("test");
    };
    request.onerror = () => {
      console.log("- IndexedDB: 利用不可");
    };
  } catch (e) {
    console.log("- IndexedDB: 例外発生", e);
  }
};
checkIndexedDB();
```

### 7. ブラウザ互換性の問題

**症状**:
- 特定のブラウザでアプリが動作しない
- 古いブラウザでのエラー

**原因**:
- WebAssemblyの未サポート
- モダンJavaScript機能の未サポート
- CSSの互換性問題

**検証のためのログ**:
```typescript
// ブラウザ機能の検出
console.log("ブラウザ互換性チェック:");
console.log("- WebAssembly:", typeof WebAssembly !== "undefined" ? "サポート" : "未サポート");
console.log("- Async/Await:", typeof (async () => {}).constructor === "AsyncFunction" ? "サポート" : "未サポート");
console.log("- ES Modules:", "noModule" in document.createElement("script") ? "サポート" : "未サポート");
```

## 最も可能性の高い問題と検証手順

duck-WASM TODOアプリで最も発生する可能性が高いのは、以下の2つの問題です：

1. **duck-WASM初期化の失敗**
2. **WebAssemblyモジュールのロード失敗**

これらの問題を検証するための具体的な手順は次の通りです：

### 1. 詳細なロギングの追加

```typescript
// pages/duckDbStorage.ts内のinitialize()メソッドに追加

async initialize(): Promise<void> {
  // サーバーサイドレンダリング時は何もしない
  if (typeof window === 'undefined') {
    console.log("サーバーサイドではduck-WASMを初期化しません");
    return;
  }

  if (this.initialized) {
    console.log("duck-WASMは既に初期化されています");
    return;
  }

  if (this.initPromise) {
    console.log("duck-WASM初期化は既に進行中です");
    await this.initPromise;
    return;
  }

  console.log("duck-WASM初期化開始");
  console.log("ブラウザ情報:", window.navigator.userAgent);
  console.log("WebAssemblyサポート:", typeof WebAssembly !== "undefined" ? "あり" : "なし");
  
  this.initPromise = (async () => {
    try {
      // ローカルにあるWASMファイルを指定
      const DUCKDB_CONFIG = {
        mainModule: '/duckdb-wasm/duckdb-eh.wasm',
        mainWorker: '/duckdb-wasm/duckdb-browser-eh.worker.js'
      };
      console.log("WASM設定:", DUCKDB_CONFIG);
      
      // モジュールの存在確認
      try {
        const moduleCheck = await fetch(DUCKDB_CONFIG.mainModule, { method: 'HEAD' });
        console.log("メインモジュール存在確認:", moduleCheck.status);
        
        const workerCheck = await fetch(DUCKDB_CONFIG.mainWorker, { method: 'HEAD' });
        console.log("ワーカー存在確認:", workerCheck.status);
      } catch (fetchError) {
        console.error("WASMファイル確認エラー:", fetchError);
      }

      // データベースの作成
      console.log("DuckDB作成開始");
      const logger = new duckdb.ConsoleLogger();
      const worker = new Worker(DUCKDB_CONFIG.mainWorker);
      console.log("Workerインスタンス作成完了");
      
      this.db = new duckdb.AsyncDuckDB(logger, worker);
      console.log("AsyncDuckDBインスタンス作成完了");
      
      console.time("wasm-instantiate");
      await this.db.instantiate(DUCKDB_CONFIG.mainModule);
      console.timeEnd("wasm-instantiate");
      console.log("DuckDBインスタンス化完了");
      
      console.time("connection-open");
      this.conn = await this.db.connect();
      console.timeEnd("connection-open");
      console.log("接続確立完了");
      
      // テーブル作成
      console.time("table-create");
      await this.conn.query(`
        CREATE TABLE IF NOT EXISTS todos (
          id INTEGER PRIMARY KEY,
          text TEXT NOT NULL,
          done BOOLEAN DEFAULT FALSE
        )
      `);
      console.timeEnd("table-create");
      console.log("テーブル作成完了");
      
      this.initialized = true;
      console.log("duck-WASM初期化成功");
      return this.db;
    } catch (error) {
      console.error("duck-WASM初期化失敗:", error);
      console.error("エラーの詳細:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
      throw error;
    }
  })();

  await this.initPromise;
}
```

### 2. 問題の特定と修正

詳細なログを追加した後、以下のようなトラブルシューティング手順を実施することをお勧めします：

1. **ブラウザの開発者コンソールを開く**
   - F12キーまたは右クリック→「検査」を選択

2. **アプリの再読み込みを行い、ログを確認**
   - WASMファイルの読み込みに関するエラーが表示されるか
   - 初期化プロセスのどの段階で失敗するか

3. **ネットワークタブでファイルのロードを確認**
   - `/duckdb-wasm/duckdb-eh.wasm`と`/duckdb-wasm/duckdb-browser-eh.worker.js`がロードされているか
   - 404エラーが表示されていないか

4. **エラーメッセージに基づいて対応**
   - ファイルが見つからない場合：パスの修正またはファイルの配置を確認
   - WebAssembly未サポートの場合：互換性のあるブラウザの使用を促す
   - メモリ制限の場合：アプリケーションの最適化を検討

5. **簡易的なストレージへのフォールバック実装**
   - duck-WASMが初期化できない場合は、localStorage等のシンプルなストレージに切り替え

この手順で特定された問題に基づいて、アプリケーションのロバスト性を高めることができます。 