# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Next.js TODO application using DuckDB-WASM for browser-based SQL database storage. All data persists in-memory via WebAssembly SQL engine (no server-side database).

## Commands

```bash
npm run setup      # Download DuckDB-WASM files (required before first run)
npm run dev        # Start development server (auto-runs setup via predev hook)
npm run build      # Production build
npm test           # Run tests
npm run test:watch # Run tests in watch mode
```

## Architecture

```
src/
├── pages/index.tsx          # Entry point, disables SSR for DuckDB compatibility
├── components/
│   └── TodoAppComponent.tsx # Main UI component with state management
├── services/
│   └── duckDbStorage.ts     # DuckDB-WASM singleton service (SQL operations)
└── types/
    └── todo.ts              # Todo interface and StorageService interface
```

**Key architectural decisions:**

- **SSR disabled**: `pages/index.tsx` uses `next/dynamic` with `{ ssr: false }` because DuckDB-WASM only works in browser environments
- **Singleton storage**: `getDuckDbStorage()` returns a singleton instance to prevent multiple database connections
- **SQL injection prevention**: All DML operations use prepared statements (`conn.prepare()` + `stmt.run()`) to prevent SQL injection entirely
- **ID generation**: Uses `Date.now() * 1000 + Math.floor(Math.random() * 1000)` to produce a unique millisecond-precision timestamp with a random suffix, avoiding collisions under rapid creation

## DuckDB-WASM Setup

WASM files must be downloaded to `public/duckdb-wasm/` before running:
- `setup-duckdb.js` fetches files from jsDelivr CDN
- Required files: `duckdb-eh.wasm`, `duckdb-browser-eh.worker.js`

## Data Schema

```sql
CREATE TABLE todos (
  id BIGINT PRIMARY KEY,
  text TEXT NOT NULL,
  done BOOLEAN DEFAULT FALSE
);
```

## Testing

Tests use Jest with Testing Library. DuckDB-WASM is mocked at two levels:
- `jest.setup.js`: global mock for `TodoAppComponent` tests (high-level storage mock)
- `duckDbStorage.test.ts`: low-level mock of `conn.query` / `conn.prepare` that verifies actual SQL and parameter binding in `DuckDbStorageService`