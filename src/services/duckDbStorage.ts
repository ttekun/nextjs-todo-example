import { Todo, StorageService } from '../types/todo';

// duck-WASMはクライアントサイドでのみインポート
let duckdb: any;
if (typeof window !== 'undefined') {
  try {
    duckdb = require('@duckdb/duckdb-wasm');
  } catch (error) {
    console.error("Failed to load DuckDB-WASM:", error);
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
  }

  async initialize(): Promise<void> {
    // サーバーサイドレンダリング時は何もしない
    if (typeof window === 'undefined') {
      return;
    }

    if (this.initialized) {
      return;
    }

    if (this.initPromise) {
      await this.initPromise;
      return;
    }

    this.initPromise = (async () => {
      try {
        // ローカルにあるWASMファイルを指定
        const DUCKDB_CONFIG = {
          mainModule: window.location.origin + '/duckdb-wasm/duckdb-eh.wasm',
          mainWorker: window.location.origin + '/duckdb-wasm/duckdb-browser-eh.worker.js'
        };

        // データベースの作成
        const logger = new duckdb.ConsoleLogger();
        const worker = new Worker(DUCKDB_CONFIG.mainWorker);
        this.db = new duckdb.AsyncDuckDB(logger, worker);
        await this.db.instantiate(DUCKDB_CONFIG.mainModule);
        this.conn = await this.db.connect();

        // Create table only if it doesn't exist (preserve existing data)
        await this.conn.query(`
          CREATE TABLE IF NOT EXISTS todos (
            id BIGINT PRIMARY KEY,
            text TEXT NOT NULL,
            done BOOLEAN DEFAULT FALSE
          )
        `);

        this.initialized = true;
        return this.db;
      } catch (error) {
        console.error("DuckDB initialization failed:", error);
        throw error;
      }
    })();

    await this.initPromise;
  }

  async getAllTodos(): Promise<Todo[]> {
    if (typeof window === 'undefined') return [];

    try {
      await this.initialize();
      const result = await this.conn.query(`SELECT * FROM todos ORDER BY id`);
      const rows = result.toArray().map((row: any) => ({
        id: row.id,
        text: row.text,
        done: row.done
      }));
      return rows;
    } catch (error) {
      console.error("Failed to get todos:", error);
      return [];
    }
  }

  async addTodo(todo: Todo): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    try {
      await this.initialize();
      await this.conn.query(`
        INSERT INTO todos (id, text, done)
        VALUES (${todo.id}, '${todo.text.replace(/'/g, "''")}', ${todo.done ? 'TRUE' : 'FALSE'})
      `);
      return true;
    } catch (error) {
      console.error("Failed to add todo:", error);
      return false;
    }
  }

  async deleteTodo(id: number): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    try {
      await this.initialize();
      await this.conn.query(`DELETE FROM todos WHERE id = ${id}`);
      return true;
    } catch (error) {
      console.error("Failed to delete todo:", error);
      return false;
    }
  }

  async updateTodo(todo: Todo): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    try {
      await this.initialize();
      await this.conn.query(`
        UPDATE todos
        SET text = '${todo.text.replace(/'/g, "''")}', done = ${todo.done ? 'TRUE' : 'FALSE'}
        WHERE id = ${todo.id}
      `);
      return true;
    } catch (error) {
      console.error("Failed to update todo:", error);
      return false;
    }
  }

  async close(): Promise<void> {
    if (typeof window === 'undefined') return;

    if (this.conn) {
      try {
        await this.conn.close();
      } catch (e) {
        console.error("Connection close error:", e);
      }
    }
    if (this.db) {
      try {
        await this.db.terminate();
      } catch (e) {
        console.error("DB termination error:", e);
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