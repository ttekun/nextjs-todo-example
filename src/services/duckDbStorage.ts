import { Todo, StorageService } from '../types/todo';

// duck-WASMはクライアントサイドでのみインポート
let duckdb: any;
if (typeof window !== 'undefined') {
  console.log("[DEBUG] duckDbStorage: window定義あり、duckdbをrequire");
  try {
    duckdb = require('@duckdb/duckdb-wasm');
    console.log("[DEBUG] duckDbStorage: duckdbのrequire成功");
  } catch (error) {
    console.error("[DEBUG] duckDbStorage: duckdbのrequireに失敗:", error);
  }
}

class DuckDbStorageService implements StorageService {
  private db: any;
  private conn: any;
  private initialized: boolean;
  private initPromise: Promise<any> | null;

  constructor() {
    this.db = null;
    this.conn = null;
    this.initialized = false;
    this.initPromise = null;
    console.log("[DEBUG] DuckDbStorageService: コンストラクタ実行");
  }

  async initialize(): Promise<void> {
    // サーバーサイドレンダリング時は何もしない
    if (typeof window === 'undefined') {
      console.log("サーバーサイドではduck-WASMを初期化しません");
      return;
    }

    if (this.initialized) {
      console.log("[DEBUG] DuckDbStorageService: 既に初期化済み");
      return;
    }

    if (this.initPromise) {
      console.log("[DEBUG] DuckDbStorageService: 初期化処理が進行中");
      await this.initPromise;
      return;
    }

    console.log("duck-WASM初期化開始");
    this.initPromise = (async () => {
      try {
        // ローカルにあるWASMファイルを指定
        const DUCKDB_CONFIG = {
          mainModule: window.location.origin + '/duckdb-wasm/duckdb-eh.wasm',
          mainWorker: window.location.origin + '/duckdb-wasm/duckdb-browser-eh.worker.js'
        };
        console.log("[DEBUG] DuckDbStorageService: WASM設定", DUCKDB_CONFIG);

        // ファイルの存在確認（開発時のみ）
        try {
          console.log("[DEBUG] DuckDbStorageService: WASMファイル存在確認");
          const mainModuleResponse = await fetch(DUCKDB_CONFIG.mainModule, { method: 'HEAD' });
          console.log("[DEBUG] DuckDbStorageService: mainModule確認結果:", mainModuleResponse.status);
          
          const workerResponse = await fetch(DUCKDB_CONFIG.mainWorker, { method: 'HEAD' });
          console.log("[DEBUG] DuckDbStorageService: worker確認結果:", workerResponse.status);
        } catch (fetchError) {
          console.error("[DEBUG] DuckDbStorageService: ファイル存在確認エラー:", fetchError);
        }

        // データベースの作成
        console.log("[DEBUG] DuckDbStorageService: データベース作成開始");
        const logger = new duckdb.ConsoleLogger();
        console.log("[DEBUG] DuckDbStorageService: logger作成完了");
        
        console.log("[DEBUG] DuckDbStorageService: Worker作成開始");
        const worker = new Worker(DUCKDB_CONFIG.mainWorker);
        console.log("[DEBUG] DuckDbStorageService: Worker作成完了");
        
        console.log("[DEBUG] DuckDbStorageService: AsyncDuckDB作成開始");
        this.db = new duckdb.AsyncDuckDB(logger, worker);
        console.log("[DEBUG] DuckDbStorageService: AsyncDuckDB作成完了");
        
        console.log("[DEBUG] DuckDbStorageService: instantiate開始");
        await this.db.instantiate(DUCKDB_CONFIG.mainModule);
        console.log("[DEBUG] DuckDbStorageService: instantiate完了");
        
        console.log("[DEBUG] DuckDbStorageService: 接続開始");
        this.conn = await this.db.connect();
        console.log("[DEBUG] DuckDbStorageService: 接続完了");
        
        // テーブル作成
        console.log("[DEBUG] DuckDbStorageService: テーブル作成開始");

        // Create table only if it doesn't exist (preserve existing data)
        await this.conn.query(`
          CREATE TABLE IF NOT EXISTS todos (
            id BIGINT PRIMARY KEY,
            text TEXT NOT NULL,
            done BOOLEAN DEFAULT FALSE
          )
        `);
        console.log("[DEBUG] DuckDbStorageService: テーブル作成完了");
        
        this.initialized = true;
        console.log("duck-WASM初期化成功");
        return this.db;
      } catch (error) {
        console.error("[DEBUG] DuckDbStorageService: 初期化処理でエラー:", error);
        if (error instanceof Error) {
          console.error("[DEBUG] 詳細:", error.name, error.message, error.stack);
        }
        throw error;
      }
    })();

    await this.initPromise;
  }

  async getAllTodos(): Promise<Todo[]> {
    if (typeof window === 'undefined') return [];
    
    try {
      console.log("[DEBUG] DuckDbStorageService: getAllTodos開始");
      await this.initialize();
      console.log("[DEBUG] DuckDbStorageService: 初期化完了、クエリ実行開始");
      
      const result = await this.conn.query(`SELECT * FROM todos ORDER BY id`);
      console.log("[DEBUG] DuckDbStorageService: クエリ実行完了、結果変換開始");
      
      const rows = result.toArray().map((row: any) => ({
        id: row.id,
        text: row.text,
        done: row.done
      }));
      console.log("TODOの取得成功:", rows);
      return rows;
    } catch (error) {
      console.error("[DEBUG] DuckDbStorageService: getAllTodosでエラー:", error);
      return [];
    }
  }

  async addTodo(todo: Todo): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    
    try {
      console.log("[DEBUG] DuckDbStorageService: addTodo開始:", todo);
      await this.initialize();
      
      // パラメータを直接埋め込む方法に変更
      await this.conn.query(`
        INSERT INTO todos (id, text, done)
        VALUES (${todo.id}, '${todo.text.replace(/'/g, "''")}', ${todo.done ? 'TRUE' : 'FALSE'})
      `);
      
      console.log("TODOの追加成功:", todo);
      return true;
    } catch (error) {
      console.error("TODOの追加失敗:", error);
      return false;
    }
  }

  async deleteTodo(id: number): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    
    try {
      console.log("[DEBUG] DuckDbStorageService: deleteTodo開始:", id);
      await this.initialize();
      
      // パラメータを直接埋め込む方法に変更
      await this.conn.query(`DELETE FROM todos WHERE id = ${id}`);
      
      console.log("TODOの削除成功:", id);
      return true;
    } catch (error) {
      console.error("TODOの削除失敗:", error);
      return false;
    }
  }

  async updateTodo(todo: Todo): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    
    try {
      console.log("[DEBUG] DuckDbStorageService: updateTodo開始:", todo);
      await this.initialize();
      
      // パラメータを直接埋め込む方法に変更
      await this.conn.query(`
        UPDATE todos
        SET text = '${todo.text.replace(/'/g, "''")}', done = ${todo.done ? 'TRUE' : 'FALSE'}
        WHERE id = ${todo.id}
      `);
      
      console.log("TODOの更新成功:", todo);
      return true;
    } catch (error) {
      console.error("TODOの更新失敗:", error);
      return false;
    }
  }

  async close(): Promise<void> {
    if (typeof window === 'undefined') return;
    
    if (this.conn) {
      try {
        await this.conn.close();
      } catch (e) {
        console.error("接続クローズエラー:", e);
      }
    }
    if (this.db) {
      try {
        await this.db.terminate();
      } catch (e) {
        console.error("DB終了エラー:", e);
      }
    }
    this.initialized = false;
    this.initPromise = null;
  }
}

// シングルトンインスタンスを作成
let instance: DuckDbStorageService | null = null;

export function getDuckDbStorage(): StorageService {
  if (typeof window === 'undefined') {
    // サーバーサイドレンダリングの場合は空のオブジェクトを返す
    return {
      initialize: () => Promise.resolve(),
      getAllTodos: () => Promise.resolve([]),
      addTodo: () => Promise.resolve(false),
      deleteTodo: () => Promise.resolve(false),
      updateTodo: () => Promise.resolve(false),
      close: () => Promise.resolve()
    };
  }
  
  if (!instance) {
    instance = new DuckDbStorageService();
  }
  return instance;
}

export default getDuckDbStorage; 