# TypeScript and Next.js TODO App Troubleshooting Guide

This document explains potential problems that may occur in the TODO app using DuckDB-WASM and their solutions.

## Potential Problems

### 1. DuckDB-WASM Initialization Failure

**Symptoms**:
- Application loads but TODOs are not displayed
- "DuckDB-WASM initialization failed" error appears in console

**Causes**:
- Browser compatibility issues
- Insufficient WebAssembly support
- Memory limitations
- WASM module loading failure
- Incorrect path specification

**Logs for Verification**:
```typescript
// Inside DuckDbStorageService.initialize()
console.log("DuckDB-WASM initialization started");
try {
  // Log current browser information
  console.log("Browser info:", window.navigator.userAgent);
  console.log("WASM path config:", DUCKDB_CONFIG);

  // Initialization code
  // ...

  console.log("DuckDB-WASM initialization successful");
} catch (error) {
  console.error("DuckDB-WASM initialization failed:", error);
}
```

### 2. Insufficient Async Handling

**Symptoms**:
- Screen doesn't update after data operations
- Data inconsistency due to race conditions
- "Unhandled Promise Rejection" errors

**Causes**:
- Insufficient Promise handling
- Async operation order issues
- Missing error catches

**Logs for Verification**:
```typescript
// Check async function execution order
async function operationWithLogging(operation, ...args) {
  console.log(`${operation} started:`, ...args);
  try {
    const result = await operation(...args);
    console.log(`${operation} successful:`, result);
    return result;
  } catch (error) {
    console.error(`${operation} failed:`, error);
    throw error;
  }
}

// Example: Wrap getAllTodos function
const todos = await operationWithLogging(storage.getAllTodos);
```

### 3. SQL Query Errors

**Symptoms**:
- Data is not saved or updated
- Query errors appear in console

**Causes**:
- SQL syntax errors
- Table schema mismatch
- Constraint violations

**Logs for Verification**:
```typescript
// Function to wrap query execution
async function executeQueryWithLogging(conn, query, params = []) {
  console.log("SQL execution:", query, params);
  try {
    const result = await conn.query(query, params);
    console.log("SQL successful:", result);
    return result;
  } catch (error) {
    console.error("SQL error:", error, "Query:", query, "Parameters:", params);
    throw error;
  }
}

// Usage example
const result = await executeQueryWithLogging(
  this.conn,
  "INSERT INTO todos (id, text, done) VALUES (?, ?, ?)",
  [todo.id, todo.text, todo.done]
);
```

### 4. WebAssembly Module Loading Failure

**Symptoms**:
- "Cannot find module" or "Failed to fetch" errors
- WASM file not found errors

**Causes**:
- Path configuration mistakes
- CORS issues
- Missing files

**Logs for Verification**:
```typescript
// Before WASM module loading
console.log("WASM module loading started:");
console.log("- Main module path:", DUCKDB_CONFIG.mainModule);
console.log("- Worker path:", DUCKDB_CONFIG.mainWorker);

// File existence check (development only)
fetch(DUCKDB_CONFIG.mainModule)
  .then(response => {
    console.log("Main module existence check:", response.status);
  })
  .catch(error => {
    console.error("Main module fetch failed:", error);
  });

fetch(DUCKDB_CONFIG.mainWorker)
  .then(response => {
    console.log("Worker existence check:", response.status);
  })
  .catch(error => {
    console.error("Worker fetch failed:", error);
  });
```

### 5. Performance Degradation

**Symptoms**:
- Long initial load time
- Slow operation response
- Increased memory usage

**Causes**:
- WebAssembly module load time
- Inefficient queries
- Memory leaks

**Logs for Verification**:
```typescript
// Performance measurement
console.time("operation-time");
// Execute operation
console.timeEnd("operation-time");

// Memory usage (development only)
console.log("Memory usage:",
  performance.memory ?
    `${Math.round(performance.memory.usedJSHeapSize / (1024 * 1024))}MB` :
    "Not measurable"
);
```

### 6. Browser Incognito Mode Issues

**Symptoms**:
- Data not saved in private browsing mode
- Malfunction in certain browsers

**Causes**:
- Storage limitations
- Third-party cookie blocking
- Security policies

**Logs for Verification**:
```typescript
// Browser mode detection (not completely possible)
console.log("Private mode detection attempt:");
try {
  localStorage.setItem("test", "test");
  localStorage.removeItem("test");
  console.log("- localStorage: Available");
} catch (e) {
  console.log("- localStorage: Unavailable");
}

// IndexedDB availability check
const checkIndexedDB = () => {
  try {
    const request = indexedDB.open("test", 1);
    request.onsuccess = () => {
      console.log("- IndexedDB: Available");
      request.result.close();
      indexedDB.deleteDatabase("test");
    };
    request.onerror = () => {
      console.log("- IndexedDB: Unavailable");
    };
  } catch (e) {
    console.log("- IndexedDB: Exception occurred", e);
  }
};
checkIndexedDB();
```

### 7. Browser Compatibility Issues

**Symptoms**:
- App doesn't work in specific browsers
- Errors in older browsers

**Causes**:
- WebAssembly not supported
- Modern JavaScript features not supported
- CSS compatibility issues

**Logs for Verification**:
```typescript
// Browser feature detection
console.log("Browser compatibility check:");
console.log("- WebAssembly:", typeof WebAssembly !== "undefined" ? "Supported" : "Not supported");
console.log("- Async/Await:", typeof (async () => {}).constructor === "AsyncFunction" ? "Supported" : "Not supported");
console.log("- ES Modules:", "noModule" in document.createElement("script") ? "Supported" : "Not supported");
```

## Most Likely Problems and Verification Procedures

The two most likely problems in the DuckDB-WASM TODO app are:

1. **DuckDB-WASM Initialization Failure**
2. **WebAssembly Module Loading Failure**

Here are the specific steps to verify these issues:

### 1. Adding Detailed Logging

```typescript
// Add to initialize() method in pages/duckDbStorage.ts

async initialize(): Promise<void> {
  // Do nothing during server-side rendering
  if (typeof window === 'undefined') {
    console.log("DuckDB-WASM will not be initialized on server-side");
    return;
  }

  if (this.initialized) {
    console.log("DuckDB-WASM is already initialized");
    return;
  }

  if (this.initPromise) {
    console.log("DuckDB-WASM initialization already in progress");
    await this.initPromise;
    return;
  }

  console.log("DuckDB-WASM initialization started");
  console.log("Browser info:", window.navigator.userAgent);
  console.log("WebAssembly support:", typeof WebAssembly !== "undefined" ? "Yes" : "No");

  this.initPromise = (async () => {
    try {
      // Specify local WASM files
      const DUCKDB_CONFIG = {
        mainModule: '/duckdb-wasm/duckdb-eh.wasm',
        mainWorker: '/duckdb-wasm/duckdb-browser-eh.worker.js'
      };
      console.log("WASM config:", DUCKDB_CONFIG);

      // Module existence check
      try {
        const moduleCheck = await fetch(DUCKDB_CONFIG.mainModule, { method: 'HEAD' });
        console.log("Main module existence check:", moduleCheck.status);

        const workerCheck = await fetch(DUCKDB_CONFIG.mainWorker, { method: 'HEAD' });
        console.log("Worker existence check:", workerCheck.status);
      } catch (fetchError) {
        console.error("WASM file check error:", fetchError);
      }

      // Create database
      console.log("DuckDB creation started");
      const logger = new duckdb.ConsoleLogger();
      const worker = new Worker(DUCKDB_CONFIG.mainWorker);
      console.log("Worker instance created");

      this.db = new duckdb.AsyncDuckDB(logger, worker);
      console.log("AsyncDuckDB instance created");

      console.time("wasm-instantiate");
      await this.db.instantiate(DUCKDB_CONFIG.mainModule);
      console.timeEnd("wasm-instantiate");
      console.log("DuckDB instantiation complete");

      console.time("connection-open");
      this.conn = await this.db.connect();
      console.timeEnd("connection-open");
      console.log("Connection established");

      // Create table
      console.time("table-create");
      await this.conn.query(`
        CREATE TABLE IF NOT EXISTS todos (
          id INTEGER PRIMARY KEY,
          text TEXT NOT NULL,
          done BOOLEAN DEFAULT FALSE
        )
      `);
      console.timeEnd("table-create");
      console.log("Table created");

      this.initialized = true;
      console.log("DuckDB-WASM initialization successful");
      return this.db;
    } catch (error) {
      console.error("DuckDB-WASM initialization failed:", error);
      console.error("Error details:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
      throw error;
    }
  })();

  await this.initPromise;
}
```

### 2. Problem Identification and Fix

After adding detailed logs, it is recommended to follow these troubleshooting steps:

1. **Open browser developer console**
   - Press F12 or right-click → "Inspect"

2. **Reload the app and check logs**
   - Check if there are errors related to WASM file loading
   - Identify which stage of initialization fails

3. **Check file loading in Network tab**
   - Verify if `/duckdb-wasm/duckdb-eh.wasm` and `/duckdb-wasm/duckdb-browser-eh.worker.js` are loaded
   - Check if 404 errors are displayed

4. **Respond based on error messages**
   - If file not found: Fix path or verify file placement
   - If WebAssembly not supported: Recommend using a compatible browser
   - If memory limitation: Consider application optimization

5. **Implement fallback to simple storage**
   - Switch to localStorage or similar simple storage if DuckDB-WASM cannot be initialized

By following these steps, you can improve the robustness of the application based on identified issues.